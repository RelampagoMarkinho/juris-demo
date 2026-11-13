// Service worker do PWA (Juris — versão de demonstração).
// - Páginas: busca sempre na rede (dados sempre atualizados); sem internet, mostra /offline.html.
// - Arquivos estáticos do Next (/_next/static) e ícones: guardados em cache (carregam mais rápido).
// - Firebase, APIs e outros domínios: nunca passam pelo cache.

const VERSAO = "nj-v1";
const ESTATICO = `${VERSAO}-estatico`;
const PRECACHE = ["/offline.html", "/icones/icone-192.png", "/icones/icone-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(ESTATICO).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((chaves) => Promise.all(chaves.filter((k) => !k.startsWith(VERSAO)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;       // Firebase, fontes, CNJ etc.
  if (url.pathname.startsWith("/api/")) return;          // rotas do servidor

  // Navegação entre páginas: rede primeiro; sem conexão, página offline.
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).catch(() => caches.match("/offline.html")));
    return;
  }

  // Arquivos estáticos versionados: cache primeiro.
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icones/") || url.pathname.startsWith("/timbrado/")) {
    e.respondWith(
      caches.match(req).then((emCache) => emCache || fetch(req).then((resp) => {
        if (resp.ok) { const copia = resp.clone(); caches.open(ESTATICO).then((c) => c.put(req, copia)); }
        return resp;
      })),
    );
  }
});
