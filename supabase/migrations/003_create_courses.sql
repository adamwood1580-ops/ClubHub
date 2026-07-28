create table public.courses (
    id uuid primary key default gen_random_uuid(),

    club_id uuid not null
        references public.clubs(id)
        on delete cascade,

    name text not null,
    holes smallint not null default 18,

    is_active boolean not null default true,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint courses_name_not_blank
        check (length(trim(name)) > 0),

    constraint courses_valid_hole_count
        check (holes in (9, 18)),

    constraint courses_unique_name_per_club
        unique (club_id, name)
);

create index courses_club_id_idx
    on public.courses(club_id);

alter table public.courses enable row level security;