begin;
create table public.live_rooms (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id),
  host_id uuid not null references public.profiles(id),
  join_code text not null unique default upper(substr(replace(gen_random_uuid()::text,'-',''),1,8)),
  state text not null default 'waiting' check(state in ('waiting','running','ended')),
  duration_seconds integer not null check(duration_seconds between 60 and 7200),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now()+interval '24 hours',
  started_at timestamptz,
  ends_at timestamptz,
  finalized boolean not null default false
);
create index live_room_assignment on public.live_rooms(assignment_id);
create table public.live_participants (
  room_id uuid not null references public.live_rooms(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  joined_at timestamptz not null default now(),
  primary key(room_id,user_id)
);
create table private.live_results (
  room_id uuid not null,
  user_id uuid not null,
  answers jsonb not null,
  score integer not null check(score between 0 and 100),
  submitted_at timestamptz not null default now(),
  primary key(room_id,user_id),
  foreign key(room_id,user_id) references public.live_participants(room_id,user_id)
);
create table private.live_drafts (
  room_id uuid not null,
  user_id uuid not null,
  answers jsonb not null,
  primary key(room_id,user_id),
  foreign key(room_id,user_id) references public.live_participants(room_id,user_id)
);
-- Room access uses RPCs only; answer keys and scores are never selectable.
alter table public.live_rooms enable row level security;
alter table public.live_participants enable row level security;
alter table private.live_results enable row level security;
alter table private.live_drafts enable row level security;
revoke all on public.live_rooms,public.live_participants,private.live_results,private.live_drafts from public,anon,authenticated;

create function private.finalize_live_room(room_uuid uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare room public.live_rooms;
begin
  select * into room from public.live_rooms where id=room_uuid for update;
  if room.finalized or room.started_at is null or room.ends_at>clock_timestamp() then return; end if;
  -- A reader finalizes saved drafts after the server deadline, including blanks.
  insert into private.live_results(room_id,user_id,answers,score,submitted_at)
  select p.room_id,p.user_id,jsonb_agg(coalesce(d.answers->q.position,'null'::jsonb) order by q.position),
    round(100.0*count(*) filter(where d.answers->q.position=to_jsonb(k.correct_index))/count(*))::integer,room.ends_at
    from public.live_participants p join public.assignment_questions q on q.assignment_id=room.assignment_id
    join private.quiz_answers k on k.assignment_id=q.assignment_id and k.position=q.position
    left join private.live_drafts d on d.room_id=p.room_id and d.user_id=p.user_id
    where p.room_id=room_uuid group by p.room_id,p.user_id on conflict do nothing;
  update public.live_rooms set finalized=true,state='ended' where id=room_uuid;
end $$;
revoke all on function private.finalize_live_room(uuid) from public,anon,authenticated;

create function public.create_live_room(assignment_uuid uuid, duration_seconds integer) returns uuid
language plpgsql security definer set search_path = '' as $$
declare assignment public.assignments; result uuid;
begin
  select * into assignment from public.assignments where id=assignment_uuid for share;
  if not found or not private.teaches(assignment.class_id) then raise exception 'forbidden' using errcode='42501'; end if;
  if assignment.format<>'quiz' then raise exception 'quiz_required'; end if;
  -- Serialize creation per class, so the active-room bound also holds concurrently.
  perform 1 from public.classes where id=assignment.class_id for update;
  if (select count(*) from public.live_rooms r join public.assignments a on a.id=r.assignment_id
      where a.class_id=assignment.class_id and ((r.state='waiting' and r.expires_at>clock_timestamp()) or (r.state='running' and r.ends_at>clock_timestamp())))>=10 then raise exception 'room_limit'; end if;
  insert into public.live_rooms(assignment_id,host_id,duration_seconds) values(assignment_uuid,auth.uid(),duration_seconds) returning id into result;
  return result;
end $$;
create function public.join_live_room(code text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare room public.live_rooms; class_uuid uuid;
begin
  select * into room from public.live_rooms where join_code=upper(trim(code)) for update;
  if not found then raise exception 'room_unavailable'; end if;
  select class_id into class_uuid from public.assignments where id=room.assignment_id;
  if not private.enrolled(class_uuid) then raise exception 'enrollment_required' using errcode='42501'; end if;
  if exists(select 1 from public.live_participants where room_id=room.id and user_id=auth.uid()) then return room.id; end if;
  if room.state<>'waiting' or room.expires_at<=clock_timestamp() then raise exception 'room_unavailable'; end if;
  if (select count(*) from public.live_participants where room_id=room.id)>=100 then raise exception 'room_full'; end if;
  insert into public.live_participants(room_id,user_id) values(room.id,auth.uid());
  return room.id;
end $$;
create function public.control_live_room(room_uuid uuid, command text) returns void
language plpgsql security definer set search_path = '' as $$
declare room public.live_rooms;
begin
  select * into room from public.live_rooms where id=room_uuid for update;
  if not found or room.host_id<>auth.uid() or auth.uid() is null then raise exception 'forbidden' using errcode='42501'; end if;
  if command='start' then
    if room.state<>'waiting' or room.expires_at<=clock_timestamp() then raise exception 'room_unavailable'; end if;
    update public.live_rooms set state='running',started_at=clock_timestamp(),ends_at=clock_timestamp()+make_interval(secs=>duration_seconds) where id=room_uuid;
  elsif command='end' then
    update public.live_rooms set state='ended',ends_at=least(coalesce(ends_at,clock_timestamp()),clock_timestamp()) where id=room_uuid;
  else raise exception 'invalid_command'; end if;
end $$;
create function public.list_live_rooms(class_uuid uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare result jsonb;
begin
  if not private.teaches(class_uuid) and not private.enrolled(class_uuid) then raise exception 'enrollment_required' using errcode='42501'; end if;
  select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) into result from (
    select r.id,a.title,r.created_at,case when r.state='running' and r.ends_at<=clock_timestamp() then 'ended' when r.state='waiting' and r.expires_at<=clock_timestamp() then 'expired' else r.state end state
    from public.live_rooms r join public.assignments a on a.id=r.assignment_id where a.class_id=class_uuid
    and (r.host_id=auth.uid() or exists(select 1 from public.live_participants p where p.room_id=r.id and p.user_id=auth.uid()))
    order by r.created_at desc limit 20
  ) x;
  return result;
end $$;
create function public.get_live_room(room_uuid uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare room public.live_rooms; assignment public.assignments; status text; host boolean; roster jsonb; questions jsonb; my_result jsonb;
begin
  select * into room from public.live_rooms where id=room_uuid;
  if not found or auth.uid() is null then raise exception 'room_unavailable'; end if;
  select * into assignment from public.assignments where id=room.assignment_id;
  host := room.host_id=auth.uid();
  if not host and (not private.enrolled(assignment.class_id) or not exists(select 1 from public.live_participants where room_id=room_uuid and user_id=auth.uid())) then raise exception 'enrollment_required' using errcode='42501'; end if;
  status := case when room.state='running' and room.ends_at<=clock_timestamp() then 'ended' when room.state='waiting' and room.expires_at<=clock_timestamp() then 'expired' else room.state end;
  if status='ended' then perform private.finalize_live_room(room_uuid); end if;
  if status in ('running','ended') then
    select coalesce(jsonb_agg(jsonb_build_object('position',position,'prompt',prompt,'options',options) order by position),'[]'::jsonb) into questions from public.assignment_questions where assignment_id=room.assignment_id;
  else questions:='[]'::jsonb; end if;
  select coalesce(jsonb_agg(jsonb_build_object('user_id',p.user_id,'display_name',pr.display_name,'submitted',s.user_id is not null,
    'score',case when status='ended' then s.score else null end,'submitted_at',case when status='ended' then s.submitted_at else null end)
    order by case when status='ended' then s.score end desc nulls last,case when status='ended' then s.submitted_at end,p.joined_at),'[]'::jsonb) into roster
    from public.live_participants p join public.profiles pr on pr.id=p.user_id left join private.live_results s on s.room_id=p.room_id and s.user_id=p.user_id where p.room_id=room_uuid;
  select jsonb_build_object('answers',answers,'score',case when status='ended' then score else null end) into my_result from private.live_results where room_id=room_uuid and user_id=auth.uid();
  return jsonb_build_object('id',room.id,'title',assignment.title,'instructions',assignment.instructions,'host',host,'join_code',case when host and status='waiting' then room.join_code else null end,
    'state',status,'server_now',clock_timestamp(),'ends_at',room.ends_at,'expires_at',room.expires_at,'questions',questions,'participants',roster,'my_result',my_result,
    'my_draft',(select answers from private.live_drafts where room_id=room_uuid and user_id=auth.uid()));
end $$;
create function public.save_live_answers(room_uuid uuid, answers jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare room public.live_rooms; question public.assignment_questions; chosen jsonb; total integer;
begin
  select * into room from public.live_rooms where id=room_uuid for update;
  if not found or auth.uid() is null or not exists(select 1 from public.live_participants where room_id=room_uuid and user_id=auth.uid())
    or not exists(select 1 from public.assignments where id=room.assignment_id and private.enrolled(class_id)) then raise exception 'enrollment_required' using errcode='42501'; end if;
  if room.state<>'running' or room.ends_at<=clock_timestamp() then raise exception 'room_not_running'; end if;
  if exists(select 1 from private.live_results where room_id=room_uuid and user_id=auth.uid()) then raise exception 'already_submitted'; end if;
  select count(*) into total from public.assignment_questions where assignment_id=room.assignment_id;
  if answers is null or jsonb_typeof(answers)<>'array' or jsonb_array_length(answers)<>total or total=0 then raise exception 'all_answers_required'; end if;
  for question in select * from public.assignment_questions where assignment_id=room.assignment_id loop
    chosen:=answers->question.position;
    if chosen='null'::jsonb then continue; end if;
    if jsonb_typeof(chosen) is distinct from 'number' or chosen::text !~ '^[0-5]$' then raise exception 'invalid_answer'; end if;
    if chosen::text::integer>=jsonb_array_length(question.options) then raise exception 'invalid_answer'; end if;
  end loop;
  insert into private.live_drafts(room_id,user_id,answers) values(room_uuid,auth.uid(),answers)
    on conflict(room_id,user_id) do update set answers=excluded.answers;
end $$;
create function public.submit_live_quiz(room_uuid uuid, answers jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare room public.live_rooms; total integer; correct integer;
begin
  -- Validation and locking are shared with draft saves; final scoring stays private.
  perform public.save_live_answers(room_uuid,answers);
  select * into room from public.live_rooms where id=room_uuid for update;
  if room.state<>'running' or room.ends_at<=clock_timestamp() then raise exception 'room_not_running'; end if;
  select count(*),count(*) filter(where answers->q.position=to_jsonb(k.correct_index)) into total,correct
    from public.assignment_questions q join private.quiz_answers k on k.assignment_id=q.assignment_id and k.position=q.position
    where q.assignment_id=room.assignment_id;
  insert into private.live_results(room_id,user_id,answers,score) values(room_uuid,auth.uid(),answers,round(correct*100.0/total)::integer) on conflict do nothing;
  if not found then raise exception 'already_submitted'; end if;
end $$;
revoke all on function public.create_live_room(uuid,integer),public.join_live_room(text),public.control_live_room(uuid,text),public.list_live_rooms(uuid),public.get_live_room(uuid),public.submit_live_quiz(uuid,jsonb),public.save_live_answers(uuid,jsonb) from public,anon;
grant execute on function public.create_live_room(uuid,integer),public.join_live_room(text),public.control_live_room(uuid,text),public.list_live_rooms(uuid),public.get_live_room(uuid),public.submit_live_quiz(uuid,jsonb),public.save_live_answers(uuid,jsonb) to authenticated;
commit;
