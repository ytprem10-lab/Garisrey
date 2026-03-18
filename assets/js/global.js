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
      </div>
    </div>`;
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
