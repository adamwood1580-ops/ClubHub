(function () {
    "use strict";

    function addDiagnosticPanel() {
        const panel = document.createElement("div");
        panel.id = "diagnostic-panel";

        panel.innerHTML = `
            <div class="diagnostic-header">
                <strong>BookIt Diagnostics</strong>
                <button id="diagnostic-close" type="button">×</button>
            </div>

            <div id="diagnostic-results">
                <div id="diag-library">⏳ Supabase library: Checking</div>
                <div id="diag-config">⏳ Configuration: Checking</div>
                <div id="diag-client">⏳ Supabase client: Checking</div>
                <div id="diag-connection">⏳ Cloud connection: Checking</div>
                <div id="diag-error">Last error: None</div>
            </div>
        `;

        panel.style.cssText = `
            position: fixed;
            left: 10px;
            right: 10px;
            bottom: 10px;
            z-index: 99999;
            max-width: 500px;
            margin: 0 auto;
            padding: 12px;
            border: 2px solid #333;
            border-radius: 10px;
            background: rgba(255, 255, 255, 0.97);
            color: #111;
            font-family: Arial, sans-serif;
            font-size: 14px;
            line-height: 1.7;
            box-shadow: 0 4px 18px rgba(0, 0, 0, 0.3);
        `;

        document.body.appendChild(panel);

        const header = panel.querySelector(".diagnostic-header");

        header.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 6px;
        `;

        const closeButton = document.getElementById("diagnostic-close");

        closeButton.style.cssText = `
            width: 30px;
            height: 30px;
            border: none;
            border-radius: 50%;
            background: #ddd;
            color: #111;
            font-size: 20px;
            line-height: 1;
        `;

        closeButton.addEventListener("click", function () {
            panel.remove();
        });

        runDiagnostics();
    }

    function setResult(id, passed, message) {
        const element = document.getElementById(id);

        if (!element) {
            return;
        }

        element.textContent = `${passed ? "✅" : "❌"} ${message}`;
    }

    function setError(error) {
        const element = document.getElementById("diag-error");

        if (!element) {
            return;
        }

        const message =
            error instanceof Error
                ? error.message
                : String(error || "Unknown error");

        element.textContent = `❌ Last error: ${message}`;
    }

    async function runDiagnostics() {
        try {
            const libraryLoaded =
                typeof window.supabase !== "undefined" &&
                typeof window.supabase.createClient === "function";

            setResult(
                "diag-library",
                libraryLoaded,
                libraryLoaded
                    ? "Supabase library: Loaded"
                    : "Supabase library: Not loaded"
            );

            const configLoaded =
                typeof CONFIG !== "undefined" &&
                typeof CONFIG.SUPABASE_URL === "string" &&
                CONFIG.SUPABASE_URL.startsWith("https://") &&
                typeof CONFIG.SUPABASE_ANON_KEY === "string" &&
                CONFIG.SUPABASE_ANON_KEY.length > 20;

            setResult(
                "diag-config",
                configLoaded,
                configLoaded
                    ? "Configuration: Loaded"
                    : "Configuration: Missing or incomplete"
            );

            const clientCreated =
    typeof window.supabaseClient !== "undefined" &&
    window.supabaseClient !== null &&
    window.supabaseClient.auth &&
    typeof window.supabaseClient.auth.getSession === "function";
            setResult(
                "diag-client",
                clientCreated,
                clientCreated
                    ? "Supabase client: Created"
                    : "Supabase client: Not created"
            );

            if (!libraryLoaded || !configLoaded || !clientCreated) {
                setResult(
                    "diag-connection",
                    false,
                    "Cloud connection: Not tested"
                );

                return;
            }

            const { error } =
    await window.supabaseClient.auth.getSession();

            if (error) {
                throw error;
            }

            setResult(
                "diag-connection",
                true,
                "Cloud connection: Successful"
            );
        } catch (error) {
            setResult(
                "diag-connection",
                false,
                "Cloud connection: Failed"
            );

            setError(error);
            console.error("BookIt diagnostic error:", error);
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", addDiagnosticPanel);
    } else {
        addDiagnosticPanel();
    }
})();