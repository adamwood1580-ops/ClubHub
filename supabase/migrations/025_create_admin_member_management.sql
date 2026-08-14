begin;

-- =========================================================
-- CLUBHUB ADMIN: MEMBER DIRECTORY + CSV IMPORT AUDIT
-- =========================================================

create table if not exists public.member_import_batches (
    id uuid primary key default gen_random_uuid(),

    club_id uuid not null
        references public.clubs(id)
        on delete cascade,

    created_by uuid
        references public.profiles(id)
        on delete set null,

    source_filename text,
    total_rows integer not null default 0,
    imported_count integer not null default 0,
    existing_count integer not null default 0,
    failed_count integer not null default 0,

    status text not null default 'processing',

    created_at timestamptz not null default now(),
    completed_at timestamptz,

    constraint member_import_batches_status_valid
        check (
            status in (
                'processing',
                'completed',
                'partial',
                'failed'
            )
        ),

    constraint member_import_batches_counts_valid
        check (
            total_rows >= 0
            and imported_count >= 0
            and existing_count >= 0
            and failed_count >= 0
        )
);

create index if not exists member_import_batches_club_created_idx
on public.member_import_batches (
    club_id,
    created_at desc
);

alter table public.member_import_batches
enable row level security;

drop policy if exists "Club admins can read member import batches"
on public.member_import_batches;

create policy "Club admins can read member import batches"
on public.member_import_batches
for select
to authenticated
using (
    public.user_has_admin_access(club_id)
);


create table if not exists public.member_import_rows (
    id uuid primary key default gen_random_uuid(),

    batch_id uuid not null
        references public.member_import_batches(id)
        on delete cascade,

    row_number integer not null,
    email text not null,
    first_name text,
    last_name text,
    membership_number text,
    membership_type text,
    handicap_index numeric(4,1),

    result_status text not null,
    result_message text,

    profile_id uuid
        references public.profiles(id)
        on delete set null,

    membership_id uuid
        references public.club_memberships(id)
        on delete set null,

    created_at timestamptz not null default now(),

    constraint member_import_rows_result_valid
        check (
            result_status in (
                'imported',
                'existing',
                'failed'
            )
        ),

    constraint member_import_rows_row_number_valid
        check (row_number > 0)
);

create unique index if not exists member_import_rows_batch_row_unique
on public.member_import_rows (
    batch_id,
    row_number
);

create index if not exists member_import_rows_batch_idx
on public.member_import_rows (batch_id);

alter table public.member_import_rows
enable row level security;

drop policy if exists "Club admins can read member import rows"
on public.member_import_rows;

create policy "Club admins can read member import rows"
on public.member_import_rows
for select
to authenticated
using (
    exists (
        select 1
        from public.member_import_batches as mib
        where mib.id = member_import_rows.batch_id
          and public.user_has_admin_access(mib.club_id)
    )
);


-- =========================================================
-- MEMBER DIRECTORY RPC
--
-- Email lives in auth.users, so the browser cannot query it
-- directly. This security-definer RPC verifies club admin access
-- first and returns only members belonging to that admin's club.
-- =========================================================

create or replace function public.get_admin_members(
    p_search text default null,
    p_status text default null,
    p_limit integer default 50,
    p_offset integer default 0
)
returns table (
    membership_id uuid,
    profile_id uuid,
    email text,
    first_name text,
    last_name text,
    display_name text,
    membership_number text,
    membership_type text,
    membership_status text,
    membership_role text,
    joined_at date,
    is_primary boolean,
    handicap_index numeric,
    handicap_status text,
    member_created_at timestamptz,
    total_count bigint
)
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_user_id uuid;
    v_club_id uuid;
    v_limit integer;
    v_offset integer;
    v_search text;
    v_status text;
begin
    v_user_id := auth.uid();

    if v_user_id is null then
        raise exception 'Admin access required.';
    end if;

    select cm.club_id
    into v_club_id
    from public.club_memberships as cm
    where cm.profile_id = v_user_id
      and cm.status = 'active'
      and cm.role in ('manager', 'club_admin')
    order by cm.is_primary desc, cm.created_at asc
    limit 1;

    if v_club_id is null then
        raise exception 'Admin access required.';
    end if;

    v_limit := greatest(1, least(coalesce(p_limit, 50), 100));
    v_offset := greatest(0, coalesce(p_offset, 0));
    v_search := nullif(lower(trim(coalesce(p_search, ''))), '');
    v_status := nullif(lower(trim(coalesce(p_status, ''))), '');

    if v_status = 'all' then
        v_status := null;
    end if;

    return query
    with filtered as (
        select
            cm.id as membership_id,
            cm.profile_id,
            au.email::text as email,
            p.first_name,
            p.last_name,
            p.display_name,
            cm.membership_number,
            cm.membership_type,
            cm.status as membership_status,
            cm.role as membership_role,
            cm.joined_at,
            cm.is_primary,
            ph.handicap_index,
            ph.verification_status as handicap_status,
            cm.created_at as member_created_at
        from public.club_memberships as cm
        join public.profiles as p
            on p.id = cm.profile_id
        join auth.users as au
            on au.id = cm.profile_id
        left join public.player_handicaps as ph
            on ph.profile_id = cm.profile_id
        where cm.club_id = v_club_id
          and (
              v_status is null
              or cm.status = v_status
          )
          and (
              v_search is null
              or lower(coalesce(au.email, '')) like '%' || v_search || '%'
              or lower(coalesce(p.first_name, '')) like '%' || v_search || '%'
              or lower(coalesce(p.last_name, '')) like '%' || v_search || '%'
              or lower(coalesce(p.display_name, '')) like '%' || v_search || '%'
              or lower(coalesce(cm.membership_number, '')) like '%' || v_search || '%'
          )
    ),
    counted as (
        select count(*)::bigint as total_count
        from filtered
    )
    select
        f.membership_id,
        f.profile_id,
        f.email,
        f.first_name,
        f.last_name,
        f.display_name,
        f.membership_number,
        f.membership_type,
        f.membership_status,
        f.membership_role,
        f.joined_at,
        f.is_primary,
        f.handicap_index,
        f.handicap_status,
        f.member_created_at,
        c.total_count
    from filtered as f
    cross join counted as c
    order by
        lower(
            coalesce(
                nullif(trim(f.display_name), ''),
                nullif(trim(f.last_name), ''),
                nullif(trim(f.first_name), ''),
                f.email
            )
        ),
        lower(f.email)
    limit v_limit
    offset v_offset;
