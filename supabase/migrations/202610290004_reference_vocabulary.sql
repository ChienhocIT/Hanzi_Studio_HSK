begin;
-- Syllabus word lists, kept per syllabus version so HSK 2.0, GF 0025-2021 and the 2025 exam
-- syllabus never overwrite each other. Rows are loaded by the release operator
-- (scripts/seed-vocabulary.mjs); learners only read rows an administrator has published.
create table public.data_sources (
  id text primary key check (id ~ '^[a-z0-9][a-z0-9-]{2,79}$'),
  title text not null check (length(trim(title)) between 1 and 300),
  url text not null check (url ~ '^https?://[^[:space:]]+$' and length(url) <= 2000),
  sha256 text not null check (sha256 ~ '^[a-f0-9]{64}$'),
  license text not null check (length(trim(license)) between 1 and 500),
  attribution text not null check (length(trim(attribution)) between 1 and 1000),
  retrieved_at timestamptz not null
);
create table public.vocab_entries (
  syllabus text not null check (syllabus in ('HSK 2.0','HSK 3.0 (GF 0025-2021)','HSK 3.0 (CLEC 2025)')),
  seq integer not null check (seq between 1 and 20000),
  level text not null check (level in ('1','2','3','4','5','6','7-9')),
  extra_levels text[] not null default '{}' check (extra_levels <@ array['1','2','3','4','5','6','7-9']),
  word text not null check (word ~ '^[㐀-鿿]{1,20}$'),
  homograph smallint check (homograph between 1 and 9),
  pinyin text not null check (length(trim(pinyin)) between 1 and 120),
  pos text[] not null default '{}',
  pos_extra text[] not null default '{}',
  source_id text not null references public.data_sources(id),
  source_page integer check (source_page > 0),
  review_status text not null default 'draft' check (review_status in ('draft','published','rejected')),
  reviewer_id uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  primary key (syllabus, seq)
);
create index vocab_level on public.vocab_entries(syllabus, level);
create index vocab_word on public.vocab_entries(word);

create function public.review_vocab_entries(entry_syllabus text, entry_seqs integer[], decision text) returns integer
language plpgsql security definer set search_path = '' as $$
declare changed integer;
begin
  if not private.has_role(array['admin']) then raise exception 'admin_required' using errcode='42501'; end if;
  if decision not in ('draft','published','rejected') then raise exception 'invalid_transition'; end if;
  if entry_seqs is null or cardinality(entry_seqs) not between 1 and 1000 then raise exception 'invalid_selection'; end if;
  update public.vocab_entries set review_status=decision,
    reviewer_id=case when decision='draft' then null else auth.uid() end,
    reviewed_at=case when decision='draft' then null else now() end
    where syllabus=entry_syllabus and seq=any(entry_seqs);
  get diagnostics changed=row_count;
  return changed;
end $$;

alter table public.data_sources enable row level security;
alter table public.vocab_entries enable row level security;
create policy sources_read on public.data_sources for select to authenticated using(true);
create policy vocab_read on public.vocab_entries for select to authenticated using(review_status='published' or private.has_role(array['teacher','admin']));
revoke all on public.data_sources,public.vocab_entries from public,anon,authenticated;
grant select on public.data_sources,public.vocab_entries to authenticated;
revoke all on function public.review_vocab_entries(text,integer[],text) from public,anon;
grant execute on function public.review_vocab_entries(text,integer[],text) to authenticated;
commit;
