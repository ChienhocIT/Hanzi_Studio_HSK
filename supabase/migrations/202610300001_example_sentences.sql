begin;
-- Chinese–Vietnamese example sentences for syllabus words, loaded as drafts from Tatoeba by the release
-- operator (scripts/seed-examples.mjs). Each row keeps both sentence IDs and authors, because the text
-- license (CC BY 2.0 FR) requires crediting every author. Learners only read rows an administrator published.
create table public.example_sentences (
  syllabus text not null,
  seq integer not null,
  zh_id integer not null check (zh_id > 0),
  zh text not null check (length(trim(zh)) between 1 and 200),
  zh_author text check (length(zh_author) <= 100),
  vi_id integer not null check (vi_id > 0),
  vi text not null check (length(trim(vi)) between 1 and 500),
  vi_author text check (length(vi_author) <= 100),
  license text not null check (license in ('CC BY 2.0 FR','CC0 1.0')),
  source_id text not null references public.data_sources(id),
  review_status text not null default 'draft' check (review_status in ('draft','published','rejected')),
  reviewer_id uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  primary key (syllabus, seq, zh_id),
  foreign key (syllabus, seq) references public.vocab_entries(syllabus, seq) on delete cascade
);

create function public.review_example_sentences(entry_syllabus text, entry_seq integer, entry_zh_ids integer[], decision text) returns integer
language plpgsql security definer set search_path = '' as $$
declare changed integer;
begin
  if not private.has_role(array['admin']) then raise exception 'admin_required' using errcode='42501'; end if;
  if decision is null or decision not in ('draft','published','rejected') then raise exception 'invalid_transition'; end if;
  if entry_zh_ids is null or cardinality(entry_zh_ids) not between 1 and 100 then raise exception 'invalid_selection'; end if;
  update public.example_sentences set review_status=decision,
    reviewer_id=case when decision='draft' then null else auth.uid() end,
    reviewed_at=case when decision='draft' then null else now() end
    where syllabus=entry_syllabus and seq=entry_seq and zh_id=any(entry_zh_ids);
  get diagnostics changed=row_count;
  return changed;
end $$;

alter table public.example_sentences enable row level security;
create policy examples_read on public.example_sentences for select to authenticated using(review_status='published' or private.has_role(array['teacher','admin']));
revoke all on public.example_sentences from public,anon,authenticated;
grant select on public.example_sentences to authenticated;
revoke all on function public.review_example_sentences(text,integer,integer[],text) from public,anon;
grant execute on function public.review_example_sentences(text,integer,integer[],text) to authenticated;
commit;
