(function () {
    "use strict";

    const headerType = document.body.dataset.header || "standard";
    const headerTitle = document.body.dataset.title || "";
    const clubName =
        document.body.dataset.clubName ||
        "Bells Hotel & Country Club";

    function iconSvg(content) {
        return `
            <svg
                class="nav-icon"
                viewBox="0 0 24 24"
                aria-hidden="true"
            >
                ${content}
            </svg>
        `;
    }

    const icons = {
        back: iconSvg(`
            <path d="m15 18-6-6 6-6"></path>
        `),

        profile: iconSvg(`
            <circle cx="12" cy="8" r="4"></circle>
            <path d="M4 21a8 8 0 0 1 16 0"></path>
        `),

        bell: iconSvg(`
            <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"></path>
            <path d="M10 21h4"></path>
        `),

        chevronDown: iconSvg(`
            <path d="m8 10 4 4 4-4"></path>
        `)
    };

    function createStandardHeader(header) {
        header.innerHTML = `
            <a
                class="app-header__action"
                href="index.html"
                aria-label="Return home"
            >
                ${icons.back}
            </a>

            <h1 class="app-header__title">
                ${headerTitle}
            </h1>

            <a
                class="app-header__action"
                href="profile.html"
                aria-label="Open profile"
            >
                ${icons.profile}
            </a>
        `;
    }

    function createHomeHeader(header) {
        header.innerHTML = `
            <button
                class="app-header__action"
                type="button"
                aria-label="Open notifications"
            >
                ${icons.bell}
                <span class="notification-dot"></span>
            </button>

            <button
                class="app-header__club"
                type="button"
                aria-label="Change club"
            >
                <span class="app-header__club-name">
                    ${clubName}
                </span>

                <span class="app-header__club-chevron">
                    ${icons.chevronDown}
                </span>
            </button>

            <a
                class="app-header__action"
                href="profile.html"
                aria-label="Open profile"
            >
                ${icons.profile}
            </a>
        `;
    }

    function createHeader() {
        const header = document.querySelector("[data-app-header]");

        if (!header) {
            return;
        }

        header.className = "app-header";

        if (headerType === "home") {
            createHomeHeader(header);
        } else {
            createStandardHeader(header);
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", createHeader);
    } else {
        createHeader();
    }
})();