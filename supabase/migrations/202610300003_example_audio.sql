begin;
create table public.example_audio (
  syllabus text not null,seq integer not null,zh_id integer not null,audio_id integer not null check(audio_id>0),
  author text not null check(length(trim(author)) between 1 and 100),
  license text not null check(license in ('CC0 1.0','CC BY 2.0','CC BY 2.0 FR','CC BY 3.0','CC BY 4.0')),
  attribution_url text not null check(attribution_url ~ '^https://tatoeba\.org/'),
  sha256 text not null check(sha256 ~ '^[a-f0-9]{64}$'),source_id text not null references public.data_sources(id),
  review_status text not null default 'draft' check(review_status in ('draft','published','rejected')),
  reviewer_id uuid references public.profiles(id) on delete set null,reviewed_at timestamptz,
  primary key(syllabus,seq,zh_id,audio_id),
  foreign key(syllabus,seq,zh_id) references public.example_sentences(syllabus,seq,zh_id) on delete cascade
);
create function public.review_example_audio(entry_syllabus text,entry_seq integer,entry_zh_id integer,entry_audio_id integer,decision text) returns integer
language plpgsql security definer set search_path='' as $$
declare changed integer;
begin
  if not private.has_role(array['admin']) then raise exception 'admin_required' using errcode='42501'; end if;
  if decision is null or decision not in ('draft','published','rejected') then raise exception 'invalid_transition'; end if;
  if decision='published' and not exists(select 1 from public.example_sentences where syllabus=entry_syllabus and seq=entry_seq and zh_id=entry_zh_id and review_status='published') then raise exception 'publish_sentence_first'; end if;
  update public.example_audio set review_status=decision,reviewer_id=case when decision='draft' then null else auth.uid() end,reviewed_at=case when decision='draft' then null else now() end
    where syllabus=entry_syllabus and seq=entry_seq and zh_id=entry_zh_id and audio_id=entry_audio_id;
  get diagnostics changed=row_count;return changed;
end $$;
alter table public.example_audio enable row level security;
create policy example_audio_read on public.example_audio for select to authenticated using(private.has_role(array['teacher','admin']) or (review_status='published' and exists(select 1 from public.example_sentences e where e.syllabus=example_audio.syllabus and e.seq=example_audio.seq and e.zh_id=example_audio.zh_id and e.review_status='published')));
revoke all on public.example_audio from public,anon,authenticated;
grant select on public.example_audio to authenticated;
revoke all on function public.review_example_audio(text,integer,integer,integer,text) from public,anon;
grant execute on function public.review_example_audio(text,integer,integer,integer,text) to authenticated;
commit;
