(function () {
    "use strict";

    window.BookIt = window.BookIt || {};

    const greetingElement =
        document.getElementById("homeGreeting");

    const greetingSubtitleElement =
        document.getElementById(
            "homeGreetingSubtitle"
        );

    const nextRoundCard =
        document.getElementById(
            "nextRoundCard"
        );

    const nextRoundTime =
        document.getElementById(
            "nextRoundTime"
        );

    const nextRoundDate =
        document.getElementById(
            "nextRoundDate"
        );

    const nextRoundCourse =
        document.getElementById(
            "nextRoundCourse"
        );

    const nextRoundPlayers =
        document.getElementById(
            "nextRoundPlayers"
        );

    const nextRoundEmpty =
        document.getElementById(
            "nextRoundEmpty"
        );

    function getGreetingPeriod() {
        const hour = new Date().getHours();

        if (hour < 12) {
            return "Good morning";
        }

        if (hour < 18) {
            return "Good afternoon";
        }

        return "Good evening";
    }

    function getFirstName(profile) {
        if (profile?.firstName) {
            return profile.firstName;
        }

        if (profile?.displayName) {
            return String(profile.displayName)
                .trim()
                .split(/\s+/)[0];
        }

        return "Member";
    }

    function createLocalDate(dateKey) {
        return new Date(
            `${dateKey}T00:00:00`
        );
    }

    function formatBookingDate(dateKey) {
        return new Intl.DateTimeFormat(
            "en-GB",
            {
                weekday: "long",
                day: "numeric",
                month: "long"
            }
        ).format(
            createLocalDate(dateKey)
        );
    }

    function renderGreeting(profile) {
        const firstName =
            getFirstName(profile);

        if (greetingElement) {
            greetingElement.textContent =
                `${getGreetingPeriod()}, ${firstName} 👋`;
        }

        if (greetingSubtitleElement) {
            greetingSubtitleElement.textContent =
                profile?.club?.name
                    ? `Ready for golf at ${profile.club.name}?`
                    : "Ready for golf?";
        }
    }

    function showNoUpcomingBooking() {
        if (nextRoundCard) {
            nextRoundCard.hidden = true;
        }

        if (nextRoundEmpty) {
            nextRoundEmpty.hidden = false;
        }
    }

    function renderUpcomingBooking(upcoming) {
        if (!upcoming) {
            showNoUpcomingBooking();
            return;
        }

        if (nextRoundCard) {
            nextRoundCard.hidden = false;
        }

        if (nextRoundEmpty) {
            nextRoundEmpty.hidden = true;
        }

        if (nextRoundTime) {
            nextRoundTime.textContent =
                upcoming.teeTime.time;
        }

        if (nextRoundDate) {
            nextRoundDate.textContent =
                formatBookingDate(
                    upcoming.teeTime.playDate
                );
        }

        if (nextRoundCourse) {
            nextRoundCourse.textContent =
                upcoming.course?.name ||
                "Main Course";
        }

        if (nextRoundPlayers) {
            const playerCount = Number(
                upcoming.booking?.playerCount ||
                1
            );

            nextRoundPlayers.textContent =
                `${playerCount} ${
                    playerCount === 1
                        ? "player"
                        : "players"
                }`;
        }
    }

    function showProfileError(error) {
        console.error(
            "BookIt home profile failed:",
            error
        );

        if (greetingElement) {
            greetingElement.textContent =
                "Welcome";
        }

        if (greetingSubtitleElement) {
            greetingSubtitleElement.textContent =
                error?.message ||
                "We could not load your account information.";
        }
    }

    async function loadUpcomingBooking() {
        try {
            if (
                !window.BookIt.booking ||
                typeof window.BookIt.booking
                    .getUpcoming !== "function"
            ) {
                showNoUpcomingBooking();
                return;
            }

            const upcoming =
                await window.BookIt.booking
                    .getUpcoming({
                        forceRefresh: true
                    });

            renderUpcomingBooking(upcoming);
        } catch (error) {
            console.error(
                "BookIt upcoming booking failed:",
                error
            );

            /*
             * A booking-query problem must not prevent the
             * authenticated member's name from rendering.
             */
            showNoUpcomingBooking();
        }
    }

    async function initialiseHomePage() {
        let readyData;

        try {
            readyData =
                await window.BookIt.ready;
        } catch (error) {
            showProfileError(error);
            showNoUpcomingBooking();
            return;
        }

        try {
            const currentProfile =
                await window.BookIt.profile.load({
                    forceRefresh: true
                });

            renderGreeting(
                currentProfile ||
                readyData?.profile
            );
        } catch (error) {
            /*
             * The profile already resolved during Boot in most
             * cases, so retain that valid value as a fallback.
             */
            if (readyData?.profile) {
                renderGreeting(
                    readyData.profile
                );
            } else {
                showProfileError(error);
            }
        }

        await loadUpcomingBooking();
    }

    if (
        document.readyState === "loading"
    ) {
        document.addEventListener(
            "DOMContentLoaded",
            initialiseHomePage,
            {
                once: true
            }
        );
    } else {
        initialiseHomePage();
    }
})();