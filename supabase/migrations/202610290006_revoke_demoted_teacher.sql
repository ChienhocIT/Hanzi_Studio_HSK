begin;
-- A demoted teacher keeps the class rows but loses teaching and hosting rights.
create or replace function private.teaches(class_uuid uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.classes c join public.profiles p on p.id=c.teacher_id
    where c.id=class_uuid and c.teacher_id=auth.uid() and p.role in ('teacher','admin'));
$$;
create or replace function public.control_live_room(room_uuid uuid, command text) returns void
language plpgsql security definer set search_path = '' as $$
declare room public.live_rooms;
begin
  select * into room from public.live_rooms where id=room_uuid for update;
  if not found or room.host_id<>auth.uid() or auth.uid() is null or not private.has_role(array['teacher','admin']) then raise exception 'forbidden' using errcode='42501'; end if;
  if command='start' then
    if room.state<>'waiting' or room.expires_at<=clock_timestamp() then raise exception 'room_unavailable'; end if;
    update public.live_rooms set state='running',started_at=clock_timestamp(),ends_at=clock_timestamp()+make_interval(secs=>duration_seconds) where id=room_uuid;
  elsif command='end' then
    update public.live_rooms set state='ended',ends_at=least(coalesce(ends_at,clock_timestamp()),clock_timestamp()) where id=room_uuid;
  else raise exception 'invalid_command'; end if;
end $$;
create or replace function public.get_live_room(room_uuid uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare room public.live_rooms; assignment public.assignments; status text; host boolean; roster jsonb; questions jsonb; my_result jsonb;
begin
  select * into room from public.live_rooms where id=room_uuid;
  if not found or auth.uid() is null then raise exception 'room_unavailable'; end if;
  select * into assignment from public.assignments where id=room.assignment_id;
  host := room.host_id=auth.uid() and private.has_role(array['teacher','admin']);
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
commit;
