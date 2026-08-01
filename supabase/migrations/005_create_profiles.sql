begin;

create table public.profiles (
    id uuid primary key
        references auth.users(id)
        on delete cascade,

    first_name text,
    last_name text,
    display_name text,
    phone text,
    avatar_url text,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint profiles_first_name_not_blank
        check (
            first_name is null
            or length(trim(first_name)) > 0
        ),

    constraint profiles_last_name_not_blank
        check (
            last_name is null
            or length(trim(last_name)) > 0
        ),

    constraint profiles_display_name_not_blank
        check (
            display_name is null
            or length(trim(display_name)) > 0
        )
);

alter table public.profiles
enable row level security;

create policy "Users can read their own profile"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

create policy "Users can update their own profile"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into public.profiles (
        id,
        first_name,
        last_name,
        display_name
    )
    values (
        new.id,
        nullif(trim(new.raw_user_meta_data ->> 'first_name'), ''),
        nullif(trim(new.raw_user_meta_data ->> 'last_name'), ''),
        nullif(
            trim(
                coalesce(
                    new.raw_user_meta_data ->> 'display_name',
                    new.raw_user_meta_data ->> 'full_name'
                )
            ),
            ''
        )
    )
    on conflict (id) do nothing;

    return new;
end;
$$;

drop trigger if exists on_auth_user_created
on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

insert into public.profiles (
    id,
    first_name,
    last_name,
    display_name
)
select
    users.id,
    nullif(trim(users.raw_user_meta_data ->> 'first_name'), ''),
    nullif(trim(users.raw_user_meta_data ->> 'last_name'), ''),
    nullif(
        trim(
            coalesce(
                users.raw_user_meta_data ->> 'display_name',
                users.raw_user_meta_data ->> 'full_name'
            )
        ),
        ''
    )
from auth.users as users
on conflict (id) do nothing;

commit;