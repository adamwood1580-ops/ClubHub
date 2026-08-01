begin;

create table public.player_handicaps (
    id uuid primary key default gen_random_uuid(),

    profile_id uuid not null
        references public.profiles(id)
        on delete cascade,

    governing_body text not null default 'england_golf',
    external_member_id text,

    handicap_index numeric(4,1),
    verification_status text not null default 'unverified',

    verified_at timestamptz,
    last_checked_at timestamptz,
    source_updated_at timestamptz,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint player_handicaps_one_per_profile
        unique (profile_id),

    constraint player_handicaps_external_id_unique
        unique (governing_body, external_member_id),

    constraint player_handicaps_governing_body_valid
        check (
            governing_body in (
                'england_golf',
                'wales_golf',
                'scottish_golf',
                'golf_ireland',
                'manual'
            )
        ),

    constraint player_handicaps_status_valid
        check (
            verification_status in (
                'unverified',
                'pending',
                'verified',
                'failed',
                'expired'
            )
        ),

    constraint player_handicaps_index_valid
        check (
            handicap_index is null
            or handicap_index between -10.0 and 54.0
        ),

    constraint player_handicaps_external_id_not_blank
        check (
            external_member_id is null
            or length(trim(external_member_id)) > 0
        ),

    constraint player_handicaps_verified_data_consistent
        check (
            verification_status <> 'verified'
            or (
                handicap_index is not null
                and external_member_id is not null
                and verified_at is not null
            )
        )
);

create index player_handicaps_profile_id_idx
on public.player_handicaps (profile_id);

create index player_handicaps_external_member_id_idx
on public.player_handicaps (
    governing_body,
    external_member_id
);

create index player_handicaps_verification_status_idx
on public.player_handicaps (verification_status);

alter table public.player_handicaps
enable row level security;

create policy "Players can read their own handicap"
on public.player_handicaps
for select
to authenticated
using (
    (select auth.uid()) = profile_id
);

commit;