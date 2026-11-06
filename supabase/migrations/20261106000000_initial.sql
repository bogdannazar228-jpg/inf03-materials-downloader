create extension if not exists pgcrypto;
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;
create table public.materials (id uuid primary key default gen_random_uuid(), source_url text unique not null, source_page_url text not null, title text not null, storage_path text not null unique, public_url text not null, year int not null, session text, file_type text not null check (file_type in ('arkusz','klucz','materialy_pomocnicze')), file_size_bytes bigint not null check(file_size_bytes > 0), created_at timestamptz not null default now());
create table public.sync_jobs (id uuid primary key default gen_random_uuid(), status text not null check(status in ('pending','processing','done','failed','paused_storage_full')), created_at timestamptz not null default now(), started_at timestamptz, finished_at timestamptz, error_message text);
create table public.sync_errors (id uuid primary key default gen_random_uuid(), job_id uuid references public.sync_jobs(id), url text, error text not null, created_at timestamptz not null default now());
-- Free Storage quota is 1 GB across the organization; use a conservative per-project cap.
create table public.sync_state (id int primary key default 1 check(id=1), total_bytes_used bigint not null default 0, storage_limit_bytes bigint not null default 1073741824, safe_margin_bytes bigint not null default 209715200, updated_at timestamptz not null default now());
insert into public.sync_state(id) values(1);
create table public.sync_tasks (id bigint generated always as identity primary key, job_id uuid not null references public.sync_jobs(id) on delete cascade, kind text not null check(kind in ('sitemap','listing','page','file')), url text not null, page_url text, title text, done boolean not null default false, unique(job_id,kind,url));
create index sync_tasks_queue on public.sync_tasks(job_id,done,id);
alter table public.materials enable row level security;
alter table public.sync_jobs enable row level security;
alter table public.sync_errors enable row level security;
alter table public.sync_state enable row level security;
alter table public.sync_tasks enable row level security;
create policy "public material reads" on public.materials for select to anon, authenticated using (true);
insert into storage.buckets(id,name,public) values ('inf03-materials','inf03-materials',true) on conflict(id) do update set public=true;
create function public.claim_sync_job() returns setof public.sync_jobs language plpgsql security definer set search_path = public,pg_temp as $$
declare j public.sync_jobs;
begin
  perform pg_advisory_xact_lock(209003);
  update public.sync_jobs set status='pending', error_message='Recovered expired worker lease' where status='processing' and started_at < now()-interval '4 minutes';
  if exists (select 1 from public.sync_jobs where status='processing') then return; end if;
  select * into j from public.sync_jobs where status='pending' order by created_at for update skip locked limit 1;
  if not found then return; end if;
  update public.sync_jobs set status='processing', started_at=now() where id=j.id returning * into j;
  return next j;
end $$;
create function public.commit_material(p_source_url text,p_source_page_url text,p_title text,p_path text,p_public_url text,p_year int,p_session text,p_type text,p_size bigint) returns text language plpgsql security definer set search_path=public,pg_temp as $$
declare s public.sync_state; inserted uuid;
begin
 select * into s from public.sync_state where id=1 for update;
 if exists(select 1 from public.materials where source_url=p_source_url) then return 'exists'; end if;
 if p_size <= 0 or s.total_bytes_used+p_size >= s.storage_limit_bytes-s.safe_margin_bytes then return 'full'; end if;
 insert into public.materials(source_url,source_page_url,title,storage_path,public_url,year,session,file_type,file_size_bytes) values(p_source_url,p_source_page_url,p_title,p_path,p_public_url,p_year,p_session,p_type,p_size) returning id into inserted;
 update public.sync_state set total_bytes_used=total_bytes_used+p_size,updated_at=now() where id=1;
 return 'inserted';
end $$;
revoke all on function public.claim_sync_job() from public,anon,authenticated;
revoke all on function public.commit_material(text,text,text,text,text,int,text,text,bigint) from public,anon,authenticated;
grant execute on function public.claim_sync_job() to service_role;
grant execute on function public.commit_material(text,text,text,text,text,int,text,text,bigint) to service_role;
select cron.schedule('inf03-clean-errors','15 4 * * *', $$delete from public.sync_errors where created_at < now()-interval '30 days'$$);
-- Configure the worker trigger and Vault secrets separately after deploying the function; see README.
