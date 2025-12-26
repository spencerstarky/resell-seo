-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Listings Table
create table public.listings (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  ebay_item_id text,
  original_title text not null,
  optimized_title text,
  image_url text, 
  price text,
  status text check (status in ('pending', 'optimized', 'uploaded')) default 'pending',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.listings enable row level security;

-- Policies for Listings
create policy "Users can view their own listings"
  on public.listings for select
  using (auth.uid() = user_id);

create policy "Users can insert their own listings"
  on public.listings for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own listings"
  on public.listings for update
  using (auth.uid() = user_id);

create policy "Users can delete their own listings"
  on public.listings for delete
  using (auth.uid() = user_id);

-- eBay Tokens Table (Secure storage)
create table public.ebay_tokens (
  user_id uuid references auth.users(id) on delete cascade primary key,
  access_token text not null,
  refresh_token text not null,
  access_token_expires_at timestamp with time zone not null,
  refresh_token_expires_at timestamp with time zone not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.ebay_tokens enable row level security;

-- Policies for Tokens (Only the user can see/edit their own tokens)
create policy "Users can manage their own tokens"
  on public.ebay_tokens for all
  using (auth.uid() = user_id);
-- Profiles Table (For usage tracking)
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text,
  usage_count integer default 0,
  plan_tier text default 'free',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for Profiles
alter table public.profiles enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Trigger to create profile on signup
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
