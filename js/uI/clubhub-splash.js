(function () {
    "use strict";

    const splash =
        document.getElementById(
            "clubhubSplash"
        );

    if (!splash) {
        return;
    }

    let dismissed =
        false;

    const createdAt =
        Date.now();

    const minimumDisplayMs =
        350;

    function removeSplash() {
        if (dismissed) {
            return;
        }

        dismissed =
            true;

        const elapsed =
            Date.now() -
            createdAt;

        const delay =
            Math.max(
                minimumDisplayMs -
                    elapsed,
                0
            );

        window.setTimeout(
            function () {
                splash.classList.add(
                    "clubhub-splash--leaving"
                );

                splash.setAttribute(
                    "aria-hidden",
                    "true"
                );

                window.setTimeout(
                    function () {
                        splash.remove();
                    },
                    300
                );
            },
            delay
        );
    }

    /*
     * Normal successful application startup.
     */
    document.addEventListener(
        "bookit:ready",
        removeSplash,
        {
            once: true
        }
    );

    /*
     * Loader or account errors should not leave the splash
     * permanently covering the page.
     */
    document.addEventListener(
        "bookit:error",
        removeSplash,
        {
            once: true
        }
    );

    window.addEventListener(
        "bookit:loader-error",
        removeSplash,
        {
            once: true
        }
    );

    /*
     * Handles the rare case where boot completed before this
     * file attached its event listener.
     */
    if (
        window.BookIt &&
        window.BookIt.ready &&
        typeof window.BookIt.ready.then ===
            "function"
    ) {
        window.BookIt.ready
            .then(removeSplash)
            .catch(removeSplash);
    }

    /*
     * Emergency visual fallback only. This does not affect
     * authentication or application startup.
     */
    window.setTimeout(
        removeSplash,
        10000
    );
})();
