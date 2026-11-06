import {createClient} from '@supabase/supabase-js';
import * as cheerio from 'cheerio';
import robotsParser from 'robots-parser';
import { sourceUrl, isExamPage, classify, fileMetadata } from './scope.mjs';
const base='https://arkusze.pl';
const service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const endpoint=Deno.env.get('SUPABASE_URL')!;
const db=createClient(endpoint,service,{auth:{persistSession:false}});
const agent='INF03MaterialsBot/1.0';
const wait=()=>new Promise(r=>setTimeout(r,1250));
type Task={id:number,job_id:string,kind:string,url:string,page_url:string|null,title:string|null};
const safe=(u:string)=>sourceUrl(u);
class StorageFull extends Error {}
async function requireOk(result:{error:unknown}){if(result.error)throw result.error}
Deno.serve(async(req:Request)=>{
 if(req.method!=='POST'||!service||req.headers.get('Authorization')!==`Bearer ${service}`)return new Response('Unauthorized',{status:401});
 const claim=await db.rpc('claim_sync_job');if(claim.error)return new Response('Queue error',{status:500});const job=claim.data?.[0];if(!job)return Response.json({status:'idle'});
 let current:Task|null=null;
 try{
  await wait(); const robotsResponse=await fetch(`${base}/robots.txt`,{headers:{'User-Agent':agent},redirect:'manual',signal:AbortSignal.timeout(20000)});if(!robotsResponse.ok)throw new Error('robots.txt недоступен; обход остановлен');
  const robots=robotsParser(`${base}/robots.txt`,await robotsResponse.text());
  async function request(url:string,method='GET'){let cur=url;for(let i=0;i<4;i++){const s=safe(cur);if(!s||!robots.isAllowed(s,agent))throw new Error('URL запрещён robots.txt или не относится к arkusze.pl');await wait();const response=await fetch(s,{method,headers:{'User-Agent':agent},redirect:'manual',signal:AbortSignal.timeout(20000)});if(response.status>=300&&response.status<400){const loc=response.headers.get('location');if(!loc)throw new Error('Redirect без Location');cur=new URL(loc,s).toString();continue}if(!response.ok)throw new Error(`HTTP ${response.status}: ${s}`);return response}throw new Error('Слишком много redirects')}
  async function enqueue(kind:string,url:string,page_url:string|null=null,title:string|null=null){const canonical=safe(url);if(!canonical)return;await requireOk(await db.from('sync_tasks').upsert({job_id:job.id,kind,url:canonical,page_url,title},{onConflict:'job_id,kind,url',ignoreDuplicates:true}));}
  for(const [kind,url] of [['sitemap',`${base}/sitemap.xml`],['listing',`${base}/egzamin-zawodowy/`],['listing',`${base}/egzamin-zawodowy-kwalifikacja-inf-03/`]])await enqueue(kind,url);
  const deadline=Date.now()+75000;
  while(Date.now()<deadline){const q=await db.from('sync_tasks').select('*').eq('job_id',job.id).eq('done',false).order('id').limit(1);if(q.error)throw q.error;current=q.data?.[0]??null;if(!current)break;
   if(current.kind==='sitemap') {const text=await (await request(current.url)).text();const $=cheerio.load(text,{xmlMode:true});for(const el of $('loc').toArray()){const u=safe($(el).text().trim());if(!u)continue;const path=new URL(u).pathname;if(/sitemap.*\.xml$/i.test(path))await enqueue('sitemap',u);else if(isExamPage(u))await enqueue('page',u)}}
   else if(current.kind==='listing'){const $=cheerio.load(await (await request(current.url)).text());for(const el of $('a[href]').toArray()){let u:string;try{u=new URL($(el).attr('href')!,current.url).toString()}catch{continue}if(isExamPage(u))await enqueue('page',u);else if(safe(u)&&(/^\/egzamin-zawodowy\/page\/\d+\/?$/.test(new URL(u).pathname)||/^\/egzamin-zawodowy-kwalifikacja-inf-03\/page\/\d+\/?$/.test(new URL(u).pathname)))await enqueue('listing',u)}}
   else if(current.kind==='page'){if(!isExamPage(current.url))throw new Error('Недопустимая страница');const $=cheerio.load(await (await request(current.url)).text());for(const el of $('a[href]').toArray()){let u:string;try{u=new URL($(el).attr('href')!,current.url).toString()}catch{continue}if(classify(u))await enqueue('file',u,current.url,$(el).text().trim()||new URL(u).pathname.split('/').pop()||'INF.03')}}
   else if(current.kind==='file'){
    const kind=classify(current.url);if(!kind||!current.page_url||!isExamPage(current.page_url))throw new Error('Файл не подтверждён как INF.03');
    const existing=await db.from('materials').select('id').eq('source_url',current.url).maybeSingle();if(existing.error)throw existing.error;
    if(!existing.data){const head=await request(current.url,'HEAD');const raw=head.headers.get('content-length');const estimate=raw&&/^\d+$/.test(raw)?Number(raw):0;if(!Number.isSafeInteger(estimate)||estimate<=0)throw new Error('HEAD не вернул допустимый Content-Length');if(estimate>50*1024*1024)throw new Error('Файл больше 50 МиБ; требуется ручная проверка лимита Supabase');
      const state=await db.from('sync_state').select('*').eq('id',1).single();if(state.error)throw state.error;if(state.data.total_bytes_used+estimate>=state.data.storage_limit_bytes-state.data.safe_margin_bytes)throw new StorageFull('Недостаточно места в Storage');
      const response=await request(current.url);if(!response.body)throw new Error('Пустой ответ');const reader=response.body.getReader();const chunks:Uint8Array[]=[];let received=0;while(true){const part=await reader.read();if(part.done)break;received+=part.value.length;if(received>estimate||received>50*1024*1024){await reader.cancel();throw new Error('Ответ превышает допустимый размер')}chunks.push(part.value)}const data=new Uint8Array(received);let offset=0;for(const chunk of chunks){data.set(chunk,offset);offset+=chunk.length}if(data.length!==estimate)throw new Error('Размер файла не совпадает с HEAD');const good=kind==='materialy_pomocnicze'?(data[0]===0x50&&data[1]===0x4b)||(data[0]===0x37&&data[1]===0x7a):data[0]===0x25&&data[1]===0x50&&data[2]===0x44&&data[3]===0x46;if(!good)throw new Error('Неверная сигнатура файла');
      const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(current.url));const hash=Array.from(new Uint8Array(digest)).map(x=>x.toString(16).padStart(2,'0')).join('');const ext=new URL(current.url).pathname.split('.').pop()!.toLowerCase();const path=`${hash}.${ext}`;const upload=await db.storage.from('inf03-materials').upload(path,data,{contentType:kind==='materialy_pomocnicze'?'application/octet-stream':'application/pdf',upsert:true});if(upload.error)throw upload.error;
      const {year,session}=fileMetadata(current.page_url);const pub=db.storage.from('inf03-materials').getPublicUrl(path).data.publicUrl;const saved=await db.rpc('commit_material',{p_source_url:current.url,p_source_page_url:current.page_url,p_title:current.title||'INF.03',p_path:path,p_public_url:pub,p_year:year,p_session:session,p_type:kind,p_size:data.length});if(saved.error){await db.storage.from('inf03-materials').remove([path]);throw saved.error}if(saved.data==='full'){await db.storage.from('inf03-materials').remove([path]);throw new StorageFull('Недостаточно места в Storage')} }
   }
   await requireOk(await db.from('sync_tasks').update({done:true}).eq('id',current.id));current=null;
  }
  const pending=await db.from('sync_tasks').select('id',{count:'exact',head:true}).eq('job_id',job.id).eq('done',false);if(pending.error)throw pending.error;const complete=pending.count===0;await requireOk(await db.from('sync_jobs').update({status:complete?'done':'pending',finished_at:complete?new Date().toISOString():null,error_message:null}).eq('id',job.id));return Response.json({status:complete?'done':'pending'});
 }catch(e){const msg=e instanceof Error?e.message:String(e);await db.from('sync_errors').insert({job_id:job.id,url:current?.url??null,error:msg});await db.from('sync_jobs').update({status:e instanceof StorageFull?'paused_storage_full':'failed',finished_at:new Date().toISOString(),error_message:msg}).eq('id',job.id);return Response.json({status:'failed',error:msg},{status:500})}
});
