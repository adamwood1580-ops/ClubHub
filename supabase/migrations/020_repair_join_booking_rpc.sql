begin;

-- =========================================================
-- JOIN AN EXISTING BOOKING
--
-- Adds the authenticated member and their party to a
-- joinable booking without exceeding the tee-time capacity.
-- =========================================================

create or replace function public.join_booking(
    p_booking_id uuid,
    p_player_count smallint
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
    v_next_position smallint;
begin
    v_user_id := auth.uid();

    if v_user_id is null then
        raise exception
            'You must be signed in to join a booking.';
    end if;

    if p_booking_id is null then
        raise exception
            'A booking ID is required.';
    end if;

    if p_player_count is null
       or p_player_count < 1 then
        raise exception
            'At least one player must join.';
    end if;

    /*
     * Lock the booking so simultaneous joins cannot exceed
     * the available capacity.
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

    if v_booking.booking_type <> 'joinable' then
        raise exception
            'This booking is private and cannot be joined.';
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

    if v_tee_time.operational_status <> 'open' then
        raise exception
            'This tee time is not open.';
    end if;

    if v_tee_time.play_date < current_date then
        raise exception
            'Past tee times cannot be joined.';
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
        from public.booking_members as bm
        where bm.booking_id = v_booking.id
          and bm.membership_id = v_membership_id
          and bm.member_status in (
              'invited',
              'confirmed',
              'checked_in'
          )
    ) then
        raise exception
            'You are already part of this booking.';
    end if;

    if (
        v_booking.player_count + p_player_count
        > v_tee_time.max_players
    ) then
        raise exception
            'Only % places remain in this booking.',
            greatest(
                v_tee_time.max_players
                - v_booking.player_count,
                0
            );
    end if;

    select
        coalesce(max(bm.position), 0) + 1
    into v_next_position
    from public.booking_members as bm
    where bm.booking_id = v_booking.id;

    update public.bookings
    set
        player_count =
            player_count + p_player_count,
        updated_at = now()
    where id = v_booking.id;

    /*
     * One identified member represents the joining party.
     * player_count stores the total places they occupy.
     */
    insert into public.booking_members (
        booking_id,
        membership_id,
        position,
        member_status,
        added_by_membership_id
    )
    values (
        v_booking.id,
        v_membership_id,
        v_next_position,
        'confirmed',
        v_membership_id
    );

    return v_booking.id;

exception
    when unique_violation then
        raise exception
            'You are already part of this booking.';
end;
$$;

revoke all
on function public.join_booking(
    uuid,
    smallint
)
from public, anon;

grant execute
on function public.join_booking(
    uuid,
    smallint
)
to authenticated;

commit;

-- Force Supabase Data API/PostgREST to discover the RPC.
notify pgrst, 'reload schema';