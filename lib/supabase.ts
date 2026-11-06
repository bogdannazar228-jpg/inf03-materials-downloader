import {createClient} from '@supabase/supabase-js';
export function publicDb(){const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; return url&&key?createClient(url,key):null}
export function adminDb(){const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY; if(!url||!key) throw new Error('Supabase не настроен'); return createClient(url,key,{auth:{persistSession:false}})}
