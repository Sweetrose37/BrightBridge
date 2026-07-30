const CACHE = "brightbridge-v31";
const CORE = [
  "./",
  "./index.html",
  "./mobile.html",
  "./mobile/",
  "./mobile/index.html",
  "./mobile/mobile.css",
  "./mobile/mobile.js",
  "./mobile/communication-cards.js",
  "./mobile/parent-voices.js",
  "./mobile/approved-videos.js",
  "./mobile/video-approvals.js",
  "./mobile/mobile-tools.js",
  "./mobile/extra-games.js",
  "./refresh.html",
  "./manifest.json",
  "./css/style.css",
  "./css/themes.css",
  "./css/animations.css",
  "./css/responsive.css",
  "./css/memory-journey.css",
  "./js/app.js",
  "./js/navigation.js",
  "./js/accessibility.js",
  "./js/storage.js",
  "./js/voice-library.js",
  "./js/speech.js",
  "./js/audio.js",
  "./js/rewards.js",
  "./js/settings.js",
  "./js/mobile-tools.js",
  "./js/memory-journey.js",
  "./games/alphabet.js",
  "./games/numbers.js",
  "./games/colors.js",
  "./games/shapes.js",
  "./games/matching.js",
  "./games/emotions.js",
  "./games/music.js",
  "./games/nature.js",
  "./games/puzzles.js",
  "./games/dailylife.js",
  "./games/socialskills.js",
  "./assets/icons/icon.svg",
  "./data/animals.json",
  "./data/colors.json",
  "./data/emotions.json",
  "./data/foods.json",
  "./data/lessons.json",
  "./data/phrases.json",
  "./data/shapes.json",
  "./data/numbers.json",
  "./pages/home.html",
  "./pages/communication.html",
  "./pages/learning.html",
  "./pages/sensory.html",
  "./pages/music.html",
  "./pages/nature.html",
  "./pages/emotions.html",
  "./pages/rewards.html",
  "./pages/parent-dashboard.html",
  "./pages/settings.html"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(CORE)));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll({type:"window"}))
      .then(clients => Promise.all(clients.map(client => client.navigate ? client.navigate(client.url) : null)))
  );
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const updateFirst = event.request.mode === "navigate" || ["script","style"].includes(event.request.destination);
  if (updateFirst) {
    event.respondWith(
      fetch(event.request).then(response => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put(event.request, copy));
        }
        return response;
      }).catch(() => caches.match(event.request).then(cached => cached || caches.match("./index.html")))
    );
    return;
  }
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
      const copy = response.clone();
      caches.open(CACHE).then(cache => cache.put(event.request, copy));
      return response;
    }).catch(() => caches.match("./index.html")))
  );
});
