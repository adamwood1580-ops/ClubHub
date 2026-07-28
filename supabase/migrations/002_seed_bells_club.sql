insert into public.clubs (
    name,
    slug,
    timezone
)
values (
    'Bells Hotel & Country Club',
    'bells-hotel-country-club',
    'Europe/London'
)
on conflict (slug) do nothing;