end;
$$;

revoke all
on function public.get_admin_members(text, text, integer, integer)
from public, anon;

grant execute
on function public.get_admin_members(text, text, integer, integer)
to authenticated;


-- =========================================================
-- MEMBER STATUS UPDATE
-- =========================================================

create or replace function public.admin_set_member_status(
    p_membership_id uuid,
    p_status text
)
returns table (
    membership_id uuid,
    membership_status text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_user_id uuid;
    v_admin_role text;
    v_target_club_id uuid;
    v_target_profile_id uuid;
    v_target_role text;
    v_new_status text;
begin
    v_user_id := auth.uid();
    v_new_status := lower(trim(coalesce(p_status, '')));

    if v_user_id is null then
        raise exception 'Admin access required.';
    end if;

    if v_new_status not in (
        'invited',
        'pending',
        'active',
        'suspended',
        'expired',
        'cancelled'
    ) then
        raise exception 'Invalid membership status.';
    end if;

    select
        cm.club_id,
        cm.profile_id,
        cm.role
    into
        v_target_club_id,
        v_target_profile_id,
        v_target_role
    from public.club_memberships as cm
    where cm.id = p_membership_id;

    if v_target_club_id is null then
        raise exception 'Member not found.';
    end if;

    select cm.role
    into v_admin_role
    from public.club_memberships as cm
    where cm.profile_id = v_user_id
      and cm.club_id = v_target_club_id
      and cm.status = 'active'
      and cm.role in ('manager', 'club_admin')
    limit 1;

    if v_admin_role is null then
        raise exception 'Admin access required.';
    end if;

    if v_target_profile_id = v_user_id
       and v_new_status <> 'active' then
        raise exception 'You cannot deactivate your own admin membership.';
    end if;

    if v_target_role = 'club_admin'
       and v_admin_role <> 'club_admin' then
        raise exception 'Only a Club Admin can change another Club Admin account.';
    end if;

    update public.club_memberships as cm
    set
        status = v_new_status,
        joined_at = case
            when v_new_status = 'active'
                then coalesce(cm.joined_at, current_date)
            else cm.joined_at
        end,
        updated_at = now()
    where cm.id = p_membership_id;

    return query
    select
        cm.id,
        cm.status
    from public.club_memberships as cm
    where cm.id = p_membership_id;
end;
$$;

revoke all
on function public.admin_set_member_status(uuid, text)
from public, anon;

grant execute
on function public.admin_set_member_status(uuid, text)
to authenticated;


-- =========================================================
-- FIRST LOGIN ACTIVATION
--
-- CSV-invited members are stored as invited until they actually
-- authenticate. The profile service calls this RPC immediately
-- after authentication so the membership becomes active before
-- the rest of the application reads it.
-- =========================================================

create or replace function public.activate_my_invited_memberships()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_user_id uuid;
    v_updated integer := 0;
begin
    v_user_id := auth.uid();

    if v_user_id is null then
        return 0;
    end if;

    update public.club_memberships as cm
    set
        status = 'active',
        joined_at = coalesce(cm.joined_at, current_date),
        updated_at = now()
    where cm.profile_id = v_user_id
      and cm.status in ('invited', 'pending');

    get diagnostics v_updated = row_count;

    if not exists (
        select 1
        from public.club_memberships as cm
        where cm.profile_id = v_user_id
          and cm.is_primary = true
    ) then
        update public.club_memberships as cm
        set
            is_primary = true,
            updated_at = now()
        where cm.id = (
            select candidate.id
            from public.club_memberships as candidate
            where candidate.profile_id = v_user_id
              and candidate.status = 'active'
            order by candidate.created_at asc
            limit 1
        );
    end if;

    return v_updated;
end;
$$;

revoke all
on function public.activate_my_invited_memberships()
from public, anon;

grant execute
on function public.activate_my_invited_memberships()
to authenticated;

commit;

notify pgrst, 'reload schema';
