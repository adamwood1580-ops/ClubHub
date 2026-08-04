(function () {
    "use strict";

    window.BookIt = window.BookIt || {};

    /* =========================================================
       PAGE ELEMENTS
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

    /* =========================================================
       BOOKING MODAL ELEMENTS
       ========================================================= */

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

    const contactNumberGroup =
        contactNumberInput?.closest(
            ".form-group"
        ) || null;

    const playerCountSelect =
        document.getElementById("playerCount");

    const playerCountGroup =
        playerCountSelect?.closest(
            ".form-group"
        ) || null;

    const bookingTypeWrap =
        document.getElementById("bookingTypeWrap");

    const playerNamesElement =
        document.getElementById("playerNames");

    const confirmBookingButton =
        document.getElementById("confirmBooking");

    /* =========================================================
       PAGE STATE
       ========================================================= */

    let selectedDate =
        new Date();

    let currentTeeTimes =
        [];

    let activeFilter =
        "all";

    let selectedTeeTime =
        null;

    let modalMode =
        "create";

    let bookingSubmissionInProgress =
        false;

    let directActionInProgress =
        false;

    let pageInitialised =
        false;

    /* =========================================================
       GENERAL HELPERS
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
        const today =
            new Date();

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

    function getBookingService() {
        return (
            window.BookIt?.booking ||
            null
        );
    }

    function getReadableError(error) {
        if (!error) {
            return "An unknown error occurred.";
        }

        if (
            typeof error.message ===
            "string"
        ) {
            return error.message;
        }

        if (
            typeof error.details ===
            "string"
        ) {
            return error.details;
        }

        return String(error);
    }

    function setElementHidden(
        element,
        hidden
    ) {
        if (!element) {
            return;
        }

        element.hidden =
            hidden;
    }

    /* =========================================================
       DATE DISPLAY
       ========================================================= */

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
            formatShortDate(selectedDate);

        if (datePicker) {
            datePicker.value =
                toDateKey(selectedDate);
        }
    }

    /* =========================================================
       TEE-TIME DISPLAY HELPERS
       ========================================================= */

    function getButtonLabel(teeTime) {
        switch (teeTime.action) {
            case "book":
                return "Book Now";

            case "join":
                return "Join";

            case "leave":
                return "Leave Booking";

            case "cancel":
                return "Cancel Booking";

            default:
                return teeTime.displayStatus;
        }
    }

    function getButtonClass(teeTime) {
        if (
            teeTime.action === "leave" ||
            teeTime.action === "cancel"
        ) {
            return "button button--secondary tee-time-card__action";
        }

        return "button button--primary tee-time-card__action";
    }

    function getCardClass(teeTime) {
        if (
            teeTime.operationalStatus !==
            "open"
        ) {
            return "tee-time-card--unavailable";
        }

        if (
            teeTime.isCurrentMembersBooking
        ) {
            return "tee-time-card--my-booking";
        }

        if (
            teeTime.booking?.type ===
            "private"
        ) {
            return "tee-time-card--full";
        }

        if (
            teeTime.spacesRemaining <= 0
        ) {
            return "tee-time-card--full";
        }

        if (teeTime.booking) {
            return "tee-time-card--joinable";
        }

        return "tee-time-card--available";
    }

    function getBookingDescription(
        teeTime
    ) {
        const booking =
            teeTime.booking;

        if (!booking) {
            return "";
        }

        const leadName =
            booking.leadName ||
            "Member";

        const extraPlayers =
            Math.max(
                Number(
                    booking.playerCount || 1
                ) - 1,
                0
            );

        if (extraPlayers === 0) {
            return leadName;
        }

        return `${leadName} +${extraPlayers}`;
    }

    function getStatusLabel(
        teeTime
    ) {
        if (
            teeTime.booking
                ?.currentMemberIsLead
        ) {
            return "Your booking";
        }

        if (
            teeTime.booking
                ?.currentMemberIsParticipant
        ) {
            return "You are playing";
        }

        return teeTime.displayStatus;
    }

    function renderTeeTime(
        teeTime
    ) {
        const disabled =
            teeTime.action === "none";

        const bookingDescription =
            getBookingDescription(
                teeTime
            );

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
                        ${escapeHtml(getStatusLabel(teeTime))}
                    </p>

                    ${
                        bookingDescription
                            ? `
                                <p class="tee-time-card__booker">
                                    ${escapeHtml(bookingDescription)}
                                </p>
                            `
                            : ""
                    }

                    <p class="tee-time-card__spaces">
                        ${teeTime.occupied}/${teeTime.maxPlayers}
                        players
                    </p>
                </div>

                <button
                    type="button"
                    class="${getButtonClass(teeTime)}"
                    data-booking-action="${escapeHtml(teeTime.action)}"
                    data-tee-time-id="${escapeHtml(teeTime.id)}"
                    ${disabled ? "disabled" : ""}
                >
                    ${escapeHtml(getButtonLabel(teeTime))}
                </button>
            </article>
        `;
    }

    /* =========================================================
       FILTERING
       ========================================================= */

    function matchesFilter(
        teeTime
    ) {
        if (
            activeFilter === "available"
        ) {
            return (
                !teeTime.booking &&
                teeTime.action === "book"
            );
        }

        if (
            activeFilter === "joinable"
        ) {
            return (
                teeTime.booking?.type ===
                    "joinable" &&
                teeTime.spacesRemaining > 0 &&
                !teeTime.booking
                    .currentMemberIsParticipant
            );
        }

        if (
            activeFilter === "booked"
        ) {
            return Boolean(
                teeTime.booking
            );
        }

        return true;
    }

    function renderCurrentTeeSheet() {
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
       SUMMARY COUNTERS
       ========================================================= */

    function resetSummary() {
        availableCountElement.textContent =
            "0";

        joinableCountElement.textContent =
            "0";

        bookedCountElement.textContent =
            "0";
    }

    function updateSummary() {
        const available =
            currentTeeTimes.filter(
                function (teeTime) {
                    return (
                        !teeTime.booking &&
                        teeTime.action ===
                            "book"
                    );
                }
            ).length;

        const joinable =
            currentTeeTimes.filter(
                function (teeTime) {
                    return (
                        teeTime.booking?.type ===
                            "joinable" &&
                        teeTime.spacesRemaining >
                            0 &&
                        !teeTime.booking
                            .currentMemberIsParticipant
                    );
                }
            ).length;

        const booked =
            currentTeeTimes.filter(
                function (teeTime) {
                    return Boolean(
                        teeTime.booking
                    );
                }
            ).length;

        availableCountElement.textContent =
            String(available);

        joinableCountElement.textContent =
            String(joinable);

        bookedCountElement.textContent =
            String(booked);
    }

    /* =========================================================
       LOADING, EMPTY AND ERROR STATES
       ========================================================= */

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
                    "The booking service is unavailable."
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
            currentTeeTimes = [];
            resetSummary();

            teeSheetElement.setAttribute(
                "aria-busy",
                "false"
            );

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

        selectedDate =
            nextDate;

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
        } else {
            datePicker.click();
        }
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
       MODAL FIELD HELPERS
       ========================================================= */

    function getSelectedBookingType() {
        return (
            document.querySelector(
                'input[name="bookingType"]:checked'
            )?.value ||
            "joinable"
        );
    }

    function getSelectedPlayerCount() {
        const count =
            Number(
                playerCountSelect?.value ||
                1
            );

        return Number.isInteger(count)
            ? count
            : 1;
    }

    function populatePlayerCountOptions(
        maximum
    ) {
        if (!playerCountSelect) {
            return;
        }

        const safeMaximum =
            Math.max(
                Number(maximum || 1),
                1
            );

        const options = [];

        for (
            let count = 1;
            count <= safeMaximum;
            count += 1
        ) {
            options.push(`
                <option value="${count}">
                    ${count} ${
                        count === 1
                            ? "player"
                            : "players"
                    }
                </option>
            `);
        }

        playerCountSelect.innerHTML =
            options.join("");

        playerCountSelect.value =
            "1";

        playerCountSelect.disabled =
            false;
    }

    function showCreateFields() {
        setElementHidden(
            bookingTypeWrap,
            false
        );

        setElementHidden(
            contactNumberGroup,
            false
        );

        setElementHidden(
            playerCountGroup,
            false
        );
    }

    function showJoinFields() {
        setElementHidden(
            bookingTypeWrap,
            true
        );

        setElementHidden(
            contactNumberGroup,
            true
        );

        setElementHidden(
            playerCountGroup,
            false
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

        confirmBookingButton.disabled =
            false;

        confirmBookingButton.textContent =
            modalMode === "join"
                ? "Confirm Join"
                : "Confirm Booking";
    }

    function openBookingModal(
        teeTime,
        mode
    ) {
        if (!bookingModal) {
            window.alert(
                "The booking form is unavailable."
            );

            return;
        }

        selectedTeeTime =
            teeTime;

        modalMode =
            mode;

        resetBookingModal();

        if (mode === "join") {
            showJoinFields();

            populatePlayerCountOptions(
                teeTime.spacesRemaining
            );

            modalTitle.textContent =
                "Join Tee Time";

            modalTime.textContent =
                `${formatLongDate(selectedDate)} at ${teeTime.time} · ` +
                `${teeTime.spacesRemaining} ${
                    teeTime.spacesRemaining === 1
                        ? "space available"
                        : "spaces available"
                }`;

            confirmBookingButton.textContent =
                "Confirm Join";
        } else {
            showCreateFields();

            populatePlayerCountOptions(
                teeTime.maxPlayers
            );

            modalTitle.textContent =
                "Book Tee Time";

            modalTime.textContent =
                `${formatLongDate(selectedDate)} at ${teeTime.time}`;

            confirmBookingButton.textContent =
                "Confirm Booking";
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
                playerCountSelect?.focus();
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

        selectedTeeTime =
            null;

        modalMode =
            "create";
    }

    /* =========================================================
       CREATE AND JOIN
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

        const isJoin =
            modalMode === "join";

        const requiredFunction =
            isJoin
                ? bookingService?.joinBooking
                : bookingService?.createBooking;

        if (
            typeof requiredFunction !==
            "function"
        ) {
            window.alert(
                isJoin
                    ? "Joining is temporarily unavailable."
                    : "Booking creation is temporarily unavailable."
            );

            return;
        }

        bookingSubmissionInProgress =
            true;

        confirmBookingButton.disabled =
            true;

        confirmBookingButton.textContent =
            isJoin
                ? "Joining booking..."
                : "Creating booking...";

        try {
            let result;

            if (isJoin) {
                result =
                    await bookingService.joinBooking({
                        bookingId:
                            selectedTeeTime.booking.id,

                        teeTimeId:
                            selectedTeeTime.id,

                        playerCount:
                            getSelectedPlayerCount()
                    });
            } else {
                result =
                    await bookingService.createBooking({
                        teeTimeId:
                            selectedTeeTime.id,

                        playerCount:
                            getSelectedPlayerCount(),

                        bookingType:
                            getSelectedBookingType(),

                        contactNumber:
                            contactNumberInput?.value ||
                            null,

                        notes:
                            null
                    });
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

            selectedTeeTime =
                null;

            modalMode =
                "create";

            await loadTeeSheet(true);

            const resultDate =
                createLocalDate(
                    result.playDate
                );

            window.alert(
                `${isJoin ? "Joined" : "Booking confirmed"} for ` +
                `${result.playerCount} ${
                    result.playerCount === 1
                        ? "player"
                        : "players"
                } at ${result.time} on ` +
                `${formatShortDate(resultDate)}.`
            );
        } catch (error) {
            console.error(
                "BookIt booking action failed:",
                error
            );

            window.alert(
                getReadableError(error)
            );
        } finally {
            bookingSubmissionInProgress =
                false;

            confirmBookingButton.disabled =
                false;

            confirmBookingButton.textContent =
                modalMode === "join"
                    ? "Confirm Join"
                    : "Confirm Booking";
        }
    }

    /* =========================================================
       LEAVE AND CANCEL
       ========================================================= */

    async function leaveBooking(
        teeTime
    ) {
        if (
            directActionInProgress
        ) {
            return;
        }

        const partySize =
            Number(
                teeTime.booking
                    ?.currentMemberPartySize ||
                1
            );

        const confirmed =
            window.confirm(
                `Leave the ${teeTime.time} booking for ` +
                `${partySize} ${
                    partySize === 1
                        ? "player"
                        : "players"
                }?`
            );

        if (!confirmed) {
            return;
        }

        const bookingService =
            getBookingService();

        if (
            typeof bookingService?.leaveBooking !==
            "function"
        ) {
            window.alert(
                "Leaving a booking is temporarily unavailable."
            );

            return;
        }

        directActionInProgress =
            true;

        try {
            const result =
                await bookingService.leaveBooking({
                    bookingId:
                        teeTime.booking.id,

                    teeTimeId:
                        teeTime.id
                });

            await loadTeeSheet(true);

            window.alert(
                `You have left the ${result.time} booking.`
            );
        } catch (error) {
            console.error(
                "BookIt leave booking failed:",
                error
            );

            window.alert(
                getReadableError(error)
            );
        } finally {
            directActionInProgress =
                false;
        }
    }

    async function cancelBooking(
        teeTime
    ) {
        if (
            directActionInProgress
        ) {
            return;
        }

        const playerCount =
            Number(
                teeTime.booking
                    ?.playerCount ||
                1
            );

        const confirmed =
            window.confirm(
                `Cancel the entire ${teeTime.time} booking for ` +
                `${playerCount} ${
                    playerCount === 1
                        ? "player"
                        : "players"
                }? This will remove everyone from the booking.`
            );

        if (!confirmed) {
            return;
        }

        const bookingService =
            getBookingService();

        if (
            typeof bookingService?.cancelBooking !==
            "function"
        ) {
            window.alert(
                "Cancelling a booking is temporarily unavailable."
            );

            return;
        }

        directActionInProgress =
            true;

        try {
            const result =
                await bookingService.cancelBooking({
                    bookingId:
                        teeTime.booking.id,

                    teeTimeId:
                        teeTime.id
                });

            await loadTeeSheet(true);

            window.alert(
                `The ${result.time} booking has been cancelled.`
            );
        } catch (error) {
            console.error(
                "BookIt cancel booking failed:",
                error
            );

            window.alert(
                getReadableError(error)
            );
        } finally {
            directActionInProgress =
                false;
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
            button.disabled ||
            directActionInProgress
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

        switch (action) {
            case "book":
                openBookingModal(
                    teeTime,
                    "create"
                );
                break;

            case "join":
                openBookingModal(
                    teeTime,
                    "join"
                );
                break;

            case "leave":
                leaveBooking(
                    teeTime
                );
                break;

            case "cancel":
                cancelBooking(
                    teeTime
                );
                break;

            default:
                break;
        }
    }

    /* =========================================================
       EVENT LISTENERS
       ========================================================= */

    function attachEventListeners() {
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

        teeSheetElement.addEventListener(
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

        pageInitialised =
            true;

        const requiredElements = [
            teeSheetElement,
            dayNameElement,
            dateTextElement,
            previousDayButton,
            nextDayButton,
            availableCountElement,
            joinableCountElement,
            bookedCountElement,
            bookingModal,
            playerCountSelect,
            confirmBookingButton
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

        attachEventListeners();
        updateDateDisplay();

        try {
            await window.BookIt.ready;

            const bookingService =
                getBookingService();

            const requiredFunctions = [
                "getDay",
                "createBooking",
                "joinBooking",
                "leaveBooking",
                "cancelBooking"
            ];

            const missingFunction =
                requiredFunctions.find(
                    function (name) {
                        return (
                            typeof bookingService?.[
                                name
                            ] !== "function"
                        );
                    }
                );

            if (missingFunction) {
                throw new Error(
                    `The booking service is missing ${missingFunction}().`
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