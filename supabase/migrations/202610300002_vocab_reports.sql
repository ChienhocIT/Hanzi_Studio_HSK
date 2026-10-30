begin;
create table public.vocab_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  syllabus text not null,
  seq integer not null,
  kind text not null check(kind in ('meaning','pinyin')),
  reason text not null check(reason in ('ambiguous','incorrect','missing')),
  message text not null check(length(message)<=500),
  options jsonb not null check(jsonb_typeof(options)='array' and jsonb_array_length(options)=4),
  correct_option integer not null check(correct_option between 0 and 3),
  status text not null default 'open' check(status in ('open','resolved')),
  created_at timestamptz not null default now(),
  reviewer_id uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  review_note text,
  foreign key(syllabus,seq) references public.vocab_entries(syllabus,seq) on delete cascade
);
create unique index vocab_report_open on public.vocab_reports(reporter_id,syllabus,seq,kind) where status='open';
create index vocab_report_queue on public.vocab_reports(created_at) where status='open';
create function public.report_vocab_question(entry_seq integer,question_kind text,report_reason text,report_message text,question_options jsonb,correct_index integer) returns uuid
language plpgsql security definer set search_path='' as $$
declare owner_id uuid:=auth.uid(); existing_id uuid; result_id uuid;
begin
  if owner_id is null then raise exception 'login_required' using errcode='42501'; end if;
  if question_kind is null or question_kind not in ('meaning','pinyin') or report_reason is null or report_reason not in ('ambiguous','incorrect','missing')
    or report_message is null or length(report_message)>500 or correct_index is null or correct_index not between 0 and 3
    or question_options is null or jsonb_typeof(question_options)<>'array' then raise exception 'invalid_report'; end if;
  if jsonb_array_length(question_options)<>4 then raise exception 'invalid_report'; end if;
  if exists(select 1 from jsonb_array_elements(question_options) v where jsonb_typeof(v)<>'string' or length(trim(v#>>'{}')) not between 1 and 500) then raise exception 'invalid_report'; end if;
  if not exists(select 1 from public.vocab_entries where syllabus='HSK 3.0 (CLEC 2025)' and seq=entry_seq and review_status='published') then raise exception 'entry_unavailable'; end if;
  perform pg_advisory_xact_lock(hashtextextended(owner_id::text||'vocab-report',0));
  select id into existing_id from public.vocab_reports where reporter_id=owner_id and syllabus='HSK 3.0 (CLEC 2025)' and seq=entry_seq and kind=question_kind and status='open';
  if existing_id is not null then return existing_id; end if;
  if (select count(*) from public.vocab_reports where reporter_id=owner_id and created_at>=now()-interval '1 day')>=20 then raise exception 'report_quota'; end if;
  insert into public.vocab_reports(reporter_id,syllabus,seq,kind,reason,message,options,correct_option)
    values(owner_id,'HSK 3.0 (CLEC 2025)',entry_seq,question_kind,report_reason,trim(report_message),question_options,correct_index) returning id into result_id;
  return result_id;
end $$;
create function public.resolve_vocab_report(report_id uuid,note text) returns integer
language plpgsql security definer set search_path='' as $$
declare changed integer;
begin
  if not private.has_role(array['admin']) then raise exception 'admin_required' using errcode='42501'; end if;
  if note is null or length(trim(note)) not between 3 and 500 then raise exception 'review_note_required'; end if;
  update public.vocab_reports set status='resolved',review_note=trim(note),reviewer_id=auth.uid(),reviewed_at=now() where id=report_id and status='open';
  get diagnostics changed=row_count;return changed;
end $$;
alter table public.vocab_reports enable row level security;
create policy vocab_reports_read on public.vocab_reports for select to authenticated using(reporter_id=auth.uid() or private.has_role(array['admin']));
revoke all on public.vocab_reports from public,anon,authenticated;
grant select on public.vocab_reports to authenticated;
revoke all on function public.report_vocab_question(integer,text,text,text,jsonb,integer),public.resolve_vocab_report(uuid,text) from public,anon;
grant execute on function public.report_vocab_question(integer,text,text,text,jsonb,integer),public.resolve_vocab_report(uuid,text) to authenticated;
commit;
