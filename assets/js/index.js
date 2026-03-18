/**
 * GARISREY — index.js
 * Logic halaman Beranda
 * Urutan section: Koleksi Terkini → Hero → About → CTA → Sticker → Footer
 */

/* ── STATE ── */
let products = [];
let wishlist  = getWishlist();

/* ══════════════════════════════════════
   LOADING SCREEN CONTROLLER (2 detik)
══════════════════════════════════════ */
function runLoadingScreen() {
  const loader = document.getElementById('pageLoader');
  const pctEl  = document.getElementById('plPct');
  if (!loader) return;

  // Counter persen 0→100 dalam 1.8 detik, easing cubic
  const duration = 1800;
  const start    = performance.now();

  const tick = (now) => {
    const progress = Math.min((now - start) / duration, 1);
    const eased    = progress < .5
      ? 4 * progress * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 3) / 2;
    if (pctEl) pctEl.textContent = Math.floor(eased * 100) + '%';
    if (progress < 1) requestAnimationFrame(tick);
    else if (pctEl) pctEl.textContent = '100%';
  };
  requestAnimationFrame(tick);

  // Hapus dari DOM setelah CSS animation selesai (2s delay + 0.55s fade)
  setTimeout(() => {
    loader.addEventListener('animationend', () => { loader.style.display = 'none'; }, { once: true });
    setTimeout(() => { loader.style.display = 'none'; }, 700);
  }, 2000);
}

/* ══════════════════════════════════════
   INIT
══════════════════════════════════════ */
async function init() {
  runLoadingScreen();

  buildMarquee('mqTrack');
  initNavScroll('navbar');
  initAccDropdownClose();
  loadLogoAssets();
  loadAboutImages();
  initAuth();

  // Load produk dengan timeout 5 detik
  try {
    await Promise.race([
      loadProducts(),
      new Promise(r => setTimeout(r, 5000))
    ]);
  } catch (_) {}

  renderGrid();

  // Load hero background non-blocking
  loadHero();

  // Realtime subscription
  sb.channel('products-live')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, async () => {
      await loadProducts();
      renderGrid();
    })
    .subscribe();
}

/* ══════════════════════════════════════
   LOGO ASSETS
   Hanya muat stiker (satu gambar di sticker-sec)
   dan logo footer
══════════════════════════════════════ */
function loadLogoAssets() {
  // Sembunyikan wordmark jika logo nav ada
  const wm = document.getElementById('navWordmark');
  if (wm) wm.style.display = 'none';

  // Stiker (satu-satunya asset di sticker-sec)
  loadAssetWithFallback(
    document.getElementById('lgStiker'),
    'assets/logo/stiker.png',
    'logo/stiker.png'
  );

  // Footer logo
  loadAssetWithFallback(
    document.getElementById('footLogo'),
    'assets/logo/logotransparan.png',
    'logo/logotransparan.png'
  );
}

/* ══════════════════════════════════════
   ABOUT IMAGES FALLBACK
══════════════════════════════════════ */
function loadAboutImages() {
  const a1 = document.getElementById('aboutImg1');
  const a2 = document.getElementById('aboutImg2');
  if (a1) {
    a1.onerror = () => {
      const imgs = products.flatMap(p => p.images || []);
      if (imgs[0]) { a1.src = imgs[0]; a1.onerror = null; }
    };
  }
  if (a2) {
    a2.onerror = () => {
      const imgs = products.flatMap(p => p.images || []);
      if (imgs[1]) { a2.src = imgs[1]; a2.onerror = null; }
    };
  }
}

/* ══════════════════════════════════════
   HERO LOADER
   Isi background hero section (section 2)
   dari Supabase settings → video lokal → gambar lokal
══════════════════════════════════════ */
async function loadHero() {
  const bg = document.getElementById('heroBg');
  if (!bg) return;
  let cfg = {};

  try {
    const { data } = await Promise.race([
      sb.from('settings').select('value').eq('key', 'beranda').single(),
      new Promise(r => setTimeout(() => r({ data: null }), 3000))
    ]);
    cfg = data?.value || {};
  } catch (_) {}

  const heroVid  = cfg.heroVideo  || null;
  const heroImgs = cfg.heroImages || [];

  if (heroVid) {
    bg.innerHTML = `<video src="${heroVid}" autoplay muted loop playsinline style="width:100%;height:100%;object-fit:cover;opacity:.55"></video>`;
    return;
  }

  if (heroImgs.length) {
    bg.innerHTML = `<img src="${heroImgs[0]}" alt="Garisrey" style="width:100%;height:100%;object-fit:cover;opacity:.65"/>`;
    if (heroImgs.length > 1) {
      let idx = 0;
      setInterval(() => {
        idx = (idx + 1) % heroImgs.length;
        const im = bg.querySelector('img');
        if (im) { im.style.opacity = 0; setTimeout(() => { im.src = heroImgs[idx]; im.style.opacity = '.65'; }, 400); }
      }, 5000);
    }
    return;
  }

  // Fallback: video lokal → gambar lokal → gambar produk
  tryLoadVideo(
    ['assets/vid/1.MOV', 'assets/vid/2.mp4', 'assets/vid/1.mp4', 'assets/vid/2.MOV'],
    bg,
    ['assets/img/1.jpeg', 'assets/img/2.jpeg', 'assets/img/3.jpeg', 'assets/img/4.jpeg']
  );
}

