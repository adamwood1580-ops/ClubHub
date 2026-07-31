(function () {
    "use strict";

    const currentPage = document.body.dataset.page || "";

    const navItems = [
        {
            page: "home",
            href: "index.html",
            label: "Home",
            icon: `
                <path d="m3 11 9-8 9 8"></path>
                <path d="M5 10v11h14V10"></path>
                <path d="M9 21v-7h6v7"></path>
            `
        },
        {
            page: "book",
            href: "booking.html",
            label: "Book",
            icon: `
                <rect x="3" y="5" width="18" height="16" rx="2"></rect>
                <path d="M16 3v4M8 3v4M3 10h18"></path>
            `
        },
        {
            page: "play",
            href: "score.html",
            label: "Play",
            icon: `
                <path d="M8 21h8"></path>
                <path d="M12 17v4"></path>
                <path d="M7 4h10v4a5 5 0 0 1-10 0V4Z"></path>
                <path d="M7 6H4a3 3 0 0 0 3 3M17 6h3a3 3 0 0 1-3 3"></path>
            `
        },
        {
            page: "profile",
            href: "profile.html",
            label: "Profile",
            icon: `
                <circle cx="12" cy="8" r="4"></circle>
                <path d="M4 21a8 8 0 0 1 16 0"></path>
            `
        }
    ];

    function createNavigation() {
        const nav = document.querySelector("[data-bottom-nav]");

        if (!nav) {
            return;
        }

        nav.className = "bottom-nav";
        nav.setAttribute("aria-label", "Primary navigation");

        nav.innerHTML = navItems
            .map((item) => {
                const isCurrent = item.page === currentPage;

                return `
                    <a
                        class="bottom-nav__item"
                        href="${item.href}"
                        ${isCurrent ? 'aria-current="page"' : ""}
                    >
                        <svg
                            class="bottom-nav__icon nav-icon"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                        >
                            ${item.icon}
                        </svg>

                        <span class="bottom-nav__label">
                            ${item.label}
                        </span>
                    </a>
                `;
            })
            .join("");
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", createNavigation);
    } else {
        createNavigation();
    }
})();
