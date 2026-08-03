(function () {
    "use strict";

    const loaderScript =
        document.currentScript;

    const requestedScripts = String(
        loaderScript?.dataset.scripts || ""
    )
        .split(",")
        .map(function (value) {
            return value.trim();
        })
        .filter(Boolean);

    function getVersionFileUrl() {
        return new URL(
            "../../app-version.json",
            loaderScript.src
        );
    }

    async function getAssetVersion() {
        const versionUrl =
            getVersionFileUrl();

        /*
         * Always request the version manifest from the
         * network rather than accepting a cached copy.
         */
        versionUrl.searchParams.set(
            "cacheBust",
            String(Date.now())
        );

        const response = await fetch(
            versionUrl.href,
            {
                cache: "no-store"
            }
        );

        if (!response.ok) {
            throw new Error(
                `Could not load the BookIt asset version: ${response.status}`
            );
        }

        const manifest =
            await response.json();

        if (
            !manifest ||
            typeof manifest.version !==
                "string" ||
            !manifest.version.trim()
        ) {
            throw new Error(
                "The BookIt asset version is invalid."
            );
        }

        return manifest.version.trim();
    }

    function buildVersionedUrl(
        source,
        version
    ) {
        const url = new URL(
            source,
            document.baseURI
        );

        url.searchParams.set(
            "v",
            version
        );

        return url.href;
    }

    function loadScript(
        source,
        version
    ) {
        return new Promise(function (
            resolve,
            reject
        ) {
            const script =
                document.createElement(
                    "script"
                );

            script.src =
                buildVersionedUrl(
                    source,
                    version
                );

            script.async = false;

            script.addEventListener(
                "load",
                function () {
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

    function showStartupError(error) {
        console.error(
            "BookIt protected loader failed:",
            error
        );

        document.documentElement.classList.add(
            "bookit-load-failed"
        );

        window.dispatchEvent(
            new CustomEvent(
                "bookit:loader-error",
                {
                    detail: {
                        message:
                            error?.message ||
                            "BookIt could not start.",
                        error
                    }
                }
            )
        );
    }

    async function initialise() {
        try {
            const version =
                await getAssetVersion();

            window.BOOKIT_ASSET_VERSION =
                version;

            /*
             * Boot always loads first.
             */
            await loadScript(
                "../js/core/boot.js",
                version
            );

            /*
             * Page-specific dependencies then load in the
             * order supplied by the HTML page.
             */
            for (
                const source of requestedScripts
            ) {
                await loadScript(
                    source,
                    version
                );
            }
        } catch (error) {
            showStartupError(error);
        }
    }

    initialise();
})();