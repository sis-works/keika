/* けいさんカード：電波がなくても動かすための裏方のプログラム
   設計方針：
   - ページ本体（index.html）は「まずネットから取りに行き、だめならiPhoneの中の保存分を使う」。
     こうすると、ファイルを更新したときは電波があれば次に開いたとき新しい版になり、
     電波がないときも前の版で動く。
   - アイコンや文字の形（フォント）などは「保存分があればそれを使い、なければ取りに行って保存する」。
     変わらないものなので、速さを優先する。
   - 保存の名前（CACHE）の末尾の数字を上げると、古い保存分を消して入れ直す。 */
const CACHE = 'keika-v1';
const CORE = ['./', 'index.html', 'manifest.json', 'icon-180.png', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  // ページ本体：ネット優先、だめなら保存分
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put('index.html', copy)); return res; })
        .catch(() => caches.match('index.html'))
    );
    return;
  }

  // それ以外：保存分優先、なければ取りに行って保存
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res && (res.ok || res.type === 'opaque')) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
      }
      return res;
    }))
  );
});
