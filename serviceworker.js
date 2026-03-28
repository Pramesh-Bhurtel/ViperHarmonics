const cacheName = "viperharmonics-cache-v4";
const assets = [
  "./",
  "./index.html",
  "./css/base.css",
  "./css/layout.css",
  "./css/components.css",
  "./js/app.js",
  "./js/audio-engine.js",
  "./js/controls.js",
  "./js/input-handler.js",
  "./js/keyboard.js",
  "./js/midi-handler.js",
  "./js/notation.js",
  "./js/notation-player.js",
  "./js/qrcode-generator.js",
  "./js/share.js",
  "./js/sound-effects.js",
  "./js/state.js",
  "./js/visualizer.js",
  "./assets/sounds/harmonium-kannan-orig.wav",
  "./assets/sounds/reverb.wav"
];

self.addEventListener("install", installEvent => {
  installEvent.waitUntil(
    caches.open(cacheName).then(cache => {
      return cache.addAll(assets);
    })
  );
});

self.addEventListener("fetch", fetchEvent => {
  fetchEvent.respondWith(
    caches.match(fetchEvent.request).then(res => {
      return res || fetch(fetchEvent.request);
    })
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== cacheName).map(k => caches.delete(k)))
    )
  );
});