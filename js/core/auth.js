(function () {
    "use strict";

    const LOGIN_PAGE = "login.html";

    function redirectToLogin() {
        const currentPage =
            window.location.pathname.split("/").pop() || "index.html";

        const returnTo = encodeURIComponent(
            `${currentPage}${window.location.search}`
        );

        window.location.replace(
            `${LOGIN_PAGE}?returnTo=${returnTo}`
        );
    }

    async function protectPage() {
        if (!window.supabaseClient) {
            console.error("Supabase client is unavailable.");
            redirectToLogin();
            return;
        }

        try {
            const {
                data: { session },
                error
            } = await window.supabaseClient.auth.getSession();

            if (error) {
                throw error;
            }

            if (!session) {
                redirectToLogin();
                return;
            }

            document.documentElement.classList.add("auth-ready");

            window.bookitSession = session;
            window.bookitUser = session.user;
        } catch (error) {
            console.error("BookIt authentication check failed:", error);
            redirectToLogin();
        }
    }

    protectPage();
})();