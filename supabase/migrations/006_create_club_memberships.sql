begin;

create table public.club_memberships (
    id uuid primary key default gen_random_uuid(),

    profile_id uuid not null
        references public.profiles(id)
        on delete cascade,

    club_id uuid not null
        references public.clubs(id)
        on delete cascade,

    membership_number text,
    membership_type text not null default 'member',
    status text not null default 'active',
    role text not null default 'member',

    joined_at date,
    is_primary boolean not null default false,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint club_memberships_profile_club_unique
        unique (profile_id, club_id),

    constraint club_memberships_number_not_blank
        check (
            membership_number is null
            or length(trim(membership_number)) > 0
        ),

    constraint club_memberships_type_valid
        check (
            membership_type in (
                'member',
                'junior',
                'student',
                'social',
                'corporate',
                'visitor',
                'guest',
                'staff'
            )
        ),

    constraint club_memberships_status_valid
        check (
            status in (
                'invited',
                'pending',
                'active',
                'suspended',
                'expired',
                'cancelled'
            )
        ),

    constraint club_memberships_role_valid
        check (
            role in (
                'member',
                'starter',
                'reception',
                'professional',
                'greenkeeper',
                'manager',
                'club_admin'
            )
        )
);

create unique index club_memberships_one_primary_club
on public.club_memberships (profile_id)
where is_primary = true;

create index club_memberships_profile_id_idx
on public.club_memberships (profile_id);

create index club_memberships_club_id_idx
on public.club_memberships (club_id);

create index club_memberships_status_idx
on public.club_memberships (status);

alter table public.club_memberships
enable row level security;

create policy "Members can read their own club memberships"
on public.club_memberships
for select
to authenticated
using (auth.uid() = profile_id);

commit;