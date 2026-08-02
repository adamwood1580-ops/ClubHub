begin;

insert into public.booking_schedules (
    course_id,
    name,
    first_tee_time,
    last_tee_time,
    interval_minutes,
    max_players,
    monday,
    tuesday,
    wednesday,
    thursday,
    friday,
    saturday,
    sunday,
    effective_from,
    effective_to,
    is_active
)
values (
    '518d9ab3-cbaa-4f8d-bcce-b88936229ab1',
    'Standard Schedule',
    '07:00',
    '18:00',
    7,
    4,
    true,
    true,
    true,
    true,
    true,
    true,
    true,
    current_date,
    null,
    true
)
on conflict (
    course_id,
    name,
    effective_from
)
do update
set
    first_tee_time = excluded.first_tee_time,
    last_tee_time = excluded.last_tee_time,
    interval_minutes = excluded.interval_minutes,
    max_players = excluded.max_players,
    monday = excluded.monday,
    tuesday = excluded.tuesday,
    wednesday = excluded.wednesday,
    thursday = excluded.thursday,
    friday = excluded.friday,
    saturday = excluded.saturday,
    sunday = excluded.sunday,
    effective_to = excluded.effective_to,
    is_active = excluded.is_active,
    updated_at = now();

commit;