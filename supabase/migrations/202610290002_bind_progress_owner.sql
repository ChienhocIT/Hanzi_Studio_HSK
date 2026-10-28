begin;
-- Bind the snapshot owner as well as the JWT. A sign-in change while a request
-- obtains its token must not write the previous account's snapshot to the new one.
drop function public.save_progress(integer,jsonb);
create function public.save_progress(expected_revision integer, payload jsonb, owner_uuid uuid default auth.uid()) returns integer
language plpgsql security definer set search_path = '' as $$
declare next_revision integer;
begin
  if auth.uid() is null or owner_uuid is distinct from auth.uid() then raise exception 'progress_owner_changed' using errcode='42501'; end if;
  if expected_revision is null or expected_revision < 0 or payload is null or jsonb_typeof(payload) <> 'object'
    or octet_length(payload::text) > 12582912 then raise exception 'invalid_progress'; end if;
  if exists(select 1 from jsonb_each(payload) e where e.key not in ('hanzi-studio-hsk3-prod-v1','hanzi-studio-curriculum-v4','hanzi-studio-video-lab-v1','hanzi-studio-situations-v4') or jsonb_typeof(e.value) <> 'object') then raise exception 'invalid_progress'; end if;
  if expected_revision = 0 then
    insert into public.learning_progress(user_id,snapshot) values(auth.uid(),payload) on conflict do nothing returning revision into next_revision;
  else
    update public.learning_progress set snapshot=payload, revision=revision+1, updated_at=now()
      where user_id=auth.uid() and revision=expected_revision returning revision into next_revision;
  end if;
  if next_revision is null then raise exception 'progress_conflict' using errcode='40001'; end if;
  return next_revision;
end $$;
revoke all on function public.save_progress(integer,jsonb,uuid) from public,anon;
grant execute on function public.save_progress(integer,jsonb,uuid) to authenticated;
commit;
