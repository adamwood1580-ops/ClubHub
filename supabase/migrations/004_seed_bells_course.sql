insert into public.courses (
    club_id,
    name,
    holes
)
select
    id,
    'Main Course',
    18
from public.clubs
where slug = 'bells-hotel-country-club'
on conflict (club_id, name) do nothing
returning *;