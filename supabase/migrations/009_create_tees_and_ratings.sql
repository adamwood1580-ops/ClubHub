begin;

-- =========================================================
-- PHYSICAL TEE SETS
-- Examples: White, Yellow, Red
-- =========================================================

create table public.tees (
    id uuid primary key default gen_random_uuid(),

    course_id uuid not null
        references public.courses(id)
        on delete cascade,

    name text not null,
    colour text,

    display_order smallint not null default 0,
    total_yards integer,

    is_active boolean not null default true,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint tees_course_name_unique
        unique (course_id, name),

    constraint tees_name_not_blank
        check (length(trim(name)) > 0),

    constraint tees_colour_not_blank
        check (
            colour is null
            or length(trim(colour)) > 0
        ),

    constraint tees_display_order_valid
        check (display_order >= 0),

    constraint tees_total_yards_valid
        check (
            total_yards is null
            or total_yards between 500 and 10000
        )
);

create index tees_course_id_idx
on public.tees (course_id);

create index tees_active_idx
on public.tees (course_id, is_active);

alter table public.tees
enable row level security;

create policy "Authenticated users can read active tees"
on public.tees
for select
to authenticated
using (is_active = true);


-- =========================================================
-- WHS RATINGS
--
-- A physical tee can have separate men's and women's
-- Course Rating, Slope Rating and Par.
-- =========================================================

create table public.tee_ratings (
    id uuid primary key default gen_random_uuid(),

    tee_id uuid not null
        references public.tees(id)
        on delete cascade,

    rating_gender text not null,

    par smallint not null,
    course_rating numeric(4,1) not null,
    slope_rating smallint not null,

    effective_from date,
    effective_to date,

    is_active boolean not null default true,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint tee_ratings_gender_valid
        check (
            rating_gender in (
                'men',
                'women'
            )
        ),

    constraint tee_ratings_par_valid
        check (
            par between 27 and 90
        ),

    constraint tee_ratings_course_rating_valid
        check (
            course_rating between 20.0 and 100.0
        ),

    constraint tee_ratings_slope_valid
        check (
            slope_rating between 55 and 155
        ),

    constraint tee_ratings_dates_valid
        check (
            effective_to is null
            or effective_from is null
            or effective_to >= effective_from
        )
);

create index tee_ratings_tee_id_idx
on public.tee_ratings (tee_id);

create index tee_ratings_active_idx
on public.tee_ratings (
    tee_id,
    rating_gender,
    is_active
);

create unique index tee_ratings_one_current_rating
on public.tee_ratings (
    tee_id,
    rating_gender
)
where
    is_active = true
    and effective_to is null;

alter table public.tee_ratings
enable row level security;

create policy "Authenticated users can read active tee ratings"
on public.tee_ratings
for select
to authenticated
using (is_active = true);


-- =========================================================
-- AUTOMATIC UPDATED_AT TIMESTAMPS
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

drop trigger if exists set_tees_updated_at
on public.tees;

create trigger set_tees_updated_at
before update on public.tees
for each row
execute function public.set_updated_at();

drop trigger if exists set_tee_ratings_updated_at
on public.tee_ratings;

create trigger set_tee_ratings_updated_at
before update on public.tee_ratings
for each row
execute function public.set_updated_at();

commit;