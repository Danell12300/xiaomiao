// 小喵饮食管家 Service Worker - 离线优先策略
const CACHE_NAME = 'xiao-miao-v2';
const STATIC_ASSETS = [
  '/',
  '/record',
  '/recommend',
  '/check',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// 安装时缓存核心页面和资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {
        // Some assets may fail, continue anyway
      });
    })
  );
  self.skipWaiting();
});

// 激活时清理旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// 请求拦截：缓存优先，离线也能用
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  
  const url = new URL(event.request.url);
  
  // 对于导航请求，使用缓存优先
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        // 后台更新缓存
        fetch(event.request).then((response) => {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, response);
          });
        }).catch(() => {});
        return cached || fetch(event.request);
      })
    );
    return;
  }
  
  // 对于静态资源（JS/CSS/图片），缓存优先
  if (url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|ico|woff|woff2|ttf)$/)) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, response.clone());
          });
          return response;
        });
      })
    );
    return;
  }
  
  // 其他请求：网络优先，失败回退缓存
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, clone);
        });
        return response;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
