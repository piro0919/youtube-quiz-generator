-- Supabase SQL Editor で実行してください

-- rooms テーブル
create table rooms (
  id uuid default gen_random_uuid() primary key,
  code text unique not null,
  video_url text not null,
  video_title text not null,
  quiz jsonb not null,
  status text default 'waiting' check (status in ('waiting', 'playing', 'finished')),
  current_question int default 0,
  question_started_at timestamptz,
  created_at timestamptz default now()
);

-- players テーブル
create table players (
  id uuid default gen_random_uuid() primary key,
  room_id uuid references rooms(id) on delete cascade,
  name text not null,
  score int default 0,
  answers jsonb default '[]',
  is_host boolean default false,
  created_at timestamptz default now()
);

-- インデックス
create index rooms_code_idx on rooms(code);
create index players_room_id_idx on players(room_id);

-- Realtime を有効にする
alter publication supabase_realtime add table rooms;
alter publication supabase_realtime add table players;

-- RLS (Row Level Security) ポリシー
alter table rooms enable row level security;
alter table players enable row level security;

-- 誰でも読み書きできるポリシー（デモ用）
create policy "Anyone can read rooms" on rooms for select using (true);
create policy "Anyone can insert rooms" on rooms for insert with check (true);
create policy "Anyone can update rooms" on rooms for update using (true);

create policy "Anyone can read players" on players for select using (true);
create policy "Anyone can insert players" on players for insert with check (true);
create policy "Anyone can update players" on players for update using (true);
create policy "Anyone can delete players" on players for delete using (true);
create policy "Anyone can delete rooms" on rooms for delete using (true);

-- 古いルームを自動削除する関数
create or replace function delete_old_rooms()
returns void as $$
begin
  delete from rooms where created_at < now() - interval '24 hours';
end;
$$ language plpgsql;

-- pg_cronで1時間ごとに実行（Supabase Pro以上で利用可能）
-- select cron.schedule('delete-old-rooms', '0 * * * *', 'select delete_old_rooms()');
