begin;

-- =========================================================
-- CREATE A BOOKING
--
-- Creates one active booking and adds the signed-in member
-- as position 1.
--
-- Direct browser inserts remain disabled. The browser calls
-- this controlled function instead.
-- =========================================================

create or replace function public.create_booking(
    p_tee_time_id uuid,
    p_booking_type text default 'joinable',
    p_contact_number text default null,
    p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
    v_user_id uuid;
    v_membership_id uuid;
    v_booking_id uuid;

    v_tee_time public.tee_times%rowtype;
    v_course public.courses%rowtype;
begin
    v_user_id := auth.uid();

    if v_user_id is null then
        raise exception
            'You must be signed in to create a booking.';
    end if;

    if p_tee_time_id is null then
        raise exception
            'A tee-time ID is required.';
    end if;

    if p_booking_type not in (
        'joinable',
        'private'
    ) then
        raise exception
            'Booking type must be joinable or private.';
    end if;

    /*
     * Lock the tee-time row so two users cannot reserve the
     * same empty tee time simultaneously.
     */
    select *
    into v_tee_time
    from public.tee_times
    where id = p_tee_time_id
    for update;

    if not found then
        raise exception
            'The selected tee time was not found.';
    end if;

    select *
    into v_course
    from public.courses
    where id = v_tee_time.course_id;

    if not found then
        raise exception
            'The course linked to this tee time was not found.';
    end if;

    /*
     * Resolve the signed-in user's active membership at the
     * club that owns the course.
     */
    select cm.id
    into v_membership_id
    from public.club_memberships as cm
    where cm.profile_id = v_user_id
      and cm.club_id = v_course.club_id
      and cm.status = 'active'
    order by
        cm.is_primary desc,
        cm.created_at asc
    limit 1;

    if v_membership_id is null then
        raise exception
            'You do not have an active membership at this club.';
    end if;

    if v_tee_time.operational_status <> 'open' then
        raise exception
            'This tee time is not open for booking.';
    end if;

    if v_tee_time.play_date < current_date then
        raise exception
            'Past tee times cannot be booked.';
    end if;

    if (
        v_tee_time.play_date = current_date
        and v_tee_time.start_time <= localtime
    ) then
        raise exception
            'This tee time has already passed.';
    end if;

    if exists (
        select 1
        from public.bookings as b
        where b.tee_time_id = v_tee_time.id
          and b.booking_status = 'active'
    ) then
        raise exception
            'This tee time already has an active booking.';
    end if;

    insert into public.bookings (
        tee_time_id,
        created_by_membership_id,
        booking_type,
        booking_status,
        contact_number,
        notes
    )
    values (
        v_tee_time.id,
        v_membership_id,
        p_booking_type,
        'active',
        nullif(trim(p_contact_number), ''),
        nullif(trim(p_notes), '')
    )
    returning id
    into v_booking_id;

    insert into public.booking_members (
        booking_id,
        membership_id,
        position,
        member_status,
        added_by_membership_id
    )
    values (
        v_booking_id,
        v_membership_id,
        1,
        'confirmed',
        v_membership_id
    );

    return v_booking_id;

exception
    when unique_violation then
        raise exception
            'This tee time was booked by another member moments ago.';
end;
$$;


-- =========================================================
-- FUNCTION PERMISSIONS
-- =========================================================

revoke all
on function public.create_booking(
    uuid,
    text,
    text,
    text
)
from public;

revoke all
on function public.create_booking(
    uuid,
    text,
    text,
    text
)
from anon;

grant execute
on function public.create_booking(
    uuid,
    text,
    text,
    text
)
to authenticated;

commit;