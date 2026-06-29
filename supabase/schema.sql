create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('video', 'playlist', 'channel')),
  youtube_id text not null,
  youtube_url text not null,
  canonical_url text not null unique,
  title text not null,
  description text,
  thumbnail_url text,
  channel_title text,
  channel_url text,
  educational_reason text,
  tags text[] not null default '{}',
  upvote_count integer not null default 0 check (upvote_count >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.votes (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.resources(id) on delete cascade,
  voter_id text not null,
  created_at timestamptz not null default now(),
  unique(resource_id, voter_id)
);

create index if not exists resources_type_top_idx on public.resources (type, upvote_count desc, created_at desc);
create index if not exists resources_type_newest_idx on public.resources (type, created_at desc);

create or replace function public.upvote_resource(p_resource_id uuid, p_voter_id text)
returns table(id uuid, upvote_count integer, voted boolean)
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.votes(resource_id, voter_id)
  values (p_resource_id, p_voter_id)
  on conflict do nothing;

  if found then
    update public.resources
    set upvote_count = resources.upvote_count + 1
    where resources.id = p_resource_id
    returning resources.id, resources.upvote_count, true
    into id, upvote_count, voted;
  else
    select resources.id, resources.upvote_count, false
    into id, upvote_count, voted
    from public.resources
    where resources.id = p_resource_id;
  end if;

  if id is null then
    raise exception 'resource not found';
  end if;

  return next;
end;
$$;
