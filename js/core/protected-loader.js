(function () {
    "use strict";

    /* =========================================================
       CLUBHUB PROTECTED PAGE LOADER
       ========================================================= */

    const loaderScript =
        document.currentScript;

    if (!loaderScript) {
        console.error(
            "ClubHub protected loader could not identify its script element."
        );

        return;
    }

    /*
     * Keep the existing BookIt namespace and event names for
     * compatibility while the visible product is rebranded.
     */
    window.BookIt =
        window.BookIt || {};

    const SHARED_SCRIPTS = [
        "../js/ui/header.js",
        "../js/ui/navigation.js"
    ];

    const PAGE_SCRIPTS = {
        home: [
            "../js/core/booking.js",
            "../js/core/weather.js",
            "../js/pages/home-page.js"
        ],

        book: [
            "../js/core/booking.js",
            "../js/pages/booking-page.js"
        ],

        booking: [
            "../js/core/booking.js",
            "../js/pages/booking-page.js"
        ],

        profile: [
            "../js/pages/profile-page.js"
        ],

        play: [
            "../js/pages/play-page.js"
        ],

        score: [
            "../js/pages/score-page.js"
        ],

        stableford: [
            "../js/stableford.js"
        ],

        strokeplay: [
            "../js/strokeplay.js"
        ],

        fourbbb: [
            "../js/fourbbb.js"
        ],

        greensomes: [
            "../js/greensomes.js"
        ],

        texasscramble: [
            "../js/texasscramble.js"
        ],

        matchplay: [
            "../js/matchplay.js"
        ],

        clubhub: [
            "../js/pages/clubhub-page.js"
        ]
    };

    const SPLASH_MINIMUM_MS =
        350;

    const SPLASH_REMOVE_DELAY_MS =
        320;

    let assetVersion = null;
    let initialisationStarted = false;
    let splashCreatedAt = 0;
    let splashElement = null;

    /* =========================================================
       SPLASH SCREEN
       ========================================================= */

    function createSplash() {
        if (
            splashElement ||
            !document.body
        ) {
            return;
        }

        splashCreatedAt =
            Date.now();

        splashElement =
            document.createElement(
                "div"
            );

        splashElement.id =
            "clubhubSplash";

        splashElement.className =
            "clubhub-splash";

        splashElement.setAttribute(
            "role",
            "status"
        );

        splashElement.setAttribute(
            "aria-label",
            "ClubHub is loading"
        );

        splashElement.innerHTML = `
            <div class="clubhub-splash__content">
                <div
                    class="clubhub-splash__mark"
                    aria-hidden="true"
                >
                    <svg viewBox="0 0 96 96">
                        <circle
                            class="clubhub-splash__mark-ring"
                            cx="48"
                            cy="48"
                            r="43"
                        />

                        <path
                            class="clubhub-splash__mark-land"
                            d="M16 67
                               C27 59, 34 61, 42 55
                               C52 47, 58 49, 67 39
                               C73 32, 79 31, 83 29"
                        />

                        <path
                            class="clubhub-splash__mark-land"
                            d="M22 73
                               C33 69, 42 70, 51 64
                               C62 57, 69 57, 78 50"
                        />

                        <path
                            class="clubhub-splash__mark-land"
                            d="M62 53V24"
                        />

                        <path
                            class="clubhub-splash__mark-flag"
                            d="M62 25L79 31L62 37Z"
                        />

                        <circle
                            cx="62"
                            cy="55"
                            r="3"
                        />
                    </svg>
                </div>

                <h1 class="clubhub-splash__title">
                    Club<span class="clubhub-splash__title-accent">Hub</span>
                </h1>

                <p class="clubhub-splash__tagline">
                    <span>Designed for the club.</span>
                    <span>Built for the golfer.</span>
                </p>
            </div>
        `;

        document.body.appendChild(
            splashElement
        );
    }

    function wait(milliseconds) {
        return new Promise(function (
            resolve
        ) {
            window.setTimeout(
                resolve,
                milliseconds
            );
        });
    }

    async function dismissSplash() {
        if (!splashElement) {
            return;
        }

        const elapsed =
            Date.now() -
            splashCreatedAt;

        const remaining =
            Math.max(
                SPLASH_MINIMUM_MS -
                    elapsed,
                0
            );

        if (remaining > 0) {
            await wait(remaining);
        }

        splashElement.classList.add(
            "clubhub-splash--leaving"
        );

        splashElement.setAttribute(
            "aria-hidden",
            "true"
        );

        const elementToRemove =
            splashElement;

        splashElement = null;

        window.setTimeout(
            function () {
                elementToRemove.remove();
            },
            SPLASH_REMOVE_DELAY_MS
        );
    }

    /* =========================================================
       PAGE AND SCRIPT RESOLUTION
       ========================================================= */

    function normalisePageName(value) {
        return String(value || "")
            .trim()
            .toLowerCase();
    }

    function getCurrentPageName() {
        return normalisePageName(
            document.body?.dataset.page
        );
    }

    function getLegacyRequestedScripts() {
        return String(
            loaderScript.dataset.scripts ||
            ""
        )
            .split(",")
            .map(function (value) {
                return value.trim();
            })
            .filter(Boolean);
    }

    function getPageScripts(pageName) {
        const mappedScripts =
            PAGE_SCRIPTS[pageName];

        if (Array.isArray(mappedScripts)) {
            return mappedScripts.slice();
        }

        const legacyScripts =
            getLegacyRequestedScripts();

        if (legacyScripts.length) {
            console.warn(
                `ClubHub has no smart-loader mapping for data-page="${pageName}". ` +
                "Using the page's legacy data-scripts list."
            );

            return legacyScripts;
        }

        throw new Error(
            `No protected-loader configuration exists for data-page="${pageName || "missing"}".`
        );
    }

    function removeDuplicateScripts(
        scripts
    ) {
        const seen =
            new Set();

        return scripts.filter(
            function (source) {
                const normalised =
                    String(source).trim();

                if (
                    !normalised ||
                    seen.has(normalised)
                ) {
                    return false;
                }

                seen.add(normalised);

                return true;
            }
        );
    }

    function getRequiredScripts() {
        const pageName =
            getCurrentPageName();

        const pageScripts =
            getPageScripts(pageName);

        return {
            pageName,

            scripts:
                removeDuplicateScripts([
                    ...SHARED_SCRIPTS,
                    ...pageScripts
                ])
        };
    }

    /* =========================================================
       ASSET VERSION
       ========================================================= */

    function getVersionManifestUrl() {
        return new URL(
            "../../json/app-version.json",
            loaderScript.src
        );
    }

    async function loadAssetVersion() {
        const versionUrl =
            getVersionManifestUrl();

        versionUrl.searchParams.set(
            "cacheBust",
            String(Date.now())
        );

        const response =
            await fetch(
                versionUrl.href,
                {
                    cache: "no-store",
                    credentials:
                        "same-origin"
                }
            );

        if (!response.ok) {
            throw new Error(
                `Could not load app-version.json (${response.status}).`
            );
        }

        const manifest =
            await response.json();

        const version =
            typeof manifest?.version ===
                "string"
                ? manifest.version.trim()
                : "";

        if (!version) {
            throw new Error(
                "app-version.json does not contain a valid version."
            );
        }

        return version;
    }

    function buildVersionedUrl(
        source,
        version
    ) {
        const url =
            new URL(
                source,
                document.baseURI
            );

        url.searchParams.set(
            "v",
            version
        );

        return url.href;
    }

    /* =========================================================
       SCRIPT LOADING
       ========================================================= */

    function findExistingScript(
        sourceUrl
    ) {
        return (
            Array.from(
                document.scripts
            ).find(function (script) {
                return (
                    script.src ===
                    sourceUrl
                );
            }) ||
            null
        );
    }

    function loadScript(
        source,
        version
    ) {
        return new Promise(function (
            resolve,
            reject
        ) {
            const sourceUrl =
                buildVersionedUrl(
                    source,
                    version
                );

            const existingScript =
                findExistingScript(
                    sourceUrl
                );

            if (existingScript) {
                if (
                    existingScript.dataset
                        .bookitLoaded ===
                    "true"
                ) {
                    resolve();
                    return;
                }

                existingScript.addEventListener(
                    "load",
                    resolve,
                    {
                        once: true
                    }
                );

                existingScript.addEventListener(
                    "error",
                    function () {
                        reject(
                            new Error(
                                `Could not load script: ${source}`
                            )
                        );
                    },
                    {
                        once: true
                    }
                );

                return;
            }

            const script =
                document.createElement(
                    "script"
                );

            script.src =
                sourceUrl;

            script.async =
                false;

            script.dataset.bookitLoadedBy =
                "protected-loader";

            script.addEventListener(
                "load",
                function () {
                    script.dataset.bookitLoaded =
                        "true";

                    resolve();
                },
                {
                    once: true
                }
            );

            script.addEventListener(
                "error",
                function () {
                    reject(
                        new Error(
                            `Could not load script: ${source}`
                        )
                    );
                },
                {
                    once: true
                }
            );

            document.head.appendChild(
                script
            );
        });
    }

    async function loadScriptsInOrder(
        scripts,
        version
    ) {
        for (const source of scripts) {
            await loadScript(
                source,
                version
            );
        }
    }

    async function waitForApplicationReady() {
        if (
            !window.BookIt.ready ||
            typeof window.BookIt.ready.then !==
                "function"
        ) {
            throw new Error(
                "ClubHub did not create an application-ready promise."
            );
        }

        return window.BookIt.ready;
    }

    /* =========================================================
       STARTUP STATE
       ========================================================= */

    function revealLoaderError(error) {
        console.error(
            "ClubHub protected loader failed:",
            error
        );

        document.documentElement
            .classList.add(
                "bookit-load-failed"
            );

        document.documentElement
            .classList.add(
                "auth-ready"
            );

        window.dispatchEvent(
            new CustomEvent(
                "bookit:loader-error",
                {
                    detail: {
                        message:
                            error?.message ||
                            "ClubHub could not start.",

                        error
                    }
                }
            )
        );

        dismissSplash();
    }

    function dispatchLoaded(
        pageName,
        scripts
    ) {
        window.dispatchEvent(
            new CustomEvent(
                "bookit:protected-scripts-loaded",
                {
                    detail: {
                        version:
                            assetVersion,

                        page:
                            pageName,

                        scripts:
                            scripts.slice()
                    }
                }
            )
        );
    }

    /* =========================================================
       INITIALISATION
       ========================================================= */

    async function initialise() {
        if (initialisationStarted) {
            return;
        }

        initialisationStarted =
            true;

        createSplash();

        try {
            const {
                pageName,
                scripts
            } = getRequiredScripts();

            assetVersion =
                await loadAssetVersion();

            window.BOOKIT_ASSET_VERSION =
                assetVersion;

            window.BookIt.assetVersion =
                assetVersion;

            window.BookIt.pageName =
                pageName;

            await loadScript(
                "../js/core/boot.js",
                assetVersion
            );

            await loadScriptsInOrder(
                scripts,
                assetVersion
            );

            dispatchLoaded(
                pageName,
                scripts
            );

            await waitForApplicationReady();

            await dismissSplash();
        } catch (error) {
            revealLoaderError(error);
        }
    }

    /*
     * A deferred script normally runs after the body has been
     * parsed. This fallback also supports accidental non-deferred
     * loading.
     */
    if (document.body) {
        initialise();
    } else {
        document.addEventListener(
            "DOMContentLoaded",
            initialise,
            {
                once: true
            }
        );
    }
})();