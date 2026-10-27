/* 卡纳克神庙语音导览 - Service Worker 合并版 */
const CACHE_NAME = 'karnak-guide-v1';

/* 核心外壳：必须缓存成功，任一失败则安装失败 */
const SHELL_TO_CACHE = [
  './',
  './index.html',
  './images/kanark.png'
];

/* 点位图片：逐张缓存，单张失败不拖垮安装 */
const IMAGE_URLS = [
  './images/spot1.jpg',
  './images/spot2.jpg',
  './images/spot3.jpg',
  './images/spot5.jpg',
  './images/spot6.jpg',
  './images/spot7.jpg',
  './images/spot8.JPG',
  './images/spot9.jpeg',
  './images/spot10.jpeg',
  './images/spot11.jpeg',
  './images/spot12.jpg',
  './images/spot13.png',
  './images/spot16.JPG',
  './images/spot18.jpg',
  './images/spot23.jpg',
  './images/spot24.jpg',
  './images/spot25.jpg',
  './images/spot26.jpg'
];

/* 语音：逐段缓存，单段失败不拖垮安装 */
const AUDIO_URLS = Array.from({ length: 28 }, (_, i) => `./audio/${i + 1}.mp3`);

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // 外壳：addAll，全部成功才算安装完成
    await cache.addAll(SHELL_TO_CACHE);
    // 图片/音频：逐张添加，单张 404 只跳过该张
    const optional = [...IMAGE_URLS, ...AUDIO_URLS];
    await Promise.all(optional.map((url) =>
      cache.add(url).catch((err) => console.warn('[SW] 跳过缓存失败资源:', url, err))
    ));
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // 不拦截跨域

  event.respondWith((async () => {
    // 1. 缓存命中直接返回
    const cached = await caches.match(request, { ignoreSearch: true });
    if (cached) return cached;

    // 2. 未命中走网络
    try {
      const response = await fetch(request);
      // 运行期把成功响应写入缓存，后续离线可用
      if (response && response.ok) {
        const cache = await caches.open(CACHE_NAME);
        cache.put(request, response.clone());
      }
      return response;
    } catch (err) {
      // 3. 完全离线时，页面导航兜底回缓存的 index.html
      if (request.mode === 'navigate') {
        const fallback = await caches.match('./index.html');
        if (fallback) return fallback;
      }
      throw err;
    }
  })());
});
