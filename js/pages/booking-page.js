(function () {
    "use strict";

    window.BookIt = window.BookIt || {};

    /* =========================================================
       ELEMENTS
       ========================================================= */

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

    const bookingModal =
        document.getElementById("bookingModal");

    const closeModalButton =
        document.getElementById("closeModal");

    const modalTitle =
        document.getElementById("modalTitle");

    const modalTime =
        document.getElementById("modalTime");

    const leadNameInput =
        document.getElementById("leadName");

    const contactNumberInput =
        document.getElementById("contactNumber");

    const playerCountSelect =
        document.getElementById("playerCount");

    const playerNamesElement =
        document.getElementById("playerNames");

    const confirmBookingButton =
        document.getElementById("confirmBooking");

    /* =========================================================
       STATE
       ========================================================= */

    let selectedDate = new Date();
    let currentTeeTimes = [];
    let activeFilter = "all";
    let selectedTeeTime = null;

    let bookingSubmissionInProgress = false;
    let pageInitialised = false;

    /* =========================================================
       HELPERS
       ========================================================= */

    function escapeHtml(value) {
        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function toDateKey(date) {
        const year =
            date.getFullYear();

        const month = String(
            date.getMonth() + 1
        ).padStart(2, "0");

        const day = String(
            date.getDate()
        ).padStart(2, "0");

        return `${year}-${month}-${day}`;
    }

    function createLocalDate(dateKey) {
        return new Date(
            `${dateKey}T00:00:00`
        );
    }

    function formatShortDate(date) {
        return new Intl.DateTimeFormat(
            "en-GB",
            {
                day: "numeric",
                month: "long",
                year: "numeric"
            }
        ).format(date);
    }

    function formatLongDate(date) {
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

    function isToday(date) {
        const today = new Date();

        return (
            date.getFullYear() ===
                today.getFullYear() &&
            date.getMonth() ===
                today.getMonth() &&
            date.getDate() ===
                today.getDate()
        );
    }

    function getCurrentProfile() {
        return (
            window.BookIt.currentProfile ||
            null
        );
    }

    function getMemberName() {
        const profile =
            getCurrentProfile();

        const fullName = [
            profile?.firstName,
            profile?.lastName
        ]
            .filter(Boolean)
            .join(" ")
            .trim();

        return (
            profile?.displayName ||
            fullName ||
            "Member"
        );
    }

    function getReadableError(error) {
        if (!error) {
            return "An unknown error occurred.";
        }

        if (
            typeof error.message === "string"
        ) {
            return error.message;
        }

        if (
            error.message &&
            typeof error.message.message ===
                "string"
        ) {
            return error.message.message;
        }

        if (
            typeof error.details === "string"
        ) {
            return error.details;
        }

        return String(error);
    }

    function getBookingService() {
        return (
            window.BookIt?.booking ||
            null
        );
    }

    /* =========================================================
       DATE DISPLAY
       ========================================================= */

    function updateDateDisplay() {
        if (
            !dayNameElement ||
            !dateTextElement
        ) {
            return;
        }

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
            formatShortDate(selectedDate);

        if (datePicker) {
            datePicker.value =
                toDateKey(selectedDate);
        }
    }

    /* =========================================================
       CARD RENDERING
       ========================================================= */

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
            teeTime.operationalStatus !==
            "open"
        ) {
            return (
                "tee-time-card--unavailable"
            );
        }

        if (
            teeTime.spacesRemaining <= 0
        ) {
            return "tee-time-card--full";
        }

        if (teeTime.booking) {
            return (
                "tee-time-card--joinable"
            );
        }

        return (
            "tee-time-card--available"
        );
    }

    function renderTeeTime(teeTime) {
        const disabled =
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
                    ${disabled ? "disabled" : ""}
                >
                    ${escapeHtml(getButtonLabel(teeTime))}
                </button>
            </article>
        `;
    }

    function matchesFilter(teeTime) {
        if (
            activeFilter === "available"
        ) {
            return (
                teeTime.action === "book" &&
                !teeTime.booking
            );
        }

        if (
            activeFilter === "joinable"
        ) {
            return (
                teeTime.action === "join"
            );
        }

        return true;
    }

    function renderCurrentTeeSheet() {
        if (!teeSheetElement) {
            return;
        }

        const filtered =
            currentTeeTimes.filter(
                matchesFilter
            );

        if (!filtered.length) {
            teeSheetElement.innerHTML = `
                <p class="tee-sheet-message">
                    No tee times match this filter.
                </p>
            `;

            return;
        }

        teeSheetElement.innerHTML =
            filtered
                .map(renderTeeTime)
                .join("");
    }

    /* =========================================================
       SUMMARY
       ========================================================= */

    function resetSummary() {
        if (availableCountElement) {
            availableCountElement.textContent =
                "0";
        }

        if (joinableCountElement) {
            joinableCountElement.textContent =
                "0";
        }

        if (bookedCountElement) {
            bookedCountElement.textContent =
                "0";
        }
    }

    function updateSummary() {
        const available =
            currentTeeTimes.filter(
                function (teeTime) {
                    return (
                        teeTime.action ===
                            "book" &&
                        !teeTime.booking
                    );
                }
            ).length;

        const joinable =
            currentTeeTimes.filter(
                function (teeTime) {
                    return (
                        teeTime.action ===
                        "join"
                    );
                }
            ).length;

        const booked =
            currentTeeTimes.filter(
                function (teeTime) {
                    return (
                        teeTime.booking !==
                            null ||
                        teeTime.spacesRemaining <=
                            0
                    );
                }
            ).length;

        if (availableCountElement) {
            availableCountElement.textContent =
                String(available);
        }

        if (joinableCountElement) {
            joinableCountElement.textContent =
                String(joinable);
        }

        if (bookedCountElement) {
            bookedCountElement.textContent =
                String(booked);
        }
    }

    /* =========================================================
       PAGE MESSAGES
       ========================================================= */

    function showLoading() {
        if (!teeSheetElement) {
            return;
        }

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
        if (!teeSheetElement) {
            return;
        }

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

        if (!teeSheetElement) {
            return;
        }

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
            .getElementById(
                "retryTeeSheet"
            )
            ?.addEventListener(
                "click",
                function () {
                    loadTeeSheet(true);
                },
                {
                    once: true
                }
            );
    }

    /* =========================================================
       TEE-SHEET LOADING
       ========================================================= */

    async function loadTeeSheet(
        forceRefresh = false
    ) {
        updateDateDisplay();
        showLoading();

        const bookingService =
            getBookingService();

        if (
            !bookingService ||
            typeof bookingService.getDay !==
                "function"
        ) {
            showError(
                new Error(
                    "The booking service is unavailable. Refresh the page and try again."
                )
            );

            return;
        }

        try {
            currentTeeTimes =
                await bookingService.getDay(
                    toDateKey(selectedDate),
                    {
                        forceRefresh
                    }
                );

            teeSheetElement?.setAttribute(
                "aria-busy",
                "false"
            );

            updateSummary();

            if (
                !currentTeeTimes.length
            ) {
                showEmpty();
                return;
            }

            renderCurrentTeeSheet();
        } catch (error) {
            teeSheetElement?.setAttribute(
                "aria-busy",
                "false"
            );

            currentTeeTimes = [];
            resetSummary();
            showError(error);
        }
    }

    /* =========================================================
       DATE NAVIGATION
       ========================================================= */

    function changeSelectedDate(
        numberOfDays
    ) {
        const nextDate =
            new Date(selectedDate);

        nextDate.setDate(
            nextDate.getDate() +
                numberOfDays
        );

        selectedDate = nextDate;

        loadTeeSheet(true);
    }

    function openDatePicker() {
        if (!datePicker) {
            return;
        }

        if (
            typeof datePicker.showPicker ===
            "function"
        ) {
            datePicker.showPicker();
            return;
        }

        datePicker.click();
    }

    function handleDatePickerChange() {
        if (!datePicker?.value) {
            return;
        }

        selectedDate =
            createLocalDate(
                datePicker.value
            );

        loadTeeSheet(true);
    }

    /* =========================================================
       FILTERS
       ========================================================= */

    function setFilter(filter) {
        activeFilter =
            filter || "all";

        filterButtons.forEach(
            function (button) {
                const active =
                    button.dataset.filter ===
                    activeFilter;

                button.classList.toggle(
                    "active",
                    active
                );

                button.setAttribute(
                    "aria-pressed",
                    String(active)
                );
            }
        );

        renderCurrentTeeSheet();
    }

    /* =========================================================
       MODAL
       ========================================================= */

    function getSelectedBookingType() {
        return (
            document.querySelector(
                'input[name="bookingType"]:checked'
            )?.value ||
            "joinable"
        );
    }

    function resetBookingModal() {
        const profile =
            getCurrentProfile();

        if (leadNameInput) {
            leadNameInput.value =
                getMemberName();

            leadNameInput.readOnly =
                true;
        }

        if (contactNumberInput) {
            contactNumberInput.value =
                profile?.phone || "";
        }

        if (playerCountSelect) {
            playerCountSelect.value =
                "1";

            playerCountSelect.disabled =
                true;
        }

        if (playerNamesElement) {
            playerNamesElement.innerHTML =
                "";

            playerNamesElement.hidden =
                true;
        }

        document
            .querySelectorAll(
                'input[name="bookingType"]'
            )
            .forEach(
                function (radio) {
                    radio.checked =
                        radio.value ===
                        "joinable";
                }
            );

        if (confirmBookingButton) {
            confirmBookingButton.disabled =
                false;

            confirmBookingButton.textContent =
                "Confirm Booking";
        }
    }

    function openBookingModal(
        teeTime
    ) {
        if (!bookingModal) {
            window.alert(
                "The booking form is unavailable."
            );

            return;
        }

        selectedTeeTime = teeTime;

        resetBookingModal();

        if (modalTitle) {
            modalTitle.textContent =
                "Book Tee Time";
        }

        if (modalTime) {
            modalTime.textContent =
                `${formatLongDate(selectedDate)} at ${teeTime.time}`;
        }

        bookingModal.classList.remove(
            "hidden"
        );

        bookingModal.setAttribute(
            "aria-hidden",
            "false"
        );

        document.body.classList.add(
            "modal-open"
        );

        window.setTimeout(
            function () {
                contactNumberInput?.focus();
            },
            100
        );
    }

    function closeBookingModal() {
        if (
            !bookingModal ||
            bookingSubmissionInProgress
        ) {
            return;
        }

        bookingModal.classList.add(
            "hidden"
        );

        bookingModal.setAttribute(
            "aria-hidden",
            "true"
        );

        document.body.classList.remove(
            "modal-open"
        );

        selectedTeeTime = null;
    }

    /* =========================================================
       CREATE BOOKING
       ========================================================= */

    async function submitBooking() {
        if (
            bookingSubmissionInProgress ||
            !selectedTeeTime
        ) {
            return;
        }

        const bookingService =
            getBookingService();

        if (
            !bookingService ||
            typeof bookingService.createBooking !==
                "function"
        ) {
            window.alert(
                "Booking creation is temporarily unavailable. Refresh the page and try again."
            );

            return;
        }

        bookingSubmissionInProgress =
            true;

        if (confirmBookingButton) {
            confirmBookingButton.disabled =
                true;

            confirmBookingButton.textContent =
                "Creating booking...";
        }

        try {
            const result =
                await bookingService.createBooking({
                    teeTimeId:
                        selectedTeeTime.id,

                    bookingType:
                        getSelectedBookingType(),

                    contactNumber:
                        contactNumberInput?.value ||
                        null,

                    notes:
                        null
                });

            bookingModal?.classList.add(
                "hidden"
            );

            bookingModal?.setAttribute(
                "aria-hidden",
                "true"
            );

            document.body.classList.remove(
                "modal-open"
            );

            selectedTeeTime = null;

            await loadTeeSheet(true);

            const resultDate =
                createLocalDate(
                    result.playDate
                );

            window.alert(
                `Booking confirmed for ${result.time} on ${formatShortDate(resultDate)}.`
            );
        } catch (error) {
            console.error(
                "BookIt could not create the booking:",
                error
            );

            window.alert(
                getReadableError(error) ||
                "The booking could not be created."
            );
        } finally {
            bookingSubmissionInProgress =
                false;

            if (confirmBookingButton) {
                confirmBookingButton.disabled =
                    false;

                confirmBookingButton.textContent =
                    "Confirm Booking";
            }
        }
    }

    /* =========================================================
       TEE-SHEET CLICK HANDLING
       ========================================================= */

    function handleTeeSheetClick(
        event
    ) {
        const button =
            event.target.closest(
                "[data-booking-action]"
            );

        if (
            !button ||
            button.disabled
        ) {
            return;
        }

        const action =
            button.dataset.bookingAction;

        const teeTimeId =
            button.dataset.teeTimeId;

        const teeTime =
            currentTeeTimes.find(
                function (item) {
                    return (
                        item.id ===
                        teeTimeId
                    );
                }
            );

        if (!teeTime) {
            window.alert(
                "The selected tee time could not be found."
            );

            return;
        }

        if (action === "book") {
            openBookingModal(teeTime);
            return;
        }

        if (action === "join") {
            window.alert(
                `Joining the ${teeTime.time} booking will be added next.`
            );
        }
    }

    /* =========================================================
       EVENTS
       ========================================================= */

    function attachEventListeners() {
        previousDayButton?.addEventListener(
            "click",
            function () {
                changeSelectedDate(-1);
            }
        );

        nextDayButton?.addEventListener(
            "click",
            function () {
                changeSelectedDate(1);
            }
        );

        dateDisplayButton?.addEventListener(
            "click",
            openDatePicker
        );

        datePicker?.addEventListener(
            "change",
            handleDatePickerChange
        );

        filterButtons.forEach(
            function (button) {
                button.addEventListener(
                    "click",
                    function () {
                        setFilter(
                            button.dataset.filter
                        );
                    }
                );
            }
        );

        teeSheetElement?.addEventListener(
            "click",
            handleTeeSheetClick
        );

        closeModalButton?.addEventListener(
            "click",
            closeBookingModal
        );

        confirmBookingButton?.addEventListener(
            "click",
            submitBooking
        );

        bookingModal?.addEventListener(
            "click",
            function (event) {
                if (
                    event.target ===
                    bookingModal
                ) {
                    closeBookingModal();
                }
            }
        );

        document.addEventListener(
            "keydown",
            function (event) {
                if (
                    event.key === "Escape" &&
                    bookingModal &&
                    !bookingModal.classList.contains(
                        "hidden"
                    )
                ) {
                    closeBookingModal();
                }
            }
        );
    }

    /* =========================================================
       INITIALISATION
       ========================================================= */

    async function initialiseBookingPage() {
        if (pageInitialised) {
            return;
        }

        pageInitialised = true;

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
            requiredElements.some(
                function (element) {
                    return !element;
                }
            )
        ) {
            console.error(
                "One or more booking-page elements are missing."
            );

            return;
        }

        /*
         * Attach controls before waiting for startup or loading
         * data. A failed first request therefore does not leave
         * the page permanently inactive.
         */
        attachEventListeners();
        updateDateDisplay();

        try {
            if (
                !window.BookIt.ready
            ) {
                throw new Error(
                    "The BookIt startup service is unavailable."
                );
            }

            await window.BookIt.ready;

            const bookingService =
                getBookingService();

            if (
                !bookingService ||
                typeof bookingService.getDay !==
                    "function"
            ) {
                throw new Error(
                    "The booking service is unavailable."
                );
            }

            await loadTeeSheet(true);
        } catch (error) {
            resetSummary();
            showError(error);
        }
    }

    if (
        document.readyState ===
        "loading"
    ) {
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