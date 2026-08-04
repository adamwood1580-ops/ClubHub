(function () {
    "use strict";

    window.BookIt = window.BookIt || {};

    /* =========================================================
       BELLS WEATHER SERVICE
       ========================================================= */

    const WEATHER_API_URL =
        "https://api.open-meteo.com/v1/forecast";

    const CLUB_LOCATION = {
        name: "Bells Hotel & Country Club",
        shortName: "Bells",
        latitude: 51.7936,
        longitude: -2.6150,
        timezone: "Europe/London"
    };

    const CACHE_KEY =
        "bookit_bells_weather";

    const CACHE_DURATION_MS =
        15 * 60 * 1000;

    let memoryCache = null;
    let loadingPromise = null;

    /* =========================================================
       BASIC HELPERS
       ========================================================= */

    function isFiniteNumber(value) {
        return Number.isFinite(
            Number(value)
        );
    }

    function roundNumber(value) {
        if (!isFiniteNumber(value)) {
            return null;
        }

        return Math.round(
            Number(value)
        );
    }

    function getArrayValue(
        collection,
        key,
        index
    ) {
        if (
            !collection ||
            !Array.isArray(collection[key])
        ) {
            return null;
        }

        return collection[key][index] ?? null;
    }

    function formatUpdatedTime(value) {
        if (!value) {
            return "";
        }

        const date =
            new Date(value);

        if (
            Number.isNaN(
                date.getTime()
            )
        ) {
            return "";
        }

        return new Intl.DateTimeFormat(
            "en-GB",
            {
                hour: "2-digit",
                minute: "2-digit",
                hour12: false
            }
        ).format(date);
    }

    /* =========================================================
       WEATHER CODE HELPERS
       ========================================================= */

    function getWeatherDescription(
        weatherCode,
        isDay
    ) {
        const code =
            Number(weatherCode);

        const daylight =
            Number(isDay) === 1;

        const descriptions = {
            0: daylight
                ? "Clear sky"
                : "Clear night",

            1: "Mainly clear",
            2: "Partly cloudy",
            3: "Overcast",

            45: "Fog",
            48: "Freezing fog",

            51: "Light drizzle",
            53: "Drizzle",
            55: "Heavy drizzle",

            56: "Light freezing drizzle",
            57: "Freezing drizzle",

            61: "Light rain",
            63: "Rain",
            65: "Heavy rain",

            66: "Light freezing rain",
            67: "Freezing rain",

            71: "Light snow",
            73: "Snow",
            75: "Heavy snow",
            77: "Snow grains",

            80: "Light rain showers",
            81: "Rain showers",
            82: "Heavy rain showers",

            85: "Light snow showers",
            86: "Heavy snow showers",

            95: "Thunderstorms",
            96: "Thunderstorms with hail",
            99: "Severe thunderstorms with hail"
        };

        return (
            descriptions[code] ||
            "Weather unavailable"
        );
    }

    function getWeatherIconName(
        weatherCode,
        isDay
    ) {
        const code =
            Number(weatherCode);

        const daylight =
            Number(isDay) === 1;

        if (code === 0) {
            return daylight
                ? "sun"
                : "moon";
        }

        if (
            code === 1 ||
            code === 2
        ) {
            return daylight
                ? "partly-cloudy"
                : "cloudy-night";
        }

        if (code === 3) {
            return "cloud";
        }

        if (
            code === 45 ||
            code === 48
        ) {
            return "fog";
        }

        if (
            code >= 51 &&
            code <= 57
        ) {
            return "drizzle";
        }

        if (
            code >= 61 &&
            code <= 67
        ) {
            return "rain";
        }

        if (
            code >= 71 &&
            code <= 77
        ) {
            return "snow";
        }

        if (
            code >= 80 &&
            code <= 82
        ) {
            return "showers";
        }

        if (
            code >= 85 &&
            code <= 86
        ) {
            return "snow";
        }

        if (code >= 95) {
            return "thunderstorm";
        }

        return "cloud";
    }

    function getWeatherSeverity(
        weatherCode,
        precipitation
    ) {
        const code =
            Number(weatherCode);

        const rain =
            Number(precipitation || 0);

        if (
            code >= 95 ||
            code === 67 ||
            code === 75 ||
            code === 82 ||
            code === 86
        ) {
            return "severe";
        }

        if (
            rain >= 2 ||
            (
                code >= 61 &&
                code <= 65
            ) ||
            (
                code >= 80 &&
                code <= 81
            )
        ) {
            return "wet";
        }

        if (
            code === 45 ||
            code === 48 ||
            (
                code >= 51 &&
                code <= 57
            )
        ) {
            return "caution";
        }

        return "normal";
    }

    /* =========================================================
       CACHE
       ========================================================= */

    function isCacheFresh(cache) {
        if (
            !cache ||
            !isFiniteNumber(
                cache.cachedAt
            )
        ) {
            return false;
        }

        return (
            Date.now() -
                Number(cache.cachedAt) <
            CACHE_DURATION_MS
        );
    }

    function readStoredCache() {
        try {
            const raw =
                window.localStorage.getItem(
                    CACHE_KEY
                );

            if (!raw) {
                return null;
            }

            const parsed =
                JSON.parse(raw);

            if (
                !parsed ||
                typeof parsed !== "object"
            ) {
                return null;
            }

            return parsed;
        } catch (error) {
            console.warn(
                "BookIt could not read the weather cache:",
                error
            );

            return null;
        }
    }

    function saveStoredCache(cache) {
        try {
            window.localStorage.setItem(
                CACHE_KEY,
                JSON.stringify(cache)
            );
        } catch (error) {
            console.warn(
                "BookIt could not save the weather cache:",
                error
            );
        }
    }

    function getFreshCache() {
        if (
            isCacheFresh(memoryCache)
        ) {
            return memoryCache;
        }

        const storedCache =
            readStoredCache();

        if (
            isCacheFresh(storedCache)
        ) {
            memoryCache =
                storedCache;

            return storedCache;
        }

        return null;
    }

    function getStaleCache() {
        if (memoryCache) {
            return memoryCache;
        }

        const storedCache =
            readStoredCache();

        if (storedCache) {
            memoryCache =
                storedCache;
        }

        return storedCache;
    }

    function clearCache() {
        memoryCache = null;
        loadingPromise = null;

        try {
            window.localStorage.removeItem(
                CACHE_KEY
            );
        } catch (error) {
            console.warn(
                "BookIt could not clear the weather cache:",
                error
            );
        }
    }

    /* =========================================================
       OPEN-METEO REQUEST
       ========================================================= */

    function buildRequestUrl() {
        const url =
            new URL(
                WEATHER_API_URL
            );

        url.searchParams.set(
            "latitude",
            String(
                CLUB_LOCATION.latitude
            )
        );

        url.searchParams.set(
            "longitude",
            String(
                CLUB_LOCATION.longitude
            )
        );

        url.searchParams.set(
            "current",
            [
                "temperature_2m",
                "apparent_temperature",
                "precipitation",
                "weather_code",
                "cloud_cover",
                "wind_speed_10m",
                "wind_gusts_10m",
                "is_day"
            ].join(",")
        );

        url.searchParams.set(
            "daily",
            [
                "temperature_2m_max",
                "temperature_2m_min",
                "precipitation_probability_max",
                "sunrise",
                "sunset"
            ].join(",")
        );

        url.searchParams.set(
            "temperature_unit",
            "celsius"
        );

        url.searchParams.set(
            "wind_speed_unit",
            "mph"
        );

        url.searchParams.set(
            "precipitation_unit",
            "mm"
        );

        url.searchParams.set(
            "timezone",
            CLUB_LOCATION.timezone
        );

        url.searchParams.set(
            "forecast_days",
            "1"
        );

        return url;
    }

    async function requestWeather() {
        const requestUrl =
            buildRequestUrl();

        const response =
            await fetch(
                requestUrl.href,
                {
                    method: "GET",
                    cache: "no-store",
                    headers: {
                        Accept:
                            "application/json"
                    }
                }
            );

        if (!response.ok) {
            throw new Error(
                `Weather request failed (${response.status}).`
            );
        }

        const data =
            await response.json();

        if (
            !data ||
            !data.current
        ) {
            throw new Error(
                "The weather service returned no current conditions."
            );
        }

        return data;
    }

    /* =========================================================
       RESPONSE NORMALISATION
       ========================================================= */

    function normaliseWeather(response) {
        const current =
            response.current || {};

        const daily =
            response.daily || {};

        const weatherCode =
            Number(
                current.weather_code
            );

        const precipitation =
            isFiniteNumber(
                current.precipitation
            )
                ? Number(
                    current.precipitation
                )
                : 0;

        const fetchedAt =
            new Date().toISOString();

        return {
            location: {
                name:
                    CLUB_LOCATION.name,

                shortName:
                    CLUB_LOCATION.shortName,

                latitude:
                    CLUB_LOCATION.latitude,

                longitude:
                    CLUB_LOCATION.longitude,

                timezone:
                    CLUB_LOCATION.timezone
            },

            current: {
                temperature:
                    roundNumber(
                        current.temperature_2m
                    ),

                feelsLike:
                    roundNumber(
                        current.apparent_temperature
                    ),

                weatherCode,

                description:
                    getWeatherDescription(
                        weatherCode,
                        current.is_day
                    ),

                icon:
                    getWeatherIconName(
                        weatherCode,
                        current.is_day
                    ),

                severity:
                    getWeatherSeverity(
                        weatherCode,
                        precipitation
                    ),

                precipitation,

                cloudCover:
                    roundNumber(
                        current.cloud_cover
                    ),

                windSpeed:
                    roundNumber(
                        current.wind_speed_10m
                    ),

                windGust:
                    roundNumber(
                        current.wind_gusts_10m
                    ),

                isDay:
                    Number(
                        current.is_day
                    ) === 1,

                observationTime:
                    current.time || null
            },

            today: {
                maximumTemperature:
                    roundNumber(
                        getArrayValue(
                            daily,
                            "temperature_2m_max",
                            0
                        )
                    ),

                minimumTemperature:
                    roundNumber(
                        getArrayValue(
                            daily,
                            "temperature_2m_min",
                            0
                        )
                    ),

                precipitationChance:
                    roundNumber(
                        getArrayValue(
                            daily,
                            "precipitation_probability_max",
                            0
                        )
                    ),

                sunrise:
                    getArrayValue(
                        daily,
                        "sunrise",
                        0
                    ),

                sunset:
                    getArrayValue(
                        daily,
                        "sunset",
                        0
                    )
            },

            fetchedAt,

            updatedTime:
                formatUpdatedTime(
                    fetchedAt
                ),

            source:
                "Open-Meteo"
        };
    }

    /* =========================================================
       PUBLIC METHODS
       ========================================================= */

    async function loadWeather(
        options = {}
    ) {
        const forceRefresh =
            options.forceRefresh === true;

        if (!forceRefresh) {
            const freshCache =
                getFreshCache();

            if (freshCache) {
                return Object.assign(
                    {},
                    freshCache.weather,
                    {
                        cacheStatus:
                            "fresh"
                    }
                );
            }
        }

        if (
            loadingPromise &&
            !forceRefresh
        ) {
            return loadingPromise;
        }

        loadingPromise =
            (async function () {
                try {
                    const response =
                        await requestWeather();

                    const weather =
                        normaliseWeather(
                            response
                        );

                    const cache = {
                        cachedAt:
                            Date.now(),

                        weather
                    };

                    memoryCache =
                        cache;

                    saveStoredCache(
                        cache
                    );

                    return Object.assign(
                        {},
                        weather,
                        {
                            cacheStatus:
                                "network"
                        }
                    );
                } catch (error) {
                    const staleCache =
                        getStaleCache();

                    if (
                        staleCache &&
                        staleCache.weather
                    ) {
                        console.warn(
                            "BookIt is using cached weather because the live request failed:",
                            error
                        );

                        return Object.assign(
                            {},
                            staleCache.weather,
                            {
                                cacheStatus:
                                    "stale",

                                warning:
                                    error.message ||
                                    "Live weather is unavailable."
                            }
                        );
                    }

                    throw error;
                } finally {
                    loadingPromise =
                        null;
                }
            })();

        return loadingPromise;
    }

    function refreshWeather() {
        return loadWeather({
            forceRefresh: true
        });
    }

    window.BookIt.weather = {
        load:
            loadWeather,

        refresh:
            refreshWeather,

        clearCache,

        getLocation:
            function () {
                return Object.assign(
                    {},
                    CLUB_LOCATION
                );
            },

        getDescription:
            getWeatherDescription,

        getIconName:
            getWeatherIconName
    };
})();