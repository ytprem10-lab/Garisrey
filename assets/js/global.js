/**
 * GARISREY — global.js
 * Shared utilities: Supabase, Auth, Nav, Toast, Modal, Cart
 */

/* ── SUPABASE CONFIG ── */
const SUPABASE_URL  = 'https://dhfelzylnicdskzibsqx.supabase.co';
const SUPABASE_ANON = 'sb_publishable_anhuhVrAepwy4EcS5nMunQ_rYBSgBGH';
const ADMIN_EMAIL   = 'ytpremmalang10@gmail.com';
const WA_NUMBER     = '6281234567890';

// Inisialisasi Supabase client (ESM sudah di-import di HTML)
let sb;
function initSupabase() {
  if (typeof supabase !== 'undefined' && supabase.createClient) {
    sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
  }
  return sb;
}

/* ── FORMAT HELPERS ── */
const fmt  = n => (n || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const disc = p => p.price_ori > p.price ? Math.round((1 - p.price / p.price_ori) * 100) : 0;

/* ── WISHLIST (localStorage) ── */
function getWishlist() {
  try { return JSON.parse(localStorage.getItem('gr_wishlist') || '[]'); } catch { return []; }
}

function saveWishlist(list) {
  localStorage.setItem('gr_wishlist', JSON.stringify(list));
}

function toggleWishlistItem(id, onSuccess) {
  const list = getWishlist();
  const idx  = list.indexOf(id);
  if (idx === -1) {
    list.push(id);
    showToast('Ditambahkan ke wishlist ♥', 'ok');
  } else {
    list.splice(idx, 1);
    showToast('Dihapus dari wishlist', 'info');
  }
  saveWishlist(list);
  if (onSuccess) onSuccess(list);
}

/* ── TOAST ── */
function showToast(msg, type = 'info') {
  const icons = { ok: '✅', err: '❌', info: 'ℹ️' };
  let wrap = document.getElementById('toastWrap');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.id = 'toastWrap';
    wrap.className = 'toast-wrap';
    document.body.appendChild(wrap);
  }
  const el = document.createElement('div');
  el.className = `toast t-${type}`;
  el.textContent = (icons[type] || '') + ' ' + msg;
  wrap.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

/* ── MARQUEE ── */
function buildMarquee(containerId = 'mqTrack') {
  const items = ['Garisrey', 'From East to Peace', 'Made in Indonesia', 'Baggy Build', 'Local Pride', 'Denim Culture', 'SS 2025', '#GarisreyID'];
  const track = document.getElementById(containerId);
  if (!track) return;
  track.innerHTML = '';
  [1, 2].forEach(() => items.forEach(item => {
    const s = document.createElement('span');
    s.className = 'mq-item';
    s.textContent = item;
    track.appendChild(s);
    const d = document.createElement('span');
    d.className = 'mq-sep';
    d.textContent = '✦';
    track.appendChild(d);
  }));
}

/* ── HAMBURGER / DRAWER ── */
function toggleDrawer() {
  const drawer  = document.getElementById('drawer');
  const hamBtn  = document.getElementById('hamBtn');
  if (!drawer) return;
  drawer.classList.toggle('open');
  if (hamBtn) hamBtn.classList.toggle('open');
}

function closeDrawer() {
  const drawer = document.getElementById('drawer');
  const hamBtn = document.getElementById('hamBtn');
  if (drawer) drawer.classList.remove('open');
  if (hamBtn) hamBtn.classList.remove('open');
}

/* ── NAV SCROLL EFFECT ── */
function initNavScroll(navId = 'navbar') {
  const nav = document.getElementById(navId);
  if (!nav) return;
  const handler = () => nav.classList.toggle('solid', scrollY > 60);
  window.addEventListener('scroll', handler, { passive: true });
}

/* ── ACCOUNT DROPDOWN ── */
function toggleAccMenu() {
  const menu = document.getElementById('accMenu');
  if (menu) menu.classList.toggle('open');
}

function initAccDropdownClose() {
  document.addEventListener('click', e => {
    const wrap = document.getElementById('accWrap');
    const menu = document.getElementById('accMenu');
    if (wrap && menu && !wrap.contains(e.target)) {
      menu.classList.remove('open');
    }
  });
}

/* ── AUTH INIT (update nav berdasarkan sesi) ── */
async function initAuth(options = {}) {
  if (!sb) return;
  try {
    const { data: { session } } = await sb.auth.getSession();
    if (!session?.user) return;
    const u    = session.user;
    const name = u.user_metadata?.full_name?.split(' ')[0] || u.email.split('@')[0];

    // Update nav
    const accWrap = document.getElementById('accWrap');
    const navAuth = document.getElementById('navAuthBtn');
    const accName  = document.getElementById('accMenuName');
    const accEmail = document.getElementById('accMenuEmail');
    const drLogin  = document.getElementById('drLogin');
    const drLogout = document.getElementById('drLogout');

    if (accWrap) accWrap.style.display = 'block';
    if (navAuth) navAuth.style.display = 'none';
    if (accName)  accName.textContent  = name;
    if (accEmail) accEmail.textContent = u.email;
    if (drLogin)  drLogin.style.display  = 'none';
    if (drLogout) drLogout.style.display = 'block';

    if (options.onSession) options.onSession(session.user);
  } catch (e) {
    console.warn('[initAuth]', e);
  }
}

async function doLogout() {
  if (!sb) return;
  await sb.auth.signOut();
  window.location.reload();
}

/* ── REDIRECT AFTER LOGIN ── */
function redirectAfterLogin(email) {
  // Tentukan base path secara dinamis agar kompatibel semua halaman
  const isInPages = window.location.pathname.includes('/pages/');
  const base = isInPages ? '' : 'pages/';
  if (email === ADMIN_EMAIL) {
    window.location.href = base + 'admin.html';
  } else {
    window.location.href = base + 'shop.html';
  }
}

/* ── LOAD ASSET (logo, img) dengan fallback Supabase ── */
function loadAssetWithFallback(el, localPath, storagePath) {
  if (!el) return;
  el.src = localPath;
  el.onerror = () => {
    if (!sb) { el.onerror = null; return; }
    const { data } = sb.storage.from('assets').getPublicUrl(storagePath);
    el.src = data.publicUrl;
    el.onerror = null;
  };
}

/* ── MODAL PRODUCT SHARED ── */
let modalState = { product: null, imgIdx: 0, selSize: '', qty: 1 };

function openProductModal(product, wishlistArr) {
  modalState = { product, imgIdx: 0, selSize: '', qty: 1 };
  renderProductModal(wishlistArr);
  const bg = document.getElementById('modalBg');
  if (bg) { bg.style.display = 'flex'; document.body.style.overflow = 'hidden'; }
}

function closeProductModal() {
  const bg = document.getElementById('modalBg');
  if (bg) bg.style.display = 'none';
  document.body.style.overflow = '';
}

function renderProductModal(wishlistArr = []) {
  const p    = modalState.product;
  const imgs = p.images || [];
  const box  = document.getElementById('modalBox');
  if (!box || !p) return;

  const fmtRp = n => 'Rp' + (n || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  box.innerHTML = `
    <button class="modal-close" onclick="closeProductModal()">×</button>
    <div class="modal-gal">
      <div class="modal-main"><img id="mMain" src="${imgs[0] || ''}" alt="${p.name}" /></div>
      ${imgs.length > 1 ? `
        <div class="modal-thumbs">
          ${imgs.map((img, i) => `<img src="${img}" class="modal-thumb${i === 0 ? ' on' : ''}" onclick="setModalImg(${i})" alt="${p.name}"/>`).join('')}
        </div>` : ''}
    </div>
    <div class="modal-info">
      <p class="m-brand">${p.brand || 'Garisrey'}</p>
      <h2 class="m-name">${p.name}</h2>
      <p class="m-tag">${p.tagline || ''}</p>
      <p class="m-desc">${p.description || ''}</p>
      ${p.features?.length ? `<div class="m-feats">${p.features.map(f => `<span class="m-feat">${f}</span>`).join('')}</div>` : ''}
      <div style="margin-bottom:18px">
        <div class="m-price-lbl">Harga</div>
        <div style="display:flex;align-items:baseline;gap:10px">
          <span class="m-price"><sup>Rp</sup>${fmt(p.price)}</span>
          ${p.price_ori > p.price ? `<span class="m-price-ori">Rp${fmt(p.price_ori)}</span>` : ''}
        </div>
      </div>
      ${p.sizes?.length ? `
        <div class="m-sec-lbl"><span>Pilih Ukuran</span><span id="mSizeLbl" style="color:var(--red)"></span></div>
        <div class="m-sizes">${p.sizes.map(s => `<button class="m-sz" onclick="selectModalSize('${s}')">${s}</button>`).join('')}
        </div>` : ''}
      <div class="m-qty-row">
        <span class="m-sec-lbl" style="margin-bottom:0">Jumlah</span>
        <div class="m-qty-ctrl">
          <button class="m-qty-btn" onclick="changeModalQty(-1)">−</button>
          <span class="m-qty-val" id="mQty">1</span>
          <button class="m-qty-btn" onclick="changeModalQty(1)">+</button>
        </div>
      </div>
      <div class="m-btns">
        <button class="btn btn-red" onclick="buyViaWA()">Beli via WhatsApp →</button>
        <button class="btn btn-outline" id="wishBtn" onclick="modalToggleWish()">
          ${wishlistArr.includes(p.id) ? '♥ Disimpan' : '♡ Simpan'}
        </button>
        <button class="btn btn-outline" onclick="openDetailPage('${p.id}')" style="width:100%;margin-top:4px;justify-content:center">
          📋 Lihat Detail Produk
        </button>
      </div>
    </div>`;
}

/* ── DETAIL PAGE (fullscreen overlay) ── */
function openDetailPage(id) {
  const p = (typeof allProducts !== 'undefined' ? allProducts : (typeof products !== 'undefined' ? products : [])).find(x => x.id === id);
  if (!p) return;
  closeProductModal();

  // Buat atau reuse overlay detail
  let overlay = document.getElementById('detailOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'detailOverlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:900;background:var(--black);overflow-y:auto;animation:detailIn .3s ease';
    document.head.insertAdjacentHTML('beforeend', '<style>@keyframes detailIn{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}</style>');
    document.body.appendChild(overlay);
  }

  const imgs = p.images || [];
  const fmtN = n => (n || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const discPct = p.price_ori > p.price ? Math.round((1 - p.price / p.price_ori) * 100) : 0;

  overlay.style.display = 'block';
  document.body.style.overflow = 'hidden';

  overlay.innerHTML = `
    <div style="max-width:1100px;margin:0 auto;padding:24px 20px 60px">
      <!-- Back -->
      <button onclick="closeDetailPage()" style="display:flex;align-items:center;gap:8px;font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.4);margin-bottom:28px;padding:8px 0;background:none;border:none;cursor:pointer;transition:color .2s"
        onmouseover="this.style.color='#f0ebe3'" onmouseout="this.style.color='rgba(255,255,255,.4)'">
        ← Kembali
      </button>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:40px;align-items:start">

        <!-- GALLERY -->
        <div>
          <div style="aspect-ratio:3/4;background:#111;border-radius:6px;overflow:hidden;margin-bottom:10px;border:1px solid rgba(255,255,255,.06)">
            <img id="dpMain" src="${imgs[0] || ''}" alt="${p.name}"
              style="width:100%;height:100%;object-fit:cover;display:block;transition:opacity .3s"/>
          </div>
          ${imgs.length > 1 ? `
          <div style="display:grid;grid-template-columns:repeat(${Math.min(imgs.length,5)},1fr);gap:6px">
            ${imgs.map((img, i) => `
              <div onclick="dpSetImg(${i})" id="dpThumb${i}"
                style="aspect-ratio:3/4;border-radius:4px;overflow:hidden;cursor:pointer;border:2px solid ${i===0?'var(--red)':'rgba(255,255,255,.08)'};transition:border-color .18s">
                <img src="${img}" style="width:100%;height:100%;object-fit:cover;display:block"/>
              </div>`).join('')}
          </div>` : ''}
        </div>

        <!-- INFO -->
        <div style="position:sticky;top:24px">
          <p style="font-size:7px;font-weight:700;letter-spacing:.35em;text-transform:uppercase;color:var(--red);margin-bottom:8px">${p.brand || 'Garisrey'}</p>
          <h1 style="font-family:'DM Serif Display',serif;font-size:32px;line-height:1.05;color:#f0ebe3;margin-bottom:6px">${p.name}</h1>
          <p style="font-size:11px;color:rgba(255,255,255,.38);margin-bottom:18px;line-height:1.7">${p.tagline || ''}</p>

          <!-- HARGA -->
          <div style="margin-bottom:22px;padding:16px;background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.06);border-radius:6px">
            <div style="font-size:6.5px;font-weight:700;letter-spacing:.28em;text-transform:uppercase;color:rgba(255,255,255,.28);margin-bottom:8px">Harga</div>
            <div style="display:flex;align-items:baseline;gap:12px;flex-wrap:wrap">
              <span style="font-family:'DM Serif Display',serif;font-size:30px;color:#f0ebe3">Rp${fmtN(p.price)}</span>
              ${p.price_ori > p.price ? `
                <span style="font-size:14px;color:rgba(255,255,255,.3);text-decoration:line-through">Rp${fmtN(p.price_ori)}</span>
                <span style="font-size:10px;font-weight:700;background:rgba(204,0,0,.15);color:#ff6666;border:1px solid rgba(204,0,0,.25);padding:3px 8px;border-radius:100px">-${discPct}%</span>
              ` : ''}
            </div>
          </div>

          <!-- DESKRIPSI -->
          <div style="margin-bottom:22px">
            <div style="font-size:6.5px;font-weight:700;letter-spacing:.28em;text-transform:uppercase;color:rgba(255,255,255,.28);margin-bottom:10px">Deskripsi</div>
            <p style="font-size:12px;color:rgba(255,255,255,.55);line-height:1.85">${p.description || ''}</p>
          </div>

          <!-- FITUR -->
          ${p.features?.length ? `
          <div style="margin-bottom:22px">
            <div style="font-size:6.5px;font-weight:700;letter-spacing:.28em;text-transform:uppercase;color:rgba(255,255,255,.28);margin-bottom:10px">Fitur</div>
            <div style="display:flex;flex-wrap:wrap;gap:6px">
              ${p.features.map(f => `<span style="font-size:8.5px;font-weight:700;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);padding:4px 10px;border-radius:100px;color:rgba(255,255,255,.55)">${f}</span>`).join('')}
            </div>
          </div>` : ''}

          <!-- UKURAN -->
          ${p.sizes?.length ? `
          <div style="margin-bottom:22px">
            <div style="font-size:6.5px;font-weight:700;letter-spacing:.28em;text-transform:uppercase;color:rgba(255,255,255,.28);margin-bottom:10px">Pilih Ukuran <span id="dpSizeLbl" style="color:var(--red);margin-left:6px"></span></div>
            <div style="display:flex;flex-wrap:wrap;gap:6px">
              ${p.sizes.map(s => `
                <button onclick="dpSelectSize('${s}')" id="dpSz_${s}"
                  style="min-width:44px;height:44px;border-radius:3px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.03);color:rgba(255,255,255,.5);font-size:10px;font-weight:700;cursor:pointer;font-family:inherit;transition:all .18s;padding:0 12px"
                  onmouseover="if(!this.dataset.sel)this.style.borderColor='rgba(255,255,255,.3)'"
                  onmouseout="if(!this.dataset.sel)this.style.borderColor='rgba(255,255,255,.1)'">${s}</button>`).join('')}
            </div>
          </div>` : ''}

          <!-- SPESIFIKASI -->
          ${p.specs && Object.keys(p.specs).some(k => p.specs[k]) ? `
          <div style="margin-bottom:22px;border:1px solid rgba(255,255,255,.06);border-radius:6px;overflow:hidden">
            <div style="padding:10px 14px;background:rgba(255,255,255,.015);font-size:6.5px;font-weight:700;letter-spacing:.28em;text-transform:uppercase;color:rgba(255,255,255,.28)">Spesifikasi</div>
            ${Object.entries(p.specs).filter(([,v])=>v).map(([k,v]) => `
              <div style="display:flex;padding:9px 14px;border-top:1px solid rgba(255,255,255,.04)">
                <span style="font-size:10px;color:rgba(255,255,255,.3);width:110px;flex-shrink:0">${k}</span>
                <span style="font-size:10px;color:rgba(255,255,255,.7)">${v}</span>
              </div>`).join('')}
          </div>` : ''}

          <!-- ACTIONS -->
          <div style="display:flex;flex-direction:column;gap:10px">
            <button onclick="dpBuyWA('${p.id}')"
              style="display:flex;align-items:center;justify-content:center;gap:8px;padding:14px 24px;background:var(--red);color:#fff;border:none;border-radius:3px;font-family:inherit;font-size:9px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;cursor:pointer;transition:all .18s"
              onmouseover="this.style.background='#e00';this.style.boxShadow='0 4px 20px rgba(204,0,0,.35)'"
              onmouseout="this.style.background='var(--red)';this.style.boxShadow='none'">
              Beli via WhatsApp →
            </button>
            <button onclick="dpToggleWish('${p.id}')" id="dpWishBtn"
              style="display:flex;align-items:center;justify-content:center;gap:8px;padding:12px 24px;background:transparent;color:rgba(255,255,255,.5);border:1px solid rgba(255,255,255,.12);border-radius:3px;font-family:inherit;font-size:9px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;cursor:pointer;transition:all .18s">
              ${(typeof getWishlist === 'function' && getWishlist().includes(p.id)) ? '♥ Disimpan' : '♡ Simpan ke Wishlist'}
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  // Responsive override
  const style = overlay.querySelector('style') || document.createElement('style');
  style.textContent = `
    @media(max-width:700px){
      #detailOverlay [style*="grid-template-columns:1fr 1fr"]{grid-template-columns:1fr!important}
      #detailOverlay [style*="position:sticky"]{position:static!important}
    }
  `;
  overlay.appendChild(style);
}

function closeDetailPage() {
  const overlay = document.getElementById('detailOverlay');
  if (overlay) overlay.style.display = 'none';
  document.body.style.overflow = '';
}

function dpSetImg(i) {
  const main = document.getElementById('dpMain');
  if (main) { main.style.opacity = '0'; setTimeout(() => { main.src = modalState.product?.images[i] || ''; main.style.opacity = '1'; }, 200); }
  document.querySelectorAll('[id^="dpThumb"]').forEach((el, idx) => {
    el.style.borderColor = idx === i ? 'var(--red)' : 'rgba(255,255,255,.08)';
  });
}

let _dpSelSize = '';
function dpSelectSize(s) {
  _dpSelSize = s;
  document.querySelectorAll('[id^="dpSz_"]').forEach(btn => {
    const active = btn.id === `dpSz_${s}`;
    btn.style.background    = active ? 'var(--red)' : 'rgba(255,255,255,.03)';
    btn.style.borderColor   = active ? 'var(--red)' : 'rgba(255,255,255,.1)';
    btn.style.color         = active ? '#fff' : 'rgba(255,255,255,.5)';
    btn.dataset.sel         = active ? '1' : '';
  });
  const lbl = document.getElementById('dpSizeLbl');
  if (lbl) lbl.textContent = s;
}

function dpBuyWA(id) {
  const all = typeof allProducts !== 'undefined' ? allProducts : (typeof products !== 'undefined' ? products : []);
  const p = all.find(x => x.id === id);
  if (!p) return;
  if (p.sizes?.length && !_dpSelSize) { showToast('Pilih ukuran dulu!', 'err'); return; }
  const txt = `Halo Garisrey! 👋\n\nSaya mau order:\n\n🛍 Produk: ${p.name}\n📏 Ukuran: ${_dpSelSize || '—'}\n💰 Harga: Rp${(p.price||0).toString().replace(/\B(?=(\d{3})+(?!\d))/g,'.')}\n\nMohon info ketersediaan. Terima kasih!`;
  window.open(`https://wa.me/${WA_NUMBER}?text=` + encodeURIComponent(txt), '_blank');
}

function dpToggleWish(id) {
  if (typeof toggleWishlistItem !== 'function') return;
  toggleWishlistItem(id, () => {
    const btn = document.getElementById('dpWishBtn');
    const wl  = typeof getWishlist === 'function' ? getWishlist() : [];
    if (btn) btn.textContent = wl.includes(id) ? '♥ Disimpan' : '♡ Simpan ke Wishlist';
  });
}

function setModalImg(i) {
  modalState.imgIdx = i;
  const main = document.getElementById('mMain');
  if (main) main.src = modalState.product.images[i] || '';
  document.querySelectorAll('.modal-thumb').forEach((t, idx) => t.classList.toggle('on', idx === i));
}

function selectModalSize(s) {
  modalState.selSize = s;
  document.querySelectorAll('.m-sz').forEach(b => b.classList.toggle('on', b.textContent === s));
  const lbl = document.getElementById('mSizeLbl');
  if (lbl) lbl.textContent = s;
}

function changeModalQty(d) {
  modalState.qty = Math.max(1, Math.min(10, modalState.qty + d));
  const el = document.getElementById('mQty');
  if (el) el.textContent = modalState.qty;
}

function buyViaWA() {
  const p = modalState.product;
  if (p.sizes?.length && !modalState.selSize) { showToast('Pilih ukuran dulu!', 'err'); return; }
  const txt = `Halo Garisrey! 👋\n\nSaya mau order:\n\n🛍 Produk: ${p.name}\n📏 Ukuran: ${modalState.selSize || '—'}\n🔢 Jumlah: ${modalState.qty}\n💰 Total: Rp${fmt(p.price * modalState.qty)}\n\nMohon info ketersediaan. Terima kasih!`;
  window.open(`https://wa.me/${WA_NUMBER}?text=` + encodeURIComponent(txt), '_blank');
}

function quickWA(productName) {
  const txt = `Halo Garisrey! 👋\nSaya tertarik dengan *${productName}*.\nBoleh info ketersediaan dan cara order?`;
  window.open(`https://wa.me/${WA_NUMBER}?text=` + encodeURIComponent(txt), '_blank');
}

/* ── ANIMATE COUNTER ── */
function animateCounter(elId, target, duration = 1500) {
  const el = document.getElementById(elId);
  if (!el) return;
  const start = performance.now();
  const step = ts => {
    const progress = Math.min((ts - start) / duration, 1);
    el.textContent = Math.floor(progress * target);
    if (progress < 1) requestAnimationFrame(step);
    else el.textContent = target;
  };
  requestAnimationFrame(step);
}

/* ── FOOTER PRODUCTS ── */
function renderFooterProducts(products, limit = 5) {
  const fp = document.getElementById('footProds');
  if (!fp || !products.length) return;
  fp.innerHTML = products.slice(0, limit).map(p =>
    `<a style="cursor:pointer" onclick="openDetail('${p.id}')">${p.name}</a>`
  ).join('');
}

/* ── EXPOSE globals ── */
window.showToast        = showToast;
window.toggleDrawer     = toggleDrawer;
window.closeDrawer      = closeDrawer;
window.toggleAccMenu    = toggleAccMenu;
window.doLogout         = doLogout;
window.closeProductModal = closeProductModal;
window.setModalImg      = setModalImg;
window.selectModalSize  = selectModalSize;
window.changeModalQty   = changeModalQty;
window.buyViaWA         = buyViaWA;
window.openDetailPage   = openDetailPage;
window.closeDetailPage  = closeDetailPage;
window.dpSetImg         = dpSetImg;
window.dpSelectSize     = dpSelectSize;
window.dpBuyWA          = dpBuyWA;
window.dpToggleWish     = dpToggleWish;
