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

        competitions: [
            "../js/competitions.js"
        ],

        admin: [
            "../js/pages/admin-page.js"
        ],

        clubhub: [
            "../js/pages/clubhub-page.js"
        ]
    };

    let assetVersion = null;
    let initialisationStarted = false;

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
            document.body
                ? document.body.dataset.page
                : ""
        );
    }

    function getLegacyRequestedScripts() {
        return String(
            loaderScript.dataset.scripts || ""
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
                "ClubHub has no smart-loader mapping for " +
                `data-page="${pageName}". ` +
                "Using the legacy data-scripts list."
            );

            return legacyScripts;
        }

        throw new Error(
            "No protected-loader configuration exists for " +
            `data-page="${pageName || "missing"}".`
        );
    }

    function removeDuplicateScripts(scripts) {
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
                removeDuplicateScripts(
                    SHARED_SCRIPTS.concat(
                        pageScripts
                    )
                )
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
                "Could not load app-version.json " +
                `(${response.status}).`
            );
        }

        const manifest =
            await response.json();

        const version =
            manifest &&
            typeof manifest.version ===
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

    function findExistingScript(sourceUrl) {
        return (
            Array.from(
                document.scripts
            ).find(
                function (script) {
                    return (
                        script.src ===
                        sourceUrl
                    );
                }
            ) || null
        );
    }

    function loadScript(
        source,
        version
    ) {
        return new Promise(
            function (
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
            }
        );
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
                            error &&
                            error.message
                                ? error.message
                                : "ClubHub could not start.",

                        error:
                            error
                    }
                }
            )
        );
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

        try {
            const requirements =
                getRequiredScripts();

            assetVersion =
                await loadAssetVersion();

            window.BOOKIT_ASSET_VERSION =
                assetVersion;

            window.BookIt =
                window.BookIt || {};

            window.BookIt.assetVersion =
                assetVersion;

            window.BookIt.pageName =
                requirements.pageName;

            await loadScript(
                "../js/core/boot.js",
                assetVersion
            );

            await loadScriptsInOrder(
                requirements.scripts,
                assetVersion
            );

            dispatchLoaded(
                requirements.pageName,
                requirements.scripts
            );
        } catch (error) {
            revealLoaderError(error);
        }
    }

    if (
        document.readyState ===
        "loading"
    ) {
        document.addEventListener(
            "DOMContentLoaded",
            initialise,
            {
                once: true
            }
        );
    } else {
        initialise();
    }
})();