(function () {
    "use strict";

    const form = document.getElementById("loginForm");
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const passwordToggle = document.getElementById("passwordToggle");
    const loginButton = document.getElementById("loginButton");
    const message = document.getElementById("loginMessage");

    if (
        !form ||
        !emailInput ||
        !passwordInput ||
        !passwordToggle ||
        !loginButton ||
        !message
    ) {
        console.error("Login page elements are missing.");
        return;
    }

    function showMessage(text, type) {
        message.textContent = text;
        message.className = `auth-message auth-message--${type} is-visible`;
    }

    function clearMessage() {
        message.textContent = "";
        message.className = "auth-message";
    }

    function setLoading(isLoading) {
        loginButton.disabled = isLoading;
        loginButton.textContent = isLoading ? "Signing in…" : "Sign in";
    }

    function validateForm() {
        const email = emailInput.value.trim();
        const password = passwordInput.value;

        if (!email) {
            showMessage("Enter your email address.", "error");
            emailInput.focus();
            return false;
        }

        if (!emailInput.validity.valid) {
            showMessage("Enter a valid email address.", "error");
            emailInput.focus();
            return false;
        }

        if (!password) {
            showMessage("Enter your password.", "error");
            passwordInput.focus();
            return false;
        }
        const pageParams = new URLSearchParams(window.location.search);

if (pageParams.get("reason") === "timeout") {
    showMessage(
        "You were signed out after 30 minutes of inactivity.",
        "error"
    );
}
        return true;
    }

    passwordToggle.addEventListener("click", function () {
        const passwordIsVisible = passwordInput.type === "text";

        passwordInput.type = passwordIsVisible ? "password" : "text";
        passwordToggle.textContent = passwordIsVisible ? "Show" : "Hide";
        passwordToggle.setAttribute(
            "aria-pressed",
            String(!passwordIsVisible)
        );
    });

    form.addEventListener("submit", async function (event) {
        event.preventDefault();
        clearMessage();

        if (!validateForm()) {
            return;
        }

        if (!window.supabaseClient) {
            showMessage(
                "The sign-in service is unavailable. Please refresh and try again.",
                "error"
            );
            return;
        }

        setLoading(true);

        try {
            const email = emailInput.value.trim();
            const password = passwordInput.value;

            const { data, error } =
                await window.supabaseClient.auth.signInWithPassword({
                    email,
                    password
                });

            if (error) {
                throw error;
            }

            if (!data.session) {
                throw new Error("No active session was created.");
            }

            showMessage("Signed in successfully. Opening BookIt…", "success");

const params = new URLSearchParams(window.location.search);
const returnTo = params.get("returnTo");

window.setTimeout(function () {
    window.location.href = returnTo || "index.html";
}, 600);
        } catch (error) {
            console.error("BookIt login error:", error);

            showMessage(
                "The email address or password is incorrect.",
                "error"
            );
        } finally {
            setLoading(false);
        }
    });
})();
