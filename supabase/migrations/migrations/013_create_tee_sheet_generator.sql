begin;

-- =========================================================
-- LINK GENERATED TEE TIMES TO THEIR SOURCE SCHEDULE
-- =========================================================

alter table public.tee_times
add column if not exists booking_schedule_id uuid
    references public.booking_schedules(id)
    on delete set null;

create index if not exists tee_times_booking_schedule_id_idx
on public.tee_times (booking_schedule_id);


-- =========================================================
-- GENERATE A SINGLE DAY'S TEE SHEET
--
-- Returns the number of new tee-time rows created.
-- Existing course/date/time rows are skipped safely.
-- =========================================================

create or replace function public.generate_tee_sheet(
    p_schedule_id uuid,
    p_play_date date
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
    v_schedule public.booking_schedules%rowtype;
    v_day_enabled boolean;
    v_created_count integer := 0;
begin
    if p_schedule_id is null then
        raise exception
            'A booking schedule ID is required.';
    end if;

    if p_play_date is null then
        raise exception
            'A play date is required.';
    end if;

    select *
    into v_schedule
    from public.booking_schedules
    where id = p_schedule_id;

    if not found then
        raise exception
            'Booking schedule % was not found.',
            p_schedule_id;
    end if;

    -- When called by a signed-in browser user, verify that the
    -- user has an authorised ClubHub role for this schedule.
    --
    -- auth.uid() is null in the Supabase SQL Editor, allowing
    -- administrators to test the function there.
    if auth.uid() is not null then
        if not exists (
            select 1
            from public.courses as c
            join public.club_memberships as cm
                on cm.club_id = c.club_id
            where c.id = v_schedule.course_id
              and cm.profile_id = auth.uid()
              and cm.status = 'active'
              and cm.role in (
                  'starter',
                  'reception',
                  'professional',
                  'manager',
                  'club_admin'
              )
        ) then
            raise exception
                'You are not authorised to generate this tee sheet.';
        end if;
    end if;

    if not v_schedule.is_active then
        raise exception
            'The selected booking schedule is inactive.';
    end if;

    if p_play_date < v_schedule.effective_from then
        raise exception
            'The selected date is before this schedule begins.';
    end if;

    if (
        v_schedule.effective_to is not null
        and p_play_date > v_schedule.effective_to
    ) then
        raise exception
            'The selected date is after this schedule ends.';
    end if;

    v_day_enabled :=
        case extract(isodow from p_play_date)::integer
            when 1 then v_schedule.monday
            when 2 then v_schedule.tuesday
            when 3 then v_schedule.wednesday
            when 4 then v_schedule.thursday
            when 5 then v_schedule.friday
            when 6 then v_schedule.saturday
            when 7 then v_schedule.sunday
            else false
        end;

    if not v_day_enabled then
        raise exception
            'The booking schedule is not enabled for this day of the week.';
    end if;

    insert into public.tee_times (
        course_id,
        booking_schedule_id,
        play_date,
        start_time,
        max_players,
        operational_status
    )
    select
        v_schedule.course_id,
        v_schedule.id,
        p_play_date,
        generated_time::time,
        v_schedule.max_players,
        'open'
    from generate_series(
        p_play_date + v_schedule.first_tee_time,
        p_play_date + v_schedule.last_tee_time,
        make_interval(
            mins => v_schedule.interval_minutes
        )
    ) as generated_time
    on conflict (
        course_id,
        play_date,
        start_time
    )
    do nothing;

    get diagnostics v_created_count = row_count;

    return v_created_count;
end;
$$;


-- =========================================================
-- FUNCTION PERMISSIONS
-- =========================================================

revoke all
on function public.generate_tee_sheet(uuid, date)
from public;

revoke all
on function public.generate_tee_sheet(uuid, date)
from anon;

grant execute
on function public.generate_tee_sheet(uuid, date)
to authenticated;

commit;