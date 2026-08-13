(function () {
    "use strict";

    const MONTH_FORMATTER = new Intl.DateTimeFormat("en-GB", {
        month: "long",
        year: "numeric"
    });

    const WEEKDAY_FORMATTER = new Intl.DateTimeFormat("en-GB", {
        weekday: "short"
    });

    const SHORT_MONTH_FORMATTER = new Intl.DateTimeFormat("en-GB", {
        month: "short"
    });

    const SECTION_LABELS = {
        all: "All sections",
        club: "Club",
        mens: "Men",
        seniors: "Seniors",
        ladies: "Ladies"
    };

    const EVENT_TYPE_LABELS = {
        competition: "Competition",
        fixture: "Fixture",
        roll_up: "Roll-Up",
        social: "Social",
        course_event: "Course Event",
        other: "Club Event"
    };

    const state = {
        events: [],
        activeSection: "all",
        displayMonth: null,
        minimumMonth: null,
        maximumMonth: null,
        clubId: null,
        lastLoadedAt: null
    };

    const elements = {};
    let initialised = false;

    async function start() {
        if (initialised) {
            return;
        }

        initialised = true;
        cacheElements();
        bindControls();

        try {
            // Legacy internal namespace retained until the planned full ClubHub rename sweep.
            if (!window.BookIt || !window.BookIt.ready) {
                throw new Error("The application could not initialise on this page.");
            }

            const context = await window.BookIt.ready;
            const supabase = resolveSupabaseClient(context);

            state.clubId = resolveClubId(context?.profile);

            await loadEvents(supabase);

            initialiseMonthRange();
            render();
        } catch (error) {
            console.error("Competition calendar failed to load:", error);
            showFatalError(
                "We couldn't load the club calendar. Please return to Home and try again."
            );
        }
    }

    function cacheElements() {
        elements.previousMonth = document.getElementById("previousMonth");
        elements.nextMonth = document.getElementById("nextMonth");
        elements.currentMonthBtn = document.getElementById("currentMonthBtn");
        elements.calendarHeading = document.getElementById("calendarHeading");
        elements.monthSummary = document.getElementById("monthSummary");
        elements.calendarMessage = document.getElementById("calendarMessage");
        elements.agendaList = document.getElementById("agendaList");
        elements.upcomingEvent = document.getElementById("upcomingEvent");
        elements.upcomingFilterLabel = document.getElementById("upcomingFilterLabel");
        elements.filterButtons = Array.from(document.querySelectorAll(".filter-btn"));
    }

    function bindControls() {
        elements.previousMonth.addEventListener("click", function () {
            changeMonth(-1);
        });

        elements.nextMonth.addEventListener("click", function () {
            changeMonth(1);
        });

        elements.currentMonthBtn.addEventListener("click", function () {
            state.displayMonth = clampMonthToAvailableRange(startOfMonth(new Date()));
            renderCalendar();
        });

        elements.filterButtons.forEach(function (button) {
            button.addEventListener("click", function () {
                state.activeSection = button.dataset.section;

                elements.filterButtons.forEach(function (item) {
                    item.classList.toggle("active", item === button);
                });

                render();
            });
        });
    }

    function resolveSupabaseClient(context) {
        const candidates = [
            context?.supabase,
            context?.client,
            window.BookIt?.supabase,
            window.BookIt?.supabaseClient,
            window.BookIt?.client,
            window.supabaseClient
        ];

        const client = candidates.find(function (candidate) {
            return candidate && typeof candidate.from === "function";
        });

        if (client) {
            return client;
        }

        if (typeof window.BookIt?.getSupabaseClient === "function") {
            const suppliedClient = window.BookIt.getSupabaseClient();

            if (suppliedClient && typeof suppliedClient.from === "function") {
                return suppliedClient;
            }
        }

        if (typeof window.BookIt?.requireSupabaseClient === "function") {
            const suppliedClient = window.BookIt.requireSupabaseClient();

            if (suppliedClient && typeof suppliedClient.from === "function") {
                return suppliedClient;
            }
        }

        throw new Error("The Supabase client is not available.");
    }

    function resolveClubId(profile) {
        const memberships = Array.isArray(profile?.memberships)
            ? profile.memberships
            : [];

        const primaryMembership = memberships.find(function (membership) {
            return membership?.is_primary;
        }) || memberships[0];

        return (
            profile?.club?.id ||
            profile?.club_id ||
            profile?.clubId ||
            profile?.membership?.club_id ||
            profile?.membership?.clubId ||
            profile?.primaryMembership?.club_id ||
            profile?.primaryMembership?.clubId ||
            primaryMembership?.club_id ||
            primaryMembership?.clubId ||
            null
        );
    }

    async function loadEvents(supabase) {
        let query = supabase
            .from("club_events")
            .select([
                "id",
                "club_id",
                "event_date",
                "display_order",
                "start_time",
                "end_time",
                "time_text",
                "title",
                "section",
                "event_type",
                "location_type",
                "venue",
                "notes",
                "is_qualifier",
                "course_closed",
                "status"
            ].join(","))
            .eq("is_published", true)
            .order("event_date", { ascending: true })
            .order("display_order", { ascending: true });

        if (state.clubId) {
            query = query.eq("club_id", state.clubId);
        }

        const result = await query;

        if (result.error) {
            throw result.error;
        }

        state.events = Array.isArray(result.data) ? result.data : [];
        state.lastLoadedAt = new Date();

        if (!state.events.length) {
            throw new Error("No published club events were returned.");
        }
    }

    function initialiseMonthRange() {
        const firstEventDate = parseDate(state.events[0].event_date);
        const lastEventDate = parseDate(state.events[state.events.length - 1].event_date);

        state.minimumMonth = startOfMonth(firstEventDate);
        state.maximumMonth = startOfMonth(lastEventDate);
        state.displayMonth = clampMonthToAvailableRange(startOfMonth(new Date()));
    }

    function render() {
        renderUpcoming();
        renderCalendar();
    }

    function renderUpcoming() {
        elements.upcomingFilterLabel.textContent = SECTION_LABELS[state.activeSection];

        const now = new Date();
        const upcomingEvent = getFilteredEvents()
            .filter(function (event) {
                return event.status !== "cancelled" && eventIsUpcoming(event, now);
            })
            .sort(compareEvents)[0];

        if (!upcomingEvent) {
            elements.upcomingEvent.innerHTML = [
                '<div class="empty-upcoming">',
                "No more events are currently scheduled for this filter.",
                "</div>"
            ].join("");
            return;
        }

        const date = parseDate(upcomingEvent.event_date);
        const badges = createBadges(upcomingEvent);

        elements.upcomingEvent.innerHTML = `
            <article class="upcoming-event-card">
                <div class="upcoming-date">
                    <strong>${date.getDate()}</strong>
                    <span>
                        ${escapeHtml(WEEKDAY_FORMATTER.format(date))}
                        ${escapeHtml(SHORT_MONTH_FORMATTER.format(date))}
                    </span>
                </div>

                <div class="upcoming-details">
                    <div class="upcoming-time">
                        ${escapeHtml(formatEventTime(upcomingEvent))}
                    </div>

                    <h3 class="upcoming-title">
                        ${escapeHtml(upcomingEvent.title)}
                    </h3>

                    <div class="event-meta-row">
                        <span class="section-badge section-${escapeAttribute(upcomingEvent.section)}">
                            ${escapeHtml(SECTION_LABELS[upcomingEvent.section] || "Club")}
                        </span>
                        ${badges}
                    </div>
                </div>
            </article>
        `;
    }

    function renderCalendar() {
        elements.calendarHeading.textContent = MONTH_FORMATTER.format(state.displayMonth);

        const events = getEventsForDisplayedMonth();
        const groupedEvents = groupEventsByDate(events);
        const dayKeys = Object.keys(groupedEvents).sort();

        elements.monthSummary.textContent = buildMonthSummary(events, dayKeys.length);

        elements.previousMonth.disabled = sameMonth(state.displayMonth, state.minimumMonth);
        elements.nextMonth.disabled = sameMonth(state.displayMonth, state.maximumMonth);

        if (!events.length) {
            elements.agendaList.hidden = true;
            elements.calendarMessage.hidden = false;
            elements.calendarMessage.classList.remove("error");
            elements.calendarMessage.textContent = "No events match this filter for this month.";
            return;
        }

        elements.calendarMessage.hidden = true;
        elements.agendaList.hidden = false;
        elements.agendaList.innerHTML = dayKeys
            .map(function (dateKey) {
                return renderAgendaDay(dateKey, groupedEvents[dateKey]);
            })
            .join("");
    }

    function renderAgendaDay(dateKey, events) {
        const date = parseDate(dateKey);
        const isToday = sameCalendarDate(date, new Date());

        return `
            <section class="agenda-day${isToday ? " is-today" : ""}">
                <div class="agenda-date">
                    <span class="weekday">
                        ${escapeHtml(WEEKDAY_FORMATTER.format(date))}
                    </span>
                    <strong class="day-number">${date.getDate()}</strong>
                    ${isToday ? '<span class="today-label">Today</span>' : ""}
                </div>

                <div class="agenda-events">
                    ${events.map(renderAgendaEvent).join("")}
                </div>
            </section>
        `;
    }

    function renderAgendaEvent(event) {
        const badges = createBadges(event);
        const notes = buildNotes(event);

        return `
            <article
                class="agenda-event"
                data-section="${escapeAttribute(event.section)}"
            >
                <div class="event-time">
                    ${escapeHtml(formatEventTime(event))}
                </div>

                <div class="event-body">
                    <h3 class="event-title">
                        ${escapeHtml(event.title)}
                    </h3>

                    <div class="badge-row">
                        <span class="section-badge section-${escapeAttribute(event.section)}">
                            ${escapeHtml(SECTION_LABELS[event.section] || "Club")}
                        </span>
                        ${badges}
                    </div>

                    ${notes ? `<p class="event-notes">${escapeHtml(notes)}</p>` : ""}
                </div>
            </article>
        `;
    }

    function createBadges(event) {
        const badges = [];

        if (event.event_type && event.event_type !== "other") {
            badges.push(
                `<span class="event-badge">${escapeHtml(EVENT_TYPE_LABELS[event.event_type] || "Event")}</span>`
            );
        }

        if (event.location_type === "home") {
            badges.push('<span class="event-badge">Home</span>');
        }

        if (event.location_type === "away") {
            badges.push('<span class="event-badge away">Away</span>');
        }

        if (event.is_qualifier) {
            badges.push('<span class="event-badge">Qualifier</span>');
        }

        if (event.course_closed) {
            badges.push('<span class="event-badge closed">Course Closed</span>');
        }

        if (String(event.time_text || "").toLowerCase().includes("tbc")) {
            badges.push('<span class="event-badge tbc">TBC</span>');
        }

        if (event.status === "cancelled") {
            badges.push('<span class="event-badge cancelled">Cancelled</span>');
        }

        if (event.status === "postponed") {
            badges.push('<span class="event-badge postponed">Postponed</span>');
        }

        return badges.join("");
    }

    function buildNotes(event) {
        const notes = [];

        if (event.venue) {
            notes.push(event.venue);
        }

        if (event.notes) {
            notes.push(event.notes);
        }

        return notes.join(" · ");
    }

    function getFilteredEvents() {
        if (state.activeSection === "all") {
            return state.events.slice();
        }

        return state.events.filter(function (event) {
            return event.section === state.activeSection;
        });
    }

    function getEventsForDisplayedMonth() {
        const year = state.displayMonth.getFullYear();
        const month = state.displayMonth.getMonth();

        return getFilteredEvents()
            .filter(function (event) {
                const date = parseDate(event.event_date);
                return date.getFullYear() === year && date.getMonth() === month;
            })
            .sort(compareEvents);
    }

    function groupEventsByDate(events) {
        return events.reduce(function (groups, event) {
            if (!groups[event.event_date]) {
                groups[event.event_date] = [];
            }

            groups[event.event_date].push(event);
            return groups;
        }, {});
    }

    function buildMonthSummary(events, activeDays) {
        const eventWord = events.length === 1 ? "event" : "events";
        const dayWord = activeDays === 1 ? "day" : "days";

        return `${events.length} ${eventWord} across ${activeDays} ${dayWord}`;
    }

    function changeMonth(offset) {
        const nextMonth = new Date(
            state.displayMonth.getFullYear(),
            state.displayMonth.getMonth() + offset,
            1
        );

        state.displayMonth = clampMonthToAvailableRange(nextMonth);
        renderCalendar();

        document.querySelector(".calendar-panel")?.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }

    function clampMonthToAvailableRange(month) {
        if (month < state.minimumMonth) {
            return new Date(state.minimumMonth);
        }

        if (month > state.maximumMonth) {
            return new Date(state.maximumMonth);
        }

        return new Date(month);
    }

    function eventIsUpcoming(event, now) {
        const eventDate = parseDate(event.event_date);
        const today = startOfDay(now);
        const eventDay = startOfDay(eventDate);

        if (eventDay > today) {
            return true;
        }

        if (eventDay < today) {
            return false;
        }

        if (!event.start_time) {
            return true;
        }

        const eventDateTime = dateWithTime(eventDate, event.start_time);
        return eventDateTime >= now;
    }

    function compareEvents(left, right) {
        if (left.event_date !== right.event_date) {
            return left.event_date.localeCompare(right.event_date);
        }

        const leftTime = left.start_time || "99:99:99";
        const rightTime = right.start_time || "99:99:99";

        if (leftTime !== rightTime) {
            return leftTime.localeCompare(rightTime);
        }

        return Number(left.display_order || 0) - Number(right.display_order || 0);
    }

    function formatEventTime(event) {
        if (event.time_text) {
            return normaliseTimeText(event.time_text);
        }

        if (!event.start_time) {
            return "Time TBC";
        }

        const start = event.start_time.slice(0, 5);

        if (!event.end_time) {
            return start;
        }

        return `${start} – ${event.end_time.slice(0, 5)}`;
    }

    function normaliseTimeText(value) {
        return String(value)
            .replace(/\s+-\s+/g, " – ")
            .replace(/^Time TBC$/i, "Time TBC")
            .trim();
    }

    function parseDate(dateString) {
        const parts = String(dateString).split("-").map(Number);
        return new Date(parts[0], parts[1] - 1, parts[2]);
    }

    function dateWithTime(date, timeString) {
        const parts = String(timeString).split(":").map(Number);
        return new Date(
            date.getFullYear(),
            date.getMonth(),
            date.getDate(),
            parts[0] || 0,
            parts[1] || 0,
            parts[2] || 0
        );
    }

    function startOfMonth(date) {
        return new Date(date.getFullYear(), date.getMonth(), 1);
    }

    function startOfDay(date) {
        return new Date(date.getFullYear(), date.getMonth(), date.getDate());
    }

    function sameMonth(left, right) {
        return (
            left.getFullYear() === right.getFullYear() &&
            left.getMonth() === right.getMonth()
        );
    }

    function sameCalendarDate(left, right) {
        return (
            left.getFullYear() === right.getFullYear() &&
            left.getMonth() === right.getMonth() &&
            left.getDate() === right.getDate()
        );
    }

    function showFatalError(message) {
        elements.calendarMessage.hidden = false;
        elements.calendarMessage.classList.add("error");
        elements.calendarMessage.textContent = message;
        elements.agendaList.hidden = true;
        elements.upcomingEvent.innerHTML = `<div class="empty-upcoming">${escapeHtml(message)}</div>`;
    }

    function escapeHtml(value) {
        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function escapeAttribute(value) {
        return escapeHtml(value).replaceAll("`", "&#096;");
    }

    /* =========================================================
       INITIALISATION
       =========================================================

       competitions.js is loaded dynamically by protected-loader.js.
       That loader starts after DOMContentLoaded, so this page script
       must initialise immediately when the DOM is already ready.
    */

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            start,
            { once: true }
        );
    } else {
        start();
    }
})();
