-- Create the posts table
create table if not exists posts (
  id uuid default gen_random_uuid() primary key,
  slug text unique not null,
  title text not null,
  excerpt text,
  content text not null, -- Paste your HTML content here
  image_url text,
  category text,
  published_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS to be safe (read-only for public)
alter table posts enable row level security;

-- Policy: Everyone can read posts
create policy "Public posts are viewable by everyone" 
on posts for select 
using (true);

-- Policy: Only service role (API) can insert/update (or you via dashboard)
-- Note: Dashboard users (you) automatically bypass RLS.
