begin;

-- =========================================================
-- CLUB EVENTS
--
-- The 2026 Bells fixture data has already been imported into
-- production. This migration records the schema in the normal
-- migration chain and is safe to run against the existing table.
-- It does not insert or duplicate fixture records.
-- =========================================================

create table if not exists public.club_events (
    id uuid primary key default gen_random_uuid(),

    club_id uuid not null
        references public.clubs(id)
        on delete cascade,

    event_date date not null,
    display_order smallint not null default 1,

    start_time time,
    end_time time,
    time_text text,

    title text not null,

    section text not null
        check (
            section in (
                'club',
                'mens',
                'seniors',
                'ladies'
            )
        ),

    event_type text not null default 'other'
        check (
            event_type in (
                'competition',
                'roll_up',
                'fixture',
                'social',
                'course_event',
                'other'
            )
        ),

    location_type text
        check (
            location_type is null
            or location_type in (
                'home',
                'away'
            )
        ),

    venue text,
    notes text,

    is_qualifier boolean not null default false,
    course_closed boolean not null default false,

    status text not null default 'scheduled'
        check (
            status in (
                'scheduled',
                'cancelled',
                'postponed',
                'completed'
            )
        ),

    is_published boolean not null default true,

    source_key text not null,
    source_text text,
    source_page smallint,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint club_events_source_key_unique
        unique (club_id, source_key)
);

create index if not exists
    club_events_club_date_idx
on public.club_events (
    club_id,
    event_date
);

create index if not exists
    club_events_club_section_date_idx
on public.club_events (
    club_id,
    section,
    event_date
);

create index if not exists
    club_events_published_date_idx
on public.club_events (
    is_published,
    event_date
);

create or replace function
    public.set_club_events_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists
    set_club_events_updated_at
on public.club_events;

create trigger set_club_events_updated_at
before update on public.club_events
for each row
execute function public.set_club_events_updated_at();

alter table public.club_events
    enable row level security;

grant select
on table public.club_events
to authenticated;

grant all
on table public.club_events
to service_role;

revoke insert, update, delete
on table public.club_events
from authenticated;

drop policy if exists
    "Authenticated users can read published club events"
on public.club_events;

create policy
    "Authenticated users can read published club events"
on public.club_events
for select
to authenticated
using (
    is_published = true
);

commit;
