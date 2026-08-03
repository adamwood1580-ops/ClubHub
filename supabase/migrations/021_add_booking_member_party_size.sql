begin;

-- =========================================================
-- PARTY SIZE PER IDENTIFIED BOOKING MEMBER
--
-- Each booking_members row represents an accountable member
-- and the number of tee-time places occupied by their party.
-- =========================================================

alter table public.booking_members
add column if not exists party_size smallint;

alter table public.booking_members
alter column party_size set default 1;

-- Existing joining members are conservatively treated as
-- one-player parties. The lead member receives the remaining
-- booking occupancy.
update public.booking_members
set party_size = 1
where party_size is null;

with active_member_counts as (
    select
        bm.booking_id,
        count(*) filter (
            where bm.member_status in (
                'invited',
                'confirmed',
                'checked_in'
            )
        ) as active_member_rows
    from public.booking_members as bm
    group by bm.booking_id
),
lead_party_sizes as (
    select
        b.id as booking_id,
        greatest(
            b.player_count
            - greatest(amc.active_member_rows - 1, 0),
            1
        )::smallint as lead_party_size
    from public.bookings as b
    join active_member_counts as amc
        on amc.booking_id = b.id
)
update public.booking_members as bm
set party_size = lps.lead_party_size
from lead_party_sizes as lps
where bm.booking_id = lps.booking_id
  and bm.position = 1
  and bm.member_status in (
      'invited',
      'confirmed',
      'checked_in'
  );

alter table public.booking_members
alter column party_size set not null;

do $$
begin
    if not exists (
        select 1
        from pg_constraint
        where conname =
            'booking_members_party_size_valid'
          and conrelid =
            'public.booking_members'::regclass
    ) then
        alter table public.booking_members
        add constraint booking_members_party_size_valid
        check (party_size between 1 and 8);
    end if;
end;
$$;


-- =========================================================
-- REPLACE CREATE BOOKING RPC
-- =========================================================

drop function if exists public.create_booking(
    uuid,
    smallint,
    text,
    text,
    text
);

create function public.create_booking(
    p_tee_time_id uuid,
    p_player_count smallint,
    p_booking_type text,
    p_contact_number text,
    p_notes text
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

    if p_player_count is null
       or p_player_count < 1 then
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

    insert into public.booking_members (
        booking_id,
        membership_id,
        position,
        party_size,
        member_status,
        added_by_membership_id
    )
    values (
        v_booking_id,
        v_membership_id,
        1,
        p_player_count,
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


-- Keep the existing four-argument compatibility wrapper.
drop function if exists public.create_booking(
    uuid,
    text,
    text,
    text
);

create function public.create_booking(
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
-- REPLACE JOIN BOOKING RPC
-- =========================================================

drop function if exists public.join_booking(
    uuid,
    smallint
);

create function public.join_booking(
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

    insert into public.booking_members (
        booking_id,
        membership_id,
        position,
        party_size,
        member_status,
        added_by_membership_id
    )
    values (
        v_booking.id,
        v_membership_id,
        v_next_position,
        p_player_count,
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


-- =========================================================
-- PERMISSIONS
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

notify pgrst, 'reload schema';