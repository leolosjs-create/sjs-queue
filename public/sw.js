self.addEventListener('install', (e) => {
  console.log('[Service Worker] Installed');
});

self.addEventListener('fetch', (e) => {
  // This empty fetch listener satisfies the PWA installability requirement
});