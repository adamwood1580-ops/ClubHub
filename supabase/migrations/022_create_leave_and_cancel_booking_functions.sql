begin;

-- =========================================================
-- LEAVE BOOKING
--
-- Allows a non-lead member to remove themselves and their
-- party from an active booking.
-- =========================================================

create or replace function public.leave_booking(
    p_booking_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
    v_user_id uuid;
    v_membership_id uuid;

    v_booking public.bookings%rowtype;
    v_tee_time public.tee_times%rowtype;
    v_course public.courses%rowtype;

    v_booking_member_id uuid;
    v_party_size smallint;
begin
    v_user_id := auth.uid();

    if v_user_id is null then
        raise exception
            'You must be signed in to leave a booking.';
    end if;

    if p_booking_id is null then
        raise exception
            'A booking ID is required.';
    end if;

    /*
     * Lock the booking while occupancy is changed.
     */
    select *
    into v_booking
    from public.bookings
    where id = p_booking_id
    for update;

    if not found then
        raise exception
            'The selected booking was not found.';
    end if;

    if v_booking.booking_status <> 'active' then
        raise exception
            'This booking is no longer active.';
    end if;

    select *
    into v_tee_time
    from public.tee_times
    where id = v_booking.tee_time_id;

    if not found then
        raise exception
            'The tee time linked to this booking was not found.';
    end if;

    select *
    into v_course
    from public.courses
    where id = v_tee_time.course_id;

    if not found then
        raise exception
            'The course linked to this booking was not found.';
    end if;

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

    /*
     * The lead booker must cancel the whole booking rather
     * than using Leave.
     */
    if v_booking.created_by_membership_id = v_membership_id then
        raise exception
            'The lead booker must cancel the booking instead.';
    end if;

    if v_tee_time.play_date < current_date then
        raise exception
            'Past bookings cannot be changed.';
    end if;

    if (
        v_tee_time.play_date = current_date
        and v_tee_time.start_time <= localtime
    ) then
        raise exception
            'This tee time has already passed.';
    end if;

    /*
     * Lock and retrieve the member's active party record.
     */
    select
        bm.id,
        bm.party_size
    into
        v_booking_member_id,
        v_party_size
    from public.booking_members as bm
    where bm.booking_id = v_booking.id
      and bm.membership_id = v_membership_id
      and bm.member_status in (
          'invited',
          'confirmed',
          'checked_in'
      )
    for update;

    if v_booking_member_id is null then
        raise exception
            'You are not part of this booking.';
    end if;

    delete from public.booking_members
    where id = v_booking_member_id;

    update public.bookings
    set
        player_count = greatest(
            player_count - v_party_size,
            1
        ),
        updated_at = now()
    where id = v_booking.id;

    return v_booking.id;
end;
$$;


-- =========================================================
-- CANCEL BOOKING
--
-- Allows only the accountable lead booker to cancel the
-- entire booking. The tee time then becomes available again.
-- =========================================================

create or replace function public.cancel_booking(
    p_booking_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
    v_user_id uuid;
    v_membership_id uuid;

    v_booking public.bookings%rowtype;
    v_tee_time public.tee_times%rowtype;
    v_course public.courses%rowtype;

    v_cancelled_booking_id uuid;
begin
    v_user_id := auth.uid();

    if v_user_id is null then
        raise exception
            'You must be signed in to cancel a booking.';
    end if;

    if p_booking_id is null then
        raise exception
            'A booking ID is required.';
    end if;

    /*
     * Lock the booking so it cannot be joined while being
     * cancelled.
     */
    select *
    into v_booking
    from public.bookings
    where id = p_booking_id
    for update;

    if not found then
        raise exception
            'The selected booking was not found.';
    end if;

    if v_booking.booking_status <> 'active' then
        raise exception
            'This booking is no longer active.';
    end if;

    select *
    into v_tee_time
    from public.tee_times
    where id = v_booking.tee_time_id;

    if not found then
        raise exception
            'The tee time linked to this booking was not found.';
    end if;

    select *
    into v_course
    from public.courses
    where id = v_tee_time.course_id;

    if not found then
        raise exception
            'The course linked to this booking was not found.';
    end if;

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

    if v_booking.created_by_membership_id <> v_membership_id then
        raise exception
            'Only the lead booker can cancel this booking.';
    end if;

    if v_tee_time.play_date < current_date then
        raise exception
            'Past bookings cannot be cancelled.';
    end if;

    if (
        v_tee_time.play_date = current_date
        and v_tee_time.start_time <= localtime
    ) then
        raise exception
            'This tee time has already passed.';
    end if;

    v_cancelled_booking_id := v_booking.id;

    /*
     * Remove identifiable members first, then the booking.
     * With no active booking attached, the existing tee-time
     * service will immediately show the slot as available.
     */
    delete from public.booking_members
    where booking_id = v_booking.id;

    delete from public.bookings
    where id = v_booking.id;

    return v_cancelled_booking_id;
end;
$$;


-- =========================================================
-- PERMISSIONS
-- =========================================================

revoke all
on function public.leave_booking(uuid)
from public, anon;

grant execute
on function public.leave_booking(uuid)
to authenticated;

revoke all
on function public.cancel_booking(uuid)
from public, anon;

grant execute
on function public.cancel_booking(uuid)
to authenticated;

commit;

notify pgrst, 'reload schema';