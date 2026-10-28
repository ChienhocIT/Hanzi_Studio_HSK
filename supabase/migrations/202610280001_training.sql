begin;
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '' check (length(display_name) <= 100),
  role text not null default 'student' check (role in ('student','teacher','admin')),
  created_at timestamptz not null default now()
);
create function private.new_profile() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id, display_name) values(new.id, left(coalesce(new.raw_user_meta_data->>'display_name',''),100));
  return new;
end $$;
create trigger hanzi_new_user after insert on auth.users for each row execute function private.new_profile();
insert into public.profiles(id) select id from auth.users on conflict do nothing;
create function private.has_role(roles text[]) returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role = any(roles));
$$;

create table public.learning_progress (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  snapshot jsonb not null default '{}'::jsonb check (jsonb_typeof(snapshot) = 'object' and octet_length(snapshot::text) <= 12582912),
  revision integer not null default 1 check (revision > 0),
  updated_at timestamptz not null default now()
);
create function public.save_progress(expected_revision integer, payload jsonb) returns integer
language plpgsql security definer set search_path = '' as $$
declare next_revision integer;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode='42501'; end if;
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

create table public.content_items (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id),
  title text not null check (length(trim(title)) between 1 and 160),
  kind text not null check (kind in ('vocabulary','grammar','reading','listening','dialogue')),
  level text not null check (level in ('1','2','3','4','5','6','7-9')),
  syllabus text not null check (length(trim(syllabus)) between 1 and 120),
  body text not null check (length(trim(body)) between 1 and 30000),
  source_url text not null check (source_url ~ '^https://[^[:space:]]+$' and length(source_url) <= 2000),
  license text not null check (length(trim(license)) between 1 and 500),
  status text not null default 'draft' check (status in ('draft','in_review','published','rejected')),
  review_note text not null default '' check (length(review_note) <= 2000),
  reviewer_id uuid references public.profiles(id),
  revision integer not null default 1,
  updated_at timestamptz not null default now()
);
create index content_status_level on public.content_items(status,level);
create table public.content_audit (
  id bigint generated always as identity primary key,
  content_id uuid not null references public.content_items(id),
  actor_id uuid not null references public.profiles(id),
  action text not null,
  revision integer not null,
  note text not null default '',
  created_at timestamptz not null default now()
);
create function public.save_content(item_id uuid, expected_revision integer, item jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare saved_id uuid;
begin
  if not private.has_role(array['teacher','admin']) then raise exception 'teacher_required' using errcode='42501'; end if;
  if item_id is null then
    insert into public.content_items(author_id,title,kind,level,syllabus,body,source_url,license)
    values(auth.uid(),item->>'title',item->>'kind',item->>'level',item->>'syllabus',item->>'body',item->>'source_url',item->>'license') returning id into saved_id;
  else
    update public.content_items set title=item->>'title',kind=item->>'kind',level=item->>'level',syllabus=item->>'syllabus',body=item->>'body',source_url=item->>'source_url',license=item->>'license',
      status='draft',reviewer_id=null,review_note='',revision=revision+1,updated_at=now()
      where id=item_id and author_id=auth.uid() and status in ('draft','rejected') and revision=expected_revision returning id into saved_id;
    if saved_id is null then raise exception 'content_conflict_or_forbidden'; end if;
  end if;
  insert into public.content_audit(content_id,actor_id,action,revision) select id,auth.uid(),'save',revision from public.content_items where id=saved_id;
  return saved_id;
end $$;
create function public.review_content(item_id uuid, expected_revision integer, decision text, note text default '') returns void
language plpgsql security definer set search_path = '' as $$
declare item public.content_items;
begin
  select * into item from public.content_items where id=item_id for update;
  if not found or item.revision <> expected_revision then raise exception 'content_conflict'; end if;
  if decision = 'in_review' then
    if item.author_id <> auth.uid() or item.status not in ('draft','rejected') or not private.has_role(array['teacher','admin']) then raise exception 'forbidden' using errcode='42501'; end if;
  elsif decision in ('published','rejected') then
    if not private.has_role(array['admin']) or item.status <> 'in_review' or item.author_id=auth.uid() then raise exception 'independent_reviewer_required' using errcode='42501'; end if;
    if decision='rejected' and length(trim(note))=0 then raise exception 'review_note_required'; end if;
  else raise exception 'invalid_transition';
  end if;
  update public.content_items set status=decision,review_note=coalesce(note,''),reviewer_id=case when decision='in_review' then null else auth.uid() end,revision=revision+1,updated_at=now() where id=item_id;
  insert into public.content_audit(content_id,actor_id,action,revision,note) values(item_id,auth.uid(),decision,item.revision+1,coalesce(note,''));
end $$;

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id),
  title text not null check (length(trim(title)) between 1 and 160),
  join_code text not null unique default replace(gen_random_uuid()::text,'-',''),
  open boolean not null default true,
  created_at timestamptz not null default now()
);
create table public.class_members (
  class_id uuid not null references public.classes(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key(class_id,student_id)
);
create index member_student on public.class_members(student_id);
create function private.teaches(class_uuid uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.classes where id=class_uuid and teacher_id=auth.uid());
$$;
create function private.enrolled(class_uuid uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.class_members where class_id=class_uuid and student_id=auth.uid());
$$;
create function public.create_class(class_title text) returns uuid language plpgsql security definer set search_path = '' as $$
declare result uuid;
begin
  if not private.has_role(array['teacher','admin']) then raise exception 'teacher_required' using errcode='42501'; end if;
  insert into public.classes(teacher_id,title) values(auth.uid(),class_title) returning id into result;
  return result;
end $$;
create function public.join_class(code text) returns uuid language plpgsql security definer set search_path = '' as $$
declare result uuid;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode='42501'; end if;
  select id into result from public.classes where join_code=trim(code) and open for share;
  if result is null then raise exception 'invalid_or_closed_class'; end if;
  insert into public.class_members(class_id,student_id) values(result,auth.uid()) on conflict do nothing;
  return result;
end $$;
create function public.set_class_open(class_uuid uuid, is_open boolean) returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.teaches(class_uuid) then raise exception 'forbidden' using errcode='42501'; end if;
  update public.classes set open=is_open where id=class_uuid;
end $$;

create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id),
  title text not null check (length(trim(title)) between 1 and 160),
  instructions text not null check (length(trim(instructions)) between 1 and 10000),
  content_id uuid not null references public.content_items(id),
  lesson jsonb not null,
  due_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index assignment_class on public.assignments(class_id);
