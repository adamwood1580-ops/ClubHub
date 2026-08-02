begin;

-- =========================================================
-- GENERATE A ROLLING WINDOW FOR ALL ACTIVE SCHEDULES
--
-- Default: today plus the following 59 days = 60 days total.
-- Existing tee times are skipped by generate_tee_sheet().
-- =========================================================

create or replace function public.generate_rolling_tee_sheets(
    p_start_date date default current_date,
    p_number_of_days integer default 60
)
returns table (
    schedules_processed integer,
    dates_checked integer,
    tee_times_created integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
    v_schedule public.booking_schedules%rowtype;
    v_play_date date;
    v_created integer;
    v_schedules_processed integer := 0;
    v_dates_checked integer := 0;
    v_tee_times_created integer := 0;
begin
    if p_start_date is null then
        raise exception
            'A start date is required.';
    end if;

    if p_number_of_days is null
       or p_number_of_days < 1
       or p_number_of_days > 366 then
        raise exception
            'The number of days must be between 1 and 366.';
    end if;

    for v_schedule in
        select *
        from public.booking_schedules
        where is_active = true
          and effective_from <=
              p_start_date + (p_number_of_days - 1)
          and (
              effective_to is null
              or effective_to >= p_start_date
          )
    loop
        v_schedules_processed :=
            v_schedules_processed + 1;

        for v_play_date in
            select generate_series(
                p_start_date,
                p_start_date + (p_number_of_days - 1),
                interval '1 day'
            )::date
        loop
            -- Only attempt dates within the schedule period.
            if v_play_date < v_schedule.effective_from then
                continue;
            end if;

            if (
                v_schedule.effective_to is not null
                and v_play_date > v_schedule.effective_to
            ) then
                continue;
            end if;

            -- Skip disabled weekdays rather than raising an error.
            if not (
                case extract(isodow from v_play_date)::integer
                    when 1 then v_schedule.monday
                    when 2 then v_schedule.tuesday
                    when 3 then v_schedule.wednesday
                    when 4 then v_schedule.thursday
                    when 5 then v_schedule.friday
                    when 6 then v_schedule.saturday
                    when 7 then v_schedule.sunday
                    else false
                end
            ) then
                continue;
            end if;

            v_dates_checked :=
                v_dates_checked + 1;

            v_created :=
                public.generate_tee_sheet(
                    v_schedule.id,
                    v_play_date
                );

            v_tee_times_created :=
                v_tee_times_created + v_created;
        end loop;
    end loop;

    return query
    select
        v_schedules_processed,
        v_dates_checked,
        v_tee_times_created;
end;
$$;


-- =========================================================
-- FUNCTION PERMISSIONS
--
-- This is an operational/admin function. Ordinary members
-- should not invoke bulk tee-sheet generation directly.
-- =========================================================

revoke all
on function public.generate_rolling_tee_sheets(date, integer)
from public;

revoke all
on function public.generate_rolling_tee_sheets(date, integer)
from anon;

revoke all
on function public.generate_rolling_tee_sheets(date, integer)
from authenticated;

commit;