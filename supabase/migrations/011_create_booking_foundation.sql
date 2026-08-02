begin;

-- =========================================================
-- SHARED UPDATED_AT FUNCTION
-- =========================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;


-- =========================================================
-- TEE TIMES
--
-- Club-controlled playable inventory for a course.
-- Occupancy is calculated from active booking members.
-- =========================================================

create table public.tee_times (
    id uuid primary key default gen_random_uuid(),

    course_id uuid not null
        references public.courses(id)
        on delete cascade,

    play_date date not null,
    start_time time without time zone not null,

    max_players smallint not null default 4,

    operational_status text not null default 'open',
    notes text,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint tee_times_course_date_time_unique
        unique (
            course_id,
            play_date,
            start_time
        ),

    constraint tee_times_max_players_valid
        check (
            max_players between 1 and 8
        ),

    constraint tee_times_status_valid
        check (
            operational_status in (
                'open',
                'blocked',
                'maintenance',
                'competition',
                'closed'
            )
        ),

    constraint tee_times_notes_not_blank
        check (
            notes is null
            or length(trim(notes)) > 0
        )
);

create index tee_times_course_date_idx
on public.tee_times (
    course_id,
    play_date,
    start_time
);

create index tee_times_status_idx
on public.tee_times (
    course_id,
    play_date,
    operational_status
);

create trigger set_tee_times_updated_at
before update on public.tee_times
for each row
execute function public.set_updated_at();


-- =========================================================
-- BOOKINGS
--
-- A booking reserves a tee time.
-- Only one active booking can exist for each tee time.
-- Cancelled bookings remain for history and auditing.
-- =========================================================

create table public.bookings (
    id uuid primary key default gen_random_uuid(),

    tee_time_id uuid not null
        references public.tee_times(id)
        on delete restrict,

    created_by_membership_id uuid not null
        references public.club_memberships(id)
        on delete restrict,

    booking_type text not null default 'joinable',
    booking_status text not null default 'active',

    lead_name text,
    contact_number text,
    notes text,

    cancelled_at timestamptz,
    cancelled_by_membership_id uuid
        references public.club_memberships(id)
        on delete set null,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint bookings_type_valid
        check (
            booking_type in (
                'joinable',
                'private'
            )
        ),

    constraint bookings_status_valid
        check (
            booking_status in (
                'active',
                'cancelled',
                'completed',
                'no_show'
            )
        ),

    constraint bookings_lead_name_not_blank
        check (
            lead_name is null
            or length(trim(lead_name)) > 0
        ),

    constraint bookings_contact_not_blank
        check (
            contact_number is null
            or length(trim(contact_number)) > 0
        ),

    constraint bookings_notes_not_blank
        check (
            notes is null
            or length(trim(notes)) > 0
        ),

    constraint bookings_cancellation_consistent
        check (
            (
                booking_status = 'cancelled'
                and cancelled_at is not null
            )
            or
            (
                booking_status <> 'cancelled'
                and cancelled_at is null
                and cancelled_by_membership_id is null
            )
        )
);

-- Allows historical cancelled bookings while ensuring only one
-- current active booking occupies a tee time.
create unique index bookings_one_active_per_tee_time
on public.bookings (tee_time_id)
where booking_status = 'active';

create index bookings_tee_time_id_idx
on public.bookings (tee_time_id);

create index bookings_creator_idx
on public.bookings (created_by_membership_id);

create index bookings_status_idx
on public.bookings (booking_status);

create trigger set_bookings_updated_at
before update on public.bookings
for each row
execute function public.set_updated_at();


-- =========================================================
-- BOOKING MEMBERS
--
-- Members occupy positions within a club-owned booking.
-- Visitor support can later use a separate booking_guests table.
-- =========================================================

create table public.booking_members (
    id uuid primary key default gen_random_uuid(),

    booking_id uuid not null
        references public.bookings(id)
        on delete cascade,

    membership_id uuid not null
        references public.club_memberships(id)
        on delete restrict,

    position smallint not null,

    member_status text not null default 'confirmed',

    added_by_membership_id uuid
        references public.club_memberships(id)
        on delete set null,

    checked_in_at timestamptz,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint booking_members_booking_membership_unique
        unique (
            booking_id,
            membership_id
        ),

    constraint booking_members_booking_position_unique
        unique (
            booking_id,
            position
        ),

    constraint booking_members_position_valid
        check (
            position between 1 and 8
        ),

    constraint booking_members_status_valid
        check (
            member_status in (
                'invited',
                'confirmed',
                'declined',
                'cancelled',
                'checked_in',
                'no_show'
            )
        ),

    constraint booking_members_check_in_consistent
        check (
            member_status <> 'checked_in'
            or checked_in_at is not null
        )
);

create index booking_members_booking_id_idx
on public.booking_members (booking_id);

create index booking_members_membership_id_idx
on public.booking_members (membership_id);

create index booking_members_active_idx
on public.booking_members (
    booking_id,
    member_status
);

create trigger set_booking_members_updated_at
before update on public.booking_members
for each row
execute function public.set_updated_at();


-- =========================================================
-- ROW LEVEL SECURITY
-- =========================================================

alter table public.tee_times
enable row level security;

alter table public.bookings
enable row level security;

alter table public.booking_members
enable row level security;


-- Members may read tee times belonging to clubs where they
-- currently hold an active membership.
create policy "Members can read their club tee times"
on public.tee_times
for select
to authenticated
using (
    exists (
        select 1
        from public.courses as c
        join public.club_memberships as cm
            on cm.club_id = c.club_id
        where c.id = tee_times.course_id
          and cm.profile_id = auth.uid()
          and cm.status = 'active'
    )
);


-- Members may read bookings belonging to their active clubs.
create policy "Members can read their club bookings"
on public.bookings
for select
to authenticated
using (
    exists (
        select 1
        from public.tee_times as tt
        join public.courses as c
            on c.id = tt.course_id
        join public.club_memberships as cm
            on cm.club_id = c.club_id
        where tt.id = bookings.tee_time_id
          and cm.profile_id = auth.uid()
          and cm.status = 'active'
    )
);


-- Members may read occupants of bookings at their active clubs.
create policy "Members can read their club booking members"
on public.booking_members
for select
to authenticated
using (
    exists (
        select 1
        from public.bookings as b
        join public.tee_times as tt
            on tt.id = b.tee_time_id
        join public.courses as c
            on c.id = tt.course_id
        join public.club_memberships as cm
            on cm.club_id = c.club_id
        where b.id = booking_members.booking_id
          and cm.profile_id = auth.uid()
          and cm.status = 'active'
    )
);


-- =========================================================
-- DATA API PRIVILEGES
--
-- Direct browser writes are intentionally disabled.
-- Controlled booking functions will be added next.
-- =========================================================

revoke all
on public.tee_times,
   public.bookings,
   public.booking_members
from anon;

revoke all
on public.tee_times,
   public.bookings,
   public.booking_members
from authenticated;

grant select
on public.tee_times,
   public.bookings,
   public.booking_members
to authenticated;

commit;