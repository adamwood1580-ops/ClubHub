begin;

-- =========================================================
-- ADMIN ACCESS HELPER
--
-- Admin is intentionally limited to management roles at this
-- stage. Other operational staff roles can receive narrower
-- tools later without granting full club administration access.
-- =========================================================

create or replace function public.user_has_admin_access(
    p_club_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1
        from public.club_memberships as cm
        where cm.profile_id = auth.uid()
          and cm.club_id = p_club_id
          and cm.status = 'active'
          and cm.role in (
              'manager',
              'club_admin'
          )
    );
$$;

revoke all
on function public.user_has_admin_access(uuid)
from public, anon;

grant execute
on function public.user_has_admin_access(uuid)
to authenticated;


-- =========================================================
-- ADMIN DASHBOARD
--
-- Security-definer RPC keeps member-wide data out of normal
-- browser SELECT policies. The function first proves that the
-- signed-in user is an active manager/club_admin at the club,
-- then returns only aggregate dashboard information.
-- =========================================================

create or replace function public.get_admin_dashboard()
returns table (
    club_id uuid,
    club_name text,
    club_timezone text,
    membership_id uuid,
    admin_role text,
    club_today date,
    active_members bigint,
    pending_invites bigint,
    today_bookings bigint,
    upcoming_events bigint,
    next_event_title text,
    next_event_date date,
    next_event_time text
)
language plpgsql
security definer
set search_path = public
as $$
declare
    v_user_id uuid;
    v_club_id uuid;
    v_club_name text;
    v_club_timezone text;
    v_membership_id uuid;
    v_admin_role text;
    v_today date;

    v_active_members bigint;
    v_pending_invites bigint;
    v_today_bookings bigint;
    v_upcoming_events bigint;

    v_next_event_title text;
    v_next_event_date date;
    v_next_event_time text;
begin
    v_user_id := auth.uid();

    if v_user_id is null then
        raise exception
            'Admin access required.';
    end if;

    select
        cm.club_id,
        c.name,
        c.timezone,
        cm.id,
        cm.role
    into
        v_club_id,
        v_club_name,
        v_club_timezone,
        v_membership_id,
        v_admin_role
    from public.club_memberships as cm
    join public.clubs as c
        on c.id = cm.club_id
    where cm.profile_id = v_user_id
      and cm.status = 'active'
      and cm.role in (
          'manager',
          'club_admin'
      )
      and c.is_active = true
    order by
        cm.is_primary desc,
        cm.created_at asc
    limit 1;

    if v_membership_id is null then
        raise exception
            'Admin access required.';
    end if;

    v_today := (
        now() at time zone
        coalesce(
            nullif(v_club_timezone, ''),
            'Europe/London'
        )
    )::date;

    select count(*)
    into v_active_members
    from public.club_memberships as cm
    where cm.club_id = v_club_id
      and cm.status = 'active';

    select count(*)
    into v_pending_invites
    from public.club_memberships as cm
    where cm.club_id = v_club_id
      and cm.status in (
          'invited',
          'pending'
      );

    select count(*)
    into v_today_bookings
    from public.bookings as b
    join public.tee_times as tt
        on tt.id = b.tee_time_id
    join public.courses as c
        on c.id = tt.course_id
    where c.club_id = v_club_id
      and tt.play_date = v_today
      and b.booking_status = 'active';

    select count(*)
    into v_upcoming_events
    from public.club_events as ce
    where ce.club_id = v_club_id
      and ce.is_published = true
      and ce.status <> 'cancelled'
      and ce.event_date between
          v_today
          and (v_today + 30);

    select
        ce.title,
        ce.event_date,
        coalesce(
            nullif(trim(ce.time_text), ''),
            case
                when ce.start_time is not null
                    then to_char(
                        ce.start_time,
                        'HH24:MI'
                    )
                else null
            end
        )
    into
        v_next_event_title,
        v_next_event_date,
        v_next_event_time
    from public.club_events as ce
    where ce.club_id = v_club_id
      and ce.is_published = true
      and ce.status <> 'cancelled'
      and ce.event_date >= v_today
    order by
        ce.event_date asc,
        ce.start_time asc nulls last,
        ce.display_order asc
    limit 1;

    return query
    select
        v_club_id,
        v_club_name,
        v_club_timezone,
        v_membership_id,
        v_admin_role,
        v_today,
        v_active_members,
        v_pending_invites,
        v_today_bookings,
        v_upcoming_events,
        v_next_event_title,
        v_next_event_date,
        v_next_event_time;
end;
$$;

revoke all
on function public.get_admin_dashboard()
from public, anon;

grant execute
on function public.get_admin_dashboard()
to authenticated;

commit;

notify pgrst, 'reload schema';
