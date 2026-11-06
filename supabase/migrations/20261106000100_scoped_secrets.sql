-- Store hashes only. The worker's call secret also lives in Vault for pg_net.
create table public.sync_secrets (name text primary key, secret_hash text not null);
alter table public.sync_secrets enable row level security;
create function public.verify_sync_secret(p_name text,p_token text) returns boolean language sql security definer set search_path=public,extensions,pg_temp as $$
  select coalesce((select secret_hash=encode(extensions.digest(p_token,'sha256'),'hex') from public.sync_secrets where name=p_name),false)
$$;
revoke all on function public.verify_sync_secret(text,text) from public,anon,authenticated;
grant execute on function public.verify_sync_secret(text,text) to service_role;
create function public.enqueue_sync_job(p_token text) returns uuid language plpgsql security definer set search_path=public,extensions,pg_temp as $$
declare job uuid;
begin
 if not public.verify_sync_secret('queue', p_token) then raise exception 'Unauthorized' using errcode='42501'; end if;
 insert into public.sync_jobs(status) values('pending') returning id into job;
 return job;
end $$;
revoke all on function public.enqueue_sync_job(text) from public;
grant execute on function public.enqueue_sync_job(text) to anon,authenticated,service_role;
