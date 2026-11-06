import { NextRequest, NextResponse } from 'next/server';
import { enqueueJob } from '../../../../lib/supabase';
export const dynamic='force-dynamic';
export async function POST(req:NextRequest){const secret=process.env.ADMIN_TOKEN;if(!secret||req.headers.get('authorization')!==`Bearer ${secret}`)return NextResponse.json({error:'Unauthorized'},{status:401});try{const id=await enqueueJob();return NextResponse.json({id,status:'pending'},{status:202})}catch{return NextResponse.json({error:'Queue unavailable'},{status:500})}}
