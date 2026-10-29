-- Shared learner insight wall for The Filipino Arts and Crafts.
--
-- HOW TO USE
-- 1. Open your Supabase project.
-- 2. Go to SQL Editor -> New query.
-- 3. Paste this entire file and press Run.
--
-- What this sets up:
--   * an insights table that stores the public comment wall
--   * Row Level Security so visitors can only read approved insights
--   * create_insight() for validated anonymous posts
--   * delete_insight() so an author can remove their own post using the
--     private token stored in their browser
--   * no direct insert, update, or delete access for visitors
--
-- Moderation: in Table Editor -> insights, set approved = false to hide a
-- post, or delete the row. The public site only reads approved = true.

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.insights (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'A learner',
  body text not null,
  approved boolean not null default true,
  delete_token_hash text not null,
  created_at timestamptz not null default now(),
  constraint insights_name_length check (char_length(name) between 1 and 40),
  constraint insights_body_length check (char_length(body) between 1 and 600)
);

create index if not exists insights_created_at_idx
  on public.insights (created_at desc);

alter table public.insights enable row level security;

drop policy if exists "Approved insights are readable" on public.insights;
create policy "Approved insights are readable"
  on public.insights
  for select
  using (approved = true);

-- Visitors may read only the public columns. The delete token hash stays private.
revoke all on public.insights from anon, authenticated;
grant select (id, name, body, created_at, approved)
  on public.insights to anon, authenticated;

-- Validated anonymous posting. Returns the new public row.
create or replace function public.create_insight(
  p_name text,
  p_body text,
  p_token text
)
returns table (id uuid, name text, body text, created_at timestamptz)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_name text := left(coalesce(nullif(trim(p_name), ''), 'A learner'), 40);
  v_body text := left(trim(coalesce(p_body, '')), 600);
  v_id uuid;
  v_created_at timestamptz;
begin
  if char_length(v_body) < 1 then
    raise exception 'Write a short insight before posting.';
  end if;

  if p_token is null or char_length(p_token) < 16 then
    raise exception 'Invalid delete token.';
  end if;

  insert into public.insights as i (name, body, delete_token_hash)
  values (
    v_name,
    v_body,
    encode(extensions.digest(convert_to(p_token, 'UTF8'), 'sha256'), 'hex')
  )
  returning i.id, i.created_at into v_id, v_created_at;

  return query select v_id, v_name, v_body, v_created_at;
end;
$$;

-- Author-only deletion. The caller must present the token created with the post.
create or replace function public.delete_insight(p_id uuid, p_token text)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_deleted integer;
begin
  if p_token is null then
    return false;
  end if;

  delete from public.insights
  where id = p_id
    and delete_token_hash = encode(extensions.digest(convert_to(p_token, 'UTF8'), 'sha256'), 'hex');

  get diagnostics v_deleted = row_count;
  return v_deleted > 0;
end;
$$;

revoke all on function public.create_insight(text, text, text) from public;
revoke all on function public.delete_insight(uuid, text) from public;
grant execute on function public.create_insight(text, text, text) to anon, authenticated;
grant execute on function public.delete_insight(uuid, text) to anon, authenticated;