function tryLoadVideo(vids, container, imgFallbacks, vidIdx = 0) {
  if (vidIdx >= vids.length) { tryLoadImg(imgFallbacks, container, 0); return; }
  const v = document.createElement('video');
  v.autoplay = true; v.muted = true; v.loop = true; v.playsInline = true;
  v.style.cssText = 'width:100%;height:100%;object-fit:cover;opacity:.55';
  v.oncanplay = () => container.appendChild(v);
  v.onerror   = () => tryLoadVideo(vids, container, imgFallbacks, vidIdx + 1);
  v.src = vids[vidIdx];
}

function tryLoadImg(imgs, container, imgIdx) {
  if (imgIdx >= imgs.length) {
    if (products.length) {
      const src = (products[0].images || [])[0];
      if (src) container.innerHTML = `<img src="${src}" alt="Garisrey" style="width:100%;height:100%;object-fit:cover;opacity:.6"/>`;
    }
    return;
  }
  const el = document.createElement('img');
  el.style.cssText = 'width:100%;height:100%;object-fit:cover;opacity:.65';
  el.alt    = 'Garisrey';
  el.onload  = () => container.appendChild(el);
  el.onerror = () => tryLoadImg(imgs, container, imgIdx + 1);
  el.src = imgs[imgIdx];
}

/* ══════════════════════════════════════
   LOAD PRODUCTS
══════════════════════════════════════ */
async function loadProducts() {
  const { data } = await sb.from('products')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false });
  products = data || [];
}

/* ══════════════════════════════════════
   RENDER GRID (4 produk terbaru)
══════════════════════════════════════ */
function renderGrid() {
  const grid  = document.getElementById('prodsGrid');
  const state = document.getElementById('loadingState');
  if (!grid) return;

  if (state) state.style.display = 'none';
  grid.style.display = 'grid';

  if (!products.length) {
    grid.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:60px 0">
        <p style="font-size:11px;color:var(--gray);letter-spacing:.2em;text-transform:uppercase">
          Belum ada produk
        </p>
      </div>`;
    return;
  }

  wishlist = getWishlist();
  const show = products.slice(0, 4);

  grid.innerHTML = show.map(p => `
    <div class="prod-card" onclick="openDetail('${p.id}')">
      <div class="prod-card-img">
        <img src="${(p.images || [])[0] || ''}" alt="${p.name}" loading="lazy"
          onerror="this.style.minHeight='200px'"/>
        ${p.badge ? `<span class="prod-card-badge b-${p.badge}">${p.badge}</span>` : ''}
        <button class="prod-card-wish${wishlist.includes(p.id) ? ' wished' : ''}"
          onclick="event.stopPropagation();handleToggleWish('${p.id}')">
          ${wishlist.includes(p.id) ? '♥' : '♡'}
        </button>
        <div class="prod-card-overlay"></div>
        <div class="prod-card-quick" onclick="event.stopPropagation()">
          <button class="btn btn-red" style="flex:1;font-size:8px;padding:10px 12px"
            onclick="openDetail('${p.id}')">Lihat Detail</button>
          <button class="btn btn-outline" style="font-size:8px;padding:10px 12px"
            onclick="handleQuickWA('${p.id}')">WA</button>
        </div>
      </div>
      <div class="prod-card-body">
        <p class="prod-card-brand">${p.brand || 'Garisrey'}</p>
        <h3 class="prod-card-name">${p.name}</h3>
        <p class="prod-card-sub">${p.tagline || ''}</p>
        <div class="prod-card-price">
          <span class="price-main">
            <sup style="font-size:.55em;vertical-align:super">Rp</sup>${fmt(p.price)}
          </span>
          ${p.price_ori > p.price
            ? `<span class="price-ori">Rp${fmt(p.price_ori)}</span>
               <span class="price-disc">-${disc(p)}%</span>`
            : ''}
        </div>
      </div>
    </div>`).join('');

  renderFooterProducts(products);
  animateCounter('statProds', products.length);
}

/* ══════════════════════════════════════
   HANDLERS
══════════════════════════════════════ */
function handleToggleWish(id) {
  toggleWishlistItem(id, () => {
    wishlist = getWishlist();
    renderGrid();
    const wb = document.getElementById('wishBtn');
    if (wb && modalState.product?.id === id) {
      wb.textContent = wishlist.includes(id) ? '♥ Disimpan' : '♡ Simpan';
    }
  });
}

function handleQuickWA(id) {
  const p = products.find(x => x.id === id);
  if (p) quickWA(p.name);
}

function openDetail(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;
  openProductModal(p, getWishlist());
}

function modalToggleWish() {
  if (!modalState.product) return;
  handleToggleWish(modalState.product.id);
}

/* ── EXPOSE ── */
window.openDetail       = openDetail;
window.handleToggleWish = handleToggleWish;
window.handleQuickWA    = handleQuickWA;
window.modalToggleWish  = modalToggleWish;

/* ── START ── */
document.addEventListener('DOMContentLoaded', () => {
  sb = initSupabase();
  if (!sb) { console.error('[Garisrey] Supabase tidak terinitalisasi'); return; }
  init().catch(console.error);
});
