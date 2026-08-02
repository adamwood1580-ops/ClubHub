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

    const bookingTypeWrap =
        document.getElementById("bookingTypeWrap");

    const playerNamesElement =
        document.getElementById("playerNames");

    const confirmBookingButton =
        document.getElementById("confirmBooking");

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

    let pageInitialised =
        false;

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
            return "tee-time-card--unavailable";
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
        if (activeFilter === "available") {
            return teeTime.action === "book";
        }

        if (activeFilter === "joinable") {
            return teeTime.action === "join";
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
                        teeTime.action ===
                        "book"
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
                            null &&
                        teeTime.action ===
                            "none"
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
                },
                {
                    once: true
                }
            );
    }

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

        const options = [];

        for (
            let count = 1;
            count <= maximum;
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
        if (bookingTypeWrap) {
            bookingTypeWrap.hidden =
                false;
        }

        if (contactNumberGroup) {
            contactNumberGroup.hidden =
                false;
        }
    }

    function showJoinFields() {
        if (bookingTypeWrap) {
            bookingTypeWrap.hidden =
                true;
        }

        if (contactNumberGroup) {
            contactNumberGroup.hidden =
                true;
        }
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
        } else {
            showCreateFields();

            populatePlayerCountOptions(
                teeTime.maxPlayers
            );

            modalTitle.textContent =
                "Book Tee Time";

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

    function handleTeeSheetClick(event) {
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
            openBookingModal(
                teeTime,
                "create"
            );

            return;
        }

        if (action === "join") {
            openBookingModal(
                teeTime,
                "join"
            );
        }
    }

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