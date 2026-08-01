(function () {
    "use strict";

    const FALLBACK_MEMBER_NAME = "Member";

    function getElement(id) {
        return document.getElementById(id);
    }

    function getTimeSensitiveGreeting() {
        const hour = new Date().getHours();

        if (hour < 12) {
            return "Good morning";
        }

        if (hour < 18) {
            return "Good afternoon";
        }

        return "Good evening";
    }

    function getInitials(profile) {
        const firstName = profile.firstName?.trim() || "";
        const lastName = profile.lastName?.trim() || "";

        if (firstName || lastName) {
            return `${firstName.charAt(0)}${lastName.charAt(0)}`
                .toUpperCase();
        }

        const displayName = profile.displayName?.trim() || "";

        if (displayName) {
            const nameParts = displayName
                .split(/\s+/)
                .filter(Boolean);

            if (nameParts.length === 1) {
                return nameParts[0]
                    .slice(0, 2)
                    .toUpperCase();
            }

            return (
                nameParts[0].charAt(0) +
                nameParts[nameParts.length - 1].charAt(0)
            ).toUpperCase();
        }

        return "M";
    }

    function getPreferredName(profile) {
        if (profile.firstName?.trim()) {
            return profile.firstName.trim();
        }

        if (profile.displayName?.trim()) {
            return profile.displayName.trim().split(/\s+/)[0];
        }

        return FALLBACK_MEMBER_NAME;
    }

    function getHandicapStatus(profile) {
        const handicap = profile.handicap;

        if (!handicap) {
            return "No handicap record";
        }

        if (
            handicap.verificationStatus !== "verified"
        ) {
            return "Awaiting verification";
        }

        const updateDate =
            handicap.verifiedAt ||
            handicap.lastCheckedAt ||
            handicap.sourceUpdatedAt;

        if (!updateDate) {
            return "Verified";
        }

        const parsedDate = new Date(updateDate);

        if (Number.isNaN(parsedDate.getTime())) {
            return "Verified";
        }

        const formattedDate =
            new Intl.DateTimeFormat("en-GB", {
                day: "numeric",
                month: "long",
                year: "numeric"
            }).format(parsedDate);

        return `Verified · Updated ${formattedDate}`;
    }

    function renderProfile(profile) {
        const avatar = getElement("profileAvatar");
        const greeting = getElement("profileGreeting");
        const club = getElement("profileClub");
        const membershipNumber =
            getElement("profileMembershipNumber");
        const handicap = getElement("profileHandicap");
        const handicapUpdated =
            getElement("profileHandicapUpdated");

        if (
            !avatar ||
            !greeting ||
            !club ||
            !membershipNumber ||
            !handicap ||
            !handicapUpdated
        ) {
            throw new Error(
                "One or more Profile page elements are missing."
            );
        }

        const preferredName = getPreferredName(profile);

        avatar.textContent = getInitials(profile);

        greeting.textContent =
            `${getTimeSensitiveGreeting()}, ${preferredName} 👋`;

        club.textContent =
            profile.club?.name ||
            "No active club membership";

        membershipNumber.textContent =
            profile.membership?.number
                ? `Member number ${profile.membership.number}`
                : "No membership number";

        handicap.textContent =
            profile.handicap?.index ?? "--.-";

        handicapUpdated.textContent =
            getHandicapStatus(profile);
    }

    function renderError(error) {
        console.error(
            "BookIt Profile page failed:",
            error
        );

        const greeting = getElement("profileGreeting");
        const club = getElement("profileClub");
        const membershipNumber =
            getElement("profileMembershipNumber");
        const handicap = getElement("profileHandicap");
        const handicapUpdated =
            getElement("profileHandicapUpdated");

        if (greeting) {
            greeting.textContent = "Profile unavailable";
        }

        if (club) {
            club.textContent =
                "We could not load your club details.";
        }

        if (membershipNumber) {
            membershipNumber.textContent = "";
        }

        if (handicap) {
            handicap.textContent = "--.-";
        }

        if (handicapUpdated) {
            handicapUpdated.textContent =
                "Handicap unavailable";
        }
    }

    function initialiseProfilePage() {
        if (
            !window.BookIt ||
            !window.BookIt.ready
        ) {
            renderError(
                new Error(
                    "BookIt startup service is unavailable."
                )
            );
            return;
        }

        window.BookIt.ready
            .then(function (application) {
                renderProfile(application.profile);
            })
            .catch(renderError);
    }

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            initialiseProfilePage,
            {
                once: true
            }
        );
    } else {
        initialiseProfilePage();
    }
})();
