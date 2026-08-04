(function () {
    "use strict";

    window.BookIt = window.BookIt || {};

    console.log(
        "BookIt weather service loaded successfully."
    );

    async function loadWeather() {
        return {
            location: {
                name:
                    "Bells Hotel & Country Club",
                shortName:
                    "Bells",
                timezone:
                    "Europe/London"
            },

            current: {
                temperature: 18,
                feelsLike: 18,
                weatherCode: 0,
                description:
                    "Weather test",
                icon:
                    "sun",
                severity:
                    "normal",
                precipitation: 0,
                cloudCover: 0,
                windSpeed: 5,
                windGust: 8,
                isDay: true,
                observationTime: null
            },

            today: {
                maximumTemperature: 20,
                minimumTemperature: 12,
                precipitationChance: 0,
                sunrise: null,
                sunset: null
            },

            fetchedAt:
                new Date().toISOString(),

            updatedTime:
                new Intl.DateTimeFormat(
                    "en-GB",
                    {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: false
                    }
                ).format(new Date()),

            source:
                "BookIt test",

            cacheStatus:
                "test"
        };
    }

    window.BookIt.weather = {
        load:
            loadWeather,

        refresh:
            loadWeather,

        clearCache:
            function () {},

        getLocation:
            function () {
                return {
                    name:
                        "Bells Hotel & Country Club",
                    shortName:
                        "Bells",
                    latitude:
                        51.7936,
                    longitude:
                        -2.615,
                    timezone:
                        "Europe/London"
                };
            }
    };
})();