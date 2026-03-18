/**
 * GARISREY — login.js
 * Logic halaman Login & Daftar
 */

let mode = 'masuk';

/* ── HIDE LOADER ── */
function hideLoader() {
  const el = document.getElementById('pgLoader');
  if (!el || el.classList.contains('hidden')) return;
  el.classList.add('hidden');
  setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 500);
}

/* ── SET PANEL BACKGROUND ── */
function setPanelBg() {
  const bg   = document.getElementById('panelBg');
  if (!bg) return;
  const imgs = [
    '../assets/img/1.jpeg',
    '../assets/img/2.jpeg',
    '../assets/img/3.jpeg',
    '../assets/img/4.jpeg'
  ];
  const img = document.createElement('img');
  img.alt   = 'Garisrey';
  let idx   = 0;

  const tryNext = () => {
    if (idx >= imgs.length) return;
    img.src = imgs[idx++];
  };

  img.onerror = tryNext;
  img.onload  = () => { bg.appendChild(img); };
  tryNext();
}

/* ── SWITCH TAB ── */
function switchTab(t) {
  mode = t;
  document.getElementById('tabMasuk').classList.toggle('on', t === 'masuk');
  document.getElementById('tabDaftar').classList.toggle('on', t === 'daftar');

  const confirmField  = document.getElementById('confirmField');
  const forgotLink    = document.getElementById('forgotLink');
  const strengthWrap  = document.getElementById('strengthWrap');
  const btnTxt        = document.getElementById('btnTxt');
  const passIn        = document.getElementById('passIn');

  if (confirmField) confirmField.style.display  = t === 'daftar' ? 'block' : 'none';
  if (forgotLink)   forgotLink.style.display    = t === 'masuk'  ? 'block' : 'none';
  if (strengthWrap) strengthWrap.style.display  = t === 'daftar' ? 'block' : 'none';
  if (btnTxt)       btnTxt.textContent          = t === 'masuk'  ? 'Masuk →' : 'Daftar →';
  if (passIn)       passIn.autocomplete         = t === 'masuk'  ? 'current-password' : 'new-password';

  hideAlert();
}

/* ── TOGGLE PASSWORD VISIBILITY ── */
function togglePass(btn) {
  const inp = document.getElementById('passIn');
  if (!inp) return;
  inp.type        = inp.type === 'password' ? 'text' : 'password';
  btn.textContent = inp.type === 'password' ? 'SHOW' : 'HIDE';
}

/* ── PASSWORD STRENGTH ── */
function onPassKey(ev) {
  if (mode === 'daftar') checkStrength(ev.target.value);
  if (ev.key === 'Enter') doAuth();
}

function checkStrength(v) {
  const segs = [
    document.getElementById('sg1'),
    document.getElementById('sg2'),
    document.getElementById('sg3'),
    document.getElementById('sg4')
  ];
  const txtEl = document.getElementById('strengthTxt');

  segs.forEach(s => { if (s) s.className = 'strength-seg'; });
  if (!v) { if (txtEl) txtEl.textContent = ''; return; }

  let score = 0;
  if (v.length >= 6)  score++;
  if (v.length >= 10) score++;
  if (/[A-Z]/.test(v) && /[0-9]/.test(v)) score++;
  if (/[^A-Za-z0-9]/.test(v)) score++;

  const cls = score <= 1 ? 'w' : score === 2 ? 'm' : 's';
  const lbl = score <= 1 ? 'Lemah' : score === 2 ? 'Cukup' : score === 3 ? 'Kuat' : 'Sangat Kuat';

  for (let i = 0; i < score; i++) {
    if (segs[i]) segs[i].classList.add(cls);
  }
  if (txtEl) txtEl.textContent = lbl;
}

/* ── ALERT ── */
function showAlert(msg, type = 'err') {
  const el = document.getElementById('alertBox');
  if (!el) return;
  el.textContent = msg;
  el.className   = `alert alert-${type} show`;
}

function hideAlert() {
  const el = document.getElementById('alertBox');
  if (!el) return;
  el.className   = 'alert';
  el.textContent = '';
}

/* ── AUTH ── */
async function doAuth() {
  const email = document.getElementById('emailIn')?.value.trim();
  const pass  = document.getElementById('passIn')?.value;
  const btn   = document.getElementById('authBtn');

  hideAlert();

  if (!email) { showAlert('Email wajib diisi.'); return; }
  if (!pass)  { showAlert('Password wajib diisi.'); return; }

  btn.classList.add('loading');
  btn.disabled = true;

  try {
    if (mode === 'masuk') {
      const { error } = await sb.auth.signInWithPassword({ email, password: pass });
      if (error) throw error;
      // Redirect ditangani oleh onAuthStateChange
    } else {
      const conf = document.getElementById('confirmIn')?.value;
      if (pass !== conf) {
        showAlert('Password tidak cocok.');
        btn.classList.remove('loading');
        btn.disabled = false;
        return;
      }
      if (pass.length < 6) {
        showAlert('Password minimal 6 karakter.');
        btn.classList.remove('loading');
        btn.disabled = false;
        return;
      }
      const { error } = await sb.auth.signUp({ email, password: pass });
      if (error) throw error;
      showAlert('Akun dibuat! Cek email konfirmasi, lalu masuk.', 'ok');
      btn.classList.remove('loading');
      btn.disabled = false;
    }
  } catch (e) {
    const errMap = {
      'Invalid login credentials': 'Email atau password salah.',
      'Email not confirmed': 'Konfirmasi email dulu — cek inbox/spam.',
      'User already registered': 'Email sudah terdaftar, silakan masuk.'
    };
    showAlert(errMap[e.message] || e.message || 'Terjadi kesalahan.');
    btn.classList.remove('loading');
    btn.disabled = false;
  }
}

/* ── FORGOT PASSWORD ── */
async function doForgot() {
  const email = document.getElementById('emailIn')?.value.trim();
  if (!email) { showAlert('Masukkan email kamu dulu.'); return; }

  // redirectTo harus ke halaman login pages/
  const redirectTo = window.location.origin + '/pages/login.html';

  const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) showAlert('Gagal kirim email reset: ' + error.message);
  else showAlert('Email reset dikirim! Cek inbox.', 'ok');
}

/* ── EXPOSE ── */
window.switchTab  = switchTab;
window.togglePass = togglePass;
window.onPassKey  = onPassKey;
window.doAuth     = doAuth;
window.doForgot   = doForgot;

/* ── INIT ── */
document.addEventListener('DOMContentLoaded', async () => {
  sb = initSupabase();

  setPanelBg();

  // Sembunyikan loader segera — jangan tunggu apapun
  hideLoader();

  if (!sb) return;

  // Cek sesi di background
  try {
    const { data: { session } } = await sb.auth.getSession();
    if (session?.user) redirectAfterLogin(session.user.email);
  } catch (_) {}

  // Handle redirect setelah login berhasil
  sb.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && session?.user) {
      redirectAfterLogin(session.user.email);
    }
  });
});
