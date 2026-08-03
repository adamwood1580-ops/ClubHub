(function () {
    "use strict";

    const loaderScript =
        document.currentScript;

    if (!loaderScript) {
        console.error(
            "BookIt protected loader could not identify its script element."
        );

        return;
    }

    const requestedScripts = String(
        loaderScript.dataset.scripts || ""
    )
        .split(",")
        .map(function (value) {
            return value.trim();
        })
        .filter(Boolean);

    function getVersionManifestUrl() {
        return new URL(
            "../../app-version.json",
            loaderScript.src
        );
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

    async function loadAssetVersion() {
        const versionUrl =
            getVersionManifestUrl();

        versionUrl.searchParams.set(
            "cacheBust",
            String(Date.now())
        );

        const response = await fetch(
            versionUrl.href,
            {
                cache: "no-store",
                credentials: "same-origin"
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
            typeof manifest?.version === "string"
                ? manifest.version.trim()
                : "";

        if (!version) {
            throw new Error(
                "app-version.json does not contain a valid version."
            );
        }

        return version;
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

            script.dataset.bookitLoadedBy =
                "protected-loader";

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
                await loadAssetVersion();

            window.BOOKIT_ASSET_VERSION =
                version;

            /*
             * Boot must load first because it creates:
             *
             * window.BookIt.ready
             * window.supabaseClient
             * window.BookIt.currentProfile
             */
            await loadScript(
                "../js/core/boot.js",
                version
            );

            /*
             * Page dependencies are then loaded in the exact
             * order supplied by the page's data-scripts value.
             */
            for (
                const source of requestedScripts
            ) {
                await loadScript(
                    source,
                    version
                );
            }

            window.dispatchEvent(
                new CustomEvent(
                    "bookit:protected-scripts-loaded",
                    {
                        detail: {
                            version,
                            scripts:
                                requestedScripts.slice()
                        }
                    }
                )
            );
        } catch (error) {
            showStartupError(error);
        }
    }

    initialise();
})();