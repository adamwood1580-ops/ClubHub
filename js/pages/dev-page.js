(function () {
    "use strict";

    const output =
        document.getElementById("output");

    const button =
        document.getElementById("testBooking");

    function show(text) {
        if (output) {
            output.textContent = text;
        }
    }

    function formatError(error) {
        if (!error) {
            return "Unknown error";
        }

        const source =
            error.originalError ||
            error.raw ||
            error;

        const result = {
            name:
                error.name ||
                source.name ||
                null,

            message:
                typeof error.message === "string"
                    ? error.message
                    : typeof source.message === "string"
                        ? source.message
                        : String(error),

            code:
                error.code ||
                source.code ||
                null,

            details:
                error.details ||
                source.details ||
                null,

            hint:
                error.hint ||
                source.hint ||
                null
        };

        try {
            result.raw = JSON.parse(
                JSON.stringify(source)
            );
        } catch (jsonError) {
            result.raw = String(source);
        }

        return JSON.stringify(
            result,
            null,
            2
        );
    }

    function formatDate(date) {
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

    async function testBookingService() {
        show("Testing booking service...");

        if (button) {
            button.disabled = true;
            button.textContent = "Testing...";
        }

        try {
            if (
                !window.BookIt ||
                !window.BookIt.ready
            ) {
                throw new Error(
                    "The BookIt startup service is unavailable."
                );
            }

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

            const dateInput =
    document.getElementById("bookingTestDate");

const selectedDate =
    dateInput?.value;

if (!selectedDate) {
    throw new Error(
        "Select the tee-sheet date to test."
    );
}

            const startedAt =
                performance.now();

            const teeSheet =
                await window.BookIt.booking.getDay(
                    selectedDate,
                    {
                        forceRefresh: true
                    }
                );

            const finishedAt =
                performance.now();

            show(
`✅ BOOKING SERVICE OK

Club:
${window.BookIt.currentProfile?.club?.name || "Unknown"}

Date Tested:
${selectedDate}

Tee Times Returned:
${teeSheet.length}

Execution Time:
${Math.round(finishedAt - startedAt)} ms

--------------------

${JSON.stringify(teeSheet, null, 2)}`
            );
        } catch (error) {
            show(
`❌ BOOKING SERVICE FAILED

${formatError(error)}

STACK
-----

${error?.stack || "No stack available"}`
            );
        } finally {
            if (button) {
                button.disabled = false;
                button.textContent =
                    "Test Booking Service";
            }
        }
    }

    if (!output || !button) {
        console.error(
            "Developer diagnostics elements are missing."
        );

        return;
    }

    button.addEventListener(
        "click",
        testBookingService
    );
})();