create table public.submissions (
  assignment_id uuid not null references public.assignments(id),
  student_id uuid not null references public.profiles(id),
  answer text not null check (length(trim(answer)) between 1 and 30000),
  submitted_at timestamptz not null default now(),
  score integer check (score between 0 and 100),
  feedback text not null default '' check (length(feedback) <= 5000),
  graded_at timestamptz,
  primary key(assignment_id,student_id)
);
create function public.create_assignment(class_uuid uuid, assignment_title text, instructions text, item_id uuid, due_at timestamptz) returns uuid
language plpgsql security definer set search_path = '' as $$
declare result uuid; lesson jsonb;
begin
  if not private.teaches(class_uuid) then raise exception 'forbidden' using errcode='42501'; end if;
  if due_at is null or due_at <= now() then raise exception 'future_deadline_required'; end if;
  select jsonb_build_object('title',c.title,'body',c.body,'source_url',c.source_url,'license',c.license,'level',c.level,'syllabus',c.syllabus,'revision',c.revision)
    into lesson from public.content_items c where id=item_id and status='published' for share;
  if lesson is null then raise exception 'published_content_required'; end if;
  insert into public.assignments(class_id,title,instructions,content_id,lesson,due_at) values(class_uuid,assignment_title,instructions,item_id,lesson,due_at) returning id into result;
  return result;
end $$;
create function public.submit_assignment(assignment_uuid uuid, answer_text text) returns void
language plpgsql security definer set search_path = '' as $$
declare assignment public.assignments;
begin
  select * into assignment from public.assignments where id=assignment_uuid for share;
  if not found or not private.enrolled(assignment.class_id) then raise exception 'enrollment_required' using errcode='42501'; end if;
  if clock_timestamp() > assignment.due_at then raise exception 'deadline_passed'; end if;
  insert into public.submissions(assignment_id,student_id,answer) values(assignment_uuid,auth.uid(),answer_text)
    on conflict(assignment_id,student_id) do update set answer=excluded.answer,submitted_at=now() where public.submissions.score is null;
  if not found then raise exception 'already_graded'; end if;
