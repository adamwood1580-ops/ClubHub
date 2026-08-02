begin;

-- =========================================================
-- BELLS HOTEL & COUNTRY CLUB
-- MAIN COURSE TEE SETS
-- =========================================================

insert into public.tees (
    course_id,
    name,
    colour,
    display_order,
    total_yards,
    is_active
)
select
    c.id,
    tee_data.name,
    tee_data.colour,
    tee_data.display_order,
    tee_data.total_yards,
    true
from public.courses as c
cross join (
    values
        ('White',  'white',  1::smallint, 5843),
        ('Yellow', 'yellow', 2::smallint, 5462),
        ('Red',    'red',    3::smallint, 5218)
) as tee_data (
    name,
    colour,
    display_order,
    total_yards
)
where c.id = '518d9ab3-cbaa-4f8d-bcce-b88936229ab1'
on conflict (course_id, name)
do update
set
    colour = excluded.colour,
    display_order = excluded.display_order,
    total_yards = excluded.total_yards,
    is_active = true,
    updated_at = now();


-- =========================================================
-- CURRENT TEE RATINGS
--
-- These match the values currently used by the BookIt
-- Bells scorecards.
-- =========================================================

insert into public.tee_ratings (
    tee_id,
    rating_gender,
    par,
    course_rating,
    slope_rating,
    effective_from,
    effective_to,
    is_active
)
select
    t.id,
    rating_data.rating_gender,
    rating_data.par,
    rating_data.course_rating,
    rating_data.slope_rating,
    current_date,
    null,
    true
from public.tees as t
join public.courses as c
    on c.id = t.course_id
join (
    values
        ('White',  'men',   69::smallint, 68.3::numeric(4,1), 125::smallint),
        ('Yellow', 'men',   69::smallint, 66.5::numeric(4,1), 123::smallint),
        ('Red',    'women', 71::smallint, 70.3::numeric(4,1), 122::smallint)
) as rating_data (
    tee_name,
    rating_gender,
    par,
    course_rating,
    slope_rating
)
    on rating_data.tee_name = t.name
where c.id = '518d9ab3-cbaa-4f8d-bcce-b88936229ab1'
on conflict (
    tee_id,
    rating_gender
)
where
    is_active = true
    and effective_to is null
do update
set
    par = excluded.par,
    course_rating = excluded.course_rating,
    slope_rating = excluded.slope_rating,
    effective_from = excluded.effective_from,
    is_active = true,
    updated_at = now();

commit;