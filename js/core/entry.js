(function () {
    "use strict";

    /* =========================================================
       CLUBHUB ENTRY ROUTER
       ========================================================= */

    const MINIMUM_SPLASH_MS =
        650;

    const startedAt =
        Date.now();

    const statusElement =
        document.getElementById(
            "clubhubEntryStatus"
        );

    let redirectStarted =
        false;

    function wait(milliseconds) {
        return new Promise(function (resolve) {
            window.setTimeout(
                resolve,
                milliseconds
            );
        });
    }

    function setStatus(message) {
        if (statusElement) {
            statusElement.textContent =
                message;
        }
    }

    function getSupabaseClient() {
        if (!window.supabaseClient) {
            throw new Error(
                "ClubHub could not initialise its authentication service."
            );
        }

        return window.supabaseClient;
    }

    function getLoginUrl() {
        const incoming =
            new URLSearchParams(
                window.location.search
            );

        const loginParameters =
            new URLSearchParams();

        const returnTo =
            incoming.get("returnTo");

        const reason =
            incoming.get("reason");

        if (returnTo) {
            loginParameters.set(
                "returnTo",
                returnTo
            );
        }

        if (reason) {
            loginParameters.set(
                "reason",
                reason
            );
        }

        const query =
            loginParameters.toString();

        return query
            ? `./html/login.html?${query}`
            : "./html/login.html";
    }

    function getHomeUrl() {
        return "./html/index.html";
    }

    async function waitForMinimumDisplay() {
        const elapsed =
            Date.now() -
            startedAt;

        const remaining =
            Math.max(
                MINIMUM_SPLASH_MS -
                    elapsed,
                0
            );

        if (remaining > 0) {
            await wait(remaining);
        }
    }

    async function redirectTo(url) {
    if (redirectStarted) {
        return;
    }

    redirectStarted = true;

    await waitForMinimumDisplay();

    /*
     * Keep the splash visible until the destination page
     * replaces this document.
     */
    window.location.replace(url);
}

    async function initialiseEntry() {
        try {
            setStatus(
                "Checking your account…"
            );

            const client =
                getSupabaseClient();

            const {
                data,
                error
            } = await client.auth.getSession();

            if (error) {
                throw error;
            }

            if (data.session) {
                setStatus(
                    "Welcome back."
                );

                await redirectTo(
                    getHomeUrl()
                );

                return;
            }

            setStatus(
                "Ready to sign in."
            );

            await redirectTo(
                getLoginUrl()
            );
        } catch (error) {
            console.error(
                "ClubHub entry check failed:",
                error
            );

            /*
             ** An auth-service problem should never trap the
             * user on the splash. The login page can show the
             * relevant error if authentication remains down.
             */
            setStatus(
                "Opening sign in…"
            );

            await redirectTo(
                getLoginUrl()
            );
        }
    }

    if (
        document.readyState ===
        "loading"
    ) {
        document.addEventListener(
            "DOMContentLoaded",
            initialiseEntry,
            {
                once: true
            }
        );
    } else {
        initialiseEntry();
    }
})();