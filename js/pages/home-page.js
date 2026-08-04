(function () {
    "use strict";

    window.BookIt =
        window.BookIt || {};

    /* =========================================================
       HOME ELEMENTS
       ========================================================= */

    const greetingElement =
        document.getElementById(
            "homeGreeting"
        );

    const greetingSubtitleElement =
        document.getElementById(
            "homeGreetingSubtitle"
        );

    const nextRoundCard =
        document.getElementById(
            "nextRoundCard"
        );

    const nextRoundTime =
        document.getElementById(
            "nextRoundTime"
        );

    const nextRoundDate =
        document.getElementById(
            "nextRoundDate"
        );

    const nextRoundCourse =
        document.getElementById(
            "nextRoundCourse"
        );

    const nextRoundPlayers =
        document.getElementById(
            "nextRoundPlayers"
        );

    const nextRoundEmpty =
        document.getElementById(
            "nextRoundEmpty"
        );

    /* =========================================================
       WEATHER ELEMENTS
       ========================================================= */

    const weatherCard =
        document.getElementById(
            "weatherCard"
        );

    const weatherStatusDot =
        document.getElementById(
            "weatherStatusDot"
        );

    const weatherTitle =
        document.getElementById(
            "weatherTitle"
        );

    const weatherIcon =
        document.getElementById(
            "weatherIcon"
        );

    const weatherTemperature =
        document.getElementById(
            "weatherTemperature"
        );

    const weatherDescription =
        document.getElementById(
            "weatherDescription"
        );

    const weatherWind =
        document.getElementById(
            "weatherWind"
        );

    const weatherAdvisory =
        document.getElementById(
            "weatherAdvisory"
        );

    const weatherCourseStatus =
        document.getElementById(
            "weatherCourseStatus"
        );

    const weatherUpdated =
        document.getElementById(
            "weatherUpdated"
        );

    /* =========================================================
       PROFILE AND GREETING
       ========================================================= */

    function getFirstName(profile) {
        if (profile?.firstName) {
            return profile.firstName;
        }

        if (profile?.displayName) {
            return String(
                profile.displayName
            )
                .trim()
                .split(/\s+/)[0];
        }

        return "Member";
    }

    function renderGreeting(profile) {
        const firstName =
            getFirstName(profile);

        if (greetingElement) {
            greetingElement.textContent =
                `Hi ${firstName}`;
        }

        if (greetingSubtitleElement) {
            greetingSubtitleElement.textContent =
                profile?.club?.name
                    ? `Ready for golf at ${profile.club.name}?`
                    : "Ready for golf?";
        }
    }

    function showGreetingError(error) {
        console.error(
            "BookIt Home profile failed:",
            error
        );

        if (greetingElement) {
            greetingElement.textContent =
                "Welcome";
        }

        if (greetingSubtitleElement) {
            greetingSubtitleElement.textContent =
                "We could not load all of your account information.";
        }
    }

    /* =========================================================
       DATE HELPERS
       ========================================================= */

    function createLocalDate(dateKey) {
        if (
            !dateKey ||
            typeof dateKey !== "string"
        ) {
            return null;
        }

        const date =
            new Date(
                `${dateKey}T00:00:00`
            );

        if (
            Number.isNaN(
                date.getTime()
            )
        ) {
            return null;
        }

        return date;
    }

    function formatBookingDate(dateKey) {
        const date =
            createLocalDate(dateKey);

        if (!date) {
            return "";
        }

        return new Intl.DateTimeFormat(
            "en-GB",
            {
                weekday: "long",
                day: "numeric",
                month: "long"
            }
        ).format(date);
    }

    /* =========================================================
       UPCOMING BOOKING
       ========================================================= */

    function showNoUpcomingBooking() {
        if (nextRoundCard) {
            nextRoundCard.hidden =
                true;
        }

        if (nextRoundEmpty) {
            nextRoundEmpty.hidden =
                false;
        }
    }

    function renderUpcomingBooking(
        upcoming
    ) {
        if (!upcoming) {
            showNoUpcomingBooking();
            return;
        }

        if (nextRoundCard) {
            nextRoundCard.hidden =
                false;
        }

        if (nextRoundEmpty) {
            nextRoundEmpty.hidden =
                true;
        }

        if (nextRoundTime) {
            nextRoundTime.textContent =
                upcoming.teeTime?.time ||
                "--:--";
        }

        if (nextRoundDate) {
            nextRoundDate.textContent =
                formatBookingDate(
                    upcoming.teeTime
                        ?.playDate
                ) ||
                "Upcoming round";
        }

        if (nextRoundCourse) {
            nextRoundCourse.textContent =
                upcoming.course?.name ||
                "Main Course";
        }

        if (nextRoundPlayers) {
            const playerCount =
                Number(
                    upcoming.booking
                        ?.playerCount ||
                    1
                );

            nextRoundPlayers.textContent =
                `${playerCount} ${
                    playerCount === 1
                        ? "player"
                        : "players"
                }`;
        }
    }

    async function loadUpcomingBooking() {
        try {
            const bookingService =
                window.BookIt.booking;

            if (
                !bookingService ||
                typeof bookingService
                    .getUpcoming !==
                    "function"
            ) {
                showNoUpcomingBooking();
                return;
            }

            const upcoming =
                await bookingService
                    .getUpcoming({
                        forceRefresh: true
                    });

            renderUpcomingBooking(
                upcoming
            );
        } catch (error) {
            console.error(
                "BookIt upcoming booking failed:",
                error
            );

            showNoUpcomingBooking();
        }
    }

    /* =========================================================
       WEATHER ICONS
       ========================================================= */

    function getWeatherIconSvg(iconName) {
        const icons = {
            sun: `
                <svg viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="4" />
                    <path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41" />
                </svg>
            `,

            moon: `
                <svg viewBox="0 0 24 24">
                    <path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11Z" />
                </svg>
            `,

            "partly-cloudy": `
                <svg viewBox="0 0 24 24">
                    <circle cx="8" cy="8" r="3" />
                    <path d="M8 2v1.5M2 8h1.5M3.8 3.8l1.1 1.1M12.2 3.8l-1.1 1.1" />
                    <path d="M6 18h11a4 4 0 0 0 .4-7.98A6 6 0 0 0 6 12a3 3 0 0 0 0 6Z" />
                </svg>
            `,

            "cloudy-night": `
                <svg viewBox="0 0 24 24">
                    <path d="M13 4a5 5 0 0 0 5 7 5 5 0 0 1-6-6 5 5 0 0 1 1-1Z" />
                    <path d="M6 19h11a4 4 0 0 0 .4-7.98A6 6 0 0 0 6 13a3 3 0 0 0 0 6Z" />
                </svg>
            `,

            cloud: `
                <svg viewBox="0 0 24 24">
                    <path d="M5 18h13a4 4 0 0 0 .4-7.98A6.5 6.5 0 0 0 6 12a3 3 0 0 0-1 6Z" />
                </svg>
            `,

            fog: `
                <svg viewBox="0 0 24 24">
                    <path d="M4 8h16M2 12h15M5 16h17M3 20h13" />
                </svg>
            `,

            drizzle: `
                <svg viewBox="0 0 24 24">
                    <path d="M5 13h13a4 4 0 0 0 .4-7.98A6.5 6.5 0 0 0 6 7a3 3 0 0 0-1 6Z" />
                    <path d="M8 16v2M12 16v2M16 16v2" />
                </svg>
            `,

            rain: `
                <svg viewBox="0 0 24 24">
                    <path d="M5 12h13a4 4 0 0 0 .4-7.98A6.5 6.5 0 0 0 6 6a3 3 0 0 0-1 6Z" />
                    <path d="m8 15-1 3M13 15l-1 3M18 15l-1 3" />
                </svg>
            `,

            showers: `
                <svg viewBox="0 0 24 24">
                    <path d="M5 12h13a4 4 0 0 0 .4-7.98A6.5 6.5 0 0 0 6 6a3 3 0 0 0-1 6Z" />
                    <path d="m7 15-1 2M12 15l-1 2M17 15l-1 2M9 19l-1 2M15 19l-1 2" />
                </svg>
            `,

            snow: `
                <svg viewBox="0 0 24 24">
                    <path d="M5 11h13a4 4 0 0 0 .4-7.98A6.5 6.5 0 0 0 6 5a3 3 0 0 0-1 6Z" />
                    <path d="M8 15v6M5.5 16.5l5 3M10.5 16.5l-5 3M16 15v6M13.5 16.5l5 3M18.5 16.5l-5 3" />
                </svg>
            `,

            thunderstorm: `
                <svg viewBox="0 0 24 24">
                    <path d="M5 11h13a4 4 0 0 0 .4-7.98A6.5 6.5 0 0 0 6 5a3 3 0 0 0-1 6Z" />
                    <path d="m13 13-3 5h3l-2 4 6-7h-3l2-2Z" />
                </svg>
            `
        };

        return (
            icons[iconName] ||
            icons.cloud
        );
    }

    /* =========================================================
       WEATHER DISPLAY
       ========================================================= */

    function getWeatherAdvisory(weather) {
        const severity =
            weather.current?.severity;

        if (severity === "severe") {
            return {
                label:
                    "Severe weather conditions",
                type:
                    "severe"
            };
        }

        if (severity === "wet") {
            return {
                label:
                    "Wet conditions likely",
                type:
                    "wet"
            };
        }

        if (severity === "caution") {
            return {
                label:
                    "Take care in current conditions",
                type:
                    "caution"
            };
        }

        return null;
    }

    function setWeatherSeverity(
        severity
    ) {
        if (!weatherCard) {
            return;
        }

        weatherCard.dataset
            .weatherSeverity =
            severity || "normal";

        if (weatherStatusDot) {
            weatherStatusDot.dataset
                .weatherSeverity =
                severity || "normal";
        }
    }

    function renderWeather(weather) {
        const current =
            weather.current || {};

        if (weatherTitle) {
            weatherTitle.textContent =
                `${weather.location?.shortName || "Bells"} today`;
        }

        if (weatherTemperature) {
            weatherTemperature.textContent =
                Number.isFinite(
                    current.temperature
                )
                    ? `${current.temperature}°C`
                    : "--°C";
        }

        if (weatherDescription) {
            const description =
                current.description ||
                "Weather unavailable";

            const feelsLike =
                Number.isFinite(
                    current.feelsLike
                )
                    ? ` · Feels like ${current.feelsLike}°C`
                    : "";

            weatherDescription.textContent =
                `${description}${feelsLike}`;
        }

        if (weatherWind) {
            const windSpeed =
                Number.isFinite(
                    current.windSpeed
                )
                    ? `${current.windSpeed} mph`
                    : "-- mph";

            const gustText =
                Number.isFinite(
                    current.windGust
                ) &&
                current.windGust >
                    current.windSpeed
                    ? ` · Gusts ${current.windGust} mph`
                    : "";

            weatherWind.textContent =
                `Wind ${windSpeed}${gustText}`;
        }

        if (weatherIcon) {
            weatherIcon.innerHTML =
                getWeatherIconSvg(
                    current.icon
                );
        }

        if (weatherUpdated) {
            const cachedLabel =
                weather.cacheStatus ===
                    "stale"
                    ? "Cached"
                    : "Updated";

            weatherUpdated.textContent =
                weather.updatedTime
                    ? `${cachedLabel} ${weather.updatedTime}`
                    : cachedLabel;
        }

        /*
         * The club's official course status will later come
         * from ClubHub. Weather must not automatically close
         * or reopen the course.
         */
        if (weatherCourseStatus) {
            weatherCourseStatus.textContent =
                "Open";
        }

        const advisory =
            getWeatherAdvisory(weather);

        if (weatherAdvisory) {
            if (advisory) {
                weatherAdvisory.hidden =
                    false;

                weatherAdvisory.textContent =
                    advisory.label;

                weatherAdvisory.dataset.type =
                    advisory.type;
            } else {
                weatherAdvisory.hidden =
                    true;

                weatherAdvisory.textContent =
                    "";

                weatherAdvisory.removeAttribute(
                    "data-type"
                );
            }
        }

        setWeatherSeverity(
            current.severity
        );
    }

    function showWeatherLoading() {
        if (weatherTemperature) {
            weatherTemperature.textContent =
                "--°C";
        }

        if (weatherDescription) {
            weatherDescription.textContent =
                "Loading weather...";
        }

        if (weatherWind) {
            weatherWind.textContent =
                "Wind -- mph";
        }

        if (weatherUpdated) {
            weatherUpdated.textContent =
                "Updating...";
        }
    }

    function showWeatherUnavailable(
        error
    ) {
        console.error(
            "BookIt weather failed:",
            error
        );

        if (weatherDescription) {
            weatherDescription.textContent =
                "Live weather unavailable";
        }

        if (weatherWind) {
            weatherWind.textContent =
                "Please check again shortly";
        }

        if (weatherUpdated) {
            weatherUpdated.textContent =
                "Not updated";
        }

        if (weatherIcon) {
            weatherIcon.innerHTML =
                getWeatherIconSvg(
                    "cloud"
                );
        }

        if (weatherAdvisory) {
            weatherAdvisory.hidden =
                true;
        }

        setWeatherSeverity(
            "unavailable"
        );
    }

    async function loadWeather() {
        showWeatherLoading();

        try {
            const weatherService =
                window.BookIt.weather;

            if (
                !weatherService ||
                typeof weatherService.load !==
                    "function"
            ) {
                throw new Error(
                    "The weather service is unavailable."
                );
            }

            const weather =
                await weatherService.load();

            renderWeather(weather);
        } catch (error) {
            showWeatherUnavailable(
                error
            );
        }
    }

    /* =========================================================
       INITIALISATION
       ========================================================= */

    async function initialiseHomePage() {
        let readyData;

        try {
            readyData =
                await window.BookIt.ready;
        } catch (error) {
            showGreetingError(error);
            showNoUpcomingBooking();

            /*
             * Weather does not require member profile data and
             * can still be attempted if application boot partly
             * completed.
             */
            await loadWeather();
            return;
        }

        try {
            const currentProfile =
                window.BookIt.profile &&
                typeof window.BookIt.profile
                    .load === "function"
                    ? await window.BookIt
                        .profile.load({
                            forceRefresh: true
                        })
                    : readyData?.profile;

            renderGreeting(
                currentProfile ||
                readyData?.profile
            );
        } catch (error) {
            if (readyData?.profile) {
                renderGreeting(
                    readyData.profile
                );
            } else {
                showGreetingError(
                    error
                );
            }
        }

        await Promise.allSettled([
            loadUpcomingBooking(),
            loadWeather()
        ]);
    }

    if (
        document.readyState ===
        "loading"
    ) {
        document.addEventListener(
            "DOMContentLoaded",
            initialiseHomePage,
            {
                once: true
            }
        );
    } else {
        initialiseHomePage();
    }
})();