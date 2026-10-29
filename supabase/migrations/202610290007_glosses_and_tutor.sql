begin;
-- English glosses for syllabus words (CC-CEDICT, CC BY-SA 4.0). They ride on the row, so the
-- existing vocab_read policy decides who sees them; reviewed status is not touched by gloss loads.
alter table public.vocab_entries
  add column gloss_en text[] not null default '{}' check (cardinality(gloss_en) <= 8),
  add column gloss_source_id text references public.data_sources(id);
create index vocab_gloss_source on public.vocab_entries(gloss_source_id);

-- AI tutor quota: one row per learner per Vietnam calendar day. Writes only through the RPC below;
-- the limit lives here so a caller cannot raise it.
create table public.tutor_usage (
  user_id uuid not null references public.profiles(id) on delete cascade,
  day date not null,
  used integer not null default 0 check (used between 0 and 30),
  last_at timestamptz not null default now(),
  primary key (user_id, day)
);
alter table public.tutor_usage enable row level security;
create policy tutor_usage_read on public.tutor_usage for select to authenticated using (user_id = (select auth.uid()));
revoke all on public.tutor_usage from public, anon, authenticated;
grant select on public.tutor_usage to authenticated;

-- Spend one message; returns how many are left today. Raises tutor_quota_exceeded after 30, and
-- tutor_rate_limited within 3 seconds of the previous message so one account cannot burst the shared
-- Gemini allowance. The check and the increment are one upsert, so concurrent calls cannot both pass.
create function public.consume_tutor_quota() returns integer
language plpgsql security definer set search_path = '' as $$
declare
  today date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
  used_now integer;
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode='42501'; end if;
  insert into public.tutor_usage as u (user_id, day, used) values (auth.uid(), today, 1)
    on conflict (user_id, day) do update set used = u.used + 1, last_at = now()
      where u.used < 30 and u.last_at <= now() - interval '3 seconds'
    returning used into used_now;
  if used_now is null then
    if (select used from public.tutor_usage where user_id = auth.uid() and day = today) >= 30 then
      raise exception 'tutor_quota_exceeded';
    end if;
    raise exception 'tutor_rate_limited';
  end if;
  return 30 - used_now;
end $$;

create function public.tutor_quota_left() returns integer
language sql stable security definer set search_path = '' as $$
  select 30 - coalesce((select used from public.tutor_usage
    where user_id = auth.uid() and day = (now() at time zone 'Asia/Ho_Chi_Minh')::date), 0)
  where auth.uid() is not null;
$$;

revoke all on function public.consume_tutor_quota(), public.tutor_quota_left() from public, anon;
grant execute on function public.consume_tutor_quota(), public.tutor_quota_left() to authenticated;
commit;
