begin;
alter table public.assignments add column format text not null default 'essay' check(format in ('essay','quiz'));
-- Learners can read prompts and options, never the answer key.
create table public.assignment_questions (
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  position integer not null check(position between 0 and 49),
  prompt text not null check(length(trim(prompt)) between 1 and 2000),
  options jsonb not null check(jsonb_typeof(options)='array' and jsonb_array_length(options) between 2 and 6),
  primary key(assignment_id,position)
);
create table private.quiz_answers (
  assignment_id uuid not null,
  position integer not null,
  correct_index integer not null check(correct_index between 0 and 5),
  primary key(assignment_id,position),
  foreign key(assignment_id,position) references public.assignment_questions(assignment_id,position) on delete cascade
);
alter table public.assignment_questions enable row level security;
alter table private.quiz_answers enable row level security;
revoke all on public.assignment_questions,private.quiz_answers from public,anon,authenticated;
grant select on public.assignment_questions to authenticated;
create policy questions_read on public.assignment_questions for select to authenticated using(
  exists(select 1 from public.assignments a where a.id=assignment_id and (private.teaches(a.class_id) or private.enrolled(a.class_id)))
);
create function public.create_quiz_assignment(class_uuid uuid, assignment_title text, instructions text, item_id uuid, due_at timestamptz, questions jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare result uuid; question jsonb; idx integer := 0; option_count integer; correct integer;
begin
  if not private.teaches(class_uuid) then raise exception 'forbidden' using errcode='42501'; end if;
  if questions is null or jsonb_typeof(questions)<>'array' or jsonb_array_length(questions) not between 1 and 50 then raise exception 'invalid_questions'; end if;
  if octet_length(questions::text)>500000 then raise exception 'invalid_questions'; end if;
  result := public.create_assignment(class_uuid,assignment_title,instructions,item_id,due_at);
  update public.assignments set format='quiz' where id=result;
  for question in select value from jsonb_array_elements(questions) loop
    if jsonb_typeof(question)<>'object' or jsonb_typeof(question->'prompt') is distinct from 'string'
      or jsonb_typeof(question->'options') is distinct from 'array'
      or jsonb_typeof(question->'correct_index') is distinct from 'number' then raise exception 'invalid_questions'; end if;
    option_count := jsonb_array_length(question->'options');
    if option_count not between 2 and 6 or (question->>'correct_index') !~ '^[0-5]$' then raise exception 'invalid_questions'; end if;
    correct := (question->>'correct_index')::integer;
    if correct >= option_count or exists(select 1 from jsonb_array_elements(question->'options') o where jsonb_typeof(o)<>'string' or length(trim(o#>>'{}')) not between 1 and 1000)
      or (select count(distinct trim(o#>>'{}')) from jsonb_array_elements(question->'options') o) <> option_count then raise exception 'invalid_questions'; end if;
    insert into public.assignment_questions(assignment_id,position,prompt,options) values(result,idx,question->>'prompt',question->'options');
    insert into private.quiz_answers values(result,idx,correct);
    idx := idx+1;
  end loop;
  return result;
end $$;
create function public.submit_quiz(assignment_uuid uuid, answers jsonb) returns integer
language plpgsql security definer set search_path = '' as $$
declare assignment public.assignments; question public.assignment_questions; chosen jsonb; total integer; correct integer := 0; grade integer;
begin
  select * into assignment from public.assignments where id=assignment_uuid for share;
  if not found or not private.enrolled(assignment.class_id) then raise exception 'enrollment_required' using errcode='42501'; end if;
  if assignment.format<>'quiz' then raise exception 'quiz_required'; end if;
  if clock_timestamp()>assignment.due_at then raise exception 'deadline_passed'; end if;
  select count(*) into total from public.assignment_questions where assignment_id=assignment_uuid;
  if answers is null or jsonb_typeof(answers)<>'array' or jsonb_array_length(answers)<>total or total=0 then raise exception 'all_answers_required'; end if;
  for question in select * from public.assignment_questions where assignment_id=assignment_uuid order by position loop
    chosen := answers->question.position;
    if jsonb_typeof(chosen) is distinct from 'number' or chosen::text !~ '^[0-5]$' then raise exception 'invalid_answer'; end if;
    if chosen::text::integer >= jsonb_array_length(question.options) then raise exception 'invalid_answer'; end if;
    if exists(select 1 from private.quiz_answers k where k.assignment_id=assignment_uuid and k.position=question.position and k.correct_index=chosen::text::integer) then correct:=correct+1; end if;
  end loop;
  grade := round(correct*100.0/total)::integer;
  insert into public.submissions(assignment_id,student_id,answer,score,feedback,graded_at)
    values(assignment_uuid,auth.uid(),answers::text,grade,'Đúng '||correct||' / '||total||' câu. Chấm tự động trên server.',now()) on conflict do nothing;
  if not found then raise exception 'already_submitted'; end if;
  return grade;
end $$;
-- Prevent the essay endpoint from bypassing one-attempt automatic grading.
create or replace function public.submit_assignment(assignment_uuid uuid, answer_text text) returns void
language plpgsql security definer set search_path = '' as $$
declare assignment public.assignments;
begin
  select * into assignment from public.assignments where id=assignment_uuid for share;
  if not found or not private.enrolled(assignment.class_id) then raise exception 'enrollment_required' using errcode='42501'; end if;
  if assignment.format<>'essay' then raise exception 'essay_required'; end if;
  if clock_timestamp()>assignment.due_at then raise exception 'deadline_passed'; end if;
  insert into public.submissions(assignment_id,student_id,answer) values(assignment_uuid,auth.uid(),answer_text)
    on conflict(assignment_id,student_id) do update set answer=excluded.answer,submitted_at=now() where public.submissions.score is null;
  if not found then raise exception 'already_graded'; end if;
end $$;
create or replace function public.grade_submission(assignment_uuid uuid, student_uuid uuid, grade integer, comment text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not exists(select 1 from public.assignments where id=assignment_uuid and private.teaches(class_id)) then raise exception 'forbidden' using errcode='42501'; end if;
  if exists(select 1 from public.assignments where id=assignment_uuid and format<>'essay') then raise exception 'essay_required'; end if;
  if grade is null then raise exception 'score_required'; end if;
  update public.submissions set score=grade,feedback=coalesce(comment,''),graded_at=now() where assignment_id=assignment_uuid and student_id=student_uuid;
  if not found then raise exception 'submission_not_found'; end if;
end $$;
revoke all on function public.create_quiz_assignment(uuid,text,text,uuid,timestamptz,jsonb),public.submit_quiz(uuid,jsonb) from public,anon;
grant execute on function public.create_quiz_assignment(uuid,text,text,uuid,timestamptz,jsonb),public.submit_quiz(uuid,jsonb) to authenticated;
commit;
