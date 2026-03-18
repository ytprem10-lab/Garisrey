/**
 * GARISREY — admin.js
 * Dashboard Admin: CRUD Produk, Beranda, Aset
 *
 * Bug fixes vs versi lama:
 * - Variable 'sb' di toggleSB() renamed jadi 'sbar' (hindari shadow global sb)
 * - ADMIN_EMAIL diambil dari global.js (sudah di-expose)
 * - uploadProductImg: progress bar real per-file, bukan infinite anim
 * - form.specs default value dijaga agar tidak undefined
 * - readForm() null-safe dengan optional chaining
 * - saveProd() re-enable btn on error path
 * - renderForm() drag & drop attach di requestAnimationFrame (DOM sudah ada)
 * - loadLogo() pakai img.onerror bawaan, bukan fetch HEAD loop (hemat koneksi)
 * - onFilePick/handleFiles: validasi MIME & size sebelum upload
 * - Semua window.* expose di bawah setelah fungsi didefinisikan
 */

/* ══════════════════════════════════════
   CONSTANTS & STATE
══════════════════════════════════════ */
const ALL_SIZES  = ['XS','S','M','L','XL','XXL','28','29','30','31','32','33','34','36'];
const CATEGORIES = ['denim','casual','limited','aksesoris','outerwear'];
const BADGES     = ['','new','sale','limited','bestseller'];

let products   = [];
let form       = emptyForm();
let editId     = null;
let delId      = null;
let curPage    = 'home';
let beranda    = { heroImages: [], heroVideo: null };
let berandaTab = 'images';
let assetTab   = 'products';

function emptyForm() {
  return {
    name: '', tagline: '', category: '', price: 0, priceOri: 0,
    badge: '', desc: '', sizes: [], features: [], images: [], status: 'active',
    specs: { Material: '', Fit: '', Wash: '', SKU: '' }
  };
}

