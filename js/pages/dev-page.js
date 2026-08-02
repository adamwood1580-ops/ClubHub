(function () {
    "use strict";

    const output =
        document.getElementById("output");

    const button =
        document.getElementById("testBooking");

    function show(text) {
        output.textContent = text;
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
                        : null,

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
        } catch {
            result.raw = String(source);
        }

        return JSON.stringify(
            result,
            null,
            2
        );
    }

    async function testBookingService() {
        show("Testing booking service...");

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

            const startedAt =
                performance.now();

            const teeSheet =
                const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);

const teeSheet =
    await window.BookIt.booking.getDay(tomorrow);

            const finishedAt =
                performance.now();

            show(
`✅ BOOKING SERVICE OK

Club:
${window.BookIt.currentProfile?.club?.name || "Unknown"}

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