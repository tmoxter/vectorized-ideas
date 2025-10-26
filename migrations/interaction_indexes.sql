-- One-way actions (like/pass): actor → target
create unique index if not exists ix_interactions_unidir_once
  on public.interactions (actor_user, target_user, action)
  where action in ('like','pass');

create index if not exists ix_interactions_actor_target
  on public.interactions (actor_user, target_user)
  where action in ('like','pass');

-- Two-way block (unordered pair): applies both directions
create unique index if not exists ix_interactions_blocked_pair_once
  on public.interactions (
    least(actor_user, target_user),
    greatest(actor_user, target_user)
  )
  where action = 'block';

create index if not exists ix_interactions_blocked_pair
  on public.interactions (
    least(actor_user, target_user),
    greatest(actor_user, target_user)
  )
  where action = 'block';

create index if not exists ix_interactions_pass_window
  on public.interactions (actor_user, target_user, created_at desc)
  where action = 'pass';