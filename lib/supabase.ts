import {createClient} from '@supabase/supabase-js';
export function publicDb(){const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; return url&&key?createClient(url,key):null}
export async function enqueueJob(){const client=publicDb();const token=process.env.QUEUE_TOKEN;if(!client||!token) throw new Error('Очередь не настроена');const {data,error}=await client.rpc('enqueue_sync_job',{p_token:token});if(error)throw error;return data as string}
