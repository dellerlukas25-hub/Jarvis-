self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    (async () => {

      const cacheNames = await caches.keys();

      for (const name of cacheNames) {
        await caches.delete(name);
      }

      await self.registration.unregister();

    })()
  );
});