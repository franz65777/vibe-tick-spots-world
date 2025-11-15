-- Create public avatars bucket if it doesn't exist
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Drop existing policies if they exist
drop policy if exists "Public read avatars" on storage.objects;
drop policy if exists "Users insert own avatars" on storage.objects;
drop policy if exists "Users update own avatars" on storage.objects;
drop policy if exists "Users delete own avatars" on storage.objects;

-- Allow anyone to read avatars (since bucket is public)
create policy "Public read avatars"
  on storage.objects for select
  using (bucket_id = 'avatars');

-- Allow authenticated users to upload/update/delete only within their own folder (first segment = user id)
create policy "Users insert own avatars"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users update own avatars"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users delete own avatars"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]
  );