-- Run this in Supabase SQL editor for your Aziza project

-- Book metadata (covers, progress, last opened)
create table if not exists book_metadata (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users(id) on delete cascade not null,
  title         text not null,
  author        text,
  format        text check (format in ('epub','pdf','mobi','cbz','cbr')) not null default 'epub',
  cover_data    text,           -- base64 thumbnail, extracted from book
  progress_pct  numeric(5,2)   default 0,
  last_opened   timestamptz,
  date_added    timestamptz    default now(),
  total_pages   int,
  current_page  int            default 0
);

-- Bookmarks
create table if not exists bookmarks (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade not null,
  book_id    uuid references book_metadata(id) on delete cascade not null,
  page       int not null,
  note       text,
  created_at timestamptz default now()
);

-- Voice assignments per book (character → kokoro voice)
create table if not exists voice_assignments (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete cascade not null,
  book_id      uuid references book_metadata(id) on delete cascade not null,
  character    text not null,
  voice_id     text not null,   -- kokoro voice id e.g. 'af_heart'
  unique (book_id, character)
);

-- Reading habits / sessions
create table if not exists reading_sessions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete cascade not null,
  book_id      uuid references book_metadata(id) on delete cascade,
  started_at   timestamptz default now(),
  ended_at     timestamptz,
  seconds_read int generated always as (
    extract(epoch from (ended_at - started_at))::int
  ) stored
);

-- RLS: users can only see their own rows
alter table book_metadata      enable row level security;
alter table bookmarks          enable row level security;
alter table voice_assignments  enable row level security;
alter table reading_sessions   enable row level security;

create policy "own books"      on book_metadata      for all using (auth.uid() = user_id);
create policy "own bookmarks"  on bookmarks          for all using (auth.uid() = user_id);
create policy "own voices"     on voice_assignments  for all using (auth.uid() = user_id);
create policy "own sessions"   on reading_sessions   for all using (auth.uid() = user_id);
