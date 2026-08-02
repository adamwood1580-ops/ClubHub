(function () {
    "use strict";

    window.BookIt = window.BookIt || {};

    const dayCache = new Map();
    const teeTimeCache = new Map();

    let upcomingCache;

    function getClient() {
        if (!window.supabaseClient) {
            throw new Error(
                "Supabase client is unavailable."
            );
        }

        return window.supabaseClient;
    }

    function getCurrentProfile() {
        const profile =
            window.BookIt.currentProfile;

        if (!profile) {
            throw new Error(
                "The current member profile is unavailable."
            );
        }

        if (!profile.club?.id) {
            throw new Error(
                "No active club membership is available."
            );
        }

        return profile;
    }

    function toDateKey(value) {
        let date;

        if (value instanceof Date) {
            date = new Date(
                value.getFullYear(),
                value.getMonth(),
                value.getDate()
            );
        } else if (
            typeof value === "string" &&
            /^\d{4}-\d{2}-\d{2}$/.test(value)
        ) {
            date = new Date(
                `${value}T00:00:00`
            );
        } else {
            date = new Date(value);
        }

        if (Number.isNaN(date.getTime())) {
            throw new Error(
                "A valid booking date is required."
            );
        }

        const year = date.getFullYear();

        const month = String(
            date.getMonth() + 1
        ).padStart(2, "0");

        const day = String(
            date.getDate()
        ).padStart(2, "0");

        return `${year}-${month}-${day}`;
    }

    function formatTime(value) {
        if (!value) {
            return "";
        }

        return String(value).slice(0, 5);
    }

    function normaliseOptionalText(value) {
        if (
            value === null ||
            value === undefined
        ) {
            return null;
        }

        const normalised =
            String(value).trim();

        return normalised || null;
    }

    function isActiveBookingMember(member) {
        return [
            "invited",
            "confirmed",
            "checked_in"
        ].includes(member.member_status);
    }

    function getDisplayStatus(
        operationalStatus,
        booking,
        occupied,
        maxPlayers
    ) {
        const operationalLabels = {
            blocked: "Blocked",
            maintenance: "Maintenance",
            competition: "Competition",
            closed: "Closed"
        };

        if (operationalStatus !== "open") {
            return (
                operationalLabels[
                    operationalStatus
                ] || "Unavailable"
            );
        }

        if (
            booking &&
            booking.type === "private"
        ) {
            return "Booked";
        }

        const remaining = Math.max(
            maxPlayers - occupied,
            0
        );

        if (!booking) {
            return "Available";
        }

        if (remaining === 0) {
            return "Full";
        }

        return `${remaining} ${
            remaining === 1
                ? "space"
                : "spaces"
        }`;
    }

    function getActionType(
        operationalStatus,
        booking,
        spacesRemaining
    ) {
        if (operationalStatus !== "open") {
            return "none";
        }

        if (!booking) {
            return "book";
        }

        if (
            booking.type === "private" ||
            spacesRemaining <= 0
        ) {
            return "none";
        }

        if (booking.type === "joinable") {
            return "join";
        }

        return "none";
    }

    function normaliseMember(member) {
        const membership =
            member.club_memberships || null;

        const profile =
            membership?.profiles || null;

        const fallbackName = [
            profile?.first_name,
            profile?.last_name
        ]
            .filter(Boolean)
            .join(" ")
            .trim();

        return {
            bookingMemberId:
                member.id,

            membershipId:
                member.membership_id,

            position:
                Number(member.position),

            status:
                member.member_status,

            checkedInAt:
                member.checked_in_at ||
                null,

            name:
                profile?.display_name ||
                fallbackName ||
                "Member"
        };
    }

    function normaliseTeeTime(row) {
        const bookings =
            Array.isArray(row.bookings)
                ? row.bookings
                : [];

        const activeBookingRow =
            bookings.find(function (booking) {
                return (
                    booking.booking_status ===
                    "active"
                );
            }) || null;

        const rawMembers =
            activeBookingRow &&
            Array.isArray(
                activeBookingRow.booking_members
            )
                ? activeBookingRow.booking_members
                : [];

        const activeMembers = rawMembers
            .filter(isActiveBookingMember)
            .map(normaliseMember)
            .sort(function (a, b) {
                return a.position - b.position;
            });

        const maxPlayers =
            Number(row.max_players);

        const occupied =
            activeBookingRow
                ? Number(
                    activeBookingRow.player_count
                )
                : 0;

        const spacesRemaining = Math.max(
            maxPlayers - occupied,
            0
        );

        const booking = activeBookingRow
            ? {
                id:
                    activeBookingRow.id,

                type:
                    activeBookingRow.booking_type,

                status:
                    activeBookingRow.booking_status,

                playerCount:
                    Number(
                        activeBookingRow.player_count
                    ),

                leadName:
                    activeBookingRow.lead_name ||
                    "",

                contactNumber:
                    activeBookingRow.contact_number ||
                    "",

                members:
                    activeMembers
            }
            : null;

        return {
            id:
                row.id,

            courseId:
                row.course_id,

            playDate:
                row.play_date,

            time:
                formatTime(row.start_time),

            operationalStatus:
                row.operational_status,

            notes:
                row.notes || "",

            course: row.courses
                ? {
                    id:
                        row.courses.id,

                    clubId:
                        row.courses.club_id,

                    name:
                        row.courses.name
                }
                : null,

            maxPlayers,
            occupied,
            spacesRemaining,

            displayStatus:
                getDisplayStatus(
                    row.operational_status,
                    booking,
                    occupied,
                    maxPlayers
                ),

            action:
                getActionType(
                    row.operational_status,
                    booking,
                    spacesRemaining
                ),

            booking
        };
    }

    function cacheTeeTimes(teeTimes) {
        teeTimes.forEach(function (teeTime) {
            teeTimeCache.set(
                teeTime.id,
                teeTime
            );
        });
    }

    const TEE_TIME_SELECT = `
        id,
        course_id,
        play_date,
        start_time,
        max_players,
        operational_status,
        notes,

        courses!inner (
            id,
            club_id,
            name
        ),

        bookings (
            id,
            tee_time_id,
            player_count,
            booking_type,
            booking_status,
            lead_name,
            contact_number,

            booking_members (
                id,
                membership_id,
                position,
                member_status,
                checked_in_at,

                club_memberships!booking_members_membership_id_fkey (
                    id,

                    profiles (
                        id,
                        first_name,
                        last_name,
                        display_name
                    )
                )
            )
        )
    `;

    async function getDay(
        date,
        options = {}
    ) {
        const forceRefresh =
            options.forceRefresh === true;

        const dateKey =
            toDateKey(date);

        if (
            dayCache.has(dateKey) &&
            !forceRefresh
        ) {
            return dayCache.get(dateKey);
        }

        const client =
            getClient();

        const profile =
            getCurrentProfile();

        const { data, error } =
            await client
                .from("tee_times")
                .select(TEE_TIME_SELECT)
                .eq(
                    "play_date",
                    dateKey
                )
                .eq(
                    "courses.club_id",
                    profile.club.id
                )
                .order(
                    "start_time",
                    {
                        ascending: true
                    }
                );

        if (error) {
            console.error(
                "BookIt could not load the tee sheet:",
                error
            );

            throw error;
        }

        const teeTimes =
            (data || []).map(
                normaliseTeeTime
            );

        dayCache.set(
            dateKey,
            teeTimes
        );

        cacheTeeTimes(teeTimes);

        return teeTimes;
    }

    async function getTeeTime(
        id,
        options = {}
    ) {
        if (!id) {
            throw new Error(
                "A tee-time ID is required."
            );
        }

        const forceRefresh =
            options.forceRefresh === true;

        if (
            teeTimeCache.has(id) &&
            !forceRefresh
        ) {
            return teeTimeCache.get(id);
        }

        const client =
            getClient();

        const profile =
            getCurrentProfile();

        const { data, error } =
            await client
                .from("tee_times")
                .select(TEE_TIME_SELECT)
                .eq("id", id)
                .eq(
                    "courses.club_id",
                    profile.club.id
                )
                .maybeSingle();

        if (error) {
            console.error(
                "BookIt could not load the tee time:",
                error
            );

            throw error;
        }

        if (!data) {
            return null;
        }

        const teeTime =
            normaliseTeeTime(data);

        teeTimeCache.set(
            teeTime.id,
            teeTime
        );

        return teeTime;
    }

    async function getUpcoming(
        options = {}
    ) {
        const forceRefresh =
            options.forceRefresh === true;

        if (
            upcomingCache !== undefined &&
            !forceRefresh
        ) {
            return upcomingCache;
        }

        const client =
            getClient();

        const profile =
            getCurrentProfile();

        const membershipId =
            profile.membership?.id;

        if (!membershipId) {
            upcomingCache = null;
            return null;
        }

        const today =
            toDateKey(new Date());

        const { data, error } =
            await client
                .from("booking_members")
                .select(`
                    id,
                    membership_id,
                    position,
                    member_status,

                    bookings!inner (
                        id,
                        player_count,
                        booking_type,
                        booking_status,

                        tee_times!inner (
                            id,
                            play_date,
                            start_time,
                            max_players,
                            operational_status,

                            courses!inner (
                                id,
                                club_id,
                                name
                            )
                        )
                    )
                `)
                .eq(
                    "membership_id",
                    membershipId
                )
                .in(
                    "member_status",
                    [
                        "invited",
                        "confirmed",
                        "checked_in"
                    ]
                )
                .eq(
                    "bookings.booking_status",
                    "active"
                )
                .gte(
                    "bookings.tee_times.play_date",
                    today
                )
                .eq(
                    "bookings.tee_times.courses.club_id",
                    profile.club.id
                )
                .order(
                    "play_date",
                    {
                        referencedTable:
                            "bookings.tee_times",

                        ascending: true
                    }
                )
                .order(
                    "start_time",
                    {
                        referencedTable:
                            "bookings.tee_times",

                        ascending: true
                    }
                )
                .limit(1);

        if (error) {
            console.error(
                "BookIt could not load the next booking:",
                error
            );

            throw error;
        }

        const row =
            data?.[0];

        if (!row) {
            upcomingCache = null;
            return null;
        }

        const booking =
            row.bookings;

        const teeTime =
            booking.tee_times;

        const course =
            teeTime.courses;

        upcomingCache = {
            bookingMemberId:
                row.id,

            membershipId:
                row.membership_id,

            position:
                Number(row.position),

            memberStatus:
                row.member_status,

            booking: {
                id:
                    booking.id,

                type:
                    booking.booking_type,

                status:
                    booking.booking_status,

                playerCount:
                    Number(
                        booking.player_count
                    )
            },

            teeTime: {
                id:
                    teeTime.id,

                playDate:
                    teeTime.play_date,

                time:
                    formatTime(
                        teeTime.start_time
                    ),

                maxPlayers:
                    Number(
                        teeTime.max_players
                    ),

                operationalStatus:
                    teeTime.operational_status
            },

            course: {
                id:
                    course.id,

                clubId:
                    course.club_id,

                name:
                    course.name
            }
        };

        return upcomingCache;
    }

    async function createBooking(
        options = {}
    ) {
        const teeTimeId =
            options.teeTimeId;

        const playerCount =
            Number(options.playerCount || 1);

        const bookingType =
            options.bookingType ||
            "joinable";

        const contactNumber =
            normaliseOptionalText(
                options.contactNumber
            );

        const notes =
            normaliseOptionalText(
                options.notes
            );

        if (!teeTimeId) {
            throw new Error(
                "A tee-time ID is required."
            );
        }

        if (
            !Number.isInteger(playerCount) ||
            playerCount < 1
        ) {
            throw new Error(
                "A valid player count is required."
            );
        }

        if (
            ![
                "joinable",
                "private"
            ].includes(bookingType)
        ) {
            throw new Error(
                "Booking type must be joinable or private."
            );
        }

        const teeTime =
            await getTeeTime(
                teeTimeId,
                {
                    forceRefresh: true
                }
            );

        if (!teeTime) {
            throw new Error(
                "The selected tee time could not be found."
            );
        }

        if (
            teeTime.operationalStatus !==
            "open"
        ) {
            throw new Error(
                "This tee time is not open for booking."
            );
        }

        if (teeTime.booking) {
            throw new Error(
                "This tee time already has a booking."
            );
        }

        if (
            playerCount >
            teeTime.maxPlayers
        ) {
            throw new Error(
                `This tee time allows a maximum of ${teeTime.maxPlayers} players.`
            );
        }

        const client =
            getClient();

        const { data, error } =
            await client.rpc(
                "create_booking",
                {
                    p_tee_time_id:
                        teeTimeId,

                    p_player_count:
                        playerCount,

                    p_booking_type:
                        bookingType,

                    p_contact_number:
                        contactNumber,

                    p_notes:
                        notes
                }
            );

        if (error) {
            console.error(
                "BookIt could not create the booking:",
                error
            );

            throw new Error(
                error.message ||
                "The booking could not be created."
            );
        }

        dayCache.delete(
            teeTime.playDate
        );

        teeTimeCache.delete(
            teeTimeId
        );

        upcomingCache =
            undefined;

        return {
            bookingId:
                data,

            teeTimeId,

            playDate:
                teeTime.playDate,

            time:
                teeTime.time,

            playerCount,
            bookingType
        };
    }

    function clearCache() {
        dayCache.clear();
        teeTimeCache.clear();
        upcomingCache = undefined;
    }

    async function refreshDay(date) {
        const dateKey =
            toDateKey(date);

        dayCache.delete(dateKey);

        return getDay(
            dateKey,
            {
                forceRefresh: true
            }
        );
    }

    async function refreshUpcoming() {
        upcomingCache = undefined;

        return getUpcoming({
            forceRefresh: true
        });
    }

    window.BookIt.booking = {
        getDay,
        getTeeTime,
        getUpcoming,
        createBooking,
        refreshDay,
        refreshUpcoming,
        clearCache
    };
})();