/* ── HELPERS ── */
const fmtRp = n => 'Rp' + (n || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const esc   = s => String(s || '').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

/* ══════════════════════════════════════
   SIDEBAR (BUG FIX: rename 'sb' → 'sbar')
══════════════════════════════════════ */
function toggleSB() {
  const sbar = document.getElementById('sidebar');  // FIX: tidak shadow global sb
  const ov   = document.getElementById('sbOverlay');
  if (!sbar) return;
  sbar.classList.toggle('open');
  if (ov) ov.style.display = sbar.classList.contains('open') ? 'block' : 'none';
}

function closeSB() {
  const sbar = document.getElementById('sidebar');
  const ov   = document.getElementById('sbOverlay');
  if (sbar) sbar.classList.remove('open');
  if (ov)   ov.style.display = 'none';
}

/* ══════════════════════════════════════
   TOAST
══════════════════════════════════════ */
function toast(msg, type = 'info') {
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
  el.innerHTML = `<span style="flex-shrink:0">${icons[type] || ''}</span><span>${msg}</span>`;
  wrap.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateX(12px)'; setTimeout(() => el.remove(), 300); }, 3200);
}

/* ══════════════════════════════════════
   AUTH & LOGOUT
══════════════════════════════════════ */
async function doLogout() {
  if (!sb) return;
  await sb.auth.signOut();
  window.location.href = '../index.html';
}

/* ══════════════════════════════════════
   LOAD LOGO (BUG FIX: pakai img.onerror, bukan fetch HEAD loop)
══════════════════════════════════════ */
function loadLogo() {
  const sbIcon = document.getElementById('sbIcon');
  if (!sbIcon) return;

  // Coba logo lokal dulu
  const localPaths = [
    '../assets/logo/logotransparan.png',
    '../assets/logo/logo.png',
    '../assets/logo/logoputih.jpeg'
  ];

  const tryLocal = (idx) => {
    if (idx >= localPaths.length) {
      // Fallback Supabase — tidak perlu fetch HEAD, langsung set src
      if (!sb) return;
      const { data } = sb.storage.from('assets').getPublicUrl('logo/logotransparan.png');
      const img = document.createElement('img');
      img.src   = data.publicUrl;
      img.alt   = 'G';
      img.style.cssText = 'width:100%;height:100%;object-fit:contain';
      img.onerror = () => { sbIcon.textContent = 'G'; };
      sbIcon.innerHTML = '';
      sbIcon.appendChild(img);
      return;
    }
    const img = document.createElement('img');
    img.src   = localPaths[idx];
    img.alt   = 'G';
    img.style.cssText = 'width:100%;height:100%;object-fit:contain';
    img.onload  = () => { sbIcon.innerHTML = ''; sbIcon.appendChild(img); };
    img.onerror = () => tryLocal(idx + 1);
  };

  tryLocal(0);
}

/* ══════════════════════════════════════
   LOAD PRODUCTS
══════════════════════════════════════ */
async function loadProducts() {
  const { data, error } = await sb.from('products').select('*').order('created_at', { ascending: false });
  if (error) { toast('Gagal memuat produk: ' + error.message, 'err'); return; }
  products = data || [];
  const el = document.getElementById('prodCount');
  if (el) el.textContent = products.length + ' Produk';
}

/* ══════════════════════════════════════
   NAVIGATION
══════════════════════════════════════ */
async function go(page) {
  curPage = page;
  document.querySelectorAll('.nav-item').forEach(e => e.classList.remove('active'));
  const navEl = document.getElementById('n-' + page);
  if (navEl) navEl.classList.add('active');

  const titles = {
    home: 'Beranda', dashboard: 'Statistik', products: 'Manajemen Produk',
    add: 'Tambah Produk', edit: 'Edit Produk', beranda: 'Atur Beranda', assets: 'Kelola Aset'
  };
  const titleEl = document.getElementById('topTitle');
  if (titleEl) titleEl.textContent = titles[page] || page;

  if (page === 'add') { form = emptyForm(); editId = null; }

  const renders = {
    home:     renderHome,
    dashboard: renderDashboard,
    products:  renderProducts,
    add:      () => renderForm(false),
    edit:     () => renderForm(true),
    beranda:   renderBeranda,
    assets:    renderAssets
  };

  if (renders[page]) await renders[page]();
  closeSB();
}

/* ══════════════════════════════════════
   HOME PAGE
══════════════════════════════════════ */
async function renderHome() {
  await loadProducts();
  const active = products.filter(p => p.status === 'active');
  const latest = active.slice(0, 5);
  const cats   = [...new Set(products.map(p => p.category).filter(Boolean))].length;

  // Hero preview
  const { data: heroData } = await sb.from('settings').select('value').eq('key','beranda').single().catch(() => ({ data: null }));
  const heroVid  = heroData?.value?.heroVideo  || null;
  const heroImgs = heroData?.value?.heroImages || [];

  let heroMedia;
  if (heroVid) {
    heroMedia = `<video src="${heroVid}" autoplay muted loop playsinline style="width:100%;height:100%;object-fit:cover;opacity:.75"></video>`;
  } else if (heroImgs.length) {
    heroMedia = `<img src="${heroImgs[0]}" alt="Hero" style="width:100%;height:100%;object-fit:cover;opacity:.75"/>`;
  } else if (active.length && (active[0].images || []).length) {
    heroMedia = `<img src="${active[0].images[0]}" alt="Hero" style="width:100%;height:100%;object-fit:cover;opacity:.75"/>`;
  } else {
    heroMedia = `<div style="width:100%;height:100%;background:var(--black3);display:flex;align-items:center;justify-content:center;flex-direction:column;gap:8px">
      <div style="font-size:32px;opacity:.2">🎬</div>
      <p style="font-size:9px;color:var(--gray);letter-spacing:.2em;text-transform:uppercase">Belum ada media hero</p>
    </div>`;
  }

  document.getElementById('pageContent').innerHTML = `
    <!-- HERO PREVIEW -->
    <div class="teaser-section">
      <div class="teaser-inner">
        <div class="teaser-media">
          ${heroMedia}
          <div class="teaser-media-overlay"></div>
          <div class="teaser-badge">${heroVid ? '🎬 Video Hero' : '🖼 Foto Hero'}</div>
        </div>
        <div class="teaser-meta">
          <div class="teaser-eyebrow">Brand Preview</div>
          <h2 class="teaser-title">From East<br>to <em>Peace.</em></h2>
          <p class="teaser-desc">Garisrey SS 2025. Brand fashion lokal Indonesia — Denim Culture, Local Pride.</p>
          <div class="teaser-actions">
            <button class="btn btn-red btn-sm" onclick="go('add')">+ Tambah Produk</button>
            <button class="btn btn-out btn-sm" onclick="go('beranda')">⚙ Atur Hero</button>
          </div>
          <div class="teaser-stats">
            <div><div class="t-stat-num">${active.length}</div><div class="t-stat-lbl">Aktif</div></div>
            <div><div class="t-stat-num">${products.filter(p=>p.status==='draft').length}</div><div class="t-stat-lbl">Draft</div></div>
            <div><div class="t-stat-num">${cats}</div><div class="t-stat-lbl">Kategori</div></div>
          </div>
        </div>
      </div>
    </div>

    <!-- QUICK STATS -->
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-ico">👕</div><div class="stat-card-lbl">Total Produk</div><div class="stat-card-val">${products.length}</div><div class="stat-card-sub">di database</div></div>
      <div class="stat-card"><div class="stat-ico">✅</div><div class="stat-card-lbl">Aktif</div><div class="stat-card-val">${active.length}</div><div class="stat-card-sub">tampil di toko</div></div>
      <div class="stat-card"><div class="stat-ico">📦</div><div class="stat-card-lbl">Draft</div><div class="stat-card-val">${products.filter(p=>p.status==='draft').length}</div><div class="stat-card-sub">belum publish</div></div>
      <div class="stat-card"><div class="stat-ico">🏷️</div><div class="stat-card-lbl">Kategori</div><div class="stat-card-val">${cats}</div><div class="stat-card-sub">jenis produk</div></div>
    </div>

    <!-- LATEST PRODUCTS -->
    <div class="sec-head">
      <h2 class="sec-title">Produk Terbaru</h2>
      <button class="btn btn-red btn-sm" onclick="go('add')">+ Tambah Produk</button>
    </div>
    <div class="tbl-wrap">
      <table class="dtable">
        <thead><tr><th>Foto</th><th>Produk</th><th>Harga</th><th>Kategori</th><th>Status</th><th>Aksi</th></tr></thead>
        <tbody>
          ${!latest.length
            ? `<tr><td colspan="6"><div class="empty-st"><div class="ei">📭</div><p>Belum ada produk aktif.</p></div></td></tr>`
            : latest.map(p => `<tr>
              <td><img class="td-img" src="${(p.images||[])[0]||''}" onerror="this.style.background='#222'"/></td>
              <td><div class="td-name">${esc(p.name)}</div><div class="td-sub">${esc(p.tagline||'')}</div></td>
              <td style="font-weight:700;white-space:nowrap">${fmtRp(p.price)}</td>
              <td><span class="badge b-cat">${esc(p.category||'—')}</span></td>
              <td><span class="badge ${p.status==='active'?'b-act':'b-dft'}" style="cursor:pointer" onclick="toggleStatus('${p.id}','${p.status}')">${p.status==='active'?'Aktif':'Draft'}</span></td>
              <td><div class="act-btns">
                <button class="btn-ico" title="Edit" onclick="startEdit('${p.id}')">✏️</button>
                <button class="btn-ico danger" title="Hapus" onclick="confirmDel('${p.id}','${esc(p.name)}')">🗑️</button>
              </div></td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>
    ${products.length > 5 ? `<div style="text-align:center;margin-top:14px">
      <button class="btn btn-out btn-sm" onclick="go('products')">Lihat Semua Produk →</button>
    </div>` : ''}
  `;
}

/* ══════════════════════════════════════
   DASHBOARD / STATISTIK
══════════════════════════════════════ */
async function renderDashboard() {
  await loadProducts();
  const active = products.filter(p => p.status === 'active').length;
  const draft  = products.filter(p => p.status === 'draft').length;
  const cats   = [...new Set(products.map(p => p.category).filter(Boolean))].length;

  document.getElementById('pageContent').innerHTML = `
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-ico">👕</div><div class="stat-card-lbl">Total</div><div class="stat-card-val">${products.length}</div><div class="stat-card-sub">produk di katalog</div></div>
      <div class="stat-card"><div class="stat-ico">✅</div><div class="stat-card-lbl">Aktif</div><div class="stat-card-val">${active}</div><div class="stat-card-sub">tampil di toko</div></div>
      <div class="stat-card"><div class="stat-ico">📦</div><div class="stat-card-lbl">Draft</div><div class="stat-card-val">${draft}</div><div class="stat-card-sub">belum publish</div></div>
      <div class="stat-card"><div class="stat-ico">🏷️</div><div class="stat-card-lbl">Kategori</div><div class="stat-card-val">${cats}</div><div class="stat-card-sub">jenis produk</div></div>
    </div>
    <div class="sec-head">
      <h2 class="sec-title">Semua Produk <span style="font-size:12px;color:var(--gray)">(${products.length})</span></h2>
      <button class="btn btn-red btn-sm" onclick="go('add')">+ Tambah</button>
    </div>
    <div class="tbl-wrap"><table class="dtable">
      <thead><tr><th>Foto</th><th>Produk</th><th>Harga</th><th>Status</th><th>Aksi</th></tr></thead>
      <tbody>${!products.length
        ? `<tr><td colspan="5"><div class="empty-st"><div class="ei">📭</div><p>Belum ada produk.</p></div></td></tr>`
        : products.map(p=>`<tr>
          <td><img class="td-img" src="${(p.images||[])[0]||''}" onerror="this.style.background='#222'"/></td>
          <td><div class="td-name">${esc(p.name)}</div><div class="td-sub">${esc(p.tagline||'')}</div></td>
          <td style="font-weight:700;white-space:nowrap">${fmtRp(p.price)}</td>
          <td><span class="badge ${p.status==='active'?'b-act':'b-dft'}" style="cursor:pointer" onclick="toggleStatus('${p.id}','${p.status}')">${p.status==='active'?'Aktif':'Draft'}</span></td>
          <td><div class="act-btns">
            <button class="btn-ico" onclick="startEdit('${p.id}')">✏️</button>
            <button class="btn-ico danger" onclick="confirmDel('${p.id}','${esc(p.name)}')">🗑️</button>
          </div></td>
        </tr>`).join('')}
      </tbody>
    </table></div>`;
}

/* ══════════════════════════════════════
   PRODUCTS LIST
══════════════════════════════════════ */
async function renderProducts() {
  await loadProducts();
  document.getElementById('pageContent').innerHTML = `
    <div class="sec-head">
      <h2 class="sec-title">Semua Produk <span style="font-size:12px;color:var(--gray)">(${products.length})</span></h2>
      <button class="btn btn-red btn-sm" onclick="go('add')">+ Tambah</button>
    </div>
    <div class="tbl-wrap"><table class="dtable">
      <thead><tr><th>Foto</th><th>Produk</th><th>Kategori</th><th>Harga</th><th>Ukuran</th><th>Status</th><th>Aksi</th></tr></thead>
      <tbody>${!products.length
        ? `<tr><td colspan="7"><div class="empty-st"><div class="ei">📭</div>
            <p>Belum ada produk.</p>
            <button class="btn btn-red btn-sm" style="margin-top:12px" onclick="go('add')">+ Tambah Produk</button>
          </div></td></tr>`
        : products.map(p=>`<tr>
          <td><img class="td-img" src="${(p.images||[])[0]||''}" onerror="this.style.background='#222'"/></td>
          <td><div class="td-name">${esc(p.name)}</div><div class="td-sub">${esc(p.tagline||'')}</div></td>
          <td><span class="badge b-cat">${esc(p.category||'—')}</span></td>
          <td style="font-weight:700;white-space:nowrap">${fmtRp(p.price)}</td>
          <td style="font-size:9px;color:var(--gray)">${(p.sizes||[]).join(', ')||'—'}</td>
          <td><span class="badge ${p.status==='active'?'b-act':'b-dft'}" style="cursor:pointer" onclick="toggleStatus('${p.id}','${p.status}')">${p.status==='active'?'Aktif':'Draft'}</span></td>
          <td><div class="act-btns">
            <button class="btn-ico" onclick="startEdit('${p.id}')">✏️</button>
            <button class="btn-ico danger" onclick="confirmDel('${p.id}','${esc(p.name)}')">🗑️</button>
          </div></td>
        </tr>`).join('')}
      </tbody>
    </table></div>`;
}

/* ══════════════════════════════════════
   FORM — TAMBAH / EDIT PRODUK
   BUG FIX: drag & drop attach via rAF,
   specs default dijaga, esc() applied
══════════════════════════════════════ */
function renderForm(isEdit) {
  // Pastikan specs tidak undefined (bug fix)
  if (!form.specs) form.specs = { Material: '', Fit: '', Wash: '', SKU: '' };

  const szHtml = ALL_SIZES.map(s =>
    `<button type="button" class="sz-btn${form.sizes.includes(s)?' on':''}" onclick="toggleSize('${s}')">${s}</button>`
  ).join('');

  const fcHtml = form.features.map((f, i) =>
    `<span class="tag-chip">${esc(f)}<button type="button" onclick="rmFeat(${i})">×</button></span>`
  ).join('');

  const pvHtml = form.images.map((img, i) => `
    <div class="img-prev">
      <img src="${img}" alt="preview foto ${i+1}"/>
      <button type="button" class="star${i===0?' main':''}" onclick="setMain(${i})" title="Jadikan foto utama">★</button>
      <button type="button" class="rm" onclick="rmImg(${i})" title="Hapus foto">×</button>
    </div>`).join('');

  document.getElementById('pageContent').innerHTML = `
    <div class="sec-head">
      <h2 class="sec-title">${isEdit ? 'Edit Produk' : 'Tambah Produk Baru'}</h2>
      <div style="display:flex;gap:7px;flex-wrap:wrap">
        <button type="button" class="btn btn-out btn-sm" onclick="go('products')">✕ Batal</button>
        <button type="button" class="btn btn-out btn-sm" onclick="saveProd('draft')" id="draftBtn">💾 Draft</button>
        <button type="button" class="btn btn-red btn-sm" onclick="saveProd('active')" id="pubBtn">
          ${isEdit ? '🔄 Update' : '🚀 Publish'}
        </button>
      </div>
    </div>

    <div class="form-card">

      <!-- ── FOTO PRODUK ── -->
      <div class="field form-full" style="margin-bottom:20px">
        <label>Foto Produk <span style="color:var(--red)">*</span>
          <span style="font-weight:400;color:var(--gray);text-transform:none;letter-spacing:0;font-size:9px">
            (JPG/PNG/WEBP, maks 5MB per foto)
          </span>
        </label>
        <div class="img-drop" id="imgDrop">
          <input type="file" id="imgFileInput" accept="image/*" multiple/>
          <div class="img-drop-ico">🖼️</div>
          <div class="img-drop-txt">Klik atau drag &amp; drop foto produk</div>
          <div class="img-drop-hint">Upload langsung ke Supabase Storage</div>
        </div>
        <!-- Progress bar per-upload (FIX: bar determinate, bukan animasi infinite) -->
        <div class="prog-wrap" id="imgProg">
          <div class="prog-bar" id="imgBar" style="animation:none;width:0%"></div>
        </div>
        <div style="font-size:9px;color:var(--gray);margin-top:5px" id="imgStatus"></div>
        <div class="img-previews" id="imgPrevs">${pvHtml}</div>
      </div>

      <div class="form-grid">

        <!-- ── NAMA ── -->
        <div class="field">
          <label for="f_name">Nama Produk <span style="color:var(--red)">*</span></label>
          <input type="text" id="f_name" value="${esc(form.name)}" placeholder="cth. Sathenna Baggy" autocomplete="off"/>
        </div>

        <!-- ── TAGLINE ── -->
        <div class="field">
          <label for="f_tagline">Tagline</label>
          <input type="text" id="f_tagline" value="${esc(form.tagline)}" placeholder="Signature Denim SS 2025"/>
        </div>

        <!-- ── HARGA ── -->
        <div class="field">
          <label for="f_price">Harga (Rp) <span style="color:var(--red)">*</span></label>
          <input type="number" id="f_price" value="${form.price || ''}" min="0" step="1000" placeholder="265000"/>
        </div>

        <!-- ── HARGA CORET ── -->
        <div class="field">
          <label for="f_priceOri">Harga Coret (Rp) <span style="color:var(--gray);font-weight:400">opsional</span></label>
          <input type="number" id="f_priceOri" value="${form.priceOri || ''}" min="0" step="1000" placeholder="300000"/>
        </div>

        <!-- ── KATEGORI ── -->
        <div class="field">
          <label for="f_cat">Kategori <span style="color:var(--red)">*</span></label>
          <select id="f_cat">
            <option value="">— Pilih Kategori —</option>
            ${CATEGORIES.map(c => `<option value="${c}"${form.category===c?' selected':''}>${c.charAt(0).toUpperCase()+c.slice(1)}</option>`).join('')}
          </select>
        </div>

        <!-- ── BADGE ── -->
        <div class="field">
          <label for="f_badge">Badge / Label</label>
          <select id="f_badge">
            ${BADGES.map(b => `<option value="${b}"${form.badge===b?' selected':''}>${b||'— Tidak ada —'}</option>`).join('')}
          </select>
        </div>

        <!-- ── DESKRIPSI ── -->
        <div class="field form-full">
          <label for="f_desc">Deskripsi Produk <span style="color:var(--red)">*</span></label>
          <textarea id="f_desc" rows="4" placeholder="Deskripsikan produk secara detail...">${esc(form.desc)}</textarea>
        </div>

        <!-- ── UKURAN ── -->
        <div class="field form-full">
          <label>Ukuran Tersedia</label>
          <div class="sizes-row" id="szRow">${szHtml}</div>
          <span class="field-hint" style="margin-top:6px">Klik ukuran untuk pilih / batal pilih</span>
        </div>

        <!-- ── FITUR / TAG ── -->
        <div class="field form-full">
          <label>Fitur &amp; Tag</label>
          <div class="tags-wrap" onclick="document.getElementById('tagIn').focus()">
            <span id="fcChips">${fcHtml}</span>
            <input class="tag-input" id="tagIn" placeholder="Ketik lalu tekan Enter..."
              onkeydown="onTagKey(event)" autocomplete="off"/>
          </div>
          <span class="field-hint">cth: Denim Premium · Made in Indonesia · Baggy Fit</span>
        </div>

        <!-- ── SPESIFIKASI ── -->
        <div class="field">
          <label for="f_mat">Material</label>
          <input type="text" id="f_mat" value="${esc(form.specs.Material||'')}" placeholder="cth. Denim 100% Cotton"/>
        </div>
        <div class="field">
          <label for="f_fit">Fit / Potongan</label>
          <input type="text" id="f_fit" value="${esc(form.specs.Fit||'')}" placeholder="cth. Baggy / Loose"/>
        </div>
        <div class="field">
          <label for="f_wash">Cara Cuci</label>
          <input type="text" id="f_wash" value="${esc(form.specs.Wash||'')}" placeholder="cth. Machine Wash Warm"/>
        </div>
        <div class="field">
          <label for="f_sku">SKU / Kode Produk</label>
          <input type="text" id="f_sku" value="${esc(form.specs.SKU||'')}" placeholder="cth. GRS-001"/>
        </div>

      </div><!-- /form-grid -->

      <!-- ── TOMBOL BAWAH ── -->
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:24px;padding-top:18px;border-top:1px solid rgba(255,255,255,.05);flex-wrap:wrap">
        <button type="button" class="btn btn-out" onclick="go('products')">✕ Batal</button>
        <button type="button" class="btn btn-out" onclick="saveProd('draft')">💾 Simpan Draft</button>
        <button type="button" class="btn btn-red" onclick="saveProd('active')">
          ${isEdit ? '🔄 Update Produk' : '🚀 Publish Produk'}
        </button>
      </div>

    </div><!-- /form-card -->
  `;

  // BUG FIX: attach event listeners setelah DOM dirender (requestAnimationFrame)
  requestAnimationFrame(() => {
    const fileInput = document.getElementById('imgFileInput');
    const drop      = document.getElementById('imgDrop');

    if (fileInput) {
      fileInput.addEventListener('change', ev => handleFiles(ev.target.files));
    }

    if (drop) {
      drop.addEventListener('dragover',  e => { e.preventDefault(); drop.classList.add('drag'); });
      drop.addEventListener('dragleave', e => { if (!drop.contains(e.relatedTarget)) drop.classList.remove('drag'); });
      drop.addEventListener('drop', e => {
        e.preventDefault();
        drop.classList.remove('drag');
        handleFiles(e.dataTransfer.files);
      });
    }
  });
}

/* ══════════════════════════════════════
   IMAGE UPLOAD
   BUG FIX: progress bar determinate,
   validasi MIME + ukuran, status text per-file
══════════════════════════════════════ */
function handleFiles(files) {
  const valid = [...files].filter(file => {
    if (!file.type.startsWith('image/')) {
      toast(`"${file.name}" bukan file gambar.`, 'err');
      return false;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast(`"${file.name}" terlalu besar (maks 5MB).`, 'err');
      return false;
    }
    return true;
  });

  if (!valid.length) return;

  // Upload satu per satu secara sequential
  let chain = Promise.resolve();
  valid.forEach(file => { chain = chain.then(() => uploadProductImg(file)); });
}

async function uploadProductImg(file) {
  const prog   = document.getElementById('imgProg');
  const bar    = document.getElementById('imgBar');
  const status = document.getElementById('imgStatus');

  // Tampilkan progress bar
  if (prog) prog.style.display = 'block';
  if (bar)  { bar.style.animation = 'none'; bar.style.width = '0%'; }
  if (status) status.textContent = `⬆ Mengupload "${file.name}"...`;

  // Simulasi progress awal (Supabase tidak expose upload progress lewat SDK standar)
  let pct = 0;
  const fakeProgress = setInterval(() => {
    pct = Math.min(pct + 8, 85);
    if (bar) bar.style.width = pct + '%';
  }, 100);

  try {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path     = `products/${Date.now()}_${safeName}`;

    const { error: upErr } = await sb.storage.from('assets').upload(path, file, {
      upsert: true,
      contentType: file.type
    });

    clearInterval(fakeProgress);

    if (upErr) {
      if (bar) bar.style.width = '0%';
      if (status) status.textContent = `❌ Gagal: ${upErr.message}`;
      toast(`Upload gagal: ${upErr.message}`, 'err');
      return;
    }

    // Selesai
    if (bar) bar.style.width = '100%';
    if (status) status.textContent = `✅ "${file.name}" berhasil diupload!`;

    const { data: urlData } = sb.storage.from('assets').getPublicUrl(path);
    form.images.push(urlData.publicUrl);
    refreshPrevs();
    toast(`"${file.name}" diupload!`, 'ok');

    // Reset progress setelah sebentar
    setTimeout(() => {
      if (prog) prog.style.display = 'none';
      if (status) status.textContent = '';
    }, 2000);

  } catch (e) {
    clearInterval(fakeProgress);
    if (status) status.textContent = `❌ Error: ${e.message}`;
    toast('Error upload: ' + e.message, 'err');
  }
}

function refreshPrevs() {
  const el = document.getElementById('imgPrevs');
  if (!el) return;
  if (!form.images.length) {
    el.innerHTML = '';
    return;
  }
  el.innerHTML = form.images.map((img, i) => `
    <div class="img-prev">
      <img src="${img}" alt="preview ${i+1}" onerror="this.style.background='#333'"/>
      <button type="button" class="star${i===0?' main':''}" onclick="setMain(${i})" title="Jadikan utama">★</button>
      <button type="button" class="rm" onclick="rmImg(${i})" title="Hapus">×</button>
    </div>`).join('');
}

function setMain(i) {
  if (i < 0 || i >= form.images.length) return;
  const [img] = form.images.splice(i, 1);
  form.images.unshift(img);
  refreshPrevs();
  toast('Foto utama diubah.', 'info');
}

function rmImg(i) {
  if (i < 0 || i >= form.images.length) return;
  form.images.splice(i, 1);
  refreshPrevs();
}

/* ── SIZE TOGGLE ── */
function toggleSize(s) {
  const idx = form.sizes.indexOf(s);
  if (idx === -1) form.sizes.push(s); else form.sizes.splice(idx, 1);
  const row = document.getElementById('szRow');
  if (row) row.innerHTML = ALL_SIZES.map(sz =>
    `<button type="button" class="sz-btn${form.sizes.includes(sz)?' on':''}" onclick="toggleSize('${sz}')">${sz}</button>`
  ).join('');
}

/* ── TAG/FITUR INPUT ── */
function onTagKey(ev) {
  if (ev.key === 'Enter') {
    ev.preventDefault();
    const v = ev.target.value.trim();
    if (v && !form.features.includes(v)) {
      form.features.push(v);
      refreshChips();
    }
    ev.target.value = '';
  }
  if (ev.key === 'Backspace' && !ev.target.value && form.features.length) {
    form.features.pop();
    refreshChips();
  }
}

function rmFeat(i) { form.features.splice(i, 1); refreshChips(); }

function refreshChips() {
  const el = document.getElementById('fcChips');
  if (!el) return;
  el.innerHTML = form.features.map((f, i) =>
    `<span class="tag-chip">${esc(f)}<button type="button" onclick="rmFeat(${i})">×</button></span>`
  ).join('');
}

/* ── READ FORM (null-safe) ── */
function readForm() {
  form.name     = document.getElementById('f_name')?.value.trim()      || '';
  form.tagline  = document.getElementById('f_tagline')?.value.trim()   || '';
  form.price    = Number(document.getElementById('f_price')?.value)    || 0;
  form.priceOri = Number(document.getElementById('f_priceOri')?.value) || 0;
  form.category = document.getElementById('f_cat')?.value              || '';
  form.badge    = document.getElementById('f_badge')?.value            || '';
  form.desc     = document.getElementById('f_desc')?.value.trim()      || '';
  if (!form.specs) form.specs = {};
  form.specs.Material = document.getElementById('f_mat')?.value.trim()  || '';
  form.specs.Fit      = document.getElementById('f_fit')?.value.trim()  || '';
  form.specs.Wash     = document.getElementById('f_wash')?.value.trim() || '';
  form.specs.SKU      = document.getElementById('f_sku')?.value.trim()  || '';
}

/* ══════════════════════════════════════
   SAVE PRODUCT
   BUG FIX: btn re-enabled on ALL error paths
══════════════════════════════════════ */
async function saveProd(status) {
  readForm();

  // Validasi
  if (!form.name.trim())         { toast('Nama produk wajib diisi!', 'err'); return; }
  if (!form.price || form.price <= 0) { toast('Harga harus lebih dari 0!', 'err'); return; }
  if (!form.category)            { toast('Kategori wajib dipilih!', 'err'); return; }
  if (!form.desc.trim())         { toast('Deskripsi produk wajib diisi!', 'err'); return; }

  // Disable buttons
  const pubBtn   = document.getElementById('pubBtn');
  const draftBtn = document.getElementById('draftBtn');
  if (pubBtn)   { pubBtn.disabled   = true; pubBtn.textContent   = 'Menyimpan...'; }
  if (draftBtn) { draftBtn.disabled = true; }

  const resetBtns = () => {
    if (pubBtn)   { pubBtn.disabled   = false; pubBtn.textContent   = editId ? '🔄 Update' : '🚀 Publish'; }
    if (draftBtn) { draftBtn.disabled = false; }
  };

  const payload = {
    name:        form.name,
    brand:       'Garisrey',
    tagline:     form.tagline,
    category:    form.category,
    price:       form.price,
    price_ori:   form.priceOri || null,
    badge:       form.badge    || null,
    description: form.desc,
    sizes:       form.sizes,
    features:    form.features,
    images:      form.images,
    status,
    specs:       form.specs
  };

  try {
    let error;
    if (editId) {
      ({ error } = await sb.from('products')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', editId));
      if (!error) toast('Produk berhasil diupdate! ✨', 'ok');
    } else {
      ({ error } = await sb.from('products').insert(payload));
      if (!error) toast('Produk berhasil ditambahkan! 🎉', 'ok');
    }

    if (error) {
      toast('Gagal menyimpan: ' + error.message, 'err');
      resetBtns();
      return;
    }

    await loadProducts();
    go('products');

  } catch (e) {
    toast('Error: ' + e.message, 'err');
    resetBtns();
  }
}

/* ── START EDIT ── */
function startEdit(id) {
  const p = products.find(x => x.id === id);
  if (!p) { toast('Produk tidak ditemukan.', 'err'); return; }
  editId = id;
  form = {
    name:     p.name,
    tagline:  p.tagline   || '',
    category: p.category  || '',
    price:    p.price     || 0,
    priceOri: p.price_ori || 0,
    badge:    p.badge     || '',
    desc:     p.description || '',
    sizes:    [...(p.sizes    || [])],
    features: [...(p.features || [])],
    images:   [...(p.images   || [])],
    status:   p.status,
    specs: {
      Material: p.specs?.Material || '',
      Fit:      p.specs?.Fit      || '',
      Wash:     p.specs?.Wash     || '',
      SKU:      p.specs?.SKU      || ''
    }
  };
  go('edit');
}

/* ── CONFIRM DELETE ── */
function confirmDel(id, name) {
  delId = id;
  const nameEl = document.getElementById('delName');
  if (nameEl) nameEl.textContent = name;
  const modal = document.getElementById('delModal');
  if (modal) modal.style.display = 'flex';
}

async function execDelete() {
  const { error } = await sb.from('products').delete().eq('id', delId);
  const modal = document.getElementById('delModal');
  if (error) { toast('Gagal hapus: ' + error.message, 'err'); return; }
  if (modal) modal.style.display = 'none';
  toast('Produk dihapus.', 'info');
  await loadProducts();
  if (curPage === 'products')  renderProducts();
  else if (curPage === 'home') renderHome();
  else                          renderDashboard();
}

/* ── TOGGLE STATUS ── */
async function toggleStatus(id, cur) {
  const ns = cur === 'active' ? 'draft' : 'active';
  const { error } = await sb.from('products').update({ status: ns }).eq('id', id);
  if (error) { toast('Gagal ubah status: ' + error.message, 'err'); return; }
  toast(`Status diubah ke "${ns}"`, 'info');
  await loadProducts();
  if (curPage === 'products')  renderProducts();
  else if (curPage === 'home') renderHome();
  else                          renderDashboard();
}

/* ══════════════════════════════════════
   ATUR BERANDA
══════════════════════════════════════ */
async function loadBeranda() {
  const { data } = await sb.from('settings').select('value').eq('key','beranda').single().catch(() => ({ data: null }));
  if (data?.value) beranda = { heroImages: [], heroVideo: null, ...data.value };
}

async function saveBeranda() {
  const { error } = await sb.from('settings')
    .upsert({ key: 'beranda', value: beranda }, { onConflict: 'key' });
  if (error) { toast('Gagal simpan: ' + error.message, 'err'); return; }
  toast('Pengaturan beranda disimpan! 🏠', 'ok');
}

async function getStorageItems(folder) {
  try {
    const { data, error } = await sb.storage.from('assets').list(folder, { limit: 200, sortBy: { column: 'created_at', order: 'desc' } });
    if (error || !data) return [];
    return data
      .filter(f => f.name && !f.name.startsWith('.') && f.metadata?.size > 0)
      .map(f => {
        const { data: pub } = sb.storage.from('assets').getPublicUrl(`${folder}/${f.name}`);
        return { url: pub.publicUrl, name: f.name, path: `${folder}/${f.name}` };
      });
  } catch (_) { return []; }
}

async function setBerandaTab(t) {
  berandaTab = t;
  document.querySelectorAll('[data-btab]').forEach(el => el.classList.toggle('on', el.dataset.btab === t));
  await renderBerandaGrid();
}

async function renderBerandaGrid() {
  const grid = document.getElementById('berandaGrid');
  if (!grid) return;
  grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:28px;color:var(--gray);font-size:11px">Memuat aset...</div>';

  if (berandaTab === 'images') {
    const items = await getStorageItems('products');
    grid.innerHTML = !items.length
      ? '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--gray);font-size:11px">Belum ada foto. Upload di "Kelola Aset" dulu.</div>'
      : items.map(a => `
        <div class="media-item${beranda.heroImages.includes(a.url)?' sel':''}" onclick="toggleHeroImg('${encodeURIComponent(a.url)}')">
          <img src="${a.url}" alt="${esc(a.name)}"/>
          <div class="media-check">✓</div>
          <div class="media-name">${esc(a.name)}</div>
        </div>`).join('');
  } else {
    const items = await getStorageItems('videos');
    grid.innerHTML = !items.length
      ? '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--gray);font-size:11px">Belum ada video. Upload di "Kelola Aset" dulu.</div>'
      : items.map(a => `
        <div class="media-item${beranda.heroVideo===a.url?' sel':''}" onclick="selHeroVid('${encodeURIComponent(a.url)}')">
          <video src="${a.url}" muted preload="metadata"></video>
          <span class="vid-badge">VIDEO</span>
          <div class="media-check">✓</div>
          <div class="media-name">${esc(a.name)}</div>
        </div>`).join('');
  }
}

function toggleHeroImg(urlEnc) {
  const url = decodeURIComponent(urlEnc);
  const i   = beranda.heroImages.indexOf(url);
  if (i === -1) beranda.heroImages.push(url); else beranda.heroImages.splice(i, 1);
  renderBerandaGrid();
}

function selHeroVid(urlEnc) {
  const url = decodeURIComponent(urlEnc);
  beranda.heroVideo = beranda.heroVideo === url ? null : url;
  renderBerandaGrid();
}

async function renderBeranda() {
  await loadBeranda();
  document.getElementById('pageContent').innerHTML = `
    <div class="sec-head">
      <h2 class="sec-title">Atur Beranda / Hero</h2>
      <button class="btn btn-red btn-sm" onclick="saveBeranda()">💾 Simpan</button>
    </div>
    <div class="form-card">
      <p style="font-size:11px;color:var(--gray);margin-bottom:16px;line-height:1.7">
        Pilih media untuk tampilan hero di halaman beranda website.<br>
        <strong style="color:rgba(255,255,255,.5)">Video diprioritaskan</strong> di atas foto jika keduanya dipilih.
      </p>
      <div class="tab-row">
        <button class="tab-btn on" data-btab="images" onclick="setBerandaTab('images')">🖼️ Foto Hero</button>
        <button class="tab-btn" data-btab="videos" onclick="setBerandaTab('videos')">🎬 Video Hero</button>
      </div>
      <div class="media-grid" id="berandaGrid"></div>
      <div style="margin-top:16px;padding-top:14px;border-top:1px solid rgba(255,255,255,.05);display:flex;justify-content:flex-end">
        <button class="btn btn-red" onclick="saveBeranda()">💾 Simpan Pengaturan</button>
      </div>
    </div>`;
  await renderBerandaGrid();
}

/* ══════════════════════════════════════
   KELOLA ASET
══════════════════════════════════════ */
async function setAssetTab(t) {
  assetTab = t;
  document.querySelectorAll('[data-atab]').forEach(el => el.classList.toggle('on', el.dataset.atab === t));
  await renderAssetGrid();
}

async function renderAssetGrid() {
  const grid = document.getElementById('assetGrid');
  if (!grid) return;
  grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:28px;color:var(--gray);font-size:11px">Memuat...</div>';

  const folder = assetTab === 'videos' ? 'videos' : assetTab === 'logo' ? 'logo' : 'products';
  const items  = await getStorageItems(folder);

  grid.innerHTML = !items.length
    ? '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--gray);font-size:11px">Kosong. Upload file di atas.</div>'
    : items.map(a => `
      <div class="media-item" style="cursor:default">
        ${assetTab === 'videos'
          ? `<video src="${a.url}" muted preload="metadata"></video><span class="vid-badge">VIDEO</span>`
          : `<img src="${a.url}" alt="${esc(a.name)}" loading="lazy"/>`}
        <div class="media-name">${esc(a.name)}</div>
        <button type="button" onclick="deleteAsset('${a.path}')"
          style="position:absolute;top:4px;right:4px;width:20px;height:20px;background:rgba(0,0,0,.75);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;cursor:pointer;color:#fff;border:none"
          onmouseover="this.style.background='var(--red)'" onmouseout="this.style.background='rgba(0,0,0,.75)'"
          title="Hapus file">✕</button>
      </div>`).join('');
}

async function deleteAsset(path) {
  if (!confirm('Hapus file ini dari storage?\nTindakan ini tidak dapat dibatalkan.')) return;
  const { error } = await sb.storage.from('assets').remove([path]);
  if (error) { toast('Gagal hapus: ' + error.message, 'err'); return; }
  toast('File dihapus.', 'info');
  await renderAssetGrid();
}

async function uploadAssets(ev) {
  const prog = document.getElementById('assetProg');
  if (prog) prog.style.display = 'block';

  const files = [...ev.target.files];
  for (const file of files) {
    const isVid = file.type.startsWith('video/');
    const isImg = file.type.startsWith('image/');
    if (!isVid && !isImg) { toast(`Format tidak didukung: ${file.name}`, 'err'); continue; }
    if (file.size > 100 * 1024 * 1024) { toast(`File terlalu besar (maks 100MB): ${file.name}`, 'err'); continue; }

    const folder   = assetTab === 'logo' ? 'logo' : isVid ? 'videos' : 'products';
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path     = `${folder}/${Date.now()}_${safeName}`;

    const { error } = await sb.storage.from('assets').upload(path, file, { upsert: true, contentType: file.type });
    if (error) toast(`Gagal upload "${file.name}": ${error.message}`, 'err');
    else       toast(`"${file.name}" berhasil diupload! ✅`, 'ok');
  }

  if (prog) prog.style.display = 'none';
  ev.target.value = '';
  await renderAssetGrid();
}

async function renderAssets() {
  assetTab = 'products'; // reset ke default
  document.getElementById('pageContent').innerHTML = `
    <div class="sec-head"><h2 class="sec-title">Kelola Aset Storage</h2></div>
    <div class="form-card">
      <div class="tab-row">
        <button class="tab-btn on" data-atab="products" onclick="setAssetTab('products')">🖼️ Foto Produk</button>
        <button class="tab-btn" data-atab="videos"   onclick="setAssetTab('videos')">🎬 Video</button>
        <button class="tab-btn" data-atab="logo"     onclick="setAssetTab('logo')">🏷️ Logo</button>
      </div>
      <div class="img-drop" style="padding:18px;margin-bottom:12px;position:relative">
        <input type="file" multiple accept="image/*,video/*" onchange="uploadAssets(event)"
          style="position:absolute;inset:0;opacity:0;cursor:pointer;width:100%;height:100%"/>
        <div class="img-drop-ico" style="font-size:24px">⬆️</div>
        <div class="img-drop-txt">Klik atau drag &amp; drop untuk upload</div>
        <div class="img-drop-hint">Foto (JPG/PNG/WEBP) atau Video (MP4/MOV/WEBM) · Maks 100MB per file</div>
      </div>
      <div class="prog-wrap" id="assetProg"><div class="prog-bar"></div></div>
      <div class="media-grid" id="assetGrid"></div>
    </div>`;
  await renderAssetGrid();
}

/* ══════════════════════════════════════
   EXPOSE GLOBALS
══════════════════════════════════════ */
window.go            = go;
window.toggleSB      = toggleSB;
window.closeSB       = closeSB;
window.doLogout      = doLogout;
window.toast         = toast;
window.setMain       = setMain;
window.rmImg         = rmImg;
window.toggleSize    = toggleSize;
window.onTagKey      = onTagKey;
window.rmFeat        = rmFeat;
window.saveProd      = saveProd;
window.startEdit     = startEdit;
window.confirmDel    = confirmDel;
window.execDelete    = execDelete;
window.toggleStatus  = toggleStatus;
window.saveBeranda   = saveBeranda;
window.setBerandaTab = setBerandaTab;
window.toggleHeroImg = toggleHeroImg;
window.selHeroVid    = selHeroVid;
window.setAssetTab   = setAssetTab;
window.deleteAsset   = deleteAsset;
window.uploadAssets  = uploadAssets;

/* ══════════════════════════════════════
   INIT — AUTH CHECK & BOOT
══════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', async () => {
  sb = initSupabase();
  if (!sb) { console.error('[Admin] Supabase tidak terinitalisasi'); return; }

  try {
    const { data: { session }, error: sessErr } = await sb.auth.getSession();

    if (sessErr || !session?.user) {
      window.location.href = '../index.html';
      return;
    }

    if (session.user.email !== ADMIN_EMAIL) {
      toast('Akses ditolak. Hanya admin.', 'err');
      setTimeout(() => { window.location.href = 'shop.html'; }, 1500);
      return;
    }

    // Auth OK
    document.getElementById('authGate').style.display    = 'none';
    document.getElementById('adminLayout').style.display = 'flex';

    const u      = session.user;
    const nameEl = document.getElementById('uName');
    const mailEl = document.getElementById('uEmail');
    const avEl   = document.getElementById('userAv');

    if (nameEl) nameEl.textContent = u.user_metadata?.full_name || u.email.split('@')[0] || 'Admin';
    if (mailEl) mailEl.textContent = u.email;
    if (avEl && u.user_metadata?.avatar_url) {
      avEl.innerHTML = `<img src="${u.user_metadata.avatar_url}" alt="avatar" style="width:100%;height:100%;object-fit:cover;border-radius:50%"/>`;
    } else if (avEl && nameEl) {
      avEl.textContent = (nameEl.textContent || 'A')[0].toUpperCase();
    }

    loadLogo();
    await loadProducts();
    go('home');

  } catch (e) {
    console.error('[Admin init]', e);
    window.location.href = '../index.html';
  }
});