end $$;
create function public.grade_submission(assignment_uuid uuid, student_uuid uuid, grade integer, comment text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not exists(select 1 from public.assignments where id=assignment_uuid and private.teaches(class_id)) then raise exception 'forbidden' using errcode='42501'; end if;
  if grade is null then raise exception 'score_required'; end if;
  update public.submissions set score=grade,feedback=coalesce(comment,''),graded_at=now() where assignment_id=assignment_uuid and student_id=student_uuid;
  if not found then raise exception 'submission_not_found'; end if;
end $$;
create function public.class_report(class_uuid uuid) returns table(student_id uuid, display_name text, assignment_id uuid, assignment_title text, submitted_at timestamptz, score integer)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.teaches(class_uuid) then raise exception 'forbidden' using errcode='42501'; end if;
  return query select m.student_id,p.display_name,a.id,a.title,s.submitted_at,s.score
    from public.class_members m join public.profiles p on p.id=m.student_id
    left join public.assignments a on a.class_id=m.class_id
    left join public.submissions s on s.assignment_id=a.id and s.student_id=m.student_id
    where m.class_id=class_uuid order by p.display_name,a.created_at;
end $$;
create function public.set_user_role(user_uuid uuid, new_role text) returns void language plpgsql security definer set search_path = '' as $$
begin
  lock table public.profiles in share row exclusive mode;
  if not private.has_role(array['admin']) then raise exception 'admin_required' using errcode='42501'; end if;
  if user_uuid=auth.uid() and new_role <> 'admin' then raise exception 'cannot_demote_self'; end if;
  update public.profiles set role=new_role where id=user_uuid;
  if not found then raise exception 'profile_not_found'; end if;
end $$;
create function public.update_display_name(name text) returns void language sql security definer set search_path = '' as $$
  update public.profiles set display_name=trim(name) where id=auth.uid();
$$;

alter table public.profiles enable row level security;
alter table public.learning_progress enable row level security;
alter table public.content_items enable row level security;
alter table public.content_audit enable row level security;
alter table public.classes enable row level security;
alter table public.class_members enable row level security;
alter table public.assignments enable row level security;
alter table public.submissions enable row level security;
create policy profiles_read on public.profiles for select to authenticated using(id=auth.uid() or private.has_role(array['admin']));
create policy progress_read on public.learning_progress for select to authenticated using(user_id=auth.uid());
create policy content_read on public.content_items for select to authenticated using(status='published' or author_id=auth.uid() or private.has_role(array['admin']));
create policy audit_read on public.content_audit for select to authenticated using(exists(select 1 from public.content_items where id=content_id and (author_id=auth.uid() or private.has_role(array['admin']))));
create policy classes_read on public.classes for select to authenticated using(private.teaches(id) or private.enrolled(id));
create policy members_read on public.class_members for select to authenticated using(student_id=auth.uid() or private.teaches(class_id));
create policy assignments_read on public.assignments for select to authenticated using(private.teaches(class_id) or private.enrolled(class_id));
create policy submissions_read on public.submissions for select to authenticated using(student_id=auth.uid() or exists(select 1 from public.assignments where id=assignment_id and private.teaches(class_id)));

-- All writes go through the narrow RPCs above, including for administrators.
revoke all on public.profiles,public.learning_progress,public.content_items,public.content_audit,public.classes,public.class_members,public.assignments,public.submissions from anon,authenticated;
grant select on public.profiles,public.learning_progress,public.content_items,public.content_audit,public.classes,public.class_members,public.assignments,public.submissions to authenticated;
revoke all on function private.new_profile() from public,anon,authenticated;
revoke all on function private.has_role(text[]),private.teaches(uuid),private.enrolled(uuid) from public,anon;
grant execute on function private.has_role(text[]),private.teaches(uuid),private.enrolled(uuid) to authenticated;
revoke all on function public.save_progress(integer,jsonb),public.save_content(uuid,integer,jsonb),public.review_content(uuid,integer,text,text),public.create_class(text),public.join_class(text),public.set_class_open(uuid,boolean),public.create_assignment(uuid,text,text,uuid,timestamptz),public.submit_assignment(uuid,text),public.grade_submission(uuid,uuid,integer,text),public.class_report(uuid),public.set_user_role(uuid,text),public.update_display_name(text) from public,anon;
grant execute on function public.save_progress(integer,jsonb),public.save_content(uuid,integer,jsonb),public.review_content(uuid,integer,text,text),public.create_class(text),public.join_class(text),public.set_class_open(uuid,boolean),public.create_assignment(uuid,text,text,uuid,timestamptz),public.submit_assignment(uuid,text),public.grade_submission(uuid,uuid,integer,text),public.class_report(uuid),public.set_user_role(uuid,text),public.update_display_name(text) to authenticated;
commit;
