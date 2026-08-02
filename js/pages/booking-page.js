(function () {
    "use strict";

    window.BookIt = window.BookIt || {};

    const teeSheetElement =
        document.getElementById("teeSheet");

    const dayNameElement =
        document.getElementById("dayName");

    const dateTextElement =
        document.getElementById("dateText");

    const dateDisplayButton =
        document.getElementById("dateDisplay");

    const datePicker =
        document.getElementById("bookingDatePicker");

    const previousDayButton =
        document.getElementById("prevDay");

    const nextDayButton =
        document.getElementById("nextDay");

    const availableCountElement =
        document.getElementById("availableCount");

    const joinableCountElement =
        document.getElementById("joinableCount");

    const bookedCountElement =
        document.getElementById("bookedCount");

    const filterButtons = Array.from(
        document.querySelectorAll("[data-filter]")
    );

    /*
     * Temporary test date because this is currently the date
     * containing the generated 95-row tee sheet.
     *
     * This will later return to today's date once tee sheets
     * are generated automatically.
     */
    let selectedDate = new Date();

    let currentTeeTimes = [];
    let activeFilter = "all";

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

    function createLocalDate(dateKey) {
        return new Date(`${dateKey}T00:00:00`);
    }

    function isToday(date) {
        const today = new Date();

        return (
            date.getFullYear() === today.getFullYear() &&
            date.getMonth() === today.getMonth() &&
            date.getDate() === today.getDate()
        );
    }

    function updateDateDisplay() {
        dayNameElement.textContent =
            isToday(selectedDate)
                ? "Today"
                : new Intl.DateTimeFormat(
                    "en-GB",
                    {
                        weekday: "long"
                    }
                ).format(selectedDate);

        dateTextElement.textContent =
            new Intl.DateTimeFormat(
                "en-GB",
                {
                    day: "numeric",
                    month: "long",
                    year: "numeric"
                }
            ).format(selectedDate);

        if (datePicker) {
            datePicker.value =
                toDateKey(selectedDate);
        }
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

    function getCardClass(teeTime) {
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

        return `
            <article
                class="tee-time-card ${getCardClass(teeTime)}"
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

    function matchesFilter(teeTime) {
        if (activeFilter === "available") {
            return (
                teeTime.action === "book" &&
                !teeTime.booking
            );
        }

        if (activeFilter === "joinable") {
            return teeTime.action === "join";
        }

        return true;
    }

    function renderCurrentTeeSheet() {
        const filteredTeeTimes =
            currentTeeTimes.filter(matchesFilter);

        if (!filteredTeeTimes.length) {
            teeSheetElement.innerHTML = `
                <p class="tee-sheet-message">
                    No tee times match this filter.
                </p>
            `;

            return;
        }

        teeSheetElement.innerHTML =
            filteredTeeTimes
                .map(renderTeeTime)
                .join("");
    }

    function updateSummary() {
        const availableCount =
            currentTeeTimes.filter(function (teeTime) {
                return (
                    teeTime.action === "book" &&
                    !teeTime.booking
                );
            }).length;

        const joinableCount =
            currentTeeTimes.filter(function (teeTime) {
                return teeTime.action === "join";
            }).length;

        const bookedCount =
            currentTeeTimes.filter(function (teeTime) {
                return (
                    teeTime.booking !== null ||
                    teeTime.spacesRemaining === 0
                );
            }).length;

        availableCountElement.textContent =
            String(availableCount);

        joinableCountElement.textContent =
            String(joinableCount);

        bookedCountElement.textContent =
            String(bookedCount);
    }

    function showLoading() {
        teeSheetElement.setAttribute(
            "aria-busy",
            "true"
        );

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
            <div
                class="tee-sheet-message
                       tee-sheet-message--error"
            >
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
        updateDateDisplay();

        try {
            currentTeeTimes =
                await window.BookIt.booking.getDay(
                    toDateKey(selectedDate),
                    {
                        forceRefresh
                    }
                );

            teeSheetElement.setAttribute(
                "aria-busy",
                "false"
            );

            updateSummary();

            if (!currentTeeTimes.length) {
                showEmpty();
                return;
            }

            renderCurrentTeeSheet();
        } catch (error) {
            teeSheetElement.setAttribute(
                "aria-busy",
                "false"
            );

            showError(error);
        }
    }

    function changeSelectedDate(numberOfDays) {
        const nextDate =
            new Date(selectedDate);

        nextDate.setDate(
            nextDate.getDate() + numberOfDays
        );

        selectedDate = nextDate;

        loadTeeSheet(true);
    }

    function setFilter(filter) {
        activeFilter = filter;

        filterButtons.forEach(function (button) {
            const isActive =
                button.dataset.filter === filter;

            button.classList.toggle(
                "active",
                isActive
            );

            button.setAttribute(
                "aria-pressed",
                String(isActive)
            );
        });

        renderCurrentTeeSheet();
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

        window.alert(
            `${
                action === "join"
                    ? "Join"
                    : "Book"
            } tee time ${teeTimeId}`
        );
    }

    async function initialiseBookingPage() {
        const requiredElements = [
            teeSheetElement,
            dayNameElement,
            dateTextElement,
            previousDayButton,
            nextDayButton,
            availableCountElement,
            joinableCountElement,
            bookedCountElement
        ];

        if (
            requiredElements.some(function (element) {
                return !element;
            })
        ) {
            console.error(
                "One or more booking-page elements are missing."
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

            previousDayButton.addEventListener(
                "click",
                function () {
                    changeSelectedDate(-1);
                }
            );

            nextDayButton.addEventListener(
                "click",
                function () {
                    changeSelectedDate(1);
                }
            );

            dateDisplayButton?.addEventListener(
                "click",
                function () {
                    if (datePicker?.showPicker) {
                        datePicker.showPicker();
                    } else {
                        datePicker?.click();
                    }
                }
            );

            datePicker?.addEventListener(
                "change",
                function () {
                    if (!datePicker.value) {
                        return;
                    }

                    selectedDate =
                        createLocalDate(
                            datePicker.value
                        );

                    loadTeeSheet(true);
                }
            );

            filterButtons.forEach(function (button) {
                button.addEventListener(
                    "click",
                    function () {
                        setFilter(
                            button.dataset.filter
                        );
                    }
                );
            });

            teeSheetElement.addEventListener(
                "click",
                handleTeeSheetClick
            );

            await loadTeeSheet(true);
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