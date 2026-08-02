begin;

-- =========================================================
-- BOOKING PLAYER COUNT
--
-- The booking stores the total number of occupied places.
-- booking_members continues to store identifiable members,
-- beginning with the authenticated lead booker.
-- =========================================================

alter table public.bookings
add column if not exists player_count smallint;

-- Backfill existing bookings using their active identified
-- members. Every booking must occupy at least one place.
update public.bookings as b
set player_count = greatest(
    (
        select count(*)::smallint
        from public.booking_members as bm
        where bm.booking_id = b.id
          and bm.member_status in (
              'invited',
              'confirmed',
              'checked_in'
          )
    ),
    1
)
where b.player_count is null;

alter table public.bookings
alter column player_count set default 1;

alter table public.bookings
alter column player_count set not null;

do $$
begin
    if not exists (
        select 1
        from pg_constraint
        where conname = 'bookings_player_count_valid'
          and conrelid = 'public.bookings'::regclass
    ) then
        alter table public.bookings
        add constraint bookings_player_count_valid
        check (
            player_count between 1 and 8
        );
    end if;
end;
$$;


-- =========================================================
-- UPDATED CREATE BOOKING FUNCTION
--
-- Creates a booking for the authenticated lead member while
-- reserving the requested total number of player places.
-- =========================================================

create or replace function public.create_booking(
    p_tee_time_id uuid,
    p_player_count smallint default 1,
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

    if p_player_count is null then
        raise exception
            'A player count is required.';
    end if;

    if p_player_count < 1 then
        raise exception
            'A booking must contain at least one player.';
    end if;

    if p_booking_type not in (
        'joinable',
        'private'
    ) then
        raise exception
            'Booking type must be joinable or private.';
    end if;

    /*
     * Lock the tee-time row so simultaneous attempts cannot
     * both reserve the same empty tee time.
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

    if p_player_count > v_tee_time.max_players then
        raise exception
            'This tee time allows a maximum of % players.',
            v_tee_time.max_players;
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
        player_count,
        booking_type,
        booking_status,
        contact_number,
        notes
    )
    values (
        v_tee_time.id,
        v_membership_id,
        p_player_count,
        p_booking_type,
        'active',
        nullif(trim(p_contact_number), ''),
        nullif(trim(p_notes), '')
    )
    returning id
    into v_booking_id;

    /*
     * Only the accountable lead booker is identified here.
     * player_count records the total occupied places.
     */
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
-- COMPATIBILITY WRAPPER
--
-- Keeps the existing four-argument application call working
-- until booking.js is replaced with player-count support.
-- =========================================================

create or replace function public.create_booking(
    p_tee_time_id uuid,
    p_booking_type text,
    p_contact_number text,
    p_notes text
)
returns uuid
language sql
security definer
set search_path = public
as $$
    select public.create_booking(
        p_tee_time_id,
        1::smallint,
        p_booking_type,
        p_contact_number,
        p_notes
    );
$$;


-- =========================================================
-- FUNCTION PERMISSIONS
-- =========================================================

revoke all
on function public.create_booking(
    uuid,
    smallint,
    text,
    text,
    text
)
from public, anon;

grant execute
on function public.create_booking(
    uuid,
    smallint,
    text,
    text,
    text
)
to authenticated;

revoke all
on function public.create_booking(
    uuid,
    text,
    text,
    text
)
from public, anon;

grant execute
on function public.create_booking(
    uuid,
    text,
    text,
    text
)
to authenticated;

commit;