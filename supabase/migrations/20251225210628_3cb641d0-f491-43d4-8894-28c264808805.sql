-- RPC to decline a pending friend request safely
create or replace function public.decline_friend_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.friend_requests
  set status = 'declined',
      updated_at = now()
  where id = p_request_id
    and requested_id = auth.uid()
    and status = 'pending';
end;
$$;

grant execute on function public.decline_friend_request(uuid) to authenticated;

-- RPC to accept a pending friend request safely (optional but keeps symmetry)
create or replace function public.accept_friend_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.friend_requests
  set status = 'accepted',
      updated_at = now()
  where id = p_request_id
    and requested_id = auth.uid()
    and status = 'pending';
end;
$$;

grant execute on function public.accept_friend_request(uuid) to authenticated;