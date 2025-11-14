-- Create public avatars bucket if missing
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Allow public read access to avatars
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Avatar images are publicly accessible'
  ) then
    create policy "Avatar images are publicly accessible"
    on storage.objects
    for select
    using (bucket_id = 'avatars');
  end if;
end$$;

-- Allow authenticated users to upload to avatars
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Authenticated users can upload avatars'
  ) then
    create policy "Authenticated users can upload avatars"
    on storage.objects
    for insert
    with check (
      bucket_id = 'avatars' and auth.role() = 'authenticated'
    );
  end if;
end$$;

-- Allow owners to update/delete their own files
-- Update
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Avatar owners can update'
  ) then
    create policy "Avatar owners can update"
    on storage.objects
    for update
    using (bucket_id = 'avatars' and owner = auth.uid())
    with check (bucket_id = 'avatars' and owner = auth.uid());
  end if;
end$$;

-- Delete
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Avatar owners can delete'
  ) then
    create policy "Avatar owners can delete"
    on storage.objects
    for delete
    using (bucket_id = 'avatars' and owner = auth.uid());
  end if;
end$$;