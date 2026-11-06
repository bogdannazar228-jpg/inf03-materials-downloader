import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '../../../../lib/supabase';
export const dynamic='force-dynamic';
export async function GET(req:NextRequest){const secret=process.env.CRON_SECRET;if(!secret||req.headers.get('authorization')!==`Bearer ${secret}`)return NextResponse.json({error:'Unauthorized'},{status:401});try{const {data,error}=await adminDb().from('sync_jobs').insert({status:'pending'}).select('id').single();if(error)throw error;return NextResponse.json({id:data.id,status:'pending'},{status:202})}catch{return NextResponse.json({error:'Queue unavailable'},{status:500})}}
