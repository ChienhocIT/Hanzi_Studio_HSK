begin;
-- Deleting an Auth user cascades to profiles. Owned records follow their owner;
-- shared records (published content, audit, reviews) keep the row and drop the actor.
alter table public.content_items alter column author_id drop not null,
  drop constraint content_items_author_id_fkey,
  add constraint content_items_author_id_fkey foreign key(author_id) references public.profiles(id) on delete set null,
  drop constraint content_items_reviewer_id_fkey,
  add constraint content_items_reviewer_id_fkey foreign key(reviewer_id) references public.profiles(id) on delete set null;
alter table public.content_audit alter column actor_id drop not null,
  drop constraint content_audit_actor_id_fkey,
  add constraint content_audit_actor_id_fkey foreign key(actor_id) references public.profiles(id) on delete set null,
  drop constraint content_audit_content_id_fkey,
  add constraint content_audit_content_id_fkey foreign key(content_id) references public.content_items(id) on delete cascade;
alter table public.classes drop constraint classes_teacher_id_fkey,
  add constraint classes_teacher_id_fkey foreign key(teacher_id) references public.profiles(id) on delete cascade;
alter table public.assignments drop constraint assignments_class_id_fkey,
  add constraint assignments_class_id_fkey foreign key(class_id) references public.classes(id) on delete cascade;
alter table public.submissions drop constraint submissions_assignment_id_fkey,
  add constraint submissions_assignment_id_fkey foreign key(assignment_id) references public.assignments(id) on delete cascade,
  drop constraint submissions_student_id_fkey,
  add constraint submissions_student_id_fkey foreign key(student_id) references public.profiles(id) on delete cascade;
alter table public.live_rooms drop constraint live_rooms_assignment_id_fkey,
  add constraint live_rooms_assignment_id_fkey foreign key(assignment_id) references public.assignments(id) on delete cascade,
  drop constraint live_rooms_host_id_fkey,
  add constraint live_rooms_host_id_fkey foreign key(host_id) references public.profiles(id) on delete cascade;
alter table public.live_participants drop constraint live_participants_user_id_fkey,
  add constraint live_participants_user_id_fkey foreign key(user_id) references public.profiles(id) on delete cascade;
alter table private.live_results drop constraint live_results_room_id_user_id_fkey,
  add constraint live_results_room_id_user_id_fkey foreign key(room_id,user_id) references public.live_participants(room_id,user_id) on delete cascade;
alter table private.live_drafts drop constraint live_drafts_room_id_user_id_fkey,
  add constraint live_drafts_room_id_user_id_fkey foreign key(room_id,user_id) references public.live_participants(room_id,user_id) on delete cascade;
create index submission_student on public.submissions(student_id);
create index live_room_host on public.live_rooms(host_id);
create index live_participant_user on public.live_participants(user_id);
create index content_author on public.content_items(author_id);
create index content_reviewer on public.content_items(reviewer_id);
create index audit_content on public.content_audit(content_id);
create index audit_actor on public.content_audit(actor_id);
create index class_teacher on public.classes(teacher_id);
create index assignment_content on public.assignments(content_id);
create index vocab_source on public.vocab_entries(source_id);
create index vocab_reviewer on public.vocab_entries(reviewer_id);

-- Evaluate auth.uid() once per statement instead of once per row (Supabase lint 0003).
alter policy profiles_read on public.profiles using(id=(select auth.uid()) or private.has_role(array['admin']));
alter policy progress_read on public.learning_progress using(user_id=(select auth.uid()));
alter policy content_read on public.content_items using(status='published' or author_id=(select auth.uid()) or private.has_role(array['admin']));
alter policy audit_read on public.content_audit using(exists(select 1 from public.content_items where id=content_id and (author_id=(select auth.uid()) or private.has_role(array['admin']))));
alter policy members_read on public.class_members using(student_id=(select auth.uid()) or private.teaches(class_id));
alter policy submissions_read on public.submissions using(student_id=(select auth.uid()) or exists(select 1 from public.assignments where id=assignment_id and private.teaches(class_id)));

-- An orphaned draft (author deleted) must not be submittable by another teacher.
create or replace function public.review_content(item_id uuid, expected_revision integer, decision text, note text default '') returns void
language plpgsql security definer set search_path = '' as $$
declare item public.content_items;
begin
  select * into item from public.content_items where id=item_id for update;
  if not found or item.revision <> expected_revision then raise exception 'content_conflict'; end if;
  if decision = 'in_review' then
    if item.author_id is distinct from auth.uid() or item.status not in ('draft','rejected') or not private.has_role(array['teacher','admin']) then raise exception 'forbidden' using errcode='42501'; end if;
  elsif decision in ('published','rejected') then
    if not private.has_role(array['admin']) or item.status <> 'in_review' or item.author_id is not distinct from auth.uid() then raise exception 'independent_reviewer_required' using errcode='42501'; end if;
    if decision='rejected' and length(trim(note))=0 then raise exception 'review_note_required'; end if;
  else raise exception 'invalid_transition';
  end if;
  update public.content_items set status=decision,review_note=coalesce(note,''),reviewer_id=case when decision='in_review' then null else auth.uid() end,revision=revision+1,updated_at=now() where id=item_id;
  insert into public.content_audit(content_id,actor_id,action,revision,note) values(item_id,auth.uid(),decision,item.revision+1,coalesce(note,''));
end $$;

-- Every room read calls this. Check the flag before taking the row lock, so
-- polling a finished room does not queue readers behind each other.
create or replace function private.finalize_live_room(room_uuid uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare room public.live_rooms;
begin
  if exists(select 1 from public.live_rooms where id=room_uuid and finalized) then return; end if;
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

-- Teachers see names of their own students only; profiles RLS stays self/admin.
create function public.class_roster(class_uuid uuid) returns table(student_id uuid, display_name text, joined_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.teaches(class_uuid) then raise exception 'forbidden' using errcode='42501'; end if;
  return query select m.student_id,p.display_name,m.joined_at from public.class_members m join public.profiles p on p.id=m.student_id
    where m.class_id=class_uuid order by p.display_name,m.joined_at;
end $$;
revoke all on function public.class_roster(uuid) from public,anon;
grant execute on function public.class_roster(uuid) to authenticated;
commit;
