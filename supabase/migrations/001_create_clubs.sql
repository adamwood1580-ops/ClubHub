create table public.clubs (
    id uuid primary key default gen_random_uuid(),

    name text not null,
    slug text not null unique,

    timezone text not null default 'Europe/London',

    is_active boolean not null default true,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint clubs_name_not_blank
        check (length(trim(name)) > 0),

    constraint clubs_slug_format
        check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

alter table public.clubs enable row level security;