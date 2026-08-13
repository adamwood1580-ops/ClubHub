const CACHE_NAME = "clubhub-v2";

const FILES_TO_CACHE = [
    "./",
    "./index.html",
    "./stableford.html",
    "./strokeplay.html",
    "./fourbbb.html",

    "./styles/main.css",
    "./styles/stableford.css",

    "./js/course-data.js",
    "./js/stableford.js",
    "./js/strokeplay.js",
    "./js/fourbbb.js",
    "./greensomes.html",
    "./js/greensomes.js",
    "./texasscramble.html",
    "./js/texasscramble.js",

    "./assets/bells-logo.PNG",
    "./assets/course-bg.JPG",
    "./assets/app.PNG"
];

self.addEventListener("install", event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(FILES_TO_CACHE);
        })
    );

    self.skipWaiting();
});

self.addEventListener("activate", event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );

    self.clients.claim();
});

self.addEventListener("fetch", event => {
    event.respondWith(
        caches.match(event.request).then(cachedResponse => {
            return cachedResponse || fetch(event.request);
        })
    );
});
