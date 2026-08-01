(function () {
    "use strict";

    const TIMEOUT_MS = 5 * 60 * 1000;
    const LAST_ACTIVITY_KEY = "bookit_last_activity";
    const LOGIN_PAGE = "login.html";

    let timeoutCheck = null;
    let isSigningOut = false;
    let lastRecordedActivity = 0;

    function getLastActivity() {
        const storedValue = Number(
            window.localStorage.getItem(LAST_ACTIVITY_KEY)
        );

        return Number.isFinite(storedValue) && storedValue > 0
            ? storedValue
            : Date.now();
    }

    function recordActivity() {
        const now = Date.now();

        /*
         * Avoid writing to localStorage continuously while scrolling
         * or moving around the page.
         */
        if (now - lastRecordedActivity < 1000) {
            return;
        }

        lastRecordedActivity = now;

        window.localStorage.setItem(
            LAST_ACTIVITY_KEY,
            String(now)
        );
    }

    function hasTimedOut() {
        return Date.now() - getLastActivity() >= TIMEOUT_MS;
    }

    async function signOutForInactivity() {
        if (isSigningOut) {
            return;
        }

        isSigningOut = true;

        try {
            if (window.supabaseClient) {
                await window.supabaseClient.auth.signOut();
            }
        } catch (error) {
            console.error(
                "BookIt inactivity sign-out failed:",
                error
            );
        } finally {
            window.localStorage.removeItem(LAST_ACTIVITY_KEY);

            window.location.replace(
                `${LOGIN_PAGE}?reason=timeout`
            );
        }
    }

    async function checkSessionActivity() {
        if (hasTimedOut()) {
            await signOutForInactivity();
        }
    }

    function startTimeoutChecks() {
        recordActivity();

        const activityEvents = [
            "pointerdown",
            "keydown",
            "touchstart",
            "scroll"
        ];

        activityEvents.forEach(function (eventName) {
            window.addEventListener(
                eventName,
                recordActivity,
                {
                    passive: true
                }
            );
        });

        /*
         * iOS may suspend JavaScript timers while the phone is locked.
         * Checking the stored timestamp when the page becomes visible
         * ensures the timeout is still enforced when the user returns.
         */
        document.addEventListener(
            "visibilitychange",
            function () {
                if (document.visibilityState === "visible") {
                    checkSessionActivity();
                }
            }
        );

        window.addEventListener(
            "pageshow",
            checkSessionActivity
        );

        timeoutCheck = window.setInterval(
            checkSessionActivity,
            15000
        );
    }

    function initialise() {
        if (!window.supabaseClient) {
            console.error(
                "Supabase client unavailable for session timeout."
            );
            return;
        }

        checkSessionActivity().then(function () {
            if (!isSigningOut) {
                startTimeoutChecks();
            }
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            initialise
        );
    } else {
        initialise();
    }

    window.addEventListener("beforeunload", function () {
        if (timeoutCheck) {
            window.clearInterval(timeoutCheck);
        }
    });
})();