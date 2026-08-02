(function () {

    "use strict";

    const output =
        document.getElementById("output");

    const button =
        document.getElementById("testBooking");

    function show(text) {
        output.textContent = text;
    }

    async function testBookingService() {

        show("Testing...");

        try {

            await window.BookIt.ready;

            const teeSheet =
                await window.BookIt.booking.getDay(
                    new Date()
                );

            show(

`✅ BOOKING SERVICE OK

Tee Times Returned:

${teeSheet.length}

--------------------

${JSON.stringify(
teeSheet,
null,
2
)}`

            );

        }

        catch (error) {

            show(

`❌ BOOKING SERVICE FAILED

${error.message}

${error.stack || ""}`

            );

        }

    }

    button.addEventListener(
        "click",
        testBookingService
    );

})();