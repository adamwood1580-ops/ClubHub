(function () {
    "use strict";

    window.BookIt = window.BookIt || {};

    function renderTeeTime(teeTime) {
        const buttonLabel =
            teeTime.action === "join"
                ? "Join"
                : teeTime.action === "book"
                    ? "Book"
                    : teeTime.displayStatus;

        const buttonDisabled =
            teeTime.action === "none"
                ? "disabled"
                : "";

        return `
            <article class="tee-time-card">
                <div class="tee-time-card__time">
                    ${teeTime.time}
                </div>

                <div class="tee-time-card__details">
                    <p class="tee-time-card__status">
                        ${teeTime.displayStatus}
                    </p>

                    <p class="tee-time-card__spaces">
                        ${teeTime.occupied}/${teeTime.maxPlayers} Players
                    </p>
                </div>

                <button
                    class="button button--primary tee-time-card__action"
                    data-tee-time-id="${teeTime.id}"
                    ${buttonDisabled}
                >
                    ${buttonLabel}
                </button>
            </article>
        `;
    }

    window.BookIt.bookingPage = {
        renderTeeTime
    };
})();