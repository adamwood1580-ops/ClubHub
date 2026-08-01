(function () {
    "use strict";

    window.BookIt = window.BookIt || {};

    let cachedProfile = null;
    let loadingPromise = null;

    function normaliseProfileData(
        user,
        profile,
        membership,
        handicap
    ) {
        const club = membership?.clubs || null;

        return {
            userId: user.id,
            email: user.email || "",

            firstName: profile?.first_name || "",
            lastName: profile?.last_name || "",
            displayName:
                profile?.display_name ||
                [profile?.first_name, profile?.last_name]
                    .filter(Boolean)
                    .join(" ") ||
                user.email ||
                "Member",

            phone: profile?.phone || "",
            avatarUrl: profile?.avatar_url || null,

            club: club
                ? {
                    id: club.id,
                    name: club.name
                }
                : null,

            membership: membership
                ? {
                    id: membership.id,
                    number: membership.membership_number || "",
                    type: membership.membership_type,
                    status: membership.status,
                    role: membership.role,
                    joinedAt: membership.joined_at,
                    isPrimary: membership.is_primary
                }
                : null,

            handicap: handicap
                ? {
                    id: handicap.id,
                    index:
                        handicap.handicap_index === null
                            ? null
                            : Number(handicap.handicap_index),

                    governingBody: handicap.governing_body,
                    externalMemberId:
                        handicap.external_member_id || null,

                    verificationStatus:
                        handicap.verification_status,

                    verifiedAt: handicap.verified_at,
                    lastCheckedAt: handicap.last_checked_at,
                    sourceUpdatedAt: handicap.source_updated_at
                }
                : null
        };
    }

    async function getAuthenticatedUser() {
        if (!window.supabaseClient) {
            throw new Error("Supabase client is unavailable.");
        }

        /*
         * auth.getUser() validates the current user with Supabase.
         * This is safer than trusting a locally stored user object.
         */
        const {
            data: { user },
            error
        } = await window.supabaseClient.auth.getUser();

        if (error) {
            throw error;
        }

        if (!user) {
            throw new Error("No authenticated user was found.");
        }

        return user;
    }

    async function fetchProfile(userId) {
        const { data, error } = await window.supabaseClient
            .from("profiles")
            .select(`
                id,
                first_name,
                last_name,
                display_name,
                phone,
                avatar_url,
                created_at,
                updated_at
            `)
            .eq("id", userId)
            .maybeSingle();

        if (error) {
            throw error;
        }

        return data;
    }

    async function fetchPrimaryMembership(userId) {
        const { data, error } = await window.supabaseClient
            .from("club_memberships")
            .select(`
                id,
                profile_id,
                club_id,
                membership_number,
                membership_type,
                status,
                role,
                joined_at,
                is_primary,
                created_at,
                updated_at,
                clubs (
                    id,
                    name
                )
            `)
            .eq("profile_id", userId)
            .eq("status", "active")
            .order("is_primary", {
                ascending: false
            })
            .order("created_at", {
                ascending: true
            })
            .limit(1)
            .maybeSingle();

        if (error) {
            throw error;
        }

        return data;
    }

    async function fetchHandicap(userId) {
        const { data, error } = await window.supabaseClient
            .from("player_handicaps")
            .select(`
                id,
                profile_id,
                governing_body,
                external_member_id,
                handicap_index,
                verification_status,
                verified_at,
                last_checked_at,
                source_updated_at,
                created_at,
                updated_at
            `)
            .eq("profile_id", userId)
            .maybeSingle();

        if (error) {
            throw error;
        }

        return data;
    }

    async function loadProfile(options = {}) {
        const forceRefresh = options.forceRefresh === true;

        if (cachedProfile && !forceRefresh) {
            return cachedProfile;
        }

        /*
         * Prevent several page components from sending the same
         * profile requests at the same time.
         */
        if (loadingPromise && !forceRefresh) {
            return loadingPromise;
        }

        loadingPromise = (async function () {
            const user = await getAuthenticatedUser();

            const [
                profile,
                membership,
                handicap
            ] = await Promise.all([
                fetchProfile(user.id),
                fetchPrimaryMembership(user.id),
                fetchHandicap(user.id)
            ]);

            cachedProfile = normaliseProfileData(
                user,
                profile,
                membership,
                handicap
            );

            window.bookitProfile = cachedProfile;

            return cachedProfile;
        })();

        try {
            return await loadingPromise;
        } catch (error) {
            console.error(
                "BookIt profile loading failed:",
                error
            );

            throw error;
        } finally {
            loadingPromise = null;
        }
    }

    function getCachedProfile() {
        return cachedProfile;
    }

    function clearProfileCache() {
        cachedProfile = null;
        loadingPromise = null;
        window.bookitProfile = null;
    }

    window.BookIt.profile = {
        load: loadProfile,
        getCached: getCachedProfile,
        clearCache: clearProfileCache
    };
})();