(function () {
    "use strict";

    const LOGIN_PAGE = "login.html";
    const PROFILE_SCRIPT = "../js/core/profile.js";
    const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
    const LAST_ACTIVITY_KEY = "bookit_last_activity";

    window.BookIt = window.BookIt || {};

    let isRedirecting = false;
    let inactivityInterval = null;
    let lastRecordedActivity = 0;

    function redirectToLogin(reason = "") {
        if (isRedirecting) {
            return;
        }

        isRedirecting = true;

        const currentPage =
            window.location.pathname.split("/").pop() || "index.html";

        const returnTo = encodeURIComponent(
            `${currentPage}${window.location.search}`
        );

        const reasonParameter = reason
            ? `&reason=${encodeURIComponent(reason)}`
            : "";

        window.location.replace(
            `${LOGIN_PAGE}?returnTo=${returnTo}${reasonParameter}`
        );
    }

    function loadScript(source) {
        return new Promise(function (resolve, reject) {
            const existingScript = document.querySelector(
                `script[src="${source}"]`
            );

            if (existingScript) {
                if (window.BookIt.profile) {
                    resolve();
                    return;
                }

                existingScript.addEventListener("load", resolve, {
                    once: true
                });

                existingScript.addEventListener("error", reject, {
                    once: true
                });

                return;
            }

            const script = document.createElement("script");

            script.src = source;
            script.defer = true;

            script.addEventListener("load", resolve, {
                once: true
            });

            script.addEventListener(
                "error",
                function () {
                    reject(
                        new Error(`Could not load script: ${source}`)
                    );
                },
                {
                    once: true
                }
            );

            document.head.appendChild(script);
        });
    }

    async function getAuthenticatedUser() {
        if (!window.supabaseClient) {
            throw new Error("Supabase client is unavailable.");
        }

        const {
            data: { user },
            error
        } = await window.supabaseClient.auth.getUser();

        if (error) {
            throw error;
        }

        return user;
    }

    function getLastActivity() {
        const storedValue = Number(
            window.localStorage.getItem(LAST_ACTIVITY_KEY)
        );

        if (!Number.isFinite(storedValue) || storedValue <= 0) {
            return Date.now();
        }

        return storedValue;
    }

    function recordActivity() {
        const now = Date.now();

        if (now - lastRecordedActivity < 1000) {
            return;
        }

        lastRecordedActivity = now;

        window.localStorage.setItem(
            LAST_ACTIVITY_KEY,
            String(now)
        );
    }

    function hasSessionTimedOut() {
        return (
            Date.now() - getLastActivity() >=
            SESSION_TIMEOUT_MS
        );
    }

    async function signOutForInactivity() {
        try {
            if (window.supabaseClient) {
                await window.supabaseClient.auth.signOut({
                    scope: "local"
                });
            }
        } catch (error) {
            console.error(
                "BookIt inactivity sign-out failed:",
                error
            );
        } finally {
            window.localStorage.removeItem(LAST_ACTIVITY_KEY);
            redirectToLogin("timeout");
        }
    }

    async function checkInactivity() {
        if (hasSessionTimedOut()) {
            await signOutForInactivity();
        }
    }

    function startInactivityTracking() {
        recordActivity();

        [
            "pointerdown",
            "keydown",
            "touchstart",
            "scroll"
        ].forEach(function (eventName) {
            window.addEventListener(
                eventName,
                recordActivity,
                {
                    passive: true
                }
            );
        });

        document.addEventListener(
            "visibilitychange",
            function () {
                if (document.visibilityState === "visible") {
                    checkInactivity();
                }
            }
        );

        window.addEventListener("pageshow", checkInactivity);

        inactivityInterval = window.setInterval(
            checkInactivity,
            15000
        );
    }

    function exposeApplicationData(user, profile) {
        window.BookIt.user = user;
        window.BookIt.currentProfile = profile;
        window.bookitUser = user;
        window.bookitProfile = profile;
    }

    function markApplicationReady() {
        document.documentElement.classList.add("auth-ready");

        document.dispatchEvent(
            new CustomEvent("bookit:ready", {
                detail: {
                    user: window.BookIt.user,
                    profile: window.BookIt.currentProfile
                }
            })
        );
    }

    function showStartupFailure() {
        document.documentElement.classList.add("auth-ready");

        document.dispatchEvent(
            new CustomEvent("bookit:error", {
                detail: {
                    message:
                        "BookIt could not load your account information."
                }
            })
        );
    }

    async function initialiseBookIt() {
        try {
            const user = await getAuthenticatedUser();

            if (!user) {
                redirectToLogin();
                return;
            }

            if (hasSessionTimedOut()) {
                await signOutForInactivity();
                return;
            }

            await loadScript(PROFILE_SCRIPT);

            if (
                !window.BookIt.profile ||
                typeof window.BookIt.profile.load !== "function"
            ) {
                throw new Error(
                    "The BookIt profile service is unavailable."
                );
            }

            const profile =
                await window.BookIt.profile.load();

            exposeApplicationData(user, profile);
            startInactivityTracking();
            markApplicationReady();
        } catch (error) {
            console.error(
                "BookIt startup failed:",
                error
            );

            /*
             * A missing or invalid authenticated user should return
             * to login. Database/profile failures should reveal the
             * page so an error state can be shown instead of leaving
             * the screen permanently hidden.
             */
            if (
                error.message ===
                "No authenticated user was found."
            ) {
                redirectToLogin();
                return;
            }

            showStartupFailure();
        }
    }

    window.BookIt.ready = new Promise(function (resolve, reject) {
        document.addEventListener(
            "bookit:ready",
            function (event) {
                resolve(event.detail);
            },
            {
                once: true
            }
        );

        document.addEventListener(
            "bookit:error",
            function (event) {
                reject(
                    new Error(event.detail.message)
                );
            },
            {
                once: true
            }
        );
    });

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            initialiseBookIt,
            {
                once: true
            }
        );
    } else {
        initialiseBookIt();
    }

    window.addEventListener("beforeunload", function () {
        if (inactivityInterval) {
            window.clearInterval(inactivityInterval);
        }
    });
})();