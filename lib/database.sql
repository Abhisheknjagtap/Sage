  -- ============================================================
  -- AI Companion — Complete Database Schema
  -- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New query)
  -- ============================================================

  -- ─── Extensions ─────────────────────────────────────────────
  create extension if not exists "uuid-ossp";

  -- ─── Clean slate (safe re-run) ──────────────────────────────
  drop trigger if exists on_auth_user_created on auth.users;
  drop trigger if exists on_profile_created on public.profiles;
  drop trigger if exists on_profile_updated on public.profiles;
  drop function if exists public.handle_new_user();
  drop function if exists public.handle_new_profile();
  drop function if exists public.handle_profile_updated_at();

  drop table if exists public.nudge_settings cascade;
  drop table if exists public.user_patterns cascade;
  drop table if exists public.messages cascade;
  drop table if exists public.conversations cascade;
  drop table if exists public.profiles cascade;

  -- ============================================================
  -- TABLE 1: profiles
  -- ============================================================
  create table public.profiles (
    id                  uuid        references auth.users (id) on delete cascade primary key,
    display_name        text,
    gender              text,
    relationship_status text        check (
                                      relationship_status in (
                                        'single', 'partnered', 'married',
                                        'complicated', 'prefer not to say'
                                      )
                                    ),
    living_situation    text        check (
                                      living_situation in (
                                        'alone', 'with family',
                                        'with partner', 'with roommates',
                                        'prefer not to say'
                                      )
                                    ),
    age_range           text        check (
                                      age_range in (
                                        '18-22', '23-27', '28-32', '33-40'
                                      )
                                    ),
    primary_life_area   text        check (
                                      primary_life_area in (
                                        'relationships', 'career', 'self',
                                        'family', 'everything'
                                      )
                                    ),
    communication_style text        check (
                                      communication_style in (
                                        'analytical', 'emotional',
                                        'action-oriented', 'reflective'
                                      )
                                    ),
    onboarding_complete boolean     not null default false,
    timezone            text        not null default 'UTC',
    created_at          timestamptz not null default now(),
    updated_at          timestamptz not null default now()
  );

  -- ============================================================
  -- TABLE 2: conversations
  -- ============================================================
  create table public.conversations (
    id                        uuid        primary key default gen_random_uuid(),
    user_id                   uuid        not null references public.profiles (id) on delete cascade,
    title                     text,
    topic_category            text        check (
                                            topic_category in (
                                              'relationship', 'work', 'family',
                                              'self-worth', 'decision', 'conflict', 'other'
                                            )
                                          ),
    started_at                timestamptz not null default now(),
    ended_at                  timestamptz,
    exchange_count            integer     not null default 0,
    honest_mirror_triggered   boolean     not null default false,
    exit_grounding_delivered  boolean     not null default false,
    summary                   text
  );

  -- ============================================================
  -- TABLE 3: messages
  -- ============================================================
  create table public.messages (
    id               uuid        primary key default gen_random_uuid(),
    conversation_id  uuid        not null references public.conversations (id) on delete cascade,
    user_id          uuid        not null references public.profiles (id) on delete cascade,
    role             text        not null check (role in ('user', 'assistant')),
    content          text        not null,
    detected_tone    text        check (
                                  detected_tone in (
                                    'aggressive', 'sad', 'anxious', 'confused',
                                    'venting', 'reflective', 'neutral'
                                  )
                                ),
    is_honest_mirror    boolean  not null default false,
    is_exit_grounding   boolean  not null default false,
    created_at       timestamptz not null default now()
  );

  -- ============================================================
  -- TABLE 4: user_patterns
  -- ============================================================
  create table public.user_patterns (
    id                   uuid        primary key default gen_random_uuid(),
    user_id              uuid        not null unique references public.profiles (id) on delete cascade,
    recurring_topics     jsonb       not null default '{}',
    recurring_behaviors  text[]      not null default '{}',
    recurring_emotions   text[]      not null default '{}',
    last_checkin_topic   text,
    last_checkin_question text,
    total_conversations  integer     not null default 0,
    last_active          timestamptz,
    last_computed        timestamptz
  );

  -- ============================================================
  -- TABLE 5: nudge_settings
  -- ============================================================
  create table public.nudge_settings (
    id                   uuid    primary key default gen_random_uuid(),
    user_id              uuid    not null unique references public.profiles (id) on delete cascade,
    email_nudge_enabled  boolean not null default true,
    nudge_time           time    not null default '09:00',
    last_nudged          timestamptz,
    nudge_frequency      text    not null default 'daily'
                                check (nudge_frequency in ('daily', 'every2days', 'weekly'))
  );

  -- ============================================================
  -- INDEXES
  -- ============================================================
  create index idx_conversations_user_id   on public.conversations (user_id);
  create index idx_conversations_started_at on public.conversations (started_at desc);
  create index idx_messages_conversation_id on public.messages (conversation_id);
  create index idx_messages_user_id         on public.messages (user_id);
  create index idx_messages_created_at      on public.messages (created_at desc);
  create index idx_user_patterns_user_id    on public.user_patterns (user_id);
  create index idx_nudge_settings_user_id   on public.nudge_settings (user_id);

  -- ============================================================
  -- ROW LEVEL SECURITY
  -- ============================================================

  alter table public.profiles       enable row level security;
  alter table public.conversations  enable row level security;
  alter table public.messages       enable row level security;
  alter table public.user_patterns  enable row level security;
  alter table public.nudge_settings enable row level security;

  -- ─── profiles policies ───────────────────────────────────────
  create policy "Users can view own profile"
    on public.profiles for select
    using (auth.uid() = id);

  create policy "Users can update own profile"
    on public.profiles for update
    using (auth.uid() = id)
    with check (auth.uid() = id);

  -- Insert handled by trigger (service role), not client
  create policy "System can insert profiles"
    on public.profiles for insert
    with check (auth.uid() = id);

  -- ─── conversations policies ───────────────────────────────────
  create policy "Users can view own conversations"
    on public.conversations for select
    using (auth.uid() = user_id);

  create policy "Users can insert own conversations"
    on public.conversations for insert
    with check (auth.uid() = user_id);

  create policy "Users can update own conversations"
    on public.conversations for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

  create policy "Users can delete own conversations"
    on public.conversations for delete
    using (auth.uid() = user_id);

  -- ─── messages policies ───────────────────────────────────────
  create policy "Users can view own messages"
    on public.messages for select
    using (auth.uid() = user_id);

  create policy "Users can insert own messages"
    on public.messages for insert
    with check (auth.uid() = user_id);

  -- Messages are immutable — no update or delete for users

  -- ─── user_patterns policies ──────────────────────────────────
  create policy "Users can view own patterns"
    on public.user_patterns for select
    using (auth.uid() = user_id);

  -- Patterns are written by server-side logic only (service role bypasses RLS)
  -- No client-side insert/update/delete policies needed

  -- ─── nudge_settings policies ─────────────────────────────────
  create policy "Users can view own nudge settings"
    on public.nudge_settings for select
    using (auth.uid() = user_id);

  create policy "Users can update own nudge settings"
    on public.nudge_settings for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

  -- ============================================================
  -- TRIGGERS & FUNCTIONS
  -- ============================================================

  -- ─── 1. Auto-create profile on auth.users insert ─────────────
  create or replace function public.handle_new_user()
  returns trigger
  language plpgsql
  security definer set search_path = public
  as $$
  begin
    insert into public.profiles (id)
    values (new.id)
    on conflict (id) do nothing;
    return new;
  end;
  $$;

  create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();

  -- ─── 2. Auto-create user_patterns + nudge_settings on profile insert ─
  create or replace function public.handle_new_profile()
  returns trigger
  language plpgsql
  security definer set search_path = public
  as $$
  begin
    insert into public.user_patterns (user_id)
    values (new.id)
    on conflict (user_id) do nothing;

    insert into public.nudge_settings (user_id)
    values (new.id)
    on conflict (user_id) do nothing;

    return new;
  end;
  $$;

  create trigger on_profile_created
    after insert on public.profiles
    for each row execute function public.handle_new_profile();

  -- ─── 3. Auto-update profiles.updated_at on any profile update ─
  create or replace function public.handle_profile_updated_at()
  returns trigger
  language plpgsql
  as $$
  begin
    new.updated_at = now();
    return new;
  end;
  $$;

  create trigger on_profile_updated
    before update on public.profiles
    for each row execute function public.handle_profile_updated_at();
