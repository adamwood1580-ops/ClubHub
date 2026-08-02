(function () {
    "use strict";

    window.BookIt = window.BookIt || {};

    const teeSheetElement =
        document.getElementById("teeSheet");

    const selectedDateElement =
        document.getElementById("selectedDate");

    let selectedDate = new Date("2026-08-03T00:00:00");

     function escapeHtml(value) {
        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function toDateKey(date) {
        const year = date.getFullYear();

        const month = String(
            date.getMonth() + 1
        ).padStart(2, "0");

        const day = String(
            date.getDate()
        ).padStart(2, "0");

        return `${year}-${month}-${day}`;
    }

    function formatDisplayDate(date) {
        return new Intl.DateTimeFormat(
            "en-GB",
            {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric"
            }
        ).format(date);
    }

    function getButtonLabel(teeTime) {
        if (teeTime.action === "book") {
            return "Book Now";
        }

        if (teeTime.action === "join") {
            return "Join";
        }

        return teeTime.displayStatus;
    }

    function getStatusClass(teeTime) {
        if (
            teeTime.operationalStatus !== "open"
        ) {
            return "tee-time-card--unavailable";
        }

        if (teeTime.spacesRemaining === 0) {
            return "tee-time-card--full";
        }

        if (teeTime.booking) {
            return "tee-time-card--joinable";
        }

        return "tee-time-card--available";
    }

    function renderTeeTime(teeTime) {
        const isDisabled =
            teeTime.action === "none";

        const statusClass =
            getStatusClass(teeTime);

        return `
            <article
                class="tee-time-card ${statusClass}"
                data-tee-time-id="${escapeHtml(teeTime.id)}"
            >
                <div class="tee-time-card__time">
                    ${escapeHtml(teeTime.time)}
                </div>

                <div class="tee-time-card__details">
                    <p class="tee-time-card__status">
                        ${escapeHtml(teeTime.displayStatus)}
                    </p>

                    <p class="tee-time-card__spaces">
                        ${teeTime.occupied}/${teeTime.maxPlayers}
                        players
                    </p>
                </div>

                <button
                    type="button"
                    class="button button--primary tee-time-card__action"
                    data-booking-action="${escapeHtml(teeTime.action)}"
                    data-tee-time-id="${escapeHtml(teeTime.id)}"
                    ${isDisabled ? "disabled" : ""}
                >
                    ${escapeHtml(getButtonLabel(teeTime))}
                </button>
            </article>
        `;
    }

    function showLoading() {
        teeSheetElement.innerHTML = `
            <p class="tee-sheet-message">
                Loading tee times...
            </p>
        `;
    }

    function showEmpty() {
        teeSheetElement.innerHTML = `
            <p class="tee-sheet-message">
                No tee times are available for this date.
            </p>
        `;
    }

    function showError(error) {
        console.error(
            "BookIt booking page failed:",
            error
        );

        teeSheetElement.innerHTML = `
            <div class="tee-sheet-message tee-sheet-message--error">
                <p>
                    We could not load the tee sheet.
                </p>

                <button
                    type="button"
                    id="retryTeeSheet"
                    class="button button--secondary"
                >
                    Try again
                </button>
            </div>
        `;

        document
            .getElementById("retryTeeSheet")
            ?.addEventListener(
                "click",
                function () {
                    loadTeeSheet(true);
                }
            );
    }

    async function loadTeeSheet(
        forceRefresh = false
    ) {
        showLoading();

        selectedDateElement.textContent =
            formatDisplayDate(selectedDate);

        try {
            const teeTimes =
                await window.BookIt.booking.getDay(
                    toDateKey(selectedDate),
                    {
                        forceRefresh
                    }
                );

            if (!teeTimes.length) {
                showEmpty();
                return;
            }

            teeSheetElement.innerHTML =
                teeTimes
                    .map(renderTeeTime)
                    .join("");
        } catch (error) {
            showError(error);
        }
    }

    function handleTeeSheetClick(event) {
        const button = event.target.closest(
            "[data-booking-action]"
        );

        if (!button || button.disabled) {
            return;
        }

        const action =
            button.dataset.bookingAction;

        const teeTimeId =
            button.dataset.teeTimeId;

        /*
         * Booking and joining will be connected next.
         */
        window.alert(
            `${action === "join" ? "Join" : "Book"} tee time ${teeTimeId}`
        );
    }

    async function initialiseBookingPage() {
        if (
            !teeSheetElement ||
            !selectedDateElement
        ) {
            console.error(
                "Booking page elements are missing."
            );

            return;
        }

        try {
            await window.BookIt.ready;

            if (
                !window.BookIt.booking ||
                typeof window.BookIt.booking.getDay !==
                    "function"
            ) {
                throw new Error(
                    "The booking service is unavailable."
                );
            }

            teeSheetElement.addEventListener(
                "click",
                handleTeeSheetClick
            );

            await loadTeeSheet();
        } catch (error) {
            showError(error);
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            initialiseBookingPage,
            {
                once: true
            }
        );
    } else {
        initialiseBookingPage();
    }
})();