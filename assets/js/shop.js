/**
 * GARISREY — shop.js
 * Logic halaman Shop: filter, search, sort, grid, modal
 */

/* ── STATE ── */
let allProducts = [];
let filtered    = [];
let wishlist    = getWishlist();
let activeChip  = 'semua';
let searchQ     = '';
let sortVal     = 'newest';

/* ── LOAD PRODUCTS ── */
async function loadProducts() {
  const { data, error } = await sb.from('products').select('*').eq('status', 'active').order('created_at', { ascending: false });
  if (error) throw error;
  allProducts = data || [];
}

/* ── BUILD FILTER CHIPS ── */
function buildChips() {
  const cats = [...new Set(allProducts.map(p => p.category).filter(Boolean))];
  const container = document.getElementById('chipsWrap');
  if (!container) return;

  // Reset: pertahankan chip "Semua"
  container.innerHTML = `<button class="chip${activeChip === 'semua' ? ' on' : ''}" onclick="setChip('semua')">Semua</button>`;

  cats.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = `chip${activeChip === cat ? ' on' : ''}`;
    btn.textContent = cat;
    btn.onclick = () => setChip(cat);
    container.appendChild(btn);
  });
}

function setChip(cat) {
  activeChip = cat;
  buildChips();
  applyFilter();
}

/* ── SEARCH ── */
function handleSearch(e) {
  searchQ = e.target.value.trim().toLowerCase();
  const clr = document.getElementById('searchClr');
  if (clr) clr.classList.toggle('show', searchQ.length > 0);
  applyFilter();
}

function clearSearch() {
  const inp = document.getElementById('searchInp');
  const clr = document.getElementById('searchClr');
  if (inp) { inp.value = ''; }
  if (clr) clr.classList.remove('show');
  searchQ = '';
  applyFilter();
}

/* ── SORT ── */
function handleSort(e) {
  sortVal = e.target.value;
  applyFilter();
}

/* ── APPLY FILTER + SORT ── */
function applyFilter() {
  filtered = allProducts.filter(p => {
    const matchCat = activeChip === 'semua' || p.category === activeChip;
    const matchQ   = !searchQ || p.name.toLowerCase().includes(searchQ) || (p.tagline || '').toLowerCase().includes(searchQ) || (p.description || '').toLowerCase().includes(searchQ);
    return matchCat && matchQ;
  });

  // Sort
  if (sortVal === 'newest') {
    filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  } else if (sortVal === 'oldest') {
    filtered.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  } else if (sortVal === 'price_asc') {
    filtered.sort((a, b) => a.price - b.price);
  } else if (sortVal === 'price_desc') {
    filtered.sort((a, b) => b.price - a.price);
  } else if (sortVal === 'name_asc') {
    filtered.sort((a, b) => a.name.localeCompare(b.name));
  }

  // Update count
  const countEl = document.getElementById('pgCount');
  const resInfo = document.getElementById('resInfo');
  if (countEl) countEl.textContent = `${allProducts.length} produk tersedia`;
  if (resInfo) resInfo.innerHTML = `Menampilkan <strong>${filtered.length}</strong> dari ${allProducts.length} produk`;

  renderGrid();
}

/* ── RENDER GRID ── */
function renderGrid() {
  const grid  = document.getElementById('prodsGrid');
  const empty = document.getElementById('emptyEl');
  if (!grid) return;

  wishlist = getWishlist();

  if (!allProducts.length) {
    grid.innerHTML = `<div class="empty" style="grid-column:1/-1">
      <div class="ei">👕</div>
      <h3>Belum Ada Produk</h3>
      <p>Cek kembali nanti!</p>
    </div>`;
    if (empty) empty.style.display = 'none';
    return;
  }

  if (!filtered.length) {
    grid.innerHTML = '';
    if (empty) empty.style.display = 'block';
    return;
  }

  if (empty) empty.style.display = 'none';

  grid.innerHTML = filtered.map(p => `
    <div class="card" onclick="openDetail('${p.id}')">
      <div class="card-img">
        <img src="${(p.images || [])[0] || ''}" alt="${p.name}" loading="lazy" onerror="this.style.minHeight='200px'"/>
        ${p.badge ? `<span class="card-badge b-${p.badge}">${p.badge}</span>` : ''}
        <button class="card-wish${wishlist.includes(p.id) ? ' wished' : ''}"
          onclick="event.stopPropagation();handleToggleWish('${p.id}')">
          ${wishlist.includes(p.id) ? '♥' : '♡'}
        </button>
        <div class="card-overlay"></div>
        <div class="card-quick" onclick="event.stopPropagation()">
          <button class="btn btn-red btn-sm" style="flex:1" onclick="openDetail('${p.id}')">Detail</button>
          <button class="btn btn-outline btn-sm" onclick="handleQuickWA('${p.id}')">WA</button>
        </div>
      </div>
      <div class="card-body">
        <p class="card-brand">${p.brand || 'Garisrey'}</p>
        <h3 class="card-name">${p.name}</h3>
        <p class="card-sub">${p.tagline || ''}</p>
        <div class="card-price">
          <span class="price-main"><sup style="font-size:.55em;vertical-align:super">Rp</sup>${fmt(p.price)}</span>
          ${p.price_ori > p.price ? `<span class="price-ori">Rp${fmt(p.price_ori)}</span><span class="price-disc">-${disc(p)}%</span>` : ''}
        </div>
      </div>
    </div>`).join('');
}

/* ── HANDLERS ── */
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
  const p = allProducts.find(x => x.id === id);
  if (p) quickWA(p.name);
}

function openDetail(id) {
  const p = allProducts.find(x => x.id === id);
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
window.setChip          = setChip;
window.handleSearch     = handleSearch;
window.clearSearch      = clearSearch;
window.handleSort       = handleSort;
window.modalToggleWish  = modalToggleWish;

/* ── INIT ── */
async function init() {
  initNavScroll('navbar');
  initAccDropdownClose();
  buildMarquee('mqTrack');
  initAuth();

  try {
    await loadProducts();
  } catch (e) {
    console.error('[shop] loadProducts error:', e);
  }

  buildChips();
  applyFilter();

  const loadingEl = document.getElementById('loadingEl');
  const prodsCont = document.getElementById('prodsCont');
  if (loadingEl) loadingEl.style.display = 'none';
  if (prodsCont) prodsCont.style.display = 'block';

  // Realtime update
  sb.channel('products-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, async () => {
      await loadProducts();
      buildChips();
      applyFilter();
    })
    .subscribe();
}

document.addEventListener('DOMContentLoaded', () => {
  sb = initSupabase();
  if (!sb) { console.error('Supabase tidak terinitalisasi'); return; }
  init().catch(console.error);
});
