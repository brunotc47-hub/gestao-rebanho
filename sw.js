const CACHE_NAME = 'rebanho-cache-v3';
const APP_SHELL = ['/', '/manifest.json', '/icon-192-v2.png', '/icon-512-v2.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((nomes) =>
      Promise.all(nomes.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const ehPaginaPrincipal = req.mode === 'navigate' ||
    (req.headers.get('accept') || '').includes('text/html');

  if (ehPaginaPrincipal) {
    // Página principal: tenta a internet primeiro (pra sempre trazer a versão mais nova).
    // Sem internet, cai pra última versão salva no aparelho.
    event.respondWith(
      fetch(req)
        .then((resposta) => {
          const copia = resposta.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('/', copia));
          return resposta;
        })
        .catch(() => caches.match('/').then((r) => r || caches.match(req)))
    );
    return;
  }

  // Outros arquivos (fonte, ícones, biblioteca externa): usa o que já tem salvo,
  // e se não tiver, busca na internet e guarda pra próxima vez.
  event.respondWith(
    caches.match(req).then((emCache) => {
      if (emCache) return emCache;
      return fetch(req).then((resposta) => {
        if (resposta && resposta.status === 200) {
          const copia = resposta.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copia));
        }
        return resposta;
      }).catch(() => emCache);
    })
  );
});
