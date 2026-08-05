(function () {
    "use strict";

    /* =========================================================
       BOOKIT PROTECTED PAGE LOADER
       ========================================================= */

    const loaderScript =
        document.currentScript;

    if (!loaderScript) {
        console.error(
            "BookIt protected loader could not identify its script element."
        );

        return;
    }

    /*
     * Shared scripts loaded on every protected page.
     *
     * Boot always loads separately and before these scripts.
     */
    const SHARED_SCRIPTS = [
        "../js/ui/header.js",
        "../js/ui/navigation.js"
    ];

    /*
     * Page-specific dependency map.
     *
     * The key must match the page's:
     *
     * <body data-page="...">
     */
    const PAGE_SCRIPTS = {
        home: [
            "../js/core/booking.js",
            "../js/pages/home-page.js",
            "../js/core/weather.js"