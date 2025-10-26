-- Create the interactions table if it doesn't exist
create table if not exists public.interactions (
  id uuid default gen_random_uuid() primary key,
  actor_user uuid not null references auth.users(id) on delete cascade,
  target_user uuid not null references auth.users(id) on delete cascade,
  action text not null check (action in ('like', 'pass', 'block')),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create unique index if not exists interactions_actor_target_like_pass_idx
  on public.interactions (actor_user, target_user, action)
  where action in ('like', 'pass');

create unique index if not exists interactions_actor_target_pass_idx
  on public.interactions (actor_user, target_user, action)
  where action = 'pass';

create or replace function public.insert_like_interaction(
  p_actor_user uuid,
  p_target_user uuid
)
returns void
language plpgsql
security definer
as $$
begin
  insert into public.interactions (actor_user, target_user, action)
  values (p_actor_user, p_target_user, 'like')
  on conflict (actor_user, target_user, action)
  where action in ('like', 'pass')  -- partial unique idx we created
  do nothing;
end;
$$;

create or replace function public.insert_pass_interaction(
  p_actor_user uuid,
  p_target_user uuid
)
returns void
language plpgsql
security definer
as $$
begin
  insert into public.interactions (actor_user, target_user, action, created_at)
  values (p_actor_user, p_target_user, 'pass', now())
  on conflict (actor_user, target_user, action)
  where action = 'pass'
  do update set created_at = excluded.created_at;
end;
$$;

alter table public.interactions enable row level security;

create policy "Users can insert their own interactions"
  on public.interactions
  for insert
  with check (auth.uid() = actor_user);

create policy "Users can view their own interactions as actor"
  on public.interactions
  for select
  using (auth.uid() = actor_user);

create policy "Users can view interactions where they are target"
  on public.interactions
  for select
  using (auth.uid() = target_user);

create index if not exists interactions_actor_user_idx on public.interactions(actor_user);

create index if not exists interactions_target_user_idx on public.interactions(target_user);

create index if not exists interactions_action_idx on public.interactions(action);

-- Grant necessary permissions
grant usage on schema public to authenticated;
grant all on public.interactions to authenticated;
grant execute on function public.insert_like_interaction to authenticated;
grant execute on function public.insert_pass_interaction to authenticated;
