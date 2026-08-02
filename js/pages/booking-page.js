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
       MODAL ELEMENTS
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

    const playerCountSelect =
        document.getElementById("playerCount");

    const bookingTypeWrap =
        document.getElementById("bookingTypeWrap");

    const playerNamesElement =
        document.getElementById("playerNames");

    const confirmBookingButton =
        document.getElementById("confirmBooking");

    /* =========================================================
       PAGE STATE
       ========================================================= */

    let selectedDate = new Date();

    let currentTeeTimes = [];
    let activeFilter = "all";

    let selectedTeeTime = null;
    let bookingSubmissionInProgress = false;

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

    function isToday(date) {
        const today = new Date();

        return (
            date.getFullYear() === today.getFullYear() &&
            date.getMonth() === today.getMonth() &&
            date.getDate() === today.getDate()
        );
    }

    function getCurrentProfile() {
        return window.BookIt.currentProfile || null;
    }

    function getMemberName() {
        const profile = getCurrentProfile();

        return (
            profile?.displayName ||
            [
                profile?.firstName,
                profile?.lastName
            ]
                .filter(Boolean)
                .join(" ")
                .trim() ||
            "Member"
        );
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
       TEE-TIME CARD RENDERING
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

    /* =========================================================
       AVAILABILITY SUMMARY
       ========================================================= */

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

    /* =========================================================
       LOADING AND ERROR STATES
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
            .getElementById("retryTeeSheet")
            ?.addEventListener(
                "click",
                function () {
                    loadTeeSheet(true);
                }
            );
    }

    /* =========================================================
       TEE-SHEET LOADING
       ========================================================= */

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

    /* =========================================================
       DATE NAVIGATION
       ========================================================= */

    function changeSelectedDate(numberOfDays) {
        const nextDate =
            new Date(selectedDate);

        nextDate.setDate(
            nextDate.getDate() + numberOfDays
        );

        selectedDate = nextDate;

        loadTeeSheet(true);
    }

    /* =========================================================
       FILTERING
       ========================================================= */

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

    /* =========================================================
       BOOKING MODAL
       ========================================================= */

    function getSelectedBookingType() {
        return (
            document.querySelector(
                'input[name="bookingType"]:checked'
            )?.value || "joinable"
        );
    }

    function resetBookingModal() {
        const profile = getCurrentProfile();

        if (leadNameInput) {
            leadNameInput.value =
                getMemberName();

            leadNameInput.readOnly = true;
        }

        if (contactNumberInput) {
            contactNumberInput.value =
                profile?.phone || "";
        }

        if (playerCountSelect) {
            playerCountSelect.value = "1";
            playerCountSelect.disabled = true;
        }

        if (playerNamesElement) {
            playerNamesElement.innerHTML = "";
            playerNamesElement.hidden = true;
        }

        document
            .querySelectorAll(
                'input[name="bookingType"]'
            )
            .forEach(function (radio) {
                radio.checked =
                    radio.value === "joinable";
            });

        if (confirmBookingButton) {
            confirmBookingButton.disabled = false;
            confirmBookingButton.textContent =
                "Confirm Booking";
        }
    }

    function openBookingModal(teeTime) {
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

        bookingModal.classList.remove("hidden");

        bookingModal.setAttribute(
            "aria-hidden",
            "false"
        );

        document.body.classList.add(
            "modal-open"
        );

        window.setTimeout(function () {
            contactNumberInput?.focus();
        }, 100);
    }

    function closeBookingModal() {
        if (!bookingModal) {
            return;
        }

        if (bookingSubmissionInProgress) {
            return;
        }

        bookingModal.classList.add("hidden");

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

        bookingSubmissionInProgress = true;

        if (confirmBookingButton) {
            confirmBookingButton.disabled = true;
            confirmBookingButton.textContent =
                "Creating booking...";
        }

        try {
            const result =
                await window.BookIt.booking.createBooking({
                    teeTimeId:
                        selectedTeeTime.id,

                    bookingType:
                        getSelectedBookingType(),

                    contactNumber:
                        contactNumberInput?.value || null,

                    notes:
                        null
                });

            bookingModal?.classList.add("hidden");

            bookingModal?.setAttribute(
                "aria-hidden",
                "true"
            );

            document.body.classList.remove(
                "modal-open"
            );

            selectedTeeTime = null;

            await loadTeeSheet(true);

            window.alert(
                `Booking confirmed for ${result.time} on ` +
                `${formatShortDate(createLocalDate(result.playDate))}.`
            );
        } catch (error) {
            console.error(
                "BookIt could not create the booking:",
                error
            );

            window.alert(
                error?.message ||
                "The booking could not be created."
            );
        } finally {
            bookingSubmissionInProgress = false;

            if (confirmBookingButton) {
                confirmBookingButton.disabled = false;
                confirmBookingButton.textContent =
                    "Confirm Booking";
            }
        }
    }

    /* =========================================================
       TEE-SHEET ACTIONS
       ========================================================= */

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

        const teeTime =
            currentTeeTimes.find(function (item) {
                return item.id === teeTimeId;
            });

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
       PAGE INITIALISATION
       ========================================================= */

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
                    "function" ||
                typeof window.BookIt.booking.createBooking !==
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
                    if (event.target === bookingModal) {
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