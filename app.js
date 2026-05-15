const SUPABASE_URL = "https://mrzcczicecshjtwlxxrv.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1yemNjemljZWNzaGp0d2x4eHJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyMTA2NjAsImV4cCI6MjA5Mzc4NjY2MH0.O-6YoIaI-jLYQjGgPdpgZ8iH5GRI4sXBg6YAG8hGJLA";

const siopiDb = window.supabase
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

async function testSupabaseConnection() {
  if (!siopiDb) {
    console.warn("Supabase belum tersedia. Periksa koneksi CDN Supabase.");
    return;
  }
  const { data, error } = await siopiDb
    .from("siopi_laporan")
    .select("*")
    .limit(1);

  if (error) {
    console.error("Supabase gagal terhubung:", error);
  } else {
    console.log("Supabase berhasil terhubung:", data);
  }
}

const SIOPI_LOCAL_USERS = {
  'admin': { pass: 'admin123', nama: 'Admin Global', role: 'Admin', diAkses: 'ALL' },
  'kasi_op': { pass: 'kasiop123', nama: 'Kepala Seksi O&P', role: 'Kepala Seksi O&P', diAkses: 'ALL' },
  'op_mepanga': { pass: 'mepanga123', nama: 'Operator Mepanga', role: 'Operator', diAkses: 'D.I Mepanga' },
  'op_malino': { pass: 'malino123', nama: 'Operator Malino', role: 'Operator', diAkses: 'D.I Malino' }
};

function mapRoleDbToUi(role) {
  const normalized = String(role || '').toLowerCase();
  if (normalized === 'admin') return 'Admin';
  if (normalized === 'kasi_op') return 'Kepala Seksi O&P';
  return 'Operator';
}

function mapRoleDbToLabel(role) {
  const normalized = String(role || '').toLowerCase();
  if (normalized === 'admin') return 'Admin Global';
  if (normalized === 'kasi_op') return 'Kepala Seksi O&P';
  return 'Operator';
}

function loginSiopiLokal(username, password) {
  const user = SIOPI_LOCAL_USERS[username];
  if (user && user.pass === password) {
    return { success: true, user: { username, nama: user.nama, role: user.role, diAkses: user.diAkses } };
  }
  return { success: false, message: "Username atau Password salah!" };
}

async function loginSiopiOnline(username, password) {
  if (!siopiDb) throw new Error("Koneksi Supabase belum tersedia.");
  const { data, error } = await siopiDb.rpc('login_siopi_user', {
    p_username: username,
    p_password: password
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || !row.success) {
    return { success: false, message: row?.message || "Username atau Password salah!" };
  }
  const role = mapRoleDbToUi(row.role);
  return {
    success: true,
    user: {
      username: row.username || username,
      nama: row.nama || row.username || username,
      role,
      diAkses: row.daerah_irigasi || 'ALL'
    }
  };
}

// Simulasi fungsi server Google Apps Script (Revisi Akun Multi-D.I)
        if (typeof google === 'undefined') {
            window.google = { script: { run: (function() {
                const runner = {
                    _sCb: null, _fCb: null,
                    withSuccessHandler: function(cb) { this._sCb = cb; return this; },
                    withFailureHandler: function(cb) { this._fCb = cb; return this; },
                    doLogin: function(u, p) { 
                        setTimeout(() => { 
                            if (this._sCb) this._sCb(loginSiopiLokal(u, p));
                        }, 400); 
                    },
                    resetDataAll: function() { setTimeout(() => { if (this._sCb) this._sCb({success: true}); }, 400); },
                    getProfilDataGS: function(diName) { setTimeout(() => { if (this._sCb) this._sCb(null); }, 400); },
                    saveProfilDataGS: function(diName, data) { setTimeout(() => { if (this._sCb) this._sCb(true); }, 400); }
                };
                return runner;
            })() } };
        }

        function initIcons() { if (typeof lucide !== 'undefined') lucide.createIcons(); }
        
        let currentUser = null;
        let currentDI = "D.I Mepanga";
        let isProfilEditMode = false;
        let tempProfilData = null;
        const DEFAULT_DAFTAR_DI = ["D.I Mepanga", "D.I Malino"];
        let daftarDI = [...DEFAULT_DAFTAR_DI];

        // ==========================================
        // FUNGSI NOTIFIKASI TOAST (FLOATING ELEGAN)
        // ==========================================
        function showToast(message, type = 'success') {
            let container = document.getElementById('toast-container');
            if (!container) {
                container = document.createElement('div');
                container.id = 'toast-container';
                // Posisi di kanan bawah layar, z-index paling tinggi
                container.className = 'fixed bottom-8 right-8 z-[9999] flex flex-col gap-3 pointer-events-none';
                document.body.appendChild(container);
            }

            const toast = document.createElement('div');
            const bgColor = type === 'success' ? 'bg-emerald-600' : 'bg-indigo-600';
            const icon = type === 'success' ? 'check-circle-2' : 'info';

            toast.className = `flex items-center gap-3 px-5 py-4 rounded-xl shadow-2xl ${bgColor} text-white transform transition-all duration-300 translate-y-10 opacity-0 border border-white/20`;
            toast.innerHTML = `<i data-lucide="${icon}" class="w-5 h-5 shrink-0"></i><p class="text-sm font-bold tracking-wide">${message}</p>`;

            container.appendChild(toast);
            if (typeof initIcons === 'function') initIcons();

            // Animasi Masuk (Pop-up)
            requestAnimationFrame(() => {
                toast.classList.remove('translate-y-10', 'opacity-0');
            });

            // Animasi Keluar dan Hapus setelah 3.5 Detik
            setTimeout(() => {
                toast.classList.add('translate-y-10', 'opacity-0');
                setTimeout(() => toast.remove(), 300);
            }, 3500);
        }

        // ==========================================
        // FUNGSI GANTI DAERAH IRIGASI (REVISI MODERN)
        // ==========================================
        async function changeDI(newDI) {
            if (currentDI === newDI) return; 
            
            // Konfirmasi keamanan jika sedang mengedit profil (Gunakan Modal Modern)
            if (isProfilEditMode) {
                const isConfirmed = await showModernConfirm(
                    "Pindah Daerah Irigasi?",
                    "Anda sedang mengedit Profil. Yakin ingin berpindah markas D.I tanpa menyimpan perubahan?"
                );
                
                if (!isConfirmed) {
                    // Jika batal, kembalikan posisi dropdown ke D.I sebelumnya
                    document.getElementById('sidebar-di-select').value = currentDI;
                    return;
                }
                toggleEditProfil(); // Batalkan edit mode
            }

            // Ubah State Global
            currentDI = newDI;
            
            // Amankan Dropdown UI
            const selectEl = document.getElementById('sidebar-di-select');
            if (selectEl) selectEl.value = currentDI;

            // Eksekusi Pemuatan Data D.I Baru
            loadProfilDI();
            
            // Reset seluruh tampilan kembali ke Dashboard agar fresh
            navigate('dashboard'); 
            
            // Panggil notifikasi Toast yang profesional!
            showToast(`Sistem dialihkan ke ${currentDI}. Database aktif.`, 'success');
        }

        // Helper Penyimpanan Data
        function getLS(key, def = {}) { 
            const d = localStorage.getItem('siop_' + key); 
            return d ? JSON.parse(d) : def; 
        }
        function setLS(key, val) { 
            localStorage.setItem('siop_' + key, JSON.stringify(val)); 
        }

        function escapeHtml(value) {
            return String(value ?? '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        }

        function escapeHtmlAttr(value) {
            return escapeHtml(value);
        }

        function normalizeDaftarDI(items = []) {
            const names = items
                .map(item => typeof item === 'string' ? item : (item?.nama || item?.daerah_irigasi || item?.name || ''))
                .map(name => String(name || '').trim())
                .filter(Boolean);
            return Array.from(new Set(names)).sort((a, b) => a.localeCompare(b, 'id'));
        }

        async function loadDaftarDIDariSupabase() {
            if (!siopiDb) return [];
            const { data, error } = await siopiDb
                .from('siopi_daerah_irigasi')
                .select('*')
                .eq('aktif', true)
                .order('nama', { ascending: true });

            if (error) throw error;
            return normalizeDaftarDI(data || []);
        }

        async function syncDaftarDIAwal() {
            const cached = getLS('daftar_di', []);
            daftarDI = normalizeDaftarDI(cached.length ? cached : DEFAULT_DAFTAR_DI);
            renderDaftarDISelect();

            try {
                const onlineList = await loadDaftarDIDariSupabase();
                if (onlineList.length > 0) {
                    daftarDI = onlineList;
                    setLS('daftar_di', daftarDI);
                    renderDaftarDISelect();
                }
            } catch (err) {
                console.warn('Daftar D.I online belum bisa dimuat. Menggunakan daftar lokal.', err);
            }
        }

        function getDaftarDIAktifUntukUser() {
            if (currentUser?.diAkses && currentUser.diAkses !== 'ALL') {
                return normalizeDaftarDI([currentUser.diAkses]);
            }
            return normalizeDaftarDI(daftarDI.length ? daftarDI : DEFAULT_DAFTAR_DI);
        }

        function renderDaftarDISelect() {
            const selectEl = document.getElementById('sidebar-di-select');
            const labelText = document.getElementById('sidebar-di-label');
            const list = getDaftarDIAktifUntukUser();

            if (!list.includes(currentDI)) {
                currentDI = list[0] || currentDI || DEFAULT_DAFTAR_DI[0];
            }

            if (selectEl) {
                selectEl.innerHTML = list.map(name => `<option value="${escapeHtmlAttr(name)}">${escapeHtml(name)}</option>`).join('');
                selectEl.value = currentDI;
            }
            if (labelText) labelText.innerText = currentDI;
        }

        function showKelolaDIAlert(message, type = 'info') {
            const el = document.getElementById('kelola-di-alert');
            if (!el) return;
            const cls = type === 'error'
                ? 'bg-red-50 text-red-700 border-red-200'
                : type === 'success'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-blue-50 text-blue-700 border-blue-200';
            el.className = `rounded-lg border p-3 text-sm font-bold text-center ${cls}`;
            el.innerHTML = message;
            el.classList.remove('hidden');
        }

        function bukaModalKelolaDI() {
            if (!currentUser || currentUser.role !== 'Admin') {
                showToast('Fitur Kelola D.I hanya untuk Admin Global.', 'info');
                return;
            }
            ['kelola-di-nama', 'kelola-di-kode', 'kelola-di-kabupaten', 'kelola-di-akun-username', 'kelola-di-akun-password', 'kelola-di-akun-nama'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = '';
            });
            const buatAkun = document.getElementById('kelola-di-buat-akun');
            const akunFields = document.getElementById('kelola-di-akun-fields');
            const passEl = document.getElementById('kelola-di-akun-password');
            if (buatAkun) buatAkun.checked = false;
            if (akunFields) akunFields.classList.add('hidden');
            if (passEl) passEl.type = 'text';
            const alertEl = document.getElementById('kelola-di-alert');
            if (alertEl) alertEl.classList.add('hidden');
            const modal = document.getElementById('modal-kelola-di');
            if (modal) {
                modal.classList.remove('hidden');
                modal.classList.add('flex');
            }
            if (typeof initIcons === 'function') initIcons();
            setTimeout(() => document.getElementById('kelola-di-nama')?.focus(), 80);
        }

        function toggleBuatAkunOperatorDI() {
            const checked = document.getElementById('kelola-di-buat-akun')?.checked;
            const fields = document.getElementById('kelola-di-akun-fields');
            if (fields) fields.classList.toggle('hidden', !checked);
            if (typeof initIcons === 'function') initIcons();
        }

        function toggleKelolaDIPassword() {
            const input = document.getElementById('kelola-di-akun-password');
            const icon = document.getElementById('kelola-di-akun-eye');
            if (!input) return;
            input.type = input.type === 'password' ? 'text' : 'password';
            if (icon) icon.setAttribute('data-lucide', input.type === 'password' ? 'eye' : 'eye-off');
            if (typeof initIcons === 'function') initIcons();
        }

        function tutupModalKelolaDI() {
            const modal = document.getElementById('modal-kelola-di');
            if (modal) {
                modal.classList.add('hidden');
                modal.classList.remove('flex');
            }
        }

        async function simpanKelolaDI() {
            const nama = document.getElementById('kelola-di-nama')?.value.trim();
            const kodeDI = document.getElementById('kelola-di-kode')?.value.trim() || null;
            const kabupaten = document.getElementById('kelola-di-kabupaten')?.value.trim() || null;
            const shouldCreateAccount = document.getElementById('kelola-di-buat-akun')?.checked;
            const akunUsername = document.getElementById('kelola-di-akun-username')?.value.trim().toLowerCase();
            const akunPassword = document.getElementById('kelola-di-akun-password')?.value.trim();
            const akunNama = document.getElementById('kelola-di-akun-nama')?.value.trim();
            const btn = document.getElementById('btn-simpan-kelola-di');
            const originalHtml = btn?.innerHTML || '';

            if (!nama) {
                showKelolaDIAlert('Nama D.I wajib diisi.', 'error');
                return;
            }
            if (shouldCreateAccount) {
                if (!akunUsername) return showKelolaDIAlert('Username wajib diisi.', 'error');
                if (!akunPassword || akunPassword.length < 6) return showKelolaDIAlert('Password minimal 6 karakter.', 'error');
                if (!akunNama) return showKelolaDIAlert('Nama tampilan wajib diisi.', 'error');
            }
            if (!siopiDb) {
                showKelolaDIAlert('Koneksi Supabase belum tersedia. D.I belum dapat disimpan online.', 'error');
                return;
            }

            try {
                if (btn) {
                    btn.disabled = true;
                    btn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> Menyimpan...';
                    if (typeof initIcons === 'function') initIcons();
                }

                const { error } = await siopiDb
                    .from('siopi_daerah_irigasi')
                    .upsert({
                        nama,
                        kode_di: kodeDI,
                        kabupaten,
                        aktif: true,
                        updated_at: new Date().toISOString()
                    }, { onConflict: 'nama' });

                if (error) throw error;

                if (shouldCreateAccount) {
                    const { data: akunData, error: akunError } = await siopiDb.rpc('upsert_siopi_user', {
                        p_username: akunUsername,
                        p_password: akunPassword,
                        p_nama: akunNama,
                        p_role: 'operator',
                        p_daerah_irigasi: nama,
                        p_aktif: true
                    });
                    if (akunError) throw akunError;
                    const akunRow = Array.isArray(akunData) ? akunData[0] : akunData;
                    if (akunRow && akunRow.success === false) throw new Error(akunRow.message || 'Akun gagal disimpan.');
                }

                daftarDI = normalizeDaftarDI([...daftarDI, nama]);
                setLS('daftar_di', daftarDI);
                currentDI = nama;
                renderDaftarDISelect();
                await syncDaftarDIAwal();
                renderDaftarDISelect();
                loadProfilDI();

                showKelolaDIAlert(`<strong>${escapeHtml(nama)}</strong> berhasil ditambahkan${shouldCreateAccount ? ` beserta akun <strong>${escapeHtml(akunUsername)}</strong>` : ''}.`, 'success');
                showToast(`${nama} berhasil ditambahkan${shouldCreateAccount ? ' beserta akun' : ''}.`, 'success');
                setTimeout(tutupModalKelolaDI, 700);
            } catch (err) {
                console.error('Gagal menyimpan D.I:', err);
                const detail = err?.message || err?.details || err?.hint || 'Periksa izin insert/update tabel di Supabase.';
                showKelolaDIAlert(`Gagal menyimpan D.I: ${escapeHtml(detail)}`, 'error');
            } finally {
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = originalHtml;
                    if (typeof initIcons === 'function') initIcons();
                }
            }
        }

        function showKelolaAkunAlert(message, type = 'info') {
            const el = document.getElementById('kelola-akun-alert');
            if (!el) return;
            const cls = type === 'error'
                ? 'bg-red-50 text-red-700 border-red-200'
                : type === 'success'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-blue-50 text-blue-700 border-blue-200';
            el.className = `rounded-lg border p-3 text-sm font-bold text-center ${cls}`;
            el.innerHTML = message;
            el.classList.remove('hidden');
        }

        let kelolaAkunRowsCache = null;

        async function ambilDaftarAkunOnline(force = false) {
            if (!siopiDb) throw new Error('Koneksi Supabase belum tersedia.');
            if (!force && Array.isArray(kelolaAkunRowsCache)) return kelolaAkunRowsCache;
            const { data, error } = await siopiDb.rpc('list_siopi_users');
            if (error) throw error;
            kelolaAkunRowsCache = Array.isArray(data) ? data : [];
            return kelolaAkunRowsCache;
        }

        function resetIsianIdentitasKelolaAkun() {
            ['kelola-akun-username', 'kelola-akun-password', 'kelola-akun-nama'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = '';
            });
            const passEl = document.getElementById('kelola-akun-password');
            if (passEl) {
                passEl.type = 'text';
                passEl.placeholder = 'Minimal 6 karakter';
            }
        }

        function renderKelolaAkunDIOptions() {
            const select = document.getElementById('kelola-akun-di');
            if (!select) return;
            const prevValue = select.value || '';
            const list = normalizeDaftarDI(daftarDI.length ? daftarDI : DEFAULT_DAFTAR_DI);
            select.disabled = false;
            select.innerHTML = '<option value="">-- Pilih Akses D.I --</option>' + list.map(name => `<option value="${escapeHtmlAttr(name)}">${escapeHtml(name)}</option>`).join('');
            if (prevValue && Array.from(select.options).some(opt => opt.value === prevValue)) {
                select.value = prevValue;
            }
        }

        function onRoleKelolaAkunChange() {
            onAksesKelolaAkunChange();
        }

        async function onAksesKelolaAkunChange() {
            const diEl = document.getElementById('kelola-akun-di');
            const diAkses = diEl?.value || '';
            const alertEl = document.getElementById('kelola-akun-alert');
            if (alertEl) alertEl.classList.add('hidden');
            resetIsianIdentitasKelolaAkun();
            if (!diAkses) {
                if (typeof initIcons === 'function') initIcons();
                return;
            }

            if (!siopiDb) {
                showKelolaAkunAlert('Pilih D.I berhasil. Data akun lama tidak dapat dimuat karena koneksi Supabase belum tersedia.', 'info');
                if (typeof initIcons === 'function') initIcons();
                return;
            }

            try {
                const rows = await ambilDaftarAkunOnline(true);
                const match = rows.find(row =>
                    String(row.daerah_irigasi || '') === diAkses &&
                    String(row.role || '').toLowerCase() === 'operator'
                );

                if (!match) {
                    showKelolaAkunAlert('Belum ada akun tersimpan untuk akses D.I ini. Silakan isi username, password, dan nama tampilan.', 'info');
                    if (typeof initIcons === 'function') initIcons();
                    return;
                }

                const usernameEl = document.getElementById('kelola-akun-username');
                const namaEl = document.getElementById('kelola-akun-nama');
                const passEl = document.getElementById('kelola-akun-password');
                if (usernameEl) usernameEl.value = match.username || '';
                if (namaEl) namaEl.value = match.nama || '';
                if (passEl) passEl.placeholder = 'Isi password baru jika ingin menyimpan ulang';
                showKelolaAkunAlert(`Data akun <strong>${escapeHtml(match.username || '-')}</strong> untuk ${escapeHtml(diAkses)} berhasil dimuat. Password tidak ditampilkan.`, 'success');
            } catch (err) {
                console.error('Gagal memuat akun berdasarkan D.I:', err);
                showKelolaAkunAlert(`Gagal memuat data akun: ${escapeHtml(err?.message || 'Pastikan fungsi list_siopi_users sudah dibuat di Supabase.')}`, 'error');
            } finally {
                if (typeof initIcons === 'function') initIcons();
            }
        }

        function bukaModalKelolaAkun() {
            if (!currentUser || currentUser.role !== 'Admin') {
                showToast('Fitur Kelola Akun hanya untuk Admin Global.', 'info');
                return;
            }
            resetIsianIdentitasKelolaAkun();
            const alertEl = document.getElementById('kelola-akun-alert');
            if (alertEl) alertEl.classList.add('hidden');
            const listEl = document.getElementById('kelola-akun-list');
            if (listEl) {
                listEl.classList.add('hidden');
                listEl.innerHTML = '';
            }
            updateToggleDaftarAkunButton(false);
            renderKelolaAkunDIOptions();
            const diEl = document.getElementById('kelola-akun-di');
            if (diEl) diEl.value = '';
            const modal = document.getElementById('modal-kelola-akun');
            if (modal) {
                modal.classList.remove('hidden');
                modal.classList.add('flex');
            }
            if (typeof initIcons === 'function') initIcons();
            setTimeout(() => document.getElementById('kelola-akun-di')?.focus(), 80);
        }

        function updateToggleDaftarAkunButton(isVisible) {
            const btn = document.getElementById('btn-toggle-daftar-akun');
            if (!btn) return;
            btn.innerHTML = isVisible
                ? '<i data-lucide="eye-off" class="w-4 h-4"></i> Sembunyikan Daftar'
                : '<i data-lucide="list" class="w-4 h-4"></i> Muat Daftar Akun';
            if (typeof initIcons === 'function') initIcons();
        }

        async function toggleDaftarAkun() {
            const listEl = document.getElementById('kelola-akun-list');
            if (!listEl) return;
            const isVisible = !listEl.classList.contains('hidden');
            if (isVisible) {
                listEl.classList.add('hidden');
                updateToggleDaftarAkunButton(false);
                return;
            }
            await muatDaftarAkun();
            updateToggleDaftarAkunButton(true);
        }

        async function muatDaftarAkun() {
            const listEl = document.getElementById('kelola-akun-list');
            if (!listEl) return;
            if (!siopiDb) {
                listEl.classList.remove('hidden');
                listEl.innerHTML = '<div class="p-4 text-center text-sm font-bold text-red-600">Koneksi Supabase belum tersedia.</div>';
                return;
            }

            listEl.classList.remove('hidden');
            listEl.innerHTML = '<div class="p-4 text-center text-sm font-bold text-slate-500">Memuat daftar akun...</div>';

            try {
                const rows = await ambilDaftarAkunOnline(true);
                if (rows.length === 0) {
                    listEl.innerHTML = '<div class="p-4 text-center text-sm font-bold text-slate-400">Belum ada akun terdaftar.</div>';
                    return;
                }
                listEl.innerHTML = rows.map(row => {
                    const roleLabel = mapRoleDbToLabel(row.role);
                    const statusClass = row.aktif ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500';
                    const roleClass = roleLabel === 'Admin Global'
                        ? 'bg-indigo-100 text-indigo-700'
                        : roleLabel === 'Kepala Seksi O&P'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-cyan-100 text-cyan-700';
                    return `
                        <div class="flex items-start justify-between gap-3 border-b border-slate-100 p-3 last:border-b-0">
                            <div class="min-w-0">
                                <p class="font-black text-sm text-slate-800 truncate">${escapeHtml(row.username || '-')}</p>
                                <p class="text-xs text-slate-500 font-bold truncate">${escapeHtml(row.nama || '-')}</p>
                                <p class="text-[11px] text-slate-400 font-bold mt-1">Akses: ${escapeHtml(row.daerah_irigasi || '-')}</p>
                            </div>
                            <div class="shrink-0 flex flex-col items-end gap-1">
                                <span class="px-2 py-1 rounded-md text-[10px] font-black ${roleClass}">${roleLabel}</span>
                                <span class="px-2 py-1 rounded-md text-[10px] font-black ${statusClass}">${row.aktif ? 'Aktif' : 'Nonaktif'}</span>
                            </div>
                        </div>`;
                }).join('');
            } catch (err) {
                console.error('Gagal memuat daftar akun:', err);
                listEl.innerHTML = `<div class="p-4 text-center text-sm font-bold text-red-600">Gagal memuat akun: ${escapeHtml(err?.message || 'Pastikan fungsi list_siopi_users sudah dibuat di Supabase.')}</div>`;
            }
        }

        function toggleKelolaAkunPassword() {
            const input = document.getElementById('kelola-akun-password');
            const icon = document.getElementById('kelola-akun-eye');
            if (!input) return;
            input.type = input.type === 'password' ? 'text' : 'password';
            if (icon) icon.setAttribute('data-lucide', input.type === 'password' ? 'eye' : 'eye-off');
            if (typeof initIcons === 'function') initIcons();
        }

        function tutupModalKelolaAkun() {
            const modal = document.getElementById('modal-kelola-akun');
            if (modal) {
                modal.classList.add('hidden');
                modal.classList.remove('flex');
            }
        }

        async function simpanKelolaAkun() {
            const username = document.getElementById('kelola-akun-username')?.value.trim().toLowerCase();
            const password = document.getElementById('kelola-akun-password')?.value.trim();
            const nama = document.getElementById('kelola-akun-nama')?.value.trim();
            const diAkses = document.getElementById('kelola-akun-di')?.value || '';
            const btn = document.getElementById('btn-simpan-kelola-akun');
            const originalHtml = btn?.innerHTML || '';

            if (!username) return showKelolaAkunAlert('Username wajib diisi.', 'error');
            if (!password || password.length < 6) return showKelolaAkunAlert('Password minimal 6 karakter.', 'error');
            if (!nama) return showKelolaAkunAlert('Nama tampilan wajib diisi.', 'error');
            if (!diAkses) return showKelolaAkunAlert('Pilih akses D.I untuk operator.', 'error');
            if (!siopiDb) return showKelolaAkunAlert('Koneksi Supabase belum tersedia.', 'error');

            try {
                if (btn) {
                    btn.disabled = true;
                    btn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> Menyimpan...';
                    if (typeof initIcons === 'function') initIcons();
                }
                const { data, error } = await siopiDb.rpc('upsert_siopi_user', {
                    p_username: username,
                    p_password: password,
                    p_nama: nama,
                    p_role: 'operator',
                    p_daerah_irigasi: diAkses,
                    p_aktif: true
                });
                if (error) throw error;
                const row = Array.isArray(data) ? data[0] : data;
                if (row && row.success === false) {
                    showKelolaAkunAlert(escapeHtml(row.message || 'Akun gagal disimpan.'), 'error');
                    return;
                }
                showKelolaAkunAlert(`<strong>${escapeHtml(username)}</strong> berhasil disimpan.`, 'success');
                showToast(`Akun ${username} berhasil disimpan.`, 'success');
                setTimeout(tutupModalKelolaAkun, 700);
            } catch (err) {
                console.error('Gagal menyimpan akun:', err);
                showKelolaAkunAlert(`Gagal menyimpan akun: ${escapeHtml(err?.message || 'Pastikan fungsi upsert_siopi_user sudah dibuat di Supabase.')}`, 'error');
            } finally {
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = originalHtml;
                    if (typeof initIcons === 'function') initIcons();
                }
            }
        }

        function withReportTimestamps(nextData, existingData = null) {
            const now = new Date().toISOString();
            return {
                ...nextData,
                createdAt: existingData?.createdAt || existingData?.timestamp || now,
                updatedAt: now
            };
        }

        // ====================================================================
// FUNGSI PENGENDALI MODAL KONFIRMASI MODERN
// ====================================================================
function showModernConfirm(title, message) {
    return new Promise((resolve) => {
        const modal = document.getElementById('modern-confirm-modal');
        const box = document.getElementById('modern-confirm-box');
        const btnOk = document.getElementById('mc-btn-ok');
        const btnCancel = document.getElementById('mc-btn-cancel');

        // Set Teks
        document.getElementById('mc-title').innerText = title;
        document.getElementById('mc-message').innerText = message;

        // Render Ikon (jika ada lucide)
        if (typeof initIcons === 'function') initIcons();

        // Tampilkan Modal
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        
        // Animasi masuk (sedikit jeda agar transisi CSS berjalan)
        setTimeout(() => {
            modal.classList.remove('opacity-0');
            modal.classList.add('opacity-100');
            box.classList.remove('scale-95');
            box.classList.add('scale-100');
        }, 10);

        // Fungsi Tutup
        const closeModal = (result) => {
            // Animasi keluar
            modal.classList.remove('opacity-100');
            modal.classList.add('opacity-0');
            box.classList.remove('scale-100');
            box.classList.add('scale-95');
            
            setTimeout(() => {
                modal.classList.add('hidden');
                modal.classList.remove('flex');
                
                // Hapus Event Listener agar tidak menumpuk saat dipanggil lagi
                btnOk.removeEventListener('click', onOk);
                btnCancel.removeEventListener('click', onCancel);
                
                resolve(result); // Kembalikan jawaban (true / false)
            }, 300); // Tunggu animasi selesai
        };

        const onOk = () => closeModal(true);
        const onCancel = () => closeModal(false);

        // Pasang Event Listener
        btnOk.addEventListener('click', onOk);
        btnCancel.addEventListener('click', onCancel);
    });
}

        // Alert Helper Dinamis
        function showFormAlert(formId, message, type) {
            const div = document.getElementById(formId + '-alert');
            div.className = 'mb-4 p-3 rounded-lg text-sm font-bold text-center border ' + 
                            (type === 'error' ? 'bg-red-50 text-red-700 border-red-200' : 
                            type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                            'bg-blue-50 text-blue-700 border-blue-200');
            div.innerHTML = message;
            div.classList.remove('hidden');
        }
        
        function hideFormAlert(formId) { 
            document.getElementById(formId + '-alert').classList.add('hidden'); 
        }

        // --- SISTEM UMUM & LOGIN ---
        function togglePasswordVisibility() { 
            const inp = document.getElementById('password'); 
            const ico = document.getElementById('eyeIcon'); 
            inp.type = inp.type === 'password' ? 'text' : 'password'; 
            if(ico) ico.setAttribute('data-lucide', inp.type === 'password' ? 'eye' : 'eye-off'); 
            initIcons(); 
        }
        
        async function handleLogin(e) {
            e.preventDefault();
            const btn = document.getElementById('btnLogin');
            const u = document.getElementById('username').value.trim().toLowerCase();
            const p = document.getElementById('password').value.trim();
            btn.innerText = "Memproses..."; 
            btn.disabled = true;

            const prosesLoginBerhasil = async (res, sumber = 'online') => {
                btn.innerText = "Masuk Sistem"; btn.disabled = false;
                if (res.success) {
                    currentUser = res.user;
                    setLS('user', currentUser);
                    
                    // KUNCI/ARAHKAN D.I BERDASARKAN HAK AKSES AKUN
                    if (currentUser.diAkses !== 'ALL') {
                        currentDI = currentUser.diAkses; // Otomatis set ke D.I miliknya
                    }
                    
                    const overlay = document.getElementById('loginOverlay');
                    overlay.style.opacity = '0';
                    setTimeout(() => {
                        overlay.classList.add('hidden'); 
                        setupUIBasedOnRole(); 
                        syncDaftarDIAwal().finally(() => loadProfilDI()); // Segera muat profil sesuai D.I
                        navigate('dashboard'); 
                        showToast(`Selamat datang, ${currentUser.nama}!${sumber === 'lokal' ? ' (login lokal)' : ''}`, sumber === 'lokal' ? 'info' : 'success');
                    }, 300);
                } else {
                    const msg = document.getElementById('loginMsg');
                    msg.innerText = res.message || "Username/Password salah.";
                    msg.classList.remove('hidden');
                }
            };

            try {
                const res = await loginSiopiOnline(u, p);
                await prosesLoginBerhasil(res, 'online');
            } catch (err) {
                console.warn('Login online belum tersedia/gagal. Mencoba login lokal sementara:', err);
                const fallback = loginSiopiLokal(u, p);
                if (fallback.success) {
                    await prosesLoginBerhasil(fallback, 'lokal');
                    return;
                }
                btn.innerText = "Masuk Sistem";
                btn.disabled = false;
                const msg = document.getElementById('loginMsg');
                msg.innerText = err?.message || "Login online belum tersedia atau username/password salah.";
                msg.classList.remove('hidden');
            }
        }

        function logout() { 
            document.getElementById('logoutModal').classList.remove('hidden'); 
            document.getElementById('logoutModal').classList.add('flex'); 
        }
        
        function cancelLogout() { 
            document.getElementById('logoutModal').classList.add('hidden'); 
            document.getElementById('logoutModal').classList.remove('flex'); 
        }

        function confirmLogout() { 
            localStorage.removeItem('siop_user'); 
            currentUser = null;
            cancelLogout();
            
            const overlay = document.getElementById('loginOverlay');
            overlay.classList.remove('hidden');
            setTimeout(() => { overlay.style.opacity = '1'; }, 10);
            
            document.getElementById('username').value = '';
            document.getElementById('password').value = '';
            document.getElementById('loginMsg').classList.add('hidden');
            
            if(window.innerWidth < 768) { 
                document.querySelector('aside').classList.add('hidden'); 
            }
            navigate('dashboard');
        }
        
        function setupUIBasedOnRole() { 
            if (!currentUser) return;
            document.getElementById('ui-username').innerText = currentUser.nama; 
            document.getElementById('ui-role').innerText = currentUser.role; 
            
            const isAdmin = currentUser.role === 'Admin';
            const isKasiOP = currentUser.role === 'Kepala Seksi O&P';
            const isOp = currentUser.role === 'Operator' || isAdmin || isKasiOP;
            
            document.querySelectorAll('.operator-only').forEach(el => el.style.display = isOp ? 'flex' : 'none');
            document.querySelectorAll('.admin-only').forEach(el => el.style.display = isAdmin ? 'flex' : 'none');

            // ðŸ‘‡ Tombol Navigasi Formulir Selalu Ditampilkan ðŸ‘‡
            const adminTabs = ['tabBtn-11O', 'tabBtn-12O', 'tabBtnPem-04P', 'tabBtnPem-05P', 'tabBtnPem-09P', 'tabBtnPem-10P'];
            adminTabs.forEach(tabId => {
                const btn = document.getElementById(tabId);
                if (btn) btn.style.display = ''; // Bebaskan dari status tersembunyi
            });

            // LOGIKA TAMPILAN D.I (DROPDOWN VS TEKS STATIS)
            const dropdownWrapper = document.getElementById('di-dropdown-wrapper');
            const labelWrapper = document.getElementById('di-label-wrapper');
            renderDaftarDISelect();

            if (currentUser.diAkses !== 'ALL') {
                if (dropdownWrapper) dropdownWrapper.style.display = 'none';
                if (labelWrapper) labelWrapper.style.display = 'block';
            } else {
                if (dropdownWrapper) dropdownWrapper.style.display = 'block';
                if (labelWrapper) labelWrapper.style.display = 'none';
            }
            if (typeof initIcons === 'function') initIcons();
        }

        function toggleMobileSidebar(forceOpen = null) {
            const sidebar = document.querySelector('aside');
            if (!sidebar) return;
            const shouldOpen = forceOpen === null ? sidebar.classList.contains('hidden') : forceOpen;
            sidebar.classList.toggle('hidden', !shouldOpen);
            if (typeof initIcons === 'function') initIcons();
        }

        window.addEventListener('resize', () => {
            const sidebar = document.querySelector('aside');
            if (!sidebar) return;
            if (window.innerWidth >= 768) {
                sidebar.classList.remove('hidden');
            } else {
                sidebar.classList.add('hidden');
            }
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && window.innerWidth < 768) {
                toggleMobileSidebar(false);
            }
        });

        function navigate(viewId) {
            // 1. Cabut warna aktif dan kembalikan efek Hover abu-abu ke SEMUA menu
            document.querySelectorAll('.nav-link').forEach(el => {
                el.classList.remove('bg-indigo-600', 'bg-cyan-500', 'text-white', 'font-semibold', 'shadow-lg', 'shadow-cyan-950/30');
                el.classList.add('text-slate-400', 'font-medium', 'hover:bg-white/10', 'hover:text-white');
            });
            
            // 2. Berikan warna aktif (Indigo) khusus untuk menu yang sedang diklik
            const activeNav = document.getElementById('nav-' + viewId);
            if(activeNav) {
                activeNav.classList.remove('text-slate-400', 'font-medium', 'hover:bg-white/10', 'hover:text-white');
                activeNav.classList.add('bg-cyan-500', 'text-white', 'font-semibold', 'shadow-lg', 'shadow-cyan-950/30');
            }
            
            // 3. Tampilkan halaman konten yang sesuai
            document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
            document.getElementById('view-' + viewId).classList.remove('hidden');
            
            // Trigger otomatis saat halaman dibuka
            if(viewId === 'profil-di') loadProfilDI();
            if(viewId === 'blanko-operasi') switchBlankoTab('01O');
            if(viewId === 'blanko-pemeliharaan') switchPemeliharaanTab('01P');
            if(viewId === 'rekap') switchRekapTab('operasi');

            // Tutup sidebar otomatis di mode HP
            if(window.innerWidth < 768) document.querySelector('aside').classList.add('hidden');
            
            if (typeof initIcons === 'function') initIcons();
        }

        // --- STATE & LOGIKA PROFIL D.I ---
        function getDefaultProfil() {
            return {
                kodeDI: "", kabupaten: "", pengamat: "",
                bendungs: [{ nama: "", juru: "", rincian: [{ petak: "", luasPotensial: "", luasFungsional: "", desa: "", kecamatan: "", gp3a: "", p3a: "" }] }],
                jurus: [{ nama: "", pobs: [""], ppas: [""] }]
            };
        }

        function getProfilData(diName) {
            let data = getLS('profil_' + diName, null);
            if (data) {
                if (data.bendungs && data.bendungs.length > 0 && typeof data.bendungs === 'string') {
                    data.bendungs = data.bendungs.map(b => ({ nama: b, juru: "", rincian: [{ petak: "", luasPotensial: "", luasFungsional: "", desa: "", kecamatan: "", gp3a: "", p3a: "" }] }));
                } else if (data.bendungs) {
                    data.bendungs = data.bendungs.map(b => ({ ...b, juru: b.juru || "", rincian: (b.rincian || []).map(r => ({ ...r, kecamatan: r.kecamatan || "" })) }));
                }
                if (data.jurus) data.jurus = data.jurus.map(j => ({ nama: j.nama || "", pobs: j.pobs || [""], ppas: j.ppas || [""] }));
                return data;
            }
            return getDefaultProfil();
        }

        async function loadProfilDIDariSupabase(diName) {
            if (!siopiDb) return null;
            const { data, error } = await siopiDb
                .from('siopi_profiles')
                .select('data')
                .eq('daerah_irigasi', diName)
                .maybeSingle();

            if (error) throw error;
            return data?.data || null;
        }

        async function saveProfilDIKeSupabase(diName, profilData) {
            if (!siopiDb) throw new Error('Koneksi Supabase belum tersedia.');
            const { error } = await siopiDb
                .from('siopi_profiles')
                .upsert({
                    daerah_irigasi: diName,
                    data: profilData
                }, { onConflict: 'daerah_irigasi' });

            if (error) throw error;
            return true;
        }

        async function loadProfilDI() {
            // Hapus paksaan currentDI = "D.I Mepanga" agar dinamis mengikuti dropdown
            const titleEl = document.getElementById('profil-title-di');
            if(titleEl) titleEl.innerText = currentDI;
            
            document.querySelectorAll('.profil-nama-di').forEach(el => el.innerText = currentDI);

            const kodeEl = document.getElementById('view-kodeDI');
            const kabEl = document.getElementById('view-kabupaten');
            const pEl = document.getElementById('view-pengamat');
            
            if(kodeEl) kodeEl.innerText = "Memuat...";
            if(kabEl) kabEl.innerText = "Memuat...";
            if(pEl) pEl.innerText = "Memuat...";

            try {
                const onlineData = await loadProfilDIDariSupabase(currentDI);
                if (onlineData) {
                    setLS('profil_' + currentDI, onlineData);
                    showToast(`Profil ${currentDI} dimuat dari Supabase.`, 'success');
                }
                if (isProfilEditMode) toggleEditProfil(); else renderProfilView();
                switchProfilTab('utama');
                return;
            } catch (err) {
                console.error("Gagal menarik profil dari Supabase:", err);
                showToast('Profil online belum bisa dimuat. Menggunakan data lokal.', 'warning');
            }

            google.script.run.withSuccessHandler(function(serverData) {
                if (serverData) setLS('profil_' + currentDI, serverData);
                if (isProfilEditMode) toggleEditProfil(); else renderProfilView();
                switchProfilTab('utama');
            }).withFailureHandler(function(err) {
                console.error("Gagal menarik profil dari server:", err);
                if (!isProfilEditMode) renderProfilView();
                switchProfilTab('utama');
            }).getProfilDataGS(currentDI);
        }

        function renderBendungTable(bendungArray) {
            return bendungArray.map(b => {
                let html = `
                    <div class="bg-white border border-slate-200 rounded-xl p-5 shadow-sm w-full transition-all">
                        <h5 class="font-bold text-lg text-sky-700 mb-3 flex items-center gap-2">
                            <i data-lucide="waves" class="w-5 h-5"></i> ${b.nama}
                        </h5>
                        <div class="overflow-x-auto rounded-lg border border-slate-200">
                            <table class="w-full text-sm text-left whitespace-nowrap">
                                <thead class="bg-slate-50 border-b text-slate-600 uppercase text-xs tracking-wider">
                                    <tr>
                                        <th class="p-3 border-r" rowspan="2">Petak Tersier</th>
                                        <th class="p-3 border-r text-center" colspan="2">Luas Areal (Ha)</th>
                                        <th class="p-3 border-r" rowspan="2">Desa</th>
                                        <th class="p-3 border-r" rowspan="2">Kecamatan</th>
                                        <th class="p-3 border-r" rowspan="2">GP3A</th>
                                        <th class="p-3" rowspan="2">P3A</th>
                                    </tr>
                                    <tr>
                                        <th class="p-2 border-r border-t text-center text-xs font-medium">Potensial</th>
                                        <th class="p-2 border-t text-center text-xs font-medium">Fungsional</th>
                                    </tr>
                                </thead>
                                <tbody class="text-slate-700">`;
                
                if(b.rincian && b.rincian.length > 0) {
                    html += b.rincian.map(r => `
                        <tr class="border-b last:border-b-0 hover:bg-sky-50 transition-colors">
                            <td class="p-3 border-r font-medium text-slate-800">${r.petak || '-'}</td>
                            <td class="p-3 border-r text-center">${r.luasPotensial || '-'}</td>
                            <td class="p-3 border-r text-center">${r.luasFungsional || '-'}</td>
                            <td class="p-3 border-r">${r.desa || '-'}</td>
                            <td class="p-3 border-r">${r.kecamatan || '-'}</td>
                            <td class="p-3 border-r">${r.gp3a || '-'}</td>
                            <td class="p-3">${r.p3a || '-'}</td>
                        </tr>`).join('');
                } else {
                    html += `<tr><td colspan="7" class="p-6 text-center text-slate-400 italic">Belum ada rincian petak tersier.</td></tr>`;
                }
                
                html += `
                                </tbody>
                            </table>
                        </div>
                    </div>`;
                return html;
            }).join('');
        }

        function renderProfilView() {
            const data = getProfilData(currentDI);
            document.getElementById('view-kodeDI').innerText = data.kodeDI || "-";
            document.getElementById('view-kabupaten').innerText = data.kabupaten || "-";
            document.getElementById('view-pengamat').innerText = data.pengamat || "-";

            let totalLuas = 0;
            if (data.bendungs && data.bendungs.length > 0) {
                data.bendungs.forEach(b => {
                    if (b.rincian && b.rincian.length > 0) {
                        b.rincian.forEach(r => { 
                            const luas = parseFloat(r.luasFungsional); 
                            if (!isNaN(luas)) totalLuas += luas; 
                        });
                    }
                });
            }
            document.getElementById('view-luasTotal').innerText = totalLuas > 0 ? totalLuas.toFixed(2) + ' Ha' : "0 Ha";

            const bendungContainer = document.getElementById('view-bendungs');
            const validBendungs = data.bendungs ? data.bendungs.filter(b => b.nama && b.nama.trim() !== "") : [];
            
            if (validBendungs.length > 0) {
                const juruList = data.jurus ? data.jurus.map(j => j.nama).filter(n => n.trim() !== "") : [];
                let groupedHtml = '';
                
                juruList.forEach(juruNama => {
                    const juruBendungs = validBendungs.filter(b => b.juru === juruNama);
                    if (juruBendungs.length > 0) {
                        groupedHtml += `
                            <div class="mb-8">
                                <h4 class="text-md font-bold text-slate-700 bg-indigo-50 p-3 rounded-lg border border-indigo-100 mb-4 flex items-center gap-2">
                                    <i data-lucide="user-check" class="w-5 h-5 text-indigo-600"></i> Wilayah Juru: ${juruNama}
                                </h4>
                                <div class="space-y-6 pl-2 md:pl-6 border-l-2 border-indigo-200">
                                    ${renderBendungTable(juruBendungs)}
                                </div>
                            </div>`;
                    }
                });

                const unassignedBendungs = validBendungs.filter(b => !juruList.includes(b.juru));
                if (unassignedBendungs.length > 0) {
                    groupedHtml += `
                        <div class="mb-8">
                            <h4 class="text-md font-bold text-slate-500 bg-slate-100 p-3 rounded-lg border border-slate-200 mb-4 flex items-center gap-2">
                                <i data-lucide="help-circle" class="w-5 h-5 text-slate-500"></i> Belum Ditentukan Juru
                            </h4>
                            <div class="space-y-6 pl-2 md:pl-6 border-l-2 border-slate-300">
                                ${renderBendungTable(unassignedBendungs)}
                            </div>
                        </div>`;
                }
                bendungContainer.innerHTML = groupedHtml;
            } else {
                bendungContainer.innerHTML = '<div class="col-span-full text-slate-400 text-sm italic text-center py-6 border border-slate-200 border-dashed rounded-xl">Belum ada data bendung.</div>';
            }

            const juruContainer = document.getElementById('view-jurus');
            const validJurus = data.jurus ? data.jurus.filter(j => j.nama.trim() !== "") : [];
            
            if (validJurus.length > 0) {
                juruContainer.innerHTML = validJurus.map(j => {
                    let h = `
                        <div class="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                            <div class="flex items-center gap-3 mb-4 pb-3 border-b border-slate-100">
                                <div class="bg-indigo-100 text-indigo-600 p-2.5 rounded-lg">
                                    <i data-lucide="user-check" class="w-5 h-5"></i>
                                </div>
                                <div>
                                    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Juru / Mantri</p>
                                    <p class="font-bold text-slate-800 text-lg">${j.nama}</p>
                                </div>
                            </div>
                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <p class="text-[10px] font-bold text-slate-500 mb-2 uppercase">POB Binaan:</p>
                                    <div class="space-y-1.5">`;
                    
                    h += j.pobs && j.pobs.filter(p => p.trim() !== "").length > 0 
                        ? j.pobs.filter(p => p.trim() !== "").map(p => `
                            <div class="flex items-center gap-2 text-sm font-medium text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
                                <i data-lucide="droplet" class="w-4 h-4 text-blue-400 shrink-0"></i>
                                <span class="truncate">${p}</span>
                            </div>`).join('') 
                        : '<p class="text-xs text-slate-400 italic">Belum ada POB</p>';
                    
                    h += `          </div>
                                </div>
                                <div>
                                    <p class="text-[10px] font-bold text-slate-500 mb-2 uppercase">PPA Binaan:</p>
                                    <div class="space-y-1.5">`;
                                    
                    h += j.ppas && j.ppas.filter(p => p.trim() !== "").length > 0 
                        ? j.ppas.filter(p => p.trim() !== "").map(p => `
                            <div class="flex items-center gap-2 text-sm font-medium text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
                                <i data-lucide="settings-2" class="w-4 h-4 text-emerald-500 shrink-0"></i>
                                <span class="truncate">${p}</span>
                            </div>`).join('') 
                        : '<p class="text-xs text-slate-400 italic">Belum ada PPA</p>';
                    
                    h += `          </div>
                                </div>
                            </div>
                        </div>`;
                    return h;
                }).join('');
            } else {
                juruContainer.innerHTML = '<div class="col-span-full text-slate-400 text-sm italic text-center py-6 bg-white border border-slate-200 border-dashed rounded-xl">Belum ada data Juru yang terdaftar.</div>';
            }
            initIcons();
        }

        function toggleEditProfil() {
            isProfilEditMode = !isProfilEditMode;
            if (isProfilEditMode) {
                tempProfilData = JSON.parse(JSON.stringify(getProfilData(currentDI)));
                document.getElementById('profil-utama-view').classList.add('hidden');
                document.getElementById('profil-bendung-view').classList.add('hidden');
                document.getElementById('profil-utama-edit').classList.remove('hidden');
                document.getElementById('profil-bendung-edit').classList.remove('hidden');
                document.getElementById('btnEditProfil').classList.add('hidden');
                document.getElementById('profil-edit-actions').classList.remove('hidden');
                renderProfilEdit();
            } else {
                document.getElementById('profil-utama-edit').classList.add('hidden');
                document.getElementById('profil-bendung-edit').classList.add('hidden');
                document.getElementById('profil-utama-view').classList.remove('hidden');
                document.getElementById('profil-bendung-view').classList.remove('hidden');
                document.getElementById('btnEditProfil').classList.remove('hidden');
                document.getElementById('profil-edit-actions').classList.add('hidden');
                renderProfilView();
            }
        }

        async function saveProfilDI() {
            syncEditFormToTempData();
            setLS('profil_' + currentDI, tempProfilData); 
            
            const btnSimpan = document.querySelector('button[onclick="saveProfilDI()"]');
            const originalText = btnSimpan.innerHTML;
            btnSimpan.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> Menyimpan ke Supabase...';
            btnSimpan.disabled = true;

            try {
                await saveProfilDIKeSupabase(currentDI, tempProfilData);
                btnSimpan.innerHTML = originalText;
                btnSimpan.disabled = false;
                initIcons();
                toggleEditProfil();
                showToast(`Profil ${currentDI} berhasil disimpan ke Supabase.`, 'success');
                return;
            } catch (err) {
                console.error("Gagal simpan Profil D.I ke Supabase:", err);
                showToast('Gagal simpan ke Supabase. Data tetap tersimpan lokal.', 'warning');
            }

            google.script.run.withSuccessHandler(function(res) {
                btnSimpan.innerHTML = originalText; btnSimpan.disabled = false; initIcons(); toggleEditProfil(); 
            }).withFailureHandler(function(err) {
                console.error("Gagal simpan ke Spreadsheet:", err);
                btnSimpan.innerHTML = originalText; btnSimpan.disabled = false; initIcons(); toggleEditProfil();
            }).saveProfilDataGS(currentDI, tempProfilData);
        }

        function syncEditFormToTempData() {
            tempProfilData.kodeDI = document.getElementById('edit-kodeDI').value;
            tempProfilData.kabupaten = document.getElementById('edit-kabupaten').value;
            tempProfilData.pengamat = document.getElementById('edit-pengamat').value;
            
            const bendungBlocks = document.querySelectorAll('.edit-bendung-block');
            tempProfilData.bendungs = Array.from(bendungBlocks).map(block => {
                const rincianRows = block.querySelectorAll('.edit-bendung-rincian-row');
                const rincian = Array.from(rincianRows).map(row => ({
                    petak: row.querySelector('.rincian-petak').value,
                    luasPotensial: row.querySelector('.rincian-potensial').value,
                    luasFungsional: row.querySelector('.rincian-fungsional').value,
                    desa: row.querySelector('.rincian-desa').value,
                    kecamatan: row.querySelector('.rincian-kecamatan').value,
                    gp3a: row.querySelector('.rincian-gp3a').value,
                    p3a: row.querySelector('.rincian-p3a').value
                }));
                return { nama: block.querySelector('.edit-bendung-nama').value, juru: block.querySelector('.edit-bendung-juru').value, rincian };
            });
            
            const juruBlocks = document.querySelectorAll('.edit-juru-block');
            tempProfilData.jurus = Array.from(juruBlocks).map(block => {
                return {
                    nama: block.querySelector('.edit-juru-nama').value,
                    pobs: Array.from(block.querySelectorAll('.edit-pob-val')).map(el => el.value),
                    ppas: Array.from(block.querySelectorAll('.edit-ppa-val')).map(el => el.value)
                };
            });
        }

        function addEditBendung() { syncEditFormToTempData(); tempProfilData.bendungs.push({ nama: '', juru: '', rincian: [{ petak: '', luasPotensial: '', luasFungsional: '', desa: '', kecamatan: '', gp3a: '', p3a: '' }] }); renderProfilEdit(); }
        function removeEditBendung(idx) { syncEditFormToTempData(); tempProfilData.bendungs.splice(idx, 1); renderProfilEdit(); }
        function addEditBendungRincian(bIdx) { syncEditFormToTempData(); if (!tempProfilData.bendungs[bIdx].rincian) tempProfilData.bendungs[bIdx].rincian = []; tempProfilData.bendungs[bIdx].rincian.push({ petak: '', luasPotensial: '', luasFungsional: '', desa: '', kecamatan: '', gp3a: '', p3a: '' }); renderProfilEdit(); }
        function removeEditBendungRincian(bIdx, rIdx) { syncEditFormToTempData(); tempProfilData.bendungs[bIdx].rincian.splice(rIdx, 1); renderProfilEdit(); }
        function addEditJuru() { syncEditFormToTempData(); tempProfilData.jurus.push({nama:'', pobs:[''], ppas:['']}); renderProfilEdit(); }
        function removeEditJuru(idx) { syncEditFormToTempData(); tempProfilData.jurus.splice(idx, 1); renderProfilEdit(); }
        function addEditPob(jIdx) { syncEditFormToTempData(); tempProfilData.jurus[jIdx].pobs.push(''); renderProfilEdit(); }
        function removeEditPob(jIdx, pIdx) { syncEditFormToTempData(); tempProfilData.jurus[jIdx].pobs.splice(pIdx, 1); renderProfilEdit(); }
        function addEditPpa(jIdx) { syncEditFormToTempData(); if(!tempProfilData.jurus[jIdx].ppas) tempProfilData.jurus[jIdx].ppas = []; tempProfilData.jurus[jIdx].ppas.push(''); renderProfilEdit(); }
        function removeEditPpa(jIdx, pIdx) { syncEditFormToTempData(); tempProfilData.jurus[jIdx].ppas.splice(pIdx, 1); renderProfilEdit(); }

        function renderProfilEdit() {
            let totalLuas = 0;
            if (tempProfilData.bendungs && tempProfilData.bendungs.length > 0) {
                tempProfilData.bendungs.forEach(b => {
                    if (b.rincian && b.rincian.length > 0) b.rincian.forEach(r => { const val = parseFloat(r.luasFungsional); if (!isNaN(val)) totalLuas += val; });
                });
            }
            const strTotalLuas = totalLuas > 0 ? totalLuas.toFixed(2) + ' Ha' : "0 Ha";

            let htmlUtama = `
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-6 rounded-xl border border-slate-200 shadow-sm mb-8">
                    <div>
                        <label class="block text-xs font-bold mb-1 text-slate-500 uppercase tracking-wide">Nomor Kode D.I</label>
                        <input type="text" id="edit-kodeDI" value="${tempProfilData.kodeDI}" class="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none transition-all">
                    </div>
                    <div>
                        <label class="block text-xs font-bold mb-1 text-slate-500 uppercase tracking-wide">Kabupaten / Kota</label>
                        <input type="text" id="edit-kabupaten" value="${tempProfilData.kabupaten}" class="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none transition-all">
                    </div>
                    <div>
                        <label class="block text-xs font-bold mb-1 text-slate-500 uppercase tracking-wide">Total Luas Irigasi</label>
                        <div class="w-full border border-slate-200 bg-slate-50 text-slate-500 rounded-lg p-2.5 outline-none font-bold text-sm cursor-not-allowed">
                            ${strTotalLuas} (Otomatis dari Data Bendung)
                        </div>
                    </div>
                    <div>
                        <label class="block text-xs font-bold mb-1 text-slate-500 uppercase tracking-wide">Nama Pengamat</label>
                        <input type="text" id="edit-pengamat" value="${tempProfilData.pengamat}" class="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none transition-all">
                    </div>
                </div>
                
                <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div class="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
                        <h4 class="font-bold text-slate-700 text-lg flex items-center gap-2">
                            <i data-lucide="users" class="w-5 h-5 text-indigo-500"></i> Daftar Juru, POB & PPA
                        </h4>
                        <button type="button" onclick="addEditJuru()" class="text-xs bg-indigo-50 text-indigo-700 px-3 py-2 rounded-lg font-bold hover:bg-indigo-100 transition-all border border-indigo-100 shadow-sm">
                            + Tambah Juru Baru
                        </button>
                    </div>
                    <div class="space-y-6">`;
            
            if (tempProfilData.jurus && tempProfilData.jurus.length > 0) {
                htmlUtama += tempProfilData.jurus.map((juru, jIdx) => {
                    let h = `
                        <div class="edit-juru-block border-2 border-indigo-50 rounded-xl p-5 bg-slate-50 relative">
                            <button type="button" onclick="removeEditJuru(${jIdx})" class="absolute -top-3 -right-3 bg-red-100 text-red-600 p-2 rounded-full hover:bg-red-200 shadow-md transition-all border border-red-200">
                                <i data-lucide="trash-2" class="w-4 h-4"></i>
                            </button>
                            <div class="mb-4">
                                <label class="block text-[10px] font-bold mb-1 text-slate-500 uppercase tracking-widest">Nama Juru / Mantri</label>
                                <input type="text" class="edit-juru-nama w-full border border-slate-300 rounded-lg p-2.5 font-bold text-indigo-700 focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm" value="${juru.nama}" placeholder="Contoh: IRAWAN">
                            </div>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pl-4 border-l-2 border-indigo-200 pt-1">
                                <div>
                                    <div class="flex justify-between items-center mb-3">
                                        <label class="block text-xs font-bold text-slate-600">Daftar POB</label>
                                        <button type="button" onclick="addEditPob(${jIdx})" class="text-[10px] text-blue-700 bg-blue-100 px-2.5 py-1.5 rounded-lg font-bold hover:bg-blue-200 border border-blue-200 shadow-sm transition-all">+ Tambah POB</button>
                                    </div>
                                    <div class="space-y-2">`;
                                    
                    h += juru.pobs.map((pob, pIdx) => `
                                        <div class="flex gap-2">
                                            <input type="text" class="edit-pob-val w-full border border-slate-300 rounded p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm" value="${pob}" placeholder="Nama POB">
                                            <button type="button" onclick="removeEditPob(${jIdx}, ${pIdx})" class="bg-red-50 text-red-500 px-2.5 rounded hover:bg-red-100 border border-red-100 transition-all"><i data-lucide="x" class="w-3.5 h-3.5"></i></button>
                                        </div>`).join('') || '<p class="text-xs text-slate-400 italic">Belum ada POB ditambahkan.</p>';
                                        
                    h += `          </div>
                                </div>
                                <div>
                                    <div class="flex justify-between items-center mb-3">
                                        <label class="block text-xs font-bold text-slate-600">Daftar PPA</label>
                                        <button type="button" onclick="addEditPpa(${jIdx})" class="text-[10px] text-emerald-700 bg-emerald-100 px-2.5 py-1.5 rounded-lg font-bold hover:bg-emerald-200 border border-emerald-200 shadow-sm transition-all">+ Tambah PPA</button>
                                    </div>
                                    <div class="space-y-2">`;
                                    
                    h += (juru.ppas || []).map((ppa, pIdx) => `
                                        <div class="flex gap-2">
                                            <input type="text" class="edit-ppa-val w-full border border-slate-300 rounded p-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all shadow-sm" value="${ppa}" placeholder="Nama PPA">
                                            <button type="button" onclick="removeEditPpa(${jIdx}, ${pIdx})" class="bg-red-50 text-red-500 px-2.5 rounded hover:bg-red-100 border border-red-100 transition-all"><i data-lucide="x" class="w-3.5 h-3.5"></i></button>
                                        </div>`).join('') || '<p class="text-xs text-slate-400 italic">Belum ada PPA ditambahkan.</p>';
                                        
                    h += `          </div>
                                </div>
                            </div>
                        </div>`;
                    return h;
                }).join('');
            } else {
                htmlUtama += '<p class="text-sm text-slate-400 italic text-center py-4">Belum ada data Juru. Klik "Tambah Juru Baru" di atas.</p>';
            }
            htmlUtama += '</div></div>';
            document.getElementById('edit-form-utama').innerHTML = htmlUtama;

            let htmlBendung = `
                <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm min-h-[300px]">
                    <div class="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
                        <h4 class="font-bold text-slate-700 text-lg flex items-center gap-2">
                            <i data-lucide="waves" class="w-5 h-5 text-sky-500"></i> Daftar Bendung & Petak
                        </h4>
                        <button type="button" onclick="addEditBendung()" class="text-xs bg-sky-50 text-sky-700 px-3 py-2 rounded-lg font-bold hover:bg-sky-100 transition-all border border-sky-100 shadow-sm">
                            + Tambah Bendung
                        </button>
                    </div>
                    <div class="space-y-6">`;
            
            if (tempProfilData.bendungs && tempProfilData.bendungs.length > 0) {
                htmlBendung += tempProfilData.bendungs.map((b, bIdx) => {
                    let h = `
                        <div class="edit-bendung-block border-2 border-sky-50 rounded-xl p-5 bg-slate-50 relative">
                            <button type="button" onclick="removeEditBendung(${bIdx})" class="absolute -top-3 -right-3 bg-red-100 text-red-600 p-2 rounded-full hover:bg-red-200 shadow-md transition-all border border-red-200">
                                <i data-lucide="trash-2" class="w-4 h-4"></i>
                            </button>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label class="block text-[10px] font-bold mb-1 text-slate-500 uppercase tracking-widest">Nama Bendung</label>
                                    <input type="text" class="edit-bendung-nama w-full border border-slate-300 rounded-lg p-2.5 font-bold text-sky-700 focus:ring-2 focus:ring-sky-500 outline-none transition-all shadow-sm" value="${b.nama}" placeholder="Contoh: Bendung Mepanga">
                                </div>
                                <div>
                                    <label class="block text-[10px] font-bold mb-1 text-slate-500 uppercase tracking-widest">Juru yang Bertanggung Jawab</label>
                                    <select class="edit-bendung-juru w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-sky-500 outline-none transition-all shadow-sm bg-white">
                                        <option value="">-- Belum Ditentukan --</option>`;
                                        
                    h += tempProfilData.jurus.map(j => `<option value="${j.nama}" ${b.juru === j.nama ? 'selected' : ''}>${j.nama || '(Juru Tanpa Nama)'}</option>`).join('');
                    
                    h += `          </select>
                                </div>
                            </div>
                            <div class="border border-slate-200 rounded-lg bg-white overflow-hidden shadow-sm">
                                <div class="flex justify-between items-center bg-slate-100 p-3 border-b border-slate-200">
                                    <label class="block text-xs font-bold text-slate-600 uppercase tracking-wider">Rincian Petak Tersier</label>
                                    <button type="button" onclick="addEditBendungRincian(${bIdx})" class="text-[10px] text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-lg font-bold hover:bg-emerald-100 border border-emerald-100 shadow-sm transition-all">+ Tambah Petak</button>
                                </div>
                                <div class="overflow-x-auto">
                                    <table class="w-full text-sm text-left">
                                        <thead class="bg-slate-50 border-b text-xs text-slate-500">
                                            <tr>
                                                <th class="p-2 border-r" style="min-width: 150px;">Petak Tersier</th>
                                                <th class="p-2 border-r" style="min-width: 100px;">L. Potensial</th>
                                                <th class="p-2 border-r" style="min-width: 100px;">L. Fungsional</th>
                                                <th class="p-2 border-r" style="min-width: 130px;">Desa</th>
                                                <th class="p-2 border-r" style="min-width: 130px;">Kecamatan</th>
                                                <th class="p-2 border-r" style="min-width: 130px;">GP3A</th>
                                                <th class="p-2" style="min-width: 130px;">P3A</th>
                                                <th class="p-2 text-center w-12">Aksi</th>
                                            </tr>
                                        </thead>
                                        <tbody>`;
                    
                    if (b.rincian && b.rincian.length > 0) {
                        h += b.rincian.map((r, rIdx) => `
                                            <tr class="edit-bendung-rincian-row border-b hover:bg-slate-50 transition-colors">
                                                <td class="p-2 border-r"><input type="text" class="rincian-petak w-full border border-slate-300 rounded p-1.5 text-xs focus:ring-1 focus:ring-sky-500 outline-none" value="${r.petak}"></td>
                                                <td class="p-2 border-r"><input type="number" step="any" class="rincian-potensial w-full border border-slate-300 rounded p-1.5 text-xs focus:ring-1 focus:ring-sky-500 outline-none" value="${r.luasPotensial}"></td>
                                                <td class="p-2 border-r"><input type="number" step="any" class="rincian-fungsional w-full border border-slate-300 rounded p-1.5 text-xs focus:ring-1 focus:ring-sky-500 outline-none" value="${r.luasFungsional}"></td>
                                                <td class="p-2 border-r"><input type="text" class="rincian-desa w-full border border-slate-300 rounded p-1.5 text-xs focus:ring-1 focus:ring-sky-500 outline-none" value="${r.desa}"></td>
                                                <td class="p-2 border-r"><input type="text" class="rincian-kecamatan w-full border border-slate-300 rounded p-1.5 text-xs focus:ring-1 focus:ring-sky-500 outline-none" value="${r.kecamatan || ''}"></td>
                                                <td class="p-2 border-r"><input type="text" class="rincian-gp3a w-full border border-slate-300 rounded p-1.5 text-xs focus:ring-1 focus:ring-sky-500 outline-none" value="${r.gp3a}"></td>
                                                <td class="p-2"><input type="text" class="rincian-p3a w-full border border-slate-300 rounded p-1.5 text-xs focus:ring-1 focus:ring-sky-500 outline-none" value="${r.p3a}"></td>
                                                <td class="p-2 text-center"><button type="button" onclick="removeEditBendungRincian(${bIdx}, ${rIdx})" class="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 p-1.5 rounded transition-colors"><i data-lucide="x" class="w-3.5 h-3.5"></i></button></td>
                                            </tr>`).join('');
                    } else {
                        h += '<tr><td colspan="8" class="p-4 text-center text-xs text-slate-400 italic">Belum ada rincian petak tersier ditambahkan.</td></tr>';
                    }
                    h += `              </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>`;
                    return h;
                }).join('');
            } else {
                htmlBendung += '<p class="text-sm text-slate-400 italic text-center py-4 border border-slate-200 border-dashed rounded-xl">Belum ada data Bendung. Klik "Tambah Bendung" di atas.</p>';
            }
            htmlBendung += `</div></div>`;
            document.getElementById('edit-form-bendung').innerHTML = htmlBendung;
            initIcons();
        }

        function switchProfilTab(tabId) {
    const isUtama = tabId === 'utama';
    if ((isUtama && !document.getElementById('tabContentProfil-utama').classList.contains('hidden')) || 
        (!isUtama && !document.getElementById('tabContentProfil-bendung').classList.contains('hidden'))) return;
    
    if (isProfilEditMode) { syncEditFormToTempData(); renderProfilEdit(); }

    document.getElementById('tabBtnProfil-utama').className = isUtama ? 'px-5 py-2.5 rounded-xl font-black bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-md shadow-blue-500/20 whitespace-nowrap transition-all scale-105' : 'px-5 py-2.5 rounded-xl font-bold text-slate-500 bg-white border border-slate-200 hover:bg-cyan-50 hover:text-blue-700 transition-all whitespace-nowrap';
    document.getElementById('tabBtnProfil-bendung').className = !isUtama ? 'px-5 py-2.5 rounded-xl font-black bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-md shadow-blue-500/20 whitespace-nowrap transition-all scale-105' : 'px-5 py-2.5 rounded-xl font-bold text-slate-500 bg-white border border-slate-200 hover:bg-cyan-50 hover:text-blue-700 transition-all whitespace-nowrap';
    
    document.getElementById('tabContentProfil-utama').classList.toggle('hidden', !isUtama);
    document.getElementById('tabContentProfil-bendung').classList.toggle('hidden', isUtama);
}

        // --- SISTEM TAB DINAMIS MULTI-FORMULIR ---
        function switchTabGroup(group, tabId) {
            const arr = group === 'O' ? ['01O','02O','03O','04O','05O','06O','07O','08O','09O','10O','11O','12O'] : ['01P','02P','03P','04P','05P','06P','07P','08P','09P','10P'];
            const prefix = group === 'O' ? 'tabBtn-' : 'tabBtnPem-';
            const contPrefix = group === 'O' ? 'tabContent-' : 'tabContentPem-';
            const activeClass = group === 'O'
                ? 'relative px-7 py-3 rounded-xl font-black text-white bg-gradient-to-br from-blue-600 to-cyan-500 shadow-lg shadow-blue-500/25 whitespace-nowrap transition-all duration-300 transform scale-[1.04] z-10 ring-2 ring-white snap-center'
                : 'relative px-7 py-3 rounded-xl font-black text-white bg-gradient-to-br from-emerald-600 to-cyan-500 shadow-lg shadow-emerald-500/25 whitespace-nowrap transition-all duration-300 transform scale-[1.04] z-10 ring-2 ring-white snap-center';
            const inactiveClass = group === 'O'
                ? 'relative px-6 py-3 rounded-xl font-bold text-slate-500 bg-white border border-slate-200 hover:border-cyan-300 hover:text-blue-700 hover:bg-cyan-50 hover:shadow-md whitespace-nowrap transition-all duration-200 transform hover:-translate-y-0.5 snap-center'
                : 'relative px-6 py-3 rounded-xl font-bold text-slate-500 bg-white border border-slate-200 hover:border-emerald-300 hover:text-emerald-700 hover:bg-emerald-50 hover:shadow-md whitespace-nowrap transition-all duration-200 transform hover:-translate-y-0.5 snap-center';
            
            // ðŸ‘‡ DEFINISI HAK AKSES ðŸ‘‡
            const restrictedAdminTabs = ['11O', '12O', '04P', '05P', '09P', '10P'];
            const isRestricted = restrictedAdminTabs.includes(tabId);
            const isOp = currentUser && currentUser.role === 'Operator';

            arr.forEach(t => {
                const btn = document.getElementById(prefix + t);
                const content = document.getElementById(contPrefix + t);
                if(btn && content) {
                    if(t === tabId) {
                        btn.className = activeClass;
                        content.classList.remove('hidden');
                        
                        // ðŸ‘‡ EKSEKUSI SEGEL BLUR & NOTIFIKASI ðŸ‘‡
                        if (isRestricted && isOp) {
                            // Terapkan Segel: Buram, Transparan, Mati Rasa (Unclickable), dan Hitam Putih
                            content.classList.add('blur-[4px]', 'pointer-events-none', 'opacity-50', 'grayscale', 'overflow-hidden');
                            
                            // Panggil Notifikasi Toast
                            showToast("Akses Terbatas! Formulir tingkat wilayah/kabupaten hanya dapat dikelola oleh Admin Global atau Kepala Seksi O&P.", "error");
                            
                            // Catatan: Fungsi render() TIDAK DIPANGGIL, sehingga data asli tidak akan dimuat ke layar.
                        } else {
                            // Cabut Segel jika Admin
                            content.classList.remove('blur-[4px]', 'pointer-events-none', 'opacity-50', 'grayscale', 'overflow-hidden');
                            
                            try {
                                if(t === '01O') render01O(); if(t === '02O') render02O();
                                if(t === '03O') render03O(); if(t === '04O') render04O();
                                if(t === '05O') render05O(); if(t === '06O') render06O();
                                if(t === '07O') render07O(); if(t === '08O') render08O();
                                if(t === '09O') render09O(); if(t === '10O') render10O();
                                if(t === '11O') render11O(); if(t === '12O') render12O();
                                
                                if(t === '01P') render01P(); if(t === '02P') render02P();
                                if(t === '03P') render03P(); if(t === '04P') render04P();
                                if(t === '05P') render05P(); if(t === '06P') render06P();
                                if(t === '07P') render07P(); if(t === '08P') render08P();
                                if(t === '09P') render09P(); if(t === '10P') render10P();
                            } catch (error) {
                                console.warn(`[Aman] Sistem mengabaikan error di ${t}:`, error);
                            }
                        }
                    } else {
                        btn.className = inactiveClass;
                        content.classList.add('hidden');
                        
                        // Bersihkan kelas segel untuk tab yang sedang tidak aktif
                        content.classList.remove('blur-[4px]', 'pointer-events-none', 'opacity-50', 'grayscale', 'overflow-hidden');
                    }
                }
            });
        }

        function switchBlankoTab(tabId) {
    const hTitle = document.getElementById('title-blanko-operasi');
    const hSub = document.getElementById('subtitle-blanko-operasi');
    if (hTitle && hSub) {
        if (tabId === '01O') { hTitle.innerText = "USULAN DAN KEPUTUSAN LUAS TANAM PER DAERAH IRIGASI"; hSub.innerText = "Laporan Tahunan dibuat oleh Juru"; }
        else if (tabId === '02O') { hTitle.innerText = "RENCANA TANAM PER WILAYAH MANTRI/JURU PER MASA TANAM"; hSub.innerText = "Laporan Tahunan dibuat oleh Pengamat"; }
        else if (tabId === '03O') { hTitle.innerText = "KUTIPAN LAMPIRAN KEPUTUSAN KOMISI IRIGASI MENGENAI RENCANA TATA TANAM PER DAERAH IRIGASI"; hSub.innerText = "Laporan Tahunan dibuat oleh Kasi O&P UPT Provinsi"; }
        else if (tabId === '04O') { hTitle.innerText = "LAPORAN KEADAAN AIR DAN TANAMAN PADA WILAYAH MANTRI / JURU"; hSub.innerText = "Laporan Setengah Bulanan dibuat oleh Juru"; }
        else if (tabId === '05O') { hTitle.innerText = "RENCANA KEBUTUHAN AIR DI PINTU PENGAMBILAN"; hSub.innerText = "Laporan Setengah Bulanan dibuat oleh Juru"; }
        else if (tabId === '06O') { hTitle.innerText = "PENCATATAN DEBIT SALURAN"; hSub.innerText = "Laporan Setengah Bulanan dibuat oleh Juru"; }
        else if (tabId === '07O') { hTitle.innerText = "RENCANA KEBUTUHAN AIR DI JARINGAN UTAMA"; hSub.innerText = "Laporan Setengah Bulanan dibuat oleh Pengamat"; }
        else if (tabId === '08O') { hTitle.innerText = "PENCATATAN DEBIT BANGUNAN PENGAMBILAN & SUNGAI"; hSub.innerText = "Laporan Setengah Bulanan dibuat oleh POB"; }
        else if (tabId === '09O') { hTitle.innerText = "PERHITUNGAN FAKTOR - K"; hSub.innerText = "Laporan Setengah Bulanan dibuat oleh Pengamat"; }
        else if (tabId === '10O') { hTitle.innerText = "PRODUKTIVITAS DAN NERACA PEMBAGIAN AIR"; hSub.innerText = "Laporan Tahunan dibuat oleh Pengamat"; }
        else if (tabId === '11O') { hTitle.innerText = "REKAP KABUPATEN PER MASA TANAM"; hSub.innerText = "Laporan Tahunan dibuat oleh Kasi O&P Kabupaten"; }
        else if (tabId === '12O') { hTitle.innerText = "REKAP PROVINSI"; hSub.innerText = "Laporan Tahunan dibuat oleh Kasi O&P Provinsi"; }
        else { hTitle.innerText = "Blanko Operasi Irigasi"; hSub.innerText = "Navigasi formulir 01-O sampai 12-O"; }
    }
    switchTabGroup('O', tabId);
    
    // Otomatis arahkan ke Main tab jika 04-O / 05-O diklik
    if(tabId === '04O') switchSubTab('04O','main');
    if(tabId === '05O') switchSubTab('05O','main');
}
        function switchPemeliharaanTab(tabId) {
    const hTitle = document.querySelector('#view-blanko-pemeliharaan h2');
    const hLabel = document.getElementById('pemeliharaan-header-label');
    const hSub = document.getElementById('pemeliharaan-header-sub');
    
    if (hTitle && hSub) {
        if (hLabel) hLabel.innerText = "Formulir Laporan Pemeliharaan";
        if (tabId === '01P') { 
            hTitle.innerText = "LAPORAN INSPEKSI RUTIN KERUSAKAN JARINGAN IRIGASI"; 
            hSub.innerText = "Laporan Bulanan dibuat oleh Juru (Tgl 25)";
        } else if (tabId === '02P') {
            hTitle.innerText = "LAPORAN PENELUSURAN KERUSAKAN JARINGAN IRIGASI"; 
            hSub.innerText = "Laporan Bulanan dibuat oleh Pengamat (Tgl 25)";
        } else if (tabId === '03P') {
            hTitle.innerText = "LAPORAN KERUSAKAN AKIBAT BENCANA"; 
            hSub.innerText = "Laporan Insidentil dibuat oleh Pengamat";
        } else if (tabId === '04P') {
            hTitle.innerText = "PROGRAM PEKERJAAN SWAKELOLA"; 
            hSub.innerText = "Laporan Tahunan dibuat oleh Dinas Pengairan/Balai PSDA";
        } else if (tabId === '05P') {
            hTitle.innerText = "PROGRAM PEKERJAAN KONTRAKTUAL"; 
            hSub.innerText = "Laporan Tahunan dibuat oleh Dinas Pengairan/Balai PSDA";
        } else if (tabId === '06P') {
            hTitle.innerText = "DAFTAR KEBUTUHAN BAHAN SWAKELOLA (RUTIN)"; 
            hSub.innerText = "Laporan 3 Bulanan dibuat oleh Pengamat";
        } else if (tabId === '07P') {
            hTitle.innerText = "DAFTAR KEBUTUHAN BAHAN SWAKELOLA DAN TENAGA KERJA (BERKALA)"; 
            hSub.innerText = "Laporan 3 Bulanan dibuat oleh Pengamat";
        } else if (tabId === '08P') {
            hTitle.innerText = "LAPORAN BULANAN: PELAKSANAAN PEKERJAAN SWAKELOLA"; 
            hSub.innerText = "Laporan Bulanan dibuat oleh P3A/GP3A/IP3A";
        } else if (tabId === '09P') {
            hTitle.innerText = "LAPORAN BULANAN: REALISASI PEKERJAAN KONTRAKTUAL"; 
            hSub.innerText = "Laporan Bulanan dibuat oleh Dinas Pengairan Kabupaten";
        } else if (tabId === '10P') {
            hTitle.innerText = "LAPORAN TAHUNAN : REALISASI PEKERJAAN PEMELIHARAAN"; 
            hSub.innerText = "Laporan Tahunan dibuat oleh Dinas Pengairan Kabupaten";                                     
        } else { 
            hTitle.innerText = "Blanko Pemeliharaan Irigasi"; 
            hSub.innerText = "Formulir Laporan Pemeliharaan"; 
        }
    }
    
    switchTabGroup('P', tabId);
    if(tabId === '02P') switchSubTab('02P','main');
}

        function switchSubTab(form, subId) {
            const isMain = subId === 'main';
            const activeClass = form.includes('O')
                ? 'px-6 py-2.5 bg-gradient-to-br from-blue-600 to-cyan-500 text-white rounded-xl text-sm font-bold shadow-md shadow-blue-500/20 transition-all scale-105'
                : 'px-6 py-2.5 bg-gradient-to-br from-emerald-600 to-cyan-500 text-white rounded-xl text-sm font-bold shadow-md shadow-emerald-500/20 transition-all scale-105';
            const inactiveClass = form.includes('O')
                ? 'px-6 py-2.5 bg-white text-slate-600 border border-slate-200 hover:bg-cyan-50 hover:text-blue-700 rounded-xl text-sm font-bold transition-all'
                : 'px-6 py-2.5 bg-white text-slate-600 border border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 rounded-xl text-sm font-bold transition-all';
            
            // Atur styling tombol (Menggunakan logika warna dinamis Anda)
            document.getElementById('subBtn-'+form+'-main').className = isMain ? activeClass : inactiveClass;
            document.getElementById('subBtn-'+form+'-a').className = !isMain ? activeClass : inactiveClass;
            
            // Atur visibilitas konten
            document.getElementById('subContent-'+form+'-main').classList.toggle('hidden', !isMain);
            document.getElementById('subContent-'+form+'-a').classList.toggle('hidden', isMain);

            // TAMBAHAN BARU: Panggil fungsi render jika membuka tab (Sub)
            if (!isMain) {
                if (form === '04O') render04Oa();
                if (form === '02P') render02aP(); // Panggil 02a-P saat diklik
            }
        }

        function switchRekapTab(tabId) {
    const isOp = tabId === 'operasi';
    
    // 1. Ganti warna tombol tab yang aktif
    document.getElementById('tabBtnRekap-operasi').className = isOp ? 'px-6 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold shadow-md shadow-slate-900/20 whitespace-nowrap transition-all scale-105' : 'px-6 py-2.5 bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 rounded-xl text-sm font-bold whitespace-nowrap transition-all';
    document.getElementById('tabBtnRekap-pemeliharaan').className = !isOp ? 'px-6 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold shadow-md shadow-slate-900/20 whitespace-nowrap transition-all scale-105' : 'px-6 py-2.5 bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 rounded-xl text-sm font-bold whitespace-nowrap transition-all';
    
    // 2. Munculkan/sembunyikan wadah HTML-nya
    document.getElementById('tabContentRekap-operasi').classList.toggle('hidden', !isOp);
    document.getElementById('tabContentRekap-pemeliharaan').classList.toggle('hidden', isOp);

    // 3. ðŸ‘‡ INI ADALAH PELATUK UTAMANYA ðŸ‘‡
    // Panggil fungsi render secara otomatis saat tab dibuka!
    if (isOp) {
        if (typeof renderMatriksOperasi === 'function') renderMatriksOperasi();
    } else {
        if (typeof renderMatriksPemeliharaan === 'function') renderMatriksPemeliharaan();
    }
}

// ====================================================================
// --- FORMULIR 01-O : USULAN & KEPUTUSAN RENCANA TANAM ---
// ====================================================================

function render01O() {
    const pData = getProfilData(currentDI);
    
    // 1. Info Header D.I
    ['di','kodeDI','pengamat','kabupaten'].forEach(id => {
        document.getElementById('o1-' + id).innerText = pData[id === 'di' ? 'kodeDI' : id] || (id==='di'?currentDI:"-");
    });
    document.getElementById('o1-di').innerText = currentDI;

    // 2. Kalkulasi Total Luas Sawah D.I
    let totalLuasDI = 0;
    const validBendungs = pData.bendungs ? pData.bendungs.filter(b => b.nama.trim() !== "") : [];
    validBendungs.forEach(b => { 
        if (b.rincian) b.rincian.forEach(r => totalLuasDI += (parseFloat(r.luasFungsional) || 0)); 
    });
    document.getElementById('o1-totalLuasDI').innerText = totalLuasDI > 0 ? totalLuasDI.toFixed(2) + ' Ha' : "0 Ha";

    // 3. Dropdown Bendung
    const selBendung = document.getElementById('o1-bendung-select');
    const currentValue = selBendung.value; 
    selBendung.innerHTML = '<option value="">-- Pilih Bendung / Area --</option>' + 
                            validBendungs.map(b => `<option value="${b.nama}">${b.nama}</option>`).join('');
    selBendung.value = validBendungs.find(b => b.nama === currentValue) ? currentValue : "";

    onBendungSelect01O();
    renderSavedList01O(); // Memanggil fungsi render khusus 01-O
    sync01OFromSupabase();
}

function onBendungSelect01O() {
    hideFormAlert('o1');
    const pData = getProfilData(currentDI);
    const bendungNama = document.getElementById('o1-bendung-select').value;
    
    if (!bendungNama) {
        ['juru','luasBendung','p3a','kecamatan'].forEach(id => document.getElementById('o1-' + id).innerText = "-");
        resetFormInputs01O();
        return;
    }

    const bendung = pData.bendungs.find(b => b.nama === bendungNama);
    if (bendung) {
        let luasBendung = 0; 
        let p3aSet = new Set(); 
        let kecSet = new Set();
        
        if (bendung.rincian) {
            bendung.rincian.forEach(r => {
                luasBendung += (parseFloat(r.luasFungsional) || 0);
                if (r.gp3a && r.gp3a.trim() !== "") p3aSet.add(r.gp3a.trim());
                if (r.p3a && r.p3a.trim() !== "") p3aSet.add(r.p3a.trim());
                if (r.kecamatan && r.kecamatan.trim() !== "") kecSet.add(r.kecamatan.trim());
            });
        }
        
        document.getElementById('o1-juru').innerText = bendung.juru || "-";
        document.getElementById('o1-luasBendung').innerText = luasBendung > 0 ? luasBendung.toFixed(2) : "0";
        document.getElementById('o1-p3a').innerText = p3aSet.size > 0 ? Array.from(p3aSet).join(', ') : "-";
        document.getElementById('o1-kecamatan').innerText = kecSet.size > 0 ? Array.from(kecSet).join(', ') : "-";
        document.getElementById('o1-kabupaten').innerText = pData.kabupaten || "-";
    }

    // Load data tersimpan jika ada
    const savedData = getLS('01O_' + currentDI);
    if (savedData[bendungNama]) {
        fillForm01O(savedData[bendungNama]);
        showFormAlert('o1', `Menampilkan riwayat laporan tersimpan untuk ${bendungNama}`, 'info');
    } else {
        resetFormInputs01O(true);
        fillPeriodFieldsFromFirst01OReport();
    }
    updatePeriodFields01OLock();
    calcLuas01O();
}

function calcLuas01O() {
    const luasFungsional = parseFloat(document.getElementById('o1-luasBendung').innerText) || 0;
    const cols = ['u1', 'u2', 'u3', 'k1', 'k2', 'k3'];
    
    cols.forEach(col => {
        let totalTanaman = 0;
        for (let i = 0; i <= 4; i++) {
            totalTanaman += parseFloat(document.getElementById(`o1-${col}-${i}`).value) || 0;
        }
        
        let bero = luasFungsional - totalTanaman;
        let luasSawahIrigasi = totalTanaman + bero; // Selalu kembali ke Luas Fungsional

        const beroEl = document.getElementById(`o1-${col}-5`);
        const luasSawahEl = document.getElementById(`o1-${col}-6`);

        if (luasFungsional > 0) {
            if(beroEl) beroEl.value = bero.toFixed(2);
            if(luasSawahEl) luasSawahEl.value = luasSawahIrigasi.toFixed(2);
            
            // Validasi Bero Minus (Alarm Merah)
            if (bero < -0.01) {
                if(beroEl) beroEl.classList.add('bg-red-100', 'text-red-700', 'font-bold');
                if(luasSawahEl) {
                    luasSawahEl.classList.remove('bg-indigo-50', 'text-indigo-700');
                    luasSawahEl.classList.add('bg-red-600', 'text-white');
                }
            } else {
                if(beroEl) beroEl.classList.remove('bg-red-100', 'text-red-700', 'font-bold');
                if(luasSawahEl) {
                    luasSawahEl.classList.remove('bg-red-600', 'text-white');
                    luasSawahEl.classList.add('bg-indigo-50', 'text-indigo-700');
                }
            }
        } else {
            if(beroEl) beroEl.value = "";
            if(luasSawahEl) luasSawahEl.value = "";
        }
    });
}

async function saveForm01O() {
    const bendungNama = document.getElementById('o1-bendung-select').value;
    if (!bendungNama) return showFormAlert('o1', "Harap pilih Bendung terlebih dahulu sebelum menyimpan!", "error");

    const report = { bendung: bendungNama, table: [] };
    ['periode', 'mt1', 'mt2', 'mt3', 'tglUsulan', 'tglKeputusan'].forEach(id => {
        report[id] = document.getElementById('o1-' + id).value;
    });

    for(let i = 0; i <= 8; i++) {
        let row = {};
        ['u1', 'u2', 'u3', 'k1', 'k2', 'k3'].forEach(k => { 
            const el = document.getElementById('o1-' + k + '-' + i); 
            row[k] = el ? el.value : ""; 
        });
        report.table.push(row);
    }

    const savedData = getLS('01O_' + currentDI);
    const periodeBaru = (report.periode || '').trim();
    const periodeAktif = getActiveOperasiPeriod();
    if (!(await confirmNewOperasiPeriodIfNeeded(periodeBaru))) {
        showFormAlert('o1', `Pengisian periode baru dibatalkan. Lengkapi terlebih dahulu periode aktif <strong>${periodeAktif}</strong>.`, 'error');
        return;
    }

    savedData[bendungNama] = withReportTimestamps(report, savedData[bendungNama]);
    setLS('01O_' + currentDI, savedData);
    if (periodeBaru) {
        unmarkFinalizedOperasiPeriod(periodeBaru);
        setActiveOperasiPeriod(periodeBaru);
    }

    let onlineSaved = false;
    try {
        onlineSaved = await saveLaporanOnline('01-O', savedData[bendungNama], {
            kategori: 'operasi',
            key_laporan: bendungNama,
            bendung: bendungNama
        });
    } catch (err) {
        console.error('Gagal simpan 01-O ke Supabase:', err);
    }
    
    renderAllOperationSavedLists();
    resetFormAction('01O');
    updatePeriodFields01OLock();
    showOperationSaveAlert('o1', `Laporan untuk <strong>${bendungNama}</strong> berhasil disimpan${onlineSaved ? ' ke Supabase' : ' lokal'}.`, onlineSaved ? 'success' : 'warning', periodeBaru);
    setTimeout(() => hideFormAlert('o1'), 4000);
}

// --- FUNGSI RENDER DAFTAR TERSIMPAN 01-O (DESAIN KARTU SERAGAM) ---
function renderSavedList01O() {
    const savedData = getLS('01O_' + currentDI);
    const container = document.getElementById('o1-saved-list');
    if(!container) return;

    const allKeys = Object.keys(savedData).sort();
    const keys = filterOperationSavedKeys('01-O', allKeys, savedData);

    if (allKeys.length === 0) {
        container.innerHTML = `<p class="col-span-full text-center text-slate-400 italic py-8 border border-dashed rounded-xl bg-slate-50">Belum ada Arsip Rencana Tanam (01-O) yang tersimpan.</p>`;
        return;
    }
    if (keys.length === 0) return renderNoActiveOperasiMessage(container, 'Arsip Rencana Tanam (01-O)');

    container.innerHTML = keys.map(k => {
        const d = savedData[k];
        return `<div class="bg-white p-4 border rounded-xl shadow-sm hover:shadow-md transition-all">
            <div class="flex items-start gap-3 mb-4">
                <div class="bg-emerald-100 text-emerald-600 p-2 rounded-lg"><i data-lucide="clipboard-list" class="w-5 h-5"></i></div>
                <div>
                    <h4 class="font-bold text-slate-800 text-sm truncate w-40" title="${k}">${k}</h4>
                    <p class="text-[10px] text-slate-500 font-medium">${d.periode || '-'}</p>
                </div>
            </div>
            <button onclick="edit01O('${k}')" class="w-full bg-emerald-50 text-emerald-700 py-2 rounded-lg font-bold text-xs">Lihat / Edit</button>
        </div>`;
    }).join('');
    
    if(typeof initIcons === 'function') initIcons();
}

function edit01O(bendungNama) {
    const selBendung = document.getElementById('o1-bendung-select');
    let found = Array.from(selBendung.options).find(o => o.value === bendungNama);
    if(found) { 
        selBendung.value = bendungNama; 
        onBendungSelect01O(); 
        document.getElementById('tabContent-01O').scrollIntoView({behavior: 'smooth'}); 
    } else {
        showFormAlert('o1', `Data bendung ${bendungNama} tidak ditemukan di Profil D.I saat ini.`, "error");
    }
}

async function sync01OFromSupabase() {
    if (!siopiDb) return;
    try {
        const onlineRows = await getLaporanOnline('01-O', { kategori: 'operasi' });
        if (!Array.isArray(onlineRows) || onlineRows.length === 0) return;

        const savedData = getLS('01O_' + currentDI) || {};
        onlineRows.forEach(row => {
            const key = row.key_laporan || row.bendung || row.data?.bendung;
            if (!key || !row.data) return;
            savedData[key] = {
                ...row.data,
                bendung: row.data.bendung || row.bendung || key,
                createdAt: row.data.createdAt || row.created_at,
                updatedAt: row.data.updatedAt || row.updated_at
            };
        });

        setLS('01O_' + currentDI, savedData);
        if (!getActiveOperasiPeriod()) {
            const latest = getLatestOperasiPeriodFrom01O();
            if (latest) setActiveOperasiPeriod(latest);
        }
        renderAllOperationSavedLists();
        updatePeriodFields01OLock();
    } catch (err) {
        console.error('Gagal sinkronisasi 01-O dari Supabase:', err);
    }
}

function fillForm01O(report) {
    ['periode', 'mt1', 'mt2', 'mt3', 'tglUsulan', 'tglKeputusan'].forEach(id => {
        const el = document.getElementById('o1-' + id);
        if(el) el.value = report[id] || "";
    });
    if (report.table) {
        for(let i = 0; i <= 8; i++) {
            if(report.table[i]) {
                ['u1', 'u2', 'u3', 'k1', 'k2', 'k3'].forEach(k => {
                    const el = document.getElementById('o1-' + k + '-' + i);
                    if(el) el.value = report.table[i][k] || report.table[i][k === 'u1' ? 'usulan' : (k === 'k1' ? 'keputusan' : '')] || "";
                });
            }
        }
    }
}

function getFirst01OReportForActivePeriod() {
    const savedData = getLS('01O_' + currentDI) || {};
    const activePeriod = getActiveOperasiPeriod();
    return Object.values(savedData)
        .filter(report => report && (!activePeriod || report.periode === activePeriod))
        .sort((a, b) => {
            const aTime = new Date(a.createdAt || a.timestamp || 0).getTime();
            const bTime = new Date(b.createdAt || b.timestamp || 0).getTime();
            return aTime - bTime;
        })[0] || null;
}

function fillPeriodFieldsFromFirst01OReport() {
    const reference = getFirst01OReportForActivePeriod();
    if (!reference) return;
    ['periode', 'mt1', 'mt2', 'mt3'].forEach(id => {
        const el = document.getElementById('o1-' + id);
        if (el && !el.value) el.value = reference[id] || "";
    });
    showFormAlert('o1', 'Periode dan Masa Tanam otomatis mengikuti laporan 01-O pertama pada periode aktif.', 'info');
}

function hasAnyActive01OReport() {
    const savedData = getLS('01O_' + currentDI) || {};
    const activePeriod = getActiveOperasiPeriod();
    if (!activePeriod) return Object.keys(savedData).length > 0;
    return Object.values(savedData).some(report => report?.periode === activePeriod);
}

function updatePeriodFields01OLock() {
    const locked = hasAnyActive01OReport();
    ['periode', 'mt1', 'mt2', 'mt3'].forEach(id => {
        const el = document.getElementById('o1-' + id);
        if (!el) return;
        el.readOnly = locked;
        el.classList.toggle('bg-slate-100', locked);
        el.classList.toggle('text-slate-500', locked);
        el.classList.toggle('cursor-not-allowed', locked);
        el.title = locked ? 'Periode dan MT mengikuti laporan 01-O pertama pada periode aktif.' : '';
    });
}

function resetFormInputs01O(keepLuasBendung = false) {
    ['periode', 'mt1', 'mt2', 'mt3', 'tglUsulan', 'tglKeputusan'].forEach(id => {
        const el = document.getElementById('o1-' + id);
        if(el) el.value = "";
    });
    
    for (let i = 0; i <= 8; i++) {
        if (keepLuasBendung && (i === 5 || i === 6)) continue; 
        ['u1', 'u2', 'u3', 'k1', 'k2', 'k3'].forEach(col => { 
            const el = document.getElementById('o1-' + col + '-' + i); 
            if(el) el.value = ""; 
        });
    }
    if (!keepLuasBendung) { 
        ['u1', 'u2', 'u3', 'k1', 'k2', 'k3'].forEach(col => { 
            const e5 = document.getElementById('o1-' + col + '-5'); if(e5) e5.value = ""; 
            const e6 = document.getElementById('o1-' + col + '-6'); if(e6) e6.value = ""; 
        }); 
    }
    updatePeriodFields01OLock();
}

function resetFormAction(formId) {
    if (formId === '01O') {
        document.getElementById('o1-bendung-select').value = "";
        onBendungSelect01O();
        resetFormInputs01O();
        calcLuas01O();
        hideFormAlert('o1');
    } else if (formId === '02O') {
        document.getElementById('o2-mt-select').value = "";
        onSelectMT02O();
    } else if (formId === '03O') {
        document.querySelectorAll('#o3-tbody input').forEach(inp => inp.value = "");
        hideFormAlert('o3');
    } else if (formId === '04O') {
        resetInputs04O(false);
        if (typeof resetInputs04Oa === 'function') resetInputs04Oa(false);
        hideFormAlert('o4');
        hideFormAlert('o4a');
    } else if (formId === '05O') {
        resetInputs05O(false);
        resetInputs05Oa(false);
        hideFormAlert('o5');
        hideFormAlert('o5a');
    } else if (formId === '06O') {
        resetInputs06O(false);
        hideFormAlert('o6');
    } else if (formId === '07O') {
        resetInputs07O(false);
        hideFormAlert('o7');
    } else if (formId === '08O') {
        resetInputs08O(false);
        hideFormAlert('o8');
    } else if (formId === '09O') {
        resetInputs09O(false);
        hideFormAlert('o9');
    } else if (formId === '10O') {
        resetInputs10O(false);
        hideFormAlert('o10');
    } else if (formId === '11O') {
        resetInputs11O(false);
        hideFormAlert('o11');
    } else if (formId === '12O') {
        resetInputs12O();
        hideFormAlert('o12');
    } else if (formId === '01P' || formId === '02P') {
        const d = new Date();
        const months = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
        const val = `${months[d.getMonth()]} ${d.getFullYear()}`;
        if (formId === '01P') {
            document.getElementById('p1-bulan').value = val;
            document.getElementById('p1-juru').value = "";
            onChangeFilter01P();
        }
        if (formId === '02P') {
            document.getElementById('p2-bulan').value = val;
            syncDataFrom01P();
        }
    } else if (formId === '02aP') {
        resetInputs02aP();
    } else if (formId === '03P') {
        document.getElementById('p3-tanggal').value = new Date().toISOString().split('T')[0];
        document.getElementById('p3-tbody').innerHTML = '';
        addTableRow03P();
        hideFormAlert('p3');
    } else if (formId === '04P') {
        document.getElementById('p4-dinas').value = "";
        document.getElementById('p4-tbody').innerHTML = '';
        addTableRow04P();
        hideFormAlert('p4');
    } else if (formId === '05P') {
        document.getElementById('p5-dinas').value = "";
        document.getElementById('p5-tbody').innerHTML = '';
        addTableRow05P();
        hideFormAlert('p5');
    } else if (formId === '06P') {
        document.getElementById('p6-juru').value = "";
        document.getElementById('p6-luas').value = "";
        document.getElementById('p6-tbody').innerHTML = '<tr><td colspan="27" class="p-12 text-center text-slate-400">Pilih Juru terlebih dahulu...</td></tr>';
        document.getElementById('p6-btn-add').classList.add('hidden');
        document.getElementById('p6-btn-add').classList.remove('flex');
        hideFormAlert('p6');
    } else if (formId === '07P') {
        document.getElementById('p7-juru').value = "";
        document.getElementById('p7-luas').value = "";
        document.getElementById('p7-tbody').innerHTML = '<tr><td colspan="25" class="p-12 text-center text-slate-400">Pilih Juru terlebih dahulu...</td></tr>';
        document.getElementById('p7-btn-add').classList.add('hidden');
        document.getElementById('p7-btn-add').classList.remove('flex');
        hideFormAlert('p7');
    } else if (formId === '08P') {
        document.getElementById('p8-pekerjaan').value = "";
        document.getElementById('p8-tgl-mulai').value = "";
        document.getElementById('p8-tgl-selesai').value = "";
        document.getElementById('p8-tbody').innerHTML = '';
        addTableRow08P();
        hideFormAlert('p8');
    } else if (formId === '09P') {
        document.getElementById('p9-dinas').value = "";
        document.getElementById('p9-tbody').innerHTML = '';
        addTableRow09P();
        hideFormAlert('p9');
    } else if (formId === '10P') {
        document.getElementById('p10-dinas').value = "";
        document.getElementById('p10-tbody').innerHTML = '';
        addTableRow10P();
        hideFormAlert('p10');
    }
}

// --- FUNGSI TARIK DATA KEPUTUSAN DARI 03-O ---
function tarikDataKeputusan03O() {
    const bendungNama = document.getElementById('o1-bendung-select').value;
    const periode = document.getElementById('o1-periode').value; // Contoh: "2024/2025"

    if (!bendungNama || !periode) {
        return showFormAlert('o1', "Harap pilih Bendung dan isi 'Periode (Tahun/Tahun)' terlebih dahulu!", "error");
    }

    // 1. Buka brankas 03-O
    const db03 = getLS('03O_' + currentDI) || {};
    const arsip03 = db03[periode]; 

    // 2. Validasi Ketersediaan Data
    if (!arsip03 || !arsip03.data) {
        return showFormAlert('o1', `Arsip Keputusan 03-O untuk periode <strong>${periode}</strong> belum ada di sistem!`, "error");
    }

    // 3. Tarik data khusus untuk Bendung yang sedang dipilih
    const data03 = arsip03.data[bendungNama];

    if (!data03) {
        return showFormAlert('o1', `Bendung ${bendungNama} tidak terdaftar di dalam arsip 03-O periode ${periode}.`, "error");
    }

    // =========================================================
    // 4. PENYUNTIKAN DATA KE KOLOM KEPUTUSAN 01-O
    // Menggunakan nama kunci (data-col) dari render03O Anda
    // =========================================================
    
    // Baris 1: Padi (Index 0) -> Diambil dari data-col="padi-1", "padi-2", "padi-3"
    document.getElementById('o1-k1-0').value = data03['padi-1'] || "";
    document.getElementById('o1-k2-0').value = data03['padi-2'] || "";
    document.getElementById('o1-k3-0').value = data03['padi-3'] || "";

    // Baris 2 & 3: Tebu (Di 03-O hanya 1 kolom, disalin ke MT1, MT2, dan MT3 di 01-O) -> "tebu-ada", "tebu-yad"
    const valTebuAda = data03['tebu-ada'] || "";
    document.getElementById('o1-k1-1').value = valTebuAda;
    document.getElementById('o1-k2-1').value = valTebuAda;
    document.getElementById('o1-k3-1').value = valTebuAda;

    const valTebuYad = data03['tebu-yad'] || "";
    document.getElementById('o1-k1-2').value = valTebuYad;
    document.getElementById('o1-k2-2').value = valTebuYad;
    document.getElementById('o1-k3-2').value = valTebuYad;

    // Baris 4: Palawija (Index 3) -> Diambil dari data-col="palawija-1", "palawija-2", "palawija-3"
    document.getElementById('o1-k1-3').value = data03['palawija-1'] || "";
    document.getElementById('o1-k2-3').value = data03['palawija-2'] || "";
    document.getElementById('o1-k3-3').value = data03['palawija-3'] || "";

    // Baris 5: Keperluan Lain (Index 4) -> Diambil dari data-col="lain-1", "lain-2", "lain-3"
    document.getElementById('o1-k1-4').value = data03['lain-1'] || "";
    document.getElementById('o1-k2-4').value = data03['lain-2'] || "";
    document.getElementById('o1-k3-4').value = data03['lain-3'] || "";

    // Baris 8: Golongan (Menyalin nilai 03-O ke MT1, MT2, dan MT3)
    const valGolongan = data03['golongan'] || "";
    document.getElementById('o1-k1-7').value = valGolongan;
    document.getElementById('o1-k2-7').value = valGolongan;
    document.getElementById('o1-k3-7').value = valGolongan;

    // Baris 9: Tgl Pemberian Air - Mulai (Menyalin nilai 03-O ke MT1, MT2, dan MT3)
    const valTglMulai = data03['tgl-mulai'] || "";
    document.getElementById('o1-k1-8').value = valTglMulai;
    document.getElementById('o1-k2-8').value = valTglMulai;
    document.getElementById('o1-k3-8').value = valTglMulai;

    // 5. Jalankan ulang kalkulasi agar baris 6 (Bero) menyesuaikan data baru
    calcLuas01O();

    showFormAlert('o1', `Sukses! Keputusan Komisi Irigasi untuk <strong>${bendungNama}</strong> berhasil disalin.`, 'success');
}

        // ====================================================================
// --- SISTEM LOGIKA FORMULIR 02-O (RENCANA TANAM GLOBAL) ---
// ====================================================================

function render02O() {
    const pData = getProfilData(currentDI);
    
    // 1. Info Header
    ['di','kodeDI','pengamat','kabupaten'].forEach(id => {
        const el = document.getElementById('o2-' + id);
        if(el) el.innerText = (id === 'di') ? currentDI : (pData[id] || "-");
    }); 

    let totalLuasDI = 0;
    if(pData.bendungs) {
        pData.bendungs.forEach(b => { 
            if (b.rincian) b.rincian.forEach(r => totalLuasDI += (parseFloat(r.luasFungsional) || 0)); 
        });
    }
    document.getElementById('o2-totalLuasDI').innerText = totalLuasDI > 0 ? totalLuasDI.toFixed(2) + ' Ha' : "0 Ha";

    // Reset dropdown MT setiap kali render tab
    document.getElementById('o2-mt-select').value = "";
    onSelectMT02O();
    renderSavedList02O();
    sync02OFromSupabase();
}

function onSelectMT02O() {
    hideFormAlert('o2');
    const mt = document.getElementById('o2-mt-select').value;
    const tbody = document.getElementById('o2-tbody');
    const periodeText = document.getElementById('o2-periodeText');

    if (!mt) { 
        tbody.innerHTML = '<tr><td colspan="21" class="text-center py-12 text-slate-400 italic border-b border-slate-200 bg-slate-50/50">Silakan pilih Masa Tanam (MT) untuk menarik data.</td></tr>'; 
        periodeText.innerText = "-"; 
        return; 
    }

    const o1Data = getLS('01O_' + currentDI);
    const pData = getProfilData(currentDI);
    const keys = Object.keys(o1Data);

    if (keys.length === 0) { 
        tbody.innerHTML = '<tr><td colspan="21" class="text-center py-12 text-red-400 italic font-medium border-b border-slate-200 bg-red-50">Belum ada data Arsip 01-O. Pastikan Anda sudah menyimpan data di tab 01-O terlebih dahulu.</td></tr>'; 
        periodeText.innerText = "-"; 
        return; 
    }

    let mtProp = mt.toLowerCase(); // mt1, mt2, mt3
    let valProp = mt.slice(-1);    // 1, 2, atau 3

    // Cari teks periode dari data pertama yang ditemukan
    let foundPeriode = "";
    for (let k of keys) { 
        if (o1Data[k][mtProp]) { foundPeriode = o1Data[k][mtProp]; break; } 
    }
    periodeText.innerText = foundPeriode || "Periode belum diatur di 01-O";

    // --- AKSES BRANKAS 03-O UNTUK GOLONGAN, TGL MULAI, & TGL SELESAI ---
    const db03 = getLS('03O_' + currentDI) || {};
    let mainPeriode01 = "";
    if (keys.length > 0 && o1Data[keys[0]].periode) {
        mainPeriode01 = o1Data[keys[0]].periode;
    }
    const arsip03 = db03[mainPeriode01] || { data: {} }; 
    // -------------------------------------------------------------

    let html = ''; 
    let no = 1;

    keys.sort().forEach(bendungNama => {
        const rep = o1Data[bendungNama];
        const bProfile = pData.bendungs.find(b => b.nama === bendungNama);
        
        let kecSet = new Set(); 
        let luasFungsional = 0;
        if (bProfile && bProfile.rincian) {
            bProfile.rincian.forEach(r => { 
                luasFungsional += (parseFloat(r.luasFungsional) || 0); 
                if(r.kecamatan) kecSet.add(r.kecamatan.trim()); 
            });
        }

        let tb = rep.table || [];
        // Indeks di 01-O: 0:Padi, 1:TebuAda, 2:TebuYad, 3:Palawija, 4:Lain, 5:Bero
        const getRowVal = (idx, type) => parseFloat(tb[idx]?.[type + valProp]) || 0;

        // Data Usulan (dari 01-O)
        let uP = getRowVal(0, 'u'), uTA = getRowVal(1, 'u'), uTY = getRowVal(2, 'u'), 
            uPal = getRowVal(3, 'u'), uL = getRowVal(4, 'u'), uB = getRowVal(5, 'u');
        
        // Data Keputusan (dari 01-O)
        let kP = getRowVal(0, 'k'), kTA = getRowVal(1, 'k'), kTY = getRowVal(2, 'k'), 
            kPal = getRowVal(3, 'k'), kL = getRowVal(4, 'k'), kB = getRowVal(5, 'k');

        let sumU = uP + uTA + uTY + uPal + uL + uB; 
        let sumK = kP + kTA + kTY + kPal + kL + kB;

        // --- TARIK DATA LANGSUNG DARI 03-O ---
        let golOtomatis = "-";
        let tglMulaiOtomatis = "";
        let tglSelesaiOtomatis = "";
        
        if (arsip03.data[bendungNama]) {
            golOtomatis = arsip03.data[bendungNama]['golongan'] || "-";
            tglMulaiOtomatis = arsip03.data[bendungNama]['tgl-mulai'] || "";
            tglSelesaiOtomatis = arsip03.data[bendungNama]['tgl-selesai'] || ""; // Sedot Tgl Selesai
        }
        // -------------------------------------------------------------

        html += `
            <tr class="border-b hover:bg-blue-50/30 text-center transition-colors bg-white" data-bendung="${bendungNama}">
                <td class="p-3 border-r text-slate-400 text-xs">${no++}</td>
                <td class="p-3 border-r text-left font-bold text-slate-800 text-xs">${bendungNama}</td>
                <td class="p-3 border-r text-left text-[10px] text-slate-500 leading-tight">${Array.from(kecSet).join(', ') || '-'}</td>
                <td class="p-3 border-r font-bold text-indigo-700 bg-indigo-50/30">${luasFungsional.toFixed(2)}</td>
                
                <!-- KOLOM USULAN -->
                <td class="p-2 border-r bg-blue-50/20">${uP || '-'}</td>
                <td class="p-2 border-r bg-blue-50/20">${uTA || '-'}</td>
                <td class="p-2 border-r bg-blue-50/20">${uTY || '-'}</td>
                <td class="p-2 border-r bg-blue-50/20">${uPal || '-'}</td>
                <td class="p-2 border-r bg-blue-50/20">${uL || '-'}</td>
                <td class="p-2 border-r bg-blue-50/20 text-orange-600 font-medium">${uB || '-'}</td>
                <td class="p-2 border-r bg-blue-100/50 font-black text-blue-800">${sumU.toFixed(2)}</td>
                
                <!-- KOLOM KEPUTUSAN -->
                <td class="p-2 border-r bg-emerald-50/20">${kP || '-'}</td>
                <td class="p-2 border-r bg-emerald-50/20">${kTA || '-'}</td>
                <td class="p-2 border-r bg-emerald-50/20">${kTY || '-'}</td>
                <td class="p-2 border-r bg-emerald-50/20">${kPal || '-'}</td>
                <td class="p-2 border-r bg-emerald-50/20">${kL || '-'}</td>
                <td class="p-2 border-r bg-emerald-50/20 text-orange-600 font-medium">${kB || '-'}</td>
                <td class="p-2 border-r bg-emerald-100/50 font-black text-emerald-800">${sumK.toFixed(2)}</td>
                
                <!-- KOLOM GOLONGAN & TANGGAL (Kunci Total, Sumber: 03-O) -->
                <td class="p-2 border-r font-bold text-slate-700 text-xs bg-slate-50">${golOtomatis}</td>
                <td class="p-1 border-r bg-slate-50">
                    <input type="date" value="${tglMulaiOtomatis}" readonly class="tgl-mulai w-full text-[10px] p-1 border-0 bg-transparent text-slate-700 font-bold outline-none cursor-not-allowed text-center">
                </td>
                <td class="p-1 bg-slate-50">
                    <input type="date" value="${tglSelesaiOtomatis}" readonly class="tgl-selesai w-full text-[10px] p-1 border-0 bg-transparent text-slate-700 font-bold outline-none cursor-not-allowed text-center">
                </td>
            </tr>`;
    });

    tbody.innerHTML = html;

    showFormAlert('o2', `Memuat data untuk <strong>${mt}</strong>. (Keputusan, Golongan, Tgl Mulai & Selesai disinkronkan otomatis dari 03-O).`, "info");
}

async function saveForm02O() {
    const mt = document.getElementById('o2-mt-select').value;
    if (!mt) return showFormAlert('o2', "Harap pilih Masa Tanam (MT)!", "error");

    const rows = document.querySelectorAll('#o2-tbody tr[data-bendung]');
    if (rows.length === 0) return;

    const reportData = { 
        mt,
        periodeUtama: findOperasiPeriodByMtAndBendung(mt),
        periode: document.getElementById('o2-periodeText').innerText, 
        data: {} 
    };

    rows.forEach(r => {
        reportData.data[r.getAttribute('data-bendung')] = { 
            mulai: r.querySelector('.tgl-mulai').value, 
            selesai: r.querySelector('.tgl-selesai').value 
        };
    });

    const savedData = getLS('02O_' + currentDI);
    savedData[mt] = withReportTimestamps(reportData, savedData[mt]);
    setLS('02O_' + currentDI, savedData);

    let onlineSaved = false;
    try {
        onlineSaved = await saveLaporanOnline('02-O', savedData[mt], {
            kategori: 'operasi',
            key_laporan: mt,
            mt,
            periode: savedData[mt].periode || ''
        });
    } catch (err) {
        console.error('Gagal simpan 02-O ke Supabase:', err);
    }
    
    renderSavedList02O();
    
    // PANGGIL FUNGSI PEMBERSIHAN OTOMATIS DI SINI:
    resetFormInputs02O(); 
    
    showOperationSaveAlert('o2', `Rencana Tanam (02-O) periode <strong>${mt}</strong> berhasil diperbarui${onlineSaved ? ' ke Supabase' : ' lokal'}.`, onlineSaved ? 'success' : 'warning', savedData[mt].periodeUtama || savedData[mt].periodeOperasi || '');
}

function renderSavedList02O() {
    const savedData = getLS('02O_' + currentDI);
    const container = document.getElementById('o2-saved-list'); 
    if(!container) return;
    
    const allKeys = Object.keys(savedData).sort();
    const keys = filterOperationSavedKeys('02-O', allKeys, savedData);

    if (allKeys.length === 0) {
        container.innerHTML = `<p class="col-span-full text-center text-slate-400 italic py-8 border border-dashed rounded-xl bg-slate-50">Belum ada Daftar Rencana Tanam (02-O) yang tersimpan.</p>`;
        return;
    }
    if (keys.length === 0) return renderNoActiveOperasiMessage(container, 'Daftar Rencana Tanam (02-O)');

    container.innerHTML = keys.map(k => {
        const d = savedData[k];
        const jadwal = d.periode || "-";
        return `<div class="bg-white p-4 border rounded-xl shadow-sm hover:shadow-md transition-all">
            <div class="flex items-start gap-3 mb-4">
                <div class="bg-blue-100 text-blue-600 p-2 rounded-lg"><i data-lucide="file-check-2" class="w-5 h-5"></i></div>
                <div>
                    <h4 class="font-bold text-slate-800 text-sm truncate w-40" title="${k}">${k}</h4>
                    <p class="text-[10px] text-slate-500 font-medium">${jadwal}</p>
                </div>
            </div>
            <button onclick="edit02O('${k}')" class="w-full bg-blue-50 text-blue-700 py-2 rounded-lg font-bold text-xs">Lihat / Edit</button>
        </div>`;
    }).join('');
    
    if(typeof initIcons === 'function') initIcons();
}

function edit02O(mt) { 
    document.getElementById('o2-mt-select').value = mt; 
    onSelectMT02O(); 
    document.getElementById('view-blanko-operasi').scrollIntoView({behavior: 'smooth'}); 
}

async function sync02OFromSupabase() {
    if (!siopiDb) return;
    try {
        const onlineRows = await getLaporanOnline('02-O', { kategori: 'operasi' });
        if (!Array.isArray(onlineRows) || onlineRows.length === 0) return;

        const savedData = getLS('02O_' + currentDI) || {};
        onlineRows.forEach(row => {
            const key = row.key_laporan || row.mt || row.data?.mt;
            if (!key || !row.data) return;
            savedData[key] = {
                ...row.data,
                mt: row.data.mt || row.mt || key,
                periode: row.data.periode || row.periode || '',
                createdAt: row.data.createdAt || row.created_at,
                updatedAt: row.data.updatedAt || row.updated_at
            };
        });

        setLS('02O_' + currentDI, savedData);
        renderSavedList02O();
    } catch (err) {
        console.error('Gagal sinkronisasi 02-O dari Supabase:', err);
    }
}

async function syncOperasiFormFromSupabase(formId, blanko, renderListFn) {
    if (!siopiDb) return;
    try {
        const onlineRows = await getLaporanOnline(blanko, { kategori: 'operasi' });
        if (!Array.isArray(onlineRows) || onlineRows.length === 0) return;

        const savedData = getLS(formId + '_' + currentDI) || {};
        onlineRows.forEach(row => {
            const key = row.key_laporan || row.data?.key_laporan || row.data?.key || row.bendung || row.mt || row.periode || row.tahun;
            if (!key || !row.data) return;
            savedData[key] = {
                ...row.data,
                createdAt: row.data.createdAt || row.created_at,
                updatedAt: row.data.updatedAt || row.updated_at
            };
        });

        setLS(formId + '_' + currentDI, savedData);
        if (typeof renderListFn === 'function') renderListFn();
    } catch (err) {
        console.error(`Gagal sinkronisasi ${blanko} dari Supabase:`, err);
    }
}

async function syncOperasiGlobalFromSupabase(storageKey, blanko, renderListFn) {
    if (!siopiDb) return;
    try {
        const onlineRows = await getLaporanOnline(blanko, { kategori: 'operasi' });
        if (!Array.isArray(onlineRows) || onlineRows.length === 0) return;

        const savedData = getLS(storageKey) || {};
        onlineRows.forEach(row => {
            const key = row.key_laporan || row.data?.key_laporan || row.data?.periode || row.data?.mt || row.data?.tahun;
            if (!key || !row.data) return;
            savedData[key] = {
                ...row.data,
                createdAt: row.data.createdAt || row.created_at,
                updatedAt: row.data.updatedAt || row.updated_at
            };
        });

        setLS(storageKey, savedData);
        if (typeof renderListFn === 'function') renderListFn();
    } catch (err) {
        console.error(`Gagal sinkronisasi ${blanko} dari Supabase:`, err);
    }
}

async function syncPemeliharaanFormFromSupabase(formId, blanko, renderListFn) {
    if (!siopiDb) return;
    try {
        const onlineRows = await getLaporanOnline(blanko, { kategori: 'pemeliharaan' });
        if (!Array.isArray(onlineRows) || onlineRows.length === 0) return;

        const storageKey = formId + '_' + currentDI;
        const savedData = getLS(storageKey) || {};

        onlineRows.forEach(row => {
            const key = row.key_laporan || row.data?.key_laporan || row.data?.periode || row.data?.bulan || row.data?.tahun;
            if (!key || !row.data) return;
            savedData[key] = {
                ...row.data,
                createdAt: row.data.createdAt || row.created_at,
                updatedAt: row.data.updatedAt || row.updated_at
            };
        });

        setLS(storageKey, savedData);
        if (typeof renderListFn === 'function') renderListFn();
    } catch (err) {
        console.error(`Gagal sinkronisasi ${blanko} dari Supabase:`, err);
    }
}

async function syncPemeliharaanAwalFromSupabase() {
    if (!siopiDb) return;
    await Promise.all([
        syncPemeliharaanFormFromSupabase('01P', '01-P'),
        syncPemeliharaanFormFromSupabase('02P', '02-P'),
        syncPemeliharaanFormFromSupabase('02aP', '02a-P'),
        syncPemeliharaanFormFromSupabase('03P', '03-P'),
        syncPemeliharaanFormFromSupabase('04P', '04-P'),
        syncPemeliharaanFormFromSupabase('05P', '05-P'),
        syncPemeliharaanFormFromSupabase('06P', '06-P'),
        syncPemeliharaanFormFromSupabase('07P', '07-P'),
        syncPemeliharaanFormFromSupabase('08P', '08-P'),
        syncPemeliharaanFormFromSupabase('09P', '09-P'),
        syncPemeliharaanFormFromSupabase('10P', '10-P')
    ]);
}

async function syncAllOperasiFromSupabase() {
    if (!siopiDb) return;
    await Promise.all([
        sync01OFromSupabase(),
        sync02OFromSupabase(),
        syncOperasiFormFromSupabase('03O', '03-O'),
        syncOperasiFormFromSupabase('04O', '04-O'),
        syncOperasiFormFromSupabase('04Oa', '04Oa'),
        syncOperasiFormFromSupabase('05O', '05-O'),
        syncOperasiFormFromSupabase('05Oa', '05a-O'),
        syncOperasiFormFromSupabase('06O', '06-O'),
        syncOperasiFormFromSupabase('07O', '07-O'),
        syncOperasiFormFromSupabase('08O', '08-O'),
        syncOperasiFormFromSupabase('09O', '09-O'),
        syncOperasiFormFromSupabase('10O', '10-O'),
        syncOperasiGlobalFromSupabase('11O_GLOBAL', '11-O'),
        syncOperasiGlobalFromSupabase('12O_GLOBAL', '12-O')
    ]);
}

function resetFormInputs02O(keepDropdown = false) {
    if (!keepDropdown) {
        // Kembalikan dropdown ke posisi kosong
        document.getElementById('o2-mt-select').value = "";
        // Panggil fungsi onSelect agar tabel otomatis kembali ke tampilan awal (kosong)
        onSelectMT02O(); 
    } else {
        // Jika dropdown tetap dipertahankan, kosongkan tanggalnya saja
        const rows = document.querySelectorAll('#o2-tbody tr[data-bendung]');
        rows.forEach(r => {
            const tglMulai = r.querySelector('.tgl-mulai');
            const tglSelesai = r.querySelector('.tgl-selesai');
            if(tglMulai) tglMulai.value = "";
            if(tglSelesai) tglSelesai.value = "";
        });
    }
}

// ====================================================================
// --- FORMULIR 03-O : KEPUTUSAN KOMISI IRIGASI ---
// ====================================================================

function render03O() {
    const pData = getProfilData(currentDI);
    
    // 1. Isi Header Info D.I
    ['di','kodeDI','pengamat','kabupaten'].forEach(id => {
        document.getElementById('o3-' + id).innerText = pData[id === 'di' ? 'kodeDI' : id] || (id==='di'?currentDI:"-");
    });
    document.getElementById('o3-di').innerText = currentDI;

    // Kalkulasi Total Luas Sawah D.I
    let totalLuasDI = 0;
    const validBendungs = pData.bendungs ? pData.bendungs.filter(b => b.nama.trim() !== "") : [];
    validBendungs.forEach(b => {
        if (b.rincian) b.rincian.forEach(r => totalLuasDI += (parseFloat(r.luasFungsional) || 0));
    });
    document.getElementById('o3-totalLuasDI').innerText = totalLuasDI > 0 ? totalLuasDI.toFixed(2) + ' Ha' : "0 Ha";

    // 2. Ambil Periode dari Data 01-O
    const o1Data = getLS('01O_' + currentDI);
    const keys01 = Object.keys(o1Data);
    let periodeStr = "-";
    if (keys01.length > 0 && o1Data[keys01[0]].periode) {
        periodeStr = o1Data[keys01[0]].periode;
    }
    document.getElementById('o3-periodeText').innerText = periodeStr;

    // 3. Cek Status Penyimpanan di 03-O
    const tbody = document.getElementById('o3-tbody');
    const saved03O = getLS('03O_' + currentDI);
    syncOperasiFormFromSupabase('03O', '03-O', renderSavedList03O);
    
    // ðŸ‘‰ REVISI: Jika belum ada data dari 01-O sama sekali
    if (keys01.length === 0) {
        tbody.innerHTML = '<tr><td colspan="19" class="text-center py-8 text-red-500 italic font-medium bg-red-50 border-b border-red-100">Belum ada data Arsip Usulan dari 01-O. Harap isi dan simpan data pada tab 01-O terlebih dahulu.</td></tr>';
        renderSavedList03O();
        return;
    }

    // ðŸ‘‰ REVISI: Jika laporan untuk periode ini SUDAH PERNAH DISIMPAN
    if (saved03O[periodeStr]) {
        tbody.innerHTML = `
            <tr>
                <td colspan="19" class="text-center py-12 bg-indigo-50/50 border-b border-indigo-100">
                    <i data-lucide="check-circle-2" class="w-12 h-12 text-indigo-400 mx-auto mb-3"></i>
                    <h4 class="font-bold text-slate-700 text-lg mb-1">Laporan Sudah Tersimpan</h4>
                    <p class="text-slate-500 text-sm">Data Keputusan Komisi Irigasi untuk periode <strong>${periodeStr}</strong> sudah ada di dalam arsip.</p>
                    <p class="text-indigo-600 font-bold mt-4 animate-pulse">ðŸ‘‡ Silakan klik tombol "Lihat / Edit" pada Daftar Tersimpan di bawah untuk memuat tabel. ðŸ‘‡</p>
                </td>
            </tr>`;
        
        if (typeof initIcons === 'function') initIcons();
        renderSavedList03O();
        return; // Hentikan render tabel kosong agar user fokus ke tombol edit
    }

    // ðŸ‘‰ REVISI: Jika data BELUM PERNAH DISIMPAN (Render tabel kosong untuk diisi)
    let html = '';
    let no = 1;

    validBendungs.forEach((b, idx) => {
        if (!o1Data[b.nama]) return; 

        let luasSawah = 0;
        if (b.rincian) b.rincian.forEach(r => luasSawah += (parseFloat(r.luasFungsional) || 0));

        html += `
            <tr class="border-b hover:bg-slate-50 text-center bg-white" data-idx="${idx}" data-bendung="${b.nama}">
                <td class="td-base font-bold text-slate-500">${no++}</td>
                <td class="td-base text-left font-bold text-slate-800">${currentDI}</td>
                <td class="td-base text-left font-bold text-slate-800">${b.nama}</td>
                <td class="td-base font-bold text-emerald-600 bg-emerald-50/30">${luasSawah > 0 ? luasSawah.toFixed(2) : '-'}</td>

                <td class="td-base"><input type="number" step="any" class="inp-tbl o3-input" data-col="padi-1" oninput="calcLuas03O(${idx})"></td>
                <td class="td-base"><input type="number" step="any" class="inp-tbl o3-input" data-col="padi-2" oninput="calcLuas03O(${idx})"></td>
                <td class="td-base"><input type="number" step="any" class="inp-tbl o3-input" data-col="padi-3" oninput="calcLuas03O(${idx})"></td>

                <td class="td-base"><input type="number" step="any" class="inp-tbl o3-input" data-col="palawija-1" oninput="calcLuas03O(${idx})"></td>
                <td class="td-base"><input type="number" step="any" class="inp-tbl o3-input" data-col="palawija-2" oninput="calcLuas03O(${idx})"></td>
                <td class="td-base"><input type="number" step="any" class="inp-tbl o3-input" data-col="palawija-3" oninput="calcLuas03O(${idx})"></td>

                <td class="td-base"><input type="number" step="any" class="inp-tbl o3-input" data-col="tebu-ada" oninput="calcLuas03O(${idx})"></td>
                <td class="td-base"><input type="number" step="any" class="inp-tbl o3-input" data-col="tebu-yad" oninput="calcLuas03O(${idx})"></td>

                <td class="td-base"><input type="number" step="any" class="inp-tbl o3-input" data-col="lain-1" oninput="calcLuas03O(${idx})"></td>
                <td class="td-base"><input type="number" step="any" class="inp-tbl o3-input" data-col="lain-2" oninput="calcLuas03O(${idx})"></td>
                <td class="td-base"><input type="number" step="any" class="inp-tbl o3-input" data-col="lain-3" oninput="calcLuas03O(${idx})"></td>

                <td class="td-base"><input type="text" readonly class="inp-tbl-calc bg-indigo-50 text-indigo-700 font-bold" data-col="jumlah"></td>

                <td class="td-base"><input type="text" class="inp-tbl o3-input" data-col="golongan"></td>
                <td class="p-1 border-r"><input type="date" class="w-full text-xs p-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 outline-none o3-input" style="min-width: 110px;" data-col="tgl-mulai"></td>
                <td class="p-1"><input type="date" class="w-full text-xs p-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 outline-none o3-input" style="min-width: 110px;" data-col="tgl-selesai"></td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
    renderSavedList03O();
}

function calcLuas03O(idx) {
    const row = document.querySelector(`#o3-tbody tr[data-idx="${idx}"]`);
    if (!row) return;

    let total = 0;
    const numberCols = ['padi-1', 'padi-2', 'padi-3', 'palawija-1', 'palawija-2', 'palawija-3', 'tebu-ada', 'tebu-yad', 'lain-1', 'lain-2', 'lain-3'];

    numberCols.forEach(col => {
        const val = parseFloat(row.querySelector(`input[data-col="${col}"]`).value);
        if (!isNaN(val)) total += val;
    });

    const jumlahInput = row.querySelector(`input[data-col="jumlah"]`);
    if (jumlahInput) jumlahInput.value = total > 0 ? total.toFixed(2) : "";
}

async function saveForm03O() {
    const periodeStr = document.getElementById('o3-periodeText').innerText;
    if (!periodeStr || periodeStr === "-") return showFormAlert('o3', "Periode tidak valid. Harap isi 01-O terlebih dahulu.", "error");

    const rows = document.querySelectorAll('#o3-tbody tr[data-idx]');
    if (rows.length === 0) return showFormAlert('o3', "Tidak ada data untuk disimpan.", "error");

    const reportData = { periode: periodeStr, data: {} };
    
    rows.forEach(row => {
        const bendung = row.getAttribute('data-bendung');
        reportData.data[bendung] = {};
        
        row.querySelectorAll('.o3-input, input[data-col="jumlah"]').forEach(input => {
            reportData.data[bendung][input.getAttribute('data-col')] = input.value;
        });
    });

    const savedData = getLS('03O_' + currentDI);
    savedData[periodeStr] = withReportTimestamps(reportData, savedData[periodeStr]);
    setLS('03O_' + currentDI, savedData);

    let onlineSaved = false;
    try {
        onlineSaved = await saveLaporanOnline('03-O', savedData[periodeStr], {
            kategori: 'operasi',
            key_laporan: periodeStr,
            periode: periodeStr
        });
    } catch (err) {
        console.error('Gagal simpan 03-O ke Supabase:', err);
    }

    renderSavedList03O(); 
    
    // ðŸ‘‡ FITUR PEMBERSIHAN OTOMATIS
    resetFormInputs03O();
    
    showOperationSaveAlert('o3', `Formulir 03-O untuk periode <strong>${periodeStr}</strong> berhasil disimpan${onlineSaved ? ' ke Supabase' : ' lokal'}.`, onlineSaved ? 'success' : 'warning', periodeStr);
    setTimeout(() => hideFormAlert('o3'), 4000);
}

// ==========================================================
// FUNGSI BARU: Sapu Bersih Tabel 03-O
// ==========================================================
function resetFormInputs03O() {
    const inputs = document.querySelectorAll('#o3-tbody .o3-input, #o3-tbody input[data-col="jumlah"]');
    inputs.forEach(input => {
        input.value = "";
    });
    hideFormAlert('o3');
}

function fillForm03O(data) {
    const rows = document.querySelectorAll('#o3-tbody tr[data-idx]');
    rows.forEach(row => {
        const bendung = row.getAttribute('data-bendung');
        if (data[bendung]) {
            row.querySelectorAll('.o3-input, input[data-col="jumlah"]').forEach(input => {
                const col = input.getAttribute('data-col');
                if (data[bendung][col] !== undefined) input.value = data[bendung][col];
            });
        }
    });
}

// ==========================================================
// REVISI: Fungsi Edit 03-O (Membangkitkan Ulang Tabel)
// ==========================================================
function edit03O(periode) {
    const savedData = getLS('03O_' + currentDI);
    
    if(savedData[periode]) {
        // 1. Dapatkan referensi data yang diperlukan untuk merender tabel
        const pData = getProfilData(currentDI);
        const o1Data = getLS('01O_' + currentDI);
        const validBendungs = pData.bendungs ? pData.bendungs.filter(b => b.nama.trim() !== "") : [];
        const tbody = document.getElementById('o3-tbody');
        
        let html = '';
        let no = 1;

        // 2. Bangkitkan ulang (Render) kerangka tabel input secara paksa
        validBendungs.forEach((b, idx) => {
            if (!o1Data[b.nama]) return; 

            let luasSawah = 0;
            if (b.rincian) b.rincian.forEach(r => luasSawah += (parseFloat(r.luasFungsional) || 0));

            html += `
                <tr class="border-b hover:bg-slate-50 text-center bg-white" data-idx="${idx}" data-bendung="${b.nama}">
                    <td class="td-base font-bold text-slate-500">${no++}</td>
                    <td class="td-base text-left font-bold text-slate-800">${currentDI}</td>
                    <td class="td-base text-left font-bold text-slate-800">${b.nama}</td>
                    <td class="td-base font-bold text-emerald-600 bg-emerald-50/30">${luasSawah > 0 ? luasSawah.toFixed(2) : '-'}</td>

                    <td class="td-base"><input type="number" step="any" class="inp-tbl o3-input" data-col="padi-1" oninput="calcLuas03O(${idx})"></td>
                    <td class="td-base"><input type="number" step="any" class="inp-tbl o3-input" data-col="padi-2" oninput="calcLuas03O(${idx})"></td>
                    <td class="td-base"><input type="number" step="any" class="inp-tbl o3-input" data-col="padi-3" oninput="calcLuas03O(${idx})"></td>

                    <td class="td-base"><input type="number" step="any" class="inp-tbl o3-input" data-col="palawija-1" oninput="calcLuas03O(${idx})"></td>
                    <td class="td-base"><input type="number" step="any" class="inp-tbl o3-input" data-col="palawija-2" oninput="calcLuas03O(${idx})"></td>
                    <td class="td-base"><input type="number" step="any" class="inp-tbl o3-input" data-col="palawija-3" oninput="calcLuas03O(${idx})"></td>

                    <td class="td-base"><input type="number" step="any" class="inp-tbl o3-input" data-col="tebu-ada" oninput="calcLuas03O(${idx})"></td>
                    <td class="td-base"><input type="number" step="any" class="inp-tbl o3-input" data-col="tebu-yad" oninput="calcLuas03O(${idx})"></td>

                    <td class="td-base"><input type="number" step="any" class="inp-tbl o3-input" data-col="lain-1" oninput="calcLuas03O(${idx})"></td>
                    <td class="td-base"><input type="number" step="any" class="inp-tbl o3-input" data-col="lain-2" oninput="calcLuas03O(${idx})"></td>
                    <td class="td-base"><input type="number" step="any" class="inp-tbl o3-input" data-col="lain-3" oninput="calcLuas03O(${idx})"></td>

                    <td class="td-base"><input type="text" readonly class="inp-tbl-calc bg-indigo-50 text-indigo-700 font-bold" data-col="jumlah"></td>

                    <td class="td-base"><input type="text" class="inp-tbl o3-input" data-col="golongan"></td>
                    <td class="p-1 border-r"><input type="date" class="w-full text-xs p-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 outline-none o3-input" style="min-width: 110px;" data-col="tgl-mulai"></td>
                    <td class="p-1"><input type="date" class="w-full text-xs p-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 outline-none o3-input" style="min-width: 110px;" data-col="tgl-selesai"></td>
                </tr>
            `;
        });
        
        // Ganti Panel Instruksi dengan tabel yang baru dibangkitkan
        tbody.innerHTML = html;

        // 3. Setelah tabel muncul, barulah isi dengan data dari brankas
        fillForm03O(savedData[periode].data);
        
        // 4. Gulir ke atas dan tampilkan notifikasi
        document.getElementById('view-blanko-operasi').scrollIntoView({behavior: 'smooth'});
        showFormAlert('o3', `Menampilkan kembali data Keputusan Komisi Irigasi untuk periode <strong>${periode}</strong>`, 'info');
    }
}

// --- RENDER DAFTAR TERSIMPAN 03-O (MENGGUNAKAN DESAIN 06-O TEMA INDIGO) ---
function renderSavedList03O() {
    const savedData = getLS('03O_' + currentDI);
    const container = document.getElementById('o3-saved-list'); 
    if(!container) return;

    const allKeys = Object.keys(savedData).sort().reverse();
    const keys = filterOperationSavedKeys('03-O', allKeys, savedData);

    if (allKeys.length === 0) {
        container.innerHTML = `<p class="col-span-full text-center text-slate-400 italic py-8 border border-dashed rounded-xl bg-slate-50">Belum ada Laporan Keputusan Komisi Irigasi (03-O) yang tersimpan.</p>`;
        return;
    }
    if (keys.length === 0) return renderNoActiveOperasiMessage(container, 'Laporan Keputusan Komisi Irigasi (03-O)');

    container.innerHTML = keys.map(k => {
        const d = savedData[k];
        const bendungCount = d.data ? Object.keys(d.data).length : 0;
        return `<div class="bg-white p-4 border rounded-xl shadow-sm hover:shadow-md transition-all">
            <div class="flex items-start gap-3 mb-4">
                <div class="bg-indigo-100 text-indigo-600 p-2 rounded-lg"><i data-lucide="gavel" class="w-5 h-5"></i></div>
                <div>
                    <h4 class="font-bold text-slate-800 text-sm truncate w-40" title="${k}">Periode: ${k}</h4>
                    <p class="text-[10px] text-slate-500 font-medium">${bendungCount} Bendung Terhubung</p>
                </div>
            </div>
            <button onclick="edit03O('${k}')" class="w-full bg-indigo-50 text-indigo-700 py-2 rounded-lg font-bold text-xs">Lihat / Edit</button>
        </div>`;
    }).join('');
    
    if(typeof initIcons === 'function') initIcons();
}

// ====================================================================
// --- SISTEM LOGIKA FORMULIR 04-O ---
// ====================================================================

function render04O() {
    const pData = getProfilData(currentDI);
    
    // 1. Info Header
    ['di','kodeDI','pengamat','kabupaten'].forEach(id => {
        document.getElementById('o4-' + id).innerText = (id === 'di') ? currentDI : (pData[id] || "-");
    });
    
    let totalLuasDI = 0;
    const validBendungs = pData.bendungs ? pData.bendungs.filter(b => b.nama.trim() !== "") : [];
    validBendungs.forEach(b => { if (b.rincian) b.rincian.forEach(r => totalLuasDI += (parseFloat(r.luasFungsional) || 0)); });
    document.getElementById('o4-totalLuasDI').innerText = totalLuasDI > 0 ? totalLuasDI.toFixed(2) + ' Ha' : "0 Ha";

    // 2. Dropdown Bendung
    const selBendung = document.getElementById('o4-bendung-select');
    const currentVal = selBendung.value;
    selBendung.innerHTML = '<option value="">-- Pilih Bendung --</option>' + validBendungs.map(b => `<option value="${b.nama}">${b.nama}</option>`).join('');
    if (validBendungs.find(b => b.nama === currentVal)) selBendung.value = currentVal;

    // 3. Reset Dropdown Periode (Akan dibangkitkan oleh onChangeFilter04O)
    document.getElementById('o4-periode-air').innerHTML = '<option value="">-- Pilih MT Terlebih Dahulu --</option>';

    // Bersihkan MT jika kosong
    if (!document.getElementById('o4-mt-select').value) {
        document.getElementById('o4-periodeMT').innerText = "-";
        resetInputs04O(false);
    } else {
        onChangeFilter04O();
    }

    renderSavedList04O();
    syncOperasiFormFromSupabase('04O', '04-O', renderSavedList04O);
}

function onChangeFilter04O() {
    hideFormAlert('o4');
    const bendungNama = document.getElementById('o4-bendung-select').value;
    const mt = document.getElementById('o4-mt-select').value;
    const selPeriode = document.getElementById('o4-periode-air');
    const currentPeriodeVal = selPeriode.value; // Simpan memori pilihan saat ini
    
    // A. Update Luas Sawah Irigasi
    let luasSawah = 0;
    if (bendungNama) {
        const pData = getProfilData(currentDI);
        const bendung = pData.bendungs.find(b => b.nama === bendungNama);
        if (bendung && bendung.rincian) bendung.rincian.forEach(r => luasSawah += (parseFloat(r.luasFungsional) || 0));
    }
    document.getElementById('o4-luasBendung').innerText = luasSawah > 0 ? luasSawah.toFixed(2) : "0";

    // B. Update Target Rencana & Generator Periode
    ['padi', 'tebu-muda', 'tebu-tua', 'palawija', 'lain', 'jumlah'].forEach(id => document.getElementById('o4-tgt-' + id).innerText = "-");
    document.getElementById('o4-periodeMT').innerText = "-";

    if (bendungNama && mt) {
        const o1Data = getLS('01O_' + currentDI);
        if (o1Data[bendungNama]) {
            const data01 = o1Data[bendungNama];
            const propMT = mt === 'MT1' ? 'mt1' : (mt === 'MT2' ? 'mt2' : 'mt3');
            const mtString = data01[propMT] || "";
            document.getElementById('o4-periodeMT').innerText = mtString || "(Belum diatur di 01-O)";

            // =========================================================
            // GENERATOR PERIODE DINAMIS BERDASARKAN RENTANG BULAN MT
            // =========================================================
            if (mtString && mtString.includes('s/d')) {
                const parts = mtString.split('s/d').map(s => s.trim().toLowerCase());
                const monthsIndo = ['januari','februari','maret','april','mei','juni','juli','agustus','september','oktober','november','desember'];
                const monthNamesCap = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

                const parseDate = (str) => {
                    const p = str.split(' ');
                    if (p.length < 2) return null;
                    const m = monthsIndo.indexOf(p[0]);
                    const y = parseInt(p[1]);
                    if (m === -1 || isNaN(y)) return null;
                    return { abs: y * 12 + m }; // Konversi ke bulan absolut untuk hitung matematika lintas tahun
                };

                const start = parseDate(parts[0]);
                const end = parseDate(parts[1]);

                if (start && end && start.abs <= end.abs) {
                    let optHtml = '<option value="">-- Pilih Periode Pemberian Air --</option>';
                    for (let abs = start.abs; abs <= end.abs; abs++) {
                        const y = Math.floor(abs / 12);
                        const m = abs % 12;
                        const mName = monthNamesCap[m];
                        const lastDay = new Date(y, m + 1, 0).getDate();

                        const p1 = `1-15 ${mName} ${y}`;
                        const p2 = `16-${lastDay} ${mName} ${y}`;

                        optHtml += `<option value="${p1}" ${currentPeriodeVal === p1 ? 'selected' : ''}>${p1}</option>`;
                        optHtml += `<option value="${p2}" ${currentPeriodeVal === p2 ? 'selected' : ''}>${p2}</option>`;
                    }
                    selPeriode.innerHTML = optHtml;
                } else {
                    selPeriode.innerHTML = '<option value="">-- Format Tanggal MT Tidak Dikenali --</option>';
                }
            } else {
                selPeriode.innerHTML = '<option value="">-- Format Tanggal MT Tidak Valid --</option>';
            }
            // =========================================================

            const mtIdx = mt === 'MT1' ? '1' : (mt === 'MT2' ? '2' : '3');
            if (data01.table) {
                const getVal = (rowIdx) => parseFloat(data01.table[rowIdx] ? data01.table[rowIdx]['k' + mtIdx] : 0) || 0;
                
                const tPadi = getVal(0);
                const tTebuTua = getVal(1); 
                const tTebuMuda = getVal(2); 
                const tPalawija = getVal(3);
                const tLain = getVal(4);
                const sumT = tPadi + tTebuTua + tTebuMuda + tPalawija + tLain;

                document.getElementById('o4-tgt-padi').innerText = tPadi > 0 ? tPadi : "-";
                document.getElementById('o4-tgt-tebu-tua').innerText = tTebuTua > 0 ? tTebuTua : "-";
                document.getElementById('o4-tgt-tebu-muda').innerText = tTebuMuda > 0 ? tTebuMuda : "-";
                document.getElementById('o4-tgt-palawija').innerText = tPalawija > 0 ? tPalawija : "-";
                document.getElementById('o4-tgt-lain').innerText = tLain > 0 ? tLain : "-";
                document.getElementById('o4-tgt-jumlah').innerText = sumT > 0 ? sumT : "-";
            }
        } else {
            showFormAlert('o4', `Bendung ${bendungNama} belum memiliki Arsip Usulan di Formulir 01-O!`, "error");
            selPeriode.innerHTML = '<option value="">-- Pilih Bendung & MT Terlebih Dahulu --</option>';
        }
    } else {
        selPeriode.innerHTML = '<option value="">-- Pilih Bendung & MT Terlebih Dahulu --</option>';
    }

    // C. CEK DATA TERSIMPAN (FITUR AUTO-LOAD)
    const periodeAir = selPeriode.value; // Ambil value terbaru
    if (bendungNama && mt && periodeAir) {
        const key = `${bendungNama}_${mt}_${periodeAir}`;
        const savedData = getLS('04O_' + currentDI);
        
        if (savedData[key]) {
            const data = savedData[key];
            const keadaanEl = document.getElementById('o4-keadaan-air');
            if (keadaanEl) keadaanEl.value = data.keadaanAir || "";

            document.querySelectorAll('.o4-usul').forEach((inp, idx) => inp.value = data.usul[idx] || "");
            document.querySelectorAll('.o4-real').forEach((inp, idx) => inp.value = data.real[idx] || "");
            document.querySelectorAll('.o4-rusak').forEach(inp => inp.value = data.rusak[inp.getAttribute('data-id')] || "");
            
            showFormAlert('o4', `Data untuk <strong>${periodeAir}</strong> sudah ada dan berhasil dimuat.`, 'info');
        } else {
            document.querySelectorAll('.o4-usul, .o4-real, .o4-rusak').forEach(inp => inp.value = "");
            const keadaanEl = document.getElementById('o4-keadaan-air');
            if (keadaanEl) keadaanEl.value = "";
        }

        fillUsulan04OFromSub(bendungNama, mt, periodeAir, true);
    } else {
        document.querySelectorAll('.o4-usul, .o4-real, .o4-rusak').forEach(inp => inp.value = "");
        const keadaanEl = document.getElementById('o4-keadaan-air');
        if (keadaanEl) keadaanEl.value = "";
    }
    
    calc04O(); 
}

function calc04O() {
    const luasStr = document.getElementById('o4-luasBendung').innerText;
    const luasSawah = parseFloat(luasStr) || 0;

    // Hitung Usulan
    let sumUsul = 0;
    document.querySelectorAll('.o4-usul').forEach(inp => {
        sumUsul += (parseFloat(inp.value) || 0);
    });
    
    // Bero usulan adalah sisa luas fungsional
    let beroUsul = luasSawah - sumUsul;
    document.getElementById('o4-usul-bero').value = luasSawah > 0 ? (beroUsul < 0 ? 0 : beroUsul.toFixed(2)) : "";
    document.getElementById('o4-usul-jumlah').value = luasSawah > 0 ? luasSawah.toFixed(2) : "";

    syncRealisasi04OFromUsulan();

    // Hitung Realisasi
    let sumReal = 0;
    document.querySelectorAll('.o4-real').forEach(inp => {
        sumReal += (parseFloat(inp.value) || 0);
    });
    
    let beroReal = luasSawah - sumReal;
    document.getElementById('o4-real-bero').value = luasSawah > 0 ? (beroReal < 0 ? 0 : beroReal.toFixed(2)) : "";
    document.getElementById('o4-real-jumlah').value = luasSawah > 0 ? luasSawah.toFixed(2) : "";
}

function syncRealisasi04OFromUsulan() {
    const usulInputs = Array.from(document.querySelectorAll('.o4-usul'));
    const realInputs = Array.from(document.querySelectorAll('.o4-real'));
    if (usulInputs.length < 11 || realInputs.length < 6) return;

    const val = (idx) => parseFloat(usulInputs[idx]?.value) || 0;
    const setReal = (idx, value) => {
        if (realInputs[idx]) realInputs[idx].value = value > 0 ? value.toFixed(2) : "";
    };

    setReal(0, val(0) + val(1) + val(2) + val(3)); // Padi
    setReal(1, val(4) + val(5)); // Tebu Muda: Pengolahan Tanah + Persemaian + Tebu Muda
    setReal(2, val(6)); // Tebu Tua
    setReal(3, val(7) + val(8)); // Palawija
    setReal(4, val(9)); // Gadu Tidak Izin
    setReal(5, val(10)); // Lain-lain
}

function fillUsulan04OFromSub(bendung, mt, periodeAir, showInfo = false) {
    if (!bendung || !mt || !periodeAir) return false;

    const subData = getLS('04Oa_' + currentDI) || {};
    const key = `${bendung}_${mt}_${periodeAir}`;
    const reportSub = subData[key];
    if (!reportSub || !reportSub.petak) return false;

    const rowOrder = ['p_olah', 'p_tumbuh', 'p_masak', 'p_panen', 't_olah', 't_muda', 't_tua', 'pal_banyak', 'pal_sedikit', 'gadu', 'lain'];
    const totals = {};
    rowOrder.forEach(rowId => totals[rowId] = 0);

    Object.values(reportSub.petak).forEach(petak => {
        const luas = petak?.luas || {};
        rowOrder.forEach(rowId => {
            totals[rowId] += parseFloat(luas[rowId]) || 0;
        });
    });

    const inputsUsul = document.querySelectorAll('.o4-usul');
    rowOrder.forEach((rowId, idx) => {
        const inp = inputsUsul[idx];
        if (inp) inp.value = totals[rowId] > 0 ? totals[rowId].toFixed(2) : "";
    });

    if (showInfo) {
        showFormAlert('o4', `Tabel Usulan Luas Tanam berhasil diisi otomatis dari 04-O Sub.`, 'info');
    }
    return true;
}

// --- SIMPAN FORM 04-O (VERSI RESET TOTAL) ---
async function saveForm04O() {
    const bendung = document.getElementById('o4-bendung-select').value;
    const mt = document.getElementById('o4-mt-select').value;
    const periodeAir = document.getElementById('o4-periode-air').value;

    if (!bendung || !mt || !periodeAir) {
        return showFormAlert('o4', "Harap isi Bendung, Masa Tanam, dan Periode Pemberian Air terlebih dahulu!", "error");
    }

    const key = `${bendung}_${mt}_${periodeAir}`;
    const reportData = {
        bendung: bendung, mt: mt, periode: periodeAir, periodeUtama: findOperasiPeriodByMtAndBendung(mt, bendung),
        usul: {}, real: {}, rusak: {}, 
        keadaanAir: document.getElementById('o4-keadaan-air').value
    };

    // Ambil Usulan
    const inputsUsul = document.querySelectorAll('.o4-usul');
    inputsUsul.forEach((inp, idx) => reportData.usul[idx] = inp.value);

    // Ambil Realisasi
    const inputsReal = document.querySelectorAll('.o4-real');
    inputsReal.forEach((inp, idx) => reportData.real[idx] = inp.value);

    // Ambil Kerusakan
    document.querySelectorAll('.o4-rusak').forEach(inp => reportData.rusak[inp.getAttribute('data-id')] = inp.value);

    // Simpan ke Local Storage
    const savedData = getLS('04O_' + currentDI);
    savedData[key] = withReportTimestamps(reportData, savedData[key]);
    setLS('04O_' + currentDI, savedData);

    let onlineSaved = false;
    try {
        onlineSaved = await saveLaporanOnline('04-O', savedData[key], {
            kategori: 'operasi',
            key_laporan: key,
            bendung,
            mt,
            periode: periodeAir
        });
    } catch (err) {
        console.error('Gagal simpan 04-O ke Supabase:', err);
    }

    renderSavedList04O();
    
    // ðŸ‘‡ RESET TOTAL: Parameter "false" akan menyapu bersih tabel sekaligus semua Dropdown!
    resetInputs04O(false); 
    
    showOperationSaveAlert('o4', `Laporan 04-O berhasil disimpan${onlineSaved ? ' ke Supabase' : ' lokal'}.`, onlineSaved ? 'success' : 'warning', reportData.periodeUtama || '');
    setTimeout(() => hideFormAlert('o4'), 4000);
}

function edit04O(key) {
    const savedData = getLS('04O_' + currentDI);
    const data = savedData[key];
    if(!data) return;

    // Set Bendung & MT
    document.getElementById('o4-bendung-select').value = data.bendung;
    document.getElementById('o4-mt-select').value = data.mt;
    
    // ðŸ‘‰ TRIGGER 1: Bangkitkan Dropdown Periode berdasarkan MT yang dipilih
    onChangeFilter04O(); 

    // Setelah Dropdown muncul, barulah kita bisa pasang nilai periodenya
    document.getElementById('o4-periode-air').value = data.periode; 
    
    // ðŸ‘‰ TRIGGER 2: Jalankan filter lagi untuk meload angka-angka inputnya
    onChangeFilter04O(); 

    // Pastikan angka benar-benar ter-load dengan aman (override manual)
    document.getElementById('o4-keadaan-air').value = data.keadaanAir || "";
    const inputsUsul = document.querySelectorAll('.o4-usul');
    inputsUsul.forEach((inp, idx) => inp.value = data.usul[idx] || "");
    const inputsReal = document.querySelectorAll('.o4-real');
    inputsReal.forEach((inp, idx) => inp.value = data.real[idx] || "");
    document.querySelectorAll('.o4-rusak').forEach(inp => {
        const id = inp.getAttribute('data-id');
        inp.value = data.rusak[id] || "";
    });

    calc04O(); 
    
    document.getElementById('tabContent-04O').scrollIntoView({behavior: 'smooth'});
    showFormAlert('o4', `Menampilkan data 04-O: <strong>${key}</strong>`, 'info');
}

function resetInputs04O(keepDropdowns = false) {
    if (!keepDropdowns) {
        document.getElementById('o4-bendung-select').value = "";
        document.getElementById('o4-mt-select').value = "";
        document.getElementById('o4-periode-air').value = "";
        onChangeFilter04O();
    }
    document.querySelectorAll('.o4-usul, .o4-real, .o4-rusak').forEach(inp => inp.value = "");
    document.getElementById('o4-keadaan-air').value = "";
    calc04O();
}

// FUNGSI KHUSUS RENDER DAFTAR TERSIMPAN 04-O
// --- RENDER DAFTAR TERSIMPAN 04-O (MENGGUNAKAN DESAIN 06-O TEMA BLUE) ---
function renderSavedList04O() {
    const savedData = getLS('04O_' + currentDI);
    const container = document.getElementById('o4-saved-list');
    if(!container) return;
    
    const allKeys = Object.keys(savedData).sort();
    const keys = filterOperationSavedKeys('04-O', allKeys, savedData);

    if (allKeys.length === 0) {
        container.innerHTML = `<p class="col-span-full text-center text-slate-400 italic py-8 border border-dashed rounded-xl bg-slate-50">Belum ada Laporan 04-O tersimpan.</p>`;
        return;
    }
    if (keys.length === 0) return renderNoActiveOperasiMessage(container, 'Laporan 04-O');

    container.innerHTML = keys.map(k => {
        const rep = savedData[k];
        return `<div class="bg-white p-4 border rounded-xl shadow-sm hover:shadow-md transition-all">
            <div class="flex items-start gap-3 mb-4">
                <div class="bg-blue-100 text-blue-600 p-2 rounded-lg"><i data-lucide="file-spreadsheet" class="w-5 h-5"></i></div>
                <div>
                    <h4 class="font-bold text-slate-800 text-sm truncate w-40" title="${rep.bendung}">${rep.bendung}</h4>
                    <p class="text-[10px] text-slate-500 font-medium">${rep.mt || '-'} - ${rep.periode || '-'}</p>
                </div>
            </div>
            <button onclick="edit04O('${k}')" class="w-full bg-blue-50 text-blue-700 py-2 rounded-lg font-bold text-xs">Lihat / Edit</button>
        </div>`;
    }).join('');
    
    if (typeof initIcons === 'function') initIcons();
}

// ====================================================================
// --- FORMULIR 04-O SUB : RINCIAN LUAS TANAM PER PETAK TERSIER ---
// ====================================================================

const rows04OSub = [
    { type: 'group', no: '1.', title: 'Padi Rendeng/Padi Gadu Izin' },
    { id: 'p_olah', no: 'a).', title: 'Pengolahan tanah' },
    { id: 'p_tumbuh', no: 'b).', title: 'Pertumbuhan' },
    { id: 'p_masak', no: 'c).', title: 'Pemasakan' },
    { id: 'p_panen', no: 'd).', title: 'Panen' },
    { type: 'group', no: '2.', title: 'Tebu' },
    { id: 't_olah', no: 'a).', title: 'Pengolahan tanah' },
    { id: 't_muda', no: 'b).', title: 'Tebu Muda (MT.1)' },
    { id: 't_tua', no: 'c).', title: 'Tebu Tua (MT.2)' },
    { type: 'group', no: '3.', title: 'Palawija' },
    { id: 'pal_banyak', no: 'a).', title: 'Yang perlu banyak air' },
    { id: 'pal_sedikit', no: 'b).', title: 'Yang perlu sedikit air' },
    { type: 'divider' },
    { id: 'gadu', no: '4.', title: 'Gadu tanpa izin', bold: true },
    { type: 'divider' },
    { id: 'lain', no: '5.', title: 'Lain-lain', bold: true },
    { type: 'divider' },
    { id: 'jml_sawah', no: '6.', title: 'Jumlah di Sawah (ha)', isTotal: true, color: 'bg-blue-50 text-blue-900 font-bold' }
];

const dataRows04OSub = rows04OSub.filter(r => r.id && !r.isTotal).map(r => r.id);

function render04Oa() {
    const pData = getProfilData(currentDI);
    ['di','kodeDI','pengamat','kabupaten'].forEach(id => {
        const el = document.getElementById('o4a-' + id);
        if (el) el.innerText = (id === 'di') ? currentDI : (pData[id] || "-");
    });

    let totalLuasDI = 0;
    const validBendungs = pData.bendungs ? pData.bendungs.filter(b => b.nama.trim() !== "") : [];
    validBendungs.forEach(b => { if (b.rincian) b.rincian.forEach(r => totalLuasDI += (parseFloat(r.luasFungsional) || 0)); });
    const totalEl = document.getElementById('o4a-totalLuasDI');
    if (totalEl) totalEl.innerText = totalLuasDI > 0 ? totalLuasDI.toFixed(2) + ' Ha' : "0 Ha";

    const selBendung = document.getElementById('o4a-bendung-select');
    if (!selBendung) return;
    const currVal = selBendung.value;
    selBendung.innerHTML = '<option value="">-- Pilih Bendung --</option>' + validBendungs.map(b => `<option value="${b.nama}">${b.nama}</option>`).join('');
    if (validBendungs.find(b => b.nama === currVal)) selBendung.value = currVal;

    document.getElementById('o4a-periode-air').innerHTML = '<option value="">-- Pilih MT Terlebih Dahulu --</option>';
    if (!document.getElementById('o4a-mt-select').value) {
        document.getElementById('o4a-periodeMT').innerText = "-";
        resetInputs04Oa(false);
    } else {
        onChangeFilter04Oa();
    }

    renderSavedList04Oa();
    syncOperasiFormFromSupabase('04Oa', '04Oa', renderSavedList04Oa);
}

function buildHalfMonthlyOptions04Oa(mtString, currentPeriodeVal) {
    if (!mtString || !mtString.includes('s/d')) return '<option value="">-- Format Tanggal MT Tidak Valid --</option>';

    const parts = mtString.split('s/d').map(s => s.trim().toLowerCase());
    const monthsIndo = ['januari','februari','maret','april','mei','juni','juli','agustus','september','oktober','november','desember'];
    const monthNamesCap = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
    const parseDate = (str) => {
        const p = str.split(' ');
        if (p.length < 2) return null;
        const m = monthsIndo.indexOf(p[0]);
        const y = parseInt(p[1]);
        if (m === -1 || isNaN(y)) return null;
        return { abs: y * 12 + m };
    };

    const start = parseDate(parts[0]);
    const end = parseDate(parts[1]);
    if (!start || !end || start.abs > end.abs) return '<option value="">-- Format Tanggal MT Tidak Dikenali --</option>';

    let optHtml = '<option value="">-- Pilih Periode Pemberian Air --</option>';
    for (let abs = start.abs; abs <= end.abs; abs++) {
        const y = Math.floor(abs / 12);
        const m = abs % 12;
        const mName = monthNamesCap[m];
        const lastDay = new Date(y, m + 1, 0).getDate();
        const p1 = `1-15 ${mName} ${y}`;
        const p2 = `16-${lastDay} ${mName} ${y}`;
        optHtml += `<option value="${p1}" ${currentPeriodeVal === p1 ? 'selected' : ''}>${p1}</option>`;
        optHtml += `<option value="${p2}" ${currentPeriodeVal === p2 ? 'selected' : ''}>${p2}</option>`;
    }
    return optHtml;
}

function onChangeFilter04Oa() {
    hideFormAlert('o4a');
    const bendungNama = document.getElementById('o4a-bendung-select').value;
    const mt = document.getElementById('o4a-mt-select').value;
    const selPeriode = document.getElementById('o4a-periode-air');
    const currentPeriodeVal = selPeriode.value;
    const thead = document.getElementById('o4a-thead');
    const tbody = document.getElementById('o4a-tbody');

    document.getElementById('o4a-periodeMT').innerText = "-";
    if (bendungNama && mt) {
        const o1Data = getLS('01O_' + currentDI);
        if (o1Data[bendungNama]) {
            const propMT = mt === 'MT1' ? 'mt1' : (mt === 'MT2' ? 'mt2' : 'mt3');
            const mtString = o1Data[bendungNama][propMT] || "";
            document.getElementById('o4a-periodeMT').innerText = mtString || "(Belum diatur di 01-O)";
            selPeriode.innerHTML = buildHalfMonthlyOptions04Oa(mtString, currentPeriodeVal);
        } else {
            showFormAlert('o4a', `Bendung ${bendungNama} belum memiliki Arsip Usulan di 01-O!`, "error");
            selPeriode.innerHTML = '<option value="">-- Pilih Bendung & MT Terlebih Dahulu --</option>';
        }
    } else {
        selPeriode.innerHTML = '<option value="">-- Pilih Bendung & MT Terlebih Dahulu --</option>';
    }

    const periodeAir = selPeriode.value;
    if (!bendungNama || !mt || !periodeAir) {
        document.getElementById('o4a-luasBendung').innerText = "-";
        thead.innerHTML = "";
        tbody.innerHTML = '<tr><td class="p-8 text-center text-slate-400 italic font-medium">Harap lengkapi pilihan Bendung, MT, dan Periode Air...</td></tr>';
        return;
    }

    const pData = getProfilData(currentDI);
    const bendung = pData.bendungs ? pData.bendungs.find(b => b.nama === bendungNama) : null;
    let rincian = bendung && bendung.rincian ? bendung.rincian : [];
    if (rincian.length === 0) rincian = [{ petak: "Tersier Utama", luasFungsional: 0 }];

    let totalLuasBendung = 0;
    rincian.forEach(r => totalLuasBendung += (parseFloat(r.luasFungsional) || 0));
    document.getElementById('o4a-luasBendung').innerText = totalLuasBendung > 0 ? totalLuasBendung.toFixed(2) : "0";

    let thHtml = `<tr>
        <th class="p-2 border-r border-slate-300 align-middle w-10" rowspan="2">No.</th>
        <th class="p-2 border-r border-slate-300 align-middle min-w-[250px]" rowspan="2">Uraian / Bab</th>`;
    rincian.forEach((r, idx) => {
        const lFungsi = parseFloat(r.luasFungsional || 0).toFixed(2);
        const namaPetak = r.petak || r.nama || `Petak ${idx + 1}`;
        thHtml += `<th class="p-2 border-r border-slate-300 bg-blue-50">${namaPetak}<br><span class="font-normal text-[10px]">Luas Fungsional: ${lFungsi} ha</span></th>`;
    });
    thHtml += `<th class="p-2 border-l-2 border-slate-400 bg-slate-200 align-middle" rowspan="2">JUMLAH TOTAL<br><span class="font-normal text-[10px] text-slate-600">Luas Tanam</span></th></tr><tr class="text-[10px]">`;
    rincian.forEach(() => { thHtml += `<th class="p-1 border-r border-slate-300 bg-white">Usulan Luas<br>Tanam (ha)</th>`; });
    thHtml += `</tr>`;
    thead.innerHTML = thHtml;

    let tbHtml = '';
    rows04OSub.forEach(row => {
        if (row.type === 'group') {
            tbHtml += `<tr class="border-b border-slate-200 border-dotted"><td class="p-1.5 border-r border-slate-300 text-center font-bold text-slate-800">${row.no}</td><td class="p-1.5 border-r border-slate-300 font-bold text-slate-800">${row.title}</td>`;
            rincian.forEach(() => { tbHtml += `<td class="border-r border-slate-300 bg-slate-50/50"></td>`; });
            tbHtml += `<td class="bg-slate-100 border-l-2 border-slate-400"></td></tr>`;
        } else if (row.type === 'divider') {
            tbHtml += `<tr><td colspan="100%" class="h-[2px] bg-slate-800"></td></tr>`;
        } else {
            tbHtml += `<tr class="border-b border-slate-200 border-dotted hover:bg-slate-50">
                <td class="p-1.5 border-r border-slate-300 text-center text-xs text-slate-600 ${row.color || ''}">${row.no || ''}</td>
                <td class="p-1.5 border-r border-slate-300 text-xs ${row.bold ? 'font-bold text-slate-800' : 'text-slate-600 pl-6'} ${row.color || ''}">${row.title}</td>`;

            rincian.forEach((r, idx) => {
                if (row.isTotal) {
                    tbHtml += `<td class="p-1 border-r border-slate-300 ${row.color || ''}"><input type="text" readonly class="w-full text-center text-xs bg-transparent outline-none font-bold cursor-default" data-petak="${idx}" data-row="${row.id}"></td>`;
                } else {
                    tbHtml += `<td class="p-1 border-r border-slate-300"><input type="number" step="any" class="w-full text-center text-xs p-1 border border-slate-300 rounded outline-none focus:ring-1 focus:ring-blue-500 o4a-luas" data-petak="${idx}" data-row="${row.id}" oninput="calc04Oa()"></td>`;
                }
            });

            if (row.isTotal) {
                tbHtml += `<td class="p-1 bg-blue-100 border-l-2 border-slate-400"><input type="text" readonly class="w-full text-center text-xs bg-transparent outline-none font-bold text-blue-900 cursor-default" data-total="${row.id}"></td>`;
            } else {
                tbHtml += `<td class="p-1 bg-slate-50 border-l-2 border-slate-400"><input type="text" readonly class="w-full text-center text-xs bg-transparent outline-none font-bold text-slate-600 cursor-default" data-total="${row.id}_luas"></td>`;
            }
            tbHtml += `</tr>`;
        }
    });
    tbody.innerHTML = tbHtml;

    const key = `${bendungNama}_${mt}_${periodeAir}`;
    const savedData = getLS('04Oa_' + currentDI);
    if (savedData[key]) {
        const data = savedData[key];
        const rincianCountActual = rincian.length;
        for (let i = 0; i < rincianCountActual; i++) {
            if (data.petak && data.petak[i] && data.petak[i].luas) {
                Object.keys(data.petak[i].luas).forEach(rowId => {
                    const inp = document.querySelector(`.o4a-luas[data-petak="${i}"][data-row="${rowId}"]`);
                    if (inp) inp.value = data.petak[i].luas[rowId] || "";
                });
            }
        }
        showFormAlert('o4a', `Data untuk <strong>${periodeAir}</strong> sudah ada dan berhasil dimuat dari Arsip 04-O Sub.`, 'info');
    } else {
        document.querySelectorAll('.o4a-luas').forEach(inp => inp.value = "");
    }
    calc04Oa();
}

function calc04Oa() {
    const luasInputs = document.querySelectorAll('.o4a-luas');
    if (luasInputs.length === 0) return;

    const rincianCount = document.querySelectorAll('#o4a-thead tr:first-child th.bg-blue-50').length;
    let grandTotal = 0;

    for (let i = 0; i < rincianCount; i++) {
        let totalPetak = 0;
        dataRows04OSub.forEach(rowId => {
            totalPetak += parseFloat(document.querySelector(`input.o4a-luas[data-petak="${i}"][data-row="${rowId}"]`)?.value) || 0;
        });
        const tPetak = document.querySelector(`input[data-petak="${i}"][data-row="jml_sawah"]`);
        if (tPetak) tPetak.value = totalPetak > 0 ? totalPetak.toFixed(2) : "";
        grandTotal += totalPetak;
    }

    dataRows04OSub.forEach(rowId => {
        let rowTotal = 0;
        for (let i = 0; i < rincianCount; i++) {
            rowTotal += parseFloat(document.querySelector(`input.o4a-luas[data-petak="${i}"][data-row="${rowId}"]`)?.value) || 0;
        }
        const tRow = document.querySelector(`input[data-total="${rowId}_luas"]`);
        if (tRow) tRow.value = rowTotal > 0 ? rowTotal.toFixed(2) : "";
    });

    const tGrand = document.querySelector('input[data-total="jml_sawah"]');
    if (tGrand) tGrand.value = grandTotal > 0 ? grandTotal.toFixed(2) : "";
}

async function saveForm04Oa() {
    const bendung = document.getElementById('o4a-bendung-select').value;
    const mt = document.getElementById('o4a-mt-select').value;
    const periodeAir = document.getElementById('o4a-periode-air').value;

    if (!bendung || !mt || !periodeAir) return showFormAlert('o4a', "Harap isi Bendung, MT, dan Periode Air terlebih dahulu!", "error");

    const key = `${bendung}_${mt}_${periodeAir}`;
    const rincianCount = document.querySelectorAll('#o4a-thead tr:first-child th.bg-blue-50').length;
    const reportData = { bendung, mt, periodeAir, periodeUtama: findOperasiPeriodByMtAndBendung(mt, bendung), petak: {}, totalLuasTanam: 0 };

    let totalLuasTanam = 0;
    for (let i = 0; i < rincianCount; i++) {
        reportData.petak[i] = { luas: {} };
        dataRows04OSub.forEach(rowId => {
            const inp = document.querySelector(`.o4a-luas[data-petak="${i}"][data-row="${rowId}"]`);
            if (inp) reportData.petak[i].luas[rowId] = inp.value;
            totalLuasTanam += parseFloat(inp?.value) || 0;
        });
    }
    reportData.totalLuasTanam = totalLuasTanam;

    const savedData = getLS('04Oa_' + currentDI);
    savedData[key] = withReportTimestamps(reportData, savedData[key]);
    setLS('04Oa_' + currentDI, savedData);

    let onlineSaved = false;
    try {
        onlineSaved = await saveLaporanOnline('04Oa', savedData[key], {
            kategori: 'operasi',
            key_laporan: key,
            bendung,
            mt,
            periode: periodeAir
        });
    } catch (err) {
        console.error('Gagal simpan 04-O Sub ke Supabase:', err);
    }

    renderSavedList04Oa();
    resetInputs04Oa(false);
    showOperationSaveAlert('o4a', `Laporan 04-O Sub berhasil disimpan${onlineSaved ? ' ke Supabase' : ' lokal'}.`, onlineSaved ? 'success' : 'warning', reportData.periodeUtama || '');
}

function renderSavedList04Oa() {
    const savedData = getLS('04Oa_' + currentDI);
    const container = document.getElementById('o4a-saved-list');
    if (!container) return;

    const allKeys = Object.keys(savedData).sort().reverse();
    const keys = filterOperationSavedKeys('04-O Sub', allKeys, savedData);
    if (allKeys.length === 0) {
        container.innerHTML = `<p class="col-span-full text-center text-slate-400 italic py-8 border border-slate-200 border-dashed rounded-xl bg-slate-50">Belum ada Laporan 04-O Sub tersimpan.</p>`;
        return;
    }
    if (keys.length === 0) return renderNoActiveOperasiMessage(container, 'Laporan 04-O Sub');

    container.innerHTML = keys.map(k => {
        const rep = savedData[k];
        return `<div class="bg-white p-4 border rounded-xl shadow-sm hover:shadow-md transition-all">
            <div class="flex items-start gap-3 mb-4">
                <div class="bg-blue-100 text-blue-600 p-2 rounded-lg"><i data-lucide="grid-3x3" class="w-5 h-5"></i></div>
                <div>
                    <h4 class="font-bold text-slate-800 text-sm truncate w-40" title="${rep.bendung}">${rep.bendung}</h4>
                    <p class="text-[10px] text-slate-500 font-medium">${rep.periodeAir || '-'} &bull; ${rep.mt || '-'}</p>
                </div>
            </div>
            <button onclick="edit04Oa('${k}')" class="w-full bg-blue-50 text-blue-700 py-2 rounded-lg font-bold text-xs">Lihat / Edit</button>
        </div>`;
    }).join('');

    if (typeof initIcons === 'function') initIcons();
}

function edit04Oa(key) {
    const savedData = getLS('04Oa_' + currentDI);
    const data = savedData[key];
    if (!data) return;

    document.getElementById('o4a-bendung-select').value = data.bendung;
    document.getElementById('o4a-mt-select').value = data.mt;
    onChangeFilter04Oa();
    document.getElementById('o4a-periode-air').value = data.periodeAir;
    onChangeFilter04Oa();

    document.getElementById('subContent-04O-a').scrollIntoView({ behavior: 'smooth' });
    showFormAlert('o4a', `Menampilkan data 04-O Sub: <strong>${key}</strong>`, 'info');
}

function resetInputs04Oa(keepDropdowns = false) {
    if (!keepDropdowns) {
        const b = document.getElementById('o4a-bendung-select');
        const mt = document.getElementById('o4a-mt-select');
        const per = document.getElementById('o4a-periode-air');
        if (b) b.value = "";
        if (mt) mt.value = "";
        if (per) per.value = "";
        if (typeof onChangeFilter04Oa === 'function' && b && mt && per) onChangeFilter04Oa();
    }
    document.querySelectorAll('.o4a-luas').forEach(inp => inp.value = "");
    calc04Oa();
}

// ====================================================================
// --- FORMULIR 05-O UTAMA : REKAPITULASI OTOMATIS DARI 05-O SUB ---
// ====================================================================

// 1. Definisi Baris untuk Tabel 05-O
const baris05O = [
    { id: 'padi-olah', label: '<strong>Padi Rendeng/Padi Gadu Ijin:</strong><br><span class="pl-3 block">a. Pengolahan Tanah + Persemaian</span>' },
    { id: 'padi-tumbuh', label: '<span class="pl-3 block">b. Pertumbuhan</span>' },
    { id: 'padi-masak', label: '<span class="pl-3 block">c. Pemasakan</span>' },
    { id: 'padi-panen', label: '<span class="pl-3 block">d. Panen</span>' },
    { id: 'tebu-olah', label: '<strong>Tebu:</strong><br><span class="pl-3 block">a. Pengolahan Tanah + Persemaian</span>' },
    { id: 'tebu-muda', label: '<span class="pl-3 block">b. Tebu Muda</span>' },
    { id: 'tebu-tua', label: '<span class="pl-3 block">c. Tebu Tua</span>' },
    { id: 'pala-banyak', label: '<strong>Palawija:</strong><br><span class="pl-3 block">a. Yang perlu banyak air</span>' },
    { id: 'pala-sedikit', label: '<span class="pl-3 block">b. Yang perlu sedikit air</span>' },
    { id: 'gadu', label: '<strong>Gadu Tidak Izin</strong>' },
    { id: 'lain', label: '<strong>Lain-lain</strong>' }
];

// Mapping ID baris antara 05-O Sub (o5a) dan 05-O Utama (o5)
const mapSubToUtama = {
    'p_olah': 'padi-olah', 'p_tumbuh': 'padi-tumbuh', 'p_masak': 'padi-masak', 'p_panen': 'padi-panen',
    't_olah': 'tebu-olah', 't_muda': 'tebu-muda', 't_tua': 'tebu-tua',
    'pal_banyak': 'pala-banyak', 'pal_sedikit': 'pala-sedikit',
    'gadu': 'gadu', 'lain': 'lain'
};

function render05O() {
    const pData = getProfilData(currentDI);
    
    // Info Header
    ['di','kodeDI','pengamat','kabupaten'].forEach(id => {
        document.getElementById('o5-' + id).innerText = (id === 'di') ? currentDI : (pData[id] || "-");
    });
    
    let totalLuasDI = 0;
    if(pData.bendungs) { pData.bendungs.forEach(b => { if(b.rincian) b.rincian.forEach(r => totalLuasDI += (parseFloat(r.luasFungsional)||0)); }); }
    document.getElementById('o5-totalLuasDI').innerText = totalLuasDI > 0 ? totalLuasDI.toFixed(2) + ' Ha' : "0 Ha";

    // ðŸ‘‰ REVISI: Kosongkan Dropdown Periode (Akan dibangkitkan oleh onChangeFilter05O)
    document.getElementById('o5-periode-air').innerHTML = '<option value="">-- Pilih MT Terlebih Dahulu --</option>';

    if (!document.getElementById('o5-mt-select').value) {
        document.getElementById('o5-periodeMT').innerText = "-";
    }

    renderTable05O();
    renderSavedList05O();
    syncOperasiFormFromSupabase('05O', '05-O', renderSavedList05O);
    if (typeof render05Oa === 'function') render05Oa();
}

// --- 1. REVISI RENDER TABEL (MENGUNCI SEMUA INPUT MENJADI READ-ONLY) ---
function renderTable05O() {
    const o1Data = getLS('01O_' + currentDI);
    const validBendungs = Object.keys(o1Data).sort(); 
    const pData = getProfilData(currentDI); 

    const thead = document.getElementById('o5-thead');
    const tbody = document.getElementById('o5-tbody');

    if (validBendungs.length === 0) {
        thead.innerHTML = '';
        tbody.innerHTML = '<tr><td class="p-8 text-center text-red-500 font-medium bg-red-50 italic">Belum ada data Bendung di Arsip 01-O.</td></tr>';
        return;
    }

    let thHtml = `
        <tr>
            <th class="p-3 border-r border-b align-middle" rowspan="2" style="min-width: 250px;">Uraian</th>
            <th class="p-3 border-r border-b text-center align-middle bg-slate-50" rowspan="2" style="min-width: 100px;">Sat. Keb Air<br><span class="font-normal lowercase">(l/dt/ha)</span></th>
            ${validBendungs.map(b => {
                let luasFungsional = 0;
                const bendungData = pData.bendungs ? pData.bendungs.find(x => x.nama === b) : null;
                if (bendungData && bendungData.rincian) {
                    bendungData.rincian.forEach(r => luasFungsional += (parseFloat(r.luasFungsional) || 0));
                }
                const luasStr = luasFungsional > 0 ? luasFungsional.toFixed(2) : '-';
                return `<th class="p-3 border-r border-b text-center bg-blue-50/50" colspan="2">${b}<br><span class="font-normal text-xs text-blue-700 block mt-1">L. Fung: ${luasStr} ha</span></th>`;
            }).join('')}
        </tr>
        <tr class="bg-slate-50">
            ${validBendungs.map(() => `
                <th class="p-2 border-r text-center bg-emerald-50/30" style="min-width: 100px;">Usul Tanam<br><span class="font-normal lowercase">(ha)</span></th>
                <th class="p-2 border-r text-center bg-indigo-50/30 text-indigo-800" style="min-width: 110px;">Keb. Sawah<br><span class="font-normal lowercase">(l/dt)</span></th>
            `).join('')}
        </tr>`;
    thead.innerHTML = thHtml;

    let tbHtml = '';
    baris05O.forEach(r => {
        tbHtml += `
            <tr class="border-b hover:bg-slate-50 transition-colors">
                <td class="p-2 border-r text-slate-800 whitespace-normal leading-tight">${r.label}</td>
                <td class="p-1 border-r bg-slate-50"><input type="text" readonly class="w-full text-center text-xs p-1 border-0 bg-transparent font-bold text-slate-600 outline-none cursor-not-allowed o5-satuan" data-row="${r.id}"></td>
                ${validBendungs.map((b, bIdx) => `
                    <td class="p-1 border-r bg-emerald-50/20"><input type="text" readonly class="w-full text-center text-xs p-1 border-0 bg-transparent font-bold text-emerald-700 outline-none cursor-not-allowed o5-usul" data-row="${r.id}" data-bidx="${bIdx}"></td>
                    <td class="p-1 border-r bg-indigo-50/30"><input type="text" readonly class="w-full text-center text-xs p-1 border-0 bg-transparent font-bold text-indigo-700 outline-none cursor-not-allowed o5-keb" data-row="${r.id}" data-bidx="${bIdx}" id="o5-keb-${r.id}-${bIdx}"></td>
                `).join('')}
            </tr>`;
    });

    tbHtml += `
        <tr class="border-b bg-slate-100">
            <td class="p-3 border-r font-black text-slate-800 text-right uppercase tracking-wider" colspan="2">Jumlah Di Sawah (Otomatis)</td>
            ${validBendungs.map((b, bIdx) => `
                <td class="p-2 border-r text-center text-slate-300">-</td>
                <td class="p-1 border-r bg-indigo-100/50"><input type="text" readonly class="w-full text-center text-xs p-1 border-0 bg-transparent font-black text-indigo-800 outline-none cursor-not-allowed" id="o5-jml-sawah-${bIdx}"></td>
            `).join('')}
        </tr>
        <tr class="border-b">
            <td class="p-3 border-r font-bold text-slate-800 pl-3 text-right" colspan="2">Faktor Tersier (Otomatis dari 05-Sub)</td>
            ${validBendungs.map((b, bIdx) => `
                <td class="p-2 border-r text-center text-slate-300">-</td>
                <td class="p-1 border-r bg-slate-50"><input type="text" readonly class="w-full text-center text-xs p-1 border-0 bg-transparent font-bold text-slate-600 outline-none cursor-not-allowed o5-faktor" data-bidx="${bIdx}"></td>
            `).join('')}
        </tr>
        <tr class="bg-emerald-50/50 border-b">
            <td class="p-3 border-r font-black text-emerald-900 uppercase tracking-wider text-right" colspan="2">Keb. Air di Pintu Tersier (l/dt)</td>
            ${validBendungs.map((b, bIdx) => `
                <td class="p-2 border-r text-center text-emerald-200/50">-</td>
                <td class="p-1 border-r bg-emerald-100/50"><input type="text" readonly class="w-full text-center text-xs p-1 border-0 bg-transparent font-black text-emerald-800 outline-none cursor-not-allowed" id="o5-pintu-tersier-${bIdx}"></td>
            `).join('')}
        </tr>
        
        <!-- BARIS BARU: KERUSAKAN TANAMAN -->
        <tr class="bg-red-50/40 border-b">
            <td class="p-3 border-r font-bold text-red-900 text-right" colspan="2">Kerusakan Tanaman <span class="font-normal text-[10px]">(Dari 04-O)</span></td>
            ${validBendungs.map((b, bIdx) => `
                <td class="p-2 border-r text-center text-red-200/50">-</td>
                <td class="p-1 border-r bg-red-100/40"><input type="text" readonly class="w-full text-center text-xs p-1 border-0 bg-transparent font-bold text-red-700 outline-none cursor-not-allowed o5-rusak" data-bidx="${bIdx}"></td>
            `).join('')}
        </tr>`;
    
    tbody.innerHTML = tbHtml;
}

// --- 2. PENARIKAN DATA 05-O UTAMA (SEDOT DARI 05-SUB & 04-O) ---
function onChangeFilter05O() {
    hideFormAlert('o5');
    const mt = document.getElementById('o5-mt-select').value;
    const selPeriode = document.getElementById('o5-periode-air');
    const currentPeriodeVal = selPeriode.value; // Simpan memori pilihan saat ini
    const o1Data = getLS('01O_' + currentDI);
    const validBendungs = Object.keys(o1Data).sort();

    document.getElementById('o5-periodeMT').innerText = "-";
    
    // ðŸ‘‰ REVISI: GENERATOR PERIODE DINAMIS (Berdasarkan Bendung Pertama di D.I)
    if (mt && validBendungs.length > 0) {
        const propMT = mt === 'MT1' ? 'mt1' : (mt === 'MT2' ? 'mt2' : 'mt3');
        const mtString = o1Data[validBendungs[0]][propMT] || "";
        document.getElementById('o5-periodeMT').innerText = mtString || "(Belum diatur di 01-O)";

        if (mtString && mtString.includes('s/d')) {
            const parts = mtString.split('s/d').map(s => s.trim().toLowerCase());
            const monthsIndo = ['januari','februari','maret','april','mei','juni','juli','agustus','september','oktober','november','desember'];
            const monthNamesCap = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

            const parseDate = (str) => {
                const p = str.split(' ');
                if (p.length < 2) return null;
                const m = monthsIndo.indexOf(p[0]);
                const y = parseInt(p[1]);
                if (m === -1 || isNaN(y)) return null;
                return { abs: y * 12 + m }; 
            };

            const start = parseDate(parts[0]);
            const end = parseDate(parts[1]);

            if (start && end && start.abs <= end.abs) {
                let optHtml = '<option value="">-- Pilih Periode Pemberian Air --</option>';
                for (let abs = start.abs; abs <= end.abs; abs++) {
                    const y = Math.floor(abs / 12);
                    const m = abs % 12;
                    const mName = monthNamesCap[m];
                    const lastDay = new Date(y, m + 1, 0).getDate();

                    const p1 = `1-15 ${mName} ${y}`;
                    const p2 = `16-${lastDay} ${mName} ${y}`;

                    optHtml += `<option value="${p1}" ${currentPeriodeVal === p1 ? 'selected' : ''}>${p1}</option>`;
                    optHtml += `<option value="${p2}" ${currentPeriodeVal === p2 ? 'selected' : ''}>${p2}</option>`;
                }
                selPeriode.innerHTML = optHtml;
            } else {
                selPeriode.innerHTML = '<option value="">-- Format Tanggal MT Tidak Dikenali --</option>';
            }
        } else {
            selPeriode.innerHTML = '<option value="">-- Format Tanggal MT Tidak Valid --</option>';
        }
    } else {
        selPeriode.innerHTML = '<option value="">-- Pilih MT Terlebih Dahulu --</option>';
    }

    const periodeAir = selPeriode.value; // Ambil nilai update terbaru

    // Bersihkan semua input rekap
    document.querySelectorAll('.o5-satuan, .o5-usul, .o5-faktor, .o5-rusak').forEach(inp => inp.value = "");

    if (mt && periodeAir) {
        const subDataAll = getLS('05Oa_' + currentDI);
        const data04All = getLS('04O_' + currentDI); 
        let dataDitemukan = false;

        validBendungs.forEach((bendungNama, bIdx) => {
            const kunciGabungan = `${bendungNama}_${mt}_${periodeAir}`;
            
            // A. TARIK DATA DARI 05-O SUB (Satuan, Usulan, Faktor)
            const subRep = subDataAll[kunciGabungan];
            if (subRep) {
                dataDitemukan = true;
                if (subRep.satuan) {
                    Object.keys(mapSubToUtama).forEach(subId => {
                        const satuanInp = document.querySelector(`.o5-satuan[data-row="${mapSubToUtama[subId]}"]`);
                        if (satuanInp && !satuanInp.value && subRep.satuan[subId]) satuanInp.value = subRep.satuan[subId];
                    });
                }
                if (subRep.petak) {
                    Object.keys(mapSubToUtama).forEach(subId => {
                        let totalLuas = 0;
                        Object.keys(subRep.petak).forEach(pIdx => totalLuas += parseFloat(subRep.petak[pIdx].luas[subId] || 0));
                        const usulInp = document.querySelector(`.o5-usul[data-row="${mapSubToUtama[subId]}"][data-bidx="${bIdx}"]`);
                        if (usulInp) usulInp.value = totalLuas > 0 ? totalLuas.toFixed(2) : "";
                    });
                    const faktorInp = document.querySelector(`.o5-faktor[data-bidx="${bIdx}"]`);
                    if (faktorInp && subRep.petak[0]) faktorInp.value = subRep.petak[0].faktor || "1.20";
                }
            }

            // B. TARIK DATA KERUSAKAN DARI 04-O
            const rep04 = data04All[kunciGabungan];
            const rusakInp = document.querySelector(`.o5-rusak[data-bidx="${bIdx}"]`);
            if (rusakInp) {
                if (rep04 && rep04.rusak) {
                    let totalRusak = 0;
                    Object.values(rep04.rusak).forEach(val => totalRusak += (parseFloat(val) || 0));
                    rusakInp.value = totalRusak > 0 ? totalRusak.toFixed(2) : "";
                } else {
                    rusakInp.value = "";
                }
            }
        });

        if (dataDitemukan) showFormAlert('o5', `Data disinkronkan otomatis sesuai Laporan 05-O Sub dan 04-O.`, 'info');
    }
    calc05O();
}

function calc05O() {
    const validBendungs = Object.keys(getLS('01O_' + currentDI)).sort();
    let jmlSawah = new Array(validBendungs.length).fill(0);

    baris05O.forEach(r => {
        const satuanInp = document.querySelector(`.o5-satuan[data-row="${r.id}"]`);
        if(!satuanInp) return;
        const satuan = parseFloat(satuanInp.value) || 0;

        validBendungs.forEach((b, bIdx) => {
            const usulInp = document.querySelector(`.o5-usul[data-row="${r.id}"][data-bidx="${bIdx}"]`);
            if(!usulInp) return;
            const usul = parseFloat(usulInp.value) || 0;
            
            // Rumus Kebutuhan = Satuan x Usulan Luas
            const keb = satuan * usul;
            const kebEl = document.getElementById(`o5-keb-${r.id}-${bIdx}`);
            if(kebEl) kebEl.value = (usul > 0 || satuan > 0) ? keb.toFixed(2) : "";
            
            jmlSawah[bIdx] += keb;
        });
    });

    validBendungs.forEach((b, bIdx) => {
        const jmlEl = document.getElementById(`o5-jml-sawah-${bIdx}`);
        if(jmlEl) jmlEl.value = jmlSawah[bIdx] > 0 ? jmlSawah[bIdx].toFixed(2) : "";

        const faktorInp = document.querySelector(`.o5-faktor[data-bidx="${bIdx}"]`);
        if(!faktorInp) return;
        const faktor = parseFloat(faktorInp.value) || 0;

        // ðŸ‘‡ PERBAIKAN FATAL: Faktor dikalikan (*), bukan dijumlahkan (+)
        const totalPintu = jmlSawah[bIdx] * faktor; 
        
        const pintuEl = document.getElementById(`o5-pintu-tersier-${bIdx}`);
        if(pintuEl) pintuEl.value = totalPintu > 0 ? totalPintu.toFixed(2) : "";
    });
}

async function saveForm05O() {
    const mt = document.getElementById('o5-mt-select').value;
    const periodeAir = document.getElementById('o5-periode-air').value;

    if (!mt || !periodeAir) return showFormAlert('o5', "Harap pilih Masa Tanam dan Periode Pemberian Air!", "error");

    const validBendungs = Object.keys(getLS('01O_' + currentDI)).sort();
    const data = { mt, periodeAir, periodeUtama: findOperasiPeriodByMtAndBendung(mt), rows: {}, faktor: {} };

    baris05O.forEach(r => {
        const satuanEl = document.querySelector(`.o5-satuan[data-row="${r.id}"]`);
        data.rows[r.id] = { satuan: satuanEl ? satuanEl.value : "", usul: [] };
        
        validBendungs.forEach((b, bIdx) => {
            const usulEl = document.querySelector(`.o5-usul[data-row="${r.id}"][data-bidx="${bIdx}"]`);
            data.rows[r.id].usul[bIdx] = usulEl ? usulEl.value : "";
        });
    });

    validBendungs.forEach((b, bIdx) => {
        const faktorEl = document.querySelector(`.o5-faktor[data-bidx="${bIdx}"]`);
        data.faktor[bIdx] = faktorEl ? faktorEl.value : "";
    });

    const key = `${mt}_${periodeAir}`;
    const savedData = getLS('05O_' + currentDI);
    savedData[key] = withReportTimestamps(data, savedData[key]);
    setLS('05O_' + currentDI, savedData);

    let onlineSaved = false;
    try {
        onlineSaved = await saveLaporanOnline('05-O', savedData[key], {
            kategori: 'operasi',
            key_laporan: key,
            mt,
            periode: periodeAir
        });
    } catch (err) {
        console.error('Gagal simpan 05-O ke Supabase:', err);
    }

    renderSavedList05O();
    resetInputs05O(false); 
    
    showOperationSaveAlert('o5', `Rekapitulasi 05-O Utama berhasil disimpan${onlineSaved ? ' ke Supabase' : ' lokal'}.`, onlineSaved ? 'success' : 'warning', data.periodeUtama || '');
    setTimeout(() => hideFormAlert('o5'), 4000);
}

function renderSavedList05O() {
    const savedData = getLS('05O_' + currentDI);
    const container = document.getElementById('o5-saved-list');
    if(!container) return;
    
    const allKeys = Object.keys(savedData).sort().reverse();
    const keys = filterOperationSavedKeys('05-O', allKeys, savedData);

    if (allKeys.length === 0) {
        container.innerHTML = `<p class="col-span-full text-center text-slate-400 italic py-8 border border-dashed rounded-xl bg-slate-50">Belum ada Rekapitulasi 05-O Utama tersimpan.</p>`;
        return;
    }
    if (keys.length === 0) return renderNoActiveOperasiMessage(container, 'Rekapitulasi 05-O Utama');

    container.innerHTML = keys.map(k => {
        const rep = savedData[k];
        return `<div class="bg-white p-4 border rounded-xl shadow-sm hover:shadow-md transition-all">
            <div class="flex items-start gap-3 mb-4">
                <div class="bg-blue-100 text-blue-600 p-2 rounded-lg"><i data-lucide="layers" class="w-5 h-5"></i></div>
                <div>
                    <h4 class="font-bold text-slate-800 text-sm truncate w-40" title="${rep.periodeAir}">${rep.periodeAir}</h4>
                    <p class="text-[10px] text-slate-500 font-medium">Rekap MT: ${rep.mt || '-'}</p>
                </div>
            </div>
            <button onclick="edit05O('${k}')" class="w-full bg-blue-50 text-blue-700 py-2 rounded-lg font-bold text-xs">Lihat / Edit</button>
        </div>`;
    }).join('');
    
    if (typeof initIcons === 'function') initIcons();
}

function edit05O(key) {
    const data = getLS('05O_' + currentDI)[key];
    if(!data) return;

    document.getElementById('o5-mt-select').value = data.mt;
    
    // TRIGGER 1: Bangkitkan Dropdown Periode berdasarkan MT
    onChangeFilter05O(); 

    // Pasang nilai periode
    document.getElementById('o5-periode-air').value = data.periodeAir;
    
    // TRIGGER 2: Jalankan sedot data ulang
    onChangeFilter05O(); 
    
    document.getElementById('subContent-05O-main').scrollIntoView({behavior: 'smooth'});
    showFormAlert('o5', `Menampilkan rekapitulasi data 05-O untuk <strong>${data.periodeAir}</strong>`, 'info');
}

function resetInputs05O(keepDropdowns = false) {
    if (!keepDropdowns) {
        document.getElementById('o5-mt-select').value = "";
        document.getElementById('o5-periode-air').value = "";
        document.getElementById('o5-periodeMT').innerText = "-";
    }
    document.querySelectorAll('.o5-satuan, .o5-usul, .o5-faktor').forEach(inp => {
        inp.value = "";
        inp.classList.remove('bg-emerald-50', 'font-semibold', 'text-emerald-700');
    });
    calc05O();
    hideFormAlert('o5');
}

// ====================================================================
// --- FORMULIR 05-O SUB : RENCANA KEBUTUHAN AIR (PETAK TERSIER) ---
// ====================================================================

function render05Oa() {
    const pData = getProfilData(currentDI);
    const selBendung = document.getElementById('o5a-bendung-select');
    const validBendungs = pData.bendungs ? pData.bendungs.filter(b => b.nama.trim() !== "") : [];
    
    let optBendung = '<option value="">-- Pilih Bendung --</option>';
    validBendungs.forEach(b => optBendung += `<option value="${b.nama}">${b.nama}</option>`);
    const currVal = selBendung.value;
    selBendung.innerHTML = optBendung;
    if(currVal) selBendung.value = currVal;

    // ðŸ‘‰ REVISI: Kosongkan Dropdown Periode (Akan dibangkitkan oleh onChangeFilter05Oa)
    document.getElementById('o5a-periode-air').innerHTML = '<option value="">-- Pilih MT Terlebih Dahulu --</option>';

    if (!document.getElementById('o5a-mt-select').value) {
        document.getElementById('o5a-periodeMT').innerText = "-";
        resetInputs05Oa(false);
    } else {
        onChangeFilter05Oa();
    }

    renderSavedList05Oa();
    syncOperasiFormFromSupabase('05Oa', '05a-O', renderSavedList05Oa);
}

// --- 1. REVISI RENDER TABEL 05-O SUB ---
function onChangeFilter05Oa() {
    hideFormAlert('o5a');
    const bendungNama = document.getElementById('o5a-bendung-select').value;
    const mt = document.getElementById('o5a-mt-select').value;
    const selPeriode = document.getElementById('o5a-periode-air');
    const currentPeriodeVal = selPeriode.value; // Simpan memori pilihan saat ini
    const thead = document.getElementById('o5a-thead');
    const tbody = document.getElementById('o5a-tbody');
    
    document.getElementById('o5a-periodeMT').innerText = "-";
    
    // ðŸ‘‰ REVISI: GENERATOR PERIODE DINAMIS (Sama seperti 04-O)
    if (bendungNama && mt) {
        const o1Data = getLS('01O_' + currentDI);
        if (o1Data[bendungNama]) {
            const propMT = mt === 'MT1' ? 'mt1' : (mt === 'MT2' ? 'mt2' : 'mt3');
            const mtString = o1Data[bendungNama][propMT] || "";
            document.getElementById('o5a-periodeMT').innerText = mtString || "(Belum diatur di 01-O)";

            if (mtString && mtString.includes('s/d')) {
                const parts = mtString.split('s/d').map(s => s.trim().toLowerCase());
                const monthsIndo = ['januari','februari','maret','april','mei','juni','juli','agustus','september','oktober','november','desember'];
                const monthNamesCap = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

                const parseDate = (str) => {
                    const p = str.split(' ');
                    if (p.length < 2) return null;
                    const m = monthsIndo.indexOf(p[0]);
                    const y = parseInt(p[1]);
                    if (m === -1 || isNaN(y)) return null;
                    return { abs: y * 12 + m }; 
                };

                const start = parseDate(parts[0]);
                const end = parseDate(parts[1]);

                if (start && end && start.abs <= end.abs) {
                    let optHtml = '<option value="">-- Pilih Periode Pemberian Air --</option>';
                    for (let abs = start.abs; abs <= end.abs; abs++) {
                        const y = Math.floor(abs / 12);
                        const m = abs % 12;
                        const mName = monthNamesCap[m];
                        const lastDay = new Date(y, m + 1, 0).getDate();

                        const p1 = `1-15 ${mName} ${y}`;
                        const p2 = `16-${lastDay} ${mName} ${y}`;

                        optHtml += `<option value="${p1}" ${currentPeriodeVal === p1 ? 'selected' : ''}>${p1}</option>`;
                        optHtml += `<option value="${p2}" ${currentPeriodeVal === p2 ? 'selected' : ''}>${p2}</option>`;
                    }
                    selPeriode.innerHTML = optHtml;
                } else {
                    selPeriode.innerHTML = '<option value="">-- Format Tanggal MT Tidak Dikenali --</option>';
                }
            } else {
                selPeriode.innerHTML = '<option value="">-- Format Tanggal MT Tidak Valid --</option>';
            }
        } else {
            showFormAlert('o5a', `Bendung ${bendungNama} belum memiliki Arsip Usulan di 01-O!`, "error");
            selPeriode.innerHTML = '<option value="">-- Pilih Bendung & MT Terlebih Dahulu --</option>';
        }
    } else {
        selPeriode.innerHTML = '<option value="">-- Pilih Bendung & MT Terlebih Dahulu --</option>';
    }

    const periodeAir = selPeriode.value; // Ambil nilai update terbaru

    if (!bendungNama || !mt || !periodeAir) {
        document.getElementById('o5a-luasBendung').innerText = "-";
        thead.innerHTML = "";
        tbody.innerHTML = '<tr><td class="p-8 text-center text-slate-400 italic font-medium">Harap lengkapi pilihan Bendung, MT, dan Periode Air...</td></tr>';
        return;
    }

    const pData = getProfilData(currentDI);
    const bendung = pData.bendungs.find(b => b.nama === bendungNama);
    let rincian = bendung && bendung.rincian ? bendung.rincian : [];
    if(rincian.length === 0) rincian = [{ petak: "Tersier Utama", luasFungsional: 0 }];

    let totalLuasBendung = 0;
    rincian.forEach(r => totalLuasBendung += (parseFloat(r.luasFungsional) || 0));
    document.getElementById('o5a-luasBendung').innerText = totalLuasBendung > 0 ? totalLuasBendung.toFixed(2) : "0";

    let thHtml = `<tr>
        <th class="p-2 border-r border-slate-300 align-middle w-10" rowspan="2">No.</th>
        <th class="p-2 border-r border-slate-300 align-middle min-w-[250px]" rowspan="2">Uraian / Bab</th>
        <th class="p-2 border-r border-slate-300 bg-yellow-50 align-middle min-w-[120px]" rowspan="2">Satuan Keb.<br>Air di Sawah<br>(l/det/ha)</th>`;
    
    rincian.forEach((r, idx) => {
        const lFungsi = parseFloat(r.luasFungsional||0).toFixed(2);
        const namaPetak = r.petak || r.nama || `Petak ${idx + 1}`; 
        thHtml += `<th class="p-2 border-r border-slate-300 bg-indigo-50" colspan="2">${namaPetak}<br><span class="font-normal text-[10px]">Luas Fungsional: ${lFungsi} ha</span></th>`;
    });
    
    thHtml += `<th class="p-2 border-l-2 border-slate-400 bg-slate-200 align-middle" rowspan="2">JUMLAH TOTAL<br><span class="font-normal text-[10px] text-slate-600">Luas & Air</span></th></tr><tr class="text-[10px]">`;
    
    rincian.forEach(() => {
        thHtml += `<th class="p-1 border-r border-slate-300 bg-white">Usulan Luas<br>Tanam (ha)</th><th class="p-1 border-r border-slate-300 bg-blue-50">Keb. Air di<br>Sawah (l/det)</th>`;
    });
    thHtml += `</tr>`;
    thead.innerHTML = thHtml;

    const rows = [
        { type: 'group', no: '1.', title: 'Padi Rendeng/Padi Gadu Izin' },
        { id: 'p_olah', no: 'a).', title: 'Pengolahan tanah' },
        { id: 'p_tumbuh', no: 'b).', title: 'Pertumbuhan' },
        { id: 'p_masak', no: 'c).', title: 'Pemasakan' },
        { id: 'p_panen', no: 'd).', title: 'Panen' },
        { type: 'group', no: '2.', title: 'Tebu' },
        { id: 't_olah', no: 'a).', title: 'Pengolahan tanah' },
        { id: 't_muda', no: 'b).', title: 'Tebu Muda (MT.1)' },
        { id: 't_tua', no: 'c).', title: 'Tebu Tua (MT.2)' },
        { type: 'group', no: '3.', title: 'Palawija' },
        { id: 'pal_banyak', no: 'a).', title: 'Yang perlu banyak air' },
        { id: 'pal_sedikit', no: 'b).', title: 'Yang perlu sedikit air' },
        { type: 'divider' },
        { id: 'gadu', no: '4.', title: 'Gadu tanpa izin', bold: true },
        { type: 'divider' },
        { id: 'lain', no: '5.', title: 'Lain-lain', bold: true },
        { type: 'divider' },
        { id: 'jml_sawah', no: '6.', title: 'Jumlah di Sawah ( ha & l/det )', isTotalAir: true, color: 'bg-blue-50 text-blue-900 font-bold' },
        { type: 'divider' },
        { id: 'faktor', no: '7.', title: 'Faktor Tersier', isFactor: true },
        { type: 'divider' },
        { id: 'keb_pintu', no: '8.', title: 'Kebutuhan air di pintu tersier ( l/det )', isTotalPintu: true, color: 'bg-indigo-100 text-indigo-900 font-black' }
    ];

    let tbHtml = '';
    rows.forEach(row => {
        if (row.type === 'group') {
            tbHtml += `<tr class="border-b border-slate-200 border-dotted"><td class="p-1.5 border-r border-slate-300 text-center font-bold text-slate-800">${row.no}</td><td class="p-1.5 border-r border-slate-300 font-bold text-slate-800">${row.title}</td><td class="border-r border-slate-300 bg-slate-50/50"></td>`;
            rincian.forEach(() => { tbHtml += `<td class="border-r border-slate-300 bg-slate-50/50" colspan="2"></td>`; });
            tbHtml += `<td class="bg-slate-100 border-l-2 border-slate-400"></td></tr>`;
        } else if (row.type === 'divider') {
            tbHtml += `<tr><td colspan="100%" class="h-[2px] bg-slate-800"></td></tr>`;
        } else {
            tbHtml += `<tr class="border-b border-slate-200 border-dotted hover:bg-slate-50">
                <td class="p-1.5 border-r border-slate-300 text-center text-xs text-slate-600 ${row.color||''}">${row.no||''}</td>
                <td class="p-1.5 border-r border-slate-300 text-xs ${row.bold ? 'font-bold text-slate-800' : 'text-slate-600 pl-6'} ${row.color||''}">${row.title}</td>`;

            if (row.isTotalAir || row.isFactor || row.isTotalPintu) {
                 tbHtml += `<td class="p-1 border-r border-slate-300 bg-slate-100"></td>`;
            } else {
                 tbHtml += `<td class="p-1 border-r border-slate-300 bg-yellow-50/30"><input type="number" step="any" class="w-full text-center text-xs p-1 border border-yellow-300 rounded outline-none focus:ring-1 focus:ring-indigo-500 o5a-satuan" data-row="${row.id}" oninput="calc05Oa()"></td>`;
            }

            rincian.forEach((r, idx) => {
                if (row.isTotalAir) {
                    tbHtml += `<td class="p-1 border-r border-slate-300 bg-blue-50/50"><input type="text" readonly class="w-full text-center text-xs bg-transparent outline-none font-bold text-blue-800 cursor-default" data-petak="${idx}" data-row="${row.id}_luas_petak"></td>`;
                    tbHtml += `<td class="p-1 border-r border-slate-300 ${row.color||''}"><input type="text" readonly class="w-full text-center text-xs bg-transparent outline-none font-bold cursor-default" data-petak="${idx}" data-row="${row.id}"></td>`;
                } else if (row.isTotalPintu) {
                    tbHtml += `<td class="p-1 border-r border-slate-300 bg-slate-100"></td>`;
                    tbHtml += `<td class="p-1 border-r border-slate-300 ${row.color||''}"><input type="text" readonly class="w-full text-center text-xs bg-transparent outline-none font-bold cursor-default" data-petak="${idx}" data-row="${row.id}"></td>`;
                } else if (row.isFactor) {
                    tbHtml += `<td class="p-1 border-r border-slate-300 bg-slate-100"></td>`;
                    tbHtml += `<td class="p-1 border-r border-slate-300"><input type="number" step="any" class="w-full text-center text-xs p-1 border border-slate-300 rounded outline-none focus:ring-1 focus:ring-indigo-500 o5a-faktor" data-petak="${idx}" value="1.20" oninput="calc05Oa()"></td>`;
                } else {
                    tbHtml += `<td class="p-1 border-r border-slate-300"><input type="number" step="any" readonly class="w-full text-center text-xs p-1 border border-slate-200 rounded outline-none bg-slate-50 text-slate-700 cursor-default o5a-luas" data-petak="${idx}" data-row="${row.id}"></td>`;
                    tbHtml += `<td class="p-1 border-r border-slate-300 bg-blue-50/30"><input type="text" readonly class="w-full text-center text-xs bg-transparent outline-none text-blue-800 cursor-default" data-petak="${idx}" data-row="${row.id}_air"></td>`;
                }
            });

            if (row.isFactor) {
                 tbHtml += `<td class="p-1 bg-slate-100 border-l-2 border-slate-400"></td>`; 
            } else if (row.isTotalAir) {
                 tbHtml += `<td class="p-1 bg-blue-100 border-l-2 border-slate-400"><input type="text" readonly class="w-full text-center text-xs bg-transparent outline-none font-bold text-blue-900 cursor-default" data-total="${row.id}"></td>`; 
            } else if (row.isTotalPintu) {
                 tbHtml += `<td class="p-1 bg-indigo-100 border-l-2 border-slate-400"><input type="text" readonly class="w-full text-center text-xs bg-transparent outline-none font-black text-indigo-900 cursor-default" data-total="${row.id}"></td>`; 
            } else {
                tbHtml += `<td class="p-1 bg-slate-50 border-l-2 border-slate-400"><input type="text" readonly class="w-full text-center text-xs bg-transparent outline-none font-bold text-slate-600 cursor-default" data-total="${row.id}_luas"></td>`;
            }
            tbHtml += `</tr>`;
        }
    });
    tbody.innerHTML = tbHtml;

    // FITUR AUTO-LOAD DATA TERSIMPAN
    if (bendungNama && mt && periodeAir) {
        const key = `${bendungNama}_${mt}_${periodeAir}`;
        const savedData = getLS('05Oa_' + currentDI);
        if (savedData[key]) {
            const data = savedData[key];
            if (data.satuan) Object.keys(data.satuan).forEach(rowId => {
                const inp = document.querySelector(`.o5a-satuan[data-row="${rowId}"]`);
                if(inp) inp.value = data.satuan[rowId] || "";
            });

            const rincianCountActual = rincian.length;
            for (let i = 0; i < rincianCountActual; i++) {
                if(data.petak && data.petak[i]) {
                    if (data.petak[i].luas) Object.keys(data.petak[i].luas).forEach(rowId => {
                        const inp = document.querySelector(`.o5a-luas[data-petak="${i}"][data-row="${rowId}"]`);
                        if(inp) inp.value = data.petak[i].luas[rowId] || "";
                    });
                    const fInp = document.querySelector(`.o5a-faktor[data-petak="${i}"]`);
                    if(fInp) fInp.value = data.petak[i].faktor || "1.20";
                }
            }
            showFormAlert('o5a', `Data untuk <strong>${periodeAir}</strong> sudah ada dan berhasil dimuat dari Arsip 05-O Sub.`, 'info');
        } else {
            document.querySelectorAll('.o5a-satuan, .o5a-luas').forEach(inp => inp.value = "");
            document.querySelectorAll('.o5a-faktor').forEach(inp => inp.value = "1.20");
        }

        fillUsulan05OaFrom04Oa(bendungNama, mt, periodeAir);
    }
    calc05Oa();
}

function fillUsulan05OaFrom04Oa(bendung, mt, periodeAir) {
    if (!bendung || !mt || !periodeAir) return false;

    const sub04Data = getLS('04Oa_' + currentDI) || {};
    const key = `${bendung}_${mt}_${periodeAir}`;
    const report04Sub = sub04Data[key];
    if (!report04Sub || !report04Sub.petak) return false;

    dataRows04OSub.forEach(rowId => {
        Object.keys(report04Sub.petak).forEach(petakIdx => {
            const value = report04Sub.petak[petakIdx]?.luas?.[rowId] || "";
            const inp = document.querySelector(`.o5a-luas[data-petak="${petakIdx}"][data-row="${rowId}"]`);
            if (inp) inp.value = value;
        });
    });

    return true;
}

// --- 2. REVISI KALKULASI 05-O SUB (MENAMBAH TOTAL LUAS) ---
function calc05Oa() {
    const luasInputs = document.querySelectorAll('.o5a-luas');
    if(luasInputs.length === 0) return;

    const rincianCount = document.querySelectorAll('#o5a-thead th[colspan="2"]:not([class*="JUMLAH"])').length;
    const dataRows = ['p_olah', 'p_tumbuh', 'p_masak', 'p_panen', 't_olah', 't_muda', 't_tua', 'pal_banyak', 'pal_sedikit', 'gadu', 'lain'];

    let grandTotalSawahAir = 0;
    let grandTotalPintuAir = 0;

    for(let i=0; i<rincianCount; i++) {
        let totalAirSawahPetak = 0;
        let totalLuasSawahPetak = 0; // ðŸ‘‡ Variabel penampung luas baru
        
        dataRows.forEach(rowId => {
            const satuanVal = parseFloat(document.querySelector(`input.o5a-satuan[data-row="${rowId}"]`)?.value) || 0;
            const luasVal = parseFloat(document.querySelector(`input.o5a-luas[data-petak="${i}"][data-row="${rowId}"]`).value) || 0;
            
            totalLuasSawahPetak += luasVal; // ðŸ‘‡ Kalkulasi luas

            const airVal = luasVal * satuanVal; 
            totalAirSawahPetak += airVal;

            const airInput = document.querySelector(`input[data-petak="${i}"][data-row="${rowId}_air"]`);
            if(airInput) airInput.value = airVal > 0 ? airVal.toFixed(2) : "";
        });

        // ðŸ‘‡ Cetak hasil penjumlah luas ke input yang baru diaktifkan
        const tLuasPetak = document.querySelector(`input[data-petak="${i}"][data-row="jml_sawah_luas_petak"]`);
        if(tLuasPetak) tLuasPetak.value = totalLuasSawahPetak > 0 ? totalLuasSawahPetak.toFixed(2) : "";

        const tSawahPetak = document.querySelector(`input[data-petak="${i}"][data-row="jml_sawah"]`);
        if(tSawahPetak) tSawahPetak.value = totalAirSawahPetak > 0 ? totalAirSawahPetak.toFixed(2) : "";

        const faktor = parseFloat(document.querySelector(`input.o5a-faktor[data-petak="${i}"]`)?.value) || 0;
        const airPintu = totalAirSawahPetak * faktor;
        
        const tPintuPetak = document.querySelector(`input[data-petak="${i}"][data-row="keb_pintu"]`);
        if(tPintuPetak) tPintuPetak.value = airPintu > 0 ? airPintu.toFixed(2) : "";

        grandTotalSawahAir += totalAirSawahPetak;
        grandTotalPintuAir += airPintu;
    }

    dataRows.forEach(rowId => {
        let rowTotalLuas = 0;
        for(let i=0; i<rincianCount; i++) {
            rowTotalLuas += parseFloat(document.querySelector(`input.o5a-luas[data-petak="${i}"][data-row="${rowId}"]`)?.value) || 0;
        }
        const tLuas = document.querySelector(`input[data-total="${rowId}_luas"]`);
        if(tLuas) tLuas.value = rowTotalLuas > 0 ? rowTotalLuas.toFixed(2) : "";
    });

    const tGrandSawah = document.querySelector(`input[data-total="jml_sawah"]`);
    if(tGrandSawah) tGrandSawah.value = grandTotalSawahAir > 0 ? grandTotalSawahAir.toFixed(2) : "";

    const tGrandPintu = document.querySelector(`input[data-total="keb_pintu"]`);
    if(tGrandPintu) tGrandPintu.value = grandTotalPintuAir > 0 ? grandTotalPintuAir.toFixed(2) : "";
}

async function saveForm05Oa() {
    const bendung = document.getElementById('o5a-bendung-select').value;
    const mt = document.getElementById('o5a-mt-select').value;
    const periodeAir = document.getElementById('o5a-periode-air').value;

    if (!bendung || !mt || !periodeAir) return showFormAlert('o5a', "Harap isi Bendung, MT, dan Periode Air terlebih dahulu!", "error");

    const key = `${bendung}_${mt}_${periodeAir}`;
    const rincianCount = document.querySelectorAll('#o5a-thead th[colspan="2"]:not([class*="JUMLAH"])').length;
    const reportData = { bendung, mt, periodeAir, periodeUtama: findOperasiPeriodByMtAndBendung(mt, bendung), satuan: {}, petak: {}, totalDebitPintu: 0 };

    document.querySelectorAll('.o5a-satuan').forEach(el => reportData.satuan[el.dataset.row] = el.value);

    const dataRows = ['p_olah', 'p_tumbuh', 'p_masak', 'p_panen', 't_olah', 't_muda', 't_tua', 'pal_banyak', 'pal_sedikit', 'gadu', 'lain'];
    let totalDebitPintuCalc = 0;

    for (let i = 0; i < rincianCount; i++) {
        reportData.petak[i] = { luas: {}, faktor: "1.20", rusak: "" };
        let petakAirSawah = 0;
        
        dataRows.forEach(rowId => {
            const inp = document.querySelector(`.o5a-luas[data-petak="${i}"][data-row="${rowId}"]`);
            if(inp) reportData.petak[i].luas[rowId] = inp.value;

            const l = parseFloat(inp?.value) || 0;
            const s = parseFloat(reportData.satuan[rowId]) || 0;
            petakAirSawah += (l * s);
        });
        
        const fInp = document.querySelector(`.o5a-faktor[data-petak="${i}"]`);
        const rInp = document.querySelector(`.o5a-rusak[data-petak="${i}"]`);
        const faktorPetak = fInp ? parseFloat(fInp.value) || 0 : 1.20;
        
        reportData.petak[i].faktor = fInp ? fInp.value : "1.20";
        reportData.petak[i].rusak = rInp ? rInp.value : "";
        
        totalDebitPintuCalc += (petakAirSawah * faktorPetak);
    }

    reportData.totalDebitPintu = totalDebitPintuCalc;

    const savedData = getLS('05Oa_' + currentDI);
    savedData[key] = withReportTimestamps(reportData, savedData[key]);
    setLS('05Oa_' + currentDI, savedData);

    let onlineSaved = false;
    try {
        onlineSaved = await saveLaporanOnline('05a-O', savedData[key], {
            kategori: 'operasi',
            key_laporan: key,
            bendung,
            mt,
            periode: periodeAir
        });
    } catch (err) {
        console.error('Gagal simpan 05-O Sub ke Supabase:', err);
    }

    renderSavedList05Oa();
    
    // ðŸ‘‡ RESET TOTAL: Parameter "false" akan menyapu bersih form setelah disimpan
    resetInputs05Oa(false); 
    
    showOperationSaveAlert('o5a', `Laporan Petak Tersier berhasil disimpan${onlineSaved ? ' ke Supabase' : ' lokal'}.`, onlineSaved ? 'success' : 'warning', reportData.periodeUtama || '');
}

// --- RENDER DAFTAR TERSIMPAN 05-O SUB (TEMA INDIGO, GAYA 06-O) ---
function renderSavedList05Oa() {
    const savedData = getLS('05Oa_' + currentDI);
    const container = document.getElementById('o5a-saved-list');
    if(!container) return;
    
    const allKeys = Object.keys(savedData).sort().reverse();
    const keys = filterOperationSavedKeys('05-O Sub', allKeys, savedData);

    if (allKeys.length === 0) {
        container.innerHTML = `<p class="col-span-full text-center text-slate-400 italic py-8 border border-slate-200 border-dashed rounded-xl bg-slate-50">Belum ada Laporan 05-O (Sub) tersimpan.</p>`;
        return;
    }
    if (keys.length === 0) return renderNoActiveOperasiMessage(container, 'Laporan 05-O Sub');

    container.innerHTML = keys.map(k => {
        const rep = savedData[k];
        return `<div class="bg-white p-4 border rounded-xl shadow-sm hover:shadow-md transition-all">
            <div class="flex items-start gap-3 mb-4">
                <div class="bg-indigo-100 text-indigo-600 p-2 rounded-lg"><i data-lucide="droplets" class="w-5 h-5"></i></div>
                <div>
                    <h4 class="font-bold text-slate-800 text-sm truncate w-40" title="${rep.bendung}">${rep.bendung}</h4>
                    <p class="text-[10px] text-slate-500 font-medium">${rep.periodeAir} - ${rep.mt || '-'}</p>
                </div>
            </div>
            <button onclick="edit05Oa('${k}')" class="w-full bg-indigo-50 text-indigo-700 py-2 rounded-lg font-bold text-xs">Lihat / Edit</button>
        </div>`;
    }).join('');
    
    if (typeof initIcons === 'function') initIcons();
}

function edit05Oa(key) {
    const savedData = getLS('05Oa_' + currentDI);
    const data = savedData[key];
    if(!data) return;

    document.getElementById('o5a-bendung-select').value = data.bendung;
    document.getElementById('o5a-mt-select').value = data.mt;
    
    // TRIGGER 1: Bangkitkan Dropdown Periode berdasarkan MT
    onChangeFilter05Oa(); 

    // Pasang nilai periode
    document.getElementById('o5a-periode-air').value = data.periodeAir;
    
    // TRIGGER 2: Bangkitkan Tabel dan Eksekusi Auto-Load
    onChangeFilter05Oa(); 
    
    document.getElementById('subContent-05O-a').scrollIntoView({behavior: 'smooth'});
}

function resetInputs05Oa(keepDropdowns = false) {
    if (!keepDropdowns) {
        document.getElementById('o5a-bendung-select').value = "";
        document.getElementById('o5a-mt-select').value = "";
        document.getElementById('o5a-periode-air').value = "";
        onChangeFilter05Oa(); // Panggil agar tabel dikosongkan secara visual
    }
    document.querySelectorAll('.o5a-satuan, .o5a-luas, .o5a-rusak').forEach(inp => inp.value = "");
    document.querySelectorAll('.o5a-faktor').forEach(inp => inp.value = "1.20");
    calc05Oa();
}

// ====================================================================
// --- SISTEM LOGIKA FORMULIR 06-O ---
// ====================================================================

// --- REVISI: GENERATOR PERIODE DINAMIS BERDASARKAN SELURUH MT DI 01-O ---
function render06O() {
    const pData = getProfilData(currentDI);
    
    // 1. Info Header
    ['di','kodeDI','pengamat','kabupaten'].forEach(id => {
        document.getElementById('o6-' + id).innerText = (id === 'di') ? currentDI : (pData[id] || "-");
    });
    
    let totalLuasDI = 0;
    if(pData.bendungs) {
        pData.bendungs.forEach(b => { if(b.rincian) b.rincian.forEach(r => totalLuasDI += (parseFloat(r.luasFungsional)||0)); });
    }
    document.getElementById('o6-totalLuasDI').innerText = totalLuasDI > 0 ? totalLuasDI.toFixed(2) + ' Ha' : "0 Ha";

    // 2. Dropdown Bendung (dari 01-O)
    const o1Data = getLS('01O_' + currentDI);
    const validBendungs = Object.keys(o1Data).sort();
    const selBendung = document.getElementById('o6-bendung-select');
    const currBendung = selBendung.value;
    selBendung.innerHTML = '<option value="">-- Pilih Bendung --</option>' + validBendungs.map(b => `<option value="${b}">${b}</option>`).join('');
    if(validBendungs.includes(currBendung)) selBendung.value = currBendung;

    // 3. Generate Periode (Menggabungkan Seluruh MT dari 01-O)
    const selPeriode = document.getElementById('o6-periode-air');
    const currPer = selPeriode.value;
    let optPeriode = '<option value="">-- Pilih Periode --</option>';

    // Kita akan mengekstrak semua rentang bulan dari MT1, MT2, dan MT3 dari Bendung Pertama (sebagai acuan D.I)
    if (validBendungs.length > 0) {
        const refData = o1Data[validBendungs[0]];
        const allMTs = [refData.mt1, refData.mt2, refData.mt3].filter(Boolean);
        
        let generatedPeriods = new Set(); // Menggunakan Set agar tidak ada periode ganda (overlap)

        allMTs.forEach(mtString => {
            if (mtString && mtString.includes('s/d')) {
                const parts = mtString.split('s/d').map(s => s.trim().toLowerCase());
                const monthsIndo = ['januari','februari','maret','april','mei','juni','juli','agustus','september','oktober','november','desember'];
                const monthNamesCap = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

                const parseDate = (str) => {
                    const p = str.split(' ');
                    if (p.length < 2) return null;
                    const m = monthsIndo.indexOf(p[0]);
                    const y = parseInt(p[1]);
                    if (m === -1 || isNaN(y)) return null;
                    return { abs: y * 12 + m }; 
                };

                const start = parseDate(parts[0]);
                const end = parseDate(parts[1]);

                if (start && end && start.abs <= end.abs) {
                    for (let abs = start.abs; abs <= end.abs; abs++) {
                        const y = Math.floor(abs / 12);
                        const m = abs % 12;
                        const mName = monthNamesCap[m];
                        const lastDay = new Date(y, m + 1, 0).getDate();

                        generatedPeriods.add(`1-15 ${mName} ${y}`);
                        generatedPeriods.add(`16-${lastDay} ${mName} ${y}`);
                    }
                }
            }
        });

        // Konversi Set kembali menjadi Array dan ubah menjadi tag <option>
        Array.from(generatedPeriods).forEach(periode => {
            optPeriode += `<option value="${periode}">${periode}</option>`;
        });

        if (generatedPeriods.size === 0) {
            optPeriode = '<option value="">-- Format Tanggal 01-O Tidak Dikenali --</option>';
        }
    } else {
         optPeriode = '<option value="">-- Belum ada data di 01-O --</option>';
    }

    selPeriode.innerHTML = optPeriode;
    if(currPer) selPeriode.value = currPer;

    onChangeFilter06O();
    renderSavedList06O();
    syncOperasiFormFromSupabase('06O', '06-O', renderSavedList06O);
}

// --- REVISI: PENARIKAN DATA OTOMATIS DARI 05-O SUB ---
function onChangeFilter06O() {
    hideFormAlert('o6');
    const bendungNama = document.getElementById('o6-bendung-select').value;
    const periodeStr = document.getElementById('o6-periode-air').value;
    const thead = document.getElementById('o6-thead');
    const tbody = document.getElementById('o6-tbody');

    if (!bendungNama || !periodeStr) {
        document.getElementById('o6-luasBendung').innerText = "-";
        thead.innerHTML = '';
        tbody.innerHTML = '<tr><td class="p-8 text-center text-slate-400 italic font-medium bg-slate-50 border-b border-slate-200">Pilih Bendung dan Periode untuk memuat tabel pencatatan...</td></tr>';
        return;
    }

    // Parsing Tanggal dari Periode
    const parts = periodeStr.split(' ');
    const range = parts[0].split('-');
    const startDay = parseInt(range[0]);
    const endDay = parseInt(range[1]);
    const dayCount = endDay - startDay + 1;

    // Ambil Data Petak dari Profil
    const pData = getProfilData(currentDI);
    const bendung = pData.bendungs.find(b => b.nama === bendungNama);
    const petaks = (bendung && bendung.rincian) ? bendung.rincian.filter(r => r.petak && r.petak.trim() !== "") : [];
    
    let totalLuasBendung = 0;
    petaks.forEach(p => totalLuasBendung += (parseFloat(p.luasFungsional) || 0));
    document.getElementById('o6-luasBendung').innerText = totalLuasBendung.toFixed(2);

    if (petaks.length === 0) {
        tbody.innerHTML = '<tr><td colspan="35" class="p-8 text-center text-red-500 italic bg-red-50">Data Petak Tersier untuk bendung ini tidak ditemukan di Profil D.I.</td></tr>';
        return;
    }

    // Render Header Tabel Dinamis
    let headerRow = `<tr>
        <th class="p-2 border-r border-b text-center align-middle bg-slate-50" rowspan="2">Nama Petak Tersier</th>
        <th class="p-2 border-r border-b text-center align-middle bg-slate-50" rowspan="2">L. Fung<br>(ha)</th>
        <th class="p-1 border-b text-center bg-blue-100/50 text-blue-900" colspan="${dayCount}">Target Debit Saluran Harian (l/det)<br><span class="text-[9px] font-normal italic text-blue-700">Dibulatkan otomatis dari 05-O Sub</span></th>
        <th class="p-2 border-l border-b text-center align-middle bg-slate-50" rowspan="2">Jml Debit</th>
        <th class="p-2 border-l border-b text-center align-middle bg-slate-50" rowspan="2">Rata-rata</th>
        <th class="p-2 border-l border-b text-center align-middle bg-amber-50 text-amber-900" colspan="2">Cara Pengukuran<br>Debit</th>
        <th class="p-2 border-l border-b text-center align-middle bg-emerald-50 text-emerald-900" colspan="2">Kondisi Alat Ukur</th>
    </tr><tr>`;
    for (let d = startDay; d <= endDay; d++) {
        headerRow += `<th class="p-1 border-r border-b text-center w-8 font-bold text-blue-800 bg-blue-50">${d}</th>`;
    }
    headerRow += `
        <th class="p-1 border-r border-b text-center w-10 font-bold bg-amber-50">a</th>
        <th class="p-1 border-r border-b text-center w-10 font-bold bg-amber-50">b</th>
        <th class="p-1 border-r border-b text-center w-12 font-bold bg-emerald-50">Baik</th>
        <th class="p-1 border-r border-b text-center w-12 font-bold bg-rose-50">Rusak</th>
    `;
    headerRow += `</tr>`;
    thead.innerHTML = headerRow;

    // --- CARI DATA DARI 05-O SUB ---
    // Kita harus mencari MT apa yang aktif di 05-O Sub untuk Bendung & Periode ini
    const subDataAll = getLS('05Oa_' + currentDI);
    let targetDebitPerPetak = new Array(petaks.length).fill(0);
    let dataSumberDitemukan = false;

    Object.keys(subDataAll).forEach(key => {
        if (key.startsWith(bendungNama + '_') && key.endsWith('_' + periodeStr)) {
            const subRep = subDataAll[key];
            dataSumberDitemukan = true;
            // Ambil Kebutuhan Air di Pintu (totalDebitPintu) per petak, lalu BULATKAN (Math.round)
            for (let i = 0; i < petaks.length; i++) {
                if (subRep.petak && subRep.petak[i]) {
                    // Hitung ulang total pintu per petak dari data 05-O Sub
                    let totalSawahPetak = 0;
                    if(subRep.petak[i].luas && subRep.satuan) {
                        Object.keys(subRep.petak[i].luas).forEach(rowId => {
                            const l = parseFloat(subRep.petak[i].luas[rowId]) || 0;
                            const s = parseFloat(subRep.satuan[rowId]) || 0;
                            totalSawahPetak += (l * s);
                        });
                    }
                    const faktor = parseFloat(subRep.petak[i].faktor) || 1.20;
                    const airPintu = totalSawahPetak * faktor;
                    
                    // Lakukan Pembulatan di sini
                    targetDebitPerPetak[i] = Math.round(airPintu); 
                }
            }
        }
    });

    // Render Body Tabel Dinamis
    let bodyRows = '';
    petaks.forEach((p, pIdx) => {
        const targetHarian = targetDebitPerPetak[pIdx];
        
        bodyRows += `<tr class="border-b hover:bg-slate-50 transition-colors" data-p-idx="${pIdx}">
            <td class="p-2 border-r font-bold text-slate-800">${p.petak}</td>
            <td class="p-2 border-r text-center font-medium bg-emerald-50/30 text-emerald-800">${p.luasFungsional || 0}</td>`;
            
        for (let d = 0; d < dayCount; d++) {
            bodyRows += `<td class="p-0.5 border-r">
                <input type="text" inputmode="decimal" value="${dataSumberDitemukan && targetHarian > 0 ? targetHarian : ''}" oninput="calc06O(0, ${dayCount})" class="w-10 text-center text-xs p-1 outline-none border border-transparent rounded bg-white text-blue-700 font-bold focus:border-blue-400 focus:ring-1 focus:ring-blue-400 o6-debit-val">
            </td>`;
        }
        bodyRows += `<td class="p-1 border-l"><input type="text" readonly class="w-16 text-center text-xs font-bold text-indigo-700 bg-indigo-50/50 rounded p-1 o6-row-sum"></td>
                     <td class="p-1 border-l"><input type="text" readonly class="w-16 text-center text-xs font-bold text-blue-700 bg-blue-50/50 rounded p-1 o6-row-avg"></td>
                     <td class="p-1 border-l text-center bg-amber-50/30"><input type="text" class="o6-extra w-12 text-center text-xs p-1 border border-amber-200 rounded bg-white outline-none focus:ring-1 focus:ring-amber-500" data-field="caraA"></td>
                     <td class="p-1 border-l text-center bg-amber-50/30"><input type="text" class="o6-extra w-12 text-center text-xs p-1 border border-amber-200 rounded bg-white outline-none focus:ring-1 focus:ring-amber-500" data-field="caraB"></td>
                     <td class="p-1 border-l text-center bg-emerald-50/30"><input type="checkbox" class="o6-extra h-4 w-4 accent-emerald-600" data-field="alatBaik"></td>
                     <td class="p-1 border-l text-center bg-rose-50/30"><input type="checkbox" class="o6-extra h-4 w-4 accent-rose-600" data-field="alatRusak"></td></tr>`;
    });

    // Footer Jumlah
    bodyRows += `<tr class="bg-slate-100 font-bold">
        <td class="p-2 border-r text-right uppercase text-[10px]">Jumlah</td>
        <td class="p-2 border-r text-center text-emerald-700" id="o6-total-luas">${totalLuasBendung.toFixed(2)}</td>`;
    for (let d = 0; d < dayCount; d++) {
        bodyRows += `<td class="p-1 border-r text-center text-xs text-slate-800" id="o6-col-sum-${d}">-</td>`;
    }
    bodyRows += `<td class="p-1 border-l text-center text-xs text-indigo-800" id="o6-total-all-sum">-</td><td class="p-1 border-l text-center text-xs text-blue-800" id="o6-total-all-avg">-</td><td colspan="4" class="p-1 border-l text-center text-xs text-slate-400">-</td></tr>`;

    tbody.innerHTML = bodyRows;

    // --- KALKULASI & NOTIFIKASI ---
    calc06O(0, dayCount); // Jalankan kalkulasi jumlah baris/kolom otomatis

    if (dataSumberDitemukan) {
        showFormAlert('o6', `Berhasil memuat target debit dari 05-O Sub untuk <strong>${bendungNama} (${periodeStr})</strong>.`, 'success');
    } else {
        showFormAlert('o6', `Belum ada data Kebutuhan Air di 05-O Sub untuk ${bendungNama} pada periode ini.`, 'error');
    }

    // Nilai debit tetap ditarik otomatis dari 05-O Sub, tetapi bisa dikoreksi manual per tanggal.
}

function calc06O(pIdx, dayCount) {
    const rows = document.querySelectorAll('#o6-tbody tr[data-p-idx]');
    let colSums = new Array(dayCount).fill(0);
    let totalAllSum = 0;

    rows.forEach((row, rIdx) => {
        const inputs = row.querySelectorAll('.o6-debit-val');
        let rowSum = 0;
        let activeDays = 0;

        inputs.forEach((inp, dIdx) => {
            const val = parseFloat(inp.value) || 0;
            rowSum += val;
            colSums[dIdx] += val;
            if(inp.value !== "") activeDays++;
        });

        row.querySelector('.o6-row-sum').value = rowSum > 0 ? rowSum.toFixed(2) : "";
        row.querySelector('.o6-row-avg').value = activeDays > 0 ? (rowSum / activeDays).toFixed(2) : "";
        totalAllSum += rowSum;
    });

    // Update Footer
    colSums.forEach((sum, dIdx) => {
        document.getElementById(`o6-col-sum-${dIdx}`).innerText = sum > 0 ? sum.toFixed(2) : "-";
    });
    document.getElementById('o6-total-all-sum').innerText = totalAllSum > 0 ? totalAllSum.toFixed(2) : "-";
    document.getElementById('o6-total-all-avg').innerText = totalAllSum > 0 ? (totalAllSum / (rows.length * dayCount)).toFixed(2) : "-";
}

async function saveForm06O() {
    const bendung = document.getElementById('o6-bendung-select').value;
    const periode = document.getElementById('o6-periode-air').value;
    if(!bendung || !periode) return showFormAlert('o6', "Pilih bendung dan periode!", "error");

    const rows = document.querySelectorAll('#o6-tbody tr[data-p-idx]');
    const data = { bendung, periode, periodeUtama: findOperasiPeriodByBendungAndPeriodeAir(bendung, periode), values: [], meta: [] };
    
    rows.forEach(row => {
        const vals = Array.from(row.querySelectorAll('.o6-debit-val')).map(i => i.value);
        data.values.push(vals);
        const rowMeta = {};
        row.querySelectorAll('.o6-extra').forEach(input => {
            rowMeta[input.dataset.field] = input.type === 'checkbox' ? input.checked : input.value;
        });
        data.meta.push(rowMeta);
    });

    const key = `${bendung}_${periode}`;
    const savedData = getLS('06O_' + currentDI);
    savedData[key] = withReportTimestamps(data, savedData[key]);
    setLS('06O_' + currentDI, savedData);

    let onlineSaved = false;
    try {
        onlineSaved = await saveLaporanOnline('06-O', savedData[key], {
            kategori: 'operasi',
            key_laporan: key,
            bendung,
            periode
        });
    } catch (err) {
        console.error('Gagal simpan 06-O ke Supabase:', err);
    }

    renderSavedList06O();
    
    // ðŸ‘‡ RESET TOTAL: Bersihkan form dan dropdown setelah disimpan
    resetInputs06O(false); 
    
    showOperationSaveAlert('o6', `Data pencatatan debit 06-O berhasil disimpan${onlineSaved ? ' ke Supabase' : ' lokal'}.`, onlineSaved ? 'success' : 'warning', data.periodeUtama || '');
    setTimeout(() => hideFormAlert('o6'), 4000);
}

function fillForm06O(data, dayCount) {
    const rows = document.querySelectorAll('#o6-tbody tr[data-p-idx]');
    rows.forEach((row, rIdx) => {
        const inputs = row.querySelectorAll('.o6-debit-val');
        if(data.values[rIdx]) {
            inputs.forEach((inp, dIdx) => inp.value = data.values[rIdx][dIdx] || "");
        }
        const meta = data.meta?.[rIdx] || {};
        row.querySelectorAll('.o6-extra').forEach(input => {
            if (input.type === 'checkbox') {
                input.checked = !!meta[input.dataset.field];
            } else {
                input.value = meta[input.dataset.field] || "";
            }
        });
        calc06O(rIdx, dayCount);
    });
}

function renderSavedList06O() {
    const savedData = getLS('06O_' + currentDI);
    const container = document.getElementById('o6-saved-list');
    const allKeys = Object.keys(savedData).sort();
    const keys = filterOperationSavedKeys('06-O', allKeys, savedData);

    if (allKeys.length === 0) {
        container.innerHTML = `<p class="col-span-full text-center text-slate-400 italic py-8 border border-dashed rounded-xl bg-slate-50">Belum ada riwayat 06-O.</p>`;
        return;
    }
    if (keys.length === 0) return renderNoActiveOperasiMessage(container, 'riwayat 06-O');

    container.innerHTML = keys.map(k => {
        const d = savedData[k];
        return `<div class="bg-white p-4 border rounded-xl shadow-sm hover:shadow-md transition-all">
            <div class="flex items-start gap-3 mb-4">
                <div class="bg-blue-100 text-blue-600 p-2 rounded-lg"><i data-lucide="gauge" class="w-5 h-5"></i></div>
                <div>
                    <h4 class="font-bold text-slate-800 text-sm truncate w-40">${d.bendung}</h4>
                    <p class="text-[10px] text-slate-500 font-medium">${d.periode}</p>
                </div>
            </div>
            <button onclick="edit06O('${k}')" class="w-full bg-blue-50 text-blue-700 py-2 rounded-lg font-bold text-xs">Lihat / Edit</button>
        </div>`;
    }).join('');
    if(typeof initIcons === 'function') initIcons();
}

function edit06O(key) {
    const data = getLS('06O_' + currentDI)[key];
    if(!data) return;
    document.getElementById('o6-bendung-select').value = data.bendung;
    document.getElementById('o6-periode-air').value = data.periode;
    onChangeFilter06O();
    const match = String(data.periode || '').match(/^(\d+)-(\d+)/);
    const dayCount = match ? (parseInt(match[2], 10) - parseInt(match[1], 10) + 1) : (data.values?.[0]?.length || 1);
    fillForm06O(data, dayCount);
    document.getElementById('view-blanko-operasi').scrollIntoView({behavior: 'smooth'});
}

function resetInputs06O(keepDropdown = false) {
    if(!keepDropdown) {
        document.getElementById('o6-bendung-select').value = "";
        document.getElementById('o6-periode-air').value = "";
    }
    onChangeFilter06O();
}

// ====================================================================
// --- FORMULIR 07-O : RENCANA KEBUTUHAN JARINGAN UTAMA ---
// ====================================================================

function render07O() {
    const pData = getProfilData(currentDI);
    
    // Info Header
    ['di','kodeDI','pengamat','kabupaten'].forEach(id => {
        document.getElementById('o7-' + id).innerText = (id === 'di') ? currentDI : (pData[id] || "-");
    });
    
    let totalLuasDI = 0;
    if(pData.bendungs) {
        pData.bendungs.forEach(b => { if(b.rincian) b.rincian.forEach(r => totalLuasDI += (parseFloat(String(r.luasFungsional).replace(',', '.'))||0)); });
    }
    document.getElementById('o7-totalLuasDI').innerText = totalLuasDI > 0 ? totalLuasDI.toFixed(2) + ' Ha' : "0 Ha";

    // Dropdown Bendung
    const o1Data = getLS('01O_' + currentDI);
    const validBendungs = Object.keys(o1Data).sort();
    const selBendung = document.getElementById('o7-bendung-select');
    const currBendung = selBendung.value;
    selBendung.innerHTML = '<option value="">-- Pilih Bendung --</option>' + validBendungs.map(b => `<option value="${b}">${b}</option>`).join('');
    if(validBendungs.includes(currBendung)) selBendung.value = currBendung;

    // ðŸ‘‰ REVISI: Kosongkan Dropdown Periode (Akan dibangkitkan oleh onChangeFilter07O)
    document.getElementById('o7-periode-air').innerHTML = '<option value="">-- Pilih MT Terlebih Dahulu --</option>';

    if (!document.getElementById('o7-mt-select').value) {
        document.getElementById('o7-periodeMT').innerText = "-";
    }

    onChangeFilter07O();
    renderSavedList07O();
    syncOperasiFormFromSupabase('07O', '07-O', renderSavedList07O);
}

// --- REVISI: PENYEDOTAN DATA DARI 05-O SUB & 06-O ---
function onChangeFilter07O() {
    hideFormAlert('o7');
    const bendungNama = document.getElementById('o7-bendung-select').value;
    const mt = document.getElementById('o7-mt-select').value;
    const selPeriode = document.getElementById('o7-periode-air');
    const currentPeriodeVal = selPeriode.value; // Simpan memori pilihan saat ini
    const tbody = document.getElementById('o7-tbody');
    
    document.getElementById('o7-periodeMT').innerText = "-";
    
    // ðŸ‘‰ REVISI: GENERATOR PERIODE DINAMIS BERDASARKAN MT 01-O
    if (bendungNama && mt) {
        const o1Data = getLS('01O_' + currentDI);
        if (o1Data[bendungNama]) {
            const propMT = mt === 'MT1' ? 'mt1' : (mt === 'MT2' ? 'mt2' : 'mt3');
            const mtString = o1Data[bendungNama][propMT] || "";
            document.getElementById('o7-periodeMT').innerText = mtString || "(Belum diatur di 01-O)";

            if (mtString && mtString.includes('s/d')) {
                const parts = mtString.split('s/d').map(s => s.trim().toLowerCase());
                const monthsIndo = ['januari','februari','maret','april','mei','juni','juli','agustus','september','oktober','november','desember'];
                const monthNamesCap = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

                const parseDate = (str) => {
                    const p = str.split(' ');
                    if (p.length < 2) return null;
                    const m = monthsIndo.indexOf(p[0]);
                    const y = parseInt(p[1]);
                    if (m === -1 || isNaN(y)) return null;
                    return { abs: y * 12 + m }; 
                };

                const start = parseDate(parts[0]);
                const end = parseDate(parts[1]);

                if (start && end && start.abs <= end.abs) {
                    let optHtml = '<option value="">-- Pilih Periode Pemberian Air --</option>';
                    for (let abs = start.abs; abs <= end.abs; abs++) {
                        const y = Math.floor(abs / 12);
                        const m = abs % 12;
                        const mName = monthNamesCap[m];
                        const lastDay = new Date(y, m + 1, 0).getDate();

                        const p1 = `1-15 ${mName} ${y}`;
                        const p2 = `16-${lastDay} ${mName} ${y}`;

                        optHtml += `<option value="${p1}" ${currentPeriodeVal === p1 ? 'selected' : ''}>${p1}</option>`;
                        optHtml += `<option value="${p2}" ${currentPeriodeVal === p2 ? 'selected' : ''}>${p2}</option>`;
                    }
                    selPeriode.innerHTML = optHtml;
                } else {
                    selPeriode.innerHTML = '<option value="">-- Format Tanggal MT Tidak Dikenali --</option>';
                }
            } else {
                selPeriode.innerHTML = '<option value="">-- Format Tanggal MT Tidak Valid --</option>';
            }
        } else {
            showFormAlert('o7', `Bendung ${bendungNama} belum memiliki Arsip Usulan di 01-O!`, "error");
            selPeriode.innerHTML = '<option value="">-- Pilih Bendung & MT Terlebih Dahulu --</option>';
        }
    } else {
        selPeriode.innerHTML = '<option value="">-- Pilih Bendung & MT Terlebih Dahulu --</option>';
    }

    const periodeStr = selPeriode.value; // Ambil nilai update terbaru

    if (!bendungNama || !mt || !periodeStr) {
        tbody.innerHTML = '<tr><td colspan="11" class="p-8 text-center text-slate-400 italic font-medium bg-slate-50">Pilih Bendung, MT, dan Periode terlebih dahulu...</td></tr>';
        return;
    }

    const pData = getProfilData(currentDI);
    const bendung = pData.bendungs.find(b => b.nama === bendungNama);
    let petaks = bendung && bendung.rincian ? bendung.rincian : [];
    if(petaks.length === 0) petaks = [{ petak: "Tersier Utama", luasFungsional: 0 }];

    let tbHtml = '';
    const key06 = `${bendungNama}_${periodeStr}`;
    const o6Data = getLS('06O_' + currentDI);
    const data06 = o6Data[key06] && o6Data[key06].values ? o6Data[key06].values : [];

    const key05a = `${bendungNama}_${mt}_${periodeStr}`;
    const o5aData = getLS('05Oa_' + currentDI)[key05a];
    
    let isData05aDitemukan = false;

    petaks.forEach((p, pIdx) => {
        const namaPetak = p.petak || p.nama || `Petak ${pIdx + 1}`;
        const luasSawah = parseFloat(String(p.luasFungsional).replace(',', '.')) || 0;

        let avg06 = 0, last06 = 0;
        if (data06[pIdx]) {
            let sum = 0, count = 0;
            data06[pIdx].forEach(val => {
                const v = parseFloat(String(val).replace(',', '.'));
                if(!isNaN(v)) { sum += v; count++; }
            });
            if (count > 0) avg06 = sum / count;
            const lastVal = parseFloat(String(data06[pIdx][data06[pIdx].length - 1]).replace(',', '.'));
            if(!isNaN(lastVal)) last06 = lastVal;
        }

        let usulanTanam = 0, pintuTersier = 0; 
        
        if (o5aData && o5aData.petak && o5aData.petak[pIdx]) {
            isData05aDitemukan = true;
            const dataPetak = o5aData.petak[pIdx];
            
            if(dataPetak.luas) {
                Object.values(dataPetak.luas).forEach(val => usulanTanam += (parseFloat(val) || 0));
            }

            let totalAirSawah = 0;
            if(dataPetak.luas && o5aData.satuan) {
                Object.keys(dataPetak.luas).forEach(rowId => {
                    const l = parseFloat(dataPetak.luas[rowId]) || 0;
                    const s = parseFloat(o5aData.satuan[rowId]) || 0;
                    totalAirSawah += (l * s);
                });
            }
            const faktor = parseFloat(dataPetak.faktor) || 1.20;
            pintuTersier = totalAirSawah * faktor;
        }

        tbHtml += `
            <tr class="border-b hover:bg-slate-50 transition-colors" data-pidx="${pIdx}" data-petak="${namaPetak}">
                <td class="p-2 border-r font-bold text-slate-800 whitespace-normal min-w-[150px]">${namaPetak}</td>
                <td class="p-2 border-r text-center font-bold text-emerald-700 bg-emerald-50/30 o7-val-luas">${luasSawah > 0 ? luasSawah.toFixed(2) : '-'}</td>
                
                <td class="p-2 border-r text-center font-bold text-blue-700 bg-blue-50/10 o7-val-avg06" title="Rata-rata 06-O">${avg06 > 0 ? avg06.toFixed(2) : '-'}</td>
                <td class="p-2 border-r text-center font-bold text-blue-700 bg-blue-50/10 o7-val-last06" title="Akhir Periode 06-O">${last06 > 0 ? last06.toFixed(2) : '-'}</td>
                
                <td class="p-1 border-r bg-orange-50/20"><input type="text" readonly class="inp-tbl-calc font-bold text-orange-700 bg-transparent text-center cursor-not-allowed" data-id="usul" value="${usulanTanam > 0 ? usulanTanam.toFixed(2) : ''}"></td>
                <td class="p-1 border-r bg-indigo-50/20"><input type="text" readonly class="inp-tbl-calc font-bold text-indigo-700 bg-transparent text-center cursor-not-allowed" data-id="tersier" value="${pintuTersier > 0 ? pintuTersier.toFixed(2) : ''}"></td>
                
                <td class="p-1 border-r"><input type="number" step="any" class="inp-tbl o7-input text-center outline-none focus:bg-blue-50" data-id="lain" oninput="calc07O(${pIdx})"></td>
                <td class="p-1 border-r"><input type="text" readonly class="inp-tbl-calc text-slate-600 bg-slate-50/50 text-center cursor-not-allowed" data-id="hilang"></td>
                <td class="p-1 border-r"><input type="number" step="any" class="inp-tbl o7-input text-center outline-none focus:bg-blue-50" data-id="suplesi" oninput="calc07O(${pIdx})"></td>
                
                <td class="p-1 border-r"><input type="text" readonly class="inp-tbl-calc font-bold text-indigo-700 bg-indigo-50/50 text-center cursor-not-allowed" data-id="bagi"></td>
                <td class="p-1"><input type="text" readonly class="inp-tbl-calc font-black text-emerald-800 bg-emerald-100/50 text-center cursor-not-allowed" data-id="diberikan"></td>
            </tr>`;
    });

    tbHtml += `
        <tr class="bg-slate-100 font-bold uppercase text-[10px] tracking-wider border-t-2 border-slate-300">
            <td class="p-3 border-r text-right text-slate-800">Jumlah Total</td>
            <td class="p-3 border-r text-center text-emerald-800" id="o7-tot-luas">-</td>
            <td class="p-3 border-r text-center text-blue-800" id="o7-tot-avg06">-</td>
            <td class="p-3 border-r text-center text-blue-800" id="o7-tot-last06">-</td>
            <td class="p-3 border-r text-center text-orange-800" id="o7-tot-usul">-</td>
            <td class="p-3 border-r text-center text-indigo-800" id="o7-tot-tersier">-</td>
            <td class="p-3 border-r text-center text-slate-800" id="o7-tot-lain">-</td>
            <td class="p-3 border-r text-center text-slate-600" id="o7-tot-hilang">-</td>
            <td class="p-3 border-r text-center text-slate-800" id="o7-tot-suplesi">-</td>
            <td class="p-3 border-r text-center text-indigo-800" id="o7-tot-bagi">-</td>
            <td class="p-3 text-center text-emerald-900 bg-emerald-200/50 text-xs font-black" id="o7-tot-diberikan">-</td>
        </tr>`;

    tbody.innerHTML = tbHtml;

    petaks.forEach((_, idx) => calc07O(idx));

    if(isData05aDitemukan) {
        showFormAlert('o7', `Data Usulan dan Kebutuhan Pintu Tersier berhasil ditarik otomatis dari 05-O Sub.`, 'success');
    } else {
        showFormAlert('o7', `Belum ada data 05-O Sub untuk Bendung dan Periode ini. Target akan kosong.`, 'error');
    }

    const savedKey = `${bendungNama}_${mt}_${periodeStr}`;
    const savedData = getLS('07O_' + currentDI)[savedKey];
    if (savedData) {
        fillForm07O(savedData);
    }

    calcTotal07O(); 
}

// Mengkalkulasi Baris (Petak Tersier)
function calc07O(pIdx) {
    const row = document.querySelector(`#o7-tbody tr[data-pidx="${pIdx}"]`);
    if(!row) return;

    const getVal = (id) => parseFloat(String(row.querySelector(`input[data-id="${id}"]`).value).replace(',', '.')) || 0;
    const setVal = (id, val) => {
        const el = row.querySelector(`input[data-id="${id}"]`);
        if(el) el.value = val > 0 ? val.toFixed(2) : "";
    };

    const tersier = parseFloat(String(row.querySelector('input[data-id="tersier"]').value).replace(',', '.')) || 0;
    const lain = getVal('lain');
    const suplesi = getVal('suplesi');

    const hilang = tersier * 0.20; 
    setVal('hilang', hilang);

    let bangBagi = (tersier + lain + hilang) - suplesi; 
    if(bangBagi < 0) bangBagi = 0;
    
    setVal('bagi', bangBagi);
    setVal('diberikan', bangBagi); 

    // ðŸ‘‡ Panggil fungsi Total setiap kali ada input per baris berubah
    calcTotal07O(); 
}

// ðŸ‘‡ FUNGSI BARU: Menjumlahkan Semua Kolom Secara Global
function calcTotal07O() {
    const rows = document.querySelectorAll('#o7-tbody tr[data-pidx]');
    let t_luas = 0, t_avg06 = 0, t_last06 = 0;
    let t_usul = 0, t_tersier = 0, t_lain = 0, t_hilang = 0, t_suplesi = 0, t_bagi = 0, t_diberikan = 0;

    rows.forEach(row => {
        t_luas += parseFloat(row.querySelector('.o7-val-luas').innerText) || 0;
        t_avg06 += parseFloat(row.querySelector('.o7-val-avg06').innerText) || 0;
        t_last06 += parseFloat(row.querySelector('.o7-val-last06').innerText) || 0;
        
        t_usul += parseFloat(row.querySelector('input[data-id="usul"]').value) || 0;
        t_tersier += parseFloat(row.querySelector('input[data-id="tersier"]').value) || 0;
        t_lain += parseFloat(row.querySelector('input[data-id="lain"]').value) || 0;
        t_hilang += parseFloat(row.querySelector('input[data-id="hilang"]').value) || 0;
        t_suplesi += parseFloat(row.querySelector('input[data-id="suplesi"]').value) || 0;
        t_bagi += parseFloat(row.querySelector('input[data-id="bagi"]').value) || 0;
        t_diberikan += parseFloat(row.querySelector('input[data-id="diberikan"]').value) || 0;
    });

    // Cetak ke layar
    document.getElementById('o7-tot-luas').innerText = t_luas > 0 ? t_luas.toFixed(2) : '-';
    document.getElementById('o7-tot-avg06').innerText = t_avg06 > 0 ? t_avg06.toFixed(2) : '-';
    document.getElementById('o7-tot-last06').innerText = t_last06 > 0 ? t_last06.toFixed(2) : '-';
    document.getElementById('o7-tot-usul').innerText = t_usul > 0 ? t_usul.toFixed(2) : '-';
    document.getElementById('o7-tot-tersier').innerText = t_tersier > 0 ? t_tersier.toFixed(2) : '-';
    document.getElementById('o7-tot-lain').innerText = t_lain > 0 ? t_lain.toFixed(2) : '-';
    document.getElementById('o7-tot-hilang').innerText = t_hilang > 0 ? t_hilang.toFixed(2) : '-';
    document.getElementById('o7-tot-suplesi').innerText = t_suplesi > 0 ? t_suplesi.toFixed(2) : '-';
    document.getElementById('o7-tot-bagi').innerText = t_bagi > 0 ? t_bagi.toFixed(2) : '-';
    document.getElementById('o7-tot-diberikan').innerText = t_diberikan > 0 ? t_diberikan.toFixed(2) : '-';
}

async function saveForm07O() {
    const bendung = document.getElementById('o7-bendung-select').value;
    const mt = document.getElementById('o7-mt-select').value;
    const periode = document.getElementById('o7-periode-air').value;
    
    if(!bendung || !mt || !periode) return showFormAlert('o7', "Pilih Bendung, MT dan Periode!", "error");

    const rows = document.querySelectorAll('#o7-tbody tr[data-pidx]');
    const dataRows = {};
    
    rows.forEach(row => {
        const pNama = row.getAttribute('data-petak');
        dataRows[pNama] = {
            usul: row.querySelector('input[data-id="usul"]').value,
            tersier: row.querySelector('input[data-id="tersier"]').value,
            lain: row.querySelector('input[data-id="lain"]').value,
            suplesi: row.querySelector('input[data-id="suplesi"]').value,
            diberikan: row.querySelector('input[data-id="diberikan"]').value
        };
    });

    const savedKey = `${bendung}_${mt}_${periode}`;
    const savedData = getLS('07O_' + currentDI);
    savedData[savedKey] = withReportTimestamps({ bendung, mt, periode, periodeUtama: findOperasiPeriodByMtAndBendung(mt, bendung), rows: dataRows }, savedData[savedKey]);
    setLS('07O_' + currentDI, savedData);

    let onlineSaved = false;
    try {
        onlineSaved = await saveLaporanOnline('07-O', savedData[savedKey], {
            kategori: 'operasi',
            key_laporan: savedKey,
            bendung,
            mt,
            periode
        });
    } catch (err) {
        console.error('Gagal simpan 07-O ke Supabase:', err);
    }

    renderSavedList07O();
    
    // REVISI: Kosongkan tabel (Reset) setelah berhasil disimpan
    resetInputs07O(false);
    
    showOperationSaveAlert('o7', `Laporan 07-O berhasil disimpan${onlineSaved ? ' ke Supabase' : ' lokal'}.`, onlineSaved ? 'success' : 'warning', savedData[savedKey].periodeUtama || '');
    setTimeout(() => hideFormAlert('o7'), 4000);
}

function fillForm07O(data) {
    const rows = document.querySelectorAll('#o7-tbody tr[data-pidx]');
    rows.forEach(row => {
        const pNama = row.getAttribute('data-petak');
        if (data.rows && data.rows[pNama]) {
            row.querySelector('input[data-id="lain"]').value = data.rows[pNama].lain || "";
            row.querySelector('input[data-id="suplesi"]').value = data.rows[pNama].suplesi || "";
            row.querySelector('input[data-id="diberikan"]').value = data.rows[pNama].diberikan || "";
            calc07O(row.getAttribute('data-pidx'));
        }
    });
}

function renderSavedList07O() {
    const savedData = getLS('07O_' + currentDI);
    const container = document.getElementById('o7-saved-list');
    const allKeys = Object.keys(savedData).sort().reverse();
    const keys = filterOperationSavedKeys('07-O', allKeys, savedData);

    if (allKeys.length === 0) {
        container.innerHTML = `<p class="col-span-full text-center text-slate-400 italic py-8 border border-dashed rounded-xl bg-slate-50">Belum ada Laporan 07-O yang tersimpan.</p>`;
        return;
    }
    if (keys.length === 0) return renderNoActiveOperasiMessage(container, 'Laporan 07-O');

    container.innerHTML = keys.map(k => {
        const d = savedData[k];
        return `<div class="bg-white p-4 border rounded-xl shadow-sm hover:shadow-md transition-all">
            <div class="flex items-start gap-3 mb-4">
                <div class="bg-indigo-100 text-indigo-600 p-2 rounded-lg"><i data-lucide="droplets" class="w-5 h-5"></i></div>
                <div>
                    <h4 class="font-bold text-slate-800 text-sm truncate w-40" title="${d.bendung}">${d.bendung}</h4>
                    <p class="text-[10px] text-slate-500 font-medium">${d.mt} &bull; ${d.periode}</p>
                </div>
            </div>
            <button onclick="edit07O('${k}')" class="w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 py-2 rounded-lg font-bold text-xs transition-colors">Lihat / Edit</button>
        </div>`;
    }).join('');
    if(typeof initIcons === 'function') initIcons();
}

function edit07O(key) {
    const data = getLS('07O_' + currentDI)[key];
    if(!data) return;
    
    document.getElementById('o7-bendung-select').value = data.bendung;
    document.getElementById('o7-mt-select').value = data.mt;
    
    // TRIGGER 1: Bangkitkan Dropdown Periode berdasarkan MT
    onChangeFilter07O(); 
    
    // Pasang nilai periode
    document.getElementById('o7-periode-air').value = data.periode;
    
    // TRIGGER 2: Jalankan sedot data ulang dari brankas
    onChangeFilter07O(); 
    
    document.getElementById('view-blanko-operasi').scrollIntoView({behavior: 'smooth'});
}

function resetInputs07O(keepDropdown = false) {
    if(!keepDropdown) {
        document.getElementById('o7-bendung-select').value = "";
        document.getElementById('o7-mt-select').value = "";
        document.getElementById('o7-periode-air').value = "";
    }
    onChangeFilter07O();
}

// ====================================================================
// --- SISTEM LOGIKA FORMULIR 08-O ---
// ====================================================================

// --- REVISI: GENERATOR PERIODE DINAMIS BERDASARKAN SELURUH MT DI 01-O ---
function render08O() {
    const pData = getProfilData(currentDI);
    
    // 1. Info Header
    ['di','kodeDI','pengamat','kabupaten'].forEach(id => {
        document.getElementById('o8-' + id).innerText = (id === 'di') ? currentDI : (pData[id] || "-");
    });
    
    let totalLuasDI = 0;
    if(pData.bendungs) pData.bendungs.forEach(b => { if(b.rincian) b.rincian.forEach(r => totalLuasDI += (parseFloat(r.luasFungsional)||0)); });
    document.getElementById('o8-totalLuasDI').innerText = totalLuasDI > 0 ? totalLuasDI.toFixed(2) + ' Ha' : "0 Ha";

    // 2. Dropdown Bendung (dari 01-O)
    const o1Data = getLS('01O_' + currentDI);
    const validBendungs = Object.keys(o1Data).sort();
    const selBendung = document.getElementById('o8-bendung-select');
    const currBendung = selBendung.value;
    selBendung.innerHTML = '<option value="">-- Pilih Bendung --</option>' + validBendungs.map(b => `<option value="${b}">${b}</option>`).join('');
    if(validBendungs.includes(currBendung)) selBendung.value = currBendung;

    // 3. Generate Periode (Menggabungkan Seluruh MT dari 01-O)
    const selPeriode = document.getElementById('o8-periode-air');
    const currPer = selPeriode.value;
    let optPeriode = '<option value="">-- Pilih Periode --</option>';

    // Ekstrak rentang bulan dari MT1, MT2, dan MT3 dari Bendung Pertama
    if (validBendungs.length > 0) {
        const refData = o1Data[validBendungs[0]];
        const allMTs = [refData.mt1, refData.mt2, refData.mt3].filter(Boolean);
        
        let generatedPeriods = new Set(); 

        allMTs.forEach(mtString => {
            if (mtString && mtString.includes('s/d')) {
                const parts = mtString.split('s/d').map(s => s.trim().toLowerCase());
                const monthsIndo = ['januari','februari','maret','april','mei','juni','juli','agustus','september','oktober','november','desember'];
                const monthNamesCap = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

                const parseDate = (str) => {
                    const p = str.split(' ');
                    if (p.length < 2) return null;
                    const m = monthsIndo.indexOf(p[0]);
                    const y = parseInt(p[1]);
                    if (m === -1 || isNaN(y)) return null;
                    return { abs: y * 12 + m }; 
                };

                const start = parseDate(parts[0]);
                const end = parseDate(parts[1]);

                if (start && end && start.abs <= end.abs) {
                    for (let abs = start.abs; abs <= end.abs; abs++) {
                        const y = Math.floor(abs / 12);
                        const m = abs % 12;
                        const mName = monthNamesCap[m];
                        const lastDay = new Date(y, m + 1, 0).getDate();

                        generatedPeriods.add(`1-15 ${mName} ${y}`);
                        generatedPeriods.add(`16-${lastDay} ${mName} ${y}`);
                    }
                }
            }
        });

        // Konversi Set kembali menjadi Array dan ubah menjadi tag <option>
        Array.from(generatedPeriods).forEach(periode => {
            optPeriode += `<option value="${periode}">${periode}</option>`;
        });

        if (generatedPeriods.size === 0) {
            optPeriode = '<option value="">-- Format Tanggal 01-O Tidak Dikenali --</option>';
        }
    } else {
         optPeriode = '<option value="">-- Belum ada data di 01-O --</option>';
    }

    selPeriode.innerHTML = optPeriode;
    if(currPer) selPeriode.value = currPer;

    onChangeFilter08O();
    renderSavedList08O();
    syncOperasiFormFromSupabase('08O', '08-O', renderSavedList08O);
}

function onChangeFilter08O() {
    hideFormAlert('o8');
    const bendungNama = document.getElementById('o8-bendung-select').value;
    const periodeStr = document.getElementById('o8-periode-air').value;
    const tbody = document.getElementById('o8-tbody');

    if (!bendungNama || !periodeStr) {
        document.getElementById('o8-luasBendung').innerText = "-";
        document.getElementById('o8-target-debit').innerHTML = '- <span class="text-xs font-normal">l/dt</span>';
        tbody.innerHTML = '<tr><td colspan="10" class="p-8 text-center text-slate-400 italic">Pilih Bendung dan Periode terlebih dahulu...</td></tr>';
        return;
    }

    const pData = getProfilData(currentDI);
    let luasSawah = 0;
    const bendungProfile = (pData.bendungs || []).find(x => x.nama === bendungNama);
    if (bendungProfile && bendungProfile.rincian) {
        bendungProfile.rincian.forEach(r => luasSawah += (parseFloat(String(r.luasFungsional).replace(',', '.')) || 0));
    }
    document.getElementById('o8-luasBendung').innerText = luasSawah.toFixed(2);

    document.getElementById('o8-target-debit').innerHTML = '- <span class="text-xs font-normal">l/dt</span>';
    let totalDebitTarget = 0;
    
    const all07Data = getLS('07O_' + currentDI);
    Object.keys(all07Data).forEach(key => {
        if (key.startsWith(bendungNama + '_') && key.endsWith('_' + periodeStr)) {
            const data07 = all07Data[key];
            if (data07.rows) {
                Object.values(data07.rows).forEach(petakData => {
                    totalDebitTarget += (parseFloat(petakData.diberikan) || 0);
                });
            }
        }
    });

    if (totalDebitTarget > 0) {
        document.getElementById('o8-target-debit').innerHTML = `${totalDebitTarget.toFixed(2)} <span class="text-xs font-normal">l/dt</span>`;
    }

    const parts = periodeStr.split(' ');
    const range = parts[0].split('-');
    const startDay = parseInt(range[0]);
    const endDay = parseInt(range[1]);

    let tbHtml = '';
    for (let d = startDay; d <= endDay; d++) {
        let chunkIndex = startDay === 1 ? Math.floor((d - 1) / 5) : Math.floor((d - 16) / 5);

        tbHtml += `
            <tr class="border-b hover:bg-slate-50 transition-colors" data-day="${d}" data-chunk="${chunkIndex}">
                <td class="p-2 border-r font-bold text-slate-800 text-center bg-slate-50/50">${d}</td>
                <td class="p-1 border-r"><input type="number" step="any" class="inp-tbl o8-limpas-h text-center" data-col="limpas-h" oninput="autoFill08O(this, ${d}, ${startDay}); calc08O()"></td>
                <td class="p-1 border-r"><input type="number" step="any" class="inp-tbl o8-limpas-q text-center" data-col="limpas-q" oninput="autoFill08O(this, ${d}, ${startDay}); calc08O()"></td>
                <td class="p-1 border-r"><input type="number" step="any" class="inp-tbl o8-kiri-h text-center" data-col="kiri-h" oninput="autoFill08O(this, ${d}, ${startDay}); calc08O()"></td>
                <td class="p-1 border-r"><input type="number" step="any" class="inp-tbl o8-kiri-q text-center" data-col="kiri-q" oninput="autoFill08O(this, ${d}, ${startDay}); calc08O()"></td>
                <td class="p-1 border-r"><input type="number" step="any" class="inp-tbl o8-kanan-h text-center" data-col="kanan-h" oninput="autoFill08O(this, ${d}, ${startDay}); calc08O()"></td>
                <td class="p-1 border-r"><input type="number" step="any" class="inp-tbl o8-kanan-q text-center" data-col="kanan-q" oninput="autoFill08O(this, ${d}, ${startDay}); calc08O()"></td>
                
                <td class="p-1 border-r bg-emerald-50/30"><input type="text" readonly class="inp-tbl-calc font-bold text-emerald-800 text-center o8-saluran" data-col="saluran"></td>
                <td class="p-1 border-r bg-orange-50/30"><input type="text" readonly class="inp-tbl-calc font-bold text-orange-800 text-center o8-sungai" data-col="sungai"></td>
                
                <td class="p-1"><input type="text" readonly class="inp-tbl-calc font-bold text-slate-700 bg-slate-100/50 text-center o8-avg"></td>
            </tr>`;
    }
    
    // ðŸ‘‡ TAMBAHAN BARIS JUMLAH & RATA-RATA SESUAI FORMAT GAMBAR ðŸ‘‡
    tbHtml += `
        <tr class="bg-slate-100 font-bold border-t-2 border-slate-300">
            <td class="p-2 border-r text-center"></td>
            <td class="p-1 border-r text-center font-black text-blue-900 text-sm" id="o8-sum-limpas-h"></td>
            <td class="p-1 border-r text-center font-black text-blue-900 text-sm" id="o8-sum-limpas-q"></td>
            <td class="p-2 border-r text-center text-slate-700 uppercase text-[11px] tracking-wider" colspan="4">Jumlah</td>
            <td class="p-1 border-r text-center font-black text-emerald-900 text-sm" id="o8-sum-saluran"></td>
            <td class="p-1 border-r text-center font-black text-orange-900 text-sm" id="o8-sum-sungai"></td>
            <td class="p-1 text-center bg-slate-200/50"></td>
        </tr>
        <tr class="bg-slate-100 font-bold border-t border-slate-300">
            <td class="p-2 border-r text-center"></td>
            <td class="p-1 border-r text-center font-black text-blue-900 text-sm" id="o8-avg-limpas-h"></td>
            <td class="p-1 border-r text-center font-black text-blue-900 text-sm" id="o8-avg-limpas-q"></td>
            <td class="p-2 border-r text-center text-slate-700 uppercase text-[11px] tracking-wider" colspan="4">Debit Rata-rata</td>
            <td class="p-1 border-r text-center font-black text-emerald-900 text-sm" id="o8-avg-saluran"></td>
            <td class="p-1 border-r text-center font-black text-orange-900 text-sm" id="o8-avg-sungai"></td>
            <td class="p-1 text-center bg-slate-200/50"></td>
        </tr>
    `;

    tbody.innerHTML = tbHtml;

    const key = `${bendungNama}_${periodeStr}`;
    const saved = getLS('08O_' + currentDI)[key];
    if(saved) fillForm08O(saved);
}

// =========================================================
// FUNGSI AUTO-FILL: MENGKOPI NILAI BARIS 1 KE BAWAHNYA
// =========================================================
function autoFill08O(element, currentDay, startDay) {
    // Aksi ini HANYA dieksekusi jika yang diketik adalah baris pertama (misal tgl 1 atau tgl 16)
    if (currentDay === startDay) {
        const colName = element.getAttribute('data-col');
        const val = element.value;
        
        // Cari semua input di tabel 08-O yang berada di kolom yang sama
        const allInputsInColumn = document.querySelectorAll(`#o8-tbody input[data-col="${colName}"]`);
        
        allInputsInColumn.forEach(inp => {
            // Timpa nilai semua kotak di bawahnya dengan nilai yang diketik di baris pertama
            if (inp !== element) {
                inp.value = val;
            }
        });
    }
}

function calc08O() {
    const rows = document.querySelectorAll('#o8-tbody tr[data-day]');
    let chunks = {}; 

    // Variabel penampung untuk footer
    let sumLimpasH = 0, sumLimpasQ = 0;
    let sumSaluran = 0, sumSungai = 0;
    const dayCount = rows.length; // Pembagi rata-rata (15 atau 16 hari)

    rows.forEach(row => {
        // Ambil nilai Limpas
        const hLimpas = parseFloat(row.querySelector('.o8-limpas-h').value) || 0;
        const qLimpas = parseFloat(row.querySelector('.o8-limpas-q').value) || 0;
        
        // Kalkulasi Debit Saluran (Kiri + Kanan)
        const qKiri = parseFloat(row.querySelector('.o8-kiri-q').value) || 0;
        const qKanan = parseFloat(row.querySelector('.o8-kanan-q').value) || 0;
        const qSaluran = qKiri + qKanan;
        row.querySelector('.o8-saluran').value = qSaluran > 0 ? qSaluran.toFixed(2) : "";

        // Kalkulasi Debit Sungai (Saluran + Limpas)
        const qSungai = qSaluran + qLimpas;
        row.querySelector('.o8-sungai').value = qSungai > 0 ? qSungai.toFixed(2) : "";

        // Tambahkan ke total akumulasi
        sumLimpasH += hLimpas;
        sumLimpasQ += qLimpas;
        sumSaluran += qSaluran;
        sumSungai += qSungai;

        // Persiapan Data Rata-rata 5 Harian
        const chunkIdx = row.getAttribute('data-chunk');
        if (!chunks[chunkIdx]) chunks[chunkIdx] = { sum: 0, count: 0 };
        
        if (qSungai > 0) {
            chunks[chunkIdx].sum += qSungai;
            chunks[chunkIdx].count++;
        }
    });

    // ðŸ‘‡ CETAK KE BARIS JUMLAH & DEBIT RATA-RATA ðŸ‘‡
    const sumLimpasHEl = document.getElementById('o8-sum-limpas-h');
    const sumLimpasQEl = document.getElementById('o8-sum-limpas-q');
    const sumSalEl = document.getElementById('o8-sum-saluran');
    const sumSunEl = document.getElementById('o8-sum-sungai');
    if(sumLimpasHEl) sumLimpasHEl.innerText = sumLimpasH > 0 ? sumLimpasH.toFixed(2) : "";
    if(sumLimpasQEl) sumLimpasQEl.innerText = sumLimpasQ > 0 ? sumLimpasQ.toFixed(2) : "";
    if(sumSalEl) sumSalEl.innerText = sumSaluran > 0 ? sumSaluran.toFixed(2) : "";
    if(sumSunEl) sumSunEl.innerText = sumSungai > 0 ? sumSungai.toFixed(2) : "";

    const avgLimpasH = document.getElementById('o8-avg-limpas-h');
    const avgLimpasQ = document.getElementById('o8-avg-limpas-q');
    const avgSaluran = document.getElementById('o8-avg-saluran');
    const avgSungai = document.getElementById('o8-avg-sungai');

    // Rata-rata = Total Sum / Jumlah Hari dalam Periode
    if(avgLimpasH) avgLimpasH.innerText = sumLimpasH > 0 ? (sumLimpasH / dayCount).toFixed(2) : "";
    if(avgLimpasQ) avgLimpasQ.innerText = sumLimpasQ > 0 ? (sumLimpasQ / dayCount).toFixed(2) : "";
    if(avgSaluran) avgSaluran.innerText = sumSaluran > 0 ? (sumSaluran / dayCount).toFixed(2) : "";
    if(avgSungai) avgSungai.innerText = sumSungai > 0 ? (sumSungai / dayCount).toFixed(2) : "";

    // Terapkan Rata-rata ke Kolom Terakhir (5 Harian)
    rows.forEach(row => {
        const chunkIdx = row.getAttribute('data-chunk');
        const avgInp = row.querySelector('.o8-avg');
        if (chunks[chunkIdx] && chunks[chunkIdx].count > 0) {
            avgInp.value = (chunks[chunkIdx].sum / chunks[chunkIdx].count).toFixed(2);
        } else {
            avgInp.value = "";
        }
    });
}

async function saveForm08O() {
    const bendung = document.getElementById('o8-bendung-select').value;
    const periode = document.getElementById('o8-periode-air').value;
    if(!bendung || !periode) return showFormAlert('o8', "Pilih Bendung dan Periode!", "error");

    const rows = document.querySelectorAll('#o8-tbody tr[data-day]');
    const data = { bendung, periode, periodeUtama: findOperasiPeriodByBendungAndPeriodeAir(bendung, periode), rows: {} };
    
    const cols = ['limpas-h', 'limpas-q', 'kiri-h', 'kiri-q', 'kanan-h', 'kanan-q', 'saluran', 'sungai'];
    
    rows.forEach(row => {
        const day = row.getAttribute('data-day');
        data.rows[day] = {};
        cols.forEach(c => {
            data.rows[day][c] = row.querySelector(`input[data-col="${c}"]`).value;
        });
    });

    const key = `${bendung}_${periode}`;
    const savedData = getLS('08O_' + currentDI) || {};
    savedData[key] = withReportTimestamps(data, savedData[key]);
    setLS('08O_' + currentDI, savedData);

    let onlineSaved = false;
    try {
        onlineSaved = await saveLaporanOnline('08-O', savedData[key], {
            kategori: 'operasi',
            key_laporan: key,
            bendung,
            periode
        });
    } catch (err) {
        console.error('Gagal simpan 08-O ke Supabase:', err);
    }

    renderSavedList08O();
    
    // =========================================================
    // ðŸ‘‡ FITUR SAPU BERSIH DITAMBAHKAN DI SINI
    // =========================================================
    resetInputs08O(false); 
    
    showOperationSaveAlert('o8', `Laporan 08-O berhasil disimpan${onlineSaved ? ' ke Supabase' : ' lokal'}.`, onlineSaved ? 'success' : 'warning', data.periodeUtama || '');
    setTimeout(() => hideFormAlert('o8'), 4000);
}

function fillForm08O(data) {
    const rows = document.querySelectorAll('#o8-tbody tr[data-day]');
    const cols = ['limpas-h', 'limpas-q', 'kiri-h', 'kiri-q', 'kanan-h', 'kanan-q', 'saluran', 'sungai'];
    
    rows.forEach(row => {
        const day = row.getAttribute('data-day');
        if (data.rows[day]) {
            cols.forEach(c => {
                const inp = row.querySelector(`input[data-col="${c}"]`);
                if(inp) inp.value = data.rows[day][c] || "";
            });
        }
    });
    calc08O(); // Panggil ulang kalkulasi rata-rata
}

function renderSavedList08O() {
    const savedData = getLS('08O_' + currentDI);
    const container = document.getElementById('o8-saved-list');
    const allKeys = Object.keys(savedData).sort();
    const keys = filterOperationSavedKeys('08-O', allKeys, savedData);

    if (allKeys.length === 0) {
        container.innerHTML = `<p class="col-span-full text-center text-slate-400 italic py-8 border border-dashed rounded-xl bg-slate-50">Belum ada Laporan 08-O.</p>`;
        return;
    }
    if (keys.length === 0) return renderNoActiveOperasiMessage(container, 'Laporan 08-O');

    container.innerHTML = keys.map(k => {
        const d = savedData[k];
        return `<div class="bg-white p-4 border rounded-xl shadow-sm hover:shadow-md transition-all">
            <div class="flex items-start gap-3 mb-4">
                <div class="bg-indigo-100 text-indigo-600 p-2 rounded-lg"><i data-lucide="activity" class="w-5 h-5"></i></div>
                <div>
                    <h4 class="font-bold text-slate-800 text-sm truncate w-40">${d.bendung}</h4>
                    <p class="text-[10px] text-slate-500 font-medium">${d.periode}</p>
                </div>
            </div>
            <button onclick="edit08O('${k}')" class="w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 py-2 rounded-lg font-bold text-xs">Lihat / Edit</button>
        </div>`;
    }).join('');
    if(typeof initIcons === 'function') initIcons();
}

function edit08O(key) {
    const data = getLS('08O_' + currentDI)[key];
    if(!data) return;
    document.getElementById('o8-bendung-select').value = data.bendung;
    document.getElementById('o8-periode-air').value = data.periode;
    onChangeFilter08O();
    document.getElementById('view-blanko-operasi').scrollIntoView({behavior: 'smooth'});
}

function resetInputs08O(keepDropdown = false) {
    if(!keepDropdown) {
        document.getElementById('o8-bendung-select').value = "";
        document.getElementById('o8-periode-air').value = "";
    }
    onChangeFilter08O();
}

// ====================================================================
// --- SISTEM LOGIKA FORMULIR 09-O (PERHITUNGAN FAKTOR K) ---
// ====================================================================

// --- REVISI: GENERATOR PERIODE DINAMIS BERDASARKAN SELURUH MT DI 01-O ---
function render09O() {
    const pData = getProfilData(currentDI);
    
    // 1. Info Header
    ['di','kodeDI','pengamat','kabupaten'].forEach(id => {
        document.getElementById('o9-' + id).innerText = (id === 'di') ? currentDI : (pData[id] || "-");
    });
    
    let totalLuasDI = 0;
    if(pData.bendungs) pData.bendungs.forEach(b => { if(b.rincian) b.rincian.forEach(r => totalLuasDI += (parseFloat(r.luasFungsional)||0)); });
    document.getElementById('o9-totalLuasDI').innerText = totalLuasDI > 0 ? totalLuasDI.toFixed(2) + ' Ha' : "0 Ha";

    // 2. Dropdown Bendung (dari 01-O)
    const o1Data = getLS('01O_' + currentDI);
    const validBendungs = Object.keys(o1Data).sort();
    const selBendung = document.getElementById('o9-bendung-select');
    const currBendung = selBendung.value;
    selBendung.innerHTML = '<option value="">-- Pilih Bendung --</option>' + validBendungs.map(b => `<option value="${b}">${b}</option>`).join('');
    if(validBendungs.includes(currBendung)) selBendung.value = currBendung;

    // 3. Generate Periode (Menggabungkan Seluruh MT dari 01-O)
    const selPeriode = document.getElementById('o9-periode-air');
    const currPer = selPeriode.value;
    let optPeriode = '<option value="">-- Pilih Periode --</option>';

    // Ekstrak rentang bulan dari MT1, MT2, dan MT3 dari Bendung Pertama
    if (validBendungs.length > 0) {
        const refData = o1Data[validBendungs[0]];
        const allMTs = [refData.mt1, refData.mt2, refData.mt3].filter(Boolean);
        
        let generatedPeriods = new Set(); 

        allMTs.forEach(mtString => {
            if (mtString && mtString.includes('s/d')) {
                const parts = mtString.split('s/d').map(s => s.trim().toLowerCase());
                const monthsIndo = ['januari','februari','maret','april','mei','juni','juli','agustus','september','oktober','november','desember'];
                const monthNamesCap = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

                const parseDate = (str) => {
                    const p = str.split(' ');
                    if (p.length < 2) return null;
                    const m = monthsIndo.indexOf(p[0]);
                    const y = parseInt(p[1]);
                    if (m === -1 || isNaN(y)) return null;
                    return { abs: y * 12 + m }; 
                };

                const start = parseDate(parts[0]);
                const end = parseDate(parts[1]);

                if (start && end && start.abs <= end.abs) {
                    for (let abs = start.abs; abs <= end.abs; abs++) {
                        const y = Math.floor(abs / 12);
                        const m = abs % 12;
                        const mName = monthNamesCap[m];
                        const lastDay = new Date(y, m + 1, 0).getDate();

                        generatedPeriods.add(`1-15 ${mName} ${y}`);
                        generatedPeriods.add(`16-${lastDay} ${mName} ${y}`);
                    }
                }
            }
        });

        // Konversi Set kembali menjadi Array dan ubah menjadi tag <option>
        Array.from(generatedPeriods).forEach(periode => {
            optPeriode += `<option value="${periode}">${periode}</option>`;
        });

        if (generatedPeriods.size === 0) {
            optPeriode = '<option value="">-- Format Tanggal 01-O Tidak Dikenali --</option>';
        }
    } else {
         optPeriode = '<option value="">-- Belum ada data di 01-O --</option>';
    }

    selPeriode.innerHTML = optPeriode;
    if(currPer) selPeriode.value = currPer;

    onChangeFilter09O();
    renderSavedList09O();
    syncOperasiFormFromSupabase('09O', '09-O', renderSavedList09O);
}

function onChangeFilter09O() {
    hideFormAlert('o9');
    const bendungNama = document.getElementById('o9-bendung-select').value;
    const periodeStr = document.getElementById('o9-periode-air').value;
    
    const t1 = document.getElementById('o9-tabel-1');
    const t2 = document.getElementById('o9-tabel-2');
    const t3 = document.getElementById('o9-tabel-3');
    const t4 = document.getElementById('o9-tabel-4');

    if (!bendungNama || !periodeStr) {
        document.getElementById('o9-luasBendung').innerText = "-";
        t1.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-slate-400 italic text-xs">Pilih Bendung & Periode...</td></tr>`;
        t2.innerHTML = t3.innerHTML = t4.innerHTML = `<tr><td colspan="3" class="p-4 text-center text-slate-400 italic text-xs">Pilih Bendung & Periode...</td></tr>`;
        return;
    }

    const pData = getProfilData(currentDI);
    let luasSawah = 0;
    const bendungProfile = pData.bendungs ? pData.bendungs.find(x => x.nama === bendungNama) : null;
    if (bendungProfile && bendungProfile.rincian) bendungProfile.rincian.forEach(r => luasSawah += (parseFloat(String(r.luasFungsional).replace(',', '.')) || 0));
    document.getElementById('o9-luasBendung').innerText = luasSawah > 0 ? luasSawah.toFixed(2) : "0";

    // --- 1. MENCARI DATA 07-O (Qb) ---
    const o7Data = getLS('07O_' + currentDI);
    let dt07 = { tersier: 0, lain: 0, hilang: 0, suplesi: 0 };
    let is07Found = false;

    Object.keys(o7Data).forEach(key => {
        if (key.startsWith(bendungNama + '_') && key.endsWith('_' + periodeStr)) {
            is07Found = true;
            const data07 = o7Data[key];
            if (data07.rows) {
                Object.values(data07.rows).forEach(petak => {
                    dt07.tersier += parseFloat(petak.tersier) || 0;
                    dt07.lain += parseFloat(petak.lain) || 0;
                    dt07.suplesi += parseFloat(petak.suplesi) || 0;
                });
            }
        }
    });
    dt07.hilang = dt07.tersier * 0.20;

    // --- 2. MENCARI DATA 08-O (Qra & Q 100% Saluran) ---
    const o8Data = getLS('08O_' + currentDI);
    const key08 = `${bendungNama}_${periodeStr}`;
    let chunks08 = [];
    let qraTotal = 0;
    
    // Variabel untuk menyedot Q 100% (Debit Saluran)
    let sumSaluran08 = 0;
    const parts = periodeStr.split(' ');
    const range = parts[0].split('-');
    const dayCount = parseInt(range[1]) - parseInt(range[0]) + 1; // Menghitung total hari (15 atau 16)

    if (o8Data[key08] && o8Data[key08].rows) {
        let chunkTemp = {};
        Object.entries(o8Data[key08].rows).forEach(([day, cols]) => {
            const d = parseInt(day);
            const valSungai = parseFloat(cols.sungai); 
            const valSaluran = parseFloat(cols.saluran); 
            
            // Chunking untuk Rata-rata Sungai
            if(!isNaN(valSungai)) {
                let cIdx = d <= 15 ? Math.floor((d - 1) / 5) : Math.floor((d - 16) / 5);
                if(!chunkTemp[cIdx]) chunkTemp[cIdx] = { sum: 0, count: 0, start: d, end: d };
                chunkTemp[cIdx].sum += valSungai;
                chunkTemp[cIdx].count++;
                chunkTemp[cIdx].end = d;
            }
            
            // Total untuk Debit Saluran
            if(!isNaN(valSaluran)) sumSaluran08 += valSaluran;
        });
        
        let sumQra = 0;
        Object.values(chunkTemp).forEach(c => {
            const avg = c.sum / c.count;
            chunks08.push({ label: `${c.start}-${c.end}`, val: avg });
            sumQra += avg;
        });
        if(chunks08.length > 0) qraTotal = sumQra / chunks08.length; 
    }

    // Eksekusi kalkulasi Q 100% Saluran dan Q 70%
    const avgSaluran08 = sumSaluran08 / dayCount;
    const q100Saluran = avgSaluran08 > 0 ? avgSaluran08 : 0;
    const q70Saluran = q100Saluran * 0.7;

    // =====================================================================
    // --- RENDER TABEL 1 (Debit Diperlukan - REVISI BERSIH TANPA WARNA) ---
    // =====================================================================
    const t1Thead = document.querySelector('#o9-tabel-1').previousElementSibling;
    if(t1Thead) {
        // Tetap menggunakan header asli namun membersihkan warna background yang mencolok
        t1Thead.className = "bg-slate-50 border-b text-slate-600 text-xs";
        t1Thead.innerHTML = `
            <tr>
                <th class="p-2 border-r border-slate-200 text-center w-12">No</th>
                <th class="p-2 border-r border-slate-200 text-center w-16">Kode</th>
                <th class="p-2 border-r border-slate-200 text-center">Debit</th>
                <th class="p-2 border-r border-slate-200 text-center w-32">Jumlah ( l/det )</th>
                <th class="w-8 border-none bg-transparent"></th> <!-- Slot untuk (+) dan (-) -->
            </tr>
        `;
    }

    const t1Sum = dt07.tersier + dt07.lain + dt07.hilang;
    const qb = t1Sum - dt07.suplesi;
    
    t1.innerHTML = `
        <tr class="border-b border-slate-200 bg-white">
            <td class="p-2 border-r border-slate-200 text-center text-slate-500 font-medium">1.1.</td>
            <td class="p-2 border-r border-slate-200 font-bold text-center">Qt</td>
            <td class="p-2 border-r border-slate-200">Di pintu tersier</td>
            <td class="p-1 border-r border-slate-200"><input type="number" step="any" class="w-full text-center text-sm outline-none o9-inp font-bold" data-id="qt" value="${dt07.tersier > 0 ? dt07.tersier.toFixed(2) : ''}" oninput="calc09O()"></td>
            <td class="border-none"></td>
        </tr>
        <tr class="border-b border-slate-200 bg-white">
            <td class="p-2 border-r border-slate-200 text-center text-slate-500 font-medium">1.2.</td>
            <td class="p-2 border-r border-slate-200 font-bold text-center">Ql</td>
            <td class="p-2 border-r border-slate-200">Kep. Lain-lain</td>
            <td class="p-1 border-r border-slate-200"><input type="number" step="any" class="w-full text-center text-sm outline-none o9-inp font-bold" data-id="ql" value="${dt07.lain > 0 ? dt07.lain.toFixed(2) : ''}" oninput="calc09O()"></td>
            <td class="border-none"></td>
        </tr>
        <tr class="border-b border-slate-200 bg-white">
            <td class="p-2 border-r border-slate-200 text-center text-slate-500 font-medium">1.3.</td>
            <td class="p-2 border-r border-slate-200 font-bold text-center">Qh</td>
            <td class="p-2 border-r border-slate-200">Hilang</td>
            <td class="p-1 border-r border-slate-200"><input type="number" step="any" class="w-full text-center text-sm outline-none o9-inp font-bold" data-id="qh" value="${dt07.hilang > 0 ? dt07.hilang.toFixed(2) : ''}" oninput="calc09O()"></td>
            <td class="p-1 text-center font-black text-slate-800 border-none">(+)</td>
        </tr>
        
        <tr class="border-b border-slate-200 bg-slate-50/30">
            <td class="p-2 border-r border-slate-200 text-center text-slate-500 align-middle font-medium" rowspan="2">1.4.</td>
            <td class="p-2 border-r border-slate-200 font-bold text-center align-middle text-indigo-800" rowspan="2">Qs</td>
            <td class="p-2 border-r border-slate-200">Jumlah :</td>
            <td class="p-1 border-r border-slate-200"><input type="text" readonly class="w-full text-center text-sm outline-none font-bold text-indigo-800 bg-transparent" id="o9-t1-sum" value="${t1Sum > 0 ? t1Sum.toFixed(2) : ''}"></td>
            <td class="border-none"></td>
        </tr>
        <tr class="border-b border-slate-200 bg-slate-50/30">
            <td class="p-2 border-r border-slate-200">Suplesi :</td>
            <td class="p-1 border-r border-slate-200"><input type="number" step="any" class="w-full text-center text-sm outline-none o9-inp font-bold" data-id="qs" value="${dt07.suplesi > 0 ? dt07.suplesi.toFixed(2) : ''}" oninput="calc09O()"></td>
            <td class="p-1 text-center font-black text-slate-800 border-none">(-)</td>
        </tr>
        
        <tr class="bg-orange-50/30 border-b border-slate-200">
            <td class="p-2 border-r border-slate-200 text-center font-bold text-orange-700">1.5.</td>
            <td class="p-2 border-r border-slate-200 font-bold text-center text-orange-700">Qb</td>
            <td class="p-2 border-r border-slate-200 font-bold text-orange-700 uppercase">Di Bendung</td>
            <td class="p-1 border-r border-slate-200 relative">
                <span class="absolute left-2 top-1/2 -translate-y-1/2 text-orange-700 font-black text-[11px]">(a)</span>
                <input type="text" readonly class="w-full text-center text-sm outline-none font-black text-orange-700 bg-transparent" id="o9-qb" value="${qb > 0 ? qb.toFixed(2) : ''}">
            </td>
            <td class="border-none"></td>
        </tr>
    `;

    // --- RENDER TABEL 2 (Debit Tersedia) ---
    let t2Html = '';
    if(chunks08.length === 0) {
        t2Html = `<tr><td colspan="4" class="p-4 text-center text-red-500 italic bg-red-50 text-xs">Data Debit Sungai dari 08-O kosong. Input manual Qra di tabel bawah.</td></tr>`;
    } else {
        chunks08.forEach((c, idx) => {
            t2Html += `
            <tr class="border-b hover:bg-slate-50 transition-colors">
                <td class="p-2 border-r text-center text-slate-500 font-medium">${idx + 1}</td>
                <td class="p-2 border-r text-center font-medium">${c.label}</td>
                <td class="p-2 border-r text-center font-bold text-blue-700">${c.val.toFixed(2)}</td>
                <td class="p-2 text-center text-sm font-black text-emerald-600 bg-emerald-50/30" id="o9-k${idx+1}">-</td>
            </tr>`;
        });
    }
    t2.innerHTML = t2Html;

    // =====================================================================
    // --- RENDER TABEL 3 (Debit Dialirkan - REVISI FORMAT GAMBAR 2) ---
    // =====================================================================
    const t3Thead = document.querySelector('#o9-tabel-3').previousElementSibling;
    if(t3Thead) {
        t3Thead.className = "bg-slate-50 border-b text-slate-600 text-xs";
        t3Thead.innerHTML = `
            <tr>
                <th class="p-2 border-r border-slate-200 text-center align-middle" colspan="2">N e r a c a</th>
                <th class="p-2 border-r border-slate-200 text-center align-middle w-32">Debit dialirkan (Qa)</th>
                <th class="p-2 border-slate-200 text-center align-middle" colspan="2">Batas Normal</th>
            </tr>
            <tr>
                <th class="p-2 border-r border-t border-slate-200 text-center text-xs font-medium bg-slate-50">Debit</th>
                <th class="p-2 border-r border-t border-slate-200 text-center text-[10px] font-medium bg-slate-50">( l/det )</th>
                <th class="p-2 border-r border-t border-slate-200 text-center text-[10px] font-medium bg-slate-50">( l/det )</th>
                <th class="p-2 border-r border-t border-slate-200 text-center text-[10px] font-medium bg-slate-50">( l/det )</th>
                <th class="p-2 border-t border-slate-200 text-center text-xs font-medium bg-slate-50">Debit</th>
            </tr>
        `;
    }

    t3.innerHTML = `
        <tr class="border-b border-slate-200 bg-white">
            <td class="p-2 border-r border-slate-200 text-slate-800 font-medium text-sm">Tersedia (Qra) (b)</td>
            <td class="p-1 border-r border-slate-200 bg-blue-50/50">
                <input type="text" readonly class="w-full text-center text-sm font-bold text-blue-700 bg-transparent outline-none cursor-not-allowed" id="o9-qra" value="${qraTotal > 0 ? qraTotal.toFixed(2) : ''}">
            </td>
            <td class="p-1 border-r border-slate-200 align-middle bg-indigo-50/50" rowspan="2">
                <input type="text" readonly class="w-full text-center text-xl font-black text-indigo-700 bg-transparent outline-none" id="o9-qa">
            </td>
            <td class="p-1 border-r border-slate-200 bg-slate-50/50">
                <input type="text" readonly class="w-full text-center text-sm font-bold bg-transparent outline-none cursor-not-allowed" id="o9-batas-100" value="${q100Saluran > 0 ? q100Saluran.toFixed(2) : ''}">
            </td>
            <td class="p-2 text-center text-slate-700 text-[11px] font-bold">Q 100% Saluran</td>
        </tr>
        <tr class="border-b border-slate-200 bg-white">
            <td class="p-2 border-r border-slate-200 text-slate-800 font-medium text-sm">Diperlukan (Qb) (a)</td>
            <td class="p-1 border-r border-slate-200 bg-orange-50/50">
                <input type="text" readonly class="w-full text-center text-sm font-bold text-orange-700 bg-transparent outline-none cursor-default" id="o9-qb-copy">
            </td>
            <td class="p-1 border-r border-slate-200 bg-slate-50/50">
                <input type="text" readonly class="w-full text-center text-sm font-bold bg-transparent outline-none cursor-not-allowed" id="o9-batas-70" value="${q70Saluran > 0 ? q70Saluran.toFixed(2) : ''}">
            </td>
            <td class="p-2 text-center text-slate-700 text-[11px] font-bold">Q 70% Saluran</td>
        </tr>
        <tr>
            <td colspan="5" class="p-2 text-center" id="o9-status-air"></td>
        </tr>
    `;

    // =====================================================================
    // --- RENDER TABEL 4 (Perhitungan Faktor K - REVISI FORMAT GAMBAR 2) ---
    // =====================================================================
    const t4Thead = document.querySelector('#o9-tabel-4').previousElementSibling;
    if(t4Thead) {
        t4Thead.className = "bg-slate-50 border-b text-slate-600 text-xs";
        t4Thead.innerHTML = `
            <tr>
                <th class="p-2 border-r border-slate-200 text-center w-12">No</th>
                <th class="p-2 border-r border-slate-200 text-center w-16">Kode</th>
                <th class="p-2 border-r border-slate-200 text-center">Debit (l/det)</th>
                <th class="p-2 border-slate-200 text-center w-40">Total Debit ( l/det )</th>
            </tr>
        `;
    }

    t4.innerHTML = `
        <tr class="border-b border-slate-200 bg-white">
            <td class="p-2 border-r border-slate-200 text-center text-slate-500 font-medium">4.1.</td>
            <td class="p-2 border-r border-slate-200 font-bold text-center text-indigo-700">(Qa)</td>
            <td class="p-1 border-r border-slate-200 bg-indigo-50/30">
                <input type="text" readonly class="w-full text-center text-sm font-bold text-indigo-700 bg-transparent outline-none" id="o9-qa-copy">
            </td>
            <td class="p-2 text-center align-middle bg-slate-50/30 font-bold border-slate-200" rowspan="2">
                <div class="flex items-center justify-between px-2">
                    <span class="text-[10px] font-black text-slate-400">( c )</span>
                    <span id="o9-qa-qs" class="text-indigo-800 font-black text-base"></span>
                </div>
            </td>
        </tr>
        <tr class="border-b border-slate-200 bg-white">
            <td class="p-2 border-r border-slate-200 text-center text-slate-500 font-medium">4.2.</td>
            <td class="p-2 border-r border-slate-200 font-bold text-center text-slate-800">Qs</td>
            <td class="p-1 border-r border-slate-200">
                <input type="text" readonly class="w-full text-center text-sm bg-transparent outline-none" id="o9-qs-copy">
            </td>
        </tr>
        <tr class="border-b border-slate-200 bg-white">
            <td class="p-2 border-r border-slate-200 text-center text-slate-500 font-medium">4.3.</td>
            <td class="p-2 border-r border-slate-200 font-bold text-center text-slate-800">Ql</td>
            <td class="p-1 border-r border-slate-200">
                <input type="text" readonly class="w-full text-center text-sm bg-transparent outline-none" id="o9-ql-copy">
            </td>
            <td class="p-2 text-center align-middle bg-slate-50/30 font-bold border-slate-200" rowspan="2">
                <div class="flex items-center justify-between px-2">
                    <span class="text-[10px] font-black text-slate-400">( d )</span>
                    <span id="o9-ql-qh" class="text-slate-800 font-black text-base"></span>
                </div>
            </td>
        </tr>
        <tr class="border-b border-slate-200 bg-white">
            <td class="p-2 border-r border-slate-200 text-center text-slate-500 font-medium">4.4.</td>
            <td class="p-2 border-r border-slate-200 font-bold text-center text-slate-800">Qh</td>
            <td class="p-1 border-r border-slate-200">
                <input type="text" readonly class="w-full text-center text-sm bg-transparent outline-none" id="o9-qh-copy">
            </td>
        </tr>
        <tr class="border-b border-slate-200 bg-orange-50/20">
            <td class="p-2 border-r border-slate-200 text-center text-slate-500 font-medium">4.5.</td>
            <td class="p-2 border-r border-slate-200 text-xs font-bold text-slate-800" colspan="2">Selisih = ( c ) - ( d )</td>
            <td class="p-1">
                <input type="text" readonly class="w-full text-center text-sm font-black text-orange-700 bg-transparent outline-none" id="o9-selisih">
            </td>
        </tr>
        <tr class="border-b border-slate-200 bg-white">
            <td class="p-2 border-r border-slate-200 text-center text-slate-500 font-medium">4.6.</td>
            <td class="p-2 border-r border-slate-200 font-bold text-center text-slate-800">Qt</td>
            <td class="p-1 border-r border-slate-200 bg-slate-50/30"></td>
            <td class="p-1">
                <input type="text" readonly class="w-full text-center text-sm font-bold text-slate-800 bg-transparent outline-none" id="o9-qt-copy">
            </td>
        </tr>
        <tr class="bg-emerald-50 border-b border-slate-200">
            <td class="p-3 border-r border-slate-200 text-center align-middle" colspan="3">
                <div class="flex items-center justify-center gap-4">
                    <span class="font-black text-emerald-900 text-sm uppercase tracking-widest">Faktor - K =</span>
                    <div class="flex flex-col items-center">
                        <span class="text-[10px] font-bold border-b-2 border-emerald-900 px-4 pb-0.5 text-emerald-900">4.5</span>
                        <span class="text-[10px] font-bold pt-0.5 text-emerald-900">4.6</span>
                    </div>
                </div>
            </td>
            <td class="p-2">
                <input type="text" readonly class="w-full text-center text-2xl font-black text-emerald-700 bg-transparent outline-none" id="o9-faktor-k">
            </td>
        </tr>
    `;

    // Load override data dari LocalStorage jika user pernah save
    const key = `${bendungNama}_${periodeStr}`;
    const saved = getLS('09O_' + currentDI)[key];
    if(saved) {
        if(saved.qt) document.querySelector('.o9-inp[data-id="qt"]').value = saved.qt;
        if(saved.ql) document.querySelector('.o9-inp[data-id="ql"]').value = saved.ql;
        if(saved.qh) document.querySelector('.o9-inp[data-id="qh"]').value = saved.qh;
        if(saved.qs) document.querySelector('.o9-inp[data-id="qs"]').value = saved.qs;
        // batas100 dan batas70 tidak diload manual lagi karena sudah dilock ke 08-O
    }

    if(typeof initIcons === 'function') initIcons();
    calc09O();
}

function calc09O() {
    const getVal = (id) => parseFloat(document.querySelector(`.o9-inp[data-id="${id}"]`).value) || 0;
    
    // TABEL 1
    const qt = getVal('qt');
    const ql = getVal('ql');
    const qh = getVal('qh');
    const qs = getVal('qs');
    
    const t1Sum = qt + ql + qh;
    const qb = t1Sum - qs;
    
    const setEl = (id, val) => { const el = document.getElementById(id); if(el) el.value = val > 0 || val < 0 ? val.toFixed(2) : (val===0 ? "0" : ""); };
    const setTxt = (id, val) => { const el = document.getElementById(id); if(el) el.innerText = val > 0 || val < 0 ? val.toFixed(2) : (val===0 ? "0" : ""); };

    setEl('o9-t1-sum', t1Sum);
    setEl('o9-qb', qb);
    setEl('o9-qb-copy', qb);

    // TABEL 3
    const qra = parseFloat(document.getElementById('o9-qra')?.value) || 0;
    const qa = Math.min(qra, qb); // Debit dialirkan = terkecil antara tersedia dan diperlukan
    setEl('o9-qa', qa);

    // Logika Status Giliran / Terus Menerus
    const q100El = document.getElementById('o9-batas-100');
    const q70El = document.getElementById('o9-batas-70');
    const statusEl = document.getElementById('o9-status-air');
    
    if (q100El && q70El && statusEl) {
        const q100 = parseFloat(q100El.value) || 0;
        const q70 = parseFloat(q70El.value) || 0;
        const q60 = q100 * 0.6;

        if (q100 > 0) {
            if (qa < q60) {
                statusEl.innerHTML = `<div class="bg-red-50 text-red-700 p-1.5 rounded border border-red-200 font-bold text-xs"><i data-lucide="alert-triangle" class="w-3 h-3 inline mr-1"></i> Sistem Pemberian Air: GILIRAN (Qa < 60%)</div>`;
            } else if (qa >= q70) {
                statusEl.innerHTML = `<div class="bg-emerald-50 text-emerald-700 p-1.5 rounded border border-emerald-200 font-bold text-xs"><i data-lucide="check-circle" class="w-3 h-3 inline mr-1"></i> Sistem Pemberian Air: TERUS MENERUS</div>`;
            } else {
                statusEl.innerHTML = `<div class="bg-orange-50 text-orange-700 p-1.5 rounded border border-orange-200 font-bold text-xs"><i data-lucide="info" class="w-3 h-3 inline mr-1"></i> Sistem Pemberian Air: TERUS MENERUS (Mendekati Batas Giliran)</div>`;
            }
        } else {
            statusEl.innerHTML = ``;
        }
        if(typeof initIcons === 'function') initIcons();
    }

    // TABEL 4
    setEl('o9-qs-copy', qs);
    setEl('o9-ql-copy', ql);
    setEl('o9-qh-copy', qh);
    setEl('o9-qt-copy', qt);
    setEl('o9-qa-copy', qa);

    const qa_qs = qa + qs;
    const ql_qh = ql + qh;
    setTxt('o9-qa-qs', qa_qs);
    setTxt('o9-ql-qh', ql_qh);

    const selisih = qa_qs - ql_qh;
    setEl('o9-selisih', selisih);

    let faktorK = 0;
    if (qt > 0) faktorK = selisih / qt;
    if (faktorK < 0) faktorK = 0; // K tidak boleh negatif
    
    setEl('o9-faktor-k', faktorK);

    for(let i=1; i<=4; i++) {
        const kEl = document.getElementById(`o9-k${i}`);
        if(kEl) kEl.innerText = faktorK.toFixed(2);
    }
}

// ====================================================================
// REVISI: Fungsi Simpan 09-O (Ditambah Fitur Reset Form)
// ====================================================================
async function saveForm09O() {
    const bendung = document.getElementById('o9-bendung-select').value;
    const periode = document.getElementById('o9-periode-air').value;
    
    // Validasi input wajib
    if(!bendung || !periode) return showFormAlert('o9', "Pilih Bendung dan Periode terlebih dahulu!", "error");

    const getVal = (id) => document.querySelector(`.o9-inp[data-id="${id}"]`)?.value || "";

    const data = {
        bendung, 
        periode,
        periodeUtama: findOperasiPeriodByBendungAndPeriodeAir(bendung, periode),
        qt: getVal('qt'), 
        ql: getVal('ql'), 
        qh: getVal('qh'), 
        qs: getVal('qs'),
        qra: document.getElementById('o9-qra')?.value || "",
        batas100: document.getElementById('o9-batas-100')?.value || "",
        batas70: document.getElementById('o9-batas-70')?.value || "",
        k: document.getElementById('o9-faktor-k')?.value || ""
    };

    const key = `${bendung}_${periode}`;
    const savedData = getLS('09O_' + currentDI);
    savedData[key] = withReportTimestamps(data, savedData[key]);
    setLS('09O_' + currentDI, savedData);

    let onlineSaved = false;
    try {
        onlineSaved = await saveLaporanOnline('09-O', savedData[key], {
            kategori: 'operasi',
            key_laporan: key,
            bendung,
            periode
        });
    } catch (err) {
        console.error('Gagal simpan 09-O ke Supabase:', err);
    }

    renderSavedList09O();
    
    // ðŸ‘‡ FITUR SAPU BERSIH: Kosongkan form setelah disimpan
    resetInputs09O(false); 
    
    showOperationSaveAlert('o9', `Laporan Evaluasi Faktor-K (09-O) berhasil disimpan${onlineSaved ? ' ke Supabase' : ' lokal'}.`, onlineSaved ? 'success' : 'warning', data.periodeUtama || '');
    setTimeout(() => hideFormAlert('o9'), 4000);
}

function renderSavedList09O() {
    const savedData = getLS('09O_' + currentDI);
    const container = document.getElementById('o9-saved-list');
    const allKeys = Object.keys(savedData).sort();
    const keys = filterOperationSavedKeys('09-O', allKeys, savedData);

    if (allKeys.length === 0) {
        container.innerHTML = `<p class="col-span-full text-center text-slate-400 italic py-8 border border-dashed rounded-xl bg-slate-50">Belum ada Laporan 09-O.</p>`;
        return;
    }
    if (keys.length === 0) return renderNoActiveOperasiMessage(container, 'Laporan 09-O');

    container.innerHTML = keys.map(k => {
        const d = savedData[k];
        return `<div class="bg-white p-4 border rounded-xl shadow-sm hover:shadow-md transition-all relative">
            <div class="absolute top-4 right-4 bg-emerald-100 text-emerald-800 font-black text-sm px-2 py-1 rounded-md">K: ${d.k || '-'}</div>
            <div class="flex items-start gap-3 mb-4">
                <div class="bg-indigo-100 text-indigo-600 p-2 rounded-lg"><i data-lucide="calculator" class="w-5 h-5"></i></div>
                <div class="pr-10">
                    <h4 class="font-bold text-slate-800 text-sm truncate">${d.bendung}</h4>
                    <p class="text-[10px] text-slate-500 font-medium">${d.periode}</p>
                </div>
            </div>
            <button onclick="edit09O('${k}')" class="w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 py-2 rounded-lg font-bold text-xs">Lihat / Edit</button>
        </div>`;
    }).join('');
    if(typeof initIcons === 'function') initIcons();
}

function edit09O(key) {
    const data = getLS('09O_' + currentDI)[key];
    if(!data) return;
    document.getElementById('o9-bendung-select').value = data.bendung;
    document.getElementById('o9-periode-air').value = data.periode;
    onChangeFilter09O();
    document.getElementById('view-blanko-operasi').scrollIntoView({behavior: 'smooth'});
}

function resetInputs09O(keepDropdown = false) {
    if(!keepDropdown) {
        document.getElementById('o9-bendung-select').value = "";
        document.getElementById('o9-periode-air').value = "";
    }
    onChangeFilter09O();
}

// ====================================================================
// --- SISTEM LOGIKA FORMULIR 10-O (REVISI AKUMULASI D.I) ---
// ====================================================================

const MONTH_NAMES_10O = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

function getMonthIndexFromText10O(value) {
    const lower = String(value || '').toLowerCase();
    const startText = lower.split('s/d')[0].trim();
    const foundStart = MONTH_NAMES_10O.findIndex(month => new RegExp(`\\b${month.toLowerCase()}\\b`).test(startText));
    if (foundStart >= 0) return foundStart;

    const foundAny = lower.match(/\b(januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember)\b/);
    return foundAny ? MONTH_NAMES_10O.findIndex(month => month.toLowerCase() === foundAny[1]) : -1;
}

function getActive01OReportFor10O(preferredPeriod = '') {
    const o1Data = getLS('01O_' + currentDI) || {};
    const reports = Object.keys(o1Data)
        .map(key => ({ key, data: o1Data[key] || {} }))
        .filter(item => item.data && item.data.periode);

    if (preferredPeriod) {
        const matched = reports.find(item => item.data.periode === preferredPeriod);
        if (matched) return matched.data;
    }

    return reports.sort((a, b) => {
        const dateA = new Date(a.data.updatedAt || a.data.createdAt || a.data.timestamp || 0).getTime() || 0;
        const dateB = new Date(b.data.updatedAt || b.data.createdAt || b.data.timestamp || 0).getTime() || 0;
        if (dateA !== dateB) return dateB - dateA;
        return a.key.localeCompare(b.key);
    })[0]?.data || {};
}

function getStartMonthIndex10O(preferredPeriod = '') {
    const report01 = getActive01OReportFor10O(preferredPeriod);
    const mt1Text = report01.mt1 || (report01.table && report01.table[0] ? report01.table[0].tglMt1 : '');
    const found = getMonthIndexFromText10O(mt1Text);
    return found >= 0 ? found : 5;
}

function buildPeriods10O(preferredPeriod = '') {
    const startMonthIdx = getStartMonthIndex10O(preferredPeriod);
    const periods = [];
    for(let i=0; i<12; i++) {
        const m = (startMonthIdx + i) % 12;
        periods.push({ mName: MONTH_NAMES_10O[m], label: `${MONTH_NAMES_10O[m]} I`, part: 'I', key: `${m}-1` });
        periods.push({ mName: MONTH_NAMES_10O[m], label: `${MONTH_NAMES_10O[m]} II`, part: 'II', key: `${m}-2` });
    }
    return periods;
}

function render10O() {
    const pData = getProfilData(currentDI);
    
    // 1. Info Header
    ['di','kodeDI','pengamat','kabupaten'].forEach(id => {
        document.getElementById('o10-' + id).innerText = (id === 'di') ? currentDI : (pData[id] || "-");
    });
    
    // Total Luas Sawah D.I (Akumulasi Semua Bendung)
    let totalLuasDI = 0;
    if(pData.bendungs) pData.bendungs.forEach(b => { if(b.rincian) b.rincian.forEach(r => totalLuasDI += (parseFloat(r.luasFungsional)||0)); });
    document.getElementById('o10-totalLuasDI').innerText = totalLuasDI > 0 ? totalLuasDI.toFixed(2) : "0"; // Hilangkan string ' Ha' agar mudah di-parse nanti

    // 2. Ambil Periode Tanam Aktif dari 01-O
    const active01O = getActive01OReportFor10O();
    let periodeStr = "-";
    if (active01O.periode) {
        periodeStr = active01O.periode;
    }
    document.getElementById('o10-periodeText').innerText = periodeStr;

    onChangeFilter10O();
    renderSavedList10O();
    syncOperasiFormFromSupabase('10O', '10-O', renderSavedList10O);
}

// ====================================================================
// 1. REVISI: Fungsi Filter (MENYEGEL TOTAL SELURUH TABEL 10-O)
// ====================================================================
function onChangeFilter10O(isEditMode = false) {
    hideFormAlert('o10');
    const tbody = document.getElementById('o10-tbody');
    const tfoot = document.getElementById('o10-tfoot');
    const extraSection = document.getElementById('o10-extra-section');
    const periodeStr = document.getElementById('o10-periodeText').innerText;

    if (periodeStr === "-") {
        tbody.innerHTML = '<tr><td colspan="24" class="p-8 text-center text-slate-400 italic">Periode Tanam Aktif belum diatur di 01-O. Isi 01-O terlebih dahulu...</td></tr>';
        tfoot.classList.add('hidden');
        if (extraSection) extraSection.classList.add('hidden');
        return;
    }

    const savedData = getLS('10O_' + currentDI);
    if (savedData[periodeStr] && !isEditMode) {
        tbody.innerHTML = `
            <tr>
                <td colspan="24" class="p-12 text-center bg-indigo-50/30">
                    <div class="flex flex-col items-center justify-center">
                        <div class="bg-indigo-100 text-indigo-600 p-4 rounded-full mb-4 shadow-sm border border-indigo-200">
                            <i data-lucide="shield-check" class="w-10 h-10"></i>
                        </div>
                        <h4 class="text-lg font-black text-slate-800 mb-2 uppercase tracking-wide">Laporan Telah Tersimpan</h4>
                        <p class="text-sm text-slate-600 mb-5 max-w-md">Laporan Rekapitulasi Tahunan 10-O untuk periode <strong>${periodeStr}</strong> sudah diamankan di dalam brankas.</p>
                        <div class="bg-white px-5 py-3 rounded-lg border border-slate-200 shadow-sm flex flex-col gap-2">
                            <p class="text-xs text-slate-600 font-medium">
                                <span class="inline-block w-4 h-4 bg-indigo-100 text-indigo-600 rounded text-center leading-4 mr-1">1</span>
                                Klik tombol <strong class="text-indigo-700">"Lihat / Edit"</strong> pada Arsip Laporan di bawah untuk melihat tabel.
                            </p>
                            <p class="text-xs text-slate-600 font-medium">
                                <span class="inline-block w-4 h-4 bg-emerald-100 text-emerald-600 rounded text-center leading-4 mr-1">2</span>
                                Atau klik <strong class="text-emerald-700">"Tarik & Akumulasi Otomatis"</strong> di atas untuk menimpa data.
                            </p>
                        </div>
                    </div>
                </td>
            </tr>`;
        tfoot.classList.add('hidden');
        if (extraSection) extraSection.classList.add('hidden');
        if (typeof initIcons === 'function') initIcons();
        return; 
    }

    tfoot.classList.remove('hidden');
    if (extraSection) extraSection.classList.remove('hidden');

    let periods = buildPeriods10O(periodeStr);

    let tbHtml = '';
    periods.forEach((p, idx) => {
        const bgClass = idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50';
        
        tbHtml += `<tr class="border-b hover:bg-slate-100 transition-colors ${bgClass}" data-row="${p.key}">
            <td class="p-2 border-r font-bold text-slate-700 bg-slate-100 text-center whitespace-nowrap" style="left: 0; position: sticky; z-index: 10;">
                ${p.mName} ${p.part}
            </td>
            
            <!-- ðŸ‘‡ ZONA REALISASI TANAM (DISEGEL TOTAL) ðŸ‘‡ -->
            <td class="p-0.5 border-r"><input type="text" readonly class="inp-tbl-calc w-14 text-center text-slate-700 bg-slate-50/30 cursor-not-allowed o10-inp" data-col="padi-1"></td>
            <td class="p-0.5 border-r"><input type="text" readonly class="inp-tbl-calc w-14 text-center text-slate-700 bg-slate-50/30 cursor-not-allowed o10-inp" data-col="padi-2i"></td>
            <td class="p-0.5 border-r bg-emerald-50/30"><input type="text" readonly class="inp-tbl-calc w-14 text-center text-slate-700 bg-transparent cursor-not-allowed o10-inp" data-col="padi-2t"></td>
            <td class="p-0.5 border-r"><input type="text" readonly class="inp-tbl-calc w-14 text-center text-slate-700 bg-slate-50/30 cursor-not-allowed o10-inp" data-col="padi-3"></td>
            <td class="p-0.5 border-r"><input type="text" readonly class="inp-tbl-calc w-14 text-center text-slate-700 bg-slate-50/30 cursor-not-allowed o10-inp" data-col="pala-1"></td>
            <td class="p-0.5 border-r"><input type="text" readonly class="inp-tbl-calc w-14 text-center text-slate-700 bg-slate-50/30 cursor-not-allowed o10-inp" data-col="pala-2"></td>
            <td class="p-0.5 border-r"><input type="text" readonly class="inp-tbl-calc w-14 text-center text-slate-700 bg-slate-50/30 cursor-not-allowed o10-inp" data-col="pala-3"></td>
            <td class="p-0.5 border-r"><input type="text" readonly class="inp-tbl-calc w-14 text-center text-slate-700 bg-slate-50/30 cursor-not-allowed o10-inp" data-col="tebu"></td>
            <td class="p-0.5 border-r"><input type="text" readonly class="inp-tbl-calc w-14 text-center text-slate-700 bg-slate-50/30 cursor-not-allowed o10-inp" data-col="lain"></td>
            <td class="p-0.5 border-r"><input type="text" readonly class="inp-tbl-calc w-14 text-center font-bold text-emerald-700 bg-emerald-50/50 cursor-not-allowed" data-col="jumlah"></td>
            <td class="p-0.5 border-r-4 border-slate-300"><input type="text" readonly class="inp-tbl-calc w-14 text-center font-bold text-orange-700 bg-orange-50/50 cursor-not-allowed" data-col="bero"></td>
            
            <!-- ðŸ‘‡ ZONA KEADAAN AIR (DISEGEL TOTAL) ðŸ‘‡ -->
            <td class="p-0.5 border-r"><input type="text" readonly class="inp-tbl-calc w-14 text-center text-slate-700 bg-slate-50/30 cursor-not-allowed o10-inp-air" data-col="q-tersedia"></td>
            <td class="p-0.5 border-r"><input type="text" readonly class="inp-tbl-calc w-14 text-center font-bold text-blue-800 bg-blue-50/50 cursor-not-allowed" data-col="q-ambil"></td>
            <td class="p-0.5 border-r"><input type="text" readonly class="inp-tbl-calc w-14 text-center font-bold text-blue-800 bg-blue-50/50 cursor-not-allowed" data-col="q-limpas"></td>
            <td class="p-0.5 border-r"><input type="text" readonly class="inp-tbl-calc w-14 text-center font-bold text-indigo-800 bg-indigo-50/50 cursor-not-allowed" data-col="q-hilang"></td>
            <td class="p-0.5 border-r"><input type="text" readonly class="inp-tbl-calc w-14 text-center text-slate-700 bg-slate-50/30 cursor-not-allowed o10-inp-air" data-col="q-suplesi"></td>
            <td class="p-0.5 border-r"><input type="text" readonly class="inp-tbl-calc w-14 text-center text-slate-700 bg-slate-50/30 cursor-not-allowed o10-inp-air" data-col="keb-tersier"></td>
            <td class="p-0.5 border-r"><input type="text" readonly class="inp-tbl-calc w-14 text-center text-slate-700 bg-slate-50/30 cursor-not-allowed o10-inp-air" data-col="keb-lain"></td>
            <td class="p-0.5 border-r"><input type="text" readonly class="inp-tbl-calc w-14 text-center font-bold text-amber-700 bg-yellow-50/50 cursor-not-allowed o10-inp-air" data-col="faktor-k"></td>
            <td class="p-0.5 border-r"><input type="text" readonly class="inp-tbl-calc w-14 text-center font-bold text-indigo-800 bg-indigo-50/50 cursor-not-allowed" data-col="q-rencana"></td>
            <td class="p-0.5 border-r"><input type="text" readonly class="inp-tbl-calc w-14 text-center text-slate-700 bg-slate-50/30 cursor-not-allowed o10-inp-air" data-col="hujan"></td>
            <td class="p-0.5 border-r"><input type="text" readonly class="inp-tbl-calc w-14 text-center font-bold text-emerald-700 bg-emerald-50/50 cursor-not-allowed" data-col="neraca"></td>
            <td class="p-0.5"><input type="text" readonly class="inp-tbl-calc w-14 text-center font-bold text-indigo-700 bg-indigo-50/50 cursor-not-allowed" data-col="rasio"></td>
        </tr>`;
    });

    tbody.innerHTML = tbHtml;

    if(savedData[periodeStr] && isEditMode) fillForm10O(savedData[periodeStr]);
    document.querySelectorAll('.o10-extra-inp').forEach(inp => {
        inp.removeEventListener('input', calc10O);
        inp.addEventListener('input', calc10O);
    });
    calc10O();
}

// ====================================================================
// 3. REVISI: Auto Akumulasi (Realisasi Tanam MURNI dari 04-O)
// ====================================================================
async function autoAkumulasi10O() {
    
    // ðŸ‘‡ Panggil Modal Modern dengan perintah 'await'
    const isConfirmed = await showModernConfirm(
        "Tarik Akumulasi Otomatis?",
        "Fitur ini akan menarik otomatis data REALISASI dari 04-O, serta data AIR dari 07-O, 08-O, dan 09-O. Data lama di tabel 10-O akan tertimpa. Lanjutkan?"
    );

    // ðŸ‘‡ Jika user klik 'Batal', hentikan operasi
    if (!isConfirmed) return;

    // Paksa render tabel kosong terlebih dahulu sebelum mengisi
    onChangeFilter10O(true);

    const monthNames = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
    const getRowKey = (periodeStr) => {
        if(!periodeStr) return null;
        const parts = periodeStr.split(' ');
        if(parts.length < 2) return null;
        const part1 = parts[0]; 
        const monthStr = parts[1];
        const mIdx = monthNames.indexOf(monthStr);
        if(mIdx === -1) return null;
        return `${mIdx}-${part1.startsWith("1-") ? 1 : 2}`;
    };

    const o4 = getLS('04O_' + currentDI);
    const o7 = getLS('07O_' + currentDI);
    const o8 = getLS('08O_' + currentDI); // Panggil brankas 08-O
    const o9 = getLS('09O_' + currentDI);

    document.querySelectorAll('.o10-inp, .o10-inp-air').forEach(inp => inp.value = "");

    let akumulasiData = {};

    // 1. TARIK REALISASI (04-O)
    Object.values(o4).forEach(rep => {
        const rKey = getRowKey(rep.periode || rep.periodeAir);
        if(!rKey) return;
        if(!akumulasiData[rKey]) akumulasiData[rKey] = {};
        const d = akumulasiData[rKey];

        const realPadi = parseFloat(rep.real[0]) || 0;
        const realGaduTdkIzin = parseFloat(rep.real[4]) || 0;
        const realPala = parseFloat(rep.real[3]) || 0;
        const realTebu = (parseFloat(rep.real[1]) || 0) + (parseFloat(rep.real[2]) || 0);
        const realLain = parseFloat(rep.real[5]) || 0;

        if(rep.mt === 'MT1') {
            d['padi-1'] = (d['padi-1'] || 0) + realPadi;
            d['pala-1'] = (d['pala-1'] || 0) + realPala;
        } else if(rep.mt === 'MT2') {
            d['padi-2i'] = (d['padi-2i'] || 0) + realPadi;
            d['padi-2t'] = (d['padi-2t'] || 0) + realGaduTdkIzin;
            d['pala-2'] = (d['pala-2'] || 0) + realPala;
        } else if(rep.mt === 'MT3') {
            d['padi-3'] = (d['padi-3'] || 0) + realPadi + realGaduTdkIzin; 
            d['pala-3'] = (d['pala-3'] || 0) + realPala;
        }

        d['tebu'] = (d['tebu'] || 0) + realTebu;
        d['lain'] = (d['lain'] || 0) + realLain;
    });

    // 2. TARIK KEBUTUHAN & TARGET RENCANA (07-O)
    Object.values(o7).forEach(rep => {
        const rKey = getRowKey(rep.periode);
        if(!rKey || !rep.rows) return;
        if(!akumulasiData[rKey]) akumulasiData[rKey] = {};
        const d = akumulasiData[rKey];

        Object.values(rep.rows).forEach(bendung => {
            d['keb-tersier'] = (d['keb-tersier']||0) + (parseFloat(bendung.tersier) || 0);
            d['keb-lain'] = (d['keb-lain']||0) + (parseFloat(bendung.lain) || 0);
            d['q-suplesi'] = (d['q-suplesi']||0) + (parseFloat(bendung.suplesi) || 0);
            // Debit Rencana (Target Debit Saluran) diambil dari kolom 'diberikan' di 07-O
            d['q-rencana'] = (d['q-rencana']||0) + (parseFloat(bendung.diberikan) || 0); 
        });
    });

    // ðŸ‘‡ 3. TARIK RATA-RATA PENGAMBILAN & LIMPAS (08-O) ðŸ‘‡
    Object.values(o8).forEach(rep => {
        const rKey = getRowKey(rep.periode);
        if(!rKey || !rep.rows) return;
        if(!akumulasiData[rKey]) akumulasiData[rKey] = {};
        const d = akumulasiData[rKey];

        let sumSaluran = 0;
        let sumLimpas = 0;
        let count = 0;

        // Hitung total harian selama periode tersebut untuk mencari rata-rata
        Object.values(rep.rows).forEach(row => {
            sumSaluran += (parseFloat(row.saluran) || 0);
            sumLimpas += (parseFloat(row['limpas-q']) || 0);
            count++;
        });

        if (count > 0) {
            d['q-ambil'] = (d['q-ambil'] || 0) + (sumSaluran / count);
            d['q-limpas'] = (d['q-limpas'] || 0) + (sumLimpas / count);
        }
    });

    // 4. TARIK DEBIT TERSEDIA & FAKTOR K (09-O)
    Object.values(o9).forEach(rep => {
        const rKey = getRowKey(rep.periode);
        if(!rKey) return;
        if(!akumulasiData[rKey]) akumulasiData[rKey] = {};
        const d = akumulasiData[rKey];

        d['q-tersedia'] = (d['q-tersedia']||0) + (parseFloat(rep.qra) || 0);
        
        if(!d['k_sum']) d['k_sum'] = 0;
        if(!d['k_count']) d['k_count'] = 0;
        const kVal = parseFloat(rep.k);
        if(!isNaN(kVal)) { d['k_sum'] += kVal; d['k_count']++; }
        d['faktor-k'] = d['k_count'] > 0 ? (d['k_sum']/d['k_count']) : 0;
    });

    // CETAK HASIL AKUMULASI KE TABEL HTML
    Object.keys(akumulasiData).forEach(rKey => {
        const row = document.querySelector(`#o10-tbody tr[data-row="${rKey}"]`);
        if(row) {
            const d = akumulasiData[rKey];
            // Tambahkan q-ambil, q-limpas, dan q-rencana ke daftar cetak
            ['padi-1','padi-2i','padi-2t','padi-3','pala-1','pala-2','pala-3','tebu','lain',
             'keb-tersier','keb-lain','q-suplesi','q-tersedia','q-ambil','q-limpas','q-rencana'].forEach(col => {
                if(d[col] !== undefined) row.querySelector(`input[data-col="${col}"]`).value = d[col].toFixed(2);
            });
            if(d['faktor-k']) row.querySelector(`input[data-col="faktor-k"]`).value = d['faktor-k'].toFixed(2);
        }
    });

    calc10O();
    showFormAlert('o10', "Sukses! Seluruh data Realisasi & Hidrologi telah diakumulasi otomatis.", "success");
    setTimeout(() => hideFormAlert('o10'), 5000);
}

function calc10O() {
    const luasStr = document.getElementById('o10-totalLuasDI').innerText;
    const luasSawah = parseFloat(luasStr) || 0;

    const rows = document.querySelectorAll('#o10-tbody tr[data-row]');
    
    let maxTanam = { 'padi-1': 0, 'padi-2i': 0, 'padi-2t': 0, 'padi-3': 0, 'pala-1': 0, 'pala-2': 0, 'pala-3': 0, 'tebu': 0, 'lain': 0, 'jumlah': 0 };

    rows.forEach(row => {
        let totalTanam = 0;
        ['padi-1', 'padi-2i', 'padi-2t', 'padi-3', 'pala-1', 'pala-2', 'pala-3', 'tebu', 'lain'].forEach(col => {
            const val = parseFloat(row.querySelector(`input[data-col="${col}"]`).value) || 0;
            totalTanam += val;
            if(val > maxTanam[col]) maxTanam[col] = val; 
        });

        row.querySelector('input[data-col="jumlah"]').value = totalTanam > 0 ? totalTanam.toFixed(2) : "";
        if(totalTanam > maxTanam['jumlah']) maxTanam['jumlah'] = totalTanam;

        let bero = luasSawah - totalTanam;
        if (bero < 0) bero = 0;
        row.querySelector('input[data-col="bero"]').value = (luasSawah > 0) ? bero.toFixed(2) : "";

        // Hitung Neraca Air
        const qTersedia = parseFloat(row.querySelector('input[data-col="q-tersedia"]').value) || 0;
        const kebTersier = parseFloat(row.querySelector('input[data-col="keb-tersier"]').value) || 0;
        const kebLain = parseFloat(row.querySelector('input[data-col="keb-lain"]').value) || 0;
        
        let neraca = 0;
        if(row.querySelector('input[data-col="q-tersedia"]').value !== "") {
            neraca = qTersedia - (kebTersier + kebLain);
            row.querySelector('input[data-col="neraca"]').value = neraca.toFixed(2);
        } else {
            row.querySelector('input[data-col="neraca"]').value = "";
        }

        // ðŸ‘‡ KALKULASI BARU: Kehilangan Air & Rasio Efisiensi ðŸ‘‡
        const qAmbil = parseFloat(row.querySelector('input[data-col="q-ambil"]').value) || 0;
        const qRencana = parseFloat(row.querySelector('input[data-col="q-rencana"]').value) || 0;
        
        // Eksekusi Kehilangan Air = Pengambilan - Rencana
        if (row.querySelector('input[data-col="q-ambil"]').value !== "" && row.querySelector('input[data-col="q-rencana"]').value !== "") {
            row.querySelector('input[data-col="q-hilang"]').value = (qAmbil - qRencana).toFixed(2);
        } else {
            row.querySelector('input[data-col="q-hilang"]').value = "";
        }

        // Eksekusi Rasio Pengambilan
        if (qRencana > 0) {
            row.querySelector('input[data-col="rasio"]').value = (qAmbil / qRencana).toFixed(2);
        } else {
            row.querySelector('input[data-col="rasio"]').value = "";
        }
    });

    if(luasSawah > 0) {
        let intTotal = 0;
        
        const updateFoot = (colId, maxKey) => {
            const elMax = document.getElementById(`o10-max-${colId}`);
            if(elMax) elMax.innerText = maxTanam[maxKey] > 0 ? maxTanam[maxKey].toFixed(2) : "-";
            
            const intensitas = (maxTanam[maxKey] / luasSawah) * 100;
            const elInt = document.getElementById(`o10-int-${colId}`);
            if(elInt) elInt.innerText = maxTanam[maxKey] > 0 ? intensitas.toFixed(2) + "%" : "-";
            
            if(maxKey !== 'jumlah' && maxKey !== 'lain') intTotal += intensitas;
        };

        updateFoot('p1', 'padi-1'); updateFoot('p2i', 'padi-2i'); updateFoot('p2t', 'padi-2t'); updateFoot('p3', 'padi-3');
        updateFoot('pl1', 'pala-1'); updateFoot('pl2', 'pala-2'); updateFoot('pl3', 'pala-3');
        updateFoot('tebu', 'tebu'); updateFoot('lain', 'lain'); updateFoot('jml', 'jumlah');

        const elTotal = document.getElementById('o10-int-total');
        if(elTotal) elTotal.innerText = intTotal > 0 ? intTotal.toFixed(2) + "%" : "-";
    }

    updateExtraTables10O(maxTanam);
}

function updateExtraTables10O(maxTanam) {
    const setText = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.innerText = value > 0 ? value.toFixed(2) : "-";
    };
    const num = (val) => parseFloat(String(val || '').replace(',', '.')) || 0;
    const setInput = (selector, value) => {
        const el = document.querySelector(selector);
        if (el) el.value = value > 0 ? value.toFixed(2) : "";
    };
    const prodMap = {
        padi: maxTanam['padi-1'] || 0,
        gaduIzin: maxTanam['padi-2i'] || 0,
        gaduTidak: maxTanam['padi-2t'] || 0,
        palawija: Math.max(maxTanam['pala-1'] || 0, maxTanam['pala-2'] || 0, maxTanam['pala-3'] || 0),
        tebu: maxTanam.tebu || 0
    };
    setText('o10-prod-puncak-padi', prodMap.padi);
    setText('o10-prod-puncak-gadu-izin', prodMap.gaduIzin);
    setText('o10-prod-puncak-gadu-tidak', prodMap.gaduTidak);
    setText('o10-prod-puncak-palawija', prodMap.palawija);
    setText('o10-prod-puncak-tebu', prodMap.tebu);

    Object.keys(prodMap).forEach(col => {
        const ubinan = num(document.querySelector(`.o10-extra-inp[data-section="production"][data-row="ubinan"][data-col="${col}"]`)?.value);
        const hasil = prodMap[col] * ubinan;
        setInput(`.o10-extra-inp[data-section="production"][data-row="hasil"][data-col="${col}"]`, hasil);
        setInput(`.o10-extra-inp[data-section="production"][data-row="jumlah"][data-col="${col}"]`, prodMap[col] + hasil);
    });
    fillCropDamage10OFrom05O();
    fillPlantPlanThisYear10OFrom04O();
}

function getPlantPlanThisYear10OFrom04O() {
    const result = { 'padi-1': 0, 'padi-2i': 0, 'padi-2t': 0, 'padi-3': 0, 'pala-1': 0, 'pala-2': 0, 'pala-3': 0, tebu: 0, lain: 0, jumlah: 0, bero: 0 };
    const num = (value) => parseFloat(String(value || '').replace(',', '.')) || 0;
    const db04 = getLS('04O_' + currentDI) || {};
    const luasSawah = parseFloat(String(document.getElementById('o10-totalLuasDI')?.innerText || getTotalLuasDI01O(getProfilData(currentDI))).replace(',', '.')) || 0;

    Object.values(db04).forEach(rep => {
        if (!rep || !rep.usul) return;
        const padi = num(rep.usul[0]) + num(rep.usul[1]) + num(rep.usul[2]) + num(rep.usul[3]);
        const tebu = num(rep.usul[4]) + num(rep.usul[5]) + num(rep.usul[6]);
        const pala = num(rep.usul[7]) + num(rep.usul[8]);
        const gaduTidakIzin = num(rep.usul[9]);
        const lain = num(rep.usul[10]);

        if (rep.mt === 'MT1') {
            result['padi-1'] += padi;
            result['pala-1'] += pala;
        } else if (rep.mt === 'MT2') {
            result['padi-2i'] += padi;
            result['padi-2t'] += gaduTidakIzin;
            result['pala-2'] += pala;
        } else if (rep.mt === 'MT3') {
            result['padi-3'] += padi + gaduTidakIzin;
            result['pala-3'] += pala;
        }

        result.tebu += tebu;
        result.lain += lain;
    });

    result.jumlah = ['padi-1','padi-2i','padi-2t','padi-3','pala-1','pala-2','pala-3','tebu','lain'].reduce((sum, col) => sum + result[col], 0);
    result.bero = luasSawah > 0 ? Math.max(0, luasSawah - result.jumlah) : 0;
    return result;
}

function fillPlantPlanThisYear10OFrom04O() {
    const plan = getPlantPlanThisYear10OFrom04O();
    Object.keys(plan).forEach(col => {
        const inp = document.querySelector(`.o10-extra-inp[data-section="plantPlan"][data-row="thisYear"][data-col="${col}"]`);
        if (inp) inp.value = plan[col] > 0 ? plan[col].toFixed(2) : "";
    });
}

function getCropDamage10OFrom05O() {
    const result = {
        flood: { 'padi-1': 0, 'padi-2i': 0, 'padi-2t': 0, 'padi-3': 0, 'pala-1': 0, 'pala-2': 0, 'pala-3': 0, tebu: 0, lain: 0, jumlah: 0 },
        drought: { 'padi-1': 0, 'padi-2i': 0, 'padi-2t': 0, 'padi-3': 0, 'pala-1': 0, 'pala-2': 0, 'pala-3': 0, tebu: 0, lain: 0, jumlah: 0 }
    };
    const add = (row, col, value) => {
        const num = parseFloat(String(value || '').replace(',', '.')) || 0;
        result[row][col] += num;
        result[row].jumlah += num;
    };
    const db05 = getLS('05O_' + currentDI) || {};
    const db04 = getLS('04O_' + currentDI) || {};
    const o1Data = getLS('01O_' + currentDI) || {};
    const bendungs = Object.keys(o1Data).sort();

    Object.values(db05).forEach(report05 => {
        const mt = report05?.mt || '';
        const periodeAir = report05?.periodeAir || '';
        if (!mt || !periodeAir) return;
        bendungs.forEach(bendung => {
            const rep04 = db04[`${bendung}_${mt}_${periodeAir}`];
            if (!rep04 || !rep04.rusak) return;
            const padiCol = mt === 'MT1' ? 'padi-1' : (mt === 'MT2' ? 'padi-2i' : 'padi-3');
            const palaCol = mt === 'MT1' ? 'pala-1' : (mt === 'MT2' ? 'pala-2' : 'pala-3');
            add('flood', padiCol, rep04.rusak['padi-genang']);
            add('flood', palaCol, rep04.rusak['pala-genang']);
            add('flood', 'tebu', rep04.rusak['tebu-genang']);
            add('drought', padiCol, rep04.rusak['padi-kering']);
            add('drought', palaCol, rep04.rusak['pala-kering']);
            add('drought', 'tebu', rep04.rusak['tebu-kering']);
        });
    });
    return result;
}

function fillCropDamage10OFrom05O() {
    const cropDamage = getCropDamage10OFrom05O();
    ['flood', 'drought'].forEach(row => {
        Object.keys(cropDamage[row]).forEach(col => {
            const inp = document.querySelector(`.o10-extra-inp[data-section="cropDamage"][data-row="${row}"][data-col="${col}"]`);
            if (inp) inp.value = cropDamage[row][col] > 0 ? cropDamage[row][col].toFixed(2) : "";
        });
    });
}

function collectExtraTables10O() {
    const extra = {};
    document.querySelectorAll('.o10-extra-inp').forEach(inp => {
        const section = inp.dataset.section;
        const row = inp.dataset.row;
        const col = inp.dataset.col;
        if (!section || !row || !col) return;
        if (!extra[section]) extra[section] = {};
        if (!extra[section][row]) extra[section][row] = {};
        extra[section][row][col] = inp.value || "";
    });
    return extra;
}

function fillExtraTables10O(extra = {}) {
    document.querySelectorAll('.o10-extra-inp').forEach(inp => {
        const section = inp.dataset.section;
        const row = inp.dataset.row;
        const col = inp.dataset.col;
        inp.value = extra?.[section]?.[row]?.[col] || "";
    });
}

async function saveForm10O() {
    const periode = document.getElementById('o10-periodeText').innerText;
    if(periode === "-") return showFormAlert('o10', "Periode Aktif tidak tersedia! Isi 01-O terlebih dahulu.", "error");

    const rows = document.querySelectorAll('#o10-tbody tr[data-row]');
    const data = { periode, rows: {}, extra: {} };
    
    // Array Columns lengkap sesuai dengan input
    const cols = ['padi-1','padi-2i','padi-2t','padi-3','pala-1','pala-2','pala-3','tebu','lain', 
                  'q-tersedia','q-ambil','q-limpas','q-hilang','q-suplesi','keb-tersier','keb-lain','faktor-k','q-rencana','hujan'];
    
    rows.forEach(row => {
        const rowKey = row.getAttribute('data-row');
        data.rows[rowKey] = {};
        cols.forEach(c => {
            const inp = row.querySelector(`input[data-col="${c}"]`);
            if(inp) data.rows[rowKey][c] = inp.value;
        });
    });
    data.extra = collectExtraTables10O();

    const key = periode; 
    const savedData = getLS('10O_' + currentDI);
    savedData[key] = withReportTimestamps(data, savedData[key]);
    setLS('10O_' + currentDI, savedData);

    let onlineSaved = false;
    try {
        onlineSaved = await saveLaporanOnline('10-O', savedData[key], {
            kategori: 'operasi',
            key_laporan: key,
            periode: key
        });
    } catch (err) {
        console.error('Gagal simpan 10-O ke Supabase:', err);
    }

    renderSavedList10O();
    
    // ðŸ‘‡ FITUR SAPU BERSIH: Kosongkan form setelah disimpan
    resetInputs10O(); 
    
    showOperationSaveAlert('o10', `Laporan Rekapitulasi Tahunan 10-O berhasil disimpan${onlineSaved ? ' ke Supabase' : ' lokal'}.`, onlineSaved ? "success" : "warning", periode);
    setTimeout(() => hideFormAlert('o10'), 5000);
}

function fillForm10O(data) {
    const rows = document.querySelectorAll('#o10-tbody tr[data-row]');
    const cols = ['padi-1','padi-2i','padi-2t','padi-3','pala-1','pala-2','pala-3','tebu','lain', 
                  'q-tersedia','q-ambil','q-limpas','q-hilang','q-suplesi','keb-tersier','keb-lain','faktor-k','q-rencana','hujan'];
    
    rows.forEach(row => {
        const rowKey = row.getAttribute('data-row');
        if (data.rows[rowKey]) {
            cols.forEach(c => {
                const inp = row.querySelector(`input[data-col="${c}"]`);
                if(inp) inp.value = data.rows[rowKey][c] || "";
            });
        }
    });
    fillExtraTables10O(data.extra || {});
    calc10O();
}

function renderSavedList10O() {
    const savedData = getLS('10O_' + currentDI);
    const container = document.getElementById('o10-saved-list');
    const allKeys = Object.keys(savedData).sort();
    const keys = filterOperationSavedKeys('10-O', allKeys, savedData);

    if (allKeys.length === 0) {
        container.innerHTML = `<p class="col-span-full text-center text-slate-400 italic py-8 border border-dashed rounded-xl bg-slate-50">Belum ada Laporan Tahunan 10-O yang tersimpan.</p>`;
        return;
    }
    if (keys.length === 0) return renderNoActiveOperasiMessage(container, 'Laporan Tahunan 10-O');

    container.innerHTML = keys.map(k => {
        return `<div class="bg-white p-4 border rounded-xl shadow-sm hover:shadow-md transition-all">
            <div class="flex items-start gap-3 mb-4">
                <div class="bg-indigo-100 text-indigo-600 p-2 rounded-lg"><i data-lucide="archive" class="w-5 h-5"></i></div>
                <div>
                    <h4 class="font-bold text-slate-800 text-sm truncate w-40">Laporan ${k}</h4>
                    <p class="text-[10px] text-slate-500 font-medium">Akumulasi D.I.</p>
                </div>
            </div>
            <button onclick="edit10O('${k}')" class="w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 py-2 rounded-lg font-bold text-xs">Lihat / Edit</button>
        </div>`;
    }).join('');
    if(typeof initIcons === 'function') initIcons();
}

function edit10O(key) {
    const data = getLS('10O_' + currentDI)[key];
    if(!data) return;
    document.getElementById('o10-periodeText').innerText = key;
    
    // Parameter 'true' menembus Panel Instruksi dan memaksa tabel dirender
    onChangeFilter10O(true); 
    
    document.getElementById('tabContent-10O').scrollIntoView({behavior: 'smooth'});
    showFormAlert('o10', `Menampilkan kembali data 10-O untuk periode <strong>${key}</strong>`, 'info');
}

function resetInputs10O() {
    // Memanggil filter dengan parameter false, agar jika data ada,
    // tabel akan otomatis berubah menjadi tameng "Panel Instruksi" kembali.
    onChangeFilter10O(false);
}

// ====================================================================
// --- SISTEM LOGIKA FORMULIR 11-O (REKAP KABUPATEN FULL D.I) ---
// ====================================================================

// Fungsi Pembantu: Mengambil Semua D.I. di Sistem (Aman & Anti-Error)
function getAllDI() {
    let dis = new Set();
    const selectEl = document.getElementById('sidebar-di-select');
    if (selectEl) Array.from(selectEl.options).forEach(o => dis.add(o.value));
    
    // Tarik paksa dari LocalStorage untuk menjamin semua D.I terdeteksi
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('siop_profil_')) {
            dis.add(key.replace('siop_profil_', ''));
        }
    }
    if(currentDI) dis.add(currentDI);
    
    return Array.from(dis);
}

function render11O() {
    // 1. Ekstrak Daftar Kabupaten Unik dari Seluruh Profil D.I.
    const allDIs = getAllDI();
    let kabSet = new Set();
    
    allDIs.forEach(di => {
        const pData = getProfilData(di);
        if (pData && pData.kabupaten && pData.kabupaten.trim() !== "") {
            kabSet.add(pData.kabupaten.trim());
        }
    });

    // 2. Isi Dropdown Kabupaten & Berikan Peringatan Jika Kosong
    const selKab = document.getElementById('o11-kabupaten-select');
    const tbody = document.getElementById('o11-tbody');
    const tfoot = document.getElementById('o11-tfoot');
    
    if (!selKab) return; // Keamanan jika elemen belum di-render

    if (kabSet.size === 0) {
        selKab.innerHTML = '<option value="">-- PROFIL KABUPATEN KOSONG --</option>';
        selKab.disabled = true; // Kunci Dropdown
        
        if(tbody) tbody.innerHTML = '<tr><td colspan="25" class="p-8 text-center text-red-500 italic font-bold bg-red-50">Silakan isi kolom "Kabupaten / Kota" di menu Profil D.I terlebih dahulu!</td></tr>';
        if(tfoot) tfoot.classList.add('hidden');
        
        showFormAlert('o11', 'Data Kabupaten kosong. Harap isi dan simpan kolom "Kabupaten / Kota" di menu <strong>Profil D.I</strong> terlebih dahulu.', 'error');
        return; // Hentikan render karena data kunci kosong
    } else {
        selKab.disabled = false;
        let optionsHtml = '<option value="">-- Pilih Kabupaten / Kota --</option>';
        Array.from(kabSet).sort().forEach(k => {
            optionsHtml += `<option value="${k}">${k}</option>`;
        });
        selKab.innerHTML = optionsHtml;
        hideFormAlert('o11');
    }
    
    // ðŸ‘‡ REVISI: PAKSA DROPDOWN KOSONG (HAPUS LOGIKA AUTO-SELECT) ðŸ‘‡
    selKab.value = ""; 

    // Reset dropdown MT agar fresh
    const selMT = document.getElementById('o11-mt-select');
    if(selMT) selMT.value = "";

    // Karena Dropdown Kabupaten dan MT diset Kosong, saat dipanggil, filter ini
    // akan mengeksekusi blok IF yang mengosongkan tabel dan menampilkan "Silakan Pilih..."
    onChangeFilter11O();
    
    // Tampilkan Daftar Tersimpan di bawah tabel
    renderSavedList11O();
    syncOperasiGlobalFromSupabase('11O_GLOBAL', '11-O', renderSavedList11O);
}

function onChangeFilter11O() {
    hideFormAlert('o11');
    const mtEl = document.getElementById('o11-mt-select');
    const kabEl = document.getElementById('o11-kabupaten-select');
    
    const mt = mtEl ? mtEl.value : "";
    const kab = kabEl ? kabEl.value : "";
    
    const tbody = document.getElementById('o11-tbody');
    const tfoot = document.getElementById('o11-tfoot');
    const txtPeriode = document.getElementById('o11-periodeText');
    
    if(txtPeriode) txtPeriode.innerText = "-";

    // Validasi Ganda: MT & Kabupaten harus dipilih
    if (!kab || !mt) {
        if(tbody) tbody.innerHTML = '<tr><td colspan="25" class="p-8 text-center text-slate-400 italic">Pilih Kabupaten dan Masa Tanam (MT) terlebih dahulu untuk memuat data...</td></tr>';
        if(tfoot) tfoot.classList.add('hidden');
        return;
    }

    if(tfoot) tfoot.classList.remove('hidden');

    // ðŸ‘‡ FILTER D.I. BERDASARKAN KABUPATEN YANG DIPILIH ðŸ‘‡
    const allDIs = getAllDI().filter(di => {
        const pData = getProfilData(di);
        return pData && pData.kabupaten && pData.kabupaten.trim() === kab;
    });

    if (allDIs.length === 0) {
        if(tbody) tbody.innerHTML = `<tr><td colspan="25" class="p-8 text-center text-red-500 italic bg-red-50">Tidak ada Daerah Irigasi yang terdaftar di wilayah ${kab}.</td></tr>`;
        if(tfoot) tfoot.classList.add('hidden');
        return;
    }

    // Set Teks Periode (Mencari dari D.I. pertama di kabupaten ini)
    let periodeDitemukan = "(Periode belum diatur)";
    for (let di of allDIs) {
        const o1Data = getLS('01O_' + di) || {};
        const keys = Object.keys(o1Data);
        if (keys.length > 0) {
            const propMT = mt === 'MT1' ? 'mt1' : (mt === 'MT2' ? 'mt2' : 'mt3');
            if (o1Data[keys[0]][propMT]) {
                periodeDitemukan = o1Data[keys[0]][propMT];
                break;
            }
        }
    }
    if(txtPeriode) txtPeriode.innerText = periodeDitemukan;

    // Olah Data Spesifik Kabupaten
    let totalJuruGlobal = 0;
    let totalPengamatGlobal = 0;
    let tbHtml = '';

    allDIs.forEach((diName, index) => {
        const pData = getProfilData(diName);
        let juruSet = new Set();
        let luasSawahTotal = 0;
        
        if (pData.bendungs && pData.bendungs.length > 0) {
            pData.bendungs.forEach(b => {
                if (b.juru) juruSet.add(b.juru);
                else juruSet.add(`Juru ${b.nama}`);
                if (b.rincian) b.rincian.forEach(r => luasSawahTotal += (parseFloat(String(r.luasFungsional).replace(',','.')) || 0));
            });
        }

        totalJuruGlobal += juruSet.size;
        totalPengamatGlobal += pData.pengamat ? 1 : 0;
        const juruListHtml = Array.from(juruSet).map((j, i) => `${String.fromCharCode(97 + i)}. ${j}`).join('<br>');

        tbHtml += `
            <tr class="border-b bg-white hover:bg-slate-50 transition-colors" data-di="${diName}">
                <td class="p-2 border-r text-center font-bold text-slate-600 bg-slate-50 align-top" rowspan="2" style="left: 0; position: sticky; z-index: 10;">${index + 1}</td>
                <td class="p-2 border-r font-black text-indigo-900 bg-indigo-50 text-center uppercase tracking-wider" colspan="2" style="left: 45px; position: sticky; z-index: 10;">${diName}</td>
                <td class="p-2 border-r-4 border-slate-300 text-center font-black text-slate-800 bg-slate-50 align-top o11-luas-sawah" rowspan="2" style="left: 345px; position: sticky; z-index: 10;">${luasSawahTotal > 0 ? luasSawahTotal.toFixed(2) : '0'}</td>
                
                <td class="p-1 border-r bg-blue-50/20" rowspan="2"><input type="number" step="any" class="inp-tbl text-center o11-inp h-full" data-col="ren-padi" oninput="calc11O()"></td>
                <td class="p-1 border-r bg-blue-50/20" rowspan="2"><input type="number" step="any" class="inp-tbl text-center o11-inp h-full" data-col="ren-tebu-b" oninput="calc11O()"></td>
                <td class="p-1 border-r bg-blue-50/20" rowspan="2"><input type="number" step="any" class="inp-tbl text-center o11-inp h-full" data-col="ren-tebu-l" oninput="calc11O()"></td>
                <td class="p-1 border-r bg-blue-50/20" rowspan="2"><input type="number" step="any" class="inp-tbl text-center o11-inp h-full" data-col="ren-pala" oninput="calc11O()"></td>
                <td class="p-1 border-r bg-blue-50/20" rowspan="2"><input type="number" step="any" class="inp-tbl text-center o11-inp h-full" data-col="ren-lain" oninput="calc11O()"></td>
                <td class="p-1 border-r" rowspan="2"><input type="text" readonly class="inp-tbl-calc text-center font-bold text-blue-800 bg-blue-100/50 h-full" data-col="ren-jml"></td>
                <td class="p-1 border-r-4 border-slate-300" rowspan="2"><input type="text" readonly class="inp-tbl-calc text-center font-bold text-orange-700 bg-orange-50/50 h-full" data-col="ren-bero"></td>

                <td class="p-1 border-r bg-emerald-50/20" rowspan="2"><input type="number" step="any" class="inp-tbl text-center o11-inp h-full" data-col="real-padi-i" oninput="calc11O()"></td>
                <td class="p-1 border-r bg-emerald-50/20" rowspan="2"><input type="number" step="any" class="inp-tbl text-center o11-inp h-full" data-col="real-padi-t" oninput="calc11O()"></td>
                <td class="p-1 border-r bg-emerald-50/20" rowspan="2"><input type="number" step="any" class="inp-tbl text-center o11-inp h-full" data-col="real-tebu" oninput="calc11O()"></td>
                <td class="p-1 border-r bg-emerald-50/20" rowspan="2"><input type="number" step="any" class="inp-tbl text-center o11-inp h-full" data-col="real-pala" oninput="calc11O()"></td>
                <td class="p-1 border-r bg-emerald-50/20" rowspan="2"><input type="number" step="any" class="inp-tbl text-center o11-inp h-full" data-col="real-lain" oninput="calc11O()"></td>
                <td class="p-1 border-r" rowspan="2"><input type="text" readonly class="inp-tbl-calc text-center font-bold text-emerald-800 bg-emerald-100/50 h-full" data-col="real-jml"></td>
                <td class="p-1 border-r-4 border-slate-300" rowspan="2"><input type="text" readonly class="inp-tbl-calc text-center font-bold text-orange-700 bg-orange-50/50 h-full" data-col="real-bero"></td>

                <td class="p-1 border-r bg-red-50/30" rowspan="2"><input type="number" step="any" class="inp-tbl text-center o11-inp text-red-700 h-full" data-col="k-padi" oninput="calc11O()"></td>
                <td class="p-1 border-r bg-red-50/30" rowspan="2"><input type="number" step="any" class="inp-tbl text-center o11-inp text-red-700 h-full" data-col="k-pala" oninput="calc11O()"></td>
                <td class="p-1 border-r bg-red-50/30" rowspan="2"><input type="number" step="any" class="inp-tbl text-center o11-inp text-red-700 h-full" data-col="k-tebu" oninput="calc11O()"></td>
                
                <td class="p-1 border-r bg-rose-50/50" rowspan="2"><input type="number" step="any" class="inp-tbl text-center o11-inp text-rose-700 h-full" data-col="b-padi" oninput="calc11O()"></td>
                <td class="p-1 border-r bg-rose-50/50" rowspan="2"><input type="number" step="any" class="inp-tbl text-center o11-inp text-rose-700 h-full" data-col="b-pala" oninput="calc11O()"></td>
                <td class="p-1" rowspan="2"><input type="number" step="any" class="inp-tbl text-center o11-inp text-rose-700 h-full" data-col="b-tebu" oninput="calc11O()"></td>
            </tr>
            <tr class="border-b bg-white">
                <td class="p-3 border-r font-bold text-slate-700 text-center align-top whitespace-nowrap bg-white" style="left: 45px; position: sticky; z-index: 10;">${pData.pengamat || 'Pengamat -'}</td>
                <td class="p-3 border-r text-xs text-slate-700 font-medium align-top leading-relaxed whitespace-nowrap bg-white" style="left: 195px; position: sticky; z-index: 10;">${juruListHtml || '-'}</td>
            </tr>
        `;
    });

    if(tbody) tbody.innerHTML = tbHtml;
    
    // Bangun Footer
    const colList = ['ren-padi','ren-tebu-b','ren-tebu-l','ren-pala','ren-lain','ren-jml','ren-bero',
                  'real-padi-i','real-padi-t','real-tebu','real-pala','real-lain','real-jml','real-bero',
                  'k-padi','k-pala','k-tebu','b-padi','b-pala','b-tebu'];
    
    let tfootHtml = `
        <tr class="text-center">
            <td rowspan="2" class="p-3 border-r border-slate-400 bg-slate-300" style="left: 0; position: sticky; z-index: 10;"></td>
            <td colspan="2" class="p-3 border-r border-slate-400 bg-slate-300 text-left font-bold text-slate-900 uppercase" style="left: 45px; position: sticky; z-index: 10;">
                Jml DI : <span class="ml-2 font-black text-indigo-700">${allDIs.length}</span>
            </td>
            <td rowspan="2" class="p-3 border-r-4 border-slate-400 bg-slate-300 text-slate-800 font-black" id="o11-tot-luas" style="left: 345px; position: sticky; z-index: 10;">0</td>
    `;
    colList.forEach(c => {
        let extraClass = c.includes('jml') || c.includes('bero') ? 'bg-slate-300' : 'bg-slate-200';
        let borderClass = c === 'ren-bero' || c === 'real-bero' ? 'border-r-4 border-slate-400' : 'border-r';
        tfootHtml += `<td rowspan="2" class="p-2 ${borderClass} ${extraClass} text-slate-900" id="o11-tot-${c}">0</td>`;
    });
    tfootHtml += `</tr><tr class="text-center">
        <td class="p-3 border-r border-slate-400 bg-slate-300 text-left font-bold text-slate-900 uppercase" style="left: 45px; position: sticky; z-index: 10;">
            Jml Pengamat : <span class="ml-1 font-black text-indigo-700">${totalPengamatGlobal}</span>
        </td>
        <td class="p-3 border-r border-slate-400 bg-slate-300 text-left font-bold text-slate-900 uppercase" style="left: 195px; position: sticky; z-index: 10;">
            Jml Juru : <span class="ml-1 font-black text-indigo-700">${totalJuruGlobal}</span>
        </td>
    </tr>`;
    if(tfoot) tfoot.innerHTML = tfootHtml;

    // ðŸ‘‡ LOAD DATA DENGAN KUNCI SPESIFIK KABUPATEN ðŸ‘‡
    const savedKey = `${kab}_${mt}`;
    const saved = getLS('11O_GLOBAL')[savedKey];
    if(saved) fillForm11O(saved);
    
    calc11O();
}

async function autoAkumulasi11O() {
    const mtEl = document.getElementById('o11-mt-select');
    const kabEl = document.getElementById('o11-kabupaten-select');
    
    const mt = mtEl ? mtEl.value : "";
    const kab = kabEl ? kabEl.value : "";
    
    if(!kab || !mt) return showFormAlert('o11', "Pilih Kabupaten dan MT terlebih dahulu sebelum menarik data!", "error");
    
    if (typeof showModernConfirm === 'function') {
        const isConfirmed = await showModernConfirm(
            "Tarik Rekapitulasi Wilayah?",
            `Sistem akan membedah Arsip 04-O dari SELURUH D.I yang terdaftar di wilayah ${kab} dan merangkumnya. Lanjutkan?`
        );
        if (!isConfirmed) return;
    }

    const rows = document.querySelectorAll('#o11-tbody tr[data-di]');
    
    rows.forEach(row => {
        const diName = row.getAttribute('data-di');
        const o4Data = getLS('04O_' + diName) || {};

        let totalUsul = { padi:0, tebu_baru:0, tebu_lama:0, pala:0, lain:0 };
        let totalReal = { padi_i:0, padi_t:0, tebu_baru:0, tebu_lama:0, pala:0, lain:0 };
        let totalKering = { padi:0, pala:0, tebu:0 };
        let totalGenang = { padi:0, pala:0, tebu:0 };
        
        let bendungMaxes = {};

        Object.entries(o4Data).forEach(([key, val]) => {
            if(val.mt === mt) {
                const bNama = val.bendung || key.split('_')[0];
                if(!bendungMaxes[bNama]) {
                    bendungMaxes[bNama] = {
                        usul: { padi:0, tebu_baru:0, tebu_lama:0, pala:0, lain:0 },
                        real: { padi_i:0, padi_t:0, tebu_baru:0, tebu_lama:0, pala:0, lain:0 },
                        rusak_k: { padi:0, pala:0, tebu:0 },
                        rusak_b: { padi:0, pala:0, tebu:0 }
                    };
                }
                const bm = bendungMaxes[bNama];
                
                if(val.usul) {
                    let pUsul = (parseFloat(val.usul[0])||0) + (parseFloat(val.usul[1])||0) + (parseFloat(val.usul[2])||0) + (parseFloat(val.usul[3])||0);
                    if(pUsul > bm.usul.padi) bm.usul.padi = pUsul;

                    let tbUsul = (parseFloat(val.usul[4])||0) + (parseFloat(val.usul[5])||0);
                    if(tbUsul > bm.usul.tebu_baru) bm.usul.tebu_baru = tbUsul;

                    let tlUsul = (parseFloat(val.usul[6])||0);
                    if(tlUsul > bm.usul.tebu_lama) bm.usul.tebu_lama = tlUsul;

                    let palaUsul = (parseFloat(val.usul[7])||0) + (parseFloat(val.usul[8])||0);
                    if(palaUsul > bm.usul.pala) bm.usul.pala = palaUsul;

                    if((parseFloat(val.usul[10])||0) > bm.usul.lain) bm.usul.lain = parseFloat(val.usul[10]);
                }
                
                if(val.real) {
                    if((parseFloat(val.real[0])||0) > bm.real.padi_i) bm.real.padi_i = parseFloat(val.real[0]);
                    if((parseFloat(val.real[4])||0) > bm.real.padi_t) bm.real.padi_t = parseFloat(val.real[4]);
                    let tbReal = (parseFloat(val.real[1])||0);
                    if(tbReal > bm.real.tebu_baru) bm.real.tebu_baru = tbReal;
                    let tlReal = (parseFloat(val.real[2])||0);
                    if(tlReal > bm.real.tebu_lama) bm.real.tebu_lama = tlReal;
                    if((parseFloat(val.real[3])||0) > bm.real.pala) bm.real.pala = parseFloat(val.real[3]);
                    if((parseFloat(val.real[5])||0) > bm.real.lain) bm.real.lain = parseFloat(val.real[5]);
                }

                if(val.rusak) {
                    if((parseFloat(val.rusak['padi-kering'])||0) > bm.rusak_k.padi) bm.rusak_k.padi = parseFloat(val.rusak['padi-kering']);
                    if((parseFloat(val.rusak['pala-kering'])||0) > bm.rusak_k.pala) bm.rusak_k.pala = parseFloat(val.rusak['pala-kering']);
                    if((parseFloat(val.rusak['tebu-kering'])||0) > bm.rusak_k.tebu) bm.rusak_k.tebu = parseFloat(val.rusak['tebu-kering']);
                    
                    if((parseFloat(val.rusak['padi-genang'])||0) > bm.rusak_b.padi) bm.rusak_b.padi = parseFloat(val.rusak['padi-genang']);
                    if((parseFloat(val.rusak['pala-genang'])||0) > bm.rusak_b.pala) bm.rusak_b.pala = parseFloat(val.rusak['pala-genang']);
                    if((parseFloat(val.rusak['tebu-genang'])||0) > bm.rusak_b.tebu) bm.rusak_b.tebu = parseFloat(val.rusak['tebu-genang']);
                }
            }
        });

        Object.values(bendungMaxes).forEach(bm => {
            totalUsul.padi += bm.usul.padi; totalUsul.tebu_baru += bm.usul.tebu_baru; totalUsul.tebu_lama += bm.usul.tebu_lama; totalUsul.pala += bm.usul.pala; totalUsul.lain += bm.usul.lain;
            totalReal.padi_i += bm.real.padi_i; totalReal.padi_t += bm.real.padi_t; totalReal.tebu_baru += bm.real.tebu_baru; totalReal.tebu_lama += bm.real.tebu_lama; totalReal.pala += bm.real.pala; totalReal.lain += bm.real.lain;
            totalKering.padi += bm.rusak_k.padi; totalKering.pala += bm.rusak_k.pala; totalKering.tebu += bm.rusak_k.tebu;
            totalGenang.padi += bm.rusak_b.padi; totalGenang.pala += bm.rusak_b.pala; totalGenang.tebu += bm.rusak_b.tebu;
        });

        const setVal = (col, val) => {
            const inp = row.querySelector(`input[data-col="${col}"]`);
            if(inp) inp.value = val > 0 ? val.toFixed(2) : "";
        };
        
        setVal('ren-padi', totalUsul.padi); setVal('ren-tebu-b', totalUsul.tebu_baru); setVal('ren-tebu-l', totalUsul.tebu_lama); setVal('ren-pala', totalUsul.pala); setVal('ren-lain', totalUsul.lain);
        setVal('real-padi-i', totalReal.padi_i); setVal('real-padi-t', totalReal.padi_t); setVal('real-tebu', (totalReal.tebu_baru + totalReal.tebu_lama)); setVal('real-pala', totalReal.pala); setVal('real-lain', totalReal.lain);
        setVal('k-padi', totalKering.padi); setVal('k-pala', totalKering.pala); setVal('k-tebu', totalKering.tebu);
        setVal('b-padi', totalGenang.padi); setVal('b-pala', totalGenang.pala); setVal('b-tebu', totalGenang.tebu);
    });
    
    calc11O();
    showFormAlert('o11', `Data akumulasi penuh dari seluruh D.I di wilayah ${kab} berhasil ditarik.`, "success");
}

function calc11O() {
    const rows = document.querySelectorAll('#o11-tbody tr[data-di]');
    const cols = ['ren-padi','ren-tebu-b','ren-tebu-l','ren-pala','ren-lain','ren-jml','ren-bero',
                  'real-padi-i','real-padi-t','real-tebu','real-pala','real-lain','real-jml','real-bero',
                  'k-padi','k-pala','k-tebu','b-padi','b-pala','b-tebu'];
    
    let totals = { luas: 0 };
    cols.forEach(c => totals[c] = 0);

    rows.forEach(row => {
        const luas = parseFloat(row.querySelector('.o11-luas-sawah').innerText) || 0;
        totals.luas += luas;

        const getV = (c) => parseFloat(row.querySelector(`input[data-col="${c}"]`).value) || 0;
        
        const renJml = getV('ren-padi') + getV('ren-tebu-b') + getV('ren-tebu-l') + getV('ren-pala') + getV('ren-lain');
        let renBero = luas - renJml;
        if(renBero < 0) renBero = 0;
        row.querySelector(`input[data-col="ren-jml"]`).value = renJml > 0 ? renJml.toFixed(2) : "";
        row.querySelector(`input[data-col="ren-bero"]`).value = luas > 0 ? renBero.toFixed(2) : "";

        const realJml = getV('real-padi-i') + getV('real-padi-t') + getV('real-tebu') + getV('real-pala') + getV('real-lain');
        let realBero = luas - realJml;
        if(realBero < 0) realBero = 0;
        row.querySelector(`input[data-col="real-jml"]`).value = realJml > 0 ? realJml.toFixed(2) : "";
        row.querySelector(`input[data-col="real-bero"]`).value = luas > 0 ? realBero.toFixed(2) : "";

        cols.forEach(c => {
            if(c.includes('jml') || c.includes('bero')) {
                totals[c] += parseFloat(row.querySelector(`input[data-col="${c}"]`).value) || 0;
            } else {
                totals[c] += getV(c);
            }
        });
    });

    const elTotLuas = document.getElementById('o11-tot-luas');
    if(elTotLuas) elTotLuas.innerText = totals.luas > 0 ? totals.luas.toFixed(2) : "0";
    
    cols.forEach(c => {
        const el = document.getElementById(`o11-tot-${c}`);
        if(el) el.innerText = totals[c] > 0 ? totals[c].toFixed(2) : "0";
    });
}

async function saveForm11O() {
    const mt = document.getElementById('o11-mt-select').value;
    const kab = document.getElementById('o11-kabupaten-select').value;
    if(!kab || !mt) return showFormAlert('o11', "Pilih Kabupaten dan MT terlebih dahulu!", "error");

    const rows = document.querySelectorAll('#o11-tbody tr[data-di]');
    const periodeOperasi = getActiveOperasiPeriod();
    const data = { kab, mt, periode: periodeOperasi, rows: {} };
    const cols = ['ren-padi','ren-tebu-b','ren-tebu-l','ren-pala','ren-lain','real-padi-i','real-padi-t','real-tebu','real-pala','real-lain','k-padi','k-pala','k-tebu','b-padi','b-pala','b-tebu'];
    
    rows.forEach(row => {
        const diName = row.getAttribute('data-di');
        data.rows[diName] = {};
        cols.forEach(c => {
            data.rows[diName][c] = row.querySelector(`input[data-col="${c}"]`).value;
        });
    });

    // Simpan ke DB GLOBAL dengan kunci Kabupaten_MT
    const key = `${kab}_${mt}`;
    const savedData = getLS('11O_GLOBAL') || {};
    savedData[key] = withReportTimestamps(data, savedData[key]);
    setLS('11O_GLOBAL', savedData);

    let onlineSaved = false;
    try {
        onlineSaved = await saveLaporanOnline('11-O', savedData[key], {
            kategori: 'operasi',
            key_laporan: key,
            periode: periodeOperasi || mt,
            mt,
            tahun: kab,
            targetAllDI: true
        });
    } catch (err) {
        console.error('Gagal simpan 11-O ke Supabase:', err);
    }

    renderSavedList11O();
    resetInputs11O(false);
    showOperationSaveAlert('o11', `Laporan Rekap Kabupaten ${kab} (${mt}) berhasil disimpan${onlineSaved ? ' ke Supabase' : ' lokal'}.`, onlineSaved ? "success" : "warning", periodeOperasi);
    setTimeout(() => hideFormAlert('o11'), 4000);
}

function fillForm11O(data) {
    const rows = document.querySelectorAll('#o11-tbody tr[data-di]');
    const cols = ['ren-padi','ren-tebu-b','ren-tebu-l','ren-pala','ren-lain',
                  'real-padi-i','real-padi-t','real-tebu','real-pala','real-lain',
                  'k-padi','k-pala','k-tebu','b-padi','b-pala','b-tebu'];
    
    rows.forEach(row => {
        const diName = row.getAttribute('data-di');
        if (data.rows && data.rows[diName]) {
            cols.forEach(c => {
                const inp = row.querySelector(`input[data-col="${c}"]`);
                if(inp) inp.value = data.rows[diName][c] || "";
            });
        }
    });
}

function renderSavedList11O() {
    const savedData = getLS('11O_GLOBAL') || {};
    const container = document.getElementById('o11-saved-list');
    const allKeys = Object.keys(savedData).sort();
    const keys = filterOperationSavedKeys('11-O', allKeys, savedData);

    if (allKeys.length === 0) {
        if(container) container.innerHTML = `<p class="col-span-full text-center text-slate-400 italic py-8 border border-dashed rounded-xl bg-slate-50">Belum ada Laporan 11-O.</p>`;
        return;
    }
    if (keys.length === 0) return renderNoActiveOperasiMessage(container, 'Laporan 11-O');

    if(container) container.innerHTML = keys.map(k => {
        const parts = k.split('_');
        const kabName = parts[0];
        const mtName = parts[1];
        
        return `<div class="bg-white p-4 border rounded-xl shadow-sm hover:shadow-md transition-all">
            <div class="flex items-start gap-3 mb-4">
                <div class="bg-indigo-100 text-indigo-600 p-2 rounded-lg shrink-0"><i data-lucide="bar-chart-2" class="w-5 h-5"></i></div>
                <div class="overflow-hidden">
                    <h4 class="font-bold text-slate-800 text-sm truncate w-40">Rekap ${mtName}</h4>
                    <p class="text-[10px] text-slate-500 font-bold uppercase truncate" title="${kabName}"><i data-lucide="map-pin" class="w-3 h-3 inline mr-0.5"></i> ${kabName}</p>
                </div>
            </div>
            <button onclick="edit11O('${k}')" class="w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 py-2 rounded-lg font-bold text-xs">Lihat / Edit</button>
        </div>`;
    }).join('');
    
    if(typeof initIcons === 'function') initIcons();
}

function edit11O(key) {
    const parts = key.split('_');
    const selKab = document.getElementById('o11-kabupaten-select');
    const selMt = document.getElementById('o11-mt-select');
    
    if(selKab) selKab.value = parts[0];
    if(selMt) selMt.value = parts[1];
    
    onChangeFilter11O();
    document.getElementById('view-blanko-operasi').scrollIntoView({behavior: 'smooth'});
}

function resetInputs11O(keepDropdown = false) {
    if(!keepDropdown) { 
        const selMt = document.getElementById('o11-mt-select');
        const selKab = document.getElementById('o11-kabupaten-select');
        if(selMt) selMt.value = ""; 
        if(selKab) selKab.value = "";
    }
    onChangeFilter11O();
}

// ====================================================================
// --- SISTEM LOGIKA FORMULIR 12-O (REKAP PROVINSI GRUP KABUPATEN) ---
// ====================================================================

// ====================================================================
// --- SISTEM LOGIKA FORMULIR 12-O (REKAP PROVINSI GRUP KABUPATEN) ---
// ====================================================================

function render12O(isEditMode = false) {
    hideFormAlert('o12');
    
    const allDIs = getAllDI();
    let periodeStr = "-";
    
    // Cari Periode Aktif
    for (let di of allDIs) {
        const o1Data = getLS('01O_' + di) || {};
        const keys = Object.keys(o1Data);
        if(keys.length > 0 && o1Data[keys[0]].periode) {
            periodeStr = o1Data[keys[0]].periode; break;
        }
    }
    
    const txtPeriode = document.getElementById('o12-periodeText');
    if(txtPeriode) txtPeriode.innerText = periodeStr;

    const tbody = document.getElementById('o12-tbody');
    const tfoot = document.getElementById('o12-tfoot');
    const savedData = getLS('12O_GLOBAL') || {}; 

    // ðŸ‘‡ REVISI: Kosongkan Jumlah Kabupaten di Awal ðŸ‘‡
    document.getElementById('o12-jml-kab').innerText = "-";

    renderSavedList12O();
    syncOperasiGlobalFromSupabase('12O_GLOBAL', '12-O', renderSavedList12O);

    if (savedData[periodeStr] && !isEditMode) {
        if(tbody) tbody.innerHTML = `
            <tr>
                <td colspan="30" class="p-12 text-center bg-indigo-50/30">
                    <div class="flex flex-col items-center justify-center">
                        <div class="bg-indigo-100 text-indigo-600 p-4 rounded-full mb-4 shadow-sm border border-indigo-200">
                            <i data-lucide="shield-check" class="w-10 h-10"></i>
                        </div>
                        <h4 class="text-lg font-black text-slate-800 mb-2 uppercase tracking-wide">Laporan Telah Tersimpan</h4>
                        <p class="text-sm text-slate-600 mb-5 max-w-md">Laporan Rekapitulasi Provinsi 12-O untuk periode <strong>${periodeStr}</strong> sudah diamankan.</p>
                        <div class="bg-white px-5 py-3 rounded-lg border border-slate-200 shadow-sm flex flex-col gap-2">
                            <button onclick="edit12O('${periodeStr}')" class="px-4 py-2 bg-indigo-50 text-indigo-700 rounded font-bold text-xs hover:bg-indigo-100 transition-colors">Buka Segel Laporan</button>
                        </div>
                    </div>
                </td>
            </tr>`;
        if(tfoot) tfoot.classList.add('hidden');
        
        // Kembalikan Jumlah Kabupaten jika statusnya tersimpan dan punya baris
        if (savedData[periodeStr].rows) {
             document.getElementById('o12-jml-kab').innerText = Object.keys(savedData[periodeStr].rows).length;
        }
        
        if (typeof initIcons === 'function') initIcons();
        return;
    }

    if(tfoot) tfoot.classList.add('hidden'); // Sembunyikan tfoot di awal

    // ðŸ‘‡ REVISI: Tampilkan pesan kosong saat pertama kali tab dibuka ðŸ‘‡
    if (tbody) {
        tbody.innerHTML = `<tr><td colspan="30" class="p-12 text-center text-slate-400 italic">Silakan klik "Tarik & Gabung Data 11-O" untuk memuat rekapitulasi Provinsi...</td></tr>`;
    }

    // Jika mode edit (setelah klik "Lihat/Edit" dari arsip), langsung bangun tabelnya
    if (isEditMode && savedData[periodeStr]) {
        bangunTabel12O(periodeStr, savedData[periodeStr]);
    }
}

// ðŸ‘‡ FUNGSI BARU: Untuk membangun struktur baris tabel setelah tombol ditarik ðŸ‘‡
function bangunTabel12O(periodeStr, dataTersimpan = null) {
    const allDIs = getAllDI();
    let kabupatens = {}; 
    
    // Hitung jumlah kabupaten
    allDIs.forEach(di => {
        const pData = getProfilData(di);
        const kabName = pData.kabupaten || "(Kabupaten Belum Diatur)";
        if(!kabupatens[kabName]) kabupatens[kabName] = { countDI: 0 };
        kabupatens[kabName].countDI++;
    });

    // Update Jumlah Kabupaten Terdata
    document.getElementById('o12-jml-kab').innerText = Object.keys(kabupatens).length;

    let tbHtml = '';
    let index = 1;
    Object.keys(kabupatens).forEach(kabName => {
        const jmlDI = kabupatens[kabName].countDI;
        tbHtml += `
            <tr class="border-b bg-white hover:bg-slate-50 transition-colors" data-kab="${kabName}">
                <td class="p-2 border-r text-center font-bold text-slate-600 bg-white" style="left: 0; position: sticky; z-index: 10;">${index++}</td>
                <td class="p-2 border-r font-black text-indigo-900 bg-indigo-50 whitespace-normal uppercase" style="left: 45px; position: sticky; z-index: 10;">${kabName}</td>
                <td class="p-1 border-r-4 border-slate-300 bg-white shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]" style="left: 200px; position: sticky; z-index: 10;">
                    <input type="text" readonly class="inp-tbl-calc w-full text-center font-black text-indigo-700 text-base cursor-not-allowed bg-transparent outline-none" data-col="jml-di" value="${jmlDI}">
                </td>
                
                <td class="p-1 border-r bg-blue-50/20"><input type="text" readonly class="inp-tbl-calc w-full text-center text-slate-700 bg-slate-50/30 cursor-not-allowed o12-inp outline-none" data-col="ren-padi-1"></td>
                <td class="p-1 border-r bg-blue-50/20"><input type="text" readonly class="inp-tbl-calc w-full text-center text-slate-700 bg-slate-50/30 cursor-not-allowed o12-inp outline-none" data-col="ren-padi-2"></td>
                <td class="p-1 border-r bg-blue-50/20"><input type="text" readonly class="inp-tbl-calc w-full text-center text-slate-700 bg-slate-50/30 cursor-not-allowed o12-inp outline-none" data-col="ren-padi-3"></td>
                <td class="p-1 border-r bg-blue-50/20"><input type="text" readonly class="inp-tbl-calc w-full text-center text-slate-700 bg-slate-50/30 cursor-not-allowed o12-inp outline-none" data-col="ren-pala-1"></td>
                <td class="p-1 border-r bg-blue-50/20"><input type="text" readonly class="inp-tbl-calc w-full text-center text-slate-700 bg-slate-50/30 cursor-not-allowed o12-inp outline-none" data-col="ren-pala-2"></td>
                <td class="p-1 border-r bg-blue-50/20"><input type="text" readonly class="inp-tbl-calc w-full text-center text-slate-700 bg-slate-50/30 cursor-not-allowed o12-inp outline-none" data-col="ren-pala-3"></td>
                <td class="p-1 border-r bg-blue-50/20"><input type="text" readonly class="inp-tbl-calc w-full text-center text-slate-700 bg-slate-50/30 cursor-not-allowed o12-inp outline-none" data-col="ren-tebu-m"></td>
                <td class="p-1 border-r bg-blue-50/20"><input type="text" readonly class="inp-tbl-calc w-full text-center text-slate-700 bg-slate-50/30 cursor-not-allowed o12-inp outline-none" data-col="ren-tebu-t"></td>
                <td class="p-1 border-r bg-blue-50/20"><input type="text" readonly class="inp-tbl-calc w-full text-center text-slate-700 bg-slate-50/30 cursor-not-allowed o12-inp outline-none" data-col="ren-lain"></td>
                <td class="p-1 border-r"><input type="text" readonly class="inp-tbl-calc w-full text-center font-bold text-blue-800 bg-blue-100/50 cursor-not-allowed outline-none" data-col="ren-jml"></td>
                <td class="p-1 border-r-4 border-slate-300"><input type="text" readonly class="inp-tbl-calc w-full text-center font-bold text-orange-700 bg-orange-50/50 cursor-not-allowed o12-inp outline-none" data-col="ren-bero"></td>

                <td class="p-1 border-r bg-emerald-50/20"><input type="text" readonly class="inp-tbl-calc w-full text-center text-slate-700 bg-slate-50/30 cursor-not-allowed o12-inp outline-none" data-col="real-padi-1"></td>
                <td class="p-1 border-r bg-emerald-50/20"><input type="text" readonly class="inp-tbl-calc w-full text-center text-slate-700 bg-slate-50/30 cursor-not-allowed o12-inp outline-none" data-col="real-padi-2"></td>
                <td class="p-1 border-r bg-emerald-50/20"><input type="text" readonly class="inp-tbl-calc w-full text-center text-slate-700 bg-slate-50/30 cursor-not-allowed o12-inp outline-none" data-col="real-padi-3"></td>
                <td class="p-1 border-r bg-emerald-50/20"><input type="text" readonly class="inp-tbl-calc w-full text-center text-slate-700 bg-slate-50/30 cursor-not-allowed o12-inp outline-none" data-col="real-pala-1"></td>
                <td class="p-1 border-r bg-emerald-50/20"><input type="text" readonly class="inp-tbl-calc w-full text-center text-slate-700 bg-slate-50/30 cursor-not-allowed o12-inp outline-none" data-col="real-pala-2"></td>
                <td class="p-1 border-r bg-emerald-50/20"><input type="text" readonly class="inp-tbl-calc w-full text-center text-slate-700 bg-slate-50/30 cursor-not-allowed o12-inp outline-none" data-col="real-pala-3"></td>
                <td class="p-1 border-r bg-emerald-50/20"><input type="text" readonly class="inp-tbl-calc w-full text-center text-slate-700 bg-slate-50/30 cursor-not-allowed o12-inp outline-none" data-col="real-tebu-m"></td>
                <td class="p-1 border-r bg-emerald-50/20"><input type="text" readonly class="inp-tbl-calc w-full text-center text-slate-700 bg-slate-50/30 cursor-not-allowed o12-inp outline-none" data-col="real-tebu-t"></td>
                <td class="p-1 border-r bg-emerald-50/20"><input type="text" readonly class="inp-tbl-calc w-full text-center text-slate-700 bg-slate-50/30 cursor-not-allowed o12-inp outline-none" data-col="real-lain"></td>
                <td class="p-1 border-r"><input type="text" readonly class="inp-tbl-calc w-full text-center font-bold text-emerald-800 bg-emerald-100/50 cursor-not-allowed outline-none" data-col="real-jml"></td>
                <td class="p-1 border-r-4 border-slate-300"><input type="text" readonly class="inp-tbl-calc w-full text-center font-bold text-orange-700 bg-orange-50/50 cursor-not-allowed o12-inp outline-none" data-col="real-bero"></td>

                <td class="p-1 border-r bg-red-50/30"><input type="text" readonly class="inp-tbl-calc w-full text-center text-red-700 bg-transparent cursor-not-allowed o12-inp outline-none" data-col="k-padi"></td>
                <td class="p-1 border-r bg-red-50/30"><input type="text" readonly class="inp-tbl-calc w-full text-center text-red-700 bg-transparent cursor-not-allowed o12-inp outline-none" data-col="k-pala"></td>
                <td class="p-1 border-r bg-red-50/30"><input type="text" readonly class="inp-tbl-calc w-full text-center text-red-700 bg-transparent cursor-not-allowed o12-inp outline-none" data-col="k-tebu"></td>
                
                <td class="p-1 border-r bg-rose-50/50"><input type="text" readonly class="inp-tbl-calc w-full text-center text-rose-700 bg-transparent cursor-not-allowed o12-inp outline-none" data-col="b-padi"></td>
                <td class="p-1 border-r bg-rose-50/50"><input type="text" readonly class="inp-tbl-calc w-full text-center text-rose-700 bg-transparent cursor-not-allowed o12-inp outline-none" data-col="b-pala"></td>
                <td class="p-1"><input type="text" readonly class="inp-tbl-calc w-full text-center text-rose-700 bg-transparent cursor-not-allowed o12-inp outline-none" data-col="b-tebu"></td>
            </tr>`;
    });

    const tbody = document.getElementById('o12-tbody');
    const tfoot = document.getElementById('o12-tfoot');
    const totalCols12O = ['jml-di',
        'ren-padi-1','ren-padi-2','ren-padi-3','ren-pala-1','ren-pala-2','ren-pala-3','ren-tebu-m','ren-tebu-t','ren-lain','ren-jml','ren-bero',
        'real-padi-1','real-padi-2','real-padi-3','real-pala-1','real-pala-2','real-pala-3','real-tebu-m','real-tebu-t','real-lain','real-jml','real-bero',
        'k-padi','k-pala','k-tebu','b-padi','b-pala','b-tebu'];
    
    if(tbody) tbody.innerHTML = tbHtml;
    if(tfoot) {
        tfoot.innerHTML = `
            <tr class="text-center">
                <td colspan="2" class="p-3 border-r border-slate-400 bg-slate-300 text-left font-black text-slate-900 uppercase sticky left-0 z-20">
                    Jumlah
                </td>
                ${totalCols12O.map((col, idx) => {
                    const borderClass = col === 'jml-di' || col === 'ren-bero' || col === 'real-bero' ? 'border-r-4 border-slate-400' : (idx === totalCols12O.length - 1 ? '' : 'border-r');
                    return `<td class="p-2 ${borderClass} bg-slate-200 text-slate-900" id="o12-tot-${col}">0</td>`;
                }).join('')}
            </tr>
        `;
        tfoot.classList.remove('hidden');
    }

    if (dataTersimpan) fillForm12O(dataTersimpan);
}

// ðŸ‘‡ FUNGSI AKUMULASI YANG DIREVISI ðŸ‘‡
async function autoAkumulasi12O() {
    if (typeof showModernConfirm === 'function') {
        const isConfirmed = await showModernConfirm(
            "Tarik & Gabung Data 11-O?",
            "Sistem akan membedah seluruh Arsip 11-O (Tingkat Kabupaten) dan menyatukan seluruh MT ke dalam baris tabel Provinsi ini. Lanjutkan?"
        );
        if (!isConfirmed) return;
    } 
    
    // Terapkan render bersih (bukan edit mode)
    hideFormAlert('o12');

    // 1. Bangkitkan baris HTML tabel
    bangunTabel12O(document.getElementById('o12-periodeText').innerText);

    const o11 = getLS('11O_GLOBAL') || {};
    const rows = document.querySelectorAll('#o12-tbody tr[data-kab]'); 
    
    // Hapus logika pencarian manual D.I. ke Kabupaten
    // Karena 11-O sudah menyimpan datanya berdasarkan Kabupaten!

    rows.forEach(row => {
        const kabName = row.getAttribute('data-kab');
        let sums = {};
        const cols = ['ren-padi-1','ren-padi-2','ren-padi-3','ren-pala-1','ren-pala-2','ren-pala-3','ren-tebu-m','ren-tebu-t','ren-lain','ren-bero',
                      'real-padi-1','real-padi-2','real-padi-3','real-pala-1','real-pala-2','real-pala-3','real-tebu-m','real-tebu-t','real-lain','real-bero',
                      'k-padi','k-pala','k-tebu','b-padi','b-pala','b-tebu'];
        cols.forEach(c => sums[c] = 0);

        ['MT1', 'MT2', 'MT3'].forEach((mt, mtIdx) => {
            // Kita langsung tembak kunci Kabupaten_MT di brankas 11-O
            const key11 = `${kabName}_${mt}`;
            
            if(o11[key11] && o11[key11].rows) {
                // Di dalam brankas 11-O, data sudah dikelompokkan per D.I, jadi kita tinggal jumlahkan semuanya
                Object.values(o11[key11].rows).forEach(bendungData => {
                    const getV = (c) => parseFloat(bendungData[c]) || 0;
                    
                    sums[`ren-padi-${mtIdx+1}`] += getV('ren-padi');
                    sums[`ren-pala-${mtIdx+1}`] += getV('ren-pala');
                    sums[`real-padi-${mtIdx+1}`] += getV('real-padi-i') + getV('real-padi-t');
                    sums[`real-pala-${mtIdx+1}`] += getV('real-pala');

                    sums['ren-tebu-m'] += getV('ren-tebu-b');
                    sums['ren-tebu-t'] += getV('ren-tebu-l');
                    sums['ren-lain'] += getV('ren-lain');
                    sums['ren-bero'] += getV('ren-bero');
                    
                    sums['real-tebu-m'] += getV('real-tebu-b') || getV('real-tebu'); 
                    sums['real-lain'] += getV('real-lain');
                    sums['real-bero'] += getV('real-bero');
                    
                    sums['k-padi'] += getV('k-padi');
                    sums['k-pala'] += getV('k-pala');
                    sums['k-tebu'] += getV('k-tebu');
                    sums['b-padi'] += getV('b-padi');
                    sums['b-pala'] += getV('b-pala');
                    sums['b-tebu'] += getV('b-tebu');
                });
            }
        });

        // Cetak Nilai Akumulasi
        Object.keys(sums).forEach(k => {
            const inp = row.querySelector(`input[data-col="${k}"]`);
            if(inp) inp.value = sums[k] > 0 ? sums[k].toFixed(2) : "";
        });
    });

    calc12O();
    showFormAlert('o12', "Berhasil! Seluruh data dari tingkat Kabupaten telah digabungkan ke Provinsi.", "success");
}

function calc12O() {
    const rows = document.querySelectorAll('#o12-tbody tr[data-kab]');
    const cols = ['jml-di',
                  'ren-padi-1','ren-padi-2','ren-padi-3','ren-pala-1','ren-pala-2','ren-pala-3','ren-tebu-m','ren-tebu-t','ren-lain','ren-jml','ren-bero',
                  'real-padi-1','real-padi-2','real-padi-3','real-pala-1','real-pala-2','real-pala-3','real-tebu-m','real-tebu-t','real-lain','real-jml','real-bero',
                  'k-padi','k-pala','k-tebu','b-padi','b-pala','b-tebu'];
    
    let totals = {};
    cols.forEach(c => totals[c] = 0);

    rows.forEach(row => {
        const getV = (c) => parseFloat(row.querySelector(`input[data-col="${c}"]`).value) || 0;
        
        const renJml = getV('ren-padi-1') + getV('ren-padi-2') + getV('ren-padi-3') +
                       getV('ren-pala-1') + getV('ren-pala-2') + getV('ren-pala-3') +
                       getV('ren-tebu-m') + getV('ren-tebu-t') + getV('ren-lain');
        row.querySelector(`input[data-col="ren-jml"]`).value = renJml > 0 ? renJml.toFixed(2) : "";

        const realJml = getV('real-padi-1') + getV('real-padi-2') + getV('real-padi-3') +
                        getV('real-pala-1') + getV('real-pala-2') + getV('real-pala-3') +
                        getV('real-tebu-m') + getV('real-tebu-t') + getV('real-lain');
        row.querySelector(`input[data-col="real-jml"]`).value = realJml > 0 ? realJml.toFixed(2) : "";

        cols.forEach(c => {
            if(c.includes('jml') && !c.includes('jml-di')) {
                totals[c] += parseFloat(row.querySelector(`input[data-col="${c}"]`).value) || 0;
            } else {
                totals[c] += getV(c);
            }
        });
    });

    cols.forEach(c => {
        const footEl = document.getElementById(`o12-tot-${c}`);
        if(footEl) footEl.innerText = totals[c] > 0 ? totals[c].toFixed(2) : "0";
    });
}

async function saveForm12O() {
    const periode = document.getElementById('o12-periodeText').innerText;
    if(periode === "-") return showFormAlert('o12', "Periode tidak tersedia!", "error");

    const rows = document.querySelectorAll('#o12-tbody tr[data-kab]');
    const data = { periode, rows: {} };
    const cols = ['jml-di',
                  'ren-padi-1','ren-padi-2','ren-padi-3','ren-pala-1','ren-pala-2','ren-pala-3','ren-tebu-m','ren-tebu-t','ren-lain','ren-bero',
                  'real-padi-1','real-padi-2','real-padi-3','real-pala-1','real-pala-2','real-pala-3','real-tebu-m','real-tebu-t','real-lain','real-bero',
                  'k-padi','k-pala','k-tebu','b-padi','b-pala','b-tebu'];
    
    rows.forEach(row => {
        const kabName = row.getAttribute('data-kab');
        data.rows[kabName] = {};
        cols.forEach(c => {
            data.rows[kabName][c] = row.querySelector(`input[data-col="${c}"]`).value;
        });
    });

    const savedData = getLS('12O_GLOBAL') || {};
    savedData[periode] = withReportTimestamps(data, savedData[periode]);
    setLS('12O_GLOBAL', savedData);

    let onlineSaved = false;
    try {
        onlineSaved = await saveLaporanOnline('12-O', savedData[periode], {
            kategori: 'operasi',
            key_laporan: periode,
            periode,
            tahun: 'PROVINSI',
            targetAllDI: true
        });
    } catch (err) {
        console.error('Gagal simpan 12-O ke Supabase:', err);
    }

    renderSavedList12O();
    render12O(false); 
    
    showOperationSaveAlert('o12', `Laporan Rekap Provinsi (${periode}) berhasil disimpan${onlineSaved ? ' ke Supabase' : ' lokal'}.`, onlineSaved ? "success" : "warning", periode);
    setTimeout(() => hideFormAlert('o12'), 4000);
}

function fillForm12O(data) {
    const rows = document.querySelectorAll('#o12-tbody tr[data-kab]');
    const cols = ['jml-di',
                  'ren-padi-1','ren-padi-2','ren-padi-3','ren-pala-1','ren-pala-2','ren-pala-3','ren-tebu-m','ren-tebu-t','ren-lain','ren-bero',
                  'real-padi-1','real-padi-2','real-padi-3','real-pala-1','real-pala-2','real-pala-3','real-tebu-m','real-tebu-t','real-lain','real-bero',
                  'k-padi','k-pala','k-tebu','b-padi','b-pala','b-tebu'];
    
    rows.forEach(row => {
        const kabName = row.getAttribute('data-kab');
        if (data.rows && data.rows[kabName]) {
            cols.forEach(c => {
                const inp = row.querySelector(`input[data-col="${c}"]`);
                if(inp) inp.value = data.rows[kabName][c] || "";
            });
        }
    });
}

function renderSavedList12O() {
    const savedData = getLS('12O_GLOBAL') || {};
    const container = document.getElementById('o12-saved-list');
    const allKeys = Object.keys(savedData).sort().reverse();
    const keys = filterOperationSavedKeys('12-O', allKeys, savedData);

    if (allKeys.length === 0) {
        container.innerHTML = `<p class="col-span-full text-center text-slate-400 italic py-8 border border-dashed rounded-xl bg-slate-50">Belum ada Laporan Rekap Provinsi.</p>`;
        return;
    }
    if (keys.length === 0) return renderNoActiveOperasiMessage(container, 'Laporan Rekap Provinsi 12-O');

    container.innerHTML = keys.map(k => {
        return `<div class="bg-white p-4 border rounded-xl shadow-sm hover:shadow-md transition-all">
            <div class="flex items-start gap-3 mb-4">
                <div class="bg-indigo-100 text-indigo-600 p-2.5 rounded-lg shrink-0"><i data-lucide="globe" class="w-5 h-5"></i></div>
                <div class="w-full overflow-hidden">
                    <h4 class="font-black text-slate-800 text-sm truncate uppercase">PERIODE ${k}</h4>
                    <p class="text-[10px] text-slate-500 font-medium truncate mt-0.5">Rekapitulasi Tingkat Provinsi</p>
                </div>
            </div>
            <button onclick="edit12O('${k}')" class="w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 py-2 rounded-lg font-bold text-xs transition-colors cursor-pointer">Lihat / Edit Rekap</button>
        </div>`;
    }).join('');
    if(typeof initIcons === 'function') initIcons();
}

function edit12O(key) {
    const data = (getLS('12O_GLOBAL') || {})[key];
    if(!data) return;
    
    render12O(true); 
    fillForm12O(data);
    calc12O();
    document.getElementById('view-blanko-operasi').scrollIntoView({behavior: 'smooth'});
}

function resetInputs12O() {
    document.querySelectorAll('.o12-inp').forEach(inp => inp.value = "");
    calc12O();
    hideFormAlert('o12');
}

// ====================================================================
// --- FORMULIR 01-P (INSPEKSI RUTIN KERUSAKAN JARINGAN IRIGASI) ---
// ====================================================================

function render01P() {
    hideFormAlert('p1');
    const pData = getProfilData(currentDI);
    
    // 1. Info Header
    ['di','kodeDI','pengamat','kabupaten'].forEach(id => {
        const el = document.getElementById('p1-' + id);
        if(el) el.innerText = (id === 'di') ? currentDI : (pData[id] || "-");
    });
    
    let totalLuasDI = 0;
    if(pData.bendungs) pData.bendungs.forEach(b => { if(b.rincian) b.rincian.forEach(r => totalLuasDI += (parseFloat(r.luasFungsional)||0)); });
    const elLuas = document.getElementById('p1-totalLuasDI');
    if(elLuas) elLuas.innerText = totalLuasDI > 0 ? totalLuasDI.toFixed(2) + " Ha" : "0 Ha";

    // 2. Dropdown Tahun Dinamis (Dengan Opsi Pilih Tahun)
    const selTahun = document.getElementById('p1-filter-tahun');
    if (selTahun) {
        const thnSekarang = new Date().getFullYear();
        let thnOpts = '<option value="">-- Pilih Tahun --</option>';
        for (let i = thnSekarang - 2; i <= thnSekarang + 2; i++) {
            thnOpts += `<option value="${i}">${i}</option>`;
        }
        selTahun.innerHTML = thnOpts;
    }

    // 3. Dropdown Bulan Dinamis (Dengan Opsi Pilih Bulan)
    const selBulan = document.getElementById('p1-filter-bulan');
    if (selBulan) {
        let blnOpts = '<option value="">-- Pilih Bulan --</option>';
        const months = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
        months.forEach(m => { blnOpts += `<option value="${m}">${m.toUpperCase()}</option>`; });
        selBulan.innerHTML = blnOpts;
    }

    // 4. Dropdown Juru
    const selJuru = document.getElementById('p1-juru');
    if (selJuru) {
        const currentJuru = selJuru.value; 
        let juruOpts = '<option value="">-- Pilih Juru --</option>';
        if (pData.jurus && pData.jurus.length > 0) {
            pData.jurus.forEach(j => { if(j.nama.trim() !== "") juruOpts += `<option value="${j.nama}">${j.nama}</option>`; });
        }
        selJuru.innerHTML = juruOpts;
        if (currentJuru) selJuru.value = currentJuru;
    }

    // Default ke posisi Kosong jika ada yang belum dipilih
    if (!document.getElementById('p1-filter-bulan').value || !document.getElementById('p1-filter-tahun').value || !selJuru.value) {
        resetInputs01P(false); // false = jangan hide alert kalau ini bagian dari proses rendering awal
    } else {
        onChangeFilter01P();
    }
    
    renderSavedList01P();
    syncPemeliharaanFormFromSupabase('01P', '01-P', renderSavedList01P);
}

/**
 * Mengambil nilai periode gabungan (Bulan + Tahun)
 */
function getPeriodeValue01P() {
    const b = document.getElementById('p1-filter-bulan')?.value || "";
    const t = document.getElementById('p1-filter-tahun')?.value || "";
    if (!b || !t) return ""; // Jika salah satu kosong, anggap belum lengkap
    return `${b} ${t}`.trim(); 
}

function onChangeFilter01P() {
    hideFormAlert('p1');
    const periode = getPeriodeValue01P();
    const juru = document.getElementById('p1-juru')?.value;
    const tbody = document.getElementById('p1-tbody');
    const btnAdd = document.getElementById('p1-btn-add');

    if (!tbody || !btnAdd) return;

    if (!juru || !periode) {
        tbody.innerHTML = '<tr id="p1-empty-row"><td colspan="14" class="p-8 text-center text-slate-400 italic font-medium">Silakan Pilih Periode Waktu dan Juru / Mantri terlebih dahulu.</td></tr>';
        btnAdd.classList.add('hidden');
        calcJumlah01P();
        return;
    }

    btnAdd.classList.remove('hidden');
    const key = `${periode}_${juru}`;
    const savedData = (getLS('01P_' + currentDI) || {})[key];

    tbody.innerHTML = ''; 

    if (savedData && savedData.rows && savedData.rows.length > 0) {
        savedData.rows.forEach(rowData => addTableRow01P(rowData));
        showFormAlert('p1', `Menampilkan riwayat laporan tersimpan untuk Juru <strong>${juru}</strong> periode <strong>${periode}</strong>.`, "info");
    } else {
        addTableRow01P(); 
    }
}

function addTableRow01P(data = null) {
    const tbody = document.getElementById('p1-tbody');
    if (!tbody) return;

    const emptyRow = document.getElementById('p1-empty-row');
    if (emptyRow) emptyRow.remove();

    const tr = document.createElement('tr');
    tr.className = "border-b hover:bg-slate-50 transition-colors p1-row bg-white";
    
    const d = data || { sal:'', bang:'', bcr:'', rsk:'', lng:'', rtk:'', pnt:'', sdm:'', lln:'', tnd:'', arl:'', dsa:'' };

    tr.innerHTML = `
        <td class="p-2 border-r text-center font-bold text-slate-600 bg-slate-50 row-no" style="left: 0; position: sticky; z-index: 10;">1</td>
        <td class="p-1 border-r bg-white shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]" style="left: 35px; position: sticky; z-index: 10;"><input type="text" class="w-full min-w-[120px] p-1 border border-transparent focus:border-indigo-300 rounded outline-none text-left font-medium text-indigo-800 bg-white" data-col="sal" value="${d.sal}" placeholder="..."></td>
        <td class="p-1 border-r-4 border-slate-300"><input type="text" class="w-full min-w-[120px] p-1 border border-transparent focus:border-indigo-300 rounded outline-none text-left font-medium text-slate-800" data-col="bang" value="${d.bang}" placeholder="..."></td>
        
        <td class="p-1 border-r bg-rose-50/30"><input type="text" class="w-full min-w-[60px] p-1 border border-transparent focus:border-rose-300 rounded outline-none text-center text-rose-700 font-bold" data-col="bcr" value="${d.bcr}" placeholder="-"></td>
        <td class="p-1 border-r bg-rose-50/30"><input type="text" class="w-full min-w-[60px] p-1 border border-transparent focus:border-rose-300 rounded outline-none text-center text-rose-700 font-bold" data-col="rsk" value="${d.rsk}" placeholder="-"></td>
        <td class="p-1 border-r bg-rose-50/30"><input type="text" class="w-full min-w-[60px] p-1 border border-transparent focus:border-rose-300 rounded outline-none text-center text-rose-700 font-bold" data-col="lng" value="${d.lng}" placeholder="-"></td>
        <td class="p-1 border-r bg-rose-50/30"><input type="text" class="w-full min-w-[60px] p-1 border border-transparent focus:border-rose-300 rounded outline-none text-center text-rose-700 font-bold" data-col="rtk" value="${d.rtk}" placeholder="-"></td>
        <td class="p-1 border-r bg-rose-50/30"><input type="text" class="w-full min-w-[60px] p-1 border border-transparent focus:border-rose-300 rounded outline-none text-center text-rose-700 font-bold" data-col="pnt" value="${d.pnt}" placeholder="-"></td>
        <td class="p-1 border-r bg-rose-50/30"><input type="text" class="w-full min-w-[60px] p-1 border border-transparent focus:border-rose-300 rounded outline-none text-center text-rose-700 font-bold" data-col="sdm" value="${d.sdm}" placeholder="-"></td>
        <td class="p-1 border-r-4 border-slate-300 bg-rose-50/30"><input type="text" class="w-full min-w-[60px] p-1 border border-transparent focus:border-rose-300 rounded outline-none text-center text-rose-700 font-bold" data-col="lln" value="${d.lln}" placeholder="-"></td>
        
        <td class="p-1 border-r">
            <select class="w-full min-w-[120px] p-1 border border-transparent outline-none bg-indigo-50 font-bold text-indigo-700 text-[11px] cursor-pointer rounded" data-col="tnd">
                <option value="">-- Tindakan --</option>
                <option value="Dikerjakan" ${d.tnd === 'Dikerjakan' ? 'selected' : ''}>Dikerjakan</option>
                <option value="Usul Tindak Lanjut" ${d.tnd === 'Usul Tindak Lanjut' ? 'selected' : ''}>Usul Tindak Lanjut</option>
            </select>
        </td>
        <td class="p-1 border-r"><input type="number" step="any" class="w-full min-w-[80px] p-1 border border-transparent focus:border-indigo-300 rounded outline-none text-center" data-col="arl" value="${d.arl}" placeholder="ha"></td>
        <td class="p-1 border-r"><input type="text" class="w-full min-w-[100px] p-1 border border-transparent focus:border-indigo-300 rounded outline-none text-center text-xs" data-col="dsa" value="${d.dsa}" placeholder="..."></td>
        
        <td class="p-1 text-center">
            <button onclick="removeTableRow01P(this)" class="bg-red-50 hover:bg-red-100 text-red-500 p-1.5 rounded transition-colors cursor-pointer" title="Hapus Baris">
                <i data-lucide="x" class="w-4 h-4"></i>
            </button>
        </td>
    `;
    
    tbody.appendChild(tr);
    tr.querySelectorAll('input, select').forEach(el => el.addEventListener('input', calcJumlah01P));
    tr.querySelectorAll('select').forEach(el => el.addEventListener('change', calcJumlah01P));
    calcNo01P();
    calcJumlah01P();
    if(typeof initIcons === 'function') initIcons();
}

function removeTableRow01P(btn) {
    const tr = btn.closest('tr');
    tr.remove();
    calcNo01P();
    
    const tbody = document.getElementById('p1-tbody');
    if (tbody.querySelectorAll('.p1-row').length === 0) {
        addTableRow01P();
    }
    calcJumlah01P();
}

function calcNo01P() {
    const rows = document.querySelectorAll('#p1-tbody .p1-row');
    rows.forEach((row, idx) => row.querySelector('.row-no').innerText = idx + 1);
}

function calcJumlah01P() {
    const rows = document.querySelectorAll('#p1-tbody .p1-row');
    const tfoot = document.getElementById('p1-tfoot');
    if (tfoot) tfoot.classList.toggle('hidden', rows.length === 0);

    const numberCols = ['bcr','rsk','lng','rtk','pnt','sdm','lln','arl'];
    const totals = Object.fromEntries(numberCols.map(col => [col, 0]));

    rows.forEach(row => {
        numberCols.forEach(col => {
            const raw = row.querySelector(`[data-col="${col}"]`)?.value || '';
            const num = parseFloat(String(raw).replace(',', '.'));
            if (Number.isFinite(num)) totals[col] += num;
        });
    });

    numberCols.forEach(col => {
        const el = document.getElementById(`p1-total-${col}`);
        if (!el) return;
        el.innerText = totals[col] > 0 ? totals[col].toFixed(col === 'arl' ? 2 : 0) : '-';
    });
}

async function saveForm01P() {
    const periode = getPeriodeValue01P();
    const juru = document.getElementById('p1-juru').value;
    
    if (!periode || !juru) return showFormAlert('p1', "Pilih Periode Waktu dan Juru terlebih dahulu sebelum menyimpan!", "error");

    const rows = document.querySelectorAll('#p1-tbody .p1-row');
    let rowData = [];
    let hasData = false;
    
    rows.forEach(row => {
        let rObj = {};
        let isRowEmpty = true;
        ['sal','bang','bcr','rsk','lng','rtk','pnt','sdm','lln','tnd','arl','dsa'].forEach(c => {
            const el = row.querySelector(`[data-col="${c}"]`);
            rObj[c] = el ? el.value.trim() : "";
            if (rObj[c] !== "") isRowEmpty = false;
        });
        if(!isRowEmpty) { rowData.push(rObj); hasData = true; }
    });

    if (!hasData) return showFormAlert('p1', "Tabel masih kosong! Harap isi minimal 1 baris.", "error");

    const key = `${periode}_${juru}`;
    const savedData = getLS('01P_' + currentDI) || {};
    savedData[key] = withReportTimestamps({ bulan: periode, juru, rows: rowData }, savedData[key]);
    setLS('01P_' + currentDI, savedData);

    let onlineSaved = false;
    try {
        onlineSaved = await saveLaporanOnline('01-P', savedData[key], {
            kategori: 'pemeliharaan',
            key_laporan: key,
            periode,
            tahun: periode.split(' ').pop() || '',
        });
    } catch (err) {
        console.error('Gagal simpan 01-P ke Supabase:', err);
    }

    renderSavedList01P();
    
    // ðŸ‘‡ SAPU BERSIH INSTAN (Tanpa Delay) ðŸ‘‡
    resetInputs01P(true); // true = sembunyikan alert sebelumnya
    
    // Tampilkan notifikasi sukses layaknya 01-O
    showPemeliharaanSaveAlert('p1', `Laporan Inspeksi untuk <strong>${juru}</strong> (${periode}) berhasil disimpan${onlineSaved ? ' ke Supabase' : ' lokal'}.`, onlineSaved ? "success" : "warning", extractPemeliharaanYear({ bulan: periode }, periode));
    setTimeout(() => hideFormAlert('p1'), 4000);
}

function renderSavedList01P() {
    const savedData = getLS('01P_' + currentDI) || {};
    const container = document.getElementById('p1-saved-list');
    if(!container) return;
    
    const allKeys = Object.keys(savedData).sort().reverse();
    const keys = filterPemeliharaanSavedKeys(allKeys, savedData);

    if (allKeys.length === 0) {
        container.innerHTML = `<p class="col-span-full text-center text-slate-400 italic py-8 border border-dashed rounded-xl bg-slate-50">Belum ada Laporan 01-P yang tersimpan.</p>`;
        return;
    }
    if (keys.length === 0) return renderNoActivePemeliharaanMessage(container, 'Laporan 01-P');

    container.innerHTML = keys.map(k => {
        const d = savedData[k];
        const rowCount = d.rows ? d.rows.length : 0;
        return `<div class="bg-white p-4 border rounded-xl shadow-sm hover:shadow-md transition-all">
            <div class="flex items-start gap-3 mb-4">
                <div class="bg-indigo-100 text-indigo-600 p-2.5 rounded-lg"><i data-lucide="file-check" class="w-5 h-5"></i></div>
                <div class="w-full overflow-hidden">
                    <h4 class="font-bold text-slate-800 text-sm truncate uppercase" title="${d.bulan}">${d.bulan}</h4>
                    <p class="text-xs text-indigo-600 font-bold mt-0.5 truncate" title="${d.juru}"><i data-lucide="user" class="w-3 h-3 inline"></i> Juru: ${d.juru}</p>
                    <p class="text-[10px] text-slate-500 font-medium mt-1 bg-slate-100 inline-block px-2 py-0.5 rounded">${rowCount} Kerusakan Dicatat</p>
                </div>
            </div>
            <button onclick="edit01P('${k}')" class="w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 py-2 rounded-lg font-bold text-xs transition-colors">Lihat / Edit</button>
        </div>`;
    }).join('');
    
    if(typeof initIcons === 'function') initIcons();
}

function edit01P(key) {
    const data = (getLS('01P_' + currentDI) || {})[key];
    if(!data) return;
    
    const parts = data.bulan.split(' ');
    if (parts.length === 2) {
        const b = document.getElementById('p1-filter-bulan');
        if(b) b.value = parts[0]; 
        
        const t = document.getElementById('p1-filter-tahun');
        if(t) t.value = parts[1];
    }
    
    document.getElementById('p1-juru').value = data.juru;
    onChangeFilter01P(); 
    document.getElementById('view-blanko-pemeliharaan').scrollIntoView({behavior: 'smooth'});
}

function resetInputs01P(hideAlert = true) {
    // 1. Kosongkan Pilihan Filter ke Default
    document.getElementById('p1-filter-bulan').value = "";
    document.getElementById('p1-filter-tahun').value = "";
    document.getElementById('p1-juru').value = "";
    
    // 2. Kosongkan Tabel & Sembunyikan Tombol Tambah
    const tbody = document.getElementById('p1-tbody');
    if(tbody) tbody.innerHTML = '<tr id="p1-empty-row"><td colspan="14" class="p-8 text-center text-slate-400 italic font-medium">Silakan Pilih Periode Waktu dan Juru / Mantri terlebih dahulu.</td></tr>';
    
    const btnAdd = document.getElementById('p1-btn-add');
    if(btnAdd) btnAdd.classList.add('hidden');
    calcJumlah01P();
    
    if(hideAlert) hideFormAlert('p1');
}

// Fungsi ini bisa dipanggil jika mengklik tombol "Batal/Kosongkan Tabel"
function btnReset01P() {
    resetInputs01P();
}

// ====================================================================
// --- FORMULIR 02-P UTAMA (LAPORAN PENELUSURAN PENGAMAT) ---
// ====================================================================

function render02P() {
    hideFormAlert('p2');
    const pData = getProfilData(currentDI);
    
    // 1. Info Header
    ['di','kodeDI','pengamat','kabupaten'].forEach(id => {
        const el = document.getElementById('p2-' + id);
        if(el) el.innerText = (id === 'di') ? currentDI : (pData[id] || "-");
    });
    
    let totalLuasDI = 0;
    if(pData.bendungs) pData.bendungs.forEach(b => { if(b.rincian) b.rincian.forEach(r => totalLuasDI += (parseFloat(r.luasFungsional)||0)); });
    const elLuas = document.getElementById('p2-totalLuasDI');
    if(elLuas) elLuas.innerText = totalLuasDI > 0 ? totalLuasDI.toFixed(2) + " Ha" : "0 Ha";

    // 2. Dropdown Tahun Dinamis (Dengan Opsi Pilih Tahun)
    const selTahun = document.getElementById('p2-filter-tahun');
    if (selTahun) {
        const thnSekarang = new Date().getFullYear();
        let thnOpts = '<option value="">-- Pilih Tahun --</option>';
        for (let i = thnSekarang - 2; i <= thnSekarang + 2; i++) {
            thnOpts += `<option value="${i}">${i}</option>`;
        }
        selTahun.innerHTML = thnOpts;
    }

    // 3. Dropdown Bulan Dinamis (Dengan Opsi Pilih Bulan)
    const selBulan = document.getElementById('p2-filter-bulan');
    if (selBulan) {
        let blnOpts = '<option value="">-- Pilih Bulan --</option>';
        const months = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
        months.forEach(m => { blnOpts += `<option value="${m}">${m.toUpperCase()}</option>`; });
        selBulan.innerHTML = blnOpts;
    }

    // Default ke posisi Kosong (Sapu Bersih) jika ada yang belum dipilih
    if (!document.getElementById('p2-filter-bulan').value || !document.getElementById('p2-filter-tahun').value) {
        resetInputs02P(false); 
    } else {
        onChangeFilter02P();
    }
    
    renderSavedList02P();
    syncPemeliharaanFormFromSupabase('02P', '02-P', renderSavedList02P);
}

/** Mengambil nilai periode 02-P (Bulan + Tahun) */
function getPeriodeValue02P() {
    const b = document.getElementById('p2-filter-bulan')?.value || "";
    const t = document.getElementById('p2-filter-tahun')?.value || "";
    if(!b || !t) return "";
    return `${b} ${t}`.trim(); 
}

function onChangeFilter02P() {
    hideFormAlert('p2');
    const periode = getPeriodeValue02P();
    const tbody = document.getElementById('p2-tbody');
    const btnSync = document.getElementById('btn-sync-02p');

    if (!tbody) return;

    if (!periode) {
        tbody.innerHTML = '<tr><td colspan="15" class="p-12 text-slate-400 italic text-center">Silakan Pilih Bulan dan Tahun terlebih dahulu.</td></tr>';
        if(btnSync) btnSync.classList.add('hidden');
        calcJumlah02P();
        return;
    }

    if(btnSync) btnSync.classList.remove('hidden');
    
    const savedData = (getLS('02P_' + currentDI) || {})[periode];

    if (savedData && savedData.rows && savedData.rows.length > 0) {
        // Tampilkan Data Lama
        renderTableRows02P(savedData.rows);
        showFormAlert('p2', `Menampilkan arsip 02-P tersimpan untuk periode <strong>${periode}</strong>.`, "info");
    } else {
        // Otomatis Coba Tarik dari 01-P jika belum ada arsip
        syncDataFrom01P(false);
    }
}

function syncDataFrom01P(withAlert = true) {
    const periodeAktif = getPeriodeValue02P();
    if (!periodeAktif) return;

    const data01P = getLS('01P_' + currentDI) || {};
    let masterRows = [];
    
    // Kumpulkan baris dari SELURUH Juru yang memiliki periode yang sama
    Object.keys(data01P).forEach(key => {
        if(key.startsWith(periodeAktif + "_")) {
            const arsipJuru = data01P[key];
            if(arsipJuru.rows) {
                arsipJuru.rows.forEach(r => {
                    // Beri prioritas default "2 - Perlu" jika belum ada
                    masterRows.push({ ...r, prio: '2', bi_rugi: '', bi_baik: '' });
                });
            }
        }
    });

    const tbody = document.getElementById('p2-tbody');
    
    if(masterRows.length === 0) {
        if(withAlert) showFormAlert('p2', `Tidak ditemukan data laporan Juru (01-P) untuk periode ${periodeAktif}.`, "error");
        tbody.innerHTML = `<tr><td colspan="15" class="p-12 text-slate-400 italic text-center">Laporan 01-P dari Juru untuk periode ${periodeAktif} masih kosong.</td></tr>`;
        return;
    }

    renderTableRows02P(masterRows);
    if(withAlert) showFormAlert('p2', `Berhasil menarik ${masterRows.length} laporan kerusakan dari semua Juru di periode ${periodeAktif}.`, "success");
}

function renderTableRows02P(rows) {
    const tbody = document.getElementById('p2-tbody');
    
    // Sortir berdasarkan Prioritas (1 paling atas)
    rows.sort((a, b) => (parseInt(a.prio) || 2) - (parseInt(b.prio) || 2));

    tbody.innerHTML = rows.map((d, idx) => `
        <td class="p-2 border-r text-center font-bold text-slate-600 bg-slate-50" style="left: 0; position: sticky; z-index: 10;">${idx + 1}</td>
        <td class="p-1 border-r bg-white shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]" style="left: 35px; position: sticky; z-index: 10;"><input type="text" class="w-full min-w-[120px] p-1 border-transparent focus:border-indigo-300 rounded outline-none text-left font-medium text-indigo-800 bg-white" data-col="sal" value="${d.sal || ''}"></td>
        <td class="p-1 border-r-4 border-slate-300"><input type="text" class="w-full min-w-[120px] p-1 border-transparent focus:border-indigo-300 rounded outline-none text-left font-medium text-slate-800" data-col="bang" value="${d.bang || ''}"></td>
        
        <td class="p-1 border-r bg-rose-50/30"><input type="text" class="w-full min-w-[50px] p-1 border-transparent outline-none text-center text-rose-700 font-bold" data-col="bcr" value="${d.bcr || ''}"></td>
        <td class="p-1 border-r bg-rose-50/30"><input type="text" class="w-full min-w-[50px] p-1 border-transparent outline-none text-center text-rose-700 font-bold" data-col="rsk" value="${d.rsk || ''}"></td>
        <td class="p-1 border-r bg-rose-50/30"><input type="text" class="w-full min-w-[50px] p-1 border-transparent outline-none text-center text-rose-700 font-bold" data-col="lng" value="${d.lng || ''}"></td>
        <td class="p-1 border-r bg-rose-50/30"><input type="text" class="w-full min-w-[50px] p-1 border-transparent outline-none text-center text-rose-700 font-bold" data-col="rtk" value="${d.rtk || ''}"></td>
        <td class="p-1 border-r bg-rose-50/30"><input type="text" class="w-full min-w-[50px] p-1 border-transparent outline-none text-center text-rose-700 font-bold" data-col="pnt" value="${d.pnt || ''}"></td>
        <td class="p-1 border-r bg-rose-50/30"><input type="text" class="w-full min-w-[50px] p-1 border-transparent outline-none text-center text-rose-700 font-bold" data-col="sdm" value="${d.sdm || ''}"></td>
        <td class="p-1 border-r-4 border-slate-300 bg-rose-50/30"><input type="text" class="w-full min-w-[50px] p-1 border-transparent outline-none text-center text-rose-700 font-bold" data-col="lln" value="${d.lln || ''}"></td>
        
        <td class="p-1 border-r bg-emerald-50"><input type="number" class="w-full min-w-[90px] p-1 border border-emerald-200 focus:border-emerald-500 rounded outline-none text-right text-emerald-700 font-black" data-col="bi_rugi" value="${d.bi_rugi || ''}" placeholder="0"></td>
        <td class="p-1 border-r-4 border-slate-300 bg-emerald-50"><input type="number" class="w-full min-w-[90px] p-1 border border-emerald-200 focus:border-emerald-500 rounded outline-none text-right text-emerald-700 font-black" data-col="bi_baik" value="${d.bi_baik || ''}" placeholder="0"></td>
        
        <td class="p-1 border-r bg-amber-50 text-center">
            <select class="p-1 border border-amber-200 rounded bg-white font-black text-amber-700 cursor-pointer outline-none w-[120px]" data-col="prio" onchange="resort02P()">
                <option value="1" ${d.prio === '1' ? 'selected' : ''}>1 - Segera</option>
                <option value="2" ${d.prio === '2' ? 'selected' : ''}>2 - Perlu</option>
                <option value="3" ${d.prio === '3' ? 'selected' : ''}>3 - Tangguhkan</option>
            </select>
        </td>
        <td class="p-1 border-r"><input type="number" step="any" class="w-full min-w-[60px] p-1 border-transparent outline-none text-center" data-col="arl" value="${d.arl || ''}"></td>
        <td class="p-1"><input type="text" class="w-full min-w-[90px] p-1 border-transparent outline-none text-center text-xs" data-col="dsa" value="${d.dsa || ''}"></td>
    `).map(rowHtml => `<tr class="border-b hover:bg-slate-50 transition-colors p2-row bg-white">${rowHtml}</tr>`).join('');
    
    tbody.querySelectorAll('input, select').forEach(el => {
        el.addEventListener('input', calcJumlah02P);
        el.addEventListener('change', calcJumlah02P);
    });
    calcJumlah02P();
    if(typeof initIcons === 'function') initIcons();
}

function resort02P() {
    const rows = collectData02P();
    renderTableRows02P(rows); // Render ulang tabel dengan sortiran terbaru
}

function collectData02P() {
    const rowsEl = document.querySelectorAll('#p2-tbody .p2-row');
    const cols = ['sal','bang','bcr','rsk','lng','rtk','pnt','sdm','lln','bi_rugi','bi_baik','prio','arl','dsa'];
    let data = [];
    rowsEl.forEach(row => {
        let obj = {};
        cols.forEach(c => {
            const el = row.querySelector(`[data-col="${c}"]`);
            obj[c] = el ? el.value : "";
        });
        data.push(obj);
    });
    return data;
}

function calcJumlah02P() {
    const rows = document.querySelectorAll('#p2-tbody .p2-row');
    const tfoot = document.getElementById('p2-tfoot');
    if (tfoot) tfoot.classList.toggle('hidden', rows.length === 0);

    const numberCols = ['bcr','rsk','lng','rtk','pnt','sdm','lln','bi_rugi','bi_baik','arl'];
    const totals = Object.fromEntries(numberCols.map(col => [col, 0]));

    rows.forEach(row => {
        numberCols.forEach(col => {
            const raw = row.querySelector(`[data-col="${col}"]`)?.value || '';
            const num = parseFloat(String(raw).replace(',', '.'));
            if (Number.isFinite(num)) totals[col] += num;
        });
    });

    numberCols.forEach(col => {
        const el = document.getElementById(`p2-total-${col}`);
        if (!el) return;
        if (totals[col] <= 0) {
            el.innerText = '-';
            return;
        }
        if (col === 'bi_rugi' || col === 'bi_baik') {
            el.innerText = totals[col].toLocaleString('id-ID');
        } else {
            el.innerText = totals[col].toFixed(col === 'arl' ? 2 : 0);
        }
    });
}

async function saveForm02P() {
    const periode = getPeriodeValue02P();
    if (!periode) return showFormAlert('p2', "Pilih Periode Penelusuran terlebih dahulu!", "error");

    const rowData = collectData02P();
    if(rowData.length === 0) return showFormAlert('p2', "Tabel kosong, tidak ada data kerusakan untuk disimpan.", "error");

    const savedData = getLS('02P_' + currentDI) || {};
    savedData[periode] = withReportTimestamps({ bulan: periode, rows: rowData }, savedData[periode]);
    setLS('02P_' + currentDI, savedData);

    let onlineSaved = false;
    try {
        onlineSaved = await saveLaporanOnline('02-P', savedData[periode], {
            kategori: 'pemeliharaan',
            key_laporan: periode,
            periode,
            tahun: periode.split(' ').pop() || '',
        });
    } catch (err) {
        console.error('Gagal simpan 02-P ke Supabase:', err);
    }

    renderSavedList02P();
    
    // Auto Clean
    resetInputs02P(true);
    showPemeliharaanSaveAlert('p2', `Laporan Penelusuran Pengamat (02-P) periode <strong>${periode}</strong> berhasil disimpan${onlineSaved ? ' ke Supabase' : ' lokal'}.`, onlineSaved ? "success" : "warning", extractPemeliharaanYear({ bulan: periode }, periode));
    setTimeout(() => hideFormAlert('p2'), 4000);
}

function renderSavedList02P() {
    const savedData = getLS('02P_' + currentDI) || {};
    const container = document.getElementById('p2-saved-list');
    if(!container) return;
    
    const allKeys = Object.keys(savedData).sort().reverse();
    const keys = filterPemeliharaanSavedKeys(allKeys, savedData);

    if (allKeys.length === 0) {
        container.innerHTML = `<p class="col-span-full text-center text-slate-400 italic py-8 border border-dashed rounded-xl bg-slate-50">Belum ada Laporan 02-P yang tersimpan.</p>`;
        return;
    }
    if (keys.length === 0) return renderNoActivePemeliharaanMessage(container, 'Laporan 02-P');

    container.innerHTML = keys.map(k => {
        const d = savedData[k];
        const rowCount = d.rows ? d.rows.length : 0;
        return `
        <div class="bg-white p-4 border rounded-xl shadow-sm hover:shadow-md transition-all">
            <div class="flex items-start gap-3 mb-4">
                <div class="bg-indigo-100 text-indigo-600 p-2.5 rounded-lg"><i data-lucide="clipboard-list" class="w-5 h-5"></i></div>
                <div class="w-full">
                    <h4 class="font-bold text-slate-800 text-sm truncate uppercase">${k}</h4>
                    <p class="text-[10px] text-slate-500 font-medium">Validasi Pengamat - ${rowCount} Titik</p>
                </div>
            </div>
            <button onclick="edit02P('${k}')" class="w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 py-2 rounded-lg font-bold text-xs transition-colors cursor-pointer">Lihat / Edit</button>
        </div>
    `}).join('');
    if(typeof initIcons === 'function') initIcons();
}

function edit02P(key) {
    const data = (getLS('02P_' + currentDI) || {})[key];
    if(!data) return;
    
    const parts = key.split(' ');
    if(parts.length === 2) {
        const b = document.getElementById('p2-filter-bulan'); if(b) b.value = parts[0];
        const t = document.getElementById('p2-filter-tahun'); if(t) t.value = parts[1];
    }
    
    onChangeFilter02P(); // Ini akan otomatis memanggil renderTableRows02P
    document.getElementById('view-blanko-pemeliharaan').scrollIntoView({behavior: 'smooth'});
}

function resetInputs02P(hideAlert = true) {
    document.getElementById('p2-filter-bulan').value = "";
    document.getElementById('p2-filter-tahun').value = "";
    
    const tbody = document.getElementById('p2-tbody');
    if(tbody) tbody.innerHTML = '<tr><td colspan="15" class="p-12 text-slate-400 italic text-center">Silakan Pilih Bulan dan Tahun terlebih dahulu.</td></tr>';
    
    const btnSync = document.getElementById('btn-sync-02p');
    if(btnSync) btnSync.classList.add('hidden');
    calcJumlah02P();
    
    if(hideAlert) hideFormAlert('p2');
}

// ====================================================================
// --- FORMULIR 02a-P SUB (BUKU CATATAN PEMELIHARAAN) ---
// ====================================================================

function render02aP() {
    hideFormAlert('p2a');
    const pData = getProfilData(currentDI);
    
    // 1. Info Header
    ['di','kodeDI','pengamat','kabupaten'].forEach(id => {
        const el = document.getElementById('p2a-' + id);
        if(el) el.innerText = (id === 'di') ? currentDI : (pData[id] || "-");
    });
    
    let totalLuasDI = 0;
    if(pData.bendungs) pData.bendungs.forEach(b => { if(b.rincian) b.rincian.forEach(r => totalLuasDI += (parseFloat(r.luasFungsional)||0)); });
    const elLuas = document.getElementById('p2a-totalLuasDI');
    if(elLuas) elLuas.innerText = totalLuasDI > 0 ? totalLuasDI.toFixed(2) + " Ha" : "0 Ha";

    // 2. Dropdown Tahun Dinamis
    const selTahun = document.getElementById('p2a-filter-tahun');
    if (selTahun && selTahun.options.length === 0) {
        const thnSekarang = new Date().getFullYear();
        let thnOpts = '<option value="">-- Pilih Tahun --</option>';
        for (let i = thnSekarang - 2; i <= thnSekarang + 2; i++) {
            thnOpts += `<option value="${i}">${i}</option>`;
        }
        selTahun.innerHTML = thnOpts;
    }

    // 3. Dropdown Bulan Dinamis
    const selBulan = document.getElementById('p2a-filter-bulan');
    if (selBulan && selBulan.options.length <= 1) {
        let blnOpts = '<option value="">-- Pilih Bulan --</option>';
        const months = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
        months.forEach(m => { blnOpts += `<option value="${m}">${m.toUpperCase()}</option>`; });
        selBulan.innerHTML = blnOpts;
    }

    // Eksekusi Pengecekan Filter
    if (!document.getElementById('p2a-filter-bulan').value || !document.getElementById('p2a-filter-tahun').value) {
        resetInputs02aP(false); 
    } else {
        onChangeFilter02aP();
    }

    renderSavedList02aP();
    syncPemeliharaanFormFromSupabase('02aP', '02a-P', renderSavedList02aP);
}

/** Mengambil nilai periode 02a-P (Bulan + Tahun) */
function getPeriodeValue02aP() {
    const b = document.getElementById('p2a-filter-bulan')?.value || "";
    const t = document.getElementById('p2a-filter-tahun')?.value || "";
    if(!b || !t) return "";
    return `${b} ${t}`.trim(); 
}

function onChangeFilter02aP() {
    hideFormAlert('p2a');
    const periode = getPeriodeValue02aP();
    const tbody = document.getElementById('p2a-tbody');
    const btnSync = document.getElementById('btn-sync-02ap');

    if (!tbody) return;

    if (!periode) {
        tbody.innerHTML = '<tr><td colspan="14" class="p-12 text-slate-400 italic text-center">Silakan Pilih Bulan dan Tahun terlebih dahulu.</td></tr>';
        if(btnSync) btnSync.classList.add('hidden');
        return;
    }

    if(btnSync) btnSync.classList.remove('hidden');
    
    const savedData = (getLS('02aP_' + currentDI) || {})[periode];

    if (savedData && savedData.rows && savedData.rows.length > 0) {
        // Tampilkan Data Lama
        renderTableRows02aP(savedData.rows);
        showFormAlert('p2a', `Menampilkan arsip Buku Catatan (02a-P) untuk periode <strong>${periode}</strong>.`, "info");
    } else {
        // Otomatis Coba Tarik dari 02-P Utama
        syncDataFrom02P(false);
    }
}

function syncDataFrom02P(withAlert = true) {
    const periodeAktif = getPeriodeValue02aP();
    if (!periodeAktif) return;

    // Cari Brankas 02-P Utama
    const data02P = (getLS('02P_' + currentDI) || {})[periodeAktif];

    const tbody = document.getElementById('p2a-tbody');

    // ðŸ‘‡ TAMBAHAN KEAMANAN: Pastikan data02P benar-benar ada dan memiliki rows
    if(!data02P || !data02P.rows || data02P.rows.length === 0) {
        if(withAlert) showFormAlert('p2a', `Data 02-P Utama periode ${periodeAktif} belum dibuat. Silakan selesaikan 02-P Utama terlebih dahulu.`, "error");
        tbody.innerHTML = `<tr><td colspan="14" class="p-12 text-slate-400 italic text-center text-red-500">Tidak ada data di 02-P Utama pada periode ini.</td></tr>`;
        return;
    }

    // Mapping Data (Konversi 02-P ke 02a-P)
    let mappedRows = data02P.rows.map(r => ({
        tgl_lap: new Date().toLocaleDateString('id-ID'), // Tanggal hari ini
        sal: r.sal,
        bang: r.bang,
        arl: r.arl,
        uraian: `Bocoran: ${r.bcr || '-'}, Rusak: ${r.rsk || '-'}, Longsor: ${r.lng || '-'}, Retak: ${r.rtk || '-'}`,
        jenis_pekerjaan: '',
        satuan: '',
        volume: '',
        prio: r.prio,
        pel_tgl: '',
        pel_instansi: '',
        pel_metode: '',
        pel_hippa: ''
    }));

    renderTableRows02aP(mappedRows);
    if(withAlert) showFormAlert('p2a', `Berhasil menarik ${mappedRows.length} daftar kerusakan dari 02-P Utama.`, "success");
}

function renderTableRows02aP(rows) {
    const tbody = document.getElementById('p2a-tbody');
    
    // Sort Prioritas (1 paling atas)
    rows.sort((a, b) => (parseInt(a.prio) || 3) - (parseInt(b.prio) || 3));

    const selectedValues02aP = (value) => String(value || '')
        .split(',')
        .map(v => v.trim())
        .filter(Boolean);
    const checkboxGroup02aP = (col, value, options) => {
        const selected = selectedValues02aP(value);
        return `<div class="min-w-[130px] flex flex-col gap-1 text-[10px] text-emerald-900 font-bold">
            ${options.map(opt => `
                <label class="flex items-center gap-1 bg-white/70 border border-emerald-100 rounded px-1 py-0.5 cursor-pointer">
                    <input type="checkbox" data-group-col="${col}" value="${opt}" ${selected.includes(opt) ? 'checked' : ''} class="w-3 h-3 accent-emerald-600">
                    <span>${opt}</span>
                </label>
            `).join('')}
        </div>`;
    };

    tbody.innerHTML = rows.map((d, idx) => `
        <tr class="border-b hover:bg-slate-50 transition-colors p2a-row bg-white">
            <td class="p-2 border-r text-center font-bold text-slate-600 bg-slate-50" style="left: 0; position: sticky; z-index: 10;">${idx + 1}</td>
            <td class="p-1 border-r"><input type="text" class="w-full min-w-[80px] p-1 border-transparent text-center text-[11px] outline-none" data-col="tgl_lap" value="${d.tgl_lap || ''}" placeholder="DD/MM/YYYY"></td>
            <td class="p-1 border-r font-bold text-indigo-800 text-left px-2 bg-white shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]" style="left: 35px; position: sticky; z-index: 10;" data-col="sal_text">${d.sal || ''}</td>
            <td class="p-1 border-r-4 border-slate-300 font-bold text-slate-800 text-left px-2" data-col="bang_text">${d.bang || ''}</td>
            <td class="p-1 border-r text-center font-medium" data-col="arl_text">${d.arl || ''}</td>
            
            <td class="p-1 border-r">
                <textarea class="w-full min-w-[150px] text-xs p-1 border border-indigo-200 focus:border-indigo-500 rounded outline-none resize-y" data-col="uraian" rows="2">${d.uraian || ''}</textarea>
                <input type="file" class="block w-full text-[9px] mt-1 text-slate-500" title="Upload Sketsa (Abaikan jika tidak ada)">
            </td>
            
            <td class="p-1 border-r"><input type="text" class="w-full min-w-[120px] p-1 border-transparent outline-none text-left text-xs" data-col="jenis_pekerjaan" value="${d.jenis_pekerjaan || ''}" placeholder="Cth: Perbaikan Dinding"></td>
            <td class="p-1 border-r bg-indigo-50/20"><input type="text" class="w-full min-w-[60px] p-1 border-transparent outline-none text-center font-bold text-indigo-700" data-col="satuan" value="${d.satuan || ''}" placeholder="m/m2/bh"></td>
            <td class="p-1 border-r-4 border-slate-300 bg-indigo-50/20"><input type="number" step="any" class="w-full min-w-[70px] p-1 border-transparent outline-none text-center font-bold text-indigo-700" data-col="volume" value="${d.volume || ''}" placeholder="0"></td>
            
            <td class="p-1 border-r bg-amber-50 font-black text-amber-700 text-center text-lg" data-col="prio_text">${d.prio || ''}</td>
            
            <td class="p-1 border-r bg-emerald-50/20"><input type="date" class="w-full min-w-[110px] text-[11px] p-1 border-transparent outline-none cursor-pointer" data-col="pel_tgl" value="${d.pel_tgl || ''}"></td>
            <td class="p-1 border-r bg-emerald-50/20">${checkboxGroup02aP('pel_instansi', d.pel_instansi, ['Cab. Dinas', 'UPTD', 'Lainnya'])}</td>
            <td class="p-1 border-r bg-emerald-50/20">${checkboxGroup02aP('pel_metode', d.pel_metode, ['Swakelola', 'Diborongkan', 'Lainnya'])}</td>
            
            <!-- ðŸ‘‡ REVISI: PENYESUAIAN LEBAR KOLOM (min-w-[130px]) ðŸ‘‡ -->
            <td class="p-1 bg-emerald-50/20">${checkboxGroup02aP('pel_hippa', d.pel_hippa, ['Tenaga', 'Material', 'Dana'])}</td>
        </tr>
    `).join('');
    
    if(typeof initIcons === 'function') initIcons();
}

async function saveForm02aP() {
    const periode = getPeriodeValue02aP();
    if (!periode) return showFormAlert('p2a', "Pilih Periode Pelaksanaan terlebih dahulu!", "error");

    const rowsEl = document.querySelectorAll('#p2a-tbody .p2a-row');
    let rowData = [];
    
    rowsEl.forEach(row => {
        let obj = {};
        
        // Ambil data inputan
        row.querySelectorAll('[data-col]').forEach(el => {
            if (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA') {
                obj[el.getAttribute('data-col')] = el.value.trim();
            }
        });
        ['pel_instansi', 'pel_metode', 'pel_hippa'].forEach(col => {
            obj[col] = Array.from(row.querySelectorAll(`input[data-group-col="${col}"]:checked`))
                .map(el => el.value)
                .join(', ');
        });
        
        // Ambil data teks statis (saluran, bangunan, luas, prio)
        obj.sal = row.querySelector('[data-col="sal_text"]').innerText;
        obj.bang = row.querySelector('[data-col="bang_text"]').innerText;
        obj.arl = row.querySelector('[data-col="arl_text"]').innerText;
        obj.prio = row.querySelector('[data-col="prio_text"]').innerText;
        
        rowData.push(obj);
    });

    if(rowData.length === 0) return showFormAlert('p2a', "Tabel kosong! Lakukan Sinkronisasi dari 02-P Utama.", "error");

    const savedData = getLS('02aP_' + currentDI) || {};
    savedData[periode] = withReportTimestamps({ periode, rows: rowData }, savedData[periode]);
    setLS('02aP_' + currentDI, savedData);

    let onlineSaved = false;
    try {
        onlineSaved = await saveLaporanOnline('02a-P', savedData[periode], {
            kategori: 'pemeliharaan',
            key_laporan: periode,
            periode,
            tahun: periode.split(' ').pop() || '',
        });
    } catch (err) {
        console.error('Gagal simpan 02a-P ke Supabase:', err);
    }

    renderSavedList02aP();
    
    // Auto Clean
    resetInputs02aP(true);
    showPemeliharaanSaveAlert('p2a', `Buku Catatan Pemeliharaan (02a-P) periode <strong>${periode}</strong> berhasil disimpan${onlineSaved ? ' ke Supabase' : ' lokal'}.`, onlineSaved ? "success" : "warning", extractPemeliharaanYear({ periode }, periode));
    setTimeout(() => hideFormAlert('p2a'), 4000);
}

function renderSavedList02aP() {
    const savedData = getLS('02aP_' + currentDI) || {};
    const container = document.getElementById('p2a-saved-list');
    if(!container) return;
    
    const allKeys = Object.keys(savedData).sort().reverse();
    const keys = filterPemeliharaanSavedKeys(allKeys, savedData);

    if (allKeys.length === 0) {
        container.innerHTML = `<p class="col-span-full text-center text-slate-400 italic py-8 border border-dashed rounded-xl bg-slate-50">Belum ada Arsip Buku Catatan 02a-P.</p>`;
        return;
    }
    if (keys.length === 0) return renderNoActivePemeliharaanMessage(container, 'Arsip Buku Catatan 02-P Sub');

    container.innerHTML = keys.map(k => {
        const d = savedData[k];
        const rowCount = d.rows ? d.rows.length : 0;
        return `
        <div class="bg-white p-4 border rounded-xl shadow-sm hover:shadow-md transition-all">
            <div class="flex items-start gap-3 mb-4">
                <div class="bg-indigo-100 text-indigo-600 p-2.5 rounded-lg"><i data-lucide="book-marked" class="w-5 h-5"></i></div>
                <div class="w-full">
                    <h4 class="font-bold text-slate-800 text-sm truncate uppercase">${k}</h4>
                    <p class="text-[10px] text-slate-500 font-medium">Buku Catatan - ${rowCount} Pelaksanaan</p>
                </div>
            </div>
            <button onclick="edit02aP('${k}')" class="w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 py-2 rounded-lg font-bold text-xs transition-colors cursor-pointer">Lihat / Edit Catatan</button>
        </div>
    `}).join('');
    if(typeof initIcons === 'function') initIcons();
}

function edit02aP(key) {
    const data = (getLS('02aP_' + currentDI) || {})[key];
    if(!data) return;
    
    const parts = key.split(' ');
    if(parts.length === 2) {
        const b = document.getElementById('p2a-filter-bulan'); if(b) b.value = parts[0];
        const t = document.getElementById('p2a-filter-tahun'); if(t) t.value = parts[1];
    }
    
    onChangeFilter02aP(); 
    document.getElementById('view-blanko-pemeliharaan').scrollIntoView({behavior: 'smooth'});
}

function resetInputs02aP(hideAlert = true) {
    document.getElementById('p2a-filter-bulan').value = "";
    document.getElementById('p2a-filter-tahun').value = "";
    
    const tbody = document.getElementById('p2a-tbody');
    if(tbody) tbody.innerHTML = '<tr><td colspan="14" class="p-12 text-slate-400 italic text-center">Silakan Pilih Bulan dan Tahun terlebih dahulu.</td></tr>';
    
    const btnSync = document.getElementById('btn-sync-02ap');
    if(btnSync) btnSync.classList.add('hidden');
    
    if(hideAlert) hideFormAlert('p2a');
}

// ====================================================================
// --- FORMULIR 03-P (LAPORAN BENCANA ALAM / INSIDENTIL) ---
// ====================================================================

function render03P() {
    hideFormAlert('p3');
    const pData = getProfilData(currentDI);
    
    // 1. Info Header
    ['di','kodeDI','pengamat','kabupaten'].forEach(id => {
        const el = document.getElementById('p3-' + id);
        if(el) el.innerText = (id === 'di') ? currentDI : (pData[id] || "-");
    });
    
    let totalLuasDI = 0;
    if(pData.bendungs) pData.bendungs.forEach(b => { if(b.rincian) b.rincian.forEach(r => totalLuasDI += (parseFloat(r.luasFungsional)||0)); });
    const elLuas = document.getElementById('p3-totalLuasDI');
    if(elLuas) elLuas.innerText = totalLuasDI > 0 ? totalLuasDI.toFixed(2) + " Ha" : "0 Ha";

    // 2. Kosongkan Tanggal Saat Pertama Buka (Memaksa User Memilih)
    const tglInput = document.getElementById('p3-tanggal');
    if (tglInput) tglInput.value = ""; 

    // Eksekusi Render Awal
    onChangeFilter03P();
    renderSavedList03P();
    syncPemeliharaanFormFromSupabase('03P', '03-P', renderSavedList03P);
}

function onChangeFilter03P() {
    hideFormAlert('p3');
    const tgl = document.getElementById('p3-tanggal')?.value;
    const tbody = document.getElementById('p3-tbody');
    const btnAdd = document.getElementById('p3-btn-add');
    
    if (!tbody || !btnAdd) return;

    if (!tgl) {
        tbody.innerHTML = '<tr><td colspan="16" class="p-12 text-slate-400 italic text-center">Silakan Tentukan Tanggal Kejadian Bencana terlebih dahulu.</td></tr>';
        btnAdd.classList.add('hidden');
        return;
    }

    btnAdd.classList.remove('hidden');

    // Cek apakah ada arsip di tanggal tersebut
    const savedData = (getLS('03P_' + currentDI) || {})[tgl];

    if (savedData && savedData.rows && savedData.rows.length > 0) {
        tbody.innerHTML = ''; 
        savedData.rows.forEach(r => addTableRow03P(r));
        showFormAlert('p3', `Menampilkan arsip laporan bencana untuk kejadian tanggal <strong>${tgl}</strong>.`, "info");
    } else {
        // Form kosong baru (Siapkan 1 Baris)
        tbody.innerHTML = '';
        addTableRow03P();
    }
}

function addTableRow03P(data = null) {
    const tbody = document.getElementById('p3-tbody');
    if (!tbody) return;

    const tr = document.createElement('tr');
    tr.className = "border-b hover:bg-slate-50 transition-colors p3-row bg-white";
    
    const d = data || { sal:'', bang:'', pyb:'', jns:'', tnh:'', btu:'', btn:'', pnt:'', grg:'', lln:'', arl:'', tnd:'', pbk_ip3a:'', pbk_atas:'' };

    tr.innerHTML = `
        <td class="p-2 border-r text-center font-bold text-slate-600 bg-slate-50 row-no" style="left: 0; position: sticky; z-index: 10;">1</td>
        <td class="p-1 border-r bg-white shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]" style="left: 35px; position: sticky; z-index: 10;"><input type="text" class="w-full min-w-[120px] p-1 border-transparent focus:border-indigo-300 outline-none rounded text-left font-medium text-indigo-800 bg-white" data-col="sal" value="${d.sal}" placeholder="..."></td>
        <td class="p-1 border-r-4 border-slate-300"><input type="text" class="w-full min-w-[120px] p-1 border-transparent focus:border-indigo-300 outline-none rounded text-left font-medium text-slate-800" data-col="bang" value="${d.bang}" placeholder="..."></td>
        
        <td class="p-1 border-r bg-rose-50/50"><input type="text" class="w-full min-w-[100px] p-1 border-transparent outline-none text-center" data-col="pyb" value="${d.pyb}" placeholder="(cth: Banjir)"></td>
        <td class="p-1 border-r-4 border-slate-300 bg-rose-50/50"><input type="text" class="w-full min-w-[100px] p-1 border-transparent outline-none text-center" data-col="jns" value="${d.jns}" placeholder="(cth: Jebol)"></td>
        
        <td class="p-1 border-r"><input type="number" step="any" class="w-full min-w-[60px] p-1 border-transparent outline-none text-center" data-col="tnh" value="${d.tnh}" placeholder="0"></td>
        <td class="p-1 border-r"><input type="number" step="any" class="w-full min-w-[60px] p-1 border-transparent outline-none text-center" data-col="btu" value="${d.btu}" placeholder="0"></td>
        <td class="p-1 border-r"><input type="number" step="any" class="w-full min-w-[60px] p-1 border-transparent outline-none text-center" data-col="btn" value="${d.btn}" placeholder="0"></td>
        <td class="p-1 border-r"><input type="number" step="any" class="w-full min-w-[60px] p-1 border-transparent outline-none text-center" data-col="pnt" value="${d.pnt}" placeholder="0"></td>
        <td class="p-1 border-r"><input type="text" class="w-full min-w-[60px] p-1 border-transparent outline-none text-center" data-col="grg" value="${d.grg}" placeholder="..."></td>
        <td class="p-1 border-r"><input type="text" class="w-full min-w-[60px] p-1 border-transparent outline-none text-center" data-col="lln" value="${d.lln}" placeholder="..."></td>
        <td class="p-1 border-r-4 border-slate-300"><input type="number" step="any" class="w-full min-w-[70px] p-1 border-transparent outline-none text-center font-bold text-rose-600" data-col="arl" value="${d.arl}" placeholder="ha"></td>
        
        <td class="p-1 border-r bg-amber-50/30"><textarea class="w-full min-w-[150px] text-xs p-1 border-transparent focus:border-amber-300 rounded outline-none min-h-[40px] resize-none" data-col="tnd" placeholder="Tindakan darurat...">${d.tnd}</textarea></td>
        <td class="p-1 border-r bg-indigo-50/30"><textarea class="w-full min-w-[150px] text-xs p-1 border-transparent focus:border-indigo-300 rounded outline-none min-h-[40px] resize-none" data-col="pbk_ip3a" placeholder="Usulan IP3A...">${d.pbk_ip3a}</textarea></td>
        <td class="p-1 border-r bg-indigo-50/30"><textarea class="w-full min-w-[150px] text-xs p-1 border-transparent focus:border-indigo-300 rounded outline-none min-h-[40px] resize-none" data-col="pbk_atas" placeholder="Usulan ke Atas...">${d.pbk_atas}</textarea></td>
        
        <td class="p-1 text-center bg-white">
            <button onclick="removeTableRow03P(this)" class="bg-red-50 hover:bg-red-100 text-red-500 p-2 rounded transition-colors cursor-pointer" title="Hapus Baris">
                <i data-lucide="x" class="w-4 h-4"></i>
            </button>
        </td>
    `;
    tbody.appendChild(tr);
    calcNo03P();
    if(typeof initIcons === 'function') initIcons();
}

function removeTableRow03P(btn) {
    btn.closest('tr').remove();
    calcNo03P();
    const tbody = document.getElementById('p3-tbody');
    if (tbody.querySelectorAll('.p3-row').length === 0) {
        addTableRow03P();
    }
}

function calcNo03P() {
    document.querySelectorAll('#p3-tbody .p3-row').forEach((row, idx) => row.querySelector('.row-no').innerText = idx + 1);
}

async function saveForm03P() {
    const tgl = document.getElementById('p3-tanggal').value;
    if (!tgl) return showFormAlert('p3', "Pilih Tanggal Kejadian Bencana terlebih dahulu!", "error");

    const rows = document.querySelectorAll('#p3-tbody .p3-row');
    let rowData = [];
    const cols = ['sal','bang','pyb','jns','tnh','btu','btn','pnt','grg','lln','arl','tnd','pbk_ip3a','pbk_atas'];
    
    let hasData = false;
    rows.forEach(row => {
        let rObj = {};
        let isRowEmpty = true;
        cols.forEach(c => {
            const el = row.querySelector(`[data-col="${c}"]`);
            rObj[c] = el ? el.value.trim() : "";
            if (rObj[c] !== "") isRowEmpty = false;
        });
        if(!isRowEmpty) { rowData.push(rObj); hasData = true; }
    });

    if (!hasData) return showFormAlert('p3', "Tabel masih kosong! Harap isi minimal 1 baris kerusakan.", "error");

    const savedData = getLS('03P_' + currentDI) || {};
    savedData[tgl] = withReportTimestamps({ tgl, rows: rowData }, savedData[tgl]);
    setLS('03P_' + currentDI, savedData);
    let onlineSaved = false;
    try {
        onlineSaved = await saveLaporanOnline('03-P', savedData[tgl], {
            kategori: 'pemeliharaan',
            key_laporan: tgl,
            periode: tgl
        });
    } catch (err) { console.warn('Gagal simpan Supabase 03-P:', err); }

    renderSavedList03P();
    
    // ðŸ‘‡ FITUR SAPU BERSIH INSTAN ðŸ‘‡
    resetInputs03P(true);
    showPemeliharaanSaveAlert('p3', `Laporan Insidentil Bencana untuk kejadian tanggal <strong>${tgl}</strong> berhasil disimpan${onlineSaved ? ' ke Supabase' : ' lokal'}.`, onlineSaved ? "success" : "warning", extractPemeliharaanYear({ tgl }, tgl));
    setTimeout(() => hideFormAlert('p3'), 4000);
}

function renderSavedList03P() {
    const savedData = getLS('03P_' + currentDI) || {};
    const container = document.getElementById('p3-saved-list');
    if(!container) return;
    
    // Sort descending (terbaru di atas berdasarkan tanggal)
    const allKeys = Object.keys(savedData).sort((a,b) => new Date(b) - new Date(a));
    const keys = filterPemeliharaanSavedKeys(allKeys, savedData);

    if (allKeys.length === 0) {
        container.innerHTML = `<p class="col-span-full text-center text-slate-400 italic py-8 border border-dashed rounded-xl bg-slate-50">Belum ada Laporan Bencana (03-P) yang tersimpan.</p>`;
        return;
    }
    if (keys.length === 0) return renderNoActivePemeliharaanMessage(container, 'Laporan Bencana 03-P');

    container.innerHTML = keys.map(k => {
        const d = savedData[k];
        const rowCount = d.rows ? d.rows.length : 0;
        
        // Desain Kartu diselaraskan dengan 01-P dan 02-P (Tema Rose/Merah)
        return `<div class="bg-white p-4 border rounded-xl shadow-sm hover:shadow-md transition-all">
            <div class="flex items-start gap-3 mb-4">
                <div class="bg-rose-100 text-rose-600 p-2.5 rounded-lg"><i data-lucide="triangle-alert" class="w-5 h-5"></i></div>
                <div class="w-full overflow-hidden">
                    <h4 class="font-bold text-slate-800 text-sm truncate uppercase" title="${d.tgl}">${d.tgl}</h4>
                    <p class="text-xs text-rose-600 font-bold mt-0.5 truncate">Laporan Insidentil</p>
                    <p class="text-[10px] text-slate-500 font-medium mt-1 bg-slate-100 inline-block px-2 py-0.5 rounded">${rowCount} Titik Kerusakan</p>
                </div>
            </div>
            <button onclick="edit03P('${k}')" class="w-full bg-rose-50 hover:bg-rose-100 text-rose-700 py-2 rounded-lg font-bold text-xs transition-colors cursor-pointer">Lihat / Edit Laporan</button>
        </div>`;
    }).join('');
    
    if(typeof initIcons === 'function') initIcons();
}

function edit03P(key) {
    const data = (getLS('03P_' + currentDI) || {})[key];
    if(!data) return;
    
    const tglInput = document.getElementById('p3-tanggal');
    if(tglInput) tglInput.value = data.tgl;
    
    onChangeFilter03P(); 
    document.getElementById('view-blanko-pemeliharaan').scrollIntoView({behavior: 'smooth'});
}

function resetInputs03P(hideAlert = true) {
    const tglInput = document.getElementById('p3-tanggal');
    if(tglInput) tglInput.value = "";
    
    const tbody = document.getElementById('p3-tbody');
    if(tbody) tbody.innerHTML = '<tr><td colspan="16" class="p-12 text-slate-400 italic text-center">Silakan Tentukan Tanggal Kejadian Bencana terlebih dahulu.</td></tr>';
    
    const btnAdd = document.getElementById('p3-btn-add');
    if(btnAdd) btnAdd.classList.add('hidden');
    
    if(hideAlert) hideFormAlert('p3');
}

// ====================================================================
// --- FORMULIR 04-P (PROGRAM SWAKELOLA / TAHUNAN) ---
// ====================================================================

function render04P() {
    hideFormAlert('p4');
    
    // 1. Kosongkan Input Dinas/Instansi
    const dinasInput = document.getElementById('p4-dinas');
    if (dinasInput) dinasInput.value = "";

    // 2. Setup Dropdown Tahun Dinamis (Netral)
    const selTahun = document.getElementById('p4-tahun');
    if (selTahun) {
        const thnSekarang = new Date().getFullYear();
        let thnOpts = '<option value="">-- Pilih Tahun --</option>';
        for (let i = thnSekarang - 2; i <= thnSekarang + 2; i++) {
            thnOpts += `<option value="${i}">${i}</option>`;
        }
        selTahun.innerHTML = thnOpts;
    }
    
    // Eksekusi Render Awal
    if (!selTahun.value) {
        resetInputs04P(false);
    } else {
        onChangeFilter04P();
    }
    
    renderSavedList04P();
    syncPemeliharaanFormFromSupabase('04P', '04-P', renderSavedList04P);
}

function onChangeFilter04P() {
    hideFormAlert('p4');
    const tahun = document.getElementById('p4-tahun')?.value;
    const tbody = document.getElementById('p4-tbody');
    const btnAdd = document.getElementById('p4-btn-add');
    
    if (!tbody || !btnAdd) return;

    if (!tahun) {
        tbody.innerHTML = '<tr><td colspan="13" class="p-12 text-slate-400 italic text-center">Silakan Pilih Tahun Program terlebih dahulu.</td></tr>';
        btnAdd.classList.add('hidden');
        return;
    }

    btnAdd.classList.remove('hidden');

    const savedData = (getLS('04P_' + currentDI) || {})[tahun];

    if (savedData && savedData.rows && savedData.rows.length > 0) {
        // Tampilkan Arsip Lama
        document.getElementById('p4-dinas').value = savedData.dinas || "";
        tbody.innerHTML = ''; 
        savedData.rows.forEach(r => addTableRow04P(r));
        showFormAlert('p4', `Menampilkan arsip Program Swakelola tahun <strong>${tahun}</strong>.`, "info");
    } else {
        // Form kosong baru
        tbody.innerHTML = '';
        addTableRow04P(); 
    }
}

function addTableRow04P(data = null) {
    const tbody = document.getElementById('p4-tbody');
    if (!tbody) return;

    const tr = document.createElement('tr');
    tr.className = "border-b hover:bg-slate-50 transition-colors p4-row bg-white";
    
    const d = data || { di: '', sal_bang:'', lok_uraian:'', jns:'', vol:'', b_upah:'', b_bahan:'', b_jml:'', tgl_m:'', tgl_s:'', ket:'' };
    const diOptions = ['<option value="">-- Pilih D.I --</option>']
        .concat(getAllDI().map(di => `<option value="${escapePrintValue(di)}" ${String(d.di || '') === String(di) ? 'selected' : ''}>${escapePrintValue(di)}</option>`))
        .join('');

    tr.innerHTML = `
        <td class="p-2 border-r text-center font-bold text-slate-600 bg-slate-50 row-no" style="left: 0; position: sticky; z-index: 10;">1</td>
        <td class="p-1 border-r bg-white shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]" style="left: 45px; position: sticky; z-index: 10;">
            <select class="w-full min-w-[140px] p-1 border border-indigo-100 rounded outline-none text-center font-black text-indigo-700 bg-white focus:ring-1 focus:ring-indigo-500" data-col="di">
                ${diOptions}
            </select>
        </td>
        
        <td class="p-1 border-r"><textarea class="w-full min-w-[150px] text-xs p-1 border-transparent focus:border-indigo-300 outline-none rounded min-h-[40px] resize-none" data-col="sal_bang" placeholder="Saluran/Bangunan...">${d.sal_bang || ''}</textarea></td>
        <td class="p-1 border-r-4 border-slate-300 bg-indigo-50/10"><textarea class="w-full min-w-[150px] text-xs p-1 border-transparent focus:border-indigo-300 outline-none rounded min-h-[40px] resize-none" data-col="lok_uraian" placeholder="Uraian Lokasi...">${d.lok_uraian || ''}</textarea></td>
        
        <td class="p-1 border-r"><textarea class="w-full min-w-[150px] text-xs p-1 border-transparent focus:border-indigo-300 outline-none rounded min-h-[40px] resize-none" data-col="jns" placeholder="Jenis Pekerjaan...">${d.jns || ''}</textarea></td>
        <td class="p-1 border-r-4 border-slate-300"><input type="text" class="w-full min-w-[80px] p-1 border-transparent focus:border-indigo-300 outline-none rounded text-center font-medium" data-col="vol" value="${d.vol || ''}" placeholder="Bh/Km"></td>
        
        <td class="p-1 border-r bg-emerald-50/20"><input type="number" step="any" oninput="calcBiaya04P(this)" class="w-full min-w-[100px] p-1 border-transparent focus:border-emerald-300 outline-none rounded text-right text-emerald-700 font-bold" data-col="b_upah" value="${d.b_upah || ''}" placeholder="Rp"></td>
        <td class="p-1 border-r bg-emerald-50/20"><input type="number" step="any" oninput="calcBiaya04P(this)" class="w-full min-w-[100px] p-1 border-transparent focus:border-emerald-300 outline-none rounded text-right text-emerald-700 font-bold" data-col="b_bahan" value="${d.b_bahan || ''}" placeholder="Rp"></td>
        <td class="p-1 border-r-4 border-slate-300 bg-emerald-100/50"><input type="number" readonly class="w-full min-w-[120px] p-1 text-right text-emerald-900 font-black bg-transparent outline-none cursor-not-allowed" data-col="b_jml" value="${d.b_jml || ''}" placeholder="Total Rp"></td>
        
        <td class="p-1 border-r bg-amber-50/30"><input type="date" class="w-full min-w-[110px] text-[10px] p-1 border-transparent outline-none cursor-pointer" data-col="tgl_m" value="${d.tgl_m || ''}"></td>
        <td class="p-1 border-r bg-amber-50/30"><input type="date" class="w-full min-w-[110px] text-[10px] p-1 border-transparent outline-none cursor-pointer" data-col="tgl_s" value="${d.tgl_s || ''}"></td>
        
        <td class="p-1 border-r"><textarea class="w-full min-w-[150px] text-xs p-1 border-transparent focus:border-indigo-300 outline-none rounded min-h-[40px] resize-none" data-col="ket" placeholder="Catatan...">${d.ket || ''}</textarea></td>
        <td class="p-1 text-center bg-white">
            <button onclick="removeTableRow04P(this)" class="bg-red-50 hover:bg-red-100 text-red-500 p-2 rounded transition-colors cursor-pointer" title="Hapus Baris">
                <i data-lucide="x" class="w-4 h-4"></i>
            </button>
        </td>
    `;
    tbody.appendChild(tr);
    calcNo04P();
    if(typeof initIcons === 'function') initIcons();
}

// Fungsi Kalkulator Otomatis Jumlah Upah + Bahan
function calcBiaya04P(inputEl) {
    const tr = inputEl.closest('tr');
    const upah = parseFloat(tr.querySelector('[data-col="b_upah"]').value) || 0;
    const bahan = parseFloat(tr.querySelector('[data-col="b_bahan"]').value) || 0;
    const total = upah + bahan;
    tr.querySelector('[data-col="b_jml"]').value = total > 0 ? total : "";
}

function removeTableRow04P(btn) {
    btn.closest('tr').remove();
    calcNo04P();
    const tbody = document.getElementById('p4-tbody');
    if (tbody.querySelectorAll('.p4-row').length === 0) addTableRow04P();
}

function calcNo04P() {
    document.querySelectorAll('#p4-tbody .p4-row').forEach((row, idx) => row.querySelector('.row-no').innerText = idx + 1);
}

async function saveForm04P() {
    const tahun = document.getElementById('p4-tahun').value;
    const dinas = document.getElementById('p4-dinas').value;
    
    if (!tahun) return showFormAlert('p4', "Pilih Tahun Program Swakelola terlebih dahulu!", "error");

    const rows = document.querySelectorAll('#p4-tbody .p4-row');
    let rowData = [];
    const cols = ['di','sal_bang','lok_uraian','jns','vol','b_upah','b_bahan','b_jml','tgl_m','tgl_s','ket'];
    
    let hasData = false;
    rows.forEach(row => {
        let rObj = {};
        let isRowEmpty = true;
        cols.forEach(c => {
            const el = row.querySelector(`[data-col="${c}"]`);
            rObj[c] = el ? el.value.trim() : "";
            // Kolom 'di' diabaikan saat mengecek kekosongan; minimal rincian pekerjaan tetap wajib diisi.
            if (c !== 'di' && rObj[c] !== "") isRowEmpty = false;
        });
        if(!isRowEmpty) { rowData.push(rObj); hasData = true; }
    });

    if (!hasData) return showFormAlert('p4', "Tabel masih kosong! Harap isi rincian program kerja minimal 1 baris.", "error");

    const savedData = getLS('04P_' + currentDI) || {};
    savedData[tahun] = withReportTimestamps({ tahun, dinas, rows: rowData }, savedData[tahun]);
    setLS('04P_' + currentDI, savedData);
    let onlineSaved = false;
    try {
        onlineSaved = await saveLaporanOnline('04-P', savedData[tahun], {
            kategori: 'pemeliharaan',
            key_laporan: tahun,
            tahun,
            periode: tahun,
            targetAllDI: true
        });
    } catch (err) { console.warn('Gagal simpan Supabase 04-P:', err); }

    renderSavedList04P();
    
    // ðŸ‘‡ FITUR SAPU BERSIH INSTAN ðŸ‘‡
    resetInputs04P(true);
    showPemeliharaanSaveAlert('p4', `Program Swakelola Tahun <strong>${tahun}</strong> berhasil disimpan${onlineSaved ? ' ke Supabase' : ' lokal'}.`, onlineSaved ? "success" : "warning", tahun);
    setTimeout(() => hideFormAlert('p4'), 4000);
}

function renderSavedList04P() {
    const savedData = getLS('04P_' + currentDI) || {};
    const container = document.getElementById('p4-saved-list');
    if(!container) return;
    
    // Sort descending (terbaru di atas berdasarkan angka tahun)
    const allKeys = Object.keys(savedData).sort((a,b) => parseInt(b) - parseInt(a)); 
    const keys = filterPemeliharaanSavedKeys(allKeys, savedData);

    if (allKeys.length === 0) {
        container.innerHTML = `<p class="col-span-full text-center text-slate-400 italic py-8 border border-dashed rounded-xl bg-slate-50">Belum ada Program Swakelola (04-P) yang tersimpan.</p>`;
        return;
    }
    if (keys.length === 0) return renderNoActivePemeliharaanMessage(container, 'Program Swakelola 04-P');

    container.innerHTML = keys.map(k => {
        const d = savedData[k];
        const rowCount = d.rows ? d.rows.length : 0;
        return `<div class="bg-white p-4 border rounded-xl shadow-sm hover:shadow-md transition-all">
            <div class="flex items-start gap-3 mb-4">
                <div class="bg-indigo-100 text-indigo-600 p-2.5 rounded-lg shrink-0"><i data-lucide="folder-clock" class="w-5 h-5"></i></div>
                <div class="w-full overflow-hidden">
                    <h4 class="font-black text-slate-800 text-sm truncate uppercase">TAHUN ${k}</h4>
                    <p class="text-[10px] text-slate-500 font-medium truncate mt-0.5">${d.dinas || 'Instansi Tidak Diisi'}</p>
                    <p class="text-[10px] text-indigo-600 font-bold mt-1 bg-slate-100 inline-block px-2 py-0.5 rounded">${rowCount} Pekerjaan Direncanakan</p>
                </div>
            </div>
            <button onclick="edit04P('${k}')" class="w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 py-2 rounded-lg font-bold text-xs transition-colors cursor-pointer">Lihat / Edit Rencana</button>
        </div>`;
    }).join('');
    
    if(typeof initIcons === 'function') initIcons();
}

function edit04P(key) {
    const data = (getLS('04P_' + currentDI) || {})[key];
    if(!data) return;
    
    const selTahun = document.getElementById('p4-tahun');
    if(selTahun) selTahun.value = key;
    
    onChangeFilter04P(); 
    document.getElementById('view-blanko-pemeliharaan').scrollIntoView({behavior: 'smooth'});
}

function resetInputs04P(hideAlert = true) {
    document.getElementById('p4-tahun').value = "";
    document.getElementById('p4-dinas').value = "";
    
    const tbody = document.getElementById('p4-tbody');
    if(tbody) tbody.innerHTML = '<tr><td colspan="13" class="p-12 text-slate-400 italic text-center">Silakan Pilih Tahun Program terlebih dahulu.</td></tr>';
    
    const btnAdd = document.getElementById('p4-btn-add');
    if(btnAdd) btnAdd.classList.add('hidden');
    
    if(hideAlert) hideFormAlert('p4');
}

// ====================================================================
// --- FORMULIR 05-P (PROGRAM KONTRAKTUAL / TAHUNAN) ---
// ====================================================================

function render05P() {
    hideFormAlert('p5');
    
    // 1. Kosongkan Input Dinas/Instansi
    const dinasInput = document.getElementById('p5-dinas');
    if (dinasInput) dinasInput.value = "";

    // 2. Setup Dropdown Tahun Dinamis (Netral)
    const selTahun = document.getElementById('p5-tahun');
    if (selTahun) {
        const thnSekarang = new Date().getFullYear();
        let thnOpts = '<option value="">-- Pilih Tahun --</option>';
        for (let i = thnSekarang - 2; i <= thnSekarang + 2; i++) {
            thnOpts += `<option value="${i}">${i}</option>`;
        }
        selTahun.innerHTML = thnOpts;
    }
    
    // Eksekusi Render Awal
    if (!selTahun.value) {
        resetInputs05P(false);
    } else {
        onChangeFilter05P();
    }
    
    renderSavedList05P();
    syncPemeliharaanFormFromSupabase('05P', '05-P', renderSavedList05P);
}

function onChangeFilter05P() {
    hideFormAlert('p5');
    const tahun = document.getElementById('p5-tahun')?.value;
    const tbody = document.getElementById('p5-tbody');
    const btnAdd = document.getElementById('p5-btn-add');
    
    if (!tbody || !btnAdd) return;

    if (!tahun) {
        tbody.innerHTML = '<tr><td colspan="11" class="p-12 text-slate-400 italic text-center">Silakan Pilih Tahun Program terlebih dahulu.</td></tr>';
        btnAdd.classList.add('hidden');
        return;
    }

    btnAdd.classList.remove('hidden');

    const savedData = (getLS('05P_' + currentDI) || {})[tahun];

    if (savedData && savedData.rows && savedData.rows.length > 0) {
        // Tampilkan Arsip Lama
        document.getElementById('p5-dinas').value = savedData.dinas || "";
        tbody.innerHTML = ''; 
        savedData.rows.forEach(r => addTableRow05P(r));
        showFormAlert('p5', `Menampilkan arsip Program Kontraktual tahun <strong>${tahun}</strong>.`, "info");
    } else {
        // Form kosong baru
        tbody.innerHTML = '';
        addTableRow05P(); 
    }
}

function addTableRow05P(data = null) {
    const tbody = document.getElementById('p5-tbody');
    if (!tbody) return;

    const tr = document.createElement('tr');
    tr.className = "border-b hover:bg-slate-50 transition-colors p5-row bg-white";
    
    const d = data || { di: '', sal_bang:'', jns:'', lok:'', vol:'', biaya:'', tgl_m:'', tgl_s:'', ket:'' };
    const diOptions = ['<option value="">-- Pilih D.I --</option>']
        .concat(getAllDI().map(di => `<option value="${escapePrintValue(di)}" ${String(d.di || '') === String(di) ? 'selected' : ''}>${escapePrintValue(di)}</option>`))
        .join('');

    tr.innerHTML = `
        <!-- Kolom No Membeku -->
        <td class="p-2 border-r text-center font-bold text-slate-600 bg-slate-50 row-no" style="left: 0; position: sticky; z-index: 10;">1</td>
        
        <!-- Kolom D.I Membeku (jarak 45px dari kiri) -->
        <td class="p-1 border-r bg-white shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]" style="left: 45px; position: sticky; z-index: 10;">
            <select class="w-full min-w-[140px] p-1 border border-indigo-100 rounded outline-none text-center font-black text-indigo-700 bg-white focus:ring-1 focus:ring-indigo-500" data-col="di">
                ${diOptions}
            </select>
        </td>
        
        <!-- Kolom Lainnya (Bergerak) -->
        <td class="p-1 border-r-4 border-slate-300 bg-indigo-50/20"><textarea class="w-full min-w-[180px] text-xs p-1 border-transparent focus:border-indigo-300 outline-none rounded min-h-[40px] resize-none" data-col="sal_bang" placeholder="Saluran & Bangunan...">${d.sal_bang || ''}</textarea></td>
        <td class="p-1 border-r bg-indigo-50/10"><textarea class="w-full min-w-[150px] text-xs p-1 border-transparent focus:border-indigo-300 outline-none rounded min-h-[40px] resize-none" data-col="jns" placeholder="Jenis Pekerjaan...">${d.jns || ''}</textarea></td>
        <td class="p-1 border-r-4 border-slate-300 bg-indigo-50/10"><input type="text" class="w-full min-w-[120px] p-1 border-transparent focus:border-indigo-300 outline-none rounded text-center" data-col="lok" value="${d.lok || ''}" placeholder="Kec / Kab"></td>
        
        <td class="p-1 border-r-4 border-slate-300"><input type="text" class="w-full min-w-[80px] p-1 border-transparent focus:border-indigo-300 outline-none rounded text-center font-medium" data-col="vol" value="${d.vol || ''}" placeholder="bh/km"></td>
        <td class="p-1 border-r-4 border-slate-300 bg-emerald-50/50"><input type="number" step="any" class="w-full min-w-[120px] p-1 border-transparent focus:border-emerald-300 outline-none rounded text-right text-emerald-700 font-bold" data-col="biaya" value="${d.biaya || ''}" placeholder="Rp"></td>
        
        <td class="p-1 border-r bg-amber-50/30"><input type="date" class="w-full min-w-[110px] text-[10px] p-1 border-transparent outline-none cursor-pointer" data-col="tgl_m" value="${d.tgl_m || ''}"></td>
        <td class="p-1 border-r bg-amber-50/30"><input type="date" class="w-full min-w-[110px] text-[10px] p-1 border-transparent outline-none cursor-pointer" data-col="tgl_s" value="${d.tgl_s || ''}"></td>
        
        <td class="p-1 border-r"><textarea class="w-full min-w-[150px] text-xs p-1 border-transparent focus:border-indigo-300 outline-none rounded min-h-[40px] resize-none" data-col="ket" placeholder="Catatan...">${d.ket || ''}</textarea></td>
        
        <td class="p-1 text-center bg-white">
            <button onclick="removeTableRow05P(this)" class="bg-red-50 hover:bg-red-100 text-red-500 p-2 rounded transition-colors cursor-pointer" title="Hapus Baris">
                <i data-lucide="x" class="w-4 h-4"></i>
            </button>
        </td>
    `;
    tbody.appendChild(tr);
    calcNo05P();
    if(typeof initIcons === 'function') initIcons();
}

function removeTableRow05P(btn) {
    btn.closest('tr').remove();
    calcNo05P();
    const tbody = document.getElementById('p5-tbody');
    if (tbody.querySelectorAll('.p5-row').length === 0) addTableRow05P();
}

function calcNo05P() {
    document.querySelectorAll('#p5-tbody .p5-row').forEach((row, idx) => row.querySelector('.row-no').innerText = idx + 1);
}

async function saveForm05P() {
    const tahun = document.getElementById('p5-tahun').value;
    const dinas = document.getElementById('p5-dinas').value;
    
    if (!tahun) return showFormAlert('p5', "Pilih Tahun Program Kontraktual terlebih dahulu!", "error");

    const rows = document.querySelectorAll('#p5-tbody .p5-row');
    let rowData = [];
    const cols = ['di','sal_bang','jns','lok','vol','biaya','tgl_m','tgl_s','ket'];
    
    let hasData = false;
    rows.forEach(row => {
        let rObj = {};
        let isRowEmpty = true;
        cols.forEach(c => {
            const el = row.querySelector(`[data-col="${c}"]`);
            rObj[c] = el ? el.value.trim() : "";
            // Kolom 'di' diabaikan saat mengecek kekosongan; minimal rincian pekerjaan tetap wajib diisi.
            if (c !== 'di' && rObj[c] !== "") isRowEmpty = false;
        });
        if(!isRowEmpty) { rowData.push(rObj); hasData = true; }
    });

    if (!hasData) return showFormAlert('p5', "Tabel masih kosong! Harap isi rincian program kontraktual minimal 1 baris.", "error");

    const savedData = getLS('05P_' + currentDI) || {};
    savedData[tahun] = withReportTimestamps({ tahun, dinas, rows: rowData }, savedData[tahun]);
    setLS('05P_' + currentDI, savedData);
    let onlineSaved = false;
    try {
        onlineSaved = await saveLaporanOnline('05-P', savedData[tahun], {
            kategori: 'pemeliharaan',
            key_laporan: tahun,
            tahun,
            periode: tahun,
            targetAllDI: true
        });
    } catch (err) { console.warn('Gagal simpan Supabase 05-P:', err); }

    renderSavedList05P();
    
    // ðŸ‘‡ FITUR SAPU BERSIH INSTAN ðŸ‘‡
    resetInputs05P(true);
    showPemeliharaanSaveAlert('p5', `Program Kontraktual Tahun <strong>${tahun}</strong> berhasil disimpan${onlineSaved ? ' ke Supabase' : ' lokal'}.`, onlineSaved ? "success" : "warning", tahun);
    setTimeout(() => hideFormAlert('p5'), 4000);
}

function renderSavedList05P() {
    const savedData = getLS('05P_' + currentDI) || {};
    const container = document.getElementById('p5-saved-list');
    if(!container) return;
    
    // Sort descending (terbaru di atas)
    const allKeys = Object.keys(savedData).sort((a,b) => parseInt(b) - parseInt(a));
    const keys = filterPemeliharaanSavedKeys(allKeys, savedData);

    if (allKeys.length === 0) {
        container.innerHTML = `<p class="col-span-full text-center text-slate-400 italic py-8 border border-dashed rounded-xl bg-slate-50">Belum ada Program Kontraktual (05-P) yang tersimpan.</p>`;
        return;
    }
    if (keys.length === 0) return renderNoActivePemeliharaanMessage(container, 'Program Kontraktual 05-P');

    container.innerHTML = keys.map(k => {
        const d = savedData[k];
        const rowCount = d.rows ? d.rows.length : 0;
        return `<div class="bg-white p-4 border rounded-xl shadow-sm hover:shadow-md transition-all">
            <div class="flex items-start gap-3 mb-4">
                <div class="bg-indigo-100 text-indigo-600 p-2.5 rounded-lg shrink-0"><i data-lucide="file-signature" class="w-5 h-5"></i></div>
                <div class="w-full overflow-hidden">
                    <h4 class="font-black text-slate-800 text-sm truncate uppercase">TAHUN ${k}</h4>
                    <p class="text-[10px] text-slate-500 font-medium truncate mt-0.5">${d.dinas || 'Instansi Tidak Diisi'}</p>
                    <p class="text-[10px] text-indigo-600 font-bold mt-1 bg-slate-100 inline-block px-2 py-0.5 rounded">${rowCount} Pekerjaan Kontraktual</p>
                </div>
            </div>
            <button onclick="edit05P('${k}')" class="w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 py-2 rounded-lg font-bold text-xs transition-colors cursor-pointer">Lihat / Edit Rencana</button>
        </div>`;
    }).join('');
    
    if(typeof initIcons === 'function') initIcons();
}

function edit05P(key) {
    const data = (getLS('05P_' + currentDI) || {})[key];
    if(!data) return;
    
    const selTahun = document.getElementById('p5-tahun');
    if(selTahun) selTahun.value = key;
    
    onChangeFilter05P(); 
    document.getElementById('view-blanko-pemeliharaan').scrollIntoView({behavior: 'smooth'});
}

function resetInputs05P(hideAlert = true) {
    document.getElementById('p5-tahun').value = "";
    document.getElementById('p5-dinas').value = "";
    
    const tbody = document.getElementById('p5-tbody');
    if(tbody) tbody.innerHTML = '<tr><td colspan="11" class="p-12 text-slate-400 italic text-center">Silakan Pilih Tahun Program terlebih dahulu.</td></tr>';
    
    const btnAdd = document.getElementById('p5-btn-add');
    if(btnAdd) btnAdd.classList.add('hidden');
    
    if(hideAlert) hideFormAlert('p5');
}

// ====================================================================
// --- SISTEM LOGIKA FORMULIR 06-P (KEBUTUHAN BAHAN SWAKELOLA) RUTIN ---
// ====================================================================

function render06P() {
    hideFormAlert('p6');
    const pData = getProfilData(currentDI);
    
    // 1. Info Header
    ['di','kodeDI','pengamat','kabupaten'].forEach(id => {
        const el = document.getElementById('p6-' + id);
        if(el) el.innerText = (id === 'di') ? currentDI : (pData[id] || "-");
    });
    
    let totalLuasDI = 0;
    if(pData.bendungs) pData.bendungs.forEach(b => { if(b.rincian) b.rincian.forEach(r => totalLuasDI += (parseFloat(r.luasFungsional)||0)); });
    const elLuasDI = document.getElementById('p6-totalLuasDI');
    if(elLuasDI) elLuasDI.innerText = totalLuasDI > 0 ? totalLuasDI.toFixed(2) + " Ha" : "0 Ha";

    // 2. Setup Dropdown Tahun Dinamis (DIUBAH MENJADI NETRAL)
    const selTahun = document.getElementById('p6-tahun');
    if(selTahun) {
        const currentYear = new Date().getFullYear();
        let thnOpts = '<option value="">-- Pilih Tahun --</option>'; // Menambahkan teks default
        for (let i = currentYear - 2; i <= currentYear + 2; i++) {
            thnOpts += `<option value="${i}">${i}</option>`; // Menghilangkan otomatis 'selected'
        }
        selTahun.innerHTML = thnOpts;
    }

    // 3. Setup Dropdown Juru
    const selJuru = document.getElementById('p6-juru');
    if(selJuru) {
        let optJuru = '<option value="">-- Pilih Juru --</option>';
        if (pData.jurus && Array.isArray(pData.jurus)) {
            pData.jurus.forEach(j => {
                let namaJuru = typeof j === 'string' ? j : j.nama;
                if(namaJuru.trim() !== '') optJuru += `<option value="${namaJuru}">${namaJuru}</option>`;
            });
        }
        selJuru.innerHTML = optJuru;
    }
    
    // Reset Form State Awal
    if(!selTahun?.value || !selJuru?.value) {
        resetInputs06P(false);
    } else {
        onChangeFilter06P();
    }
    renderSavedList06P();
    syncPemeliharaanFormFromSupabase('06P', '06-P', renderSavedList06P);
}

function onChangeFilter06P() {
    hideFormAlert('p6');
    const tahun = document.getElementById('p6-tahun')?.value;
    const juru = document.getElementById('p6-juru')?.value;
    const tbody = document.getElementById('p6-tbody');
    const btnAdd = document.getElementById('p6-btn-add');
    
    if (!tbody || !btnAdd) return;

    // Cek apakah TAHUN dan JURU sudah dipilih
    if (!tahun || !juru) {
        document.getElementById('p6-luas').value = "";
        tbody.innerHTML = '<tr><td colspan="27" class="p-12 text-center text-slate-400 italic">Silakan Pilih <strong>Tahun</strong> dan <strong>Juru</strong> terlebih dahulu untuk mulai mengisi laporan.</td></tr>';
        btnAdd.classList.add('hidden'); btnAdd.classList.remove('flex');
        return;
    }

    // Hitung Luas Areal Otomatis dari Profil D.I
    const pData = getProfilData(currentDI);
    let luasAreal = 0;
    if(pData && pData.bendungs) {
        pData.bendungs.forEach(bendung => {
            const namaJuruBendung = (bendung.juru || "").toString().trim().toLowerCase();
            const namaJuruPilih = (juru || "").toString().trim().toLowerCase();
            if (namaJuruBendung === namaJuruPilih && bendung.rincian) {
                bendung.rincian.forEach(r => luasAreal += (parseFloat(r.luasFungsional) || 0));
            }
        });
    }
    document.getElementById('p6-luas').value = luasAreal > 0 ? luasAreal.toFixed(2) + " Ha" : "0 Ha";

    // Buka Tabel & Render Arsip
    btnAdd.classList.remove('hidden'); btnAdd.classList.add('flex');
    const key = `${tahun}_${juru}`;
    const savedData = (getLS('06P_' + currentDI) || {})[key];
    
    if (savedData && savedData.rows && savedData.rows.length > 0) {
        tbody.innerHTML = ''; 
        savedData.rows.forEach(r => addTableRow06P(r));
        showFormAlert('p6', `Menampilkan arsip Kebutuhan Bahan Juru <strong>${juru}</strong> Tahun ${tahun}.`, "info");
    } else {
        tbody.innerHTML = '';
        addTableRow06P(); 
    }
}

function addTableRow06P(data = null) {
    const tbody = document.getElementById('p6-tbody');
    if(!tbody) return;

    const tr = document.createElement('tr');
    tr.className = "border-b hover:bg-slate-50 transition-colors p6-row bg-white";
    
    const d = data || { 
        sal:'', bang:'', sp:'', sl:'', st:'', stot:'', bp:'', bl:'', bt:'', bjml:'',
        b_teer:'', b_paslin:'', b_solar:'', b_oli20:'', b_oli90:'', b_amplas:'', b_semen:'',
        b_pasir:'', b_batu:'', b_kerikil:'', b_urug:'', b_paku:'', b_sbaja:'', b_lap:'', b_kuas:'', b_lain:'', ket:''
    };

    tr.innerHTML = `
        <!-- Membekukan 3 Kolom Pertama -->
        <td class="p-2 border-r text-center font-bold text-slate-600 bg-slate-50 row-no" style="left: 0; position: sticky; z-index: 10;">1</td>
        <td class="p-1 border-r bg-white shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]" style="left: 35px; position: sticky; z-index: 10;">
            <input type="text" class="w-full min-w-[120px] p-1 border-transparent focus:border-indigo-300 outline-none rounded font-medium text-indigo-800" data-col="sal" value="${d.sal}" placeholder="Nama Saluran">
        </td>
        <td class="p-1 border-r-4 border-slate-300 bg-slate-50 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]" style="left: 165px; position: sticky; z-index: 10;">
            <input type="text" class="w-full min-w-[120px] p-1 border-transparent focus:border-slate-300 outline-none rounded font-medium text-slate-800 bg-transparent" data-col="bang" value="${d.bang}" placeholder="Nama Bangunan">
        </td>
        
        <!-- Area Dimensi Saluran -->
        <td class="p-1 border-r"><input type="number" step="any" class="w-full p-1 min-w-[50px] border-transparent outline-none text-center text-xs" data-col="sp" value="${d.sp}" placeholder="0"></td>
        <td class="p-1 border-r"><input type="number" step="any" class="w-full p-1 min-w-[50px] border-transparent outline-none text-center text-xs" data-col="sl" value="${d.sl}" placeholder="0"></td>
        <td class="p-1 border-r"><input type="number" step="any" class="w-full p-1 min-w-[50px] border-transparent outline-none text-center text-xs" data-col="st" value="${d.st}" placeholder="0"></td>
        <td class="p-1 border-r-4 border-slate-300 bg-indigo-50/50"><input type="number" step="any" class="w-full p-1 min-w-[60px] border-transparent outline-none text-center text-xs font-bold text-indigo-700 bg-transparent" data-col="stot" value="${d.stot}" placeholder="0"></td>
        
        <!-- Area Dimensi Bangunan -->
        <td class="p-1 border-r"><input type="number" step="any" class="w-full p-1 min-w-[50px] border-transparent outline-none text-center text-xs" data-col="bp" value="${d.bp}" placeholder="0"></td>
        <td class="p-1 border-r"><input type="number" step="any" class="w-full p-1 min-w-[50px] border-transparent outline-none text-center text-xs" data-col="bl" value="${d.bl}" placeholder="0"></td>
        <td class="p-1 border-r"><input type="number" step="any" class="w-full p-1 min-w-[50px] border-transparent outline-none text-center text-xs" data-col="bt" value="${d.bt}" placeholder="0"></td>
        <td class="p-1 border-r-4 border-slate-300 bg-blue-50/50"><input type="number" step="any" class="w-full p-1 min-w-[60px] border-transparent outline-none text-center text-xs font-bold text-blue-700 bg-transparent" data-col="bjml" value="${d.bjml}" placeholder="0"></td>
        
        <!-- Area Bahan Material (Loop Dinamis) -->
        ${['b_teer','b_paslin','b_solar','b_oli20','b_oli90','b_amplas','b_semen','b_pasir','b_batu','b_kerikil','b_urug','b_paku','b_sbaja','b_lap','b_kuas'].map(
            k => `<td class="p-1 border-r hover:bg-amber-50/50 transition-colors"><input type="number" step="any" class="w-full p-1 min-w-[50px] border-transparent outline-none text-center text-xs text-amber-900 bg-transparent" data-col="${k}" value="${d[k] || ''}" placeholder="0"></td>`
        ).join('')}
        <td class="p-1 border-r-4 border-slate-300"><input type="text" class="w-full p-1 min-w-[80px] border-transparent outline-none text-center text-xs" data-col="b_lain" value="${d.b_lain}" placeholder="..."></td>
        
        <!-- Keterangan & Aksi -->
        <td class="p-1 border-r"><textarea class="w-full min-w-[150px] text-xs p-1 border-transparent focus:border-indigo-300 rounded outline-none min-h-[30px] resize-none" data-col="ket" placeholder="Keterangan...">${d.ket}</textarea></td>
        <td class="p-1 text-center bg-white">
            <button onclick="removeTableRow06P(this)" class="bg-red-50 hover:bg-red-100 text-red-500 p-1.5 rounded transition-colors cursor-pointer" title="Hapus Baris">
                <i data-lucide="x" class="w-4 h-4"></i>
            </button>
        </td>
    `;
    tbody.appendChild(tr);
    calcNo06P();
    if(typeof initIcons === 'function') initIcons();
}

function removeTableRow06P(btn) {
    btn.closest('tr').remove();
    calcNo06P();
    const tbody = document.getElementById('p6-tbody');
    if (tbody.querySelectorAll('.p6-row').length === 0) addTableRow06P();
}

function calcNo06P() {
    document.querySelectorAll('#p6-tbody .p6-row').forEach((row, idx) => row.querySelector('.row-no').innerText = idx + 1);
}

async function saveForm06P() {
    const tahun = document.getElementById('p6-tahun').value;
    const juru = document.getElementById('p6-juru').value;
    const luas = document.getElementById('p6-luas').value;
    
    // Verifikasi Keamanan Simpan
    if (!tahun) return showFormAlert('p6', "Pilih Tahun terlebih dahulu!", "error");
    if (!juru) return showFormAlert('p6', "Pilih Juru terlebih dahulu!", "error");

    const rows = document.querySelectorAll('#p6-tbody .p6-row');
    let rowData = [];
    const cols = ['sal','bang','sp','sl','st','stot','bp','bl','bt','bjml','b_teer','b_paslin','b_solar','b_oli20','b_oli90','b_amplas','b_semen','b_pasir','b_batu','b_kerikil','b_urug','b_paku','b_sbaja','b_lap','b_kuas','b_lain','ket'];
    
    let hasData = false;
    rows.forEach(row => {
        let rObj = {};
        let isRowEmpty = true;
        cols.forEach(c => {
            const el = row.querySelector(`[data-col="${c}"]`);
            rObj[c] = el ? el.value.trim() : "";
            if (rObj[c] !== "") isRowEmpty = false;
        });
        if(!isRowEmpty) { rowData.push(rObj); hasData = true; }
    });

    if (!hasData) return showFormAlert('p6', "Tabel masih kosong! Harap isi minimal 1 baris saluran / bangunan.", "error");

    const savedData = getLS('06P_' + currentDI) || {};
    const key = `${tahun}_${juru}`;
    savedData[key] = withReportTimestamps({ tahun, juru, luas, rows: rowData }, savedData[key]);
    setLS('06P_' + currentDI, savedData);
    let onlineSaved = false;
    try {
        onlineSaved = await saveLaporanOnline('06-P', savedData[key], {
            kategori: 'pemeliharaan',
            key_laporan: key,
            tahun,
            periode: tahun,
            mt: juru
        });
    } catch (err) { console.warn('Gagal simpan Supabase 06-P:', err); }

    renderSavedList06P();
    
    // ðŸ‘‡ FITUR SAPU BERSIH INSTAN ðŸ‘‡
    resetInputs06P(true);
    showPemeliharaanSaveAlert('p6', `Kebutuhan Bahan Swakelola Juru <strong>${juru}</strong> (Tahun ${tahun}) berhasil disimpan${onlineSaved ? ' ke Supabase' : ' lokal'}.`, onlineSaved ? "success" : "warning", tahun);
    setTimeout(() => hideFormAlert('p6'), 4000);
}

function renderSavedList06P() {
    const savedData = getLS('06P_' + currentDI) || {};
    const container = document.getElementById('p6-saved-list');
    if(!container) return;
    
    const allKeys = Object.keys(savedData).sort().reverse(); 
    const keys = filterPemeliharaanSavedKeys(allKeys, savedData);

    if (allKeys.length === 0) {
        container.innerHTML = `<p class="col-span-full text-center text-slate-400 italic py-8 border border-dashed rounded-xl bg-slate-50">Belum ada Arsip Bahan (06-P) yang tersimpan.</p>`;
        return;
    }
    if (keys.length === 0) return renderNoActivePemeliharaanMessage(container, 'Arsip Bahan 06-P');

    container.innerHTML = keys.map(k => {
        const d = savedData[k];
        const rowCount = d.rows ? d.rows.length : 0;
        return `<div class="bg-white p-4 border rounded-xl shadow-sm hover:shadow-md transition-all">
            <div class="flex items-start gap-3 mb-4">
                <div class="bg-amber-100 text-amber-600 p-2.5 rounded-lg shrink-0"><i data-lucide="package" class="w-5 h-5"></i></div>
                <div class="w-full overflow-hidden">
                    <h4 class="font-black text-slate-800 text-sm truncate uppercase">Juru: ${d.juru}</h4>
                    <p class="text-[10px] text-slate-500 font-medium truncate mt-0.5">Tahun ${d.tahun} | Areal: ${d.luas}</p>
                    <p class="text-[10px] text-amber-600 font-bold mt-1 bg-slate-100 inline-block px-2 py-0.5 rounded">${rowCount} Titik Lokasi</p>
                </div>
            </div>
            <button onclick="edit06P('${k}')" class="w-full bg-amber-50 hover:bg-amber-100 text-amber-700 py-2 rounded-lg font-bold text-xs transition-colors cursor-pointer">Lihat Rincian Bahan</button>
        </div>`;
    }).join('');
    
    if(typeof initIcons === 'function') initIcons();
}

function edit06P(key) {
    const data = (getLS('06P_' + currentDI) || {})[key];
    if(!data) return;
    
    const selTahun = document.getElementById('p6-tahun');
    if(selTahun) selTahun.value = data.tahun;
    
    const selJuru = document.getElementById('p6-juru');
    let optionExists = Array.from(selJuru.options).some(opt => opt.value === data.juru);
    if (!optionExists) selJuru.innerHTML += `<option value="${data.juru}">${data.juru}</option>`;
    
    selJuru.value = data.juru;
    onChangeFilter06P(); 
    document.getElementById('view-blanko-pemeliharaan').scrollIntoView({behavior: 'smooth'});
}

function resetInputs06P(hideAlert = true) {
    // REVISI RESET: Kosongkan Tahun dan Juru
    const selTahun = document.getElementById('p6-tahun');
    if(selTahun) selTahun.value = "";
    
    const selJuru = document.getElementById('p6-juru');
    if(selJuru) selJuru.value = "";
    
    const inputLuas = document.getElementById('p6-luas');
    if(inputLuas) inputLuas.value = "";
    
    const tbody = document.getElementById('p6-tbody');
    if(tbody) tbody.innerHTML = '<tr><td colspan="27" class="p-12 text-center text-slate-400 italic">Silakan Pilih <strong>Tahun</strong> dan <strong>Juru</strong> terlebih dahulu untuk mulai mengisi laporan.</td></tr>';
    
    const btnAdd = document.getElementById('p6-btn-add');
    if(btnAdd) { btnAdd.classList.add('hidden'); btnAdd.classList.remove('flex'); }
    
    if(hideAlert) hideFormAlert('p6');
}

// ====================================================================
// --- SISTEM LOGIKA FORMULIR 07-P (KEBUTUHAN BAHAN & TENAGA) BERKALA ---
// ====================================================================

function render07P() {
    hideFormAlert('p7');
    const pData = getProfilData(currentDI);
    
    // 1. Info Header
    ['di','kodeDI','pengamat','kabupaten'].forEach(id => {
        const el = document.getElementById('p7-' + id);
        if(el) el.innerText = (id === 'di') ? currentDI : (pData[id] || "-");
    });
    
    let totalLuasDI = 0;
    if(pData.bendungs) pData.bendungs.forEach(b => { if(b.rincian) b.rincian.forEach(r => totalLuasDI += (parseFloat(r.luasFungsional)||0)); });
    const elLuasDI = document.getElementById('p7-totalLuasDI');
    if(elLuasDI) elLuasDI.innerText = totalLuasDI > 0 ? totalLuasDI.toFixed(2) + " Ha" : "0 Ha";

    // 2. Setup Dropdown Tahun Dinamis (NETRAL)
    const selTahun = document.getElementById('p7-tahun');
    if(selTahun) {
        const currentYear = new Date().getFullYear();
        let thnOpts = '<option value="">-- Pilih Tahun --</option>';
        for (let i = currentYear - 2; i <= currentYear + 2; i++) {
            thnOpts += `<option value="${i}">${i}</option>`;
        }
        selTahun.innerHTML = thnOpts;
    }

    // 3. Setup Dropdown Juru (NETRAL)
    const selJuru = document.getElementById('p7-juru');
    if(selJuru) {
        let optJuru = '<option value="">-- Pilih Juru --</option>';
        if (pData.jurus && Array.isArray(pData.jurus)) {
            pData.jurus.forEach(j => {
                let namaJuru = typeof j === 'string' ? j : j.nama;
                if(namaJuru.trim() !== '') optJuru += `<option value="${namaJuru}">${namaJuru}</option>`;
            });
        }
        selJuru.innerHTML = optJuru;
    }
    
    // Reset Form State Awal
    if(!selTahun?.value || !selJuru?.value) {
        resetInputs07P(false);
    } else {
        onChangeFilter07P();
    }
    renderSavedList07P();
    syncPemeliharaanFormFromSupabase('07P', '07-P', renderSavedList07P);
}

function onChangeFilter07P() {
    hideFormAlert('p7');
    const tahun = document.getElementById('p7-tahun')?.value;
    const juru = document.getElementById('p7-juru')?.value;
    const tbody = document.getElementById('p7-tbody');
    const btnAdd = document.getElementById('p7-btn-add');
    
    if (!tbody || !btnAdd) return;

    // Cek apakah TAHUN dan JURU sudah dipilih
    if (!tahun || !juru) {
        document.getElementById('p7-luas').value = "";
        tbody.innerHTML = '<tr><td colspan="26" class="p-12 text-center text-slate-400 italic">Silakan Pilih <strong>Tahun</strong> dan <strong>Juru</strong> terlebih dahulu untuk mulai mengisi laporan.</td></tr>';
        btnAdd.classList.add('hidden'); btnAdd.classList.remove('flex');
        return;
    }

    // Hitung Luas Areal Otomatis dari Profil D.I
    const pData = getProfilData(currentDI);
    let luasAreal = 0;
    if(pData && pData.bendungs) {
        pData.bendungs.forEach(bendung => {
            const namaJuruBendung = (bendung.juru || "").toString().trim().toLowerCase();
            const namaJuruPilih = (juru || "").toString().trim().toLowerCase();
            if (namaJuruBendung === namaJuruPilih && bendung.rincian) {
                bendung.rincian.forEach(r => luasAreal += (parseFloat(r.luasFungsional) || 0));
            }
        });
    }
    document.getElementById('p7-luas').value = luasAreal > 0 ? luasAreal.toFixed(2) + " Ha" : "0 Ha";

    // Buka Tabel & Render Arsip
    btnAdd.classList.remove('hidden'); btnAdd.classList.add('flex');
    const key = `${tahun}_${juru}`;
    const savedData = (getLS('07P_' + currentDI) || {})[key];

    if (savedData && savedData.rows && savedData.rows.length > 0) {
        tbody.innerHTML = ''; 
        savedData.rows.forEach(r => addTableRow07P(r));
        showFormAlert('p7', `Menampilkan arsip Kebutuhan Bahan & Tenaga Juru <strong>${juru}</strong> (Tahun ${tahun}).`, "info");
    } else {
        tbody.innerHTML = '';
        addTableRow07P(); 
    }
}

function addTableRow07P(data = null) {
    const tbody = document.getElementById('p7-tbody');
    if(!tbody) return;

    const tr = document.createElement('tr');
    tr.className = "border-b hover:bg-slate-50 transition-colors p7-row bg-white";
    
    const d = data || { 
        sal:'', bang:'', sp:'', sl:'', st:'', stot:'', bp:'', bl:'', bt:'', bjml:'',
        b_cat:'', b_teer:'', b_amplas:'', b_semen:'', b_pasir:'', b_batu:'', b_kerikil:'', b_turug:'', b_purug:'', b_paku:'', b_lain:'',
        t_tukang:'', t_pekerja:'', ket:''
    };

    tr.innerHTML = `
        <!-- Membekukan 3 Kolom Pertama -->
        <td class="p-2 border-r text-center font-bold text-slate-600 bg-slate-50 row-no" style="left: 0; position: sticky; z-index: 10;">1</td>
        <td class="p-1 border-r bg-white shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]" style="left: 35px; position: sticky; z-index: 10;">
            <input type="text" class="w-full min-w-[120px] p-1 border-transparent focus:border-indigo-300 outline-none rounded font-medium text-indigo-800" data-col="sal" value="${d.sal}" placeholder="Nama Saluran">
        </td>
        <td class="p-1 border-r-4 border-slate-300 bg-slate-50 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]" style="left: 165px; position: sticky; z-index: 10;">
            <input type="text" class="w-full min-w-[120px] p-1 border-transparent focus:border-slate-300 outline-none rounded font-medium text-slate-800 bg-transparent" data-col="bang" value="${d.bang}" placeholder="Nama Bangunan">
        </td>
        
        <!-- Area Dimensi Saluran -->
        <td class="p-1 border-r"><input type="number" step="any" class="w-full p-1 min-w-[50px] border-transparent outline-none text-center text-xs" data-col="sp" value="${d.sp}" placeholder="0"></td>
        <td class="p-1 border-r"><input type="number" step="any" class="w-full p-1 min-w-[50px] border-transparent outline-none text-center text-xs" data-col="sl" value="${d.sl}" placeholder="0"></td>
        <td class="p-1 border-r"><input type="number" step="any" class="w-full p-1 min-w-[50px] border-transparent outline-none text-center text-xs" data-col="st" value="${d.st}" placeholder="0"></td>
        <td class="p-1 border-r-4 border-slate-300 bg-indigo-50/50"><input type="number" step="any" class="w-full p-1 min-w-[60px] border-transparent outline-none text-center text-xs font-bold text-indigo-700 bg-transparent" data-col="stot" value="${d.stot}" placeholder="0"></td>
        
        <!-- Area Dimensi Bangunan -->
        <td class="p-1 border-r"><input type="number" step="any" class="w-full p-1 min-w-[50px] border-transparent outline-none text-center text-xs" data-col="bp" value="${d.bp}" placeholder="0"></td>
        <td class="p-1 border-r"><input type="number" step="any" class="w-full p-1 min-w-[50px] border-transparent outline-none text-center text-xs" data-col="bl" value="${d.bl}" placeholder="0"></td>
        <td class="p-1 border-r"><input type="number" step="any" class="w-full p-1 min-w-[50px] border-transparent outline-none text-center text-xs" data-col="bt" value="${d.bt}" placeholder="0"></td>
        <td class="p-1 border-r-4 border-slate-300 bg-blue-50/50"><input type="number" step="any" class="w-full p-1 min-w-[60px] border-transparent outline-none text-center text-xs font-bold text-blue-700 bg-transparent" data-col="bjml" value="${d.bjml}" placeholder="0"></td>
        
        <!-- Area Bahan Material (Loop Dinamis) -->
        ${['b_cat','b_teer','b_amplas','b_semen','b_pasir','b_batu','b_kerikil','b_turug','b_purug','b_paku'].map(
            k => `<td class="p-1 border-r hover:bg-amber-50/50 transition-colors"><input type="number" step="any" class="w-full p-1 min-w-[50px] border-transparent outline-none text-center text-xs text-amber-900 bg-transparent" data-col="${k}" value="${d[k] || ''}" placeholder="0"></td>`
        ).join('')}
        <td class="p-1 border-r-4 border-slate-300"><input type="text" class="w-full p-1 min-w-[80px] border-transparent outline-none text-center text-xs" data-col="b_lain" value="${d.b_lain}" placeholder="..."></td>
        
        <!-- Area Kebutuhan Tenaga Kerja -->
        <td class="p-1 border-r bg-emerald-50/50"><input type="number" step="any" class="w-full p-1 min-w-[60px] border-transparent outline-none text-center text-xs font-bold text-emerald-800 bg-transparent" data-col="t_tukang" value="${d.t_tukang}" placeholder="0"></td>
        <td class="p-1 border-r-4 border-slate-300 bg-emerald-50/50"><input type="number" step="any" class="w-full p-1 min-w-[60px] border-transparent outline-none text-center text-xs font-bold text-emerald-800 bg-transparent" data-col="t_pekerja" value="${d.t_pekerja}" placeholder="0"></td>

        <!-- Keterangan & Aksi -->
        <td class="p-1 border-r"><textarea class="w-full min-w-[150px] text-xs p-1 border-transparent focus:border-indigo-300 rounded outline-none min-h-[30px] resize-none" data-col="ket" placeholder="Keterangan...">${d.ket}</textarea></td>
        <td class="p-1 text-center bg-white">
            <button onclick="removeTableRow07P(this)" class="bg-red-50 hover:bg-red-100 text-red-500 p-1.5 rounded transition-colors cursor-pointer" title="Hapus Baris">
                <i data-lucide="x" class="w-4 h-4"></i>
            </button>
        </td>
    `;
    tbody.appendChild(tr);
    calcNo07P();
    if(typeof initIcons === 'function') initIcons();
}

function removeTableRow07P(btn) {
    btn.closest('tr').remove();
    calcNo07P();
    const tbody = document.getElementById('p7-tbody');
    if (tbody.querySelectorAll('.p7-row').length === 0) addTableRow07P();
}

function calcNo07P() {
    document.querySelectorAll('#p7-tbody .p7-row').forEach((row, idx) => row.querySelector('.row-no').innerText = idx + 1);
}

async function saveForm07P() {
    const tahun = document.getElementById('p7-tahun').value;
    const juru = document.getElementById('p7-juru').value;
    const luas = document.getElementById('p7-luas').value;
    
    // Verifikasi Keamanan Simpan
    if (!tahun) return showFormAlert('p7', "Pilih Tahun terlebih dahulu!", "error");
    if (!juru) return showFormAlert('p7', "Pilih Juru terlebih dahulu!", "error");

    const rows = document.querySelectorAll('#p7-tbody .p7-row');
    let rowData = [];
    const cols = ['sal','bang','sp','sl','st','stot','bp','bl','bt','bjml','b_cat','b_teer','b_amplas','b_semen','b_pasir','b_batu','b_kerikil','b_turug','b_purug','b_paku','b_lain','t_tukang','t_pekerja','ket'];
    
    let hasData = false;
    rows.forEach(row => {
        let rObj = {};
        let isRowEmpty = true;
        cols.forEach(c => {
            const el = row.querySelector(`[data-col="${c}"]`);
            rObj[c] = el ? el.value.trim() : "";
            if (rObj[c] !== "") isRowEmpty = false;
        });
        if(!isRowEmpty) { rowData.push(rObj); hasData = true; }
    });

    if (!hasData) return showFormAlert('p7', "Tabel masih kosong! Harap isi minimal 1 baris kebutuhan bahan & tenaga.", "error");

    const savedData = getLS('07P_' + currentDI) || {};
    const key = `${tahun}_${juru}`;
    savedData[key] = withReportTimestamps({ tahun, juru, luas, rows: rowData }, savedData[key]);
    setLS('07P_' + currentDI, savedData);
    let onlineSaved = false;
    try {
        onlineSaved = await saveLaporanOnline('07-P', savedData[key], {
            kategori: 'pemeliharaan',
            key_laporan: key,
            tahun,
            periode: tahun,
            mt: juru
        });
    } catch (err) { console.warn('Gagal simpan Supabase 07-P:', err); }

    renderSavedList07P();
    
    // ðŸ‘‡ FITUR SAPU BERSIH INSTAN ðŸ‘‡
    resetInputs07P(true);
    showPemeliharaanSaveAlert('p7', `Kebutuhan Bahan & Tenaga Juru <strong>${juru}</strong> (Tahun ${tahun}) berhasil disimpan${onlineSaved ? ' ke Supabase' : ' lokal'}.`, onlineSaved ? "success" : "warning", tahun);
    setTimeout(() => hideFormAlert('p7'), 4000);
}

function renderSavedList07P() {
    const savedData = getLS('07P_' + currentDI) || {};
    const container = document.getElementById('p7-saved-list');
    if(!container) return;
    
    // Sort descending (terbaru di atas)
    const allKeys = Object.keys(savedData).sort().reverse(); 
    const keys = filterPemeliharaanSavedKeys(allKeys, savedData);

    if (allKeys.length === 0) {
        container.innerHTML = `<p class="col-span-full text-center text-slate-400 italic py-8 border border-dashed rounded-xl bg-slate-50">Belum ada Arsip Bahan & Tenaga (07-P) yang tersimpan.</p>`;
        return;
    }
    if (keys.length === 0) return renderNoActivePemeliharaanMessage(container, 'Arsip Bahan & Tenaga 07-P');

    container.innerHTML = keys.map(k => {
        const d = savedData[k];
        const rowCount = d.rows ? d.rows.length : 0;
        return `<div class="bg-white p-4 border rounded-xl shadow-sm hover:shadow-md transition-all">
            <div class="flex items-start gap-3 mb-4">
                <div class="bg-indigo-100 text-indigo-600 p-2.5 rounded-lg shrink-0"><i data-lucide="hard-hat" class="w-5 h-5"></i></div>
                <div class="w-full overflow-hidden">
                    <h4 class="font-black text-slate-800 text-sm truncate uppercase">Juru: ${d.juru}</h4>
                    <p class="text-[10px] text-slate-500 font-medium truncate mt-0.5">Tahun ${d.tahun} | Areal: ${d.luas}</p>
                    <p class="text-[10px] text-indigo-600 font-bold mt-1 bg-slate-100 inline-block px-2 py-0.5 rounded">${rowCount} Lokasi Pekerjaan</p>
                </div>
            </div>
            <button onclick="edit07P('${k}')" class="w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 py-2 rounded-lg font-bold text-xs transition-colors cursor-pointer">Lihat Rincian</button>
        </div>`;
    }).join('');
    
    if(typeof initIcons === 'function') initIcons();
}

function edit07P(key) {
    const data = (getLS('07P_' + currentDI) || {})[key];
    if(!data) return;
    
    const selTahun = document.getElementById('p7-tahun');
    if(selTahun) selTahun.value = data.tahun;
    
    const selJuru = document.getElementById('p7-juru');
    let optionExists = Array.from(selJuru.options).some(opt => opt.value === data.juru);
    if (!optionExists) selJuru.innerHTML += `<option value="${data.juru}">${data.juru}</option>`;
    
    selJuru.value = data.juru;
    onChangeFilter07P(); 
    document.getElementById('view-blanko-pemeliharaan').scrollIntoView({behavior: 'smooth'});
}

function resetInputs07P(hideAlert = true) {
    const selTahun = document.getElementById('p7-tahun');
    if(selTahun) selTahun.value = "";
    
    const selJuru = document.getElementById('p7-juru');
    if(selJuru) selJuru.value = "";
    
    const inputLuas = document.getElementById('p7-luas');
    if(inputLuas) inputLuas.value = "";
    
    const tbody = document.getElementById('p7-tbody');
    if(tbody) tbody.innerHTML = '<tr><td colspan="26" class="p-12 text-center text-slate-400 italic">Silakan Pilih <strong>Tahun</strong> dan <strong>Juru</strong> terlebih dahulu untuk mulai mengisi laporan.</td></tr>';
    
    const btnAdd = document.getElementById('p7-btn-add');
    if(btnAdd) { btnAdd.classList.add('hidden'); btnAdd.classList.remove('flex'); }
    
    if(hideAlert) hideFormAlert('p7');
}

// ====================================================================
// --- SISTEM LOGIKA FORMULIR 08-P (PELAKSANAAN SWAKELOLA) ---
// ====================================================================

function render08P() {
    hideFormAlert('p8');
    const pData = getProfilData(currentDI);
    
    // 1. Info Header
    ['di','kodeDI','pengamat','kabupaten'].forEach(id => {
        const el = document.getElementById('p8-' + id);
        if(el) el.innerText = (id === 'di') ? currentDI : (pData[id] || "-");
    });
    let totalLuasDI = 0;
    if(pData.bendungs) pData.bendungs.forEach(b => { if(b.rincian) b.rincian.forEach(r => totalLuasDI += (parseFloat(r.luasFungsional)||0)); });
    const elLuasDI = document.getElementById('p8-totalLuasDI');
    if(elLuasDI) elLuasDI.innerText = totalLuasDI > 0 ? totalLuasDI.toFixed(2) + " Ha" : "0 Ha";

    resetInputs08P(false); // Kosongkan input tanpa sembunyikan alert (karena awal)
    renderSavedList08P();
    syncPemeliharaanFormFromSupabase('08P', '08-P', renderSavedList08P);
}

function addTableRow08P(data = null) {
    const tbody = document.getElementById('p8-tbody');
    if(!tbody) return;

    const tr = document.createElement('tr');
    tr.className = "border-b hover:bg-slate-50 transition-colors p8-row bg-white";
    
    const d = data || { 
        uraian:'', t_vol:'', t_rp:'', l_vol:'', l_rp:'', i_vol:'', i_rp:'', sd_vol:'', sd_rp:'', sd_persen:'', ket:'' 
    };

    tr.innerHTML = `
        <!-- Membekukan 2 Kolom Pertama (No dan Uraian Pekerjaan) -->
        <td class="p-2 border-r text-center font-bold text-slate-600 bg-slate-50 row-no" style="left: 0; position: sticky; z-index: 10;">1</td>
        <td class="p-1 border-r bg-white shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]" style="left: 35px; position: sticky; z-index: 10;">
            <textarea class="w-full text-xs p-2 border-transparent focus:border-indigo-300 rounded outline-none min-h-[40px] resize-none font-medium text-slate-800" data-col="uraian" placeholder="Uraian Pekerjaan...">${d.uraian}</textarea>
        </td>
        
        <!-- Target -->
        <td class="p-1 border-r bg-indigo-50/20"><input type="number" step="any" oninput="calcRow08P(this)" class="w-full p-1 border-transparent focus:border-indigo-300 outline-none rounded text-center font-bold text-indigo-700 min-w-[80px]" data-col="t_vol" value="${d.t_vol}" placeholder="Vol"></td>
        <td class="p-1 border-r-4 border-slate-300 bg-indigo-50/20"><input type="number" step="any" oninput="calcRow08P(this)" class="w-full p-1 border-transparent focus:border-indigo-300 outline-none rounded text-right font-bold text-indigo-700 min-w-[120px]" data-col="t_rp" value="${d.t_rp}" placeholder="Rp"></td>
        
        <!-- Bulan Lalu -->
        <td class="p-1 border-r bg-amber-50/20"><input type="number" step="any" oninput="calcRow08P(this)" class="w-full p-1 border-transparent focus:border-amber-300 outline-none rounded text-center min-w-[80px]" data-col="l_vol" value="${d.l_vol}" placeholder="Vol"></td>
        <td class="p-1 border-r bg-amber-50/20"><input type="number" step="any" oninput="calcRow08P(this)" class="w-full p-1 border-transparent focus:border-amber-300 outline-none rounded text-right min-w-[120px]" data-col="l_rp" value="${d.l_rp}" placeholder="Rp"></td>
        
        <!-- Bulan Ini -->
        <td class="p-1 border-r bg-emerald-50/20"><input type="number" step="any" oninput="calcRow08P(this)" class="w-full p-1 border-transparent focus:border-emerald-300 outline-none rounded text-center text-emerald-700 min-w-[80px]" data-col="i_vol" value="${d.i_vol}" placeholder="Vol"></td>
        <td class="p-1 border-r-4 border-slate-300 bg-emerald-50/20"><input type="number" step="any" oninput="calcRow08P(this)" class="w-full p-1 border-transparent focus:border-emerald-300 outline-none rounded text-right text-emerald-700 min-w-[120px]" data-col="i_rp" value="${d.i_rp}" placeholder="Rp"></td>
        
        <!-- S/d Bulan Ini (Otomatis) -->
        <td class="p-1 border-r bg-blue-50/50"><input type="number" readonly class="w-full p-1 border-transparent outline-none rounded text-center font-bold text-blue-900 bg-transparent cursor-not-allowed min-w-[80px]" data-col="sd_vol" value="${d.sd_vol}"></td>
        <td class="p-1 border-r bg-blue-50/50"><input type="number" readonly class="w-full p-1 border-transparent outline-none rounded text-right font-bold text-blue-900 bg-transparent cursor-not-allowed min-w-[120px]" data-col="sd_rp" value="${d.sd_rp}"></td>
        <td class="p-1 border-r-4 border-slate-300 bg-blue-100/50"><input type="text" readonly class="w-full p-1 border-transparent outline-none rounded text-center font-black text-blue-700 bg-transparent cursor-not-allowed min-w-[70px]" data-col="sd_persen" value="${d.sd_persen}"></td>

        <!-- Keterangan & Aksi -->
        <td class="p-1 border-r"><textarea class="w-full text-xs p-1 border-transparent focus:border-indigo-300 rounded outline-none min-h-[40px] resize-none min-w-[150px]" data-col="ket" placeholder="Keterangan...">${d.ket}</textarea></td>
        <td class="p-1 text-center bg-white">
            <button onclick="removeTableRow08P(this)" class="bg-red-50 hover:bg-red-100 text-red-500 p-2 rounded transition-colors cursor-pointer" title="Hapus Uraian">
                <i data-lucide="x" class="w-4 h-4"></i>
            </button>
        </td>
    `;
    tbody.appendChild(tr);
    calcNo08P();
    if(typeof initIcons === 'function') initIcons();
}

function calcRow08P(inputEl) {
    const tr = inputEl.closest('tr');
    
    // Ambil nilai Input
    const t_rp = parseFloat(tr.querySelector('[data-col="t_rp"]').value) || 0;
    const l_vol = parseFloat(tr.querySelector('[data-col="l_vol"]').value) || 0;
    const l_rp = parseFloat(tr.querySelector('[data-col="l_rp"]').value) || 0;
    const i_vol = parseFloat(tr.querySelector('[data-col="i_vol"]').value) || 0;
    const i_rp = parseFloat(tr.querySelector('[data-col="i_rp"]').value) || 0;
    
    // Elemen Output
    const sd_vol_el = tr.querySelector('[data-col="sd_vol"]');
    const sd_rp_el = tr.querySelector('[data-col="sd_rp"]');
    const sd_persen_el = tr.querySelector('[data-col="sd_persen"]');

    // Kalkulasi
    const sd_vol = l_vol + i_vol;
    const sd_rp = l_rp + i_rp;
    
    // Set Output S/d
    sd_vol_el.value = sd_vol > 0 ? sd_vol : "";
    sd_rp_el.value = sd_rp > 0 ? sd_rp : "";
    
    // Hitung Persentase (Berdasarkan Target Plafond Biaya Rp)
    if (t_rp > 0 && sd_rp > 0) {
        let persen = (sd_rp / t_rp) * 100;
        sd_persen_el.value = persen.toFixed(2) + " %";
    } else {
        sd_persen_el.value = "";
    }
}

function removeTableRow08P(btn) {
    btn.closest('tr').remove();
    calcNo08P();
    const tbody = document.getElementById('p8-tbody');
    if (tbody.querySelectorAll('.p8-row').length === 0) addTableRow08P();
}

function calcNo08P() {
    document.querySelectorAll('#p8-tbody .p8-row').forEach((row, idx) => row.querySelector('.row-no').innerText = idx + 1);
}

async function saveForm08P() {
    const pelaksana = document.getElementById('p8-pelaksana').value.trim();
    const pekerjaan = document.getElementById('p8-pekerjaan').value.trim();
    const tglMulai = document.getElementById('p8-tgl-mulai').value;
    const tglSelesai = document.getElementById('p8-tgl-selesai').value;
    
    // Verifikasi Keamanan Simpan
    if (!pelaksana) return showFormAlert('p8', "Mohon lengkapi Pelaksana Pekerjaan!", "error");
    if (!pekerjaan) return showFormAlert('p8', "Mohon lengkapi Nama Pekerjaan Swakelola!", "error");
    if (!tglMulai || !tglSelesai) return showFormAlert('p8', "Mohon lengkapi Tanggal Periode Laporan!", "error");

    const rows = document.querySelectorAll('#p8-tbody .p8-row');
    let rowData = [];
    const cols = ['uraian','t_vol','t_rp','l_vol','l_rp','i_vol','i_rp','sd_vol','sd_rp','sd_persen','ket'];
    
    let hasData = false;
    rows.forEach(row => {
        let rObj = {};
        let isRowEmpty = true;
        cols.forEach(c => {
            const el = row.querySelector(`[data-col="${c}"]`);
            rObj[c] = el ? el.value.trim() : "";
            if (c !== 'uraian' && rObj[c] !== "") isRowEmpty = false;
        });
        // Pastikan uraian juga diisi jika ada datanya
        if(!isRowEmpty || rObj['uraian'].trim() !== "") { 
            rowData.push(rObj); hasData = true; 
        }
    });

    if (!hasData) return showFormAlert('p8', "Tabel masih kosong! Harap isi minimal 1 uraian pekerjaan.", "error");

    const savedData = getLS('08P_' + currentDI) || {};
    // Kita gunakan ID unik gabungan pekerjaan dan tanggal mulai (agar bisa diedit atau ditambahkan)
    const keyId = `${pekerjaan.substring(0,20)}_${tglMulai}`.replace(/[^a-zA-Z0-9_]/g, '-');
    
    savedData[keyId] = withReportTimestamps({ pelaksana, pekerjaan, tglMulai, tglSelesai, rows: rowData }, savedData[keyId]);
    setLS('08P_' + currentDI, savedData);
    let onlineSaved = false;
    try {
        onlineSaved = await saveLaporanOnline('08-P', savedData[keyId], {
            kategori: 'pemeliharaan',
            key_laporan: keyId,
            periode: tglMulai,
            tahun: (tglMulai || '').slice(0, 4)
        });
    } catch (err) { console.warn('Gagal simpan Supabase 08-P:', err); }

    renderSavedList08P();
    
    // ðŸ‘‡ FITUR SAPU BERSIH INSTAN ðŸ‘‡
    resetInputs08P(true);
    showPemeliharaanSaveAlert('p8', `Laporan Pekerjaan <strong>${pekerjaan}</strong> berhasil disimpan${onlineSaved ? ' ke Supabase' : ' lokal'}.`, onlineSaved ? "success" : "warning", extractPemeliharaanYear({ tglMulai, tglSelesai }, tglMulai));
    setTimeout(() => hideFormAlert('p8'), 4000);
}

function renderSavedList08P() {
    const savedData = getLS('08P_' + currentDI) || {};
    const container = document.getElementById('p8-saved-list');
    if(!container) return;
    
    // Urutkan dari yang terbaru disimpan
    const allKeys = Object.keys(savedData).sort((a,b) => new Date(savedData[b].timestamp) - new Date(savedData[a].timestamp));
    const keys = filterPemeliharaanSavedKeys(allKeys, savedData);

    if (allKeys.length === 0) {
        container.innerHTML = `<p class="col-span-full text-center text-slate-400 italic py-8 border border-dashed rounded-xl bg-slate-50">Belum ada Laporan Progres (08-P) yang tersimpan.</p>`;
        return;
    }
    if (keys.length === 0) return renderNoActivePemeliharaanMessage(container, 'Laporan Progres 08-P');

    container.innerHTML = keys.map(k => {
        const d = savedData[k];
        const rowCount = d.rows ? d.rows.length : 0;
        return `<div class="bg-white p-4 border rounded-xl shadow-sm hover:shadow-md transition-all">
            <div class="flex items-start gap-3 mb-4">
                <div class="bg-emerald-100 text-emerald-600 p-2.5 rounded-lg shrink-0"><i data-lucide="clipboard-check" class="w-5 h-5"></i></div>
                <div class="w-full overflow-hidden">
                    <h4 class="font-black text-slate-800 text-sm truncate uppercase" title="${d.pekerjaan}">${d.pekerjaan}</h4>
                    <p class="text-[10px] text-slate-500 font-medium truncate mt-0.5">Pelaksana: ${d.pelaksana || '-'}</p>
                    <p class="text-[10px] text-slate-500 font-medium truncate mt-0.5">Periode: ${d.tglMulai} s/d ${d.tglSelesai}</p>
                    <p class="text-[10px] text-emerald-600 font-bold mt-1 bg-slate-100 inline-block px-2 py-0.5 rounded">${rowCount} Rincian Pekerjaan</p>
                </div>
            </div>
            <button onclick="edit08P('${k}')" class="w-full bg-emerald-50 hover:bg-emerald-100 text-emerald-700 py-2 rounded-lg font-bold text-xs transition-colors cursor-pointer">Lihat Rincian Laporan</button>
        </div>`;
    }).join('');
    
    if(typeof initIcons === 'function') initIcons();
}

function edit08P(keyId) {
    const data = (getLS('08P_' + currentDI) || {})[keyId];
    if(!data) return;
    
    document.getElementById('p8-pelaksana').value = data.pelaksana || "";
    document.getElementById('p8-pekerjaan').value = data.pekerjaan || "";
    document.getElementById('p8-tgl-mulai').value = data.tglMulai || "";
    document.getElementById('p8-tgl-selesai').value = data.tglSelesai || "";
    
    const tbody = document.getElementById('p8-tbody');
    if(tbody) tbody.innerHTML = '';
    
    if (data.rows && data.rows.length > 0) {
        data.rows.forEach(r => addTableRow08P(r));
    } else {
        addTableRow08P();
    }
    
    hideFormAlert('p8');
    document.getElementById('view-blanko-pemeliharaan').scrollIntoView({behavior: 'smooth'});
}

function resetInputs08P(hideAlert = true) {
    document.getElementById('p8-pelaksana').value = "";
    document.getElementById('p8-pekerjaan').value = "";
    document.getElementById('p8-tgl-mulai').value = "";
    document.getElementById('p8-tgl-selesai').value = "";
    
    const tbody = document.getElementById('p8-tbody');
    if(tbody) {
        tbody.innerHTML = '';
        addTableRow08P(); // Berikan 1 baris kosong default
    }
    
    if(hideAlert) hideFormAlert('p8');
}

// ====================================================================
// --- SISTEM LOGIKA FORMULIR 09-P (REALISASI KONTRAKTUAL) ---
// ====================================================================

function render09P() {
    hideFormAlert('p9');
    
    // 1. Kosongkan Input Instansi
    const dinasInput = document.getElementById('p9-dinas');
    if (dinasInput) dinasInput.value = "";

    // 2. Setup Dropdown Bulan Dinamis (Netral)
    const selBulan = document.getElementById('p9-bulan');
    if (selBulan) {
        let blnOpts = '<option value="">-- Pilih Bulan --</option>';
        const namaBulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
        namaBulan.forEach((nm, idx) => {
            const val = String(idx + 1).padStart(2, '0');
            blnOpts += `<option value="${val}">${nm}</option>`;
        });
        selBulan.innerHTML = blnOpts;
    }

    // 3. Setup Dropdown Tahun Dinamis (Netral)
    const selTahun = document.getElementById('p9-tahun');
    if (selTahun) {
        const thnSekarang = new Date().getFullYear();
        let thnOpts = '<option value="">-- Pilih Tahun --</option>';
        for (let i = thnSekarang - 2; i <= thnSekarang + 2; i++) {
            thnOpts += `<option value="${i}">${i}</option>`;
        }
        selTahun.innerHTML = thnOpts;
    }

    // Eksekusi Render Awal
    if (!selBulan?.value || !selTahun?.value) {
        resetInputs09P(false);
    } else {
        onChangeFilter09P();
    }
    
    renderSavedList09P();
    syncPemeliharaanFormFromSupabase('09P', '09-P', renderSavedList09P);
}

function onChangeFilter09P() {
    hideFormAlert('p9');
    const bulan = document.getElementById('p9-bulan')?.value;
    const tahun = document.getElementById('p9-tahun')?.value;
    const tbody = document.getElementById('p9-tbody');
    const btnAdd = document.getElementById('p9-btn-add');
    
    if (!tbody || !btnAdd) return;

    if (!bulan || !tahun) {
        tbody.innerHTML = '<tr><td colspan="9" class="p-12 text-slate-400 italic text-center">Silakan Pilih <strong>Bulan</strong> dan <strong>Tahun</strong> Laporan terlebih dahulu.</td></tr>';
        btnAdd.classList.add('hidden'); btnAdd.classList.remove('flex');
        return;
    }

    btnAdd.classList.remove('hidden'); btnAdd.classList.add('flex');

    const key = `${tahun}_${bulan}`;
    const savedData = (getLS('09P_' + currentDI) || {})[key];

    if (savedData && savedData.rows && savedData.rows.length > 0) {
        document.getElementById('p9-dinas').value = savedData.dinas || "";
        tbody.innerHTML = ''; 
        savedData.rows.forEach(r => addTableRow09P(r));
        const nmBulan = document.getElementById('p9-bulan').options[document.getElementById('p9-bulan').selectedIndex].text;
        showFormAlert('p9', `Menampilkan arsip Realisasi Kontraktual <strong>Bulan ${nmBulan} ${tahun}</strong>.`, "info");
    } else {
        tbody.innerHTML = '';
        addTableRow09P(); 
    }
}

function addTableRow09P(data = null) {
    const tbody = document.getElementById('p9-tbody');
    if (!tbody) return;

    const tr = document.createElement('tr');
    tr.className = "border-b hover:bg-slate-50 transition-colors p9-row bg-white";
    
    const d = data || { 
        paket:'', a_rp:'', b_bobot:'100', c_rp:'', d_persen:'', e_fisik:'', tertimbang:'', ket:'' 
    };

    tr.innerHTML = `
        <!-- Membekukan Kolom No & Paket Pekerjaan -->
        <td class="p-2 border-r text-center font-bold text-slate-600 bg-slate-50 row-no" style="left: 0; position: sticky; z-index: 10;">1</td>
        <td class="p-1 border-r bg-white shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]" style="left: 35px; position: sticky; z-index: 10;">
            <textarea class="w-full text-xs p-2 border-transparent focus:border-indigo-300 rounded outline-none min-h-[40px] resize-none font-medium text-slate-800" data-col="paket" placeholder="Nama Paket...">${d.paket}</textarea>
        </td>
        
        <!-- Kolom Data Angka -->
        <td class="p-1 border-r bg-indigo-50/20"><input type="number" step="any" oninput="calcRow09P(this)" class="w-full p-2 border-transparent focus:border-indigo-300 outline-none rounded text-right font-bold text-indigo-700 min-w-[120px]" data-col="a_rp" value="${d.a_rp}" placeholder="Rp"></td>
        <td class="p-1 border-r-4 border-slate-300 bg-indigo-50/20"><input type="number" step="any" oninput="calcRow09P(this)" class="w-full p-2 border-transparent focus:border-indigo-300 outline-none rounded text-center font-bold text-indigo-700 min-w-[80px]" data-col="b_bobot" value="${d.b_bobot}" placeholder="%"></td>
        
        <td class="p-1 border-r bg-amber-50/20"><input type="number" step="any" oninput="calcRow09P(this)" class="w-full p-2 border-transparent focus:border-amber-300 outline-none rounded text-right font-bold text-amber-700 min-w-[120px]" data-col="c_rp" value="${d.c_rp}" placeholder="Rp"></td>
        <td class="p-1 border-r bg-amber-50/50"><input type="number" readonly class="w-full p-2 border-transparent outline-none rounded text-center font-bold text-amber-900 bg-transparent cursor-not-allowed min-w-[80px]" data-col="d_persen" value="${d.d_persen}" placeholder="%"></td>
        <td class="p-1 border-r-4 border-slate-300 bg-amber-50/20"><input type="number" step="any" oninput="calcRow09P(this)" class="w-full p-2 border-transparent focus:border-amber-300 outline-none rounded text-center font-bold text-amber-700 min-w-[100px]" data-col="e_fisik" value="${d.e_fisik}" placeholder="%"></td>
        
        <td class="p-1 border-r bg-blue-50/50"><input type="number" readonly class="w-full p-2 border-transparent outline-none rounded text-center font-black text-blue-700 bg-transparent cursor-not-allowed text-lg min-w-[100px]" data-col="tertimbang" value="${d.tertimbang}" placeholder="-"></td>

        <!-- Keterangan & Aksi -->
        <td class="p-1 border-r"><textarea class="w-full text-xs p-1 border-transparent focus:border-indigo-300 rounded outline-none min-h-[40px] resize-none min-w-[150px]" data-col="ket" placeholder="Ket...">${d.ket}</textarea></td>
        <td class="p-1 text-center bg-white">
            <button onclick="removeTableRow09P(this)" class="bg-red-50 hover:bg-red-100 text-red-500 p-2 rounded transition-colors cursor-pointer" title="Hapus Paket">
                <i data-lucide="x" class="w-4 h-4"></i>
            </button>
        </td>
    `;
    tbody.appendChild(tr);
    calcNo09P();
    if(typeof initIcons === 'function') initIcons();
}

function calcRow09P(inputEl) {
    const tr = inputEl.closest('tr');
    
    // Input
    const a_rp = parseFloat(tr.querySelector('[data-col="a_rp"]').value) || 0;
    const b_bobot = parseFloat(tr.querySelector('[data-col="b_bobot"]').value) || 0;
    const c_rp = parseFloat(tr.querySelector('[data-col="c_rp"]').value) || 0;
    const e_fisik = parseFloat(tr.querySelector('[data-col="e_fisik"]').value) || 0;
    
    // Output
    const d_persen_el = tr.querySelector('[data-col="d_persen"]');
    const tertimbang_el = tr.querySelector('[data-col="tertimbang"]');

    // Kalkulasi D: (c / a) * 100%
    let d_persen = 0;
    if (a_rp > 0) {
        d_persen = (c_rp / a_rp) * 100;
        d_persen_el.value = parseFloat(d_persen.toFixed(2));
    } else {
        d_persen_el.value = "";
    }
    
    // Kalkulasi Progres Tertimbang
    if (b_bobot > 0 && d_persen > 0 && e_fisik > 0) {
        let tertimbang = (b_bobot / 100) * (d_persen / 100) * e_fisik;
        tertimbang_el.value = parseFloat(tertimbang.toFixed(2));
    } else {
        tertimbang_el.value = "";
    }
}

function removeTableRow09P(btn) {
    btn.closest('tr').remove();
    calcNo09P();
    const tbody = document.getElementById('p9-tbody');
    if (tbody.querySelectorAll('.p9-row').length === 0) addTableRow09P();
}

function calcNo09P() {
    document.querySelectorAll('#p9-tbody .p9-row').forEach((row, idx) => row.querySelector('.row-no').innerText = idx + 1);
}

async function saveForm09P() {
    const bulan = document.getElementById('p9-bulan').value;
    const tahun = document.getElementById('p9-tahun').value;
    const dinas = document.getElementById('p9-dinas').value.trim();
    
    // Verifikasi Keamanan Simpan
    if (!bulan || !tahun) return showFormAlert('p9', "Pilih Bulan dan Tahun Laporan terlebih dahulu!", "error");

    const rows = document.querySelectorAll('#p9-tbody .p9-row');
    let rowData = [];
    const cols = ['paket','a_rp','b_bobot','c_rp','d_persen','e_fisik','tertimbang','ket'];
    
    let hasData = false;
    rows.forEach(row => {
        let rObj = {};
        let isRowEmpty = true;
        cols.forEach(c => {
            const el = row.querySelector(`[data-col="${c}"]`);
            rObj[c] = el ? el.value.trim() : "";
            if (c !== 'paket' && rObj[c] !== "") isRowEmpty = false;
        });
        if(!isRowEmpty || rObj['paket'].trim() !== "") { 
            rowData.push(rObj); hasData = true; 
        }
    });

    if (!hasData) return showFormAlert('p9', "Tabel masih kosong! Harap isi minimal 1 paket pekerjaan.", "error");

    const savedData = getLS('09P_' + currentDI) || {};
    const key = `${tahun}_${bulan}`;
    savedData[key] = withReportTimestamps({ bulan, tahun, dinas, rows: rowData }, savedData[key]);
    setLS('09P_' + currentDI, savedData);
    let onlineSaved = false;
    try {
        onlineSaved = await saveLaporanOnline('09-P', savedData[key], {
            kategori: 'pemeliharaan',
            key_laporan: key,
            tahun,
            periode: `${tahun}-${bulan}`,
            targetAllDI: true
        });
    } catch (err) { console.warn('Gagal simpan Supabase 09-P:', err); }

    renderSavedList09P();
    
    // ðŸ‘‡ FITUR SAPU BERSIH INSTAN ðŸ‘‡
    const nmBulan = document.getElementById('p9-bulan').options[document.getElementById('p9-bulan').selectedIndex].text;
    resetInputs09P(true);
    showPemeliharaanSaveAlert('p9', `Realisasi Kontraktual Bulan <strong>${nmBulan} ${tahun}</strong> berhasil disimpan${onlineSaved ? ' ke Supabase' : ' lokal'}.`, onlineSaved ? "success" : "warning", tahun);
    setTimeout(() => hideFormAlert('p9'), 4000);
}

function renderSavedList09P() {
    const savedData = getLS('09P_' + currentDI) || {};
    const container = document.getElementById('p9-saved-list');
    if(!container) return;
    
    // Urutkan dari yang terbaru (Tahun_Bulan) Descending
    const allKeys = Object.keys(savedData).sort((a,b) => b.localeCompare(a));
    const keys = filterPemeliharaanSavedKeys(allKeys, savedData);

    if (allKeys.length === 0) {
        container.innerHTML = `<p class="col-span-full text-center text-slate-400 italic py-8 border border-dashed rounded-xl bg-slate-50">Belum ada Laporan Realisasi (09-P) yang tersimpan.</p>`;
        return;
    }
    if (keys.length === 0) return renderNoActivePemeliharaanMessage(container, 'Laporan Realisasi 09-P');

    container.innerHTML = keys.map(k => {
        const d = savedData[k];
        const rowCount = d.rows ? d.rows.length : 0;
        const namaBulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"][parseInt(d.bulan)-1];

        return `<div class="bg-white p-4 border rounded-xl shadow-sm hover:shadow-md transition-all">
            <div class="flex items-start gap-3 mb-4">
                <div class="bg-emerald-100 text-emerald-600 p-2.5 rounded-lg shrink-0"><i data-lucide="folder-check" class="w-5 h-5"></i></div>
                <div class="w-full overflow-hidden">
                    <h4 class="font-black text-slate-800 text-sm truncate uppercase">BULAN ${namaBulan} ${d.tahun}</h4>
                    <p class="text-[10px] text-slate-500 font-medium mt-0.5 truncate">${d.dinas || "Instansi Tidak Diisi"}</p>
                    <p class="text-[10px] text-emerald-600 font-bold mt-1 bg-slate-100 inline-block px-2 py-0.5 rounded">${rowCount} Paket Pekerjaan</p>
                </div>
            </div>
            <button onclick="edit09P('${k}')" class="w-full bg-emerald-50 hover:bg-emerald-100 text-emerald-700 py-2 rounded-lg font-bold text-xs transition-colors cursor-pointer">Lihat Rincian Kontrak</button>
        </div>`;
    }).join('');
    
    if(typeof initIcons === 'function') initIcons();
}

function edit09P(key) {
    const data = (getLS('09P_' + currentDI) || {})[key];
    if(!data) return;
    
    const selBulan = document.getElementById('p9-bulan');
    const selTahun = document.getElementById('p9-tahun');
    
    if(selBulan) selBulan.value = data.bulan;
    if(selTahun) selTahun.value = data.tahun;
    
    onChangeFilter09P(); 
    document.getElementById('view-blanko-pemeliharaan').scrollIntoView({behavior: 'smooth'});
}

function resetInputs09P(hideAlert = true) {
    const selBulan = document.getElementById('p9-bulan');
    if(selBulan) selBulan.value = "";
    
    const selTahun = document.getElementById('p9-tahun');
    if(selTahun) selTahun.value = "";
    
    const dinasInput = document.getElementById('p9-dinas');
    if(dinasInput) dinasInput.value = "";
    
    const tbody = document.getElementById('p9-tbody');
    if(tbody) {
        tbody.innerHTML = '<tr><td colspan="9" class="p-12 text-center text-slate-400 italic">Silakan Pilih <strong>Bulan</strong> dan <strong>Tahun</strong> Laporan terlebih dahulu.</td></tr>';
    }
    
    const btnAdd = document.getElementById('p9-btn-add');
    if(btnAdd) { btnAdd.classList.add('hidden'); btnAdd.classList.remove('flex'); }
    
    if(hideAlert) hideFormAlert('p9');
}

// ====================================================================
// --- SISTEM LOGIKA FORMULIR 10-P (REALISASI PEMELIHARAAN TAHUNAN) ---
// ====================================================================

function render10P() {
    hideFormAlert('p10');
    
    // 1. Kosongkan Input Instansi
    const dinasInput = document.getElementById('p10-dinas');
    if (dinasInput) dinasInput.value = "";

    // 2. Setup Dropdown Tahun Dinamis (Netral)
    const selTahun = document.getElementById('p10-tahun');
    if (selTahun) {
        const thnSekarang = new Date().getFullYear();
        let thnOpts = '<option value="">-- Pilih Tahun Anggaran --</option>';
        for (let i = thnSekarang - 2; i <= thnSekarang + 2; i++) {
            thnOpts += `<option value="${i}">${i}</option>`;
        }
        selTahun.innerHTML = thnOpts;
    }

    // Eksekusi Render Awal
    if (!selTahun?.value) {
        resetInputs10P(false);
    } else {
        onChangeFilter10P();
    }
    
    renderSavedList10P();
    syncPemeliharaanFormFromSupabase('10P', '10-P', renderSavedList10P);
}

function onChangeFilter10P() {
    hideFormAlert('p10');
    const tahun = document.getElementById('p10-tahun')?.value;
    const tbody = document.getElementById('p10-tbody');
    const btnAdd = document.getElementById('p10-btn-add');
    
    if (!tbody || !btnAdd) return;

    if (!tahun) {
        tbody.innerHTML = '<tr><td colspan="13" class="p-12 text-slate-400 italic text-center">Silakan Pilih <strong>Tahun Anggaran</strong> terlebih dahulu.</td></tr>';
        btnAdd.classList.add('hidden'); btnAdd.classList.remove('flex');
        return;
    }

    btnAdd.classList.remove('hidden'); btnAdd.classList.add('flex');

    const savedData = (getLS('10P_' + currentDI) || {})[tahun];

    if (savedData && savedData.rows && savedData.rows.length > 0) {
        document.getElementById('p10-dinas').value = savedData.dinas || "";
        tbody.innerHTML = ''; 
        savedData.rows.forEach(r => addTableRow10P(r));
        showFormAlert('p10', `Menampilkan arsip Laporan Tahunan Final <strong>Tahun Anggaran ${tahun}</strong>.`, "info");
    } else {
        tbody.innerHTML = '';
        addTableRow10P(); 
    }
}

function addTableRow10P(data = null) {
    const tbody = document.getElementById('p10-tbody');
    if (!tbody) return;

    const tr = document.createElement('tr');
    tr.className = "border-b hover:bg-slate-50 transition-colors p10-row bg-white";
    
    const d = data || { 
        paket:'', jaringan:'', t_fisik:'', t_rp:'', u_surat:'', u_tgl_m:'', u_tgl_s:'', r_fisik:'', r_rp:'', spj:'', ket:'' 
    };

    tr.innerHTML = `
        <!-- Membekukan Kolom No & Paket Pekerjaan -->
        <td class="p-2 border-r text-center font-bold text-slate-600 bg-slate-50 row-no" style="left: 0; position: sticky; z-index: 10;">1</td>
        <td class="p-1 border-r bg-white shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]" style="left: 35px; position: sticky; z-index: 10;">
            <textarea class="w-full text-xs p-2 border-transparent focus:border-indigo-300 rounded outline-none min-h-[50px] resize-none font-bold text-indigo-900" data-col="paket" placeholder="Nama Paket...">${d.paket}</textarea>
        </td>
        
        <!-- Kolom Normal Bergerak -->
        <td class="p-1 border-r-4 border-slate-300"><textarea class="w-full text-xs p-2 border-transparent focus:border-slate-300 rounded outline-none min-h-[50px] resize-none font-medium text-slate-800" data-col="jaringan" placeholder="Jaringan / Lokasi...">${d.jaringan}</textarea></td>
        
        <!-- Target -->
        <td class="p-1 border-r bg-indigo-50/20"><input type="number" step="any" class="w-full p-2 border-transparent focus:border-indigo-300 outline-none rounded text-center text-indigo-700 min-w-[80px]" data-col="t_fisik" value="${d.t_fisik}" placeholder="Vol"></td>
        <td class="p-1 border-r-4 border-slate-300 bg-indigo-50/20"><input type="number" step="any" class="w-full p-2 border-transparent focus:border-indigo-300 outline-none rounded text-right font-bold text-indigo-700 min-w-[100px]" data-col="t_rp" value="${d.t_rp}" placeholder="Rp"></td>
        
        <!-- Realisasi -->
        <td class="p-1 border-r bg-emerald-50/20"><textarea class="w-full text-xs p-2 border-transparent focus:border-emerald-300 rounded outline-none min-h-[50px] resize-none min-w-[140px]" data-col="u_surat" placeholder="No & Tgl Surat...">${d.u_surat}</textarea></td>
        <td class="p-1 border-r bg-emerald-50/20"><input type="date" class="w-full p-2 border-transparent outline-none cursor-pointer text-[10px] min-w-[100px]" data-col="u_tgl_m" value="${d.u_tgl_m}"></td>
        <td class="p-1 border-r bg-emerald-50/20"><input type="date" class="w-full p-2 border-transparent outline-none cursor-pointer text-[10px] min-w-[100px]" data-col="u_tgl_s" value="${d.u_tgl_s}"></td>
        <td class="p-1 border-r bg-emerald-50/50"><input type="number" step="any" class="w-full p-2 border-transparent focus:border-emerald-400 outline-none rounded text-center font-bold text-emerald-800 min-w-[80px]" data-col="r_fisik" value="${d.r_fisik}" placeholder="Vol"></td>
        <td class="p-1 border-r-4 border-slate-300 bg-emerald-50/50"><input type="number" step="any" class="w-full p-2 border-transparent focus:border-emerald-400 outline-none rounded text-right font-bold text-emerald-800 min-w-[100px]" data-col="r_rp" value="${d.r_rp}" placeholder="Rp"></td>
        
        <!-- SPJ, Ket & Aksi -->
        <td class="p-1 border-r bg-amber-50/30"><textarea class="w-full text-xs p-2 border-transparent focus:border-amber-300 rounded min-h-[50px] resize-none min-w-[140px]" data-col="spj" placeholder="Status SPJ...">${d.spj}</textarea></td>
        <td class="p-1 border-r"><textarea class="w-full text-xs p-2 border-transparent focus:border-indigo-300 rounded outline-none min-h-[50px] resize-none min-w-[140px]" data-col="ket" placeholder="Ket...">${d.ket}</textarea></td>
        <td class="p-1 text-center bg-white">
            <button onclick="removeTableRow10P(this)" class="bg-red-50 hover:bg-red-100 text-red-500 p-2 rounded transition-colors cursor-pointer" title="Hapus Baris">
                <i data-lucide="x" class="w-4 h-4"></i>
            </button>
        </td>
    `;
    tbody.appendChild(tr);
    calcNo10P();
    if(typeof initIcons === 'function') initIcons();
}

function removeTableRow10P(btn) {
    btn.closest('tr').remove();
    calcNo10P();
    const tbody = document.getElementById('p10-tbody');
    if (tbody.querySelectorAll('.p10-row').length === 0) addTableRow10P();
}

function calcNo10P() {
    document.querySelectorAll('#p10-tbody .p10-row').forEach((row, idx) => row.querySelector('.row-no').innerText = idx + 1);
}

async function saveForm10P() {
    const tahun = document.getElementById('p10-tahun').value;
    const dinas = document.getElementById('p10-dinas').value.trim();
    
    if (!tahun) return showFormAlert('p10', "Pilih Tahun Anggaran terlebih dahulu!", "error");

    const rows = document.querySelectorAll('#p10-tbody .p10-row');
    let rowData = [];
    const cols = ['paket','jaringan','t_fisik','t_rp','u_surat','u_tgl_m','u_tgl_s','r_fisik','r_rp','spj','ket'];
    
    let hasData = false;
    rows.forEach(row => {
        let rObj = {};
        let isRowEmpty = true;
        cols.forEach(c => {
            const el = row.querySelector(`[data-col="${c}"]`);
            rObj[c] = el ? el.value.trim() : "";
            if (c !== 'paket' && rObj[c] !== "") isRowEmpty = false;
        });
        if(!isRowEmpty || rObj['paket'].trim() !== "") { 
            rowData.push(rObj); hasData = true; 
        }
    });

    if (!hasData) return showFormAlert('p10', "Tabel masih kosong! Harap isi minimal 1 rincian realisasi.", "error");

    const savedData = getLS('10P_' + currentDI) || {};
    savedData[tahun] = withReportTimestamps({ tahun, dinas, rows: rowData }, savedData[tahun]);
    setLS('10P_' + currentDI, savedData);
    let onlineSaved = false;
    try {
        onlineSaved = await saveLaporanOnline('10-P', savedData[tahun], {
            kategori: 'pemeliharaan',
            key_laporan: tahun,
            tahun,
            periode: tahun,
            targetAllDI: true
        });
    } catch (err) { console.warn('Gagal simpan Supabase 10-P:', err); }

    renderSavedList10P();
    
    // ðŸ‘‡ FITUR SAPU BERSIH INSTAN ðŸ‘‡
    resetInputs10P(true);
    showPemeliharaanSaveAlert('p10', `Laporan Tahunan Final untuk Tahun Anggaran <strong>${tahun}</strong> berhasil disimpan${onlineSaved ? ' ke Supabase' : ' lokal'}.`, onlineSaved ? "success" : "warning", tahun);
    setTimeout(() => hideFormAlert('p10'), 4000);
}

function renderSavedList10P() {
    const savedData = getLS('10P_' + currentDI) || {};
    const container = document.getElementById('p10-saved-list');
    if(!container) return;
    
    // Sort descending (terbaru di atas)
    const allKeys = Object.keys(savedData).sort((a,b) => parseInt(b) - parseInt(a));
    const keys = filterPemeliharaanSavedKeys(allKeys, savedData);

    if (allKeys.length === 0) {
        container.innerHTML = `<p class="col-span-full text-center text-slate-400 italic py-8 border border-dashed rounded-xl bg-slate-50">Belum ada Laporan Tahunan (10-P) yang tersimpan.</p>`;
        return;
    }
    if (keys.length === 0) return renderNoActivePemeliharaanMessage(container, 'Laporan Tahunan 10-P');

    container.innerHTML = keys.map(k => {
        const d = savedData[k];
        const rowCount = d.rows ? d.rows.length : 0;

        // KODE REVISI: Menghapus pita hijau (absolute) dan menyamakan class border utamanya
        return `<div class="bg-white p-4 border rounded-xl shadow-sm hover:shadow-md transition-all">
            <div class="flex items-start gap-3 mb-4">
                <div class="bg-emerald-100 text-emerald-600 p-2.5 rounded-lg shrink-0"><i data-lucide="award" class="w-5 h-5"></i></div>
                <div class="w-full overflow-hidden">
                    <h4 class="font-black text-slate-800 text-sm truncate uppercase">TAHUN ANGGARAN ${k}</h4>
                    <p class="text-[10px] text-slate-500 font-medium mt-0.5 truncate">${d.dinas || "Instansi Tidak Diisi"}</p>
                    <p class="text-[10px] text-emerald-600 font-bold mt-1 bg-slate-100 inline-block px-2 py-0.5 rounded">${rowCount} Realisasi Pekerjaan Selesai</p>
                </div>
            </div>
            <button onclick="edit10P('${k}')" class="w-full bg-emerald-50 hover:bg-emerald-100 text-emerald-700 py-2 rounded-lg font-bold text-xs transition-colors cursor-pointer">Buka Dokumen Final</button>
        </div>`;
    }).join('');
    
    if(typeof initIcons === 'function') initIcons();
}

function edit10P(key) {
    const data = (getLS('10P_' + currentDI) || {})[key];
    if(!data) return;
    
    const selTahun = document.getElementById('p10-tahun');
    if(selTahun) selTahun.value = key;
    
    onChangeFilter10P(); 
    document.getElementById('view-blanko-pemeliharaan').scrollIntoView({behavior: 'smooth'});
}

function resetInputs10P(hideAlert = true) {
    const selTahun = document.getElementById('p10-tahun');
    if(selTahun) selTahun.value = "";
    
    const dinasInput = document.getElementById('p10-dinas');
    if(dinasInput) dinasInput.value = "";
    
    const tbody = document.getElementById('p10-tbody');
    if(tbody) {
        tbody.innerHTML = '<tr><td colspan="13" class="p-12 text-center text-slate-400 italic">Silakan Pilih <strong>Tahun Anggaran</strong> terlebih dahulu.</td></tr>';
    }
    
    const btnAdd = document.getElementById('p10-btn-add');
    if(btnAdd) { btnAdd.classList.add('hidden'); btnAdd.classList.remove('flex'); }
    
    if(hideAlert) hideFormAlert('p10');
}

// =========================================================================================
// ðŸš€ MODUL PUSAT KENDALI (COMMAND CENTER) - OPERASI & PEMELIHARAAN (VERSI UPGRADE 2026)
// =========================================================================================

// -----------------------------------------------------------------------------------------
// BAGIAN 1: MESIN FILTER & EKSTRAKTOR KUNCI
// -----------------------------------------------------------------------------------------

/**
 * Mengisi Dropdown Filter Periode untuk Matriks Operasi (Berdasarkan 01-O)
 */
function populateFilterMatriks() {
    const db01 = getLS('01O_' + currentDI) || {};
    const sel = document.getElementById('filter-matriks-periode');
    if (!sel) return;

    let currentVal = sel.value;
    let uniquePeriods = new Set();

    Object.values(db01).forEach(data => {
        if (data.periode) uniquePeriods.add(data.periode);
    });

    let opts = '<option value="ALL">Semua Periode (Total Keseluruhan)</option>';
    Array.from(uniquePeriods).sort().reverse().forEach(p => {
        opts += `<option value="${p}">Musim Tanam: ${p}</option>`;
    });

    sel.innerHTML = opts;
    if (Array.from(sel.options).some(o => o.value === currentVal)) sel.value = currentVal;
}

/**
 * Mengisi Dropdown Filter Waktu untuk Matriks Pemeliharaan (Berdasarkan Angka Tahun)
 */
function populateFilterMatriksPemeliharaan() {
    const sel = document.getElementById('filter-matriks-pemeliharaan');
    if (!sel) return;

    let currentVal = sel.value;
    let uniqueYears = new Set();
    const forms = ['01P','02P','02aP','03P','04P','05P','06P','07P','08P','09P','10P'];

    forms.forEach(f => {
        const db = getLS(`${f}_${currentDI}`) || {};
        Object.keys(db).forEach(k => {
            const matchedYears = k.match(/\b(20\d{2})\b/g);
            if (matchedYears) matchedYears.forEach(y => uniqueYears.add(y));
        });
    });

    let opts = '<option value="ALL">Semua Tahun Keseluruhan</option>';
    Array.from(uniqueYears).sort().reverse().forEach(y => {
        opts += `<option value="${y}">Tahun Laporan: ${y}</option>`;
    });

    sel.innerHTML = opts;
    if (Array.from(sel.options).some(o => o.value === currentVal)) sel.value = currentVal;
}

/**
 * Mencari semua arsip yang cocok (Logika Cerdas 01-P s/d 03-P)
 */
function dapatkanKunciArsip(formId, entityName, isGlobal = false) {
    const db = getLS(formId + '_' + currentDI) || {};
    let keys = Object.keys(db);
    if (keys.length === 0) return [];

    const filterId = formId.includes('P') ? 'filter-matriks-pemeliharaan' : 'filter-matriks-periode';
    const filterVal = document.getElementById(filterId)?.value || 'ALL';

    // 1. FILTER ENTITAS (Bendung/Juru)
    if (!isGlobal && entityName) {
        keys = keys.filter(k => {
            // Khusus 01-P, kita cari berdasarkan Nama Juru yang ada di akhir Key
            if (formId === '01P') return k.endsWith('_' + entityName);
            // Form lainnya masih berbasis Bendung
            return k.toLowerCase().includes(entityName.toLowerCase());
        });
    }

    // 2. FILTER WAKTU (Tahun/Periode)
    if (filterVal !== 'ALL') {
        keys = keys.filter(k => k.includes(filterVal));
    }

    return keys.sort().reverse();
}

// -----------------------------------------------------------------------------------------
// BAGIAN 2: PELUKIS MATRIKS (UI TABEL)
// -----------------------------------------------------------------------------------------

function renderSelMatriks(kategori, formId, entityName, isGlobal = false) {
    const keys = dapatkanKunciArsip(formId, entityName, isGlobal);
    const count = keys.length;

    if (count === 0) {
        return `<td class="p-2 border-r border-slate-100 text-center align-middle">
                    <span class="text-slate-300 text-xs font-bold">-</span>
                </td>`;
    }

    let colorClass = kategori === 'pemeliharaan' 
        ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" 
        : "bg-indigo-100 text-indigo-700 hover:bg-indigo-200";

    return `<td class="p-2 border-r border-slate-100 text-center align-middle">
        <button onclick="bukaModalArsip('${kategori}', '${formId}', '${entityName}', ${isGlobal})" class="w-full px-2 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wide transition-all shadow-sm ${colorClass}">
            ${count} Arsip
        </button>
    </td>`;
}

// ====================================================================
// --- SISTEM REKAPITULASI OPERASI (GAYA TIMELINE & LIST) ---
// ====================================================================

function getHalfMonthlyPeriodsFromMtText(mtString) {
    if (!mtString || !String(mtString).includes('s/d')) return [];
    const parts = String(mtString).split('s/d').map(s => s.trim().toLowerCase());
    const monthsIndo = ['januari','februari','maret','april','mei','juni','juli','agustus','september','oktober','november','desember'];
    const monthNamesCap = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
    const parseDate = (str) => {
        const p = str.split(' ');
        if (p.length < 2) return null;
        const m = monthsIndo.indexOf(p[0]);
        const y = parseInt(p[1], 10);
        if (m === -1 || isNaN(y)) return null;
        return { abs: y * 12 + m };
    };

    const start = parseDate(parts[0]);
    const end = parseDate(parts[1]);
    if (!start || !end || start.abs > end.abs) return [];

    const periods = [];
    for (let abs = start.abs; abs <= end.abs; abs++) {
        const y = Math.floor(abs / 12);
        const m = abs % 12;
        const mName = monthNamesCap[m];
        const lastDay = new Date(y, m + 1, 0).getDate();
        periods.push(`1-15 ${mName} ${y}`);
        periods.push(`16-${lastDay} ${mName} ${y}`);
    }
    return periods;
}

function getKabupatenListForRekapOperasi() {
    const kabSet = new Set();
    getAllDI().forEach(di => {
        const pData = getProfilData(di);
        if (pData?.kabupaten && String(pData.kabupaten).trim()) kabSet.add(String(pData.kabupaten).trim());
    });
    const currentKab = getProfilData(currentDI)?.kabupaten;
    if (currentKab && String(currentKab).trim()) kabSet.add(String(currentKab).trim());
    return Array.from(kabSet);
}

function buildKelengkapanOperasi(periode, data) {
    const o1Reports = Object.entries(data.o1Data || {}).filter(([, report]) => report?.periode === periode);
    const bendungs = o1Reports.map(([bendung]) => bendung);
    const profilBendungs = (getProfilData(currentDI)?.bendungs || []).filter(b => String(b.nama || '').trim());
    const mtKeys = ['MT1', 'MT2', 'MT3'].filter(mt => {
        const prop = mt.toLowerCase();
        return o1Reports.some(([, report]) => report?.[prop]);
    });

    const required = {
        '01-O': profilBendungs.length || bendungs.length,
        '02-O': mtKeys.length,
        '03-O': 1,
        '04-O': 0,
        '05-O': 0,
        '06-O': 0,
        '07-O': 0,
        '08-O': 0,
        '09-O': 0,
        '10-O': 1,
        '11-O': getKabupatenListForRekapOperasi().length * mtKeys.length,
        '12-O': 1
    };

    const requiredKeys = {
        '04-O': new Set(),
        '05-O': new Set(),
        '06-O': new Set(),
        '07-O': new Set(),
        '08-O': new Set(),
        '09-O': new Set()
    };

    o1Reports.forEach(([bendung, report]) => {
        mtKeys.forEach(mt => {
            const mtText = report[mt.toLowerCase()];
            if (!mtText) return;
            const periods = getHalfMonthlyPeriodsFromMtText(mtText);
            periods.forEach(periodAir => {
                requiredKeys['04-O'].add(`${bendung}_${mt}_${periodAir}`);
                requiredKeys['05-O'].add(`${mt}_${periodAir}`);
                requiredKeys['06-O'].add(`${bendung}_${periodAir}`);
                requiredKeys['07-O'].add(`${bendung}_${mt}_${periodAir}`);
                requiredKeys['08-O'].add(`${bendung}_${periodAir}`);
                requiredKeys['09-O'].add(`${bendung}_${periodAir}`);
            });
        });
    });

    ['04-O', '05-O', '06-O', '07-O', '08-O', '09-O'].forEach(blanko => {
        required[blanko] = requiredKeys[blanko].size;
    });

    const hasData = (obj, key) => !!(obj && Object.prototype.hasOwnProperty.call(obj, key));
    const actual = {
        '01-O': o1Reports.length,
        '02-O': mtKeys.filter(mt => hasData(data.o2Data, mt)).length,
        '03-O': hasData(data.o3Data, periode) ? 1 : 0,
        '04-O': Array.from(requiredKeys['04-O']).filter(key => hasData(data.o4Data, key)).length,
        '05-O': Array.from(requiredKeys['05-O']).filter(key => hasData(data.o5Data, key)).length,
        '06-O': Array.from(requiredKeys['06-O']).filter(key => hasData(data.o6Data, key)).length,
        '07-O': Array.from(requiredKeys['07-O']).filter(key => hasData(data.o7Data, key)).length,
        '08-O': Array.from(requiredKeys['08-O']).filter(key => hasData(data.o8Data, key)).length,
        '09-O': Array.from(requiredKeys['09-O']).filter(key => hasData(data.o9Data, key)).length,
        '10-O': hasData(data.o10Data, periode) ? 1 : 0,
        '11-O': getKabupatenListForRekapOperasi().reduce((sum, kab) => {
            return sum + mtKeys.filter(mt => hasData(data.o11Data, `${kab}_${mt}`)).length;
        }, 0),
        '12-O': hasData(data.o12Data, periode) ? 1 : 0
    };

    const totalWajib = Object.values(required).reduce((sum, val) => sum + val, 0);
    const totalAda = Object.keys(required).reduce((sum, blanko) => sum + Math.min(actual[blanko] || 0, required[blanko] || 0), 0);

    return {
        actual,
        required,
        requiredKeys: Object.fromEntries(Object.entries(requiredKeys).map(([blanko, set]) => [blanko, Array.from(set)])),
        totalAda,
        totalWajib,
        lengkap: totalWajib > 0 && totalAda >= totalWajib,
        mtCount: mtKeys.length,
        mtKeys,
        bendungs,
        bendungCount: bendungs.length,
        periodeAirCount: requiredKeys['05-O'].size
    };
}

function getOperasiDataBundle() {
    return {
        o1Data: getLS('01O_' + currentDI) || {},
        o2Data: getLS('02O_' + currentDI) || {},
        o3Data: getLS('03O_' + currentDI) || {},
        o4Data: getLS('04O_' + currentDI) || {},
        o5Data: getLS('05O_' + currentDI) || {},
        o6Data: getLS('06O_' + currentDI) || {},
        o7Data: getLS('07O_' + currentDI) || {},
        o8Data: getLS('08O_' + currentDI) || {},
        o9Data: getLS('09O_' + currentDI) || {},
        o10Data: getLS('10O_' + currentDI) || {},
        o11Data: getLS('11O_GLOBAL') || {},
        o12Data: getLS('12O_GLOBAL') || {}
    };
}

function getLatestOperasiPeriodFrom01O() {
    const o1Data = getLS('01O_' + currentDI) || {};
    const finalized = getFinalizedOperasiPeriods();
    const periods = Array.from(new Set(Object.values(o1Data)
        .map(report => report?.periode)
        .filter(period => period && !finalized.includes(period))));
    return periods.sort().reverse()[0] || '';
}

function getActiveOperasiPeriod() {
    const storageKey = 'activeOperasiPeriod_' + currentDI;
    const stored = localStorage.getItem(storageKey) || '';
    const finalized = getFinalizedOperasiPeriods();
    const o1Data = getLS('01O_' + currentDI) || {};
    const exists = Object.values(o1Data).some(report => report?.periode === stored);
    if (stored && exists && !finalized.includes(stored)) return stored;
    const latest = getLatestOperasiPeriodFrom01O();
    if (latest) localStorage.setItem(storageKey, latest);
    else localStorage.removeItem(storageKey);
    return latest;
}

function setActiveOperasiPeriod(periode) {
    if (!periode) return;
    localStorage.setItem('activeOperasiPeriod_' + currentDI, periode);
}

function getFinalizedOperasiPeriods() {
    try {
        return JSON.parse(localStorage.getItem('finalizedOperasiPeriods_' + currentDI) || '[]');
    } catch (err) {
        return [];
    }
}

function markFinalizedOperasiPeriod(periode) {
    if (!periode) return;
    const key = 'finalizedOperasiPeriods_' + currentDI;
    const periods = getFinalizedOperasiPeriods();
    if (!periods.includes(periode)) periods.push(periode);
    localStorage.setItem(key, JSON.stringify(periods));
    if (localStorage.getItem('activeOperasiPeriod_' + currentDI) === periode) {
        localStorage.removeItem('activeOperasiPeriod_' + currentDI);
    }
}

function unmarkFinalizedOperasiPeriod(periode) {
    if (!periode) return;
    const key = 'finalizedOperasiPeriods_' + currentDI;
    const periods = getFinalizedOperasiPeriods().filter(item => item !== periode);
    localStorage.setItem(key, JSON.stringify(periods));
}

function isArchivedOperasiPeriod(periode) {
    if (!periode) return false;
    const active = getActiveOperasiPeriod();
    return getFinalizedOperasiPeriods().includes(periode) || (!!active && periode !== active);
}

function getOperationArchiveNotice(periode) {
    if (!isArchivedOperasiPeriod(periode)) return '';
    return `<br><span class="font-semibold">Laporan periode ${periode} berhasil diperbarui. Arsip tetap berada di Rekap Operasi dan tidak ditampilkan di daftar periode aktif.</span>`;
}

function showOperationSaveAlert(formId, message, type, periode) {
    showFormAlert(formId, message + getOperationArchiveNotice(periode), type);
}

function extractPemeliharaanYear(value, fallbackKey = '') {
    const candidates = [
        value?.tahun,
        value?.tahunAnggaran,
        value?.bulan,
        value?.periode,
        value?.tgl,
        value?.tanggal,
        value?.tglMulai,
        value?.tglSelesai,
        value?.createdAt,
        value?.updatedAt,
        value?.timestamp,
        fallbackKey
    ];
    for (const item of candidates) {
        const match = String(item || '').match(/\b(19\d{2}|20\d{2})\b/);
        if (match) return match[1];
    }
    return '';
}

function getPemeliharaanStorageKeys() {
    return ['01P_', '02P_', '02aP_', '03P_', '04P_', '05P_', '06P_', '07P_', '08P_', '09P_', '10P_']
        .map(prefix => prefix + currentDI);
}

function getActivePemeliharaanYear() {
    const years = new Set();
    getPemeliharaanStorageKeys().forEach(storageKey => {
        const savedData = getLS(storageKey) || {};
        Object.entries(savedData).forEach(([key, value]) => {
            const year = extractPemeliharaanYear(value, key);
            if (year) years.add(year);
        });
    });
    return Array.from(years).sort().reverse()[0] || '';
}

function filterPemeliharaanSavedKeys(keys, savedData = {}) {
    const activeYear = getActivePemeliharaanYear();
    if (!activeYear) return keys;
    return keys.filter(key => extractPemeliharaanYear(savedData[key], key) === activeYear);
}

function renderNoActivePemeliharaanMessage(container, label) {
    const activeYear = getActivePemeliharaanYear();
    container.innerHTML = `<p class="col-span-full text-center text-slate-400 italic py-8 border border-dashed rounded-xl bg-slate-50">Belum ada ${label} untuk tahun aktif ${activeYear || 'saat ini'}.</p>`;
}

function isArchivedPemeliharaanYear(year) {
    const activeYear = getActivePemeliharaanYear();
    return !!(year && activeYear && String(year) !== String(activeYear));
}

function getPemeliharaanArchiveNotice(year) {
    if (!isArchivedPemeliharaanYear(year)) return '';
    return `<br><span class="font-semibold">Laporan tahun ${year} berhasil diperbarui. Arsip tetap berada di Rekap Pemeliharaan dan tidak ditampilkan di daftar tahun aktif.</span>`;
}

function showPemeliharaanSaveAlert(formId, message, type, year) {
    showFormAlert(formId, message + getPemeliharaanArchiveNotice(year), type);
}

function findOperasiPeriodByMtAndBendung(mt = '', bendung = '') {
    const o1Data = getLS('01O_' + currentDI) || {};
    const mtProp = String(mt).toLowerCase();
    const direct = bendung && o1Data[bendung]?.[mtProp] ? o1Data[bendung] : null;
    if (direct?.periode) return direct.periode;
    const match = Object.values(o1Data).find(report => report?.[mtProp]);
    return match?.periode || getActiveOperasiPeriod() || '';
}

function findOperasiPeriodByBendungAndPeriodeAir(bendung = '', periodeAir = '') {
    const o1Data = getLS('01O_' + currentDI) || {};
    const candidates = bendung && o1Data[bendung] ? [o1Data[bendung]] : Object.values(o1Data);
    for (const report of candidates) {
        for (const mt of ['MT1', 'MT2', 'MT3']) {
            const mtText = report?.[mt.toLowerCase()];
            if (!mtText) continue;
            if (getHalfMonthlyPeriodsFromMtText(mtText).includes(periodeAir)) return report.periode || '';
        }
    }
    return getActiveOperasiPeriod() || '';
}

function getKelengkapanOperasiForPeriod(periode) {
    if (!periode) return null;
    return buildKelengkapanOperasi(periode, getOperasiDataBundle());
}

function getMissingKelengkapanOperasiLabels(kelengkapan) {
    if (!kelengkapan) return [];
    return Object.keys(kelengkapan.required || {})
        .filter(blanko => (kelengkapan.required[blanko] || 0) > (kelengkapan.actual[blanko] || 0))
        .map(blanko => `${blanko}: ${kelengkapan.actual[blanko] || 0}/${kelengkapan.required[blanko] || 0}`);
}

function getNewOperasiPeriodConfirmKey(periode) {
    return `confirmedNewOperasiPeriod_${currentDI}_${periode}`;
}

async function confirmNewOperasiPeriodIfNeeded(periodeBaru) {
    periodeBaru = (periodeBaru || '').trim();
    const periodeAktif = getActiveOperasiPeriod();
    if (!periodeBaru || !periodeAktif || periodeBaru === periodeAktif) return true;

    const kelengkapanAktif = getKelengkapanOperasiForPeriod(periodeAktif);
    if (!kelengkapanAktif || kelengkapanAktif.lengkap) return true;

    const confirmKey = getNewOperasiPeriodConfirmKey(periodeBaru);
    if (sessionStorage.getItem(confirmKey) === '1') return true;

    const missing = getMissingKelengkapanOperasiLabels(kelengkapanAktif);
    const lanjut = await showModernConfirm(
        "Periode aktif belum lengkap",
        `Periode ${periodeAktif} masih berstatus Proses / Berjalan. Formulir yang belum lengkap: ${missing.join(', ') || 'belum terdeteksi'}. Tetap lanjut membuat periode baru ${periodeBaru}?`
    );
    if (lanjut) sessionStorage.setItem(confirmKey, '1');
    return lanjut;
}

async function validateNewPeriod01O() {
    const input = document.getElementById('o1-periode');
    if (!input) return;
    const periodeBaru = input.value.trim();
    const periodeAktif = getActiveOperasiPeriod();
    const lanjut = await confirmNewOperasiPeriodIfNeeded(periodeBaru);
    if (!lanjut) {
        input.value = periodeAktif || '';
        showFormAlert('o1', `Pengisian periode baru dibatalkan. Lengkapi terlebih dahulu periode aktif <strong>${periodeAktif}</strong>.`, 'error');
    }
}

function filterOperationSavedKeys(blanko, keys, savedData = {}) {
    const active = getActiveOperasiPeriod();
    if (!active) return [];
    const kelengkapan = getKelengkapanOperasiForPeriod(active);
    if (!kelengkapan) return keys;
    const requiredKeys = kelengkapan.requiredKeys || {};
    const includes = (arr, key) => Array.isArray(arr) && arr.includes(key);

    switch (blanko) {
        case '01-O':
            return keys.filter(key => savedData[key]?.periode === active);
        case '02-O':
            return keys.filter(key => (kelengkapan.mtKeys || []).includes(key) || savedData[key]?.periode === active);
        case '03-O':
        case '10-O':
        case '12-O':
            return keys.filter(key => key === active || savedData[key]?.periode === active);
        case '04-O':
        case '04-O Sub':
            return keys.filter(key => includes(requiredKeys['04-O'], key));
        case '05-O':
            return keys.filter(key => includes(requiredKeys['05-O'], key));
        case '05-O Sub':
            return keys.filter(key => includes(requiredKeys['04-O'], key));
        case '06-O':
            return keys.filter(key => includes(requiredKeys['06-O'], key));
        case '07-O':
            return keys.filter(key => includes(requiredKeys['07-O'], key));
        case '08-O':
            return keys.filter(key => includes(requiredKeys['08-O'], key));
        case '09-O':
            return keys.filter(key => includes(requiredKeys['09-O'], key));
        case '11-O':
            return keys.filter(key => {
                const data = savedData[key] || {};
                if (data.periode && data.periode !== active) return false;
                return (kelengkapan.mtKeys || []).some(mt => key.endsWith('_' + mt) || data.mt === mt);
            });
        default:
            return keys;
    }
}

function renderNoActiveOperasiMessage(container, label) {
    const active = getActiveOperasiPeriod();
    container.innerHTML = `<p class="col-span-full text-center text-slate-400 italic py-8 border border-dashed rounded-xl bg-slate-50">Belum ada ${label} untuk periode aktif ${active || 'saat ini'}.</p>`;
}

function renderAllOperationSavedLists() {
    [
        renderSavedList01O, renderSavedList02O, renderSavedList03O, renderSavedList04O,
        renderSavedList04Oa, renderSavedList05O, renderSavedList05Oa, renderSavedList06O,
        renderSavedList07O, renderSavedList08O, renderSavedList09O, renderSavedList10O,
        renderSavedList11O, renderSavedList12O
    ].forEach(fn => {
        try { if (typeof fn === 'function') fn(); } catch (err) { console.warn('Gagal memperbarui daftar operasi:', err); }
    });
}

function deleteKeysFromStorageObject(storageKey, keysToDelete) {
    const data = getLS(storageKey) || {};
    keysToDelete.forEach(key => delete data[key]);
    setLS(storageKey, data);
}

function clearActiveOperasiPeriodLocalData(periode, kelengkapan) {
    if (!periode || !kelengkapan) return;
    const req = kelengkapan.requiredKeys || {};
    const mtKeys = kelengkapan.mtKeys || [];

    const o1 = getLS('01O_' + currentDI) || {};
    deleteKeysFromStorageObject('01O_' + currentDI, Object.keys(o1).filter(key => o1[key]?.periode === periode));

    const o2 = getLS('02O_' + currentDI) || {};
    deleteKeysFromStorageObject('02O_' + currentDI, Object.keys(o2).filter(key => mtKeys.includes(key) || o2[key]?.periode === periode));

    deleteKeysFromStorageObject('03O_' + currentDI, [periode]);
    deleteKeysFromStorageObject('04O_' + currentDI, req['04-O'] || []);
    deleteKeysFromStorageObject('04Oa_' + currentDI, req['04-O'] || []);
    deleteKeysFromStorageObject('05O_' + currentDI, req['05-O'] || []);
    deleteKeysFromStorageObject('05Oa_' + currentDI, req['04-O'] || []);
    deleteKeysFromStorageObject('06O_' + currentDI, req['06-O'] || []);
    deleteKeysFromStorageObject('07O_' + currentDI, req['07-O'] || []);
    deleteKeysFromStorageObject('08O_' + currentDI, req['08-O'] || []);
    deleteKeysFromStorageObject('09O_' + currentDI, req['09-O'] || []);
    deleteKeysFromStorageObject('10O_' + currentDI, [periode]);

    const o11 = getLS('11O_GLOBAL') || {};
    deleteKeysFromStorageObject('11O_GLOBAL', Object.keys(o11).filter(key => {
        const row = o11[key] || {};
        return row.periode === periode || mtKeys.some(mt => key.endsWith('_' + mt) || row.mt === mt);
    }));
    deleteKeysFromStorageObject('12O_GLOBAL', [periode]);
}

let pendingFinalisasiOperasi = null;

function tutupModalFinalisasiOperasi() {
    const modal = document.getElementById('modal-finalisasi-operasi');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

function finalizeOperasiPeriod() {
    const periode = getActiveOperasiPeriod();
    if (!periode) return showFormAlert('o10', 'Belum ada periode operasi aktif untuk difinalisasi.', 'error');

    const kelengkapan = getKelengkapanOperasiForPeriod(periode);
    const missing = getMissingKelengkapanOperasiLabels(kelengkapan);
    pendingFinalisasiOperasi = { periode, kelengkapan };

    const subtitle = document.getElementById('finalisasi-operasi-subtitle');
    const status = document.getElementById('finalisasi-operasi-status');
    const missingWrap = document.getElementById('finalisasi-operasi-missing-wrap');
    const missingBox = document.getElementById('finalisasi-operasi-missing');
    const btnOk = document.getElementById('btn-finalisasi-operasi-ok');
    const btnLanjut = document.getElementById('btn-finalisasi-operasi-lanjut');
    const modal = document.getElementById('modal-finalisasi-operasi');

    if (subtitle) subtitle.innerText = `Periode Tanam: ${periode}`;
    if (!kelengkapan || !kelengkapan.lengkap) {
        if (status) {
            status.className = 'rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800';
            status.innerHTML = `Laporan periode <strong>${escapeHtml(periode)}</strong> masih berstatus <strong>Proses / Berjalan</strong>. Anda tetap dapat melanjutkan finalisasi jika memang periode ini ingin ditutup.`;
        }
        if (missingWrap) missingWrap.classList.remove('hidden');
        if (missingBox) {
            missingBox.innerHTML = (missing.length ? missing : ['Belum terdeteksi'])
                .map(item => `<span class="rounded-lg bg-white border border-amber-200 text-amber-800 px-3 py-1">${escapeHtml(item)}</span>`)
                .join('');
        }
        if (btnOk) btnOk.classList.add('hidden');
        if (btnLanjut) {
            btnLanjut.classList.remove('hidden');
            btnLanjut.classList.add('flex');
        }
    } else {
        if (status) {
            status.className = 'rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800';
            status.innerHTML = `Laporan periode <strong>${escapeHtml(periode)}</strong> sudah <strong>Lengkap</strong> dan siap difinalisasi.`;
        }
        if (missingWrap) missingWrap.classList.add('hidden');
        if (missingBox) missingBox.innerHTML = '';
        if (btnOk) {
            btnOk.classList.remove('hidden');
            btnOk.classList.add('flex');
        }
        if (btnLanjut) {
            btnLanjut.classList.add('hidden');
            btnLanjut.classList.remove('flex');
        }
    }

    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
    if (typeof initIcons === 'function') initIcons();
}

function eksekusiFinalisasiOperasi(force = false) {
    const data = pendingFinalisasiOperasi;
    if (!data?.periode || !data?.kelengkapan) {
        tutupModalFinalisasiOperasi();
        return showFormAlert('o10', 'Data finalisasi tidak ditemukan. Silakan buka ulang formulir 10-O.', 'error');
    }
    if (!force && !data.kelengkapan.lengkap) {
        return showFormAlert('o10', 'Laporan masih Proses / Berjalan. Gunakan tombol Lanjutkan Finalisasi Laporan jika tetap ingin menutup periode.', 'error');
    }

    clearActiveOperasiPeriodLocalData(data.periode, data.kelengkapan);
    markFinalizedOperasiPeriod(data.periode);
    renderAllOperationSavedLists();
    resetFormAction('01O');
    resetInputs10O(false);
    updatePeriodFields01OLock();
    tutupModalFinalisasiOperasi();
    showFormAlert('o10', `Periode <strong>${data.periode}</strong> berhasil difinalisasi. Daftar tersimpan lokal telah dikosongkan dan 01-O siap untuk periode baru.`, 'success');
}

async function renderMatriksOperasi() {
    const container = document.getElementById('timeline-operasi-container');
    if (!container) return;
    if (siopiDb) {
        container.innerHTML = `<div class="bg-slate-50 border border-dashed border-slate-300 p-8 rounded-xl text-center text-slate-400 font-medium">Menyinkronkan Rekap Operasi dari Supabase...</div>`;
        await syncAllOperasiFromSupabase();
    }

    // 1. Ambil Pondasi Utama (01-O) untuk mendapatkan Daftar Periode Tanam
    const o1Data = getLS('01O_' + currentDI) || {};
    const o2Data = getLS('02O_' + currentDI) || {};
    const o3Data = getLS('03O_' + currentDI) || {};
    const o10Data = getLS('10O_' + currentDI) || {};
    const o11Data = getLS('11O_GLOBAL') || {};
    const o12Data = getLS('12O_GLOBAL') || {};
    
    // Form Setengah Bulanan
    const o4Data = getLS('04O_' + currentDI) || {};
    const o5Data = getLS('05O_' + currentDI) || {};
    const o5aData = getLS('05Oa_' + currentDI) || {};
    const o6Data = getLS('06O_' + currentDI) || {};
    const o7Data = getLS('07O_' + currentDI) || {};
    const o8Data = getLS('08O_' + currentDI) || {};
    const o9Data = getLS('09O_' + currentDI) || {};

    // 2. Ekstrak Periode Unik dari 01-O
    let setPeriode = new Set();
    Object.values(o1Data).forEach(b => {
        if(b.periode) setPeriode.add(b.periode);
    });
    
    let arrPeriode = Array.from(setPeriode).sort().reverse();

    if (arrPeriode.length === 0) {
        container.innerHTML = `<div class="bg-slate-50 border border-dashed border-slate-300 p-8 rounded-xl text-center text-slate-400 font-medium">Belum ada periode tanam yang dibuat di Formulir 01-O.</div>`;
        return;
    }

    let htmlTimeline = '';

    arrPeriode.forEach((periode, index) => {
        const kelengkapan = buildKelengkapanOperasi(periode, {
            o1Data, o2Data, o3Data, o4Data, o5Data, o6Data, o7Data, o8Data, o9Data, o10Data, o11Data, o12Data
        });
        const countTahunan = ['01-O','02-O','03-O','10-O','11-O','12-O']
            .reduce((sum, blanko) => sum + (kelengkapan.actual[blanko] || 0), 0);
        const wajibTahunan = ['01-O','02-O','03-O','10-O','11-O','12-O']
            .reduce((sum, blanko) => sum + (kelengkapan.required[blanko] || 0), 0);
        const countSetengahBln = ['04-O','05-O','06-O','07-O','08-O','09-O']
            .reduce((sum, blanko) => sum + (kelengkapan.actual[blanko] || 0), 0);
        const wajibSetengahBln = ['04-O','05-O','06-O','07-O','08-O','09-O']
            .reduce((sum, blanko) => sum + (kelengkapan.required[blanko] || 0), 0);
        let statusBadge = kelengkapan.lengkap
            ? '<span class="bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-[10px] font-black uppercase">Lengkap</span>'
            : (index === 0
                ? '<span class="bg-amber-100 text-amber-700 px-2 py-1 rounded text-[10px] font-black uppercase">Proses / Berjalan</span>'
                : '<span class="bg-rose-100 text-rose-700 px-2 py-1 rounded text-[10px] font-black uppercase">Belum Lengkap</span>');

        htmlTimeline += `
        <div class="relative bg-white border border-slate-200 rounded-xl shadow-sm p-6 hover:border-indigo-300 transition-all group">
            <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div class="w-full md:w-2/3">
                    <div class="flex items-center gap-3 mb-2">
                        <h4 class="text-xl font-black text-indigo-900 tracking-wide">Periode: ${periode}</h4>
                        ${statusBadge}
                    </div>
                    <p class="text-xs text-slate-500 mb-4">Laporan Operasi Irigasi untuk Musim Tanam periode berjalan.</p>
                    
                    <div class="flex gap-4 text-xs font-bold">
                        <div class="bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg border border-slate-200">
                            Tahunan: <span class="text-indigo-600">${countTahunan}</span>/<span>${wajibTahunan}</span> Laporan
                        </div>
                        <div class="bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg border border-slate-200">
                            Setengah Bulanan: <span class="text-orange-600">${countSetengahBln}</span>/<span>${wajibSetengahBln}</span> Laporan
                        </div>
                        <div class="bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg border border-slate-200">
                            Total: <span class="text-emerald-600">${kelengkapan.totalAda}</span>/<span>${kelengkapan.totalWajib}</span>
                        </div>
                    </div>
                </div>
                
                <div class="flex flex-col sm:flex-row gap-2 w-full md:w-auto mt-4 md:mt-0">
                    <button onclick="bukaDetailOperasi('${periode}')" class="px-4 py-2 bg-yellow-100 text-yellow-700 hover:bg-yellow-200 font-bold text-xs rounded-lg shadow-sm transition-colors border border-yellow-200 flex items-center justify-center gap-2">
                        Detail Laporan <i data-lucide="chevron-down" class="w-4 h-4"></i>
                    </button>
                </div>
            </div>
        </div>`;
    });

    container.innerHTML = htmlTimeline;
    if (typeof initIcons === 'function') initIcons();
}

function bukaDetailOperasi(periodeStr) {
    const modal = document.getElementById('modal-detail-operasi');
    const title = document.getElementById('modal-detail-periode-title');
    const listTahunan = document.getElementById('detail-list-tahunan');
    const listSetengahBln = document.getElementById('detail-list-setengah-bulanan');

    if(!modal) return;
    title.innerText = `Periode Tanam: ${periodeStr}`;

    let rowTahunan = [];
    let rowSetengah = [];

    const getMTLabelOperasi = (data, key = '') => {
        if (data.mt) return data.mt;
        if (data.masaTanam) return data.masaTanam;
        const match = String(key).match(/MT\s*[123]|MT[123]/i);
        if (match) return match[0].replace(/\s+/g, '').toUpperCase();
        if (data.mt1 || data.mt2 || data.mt3) return ['MT1', 'MT2', 'MT3'].filter(mt => data[mt.toLowerCase()]).join(', ');
        return '';
    };

    const makeKeteranganOperasi = (data, key = '', fallbackBendung = '') => {
        const bendung = data.bendung || fallbackBendung || '';
        const mt = getMTLabelOperasi(data, key);
        const lines = [];
        if (bendung) lines.push(`<div><span class="font-bold text-slate-500">Bendung:</span> ${escapePrintValue(bendung)}</div>`);
        if (mt) lines.push(`<div><span class="font-bold text-slate-500">MT:</span> ${escapePrintValue(mt)}</div>`);
        return lines.length ? `<div class="text-left inline-block leading-relaxed">${lines.join('')}</div>` : '';
    };

    const getMTKeysForPeriodeOperasi = (periodeUtama) => {
        const db01 = getLS('01O_' + currentDI) || {};
        const mtKeys = new Set();
        Object.values(db01).forEach(report => {
            if (report.periode === periodeUtama) {
                if (report.mt1) mtKeys.add('MT1');
                if (report.mt2) mtKeys.add('MT2');
                if (report.mt3) mtKeys.add('MT3');
            }
        });
        return mtKeys;
    };

    const formatRiwayatWaktu = (value) => {
        if (!value) return '-';
        if (/^\d{4}-\d{2}-\d{2}T/.test(String(value))) {
            return new Date(value).toLocaleString('id-ID', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }).replace(/\./g, ':');
        }
        return value;
    };

    const isReportInPeriodeOperasi = (data, periodeUtama) => {
        if (!data) return false;
        if (data.periode === periodeUtama) return true;
        if (data.periode && periodeUtama.includes(data.periode)) return true;
        if (data.periode && data.periode.includes(periodeUtama)) return true;
        if (data.mt && getMTKeysForPeriodeOperasi(periodeUtama).has(String(data.mt).toUpperCase())) return true;
        return false;
    };

    // Fungsi Pabrik Baris Tabel Operasi (Desain Riwayat Asli + Waktu + Aksi)
    const createRow = (data, originalTgl, tipeBlanko, info1, info2 = null, keyLaporan = '') => {
        const waktuDibuat = formatRiwayatWaktu(data.createdAt || data.timestamp);
        const waktuDiedit = formatRiwayatWaktu(data.updatedAt || data.timestamp);
        const keterangan = info2 !== null ? info2 : makeKeteranganOperasi(data, keyLaporan);

        return `
        <tr class="border-b hover:bg-slate-50 transition-colors bg-white">
            <td class="p-3 border-r">
                <div class="flex flex-col gap-1">
                    <span class="text-[9px] font-bold text-slate-500 flex items-center gap-1"><i data-lucide="clock" class="w-3 h-3 text-emerald-500"></i> Dibuat: ${waktuDibuat}</span>
                    <span class="text-[9px] font-bold text-slate-500 flex items-center gap-1"><i data-lucide="edit-3" class="w-3 h-3 text-blue-500"></i> Diedit: ${waktuDiedit}</span>
                </div>
            </td>
            <td class="p-3 border-r text-center font-medium text-slate-700 align-middle">${info1}</td>
            <td class="p-3 border-r text-center font-black text-indigo-700 align-middle bg-indigo-50/30">${tipeBlanko}</td>
            <td class="p-3 border-r text-center font-medium text-slate-700 align-middle">${keterangan}</td>
            <td class="p-3 text-center align-middle">
                <div class="flex justify-center gap-2">
                    <button onclick="editLaporanDariModal('${tipeBlanko}', '${keyLaporan}')" class="bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white border border-blue-200 p-2 rounded-lg transition-all shadow-sm group" title="Lihat/Edit di Form">
                        <i data-lucide="edit" class="w-4 h-4 transition-transform group-hover:scale-110"></i>
                    </button>
                    <button onclick="unduhPdfTunggal('${tipeBlanko}', '${keyLaporan}')" class="bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white border border-rose-200 p-2 rounded-lg transition-all shadow-sm group" title="Unduh PDF">
                        <i data-lucide="file-text" class="w-4 h-4 transition-transform group-hover:scale-110"></i>
                    </button>
                </div>
            </td>
        </tr>`;
    };

    // 1. TAHUNAN (01, 02, 03, 10, 11, 12)
    const db01 = getLS('01O_' + currentDI);
    Object.keys(db01).forEach(k => { if(db01[k].periode === periodeStr) rowTahunan.push(createRow(db01[k], db01[k].tglUsulan || '-', '01-O', periodeStr, makeKeteranganOperasi(db01[k], k, k), k)); });
    
    const db02 = getLS('02O_' + currentDI);
    Object.keys(db02).forEach(k => { 
        if(isReportInPeriodeOperasi({ ...db02[k], mt: db02[k].mt || k }, periodeStr)) {
            rowTahunan.push(createRow({ ...db02[k], mt: db02[k].mt || k }, '-', '02-O', periodeStr, makeKeteranganOperasi({ ...db02[k], mt: db02[k].mt || k }, k), k));
        }
    });
    
    if(getLS('03O_' + currentDI)[periodeStr]) rowTahunan.push(createRow(getLS('03O_' + currentDI)[periodeStr], '-', '03-O', periodeStr, '<div class="text-left inline-block leading-relaxed">Keputusan Komisi Irigasi</div>', periodeStr));
    if(getLS('10O_' + currentDI)[periodeStr]) rowTahunan.push(createRow(getLS('10O_' + currentDI)[periodeStr], '-', '10-O', periodeStr, '<div class="text-left inline-block leading-relaxed">Akumulasi D.I</div>', periodeStr));
    const db11 = getLS('11O_GLOBAL') || {};
    Object.keys(db11).forEach(k => { 
        if(isReportInPeriodeOperasi(db11[k], periodeStr)) {
            const kabInfo = db11[k].kab ? `<div class="text-left inline-block leading-relaxed">Kabupaten/Kota: ${escapePrintValue(db11[k].kab)}</div>` : '';
            rowTahunan.push(createRow(db11[k], '-', '11-O', periodeStr, kabInfo, k));
        }
    });
    if(getLS('12O_GLOBAL')[periodeStr]) rowTahunan.push(createRow(getLS('12O_GLOBAL')[periodeStr], '-', '12-O', periodeStr, '<div class="text-left inline-block leading-relaxed">Rekapitulasi Tingkat Provinsi</div>', periodeStr));

    // 2. SETENGAH BULANAN (04 s/d 09)
    const tahunParts = periodeStr.split('/');
    const thn1 = tahunParts[0] || ''; 
    const thn2 = tahunParts[1] || '';

    const scanSetengahBulanan = (formNama, db) => {
        Object.keys(db).forEach(key => {
            if (key.includes(thn1) || key.includes(thn2)) {
                const data = db[key];
                const bendung = data.bendung || '';
                const perAir = data.periodeAir || data.periode || key.split('_').pop();
                rowSetengah.push(createRow(data, '-', formNama, perAir, makeKeteranganOperasi(data, key, bendung), key));
            }
        });
    };

    scanSetengahBulanan('04-O', getLS('04O_' + currentDI));
    scanSetengahBulanan('04Oa', getLS('04Oa_' + currentDI));
    scanSetengahBulanan('05-O', getLS('05O_' + currentDI));
    scanSetengahBulanan('05a-O', getLS('05Oa_' + currentDI));
    scanSetengahBulanan('06-O', getLS('06O_' + currentDI));
    scanSetengahBulanan('07-O', getLS('07O_' + currentDI));
    scanSetengahBulanan('08-O', getLS('08O_' + currentDI));
    scanSetengahBulanan('09-O', getLS('09O_' + currentDI));

    // Cetak ke Modal
    listTahunan.innerHTML = rowTahunan.length > 0 ? rowTahunan.join('') : `<tr><td colspan="5" class="p-6 text-center text-slate-400 italic">Belum ada laporan tahunan.</td></tr>`;
    listSetengahBln.innerHTML = rowSetengah.length > 0 ? rowSetengah.join('') : `<tr><td colspan="5" class="p-6 text-center text-slate-400 italic">Belum ada laporan rutin setengah bulanan.</td></tr>`;

    modal.classList.remove('hidden');
    if (typeof initIcons === 'function') initIcons();
}

function tutupModalDetailOperasi() {
    const modal = document.getElementById('modal-detail-operasi');
    if (modal) modal.classList.add('hidden');
}

// ====================================================================
// --- SISTEM REKAPITULASI PEMELIHARAAN (GAYA TIMELINE & LIST) ---
// ====================================================================

async function renderMatriksPemeliharaan() {
    const container = document.getElementById('timeline-pemeliharaan-container');
    if (!container) return;

    if (siopiDb) {
        container.innerHTML = `<div class="bg-slate-50 border border-dashed border-slate-300 p-8 rounded-xl text-center text-slate-400 font-medium">Menyinkronkan Rekap Pemeliharaan dari Supabase...</div>`;
        await syncPemeliharaanAwalFromSupabase();
    }

    // 1. Ambil Semua Data Pemeliharaan (01-P s/d 10-P)
    const db = {
        p1: getLS('01P_' + currentDI) || {}, p2: getLS('02P_' + currentDI) || {},
        p2a: getLS('02aP_' + currentDI) || {}, p3: getLS('03P_' + currentDI) || {},
        p4: getLS('04P_' + currentDI) || {}, p5: getLS('05P_' + currentDI) || {},
        p6: getLS('06P_' + currentDI) || {}, p7: getLS('07P_' + currentDI) || {},
        p8: getLS('08P_' + currentDI) || {}, p9: getLS('09P_' + currentDI) || {},
        p10: getLS('10P_' + currentDI) || {}
    };

    let setTahun = new Set();
    Object.values(db).forEach(formDb => {
        Object.keys(formDb).forEach(key => {
            const match = key.match(/\d{4}/);
            if (match) setTahun.add(match[0]);
        });
    });

    let arrTahun = Array.from(setTahun).sort().reverse(); 

    if (arrTahun.length === 0) {
        container.innerHTML = `<div class="bg-slate-50 border border-dashed border-slate-300 p-8 rounded-xl text-center text-slate-400 font-medium">Belum ada riwayat pemeliharaan yang tersimpan di sistem.</div>`;
        return;
    }

    let htmlTimeline = '';

    arrTahun.forEach((tahun, index) => {
        let countRutin = 0;
        let countProgram = 0;

        const scanDb = (dataObj, isRutin) => {
            Object.keys(dataObj).forEach(k => {
                if (k.includes(tahun)) {
                    isRutin ? countRutin++ : countProgram++;
                }
            });
        };

        scanDb(db.p1, true); scanDb(db.p2, true); scanDb(db.p2a, true); scanDb(db.p3, true); scanDb(db.p8, true); scanDb(db.p9, true);
        scanDb(db.p4, false); scanDb(db.p5, false); scanDb(db.p6, false); scanDb(db.p7, false); scanDb(db.p10, false);

        const totalForm = countRutin + countProgram;
        let statusBadge = index === 0
            ? '<span class="bg-amber-100 text-amber-700 px-2 py-1 rounded text-[10px] font-black uppercase">Proses / Berjalan</span>'
            : '<span class="bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-[10px] font-black uppercase">Selesai</span>';

        htmlTimeline += `
        <div class="relative bg-white border border-slate-200 rounded-xl shadow-sm p-6 hover:border-emerald-300 transition-all group">
            <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div class="w-full md:w-2/3">
                    <div class="flex items-center gap-3 mb-2">
                        <h4 class="text-xl font-black text-emerald-900 tracking-wide">Tahun Pelaksanaan: ${tahun}</h4>
                        ${statusBadge}
                    </div>
                    <p class="text-xs text-slate-500 mb-4">Laporan Rutin & Program Pemeliharaan Daerah Irigasi.</p>
                    
                    <div class="flex gap-4 text-xs font-bold">
                        <div class="bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg border border-slate-200">
                            Rutin/Insidentil: <span class="text-amber-600">${countRutin}</span> Laporan
                        </div>
                        <div class="bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg border border-slate-200">
                            Program/Tahunan: <span class="text-emerald-600">${countProgram}</span> Laporan
                        </div>
                    </div>
                </div>
                
                <div class="flex flex-col sm:flex-row gap-2 w-full md:w-auto mt-4 md:mt-0">
                    <button onclick="bukaDetailPemeliharaan('${tahun}')" class="px-4 py-2 bg-yellow-100 text-yellow-700 hover:bg-yellow-200 font-bold text-xs rounded-lg shadow-sm transition-colors border border-yellow-200 flex items-center justify-center gap-2">
                        Detail Laporan <i data-lucide="chevron-down" class="w-4 h-4"></i>
                    </button>
                </div>
            </div>
        </div>`;
    });

    container.innerHTML = htmlTimeline;
    if (typeof initIcons === 'function') initIcons();
}

function bukaDetailPemeliharaan(tahun) {
    const modal = document.getElementById('modal-detail-pemeliharaan');
    const title = document.getElementById('modal-detail-tahun-title');
    const listRutin = document.getElementById('detail-list-pemeliharaan-rutin');
    const listTahunan = document.getElementById('detail-list-pemeliharaan-tahunan');

    if(!modal) return;
    title.innerText = `Tahun Pelaksanaan: ${tahun}`;

    let rowRutin = [];
    let rowTahunan = [];

    const formatRiwayatWaktuPemeliharaan = (value) => {
        if (!value) return '-';
        if (/^\d{4}-\d{2}-\d{2}T/.test(String(value))) {
            return new Date(value).toLocaleString('id-ID', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }).replace(/\./g, ':');
        }
        return value;
    };

    // Fungsi Pabrik Baris Tabel Pemeliharaan (Desain Riwayat Asli + Waktu + Aksi)
    const createRowPemeliharaan = (data, formCode, keyInfo, info, actualKey) => {
        const waktuDibuat = formatRiwayatWaktuPemeliharaan(data.createdAt || data.timestamp); 
        const waktuDiedit = formatRiwayatWaktuPemeliharaan(data.updatedAt || data.timestamp);

        return `
        <tr class="border-b hover:bg-slate-50 transition-colors bg-white">
            <td class="p-3 border-r">
                <div class="flex flex-col gap-1">
                    <span class="text-[9px] font-bold text-slate-500 flex items-center gap-1"><i data-lucide="clock" class="w-3 h-3 text-emerald-500"></i> Dibuat: ${waktuDibuat}</span>
                    <span class="text-[9px] font-bold text-slate-500 flex items-center gap-1"><i data-lucide="edit-3" class="w-3 h-3 text-blue-500"></i> Diedit: ${waktuDiedit}</span>
                </div>
            </td>
            <td class="p-3 border-r text-center font-medium text-slate-700 uppercase align-middle">${keyInfo}</td>
            <td class="p-3 border-r text-center font-black text-emerald-700 bg-emerald-50/30 align-middle">${formCode}</td>
            <td class="p-3 border-r text-center font-medium text-slate-700 align-middle">${info || '-'}</td>
            <td class="p-3 text-center align-middle">
                <div class="flex justify-center gap-2">
                    <button onclick="editLaporanDariModal('${formCode}', '${actualKey}')" class="bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white border border-blue-200 p-2 rounded-lg transition-all shadow-sm group" title="Lihat/Edit di Form">
                        <i data-lucide="edit" class="w-4 h-4 transition-transform group-hover:scale-110"></i>
                    </button>
                    <button onclick="unduhPdfTunggal('${formCode}', '${actualKey}')" class="bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white border border-rose-200 p-2 rounded-lg transition-all shadow-sm group" title="Unduh PDF">
                        <i data-lucide="file-text" class="w-4 h-4 transition-transform group-hover:scale-110"></i>
                    </button>
                </div>
            </td>
        </tr>`;
    };

    // Helper untuk Ekstrak Data
    const scanDbPemeliharaan = (formCode, dbObj, isRutin) => {
        Object.keys(dbObj).forEach(k => {
            if (k.includes(tahun)) {
                const data = dbObj[k];
                let info = '';
                let keyLabel = k;

                if(formCode === '01-P') { keyLabel = data.bulan; info = `Juru: ${data.juru}`; }
                else if(formCode === '02-P') { keyLabel = data.bulan || k; info = `Pengamat: ${getProfilData(currentDI).pengamat || '-'}`; }
                else if(formCode === '02a-P') { keyLabel = data.periode || k; info = 'Buku Catatan Pemeliharaan'; }
                else if(formCode === '03-P') { keyLabel = data.tgl; info = `Kejadian Insidentil`; }
                else if(formCode === '08-P') { keyLabel = data.tglMulai || k; info = `Pelaksana: ${data.pelaksana || '-'}`; }
                else if(formCode === '04-P' || formCode === '05-P' || formCode === '09-P' || formCode === '10-P') {
                    keyLabel = tahun; info = data.dinas || 'Dinas / Balai';
                }
                else if(formCode === '06-P' || formCode === '07-P') {
                    info = `Juru: ${k.split('_')[1] || '-'}`;
                    keyLabel = tahun;
                }

                if (isRutin) rowRutin.push(createRowPemeliharaan(data, formCode, keyLabel, info, k));
                else rowTahunan.push(createRowPemeliharaan(data, formCode, keyLabel, info, k));
            }
        });
    };

    scanDbPemeliharaan('01-P', getLS('01P_' + currentDI) || {}, true);
    scanDbPemeliharaan('02-P', getLS('02P_' + currentDI) || {}, true);
    scanDbPemeliharaan('02a-P', getLS('02aP_' + currentDI) || {}, true);
    scanDbPemeliharaan('03-P', getLS('03P_' + currentDI) || {}, true);
    scanDbPemeliharaan('08-P', getLS('08P_' + currentDI) || {}, true);
    scanDbPemeliharaan('09-P', getLS('09P_' + currentDI) || {}, true);

    scanDbPemeliharaan('04-P', getLS('04P_' + currentDI) || {}, false);
    scanDbPemeliharaan('05-P', getLS('05P_' + currentDI) || {}, false);
    scanDbPemeliharaan('06-P', getLS('06P_' + currentDI) || {}, false);
    scanDbPemeliharaan('07-P', getLS('07P_' + currentDI) || {}, false);
    scanDbPemeliharaan('10-P', getLS('10P_' + currentDI) || {}, false);

    // Cetak ke DOM
    listRutin.innerHTML = rowRutin.length > 0 ? rowRutin.join('') : `<tr><td colspan="5" class="p-6 text-center text-slate-400 italic">Belum ada laporan rutin/insidentil untuk tahun ini.</td></tr>`;
    listTahunan.innerHTML = rowTahunan.length > 0 ? rowTahunan.join('') : `<tr><td colspan="5" class="p-6 text-center text-slate-400 italic">Belum ada program/laporan tahunan untuk tahun ini.</td></tr>`;

    modal.classList.remove('hidden');
    if (typeof initIcons === 'function') initIcons();
}

function tutupModalDetailPemeliharaan() {
    const modal = document.getElementById('modal-detail-pemeliharaan');
    if (modal) modal.classList.add('hidden');
}


// --- FUNGSI MODAL PENJELAJAH ARSIP ---
function bukaPenjelajahArsip(formId, filterJuru = '') {
    const modal = document.getElementById('modal-penjelajah-arsip');
    const title = document.getElementById('modal-arsip-title');
    const subtitle = document.getElementById('modal-arsip-subtitle');
    const listContainer = document.getElementById('modal-arsip-list');
    const filterTahun = document.getElementById('filter-matriks-pemeliharaan')?.value || 'ALL';

    if (!modal || !listContainer) return;

    title.innerHTML = `<i data-lucide="folder-open" class="w-6 h-6 text-indigo-600"></i> Penjelajah Arsip ${formId.replace('P', '-P')}`;
    subtitle.innerText = filterJuru ? `Wilayah Juru: ${filterJuru}` : `Laporan Tahunan / Global`;

    const savedData = getLS(formId + '_' + currentDI) || {};
    let keys = Object.keys(savedData);

    if (filterTahun !== 'ALL') keys = keys.filter(k => k.includes(filterTahun));
    if (filterJuru) keys = keys.filter(k => k.includes(filterJuru));

    if (keys.length === 0) {
        listContainer.innerHTML = `<p class="text-center text-slate-400 py-8 italic">Tidak ada arsip ditemukan.</p>`;
    } else {
        listContainer.innerHTML = keys.sort().reverse().map(k => {
            const d = savedData[k];
            const labelUtama = d.bulan || d.tgl || d.periode || k;
            const labelSub = d.pekerjaan || d.dinas || (filterJuru ? 'Laporan Inspeksi' : 'Data Rekapitulasi');
            return `<div class="bg-white p-4 border border-slate-200 rounded-xl shadow-sm flex items-center justify-between hover:border-indigo-300 transition-all">
                <div class="overflow-hidden"><h4 class="font-black text-slate-800 text-sm truncate uppercase">${labelUtama}</h4><p class="text-[10px] text-slate-500 font-medium truncate">${labelSub}</p></div>
                <button onclick="eksekusiBukaArsipPemeliharaan('${formId}', '${k}')" class="shrink-0 ml-4 px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold text-xs hover:bg-indigo-700 shadow-md flex items-center gap-2 transition-all cursor-pointer"><i data-lucide="external-link" class="w-3.5 h-3.5"></i> Buka</button>
            </div>`;
        }).join('');
    }
    modal.classList.remove('hidden');
    if (typeof initIcons === 'function') initIcons();
}

function eksekusiBukaArsipPemeliharaan(formId, key) {
    tutupModalDetailPemeliharaan();
    tutupModalArsip();
    navigate('blanko-pemeliharaan');
    
    const cleanFormId = formId.replace('-', '');
    switchPemeliharaanTab(cleanFormId);
    
    const funcName = `edit${cleanFormId}`;
    if (typeof window[funcName] === 'function') {
        window[funcName](key);
    } else {
        console.warn(`[Aman] Fungsi ${funcName} belum tersedia untuk auto-load.`);
    }
}

function tutupModalArsip() {
    const modal = document.getElementById('modal-penjelajah-arsip');
    if (modal) modal.classList.add('hidden');
}

function renderBadgeArsip(count, formId, filterData = '') {
    if (count > 0) {
        return `<button onclick="bukaPenjelajahArsip('${formId}', '${filterData}')" class="px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg font-black text-[10px] hover:bg-emerald-200 transition-all uppercase shadow-sm cursor-pointer">
            ${count} Arsip
        </button>`;
    }
    return `<span class="text-slate-300">-</span>`;
}

// -----------------------------------------------------------------------------------------
// BAGIAN 3: SISTEM MODAL & AUTO-PILOT NAVIGASI
// -----------------------------------------------------------------------------------------

function bukaModalArsip(kategori, formId, entityName, isGlobal) {
    const keys = dapatkanKunciArsip(formId, entityName, isGlobal);
    const db = getLS(formId + '_' + currentDI) || {};
    
    document.getElementById('modal-arsip-title').innerHTML = `<i data-lucide="folder-open" class="w-6 h-6 text-indigo-600"></i> Arsip Formulir ${formId}`;
    document.getElementById('modal-arsip-subtitle').innerText = isGlobal ? `Tingkat Wilayah / D.I.` : `Entitas: ${entityName}`;
    
    const listContainer = document.getElementById('modal-arsip-list');
    listContainer.innerHTML = keys.map(k => `
        <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex justify-between items-center gap-4">
            <div class="flex items-start gap-3">
                <div class="bg-indigo-50 text-indigo-600 p-2.5 rounded-lg"><i data-lucide="file-spreadsheet" class="w-5 h-5"></i></div>
                <div>
                    <h5 class="font-bold text-slate-800 text-sm uppercase">${k.split('_')[0]}</h5>
                    <p class="text-[10px] text-slate-500 font-medium">${k}</p>
                </div>
            </div>
            <button onclick="terbangkanKeForm('${kategori}', '${formId}', '${k}')" class="px-4 py-2 bg-slate-800 text-white text-xs font-bold rounded-lg hover:bg-indigo-600 transition-colors">Buka & Edit</button>
        </div>
    `).join('');

    if(typeof initIcons === 'function') initIcons();
    const modal = document.getElementById('modal-penjelajah-arsip');
    if(modal) modal.classList.remove('hidden');
}

function terbangkanKeForm(kategori, formId, key) {
    tutupModalArsip();
    if (kategori === 'operasi') {
        navigate('blanko-operasi');         
        switchBlankoTab(formId === '04Oa' ? '04O' : (formId === '05Oa' ? '05O' : formId));      
    } else {
        navigate('blanko-pemeliharaan');    
        switchPemeliharaanTab(formId === '02aP' ? '02P' : formId);
    }

    if (formId === '04Oa' || formId === '05Oa' || formId === '02aP') switchSubTab(formId === '04Oa' ? '04O' : (formId === '05Oa' ? '05O' : '02P'), 'a');

    setTimeout(() => {
        const fungsiEdit = window['edit' + formId];
        if (typeof fungsiEdit === 'function') fungsiEdit(key);
    }, 200); 
}

// ====================================================================
// FUNGSI PENGENDALI AKSI MODAL DETAIL (OPERASI & PEMELIHARAAN)
// ====================================================================

function editLaporanDariModal(blanko, key) {
    tutupModalDetailOperasi(); 
    tutupModalDetailPemeliharaan();
    
    const idBlanko = blanko.replace('-', ''); 
    
    if (idBlanko.includes('O')) {
        navigate('blanko-operasi'); 
        switchBlankoTab(idBlanko === '04Oa' ? '04O' : (idBlanko === '05aO' ? '05O' : idBlanko)); 
        if (idBlanko === '04Oa') switchSubTab('04O', 'a');
        if (idBlanko === '05aO') switchSubTab('05O', 'a');
    } else {
        navigate('blanko-pemeliharaan');
        switchPemeliharaanTab(idBlanko === '02aP' ? '02P' : idBlanko);
        if (idBlanko === '02aP') switchSubTab('02P', 'a');
    }
    
    setTimeout(() => {
        const fungsiEdit = window['edit' + idBlanko];
        if (typeof fungsiEdit === 'function') {
            fungsiEdit(key);
        } else {
            console.warn(`[SiOPI] Fungsi edit untuk ${blanko} belum tersedia.`);
        }
    }, 150);
}

function getPrintTargetForBlanko(blanko, key = '') {
    const idBlanko = String(blanko || '').replace('-', '');
    if (idBlanko === '01O') return buildOfficialPrint01O(key);
    if (idBlanko === '02O') return buildOfficialPrint02O(key);
    if (idBlanko === '03O') return buildOfficialPrint03O(key);
    if (idBlanko === '04O') return buildOfficialPrint04O(key);
    if (idBlanko === '05O') return buildOfficialPrint05O(key);
    if (idBlanko === '06O') return buildOfficialPrint06O(key);
    if (idBlanko === '07O') return buildOfficialPrint07O(key);
    if (idBlanko === '08O') return buildOfficialPrint08O(key);
    if (idBlanko === '09O') return buildOfficialPrint09O(key);
    if (idBlanko === '10O') return buildOfficialPrint10O(key);
    if (idBlanko === '11O') return buildOfficialPrint11O(key);
    if (idBlanko === '12O') return buildOfficialPrint12O(key);
    if (idBlanko === '01P') return buildOfficialPrint01P(key);
    if (idBlanko === '02P') return buildOfficialPrint02P(key);
    if (idBlanko === '02aP') return buildOfficialPrint02aP(key);
    if (idBlanko === '03P') return buildOfficialPrint03P(key);
    if (idBlanko === '04P') return buildOfficialPrint04P(key);
    if (idBlanko === '05P') return buildOfficialPrint05P(key);
    if (idBlanko === '06P') return buildOfficialPrint06P(key);
    if (idBlanko === '07P') return buildOfficialPrint07P(key);
    if (idBlanko === '08P') return buildOfficialPrint08P(key);
    if (idBlanko === '09P') return buildOfficialPrint09P(key);
    if (idBlanko === '10P') return buildOfficialPrint10P(key);

    const targetId = idBlanko.includes('O')
        ? (idBlanko === '05aO' ? 'tabContent-05O' : `tabContent-${idBlanko}`)
        : (idBlanko === '02aP' ? 'tabContentPem-02P' : `tabContentPem-${idBlanko}`);

    return document.getElementById(targetId);
}

function hasOfficialPrintBuilder(blanko) {
    return ['01O', '02O', '03O', '04O', '05O', '06O', '07O', '08O', '09O', '10O', '11O', '12O', '01P', '02P', '02aP', '03P', '04P', '05P', '06P', '07P', '08P', '09P', '10P'].includes(String(blanko || '').replace('-', ''));
}

function cleanupPrintMode() {
    document.documentElement.classList.remove('siopi-print-official-landscape-mode');
    document.documentElement.classList.remove('siopi-print-official-legal-landscape-mode');
    document.body.classList.remove('siopi-print-mode');
    document.body.classList.remove('siopi-print-official-mode');
    document.body.classList.remove('siopi-print-official-landscape-mode');
    document.body.classList.remove('siopi-print-official-legal-landscape-mode');
    document.querySelectorAll('.siopi-print-target').forEach(el => el.classList.remove('siopi-print-target'));
    const officialRoot = document.getElementById('siopi-official-print-root');
    if (officialRoot) officialRoot.remove();
}

function escapePrintValue(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function getPrintInputValue(id) {
    const el = document.getElementById(id);
    return el ? el.value || '' : '';
}

function getPrintTextValue(id) {
    const el = document.getElementById(id);
    return el ? el.innerText || '' : '';
}

function getReportValue01O(report, fieldId) {
    if (report && Object.prototype.hasOwnProperty.call(report, fieldId)) return report[fieldId] || '';
    return getPrintInputValue('o1-' + fieldId);
}

function getReportTableValue01O(report, col, idx) {
    if (report && report.table && report.table[idx]) return report.table[idx][col] || '';
    return getPrintInputValue(`o1-${col}-${idx}`);
}

function getOfficialValue02O(value) {
    if (value === undefined || value === null || value === '') return '';
    const num = parseFloat(value);
    if (!Number.isNaN(num)) return num === 0 ? '' : num.toFixed(2).replace(/\.00$/, '');
    return value;
}

function getBendungAreaMeta(bendungNama, pData) {
    const bendung = (pData.bendungs || []).find(b => b.nama === bendungNama);
    let luas = 0;
    const kecSet = new Set();
    if (bendung && bendung.rincian) {
        bendung.rincian.forEach(r => {
            luas += parseFloat(r.luasFungsional) || 0;
            if (r.kecamatan && r.kecamatan.trim()) kecSet.add(r.kecamatan.trim());
        });
    }
    return {
        kecamatan: Array.from(kecSet).join(', '),
        luas: luas > 0 ? luas.toFixed(2) : ''
    };
}

function getBendungMeta01O(bendungNama, pData) {
    const bendung = (pData.bendungs || []).find(b => b.nama === bendungNama);
    const meta = {
        juru: '',
        luas: '',
        p3a: '',
        kecamatan: ''
    };

    if (!bendung) {
        meta.juru = getPrintTextValue('o1-juru');
        meta.luas = getPrintTextValue('o1-luasBendung');
        meta.p3a = getPrintTextValue('o1-p3a');
        meta.kecamatan = getPrintTextValue('o1-kecamatan');
        return meta;
    }

    let luasBendung = 0;
    const p3aSet = new Set();
    const kecSet = new Set();

    (bendung.rincian || []).forEach(r => {
        luasBendung += parseFloat(r.luasFungsional) || 0;
        if (r.gp3a && r.gp3a.trim() !== '') p3aSet.add(r.gp3a.trim());
        if (r.p3a && r.p3a.trim() !== '') p3aSet.add(r.p3a.trim());
        if (r.kecamatan && r.kecamatan.trim() !== '') kecSet.add(r.kecamatan.trim());
    });

    meta.juru = bendung.juru || '';
    meta.luas = luasBendung > 0 ? luasBendung.toFixed(2) : '0';
    meta.p3a = p3aSet.size > 0 ? Array.from(p3aSet).join(', ') : '';
    meta.kecamatan = kecSet.size > 0 ? Array.from(kecSet).join(', ') : '';
    return meta;
}

function getTotalLuasDI01O(pData) {
    let total = 0;
    (pData.bendungs || []).forEach(b => {
        (b.rincian || []).forEach(r => {
            total += parseFloat(r.luasFungsional) || 0;
        });
    });
    return total > 0 ? `${total.toFixed(2)} Ha` : (getPrintTextValue('o1-totalLuasDI') || '0 Ha');
}

function formatTanggalCetak01O(value) {
    if (!value) return '';
    const parts = String(value).split('-');
    if (parts.length !== 3) return value;
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
}

function formatTanggalPanjang01O(value) {
    if (!value) return '';
    const parts = String(value).split('-');
    if (parts.length !== 3) return value;
    const bulan = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const monthIndex = parseInt(parts[1], 10) - 1;
    return `${parseInt(parts[2], 10)} ${bulan[monthIndex] || parts[1]} ${parts[0]}`;
}

function formatTanggalLaporan(value) {
    const raw = value || new Date().toISOString();
    const date = new Date(raw);
    if (!Number.isNaN(date.getTime())) {
        return date.toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    }
    return formatTanggalPanjang01O(raw) || raw;
}

function getPengamatSignatureInfo(pData) {
    return {
        nama: pData.pengamat || '',
        nip: pData.nipPengamat || pData.nip_pengamat || pData.pengamatNip || pData.nip || ''
    };
}

function getKasieSignatureInfo(pData) {
    return {
        nama: pData.kasie || pData.kasieOP || pData.kasieOp || pData.kasi || '',
        nip: pData.nipKasie || pData.nip_kasie || pData.kasieNip || ''
    };
}

function getJuruSignatureInfo(pData, juruName = '') {
    const juru = (pData.jurus || []).find(item => {
        const nama = typeof item === 'string' ? item : item.nama;
        return String(nama || '').trim() === String(juruName || '').trim();
    });
    return {
        nama: juruName || (typeof juru === 'string' ? juru : juru?.nama) || '',
        nip: typeof juru === 'object'
            ? (juru.nip || juru.nipJuru || juru.nip_juru || juru.juruNip || '')
            : ''
    };
}

function buildOfficialPrint01P(key = '') {
    const db01P = getLS('01P_' + currentDI) || {};
    const report = db01P[key] || null;
    if (!report) return document.getElementById('tabContentPem-01P');

    const pData = getProfilData(currentDI);
    const pengamatInfo = getPengamatSignatureInfo(pData);
    const juruInfo = getJuruSignatureInfo(pData, report.juru);
    const tanggalLaporan = formatTanggalLaporan(report.updatedAt || report.createdAt || report.timestamp);
    const totalLuasDI = getTotalLuasDI01O(pData);
    const rows = Array.isArray(report.rows) ? report.rows : [];
    const rowsPerPage = 18;
    const pages = [];
    for (let i = 0; i < Math.max(rows.length, 1); i += rowsPerPage) {
        pages.push(rows.slice(i, i + rowsPerPage));
    }

    const field = (label, value, leftLabel, top, leftColon, leftValue) => `
        <div class="field-label" style="left:${leftLabel}mm; top:${top}mm;">${escapePrintValue(label)}</div>
        <div class="field-colon" style="left:${leftColon}mm; top:${top}mm;">:</div>
        <div class="field-value" style="left:${leftValue}mm; top:${top}mm;">${escapePrintValue(value)}</div>
    `;

    const rowValue = (row, col) => escapePrintValue(row?.[col] || '');
    const numberValue01P = (value) => {
        const num = parseFloat(String(value ?? '').replace(',', '.'));
        return Number.isFinite(num) ? num : 0;
    };
    const totals01P = rows.reduce((totals, row) => {
        ['bcr','rsk','lng','rtk','pnt','sdm','lln','arl'].forEach(col => {
            totals[col] += numberValue01P(row[col]);
        });
        return totals;
    }, { bcr:0, rsk:0, lng:0, rtk:0, pnt:0, sdm:0, lln:0, arl:0 });
    const totalCell01P = (col) => {
        const value = totals01P[col] || 0;
        if (value <= 0) return '';
        return col === 'arl' ? value.toFixed(2) : value.toFixed(0);
    };
    const renderRows = (pageRows, pageIndex) => {
        const safeRows = pageRows.length > 0 ? pageRows : [{}];
        return safeRows.map((row, idx) => `
            <tr>
                <td class="center">${pageIndex * rowsPerPage + idx + 1}</td>
                <td class="left">${rowValue(row, 'sal')}</td>
                <td class="left">${rowValue(row, 'bang')}</td>
                <td>${rowValue(row, 'bcr')}</td>
                <td>${rowValue(row, 'rsk')}</td>
                <td>${rowValue(row, 'lng')}</td>
                <td>${rowValue(row, 'rtk')}</td>
                <td>${rowValue(row, 'pnt')}</td>
                <td>${rowValue(row, 'sdm')}</td>
                <td>${rowValue(row, 'lln')}</td>
                <td class="left">${rowValue(row, 'tnd')}</td>
                <td>${rowValue(row, 'arl')}</td>
                <td class="left">${rowValue(row, 'dsa')}</td>
            </tr>
        `).join('');
    };

    const renderTable = (pageRows, pageIndex, isLastPage) => `
        <table class="official-main-table">
            <colgroup>
                <col style="width:4%">
                <col style="width:13%">
                <col style="width:14%">
                <col style="width:6%">
                <col style="width:6%">
                <col style="width:8%">
                <col style="width:6%">
                <col style="width:7%">
                <col style="width:8%">
                <col style="width:7%">
                <col style="width:10%">
                <col style="width:5%">
                <col style="width:6%">
            </colgroup>
            <thead>
                <tr>
                    <th rowspan="2">No</th>
                    <th rowspan="2">Nama Saluran</th>
                    <th rowspan="2">Nama Bangunan<br>dan Typenya</th>
                    <th colspan="7">Keadaan (Jenis Kerusakan)</th>
                    <th rowspan="2">Tindakan</th>
                    <th rowspan="2">Areal Layanan<br>Dibawahnya (ha)</th>
                    <th rowspan="2">Desa / Kecamatan</th>
                </tr>
                <tr>
                    <th>Bocoran</th>
                    <th>Rusak</th>
                    <th>Longsor / Tonjolan</th>
                    <th>Retak</th>
                    <th>Pintu Rusak</th>
                    <th>Sedimen / Waled</th>
                    <th>Lain-Lain</th>
                </tr>
            </thead>
            <tbody>
                ${renderRows(pageRows, pageIndex)}
                ${isLastPage ? `
                    <tr class="total-row">
                        <td colspan="3" class="center bold">Jumlah</td>
                        <td>${escapePrintValue(totalCell01P('bcr'))}</td>
                        <td>${escapePrintValue(totalCell01P('rsk'))}</td>
                        <td>${escapePrintValue(totalCell01P('lng'))}</td>
                        <td>${escapePrintValue(totalCell01P('rtk'))}</td>
                        <td>${escapePrintValue(totalCell01P('pnt'))}</td>
                        <td>${escapePrintValue(totalCell01P('sdm'))}</td>
                        <td>${escapePrintValue(totalCell01P('lln'))}</td>
                        <td></td>
                        <td>${escapePrintValue(totalCell01P('arl'))}</td>
                        <td></td>
                    </tr>
                ` : ''}
            </tbody>
        </table>
    `;

    const renderSignature = () => `
        <div class="official-signatures">
            <div>
                <div>Mengetahui,</div>
                <div>Pengamat</div>
                <span class="signature-name">${escapePrintValue(pengamatInfo.nama || 'Nama')}</span>
                <div>NIP. ${escapePrintValue(pengamatInfo.nip || '')}</div>
            </div>
            <div>
                <div>${escapePrintValue(tanggalLaporan || '')}</div>
                <div>Juru / Mantri</div>
                <span class="signature-name">${escapePrintValue(juruInfo.nama || 'Nama')}</span>
                <div>NIP. ${escapePrintValue(juruInfo.nip || '')}</div>
            </div>
        </div>
    `;

    const renderPage = (pageRows, pageIndex) => {
        const isLastPage = pageIndex === pages.length - 1;
        const signatureTop = Math.min(168, 58 + ((Math.max(pageRows.length, 1) + (isLastPage ? 1 : 0)) * 5.7) + 14);
        return `
            <section class="official-form-01p-page" style="--signature-top:${signatureTop}mm;">
                <div class="official-code">Blangko 01 - P</div>
                <h1 class="official-title">Laporan Inspeksi Rutin Kerusakan Jaringan Irigasi</h1>
                <div class="official-subtitle">Inspeksi Rutin ${escapePrintValue(report.bulan || 'Tanggal Bulan Tahun')}</div>

                ${field('Daerah Irigasi', currentDI, 18, 38, 60, 64)}
                ${field('Total L. Sawah Irigasi D.I', totalLuasDI, 18, 44, 60, 64)}
                ${field('Kabupaten', pData.kabupaten || '', 205, 38, 230, 234)}
                ${field('Pengamat', pData.pengamat || '', 205, 44, 230, 234)}
                ${field('Juru', report.juru || '', 205, 50, 230, 234)}

                ${renderTable(pageRows, pageIndex, isLastPage)}
                ${isLastPage ? renderSignature() : ''}
            </section>
        `;
    };

    const root = document.createElement('div');
    root.id = 'siopi-official-print-root';
    root.className = 'siopi-official-print official-form-01p official-form-01p-batch';
    root.innerHTML = pages.map(renderPage).join('');
    document.body.appendChild(root);
    return root;
}

function buildOfficialPrint02P(key = '') {
    const db02P = getLS('02P_' + currentDI) || {};
    const report = db02P[key] || null;
    if (!report) return document.getElementById('subContent-02P-main') || document.getElementById('tabContentPem-02P');

    const pData = getProfilData(currentDI);
    const pengamatInfo = getPengamatSignatureInfo(pData);
    const tanggalLaporan = formatTanggalLaporan(report.updatedAt || report.createdAt || report.timestamp);
    const totalLuasDI = getTotalLuasDI01O(pData);
    const rows = Array.isArray(report.rows) ? report.rows : [];
    const rowsPerPage = 15;
    const pages = [];
    for (let i = 0; i < Math.max(rows.length, 1); i += rowsPerPage) {
        pages.push(rows.slice(i, i + rowsPerPage));
    }

    const field = (label, value, leftLabel, top, leftColon, leftValue) => `
        <div class="field-label" style="left:${leftLabel}mm; top:${top}mm;">${escapePrintValue(label)}</div>
        <div class="field-colon" style="left:${leftColon}mm; top:${top}mm;">:</div>
        <div class="field-value" style="left:${leftValue}mm; top:${top}mm;">${escapePrintValue(value)}</div>
    `;
    const rowValue = (row, col) => escapePrintValue(row?.[col] || '');
    const numberValue02P = (value) => {
        const num = parseFloat(String(value ?? '').replace(',', '.'));
        return Number.isFinite(num) ? num : 0;
    };
    const totals02P = rows.reduce((totals, row) => {
        ['bcr','rsk','lng','rtk','pnt','sdm','lln','bi_rugi','bi_baik','arl'].forEach(col => {
            totals[col] += numberValue02P(row[col]);
        });
        return totals;
    }, { bcr:0, rsk:0, lng:0, rtk:0, pnt:0, sdm:0, lln:0, bi_rugi:0, bi_baik:0, arl:0 });
    const totalCell02P = (col) => {
        const value = totals02P[col] || 0;
        if (value <= 0) return '';
        if (col === 'bi_rugi' || col === 'bi_baik') return value.toLocaleString('id-ID');
        return col === 'arl' ? value.toFixed(2) : value.toFixed(0);
    };
    const moneyValue = (value) => {
        const num = parseFloat(String(value ?? '').replace(',', '.'));
        if (!Number.isFinite(num) || num === 0) return '';
        return num.toLocaleString('id-ID');
    };

    const renderRows = (pageRows, pageIndex) => {
        const safeRows = pageRows.length > 0 ? pageRows : [{}];
        return safeRows.map((row, idx) => `
            <tr>
                <td class="center">${pageIndex * rowsPerPage + idx + 1}</td>
                <td class="left">${rowValue(row, 'sal')}</td>
                <td class="left">${rowValue(row, 'bang')}</td>
                <td>${rowValue(row, 'bcr')}</td>
                <td>${rowValue(row, 'rsk')}</td>
                <td>${rowValue(row, 'lng')}</td>
                <td>${rowValue(row, 'rtk')}</td>
                <td>${rowValue(row, 'pnt')}</td>
                <td>${rowValue(row, 'sdm')}</td>
                <td>${rowValue(row, 'lln')}</td>
                <td class="right">${escapePrintValue(moneyValue(row?.bi_rugi))}</td>
                <td class="right">${escapePrintValue(moneyValue(row?.bi_baik))}</td>
                <td>${rowValue(row, 'prio')}</td>
                <td>${rowValue(row, 'arl')}</td>
                <td class="left">${rowValue(row, 'dsa')}</td>
            </tr>
        `).join('');
    };

    const renderTable = (pageRows, pageIndex, isLastPage) => `
        <table class="official-main-table">
            <colgroup>
                <col style="width:3.5%">
                <col style="width:11%">
                <col style="width:12%">
                <col style="width:5.5%">
                <col style="width:5.5%">
                <col style="width:6.5%">
                <col style="width:5%">
                <col style="width:5.5%">
                <col style="width:6.5%">
                <col style="width:5.5%">
                <col style="width:8%">
                <col style="width:8%">
                <col style="width:5%">
                <col style="width:5%">
                <col style="width:6.5%">
            </colgroup>
            <thead>
                <tr>
                    <th rowspan="2">No</th>
                    <th rowspan="2">Nama Saluran</th>
                    <th rowspan="2">Nama Bangunan<br>dan Typenya</th>
                    <th colspan="7">Keadaan Kerusakan (m2/m3/bh)</th>
                    <th colspan="2">Perkiraan Biaya (Rp)</th>
                    <th rowspan="2">Prioritas</th>
                    <th rowspan="2">Areal Layanan<br>(ha)</th>
                    <th rowspan="2">Desa / Kecamatan</th>
                </tr>
                <tr>
                    <th>Bocoran</th>
                    <th>Rusak</th>
                    <th>Longsor</th>
                    <th>Retak</th>
                    <th>Pintu</th>
                    <th>Sedimen</th>
                    <th>Lain-Lain</th>
                    <th>Kerugian</th>
                    <th>Perbaikan</th>
                </tr>
            </thead>
            <tbody>
                ${renderRows(pageRows, pageIndex)}
                ${isLastPage ? `
                    <tr class="total-row">
                        <td colspan="3" class="center bold">Jumlah</td>
                        <td>${escapePrintValue(totalCell02P('bcr'))}</td>
                        <td>${escapePrintValue(totalCell02P('rsk'))}</td>
                        <td>${escapePrintValue(totalCell02P('lng'))}</td>
                        <td>${escapePrintValue(totalCell02P('rtk'))}</td>
                        <td>${escapePrintValue(totalCell02P('pnt'))}</td>
                        <td>${escapePrintValue(totalCell02P('sdm'))}</td>
                        <td>${escapePrintValue(totalCell02P('lln'))}</td>
                        <td class="right">${escapePrintValue(totalCell02P('bi_rugi'))}</td>
                        <td class="right">${escapePrintValue(totalCell02P('bi_baik'))}</td>
                        <td></td>
                        <td>${escapePrintValue(totalCell02P('arl'))}</td>
                        <td></td>
                    </tr>
                ` : ''}
            </tbody>
        </table>
    `;

    const renderSignature = () => `
        <div class="official-signatures single-signature">
            <div>
                <div>${escapePrintValue(tanggalLaporan || '')}</div>
                <div>Pengamat</div>
                <span class="signature-name">${escapePrintValue(pengamatInfo.nama || 'Nama')}</span>
                <div>NIP. ${escapePrintValue(pengamatInfo.nip || '')}</div>
            </div>
        </div>
    `;

    const renderPage = (pageRows, pageIndex) => {
        const isLastPage = pageIndex === pages.length - 1;
        const signatureTop = Math.min(170, 58 + ((Math.max(pageRows.length, 1) + (isLastPage ? 1 : 0)) * 6.1) + 14);
        return `
            <section class="official-form-02p-page" style="--signature-top:${signatureTop}mm;">
                <div class="official-code">Blangko 02 - P</div>
                <h1 class="official-title">Laporan Penelusuran Kerusakan Jaringan Irigasi</h1>
                <div class="official-subtitle">Penelusuran Pengamat ${escapePrintValue(report.bulan || key || 'Bulan Tahun')}</div>

                ${field('Daerah Irigasi', currentDI, 18, 38, 60, 64)}
                ${field('Total L. Sawah Irigasi D.I', totalLuasDI, 18, 44, 60, 64)}
                ${field('Kabupaten', pData.kabupaten || '', 205, 38, 230, 234)}
                ${field('Pengamat', pData.pengamat || '', 205, 44, 230, 234)}
                ${field('Periode', report.bulan || key || '', 205, 50, 230, 234)}

                ${renderTable(pageRows, pageIndex, isLastPage)}
                ${isLastPage ? renderSignature() : ''}
            </section>
        `;
    };

    const root = document.createElement('div');
    root.id = 'siopi-official-print-root';
    root.className = 'siopi-official-print official-form-02p official-form-02p-batch';
    root.innerHTML = pages.map(renderPage).join('');
    document.body.appendChild(root);
    return root;
}

function buildOfficialPrint02aP(key = '') {
    const db02aP = getLS('02aP_' + currentDI) || {};
    const report = db02aP[key] || null;
    if (!report) return document.getElementById('subContent-02P-a') || document.getElementById('tabContentPem-02P');

    const pData = getProfilData(currentDI);
    const pengamatInfo = getPengamatSignatureInfo(pData);
    const tanggalLaporan = formatTanggalLaporan(report.updatedAt || report.createdAt || report.timestamp);
    const totalLuasDI = getTotalLuasDI01O(pData);
    const rows = Array.isArray(report.rows) ? report.rows : [];
    const rowsPerPage = 10;
    const pages = [];
    for (let i = 0; i < Math.max(rows.length, 1); i += rowsPerPage) {
        pages.push(rows.slice(i, i + rowsPerPage));
    }

    const field = (label, value, leftLabel, top, leftColon, leftValue) => `
        <div class="field-label" style="left:${leftLabel}mm; top:${top}mm;">${escapePrintValue(label)}</div>
        <div class="field-colon" style="left:${leftColon}mm; top:${top}mm;">:</div>
        <div class="field-value" style="left:${leftValue}mm; top:${top}mm;">${escapePrintValue(value)}</div>
    `;
    const rowValue = (row, col) => escapePrintValue(row?.[col] || '');
    const renderRows = (pageRows, pageIndex) => {
        const safeRows = pageRows.length > 0 ? pageRows : [{}];
        return safeRows.map((row, idx) => `
            <tr>
                <td>${pageIndex * rowsPerPage + idx + 1}</td>
                <td>${rowValue(row, 'tgl_lap')}</td>
                <td class="left">${rowValue(row, 'sal')}</td>
                <td class="left">${rowValue(row, 'bang')}</td>
                <td>${rowValue(row, 'arl')}</td>
                <td class="left wrap">${rowValue(row, 'uraian')}</td>
                <td class="left wrap">${rowValue(row, 'jenis_pekerjaan')}</td>
                <td>${rowValue(row, 'satuan')}</td>
                <td>${rowValue(row, 'volume')}</td>
                <td>${rowValue(row, 'prio')}</td>
                <td>${rowValue(row, 'pel_tgl')}</td>
                <td class="left">${rowValue(row, 'pel_instansi')}</td>
                <td>${rowValue(row, 'pel_metode')}</td>
                <td>${rowValue(row, 'pel_hippa')}</td>
            </tr>
        `).join('');
    };

    const renderTable = (pageRows, pageIndex) => `
        <table class="official-main-table">
            <colgroup>
                <col style="width:3.2%">
                <col style="width:6.5%">
                <col style="width:8.5%">
                <col style="width:9%">
                <col style="width:4.8%">
                <col style="width:15%">
                <col style="width:10%">
                <col style="width:4.5%">
                <col style="width:4.5%">
                <col style="width:4%">
                <col style="width:6.5%">
                <col style="width:8%">
                <col style="width:7.5%">
                <col style="width:8%">
            </colgroup>
            <thead>
                <tr>
                    <th rowspan="2">No</th>
                    <th rowspan="2">Tanggal<br>Pelaporan</th>
                    <th rowspan="2">Nama Saluran</th>
                    <th rowspan="2">Nama Bangunan<br>& Type</th>
                    <th rowspan="2">Areal<br>(ha)</th>
                    <th rowspan="2">Uraian Kerusakan<br>& Sketsa</th>
                    <th rowspan="2">Jenis Pekerjaan<br>Umum</th>
                    <th colspan="2">Banyaknya Pekerjaan</th>
                    <th rowspan="2">Prioritas</th>
                    <th colspan="4">Pelaksana Pemeliharaan</th>
                </tr>
                <tr>
                    <th>Satuan</th>
                    <th>Volume</th>
                    <th>Tanggal</th>
                    <th>Instansi<br>(Cab.Dinas/UPTD)</th>
                    <th>Metode</th>
                    <th>Partisipasi<br>HIPPA/GHIPPA</th>
                </tr>
            </thead>
            <tbody>
                ${renderRows(pageRows, pageIndex)}
            </tbody>
        </table>
    `;

    const renderSignature = () => `
        <div class="official-signatures single-signature">
            <div>
                <div>${escapePrintValue(tanggalLaporan || '')}</div>
                <div>Pengamat</div>
                <span class="signature-name">${escapePrintValue(pengamatInfo.nama || 'Nama')}</span>
                <div>NIP. ${escapePrintValue(pengamatInfo.nip || '')}</div>
            </div>
        </div>
    `;

    const renderPage = (pageRows, pageIndex) => {
        const isLastPage = pageIndex === pages.length - 1;
        const signatureTop = Math.min(170, 58 + (Math.max(pageRows.length, 1) * 9.2) + 12);
        return `
            <section class="official-form-02ap-page" style="--signature-top:${signatureTop}mm;">
                <div class="official-code">Blangko 02a - P</div>
                <h1 class="official-title">Buku Catatan Pemeliharaan Jaringan Irigasi</h1>
                <div class="official-subtitle">Periode Pelaksanaan ${escapePrintValue(report.periode || key || 'Bulan Tahun')}</div>

                ${field('Daerah Irigasi', currentDI, 18, 38, 60, 64)}
                ${field('Total L. Sawah Irigasi D.I', totalLuasDI, 18, 44, 60, 64)}
                ${field('Kabupaten', pData.kabupaten || '', 205, 38, 230, 234)}
                ${field('Pengamat', pData.pengamat || '', 205, 44, 230, 234)}
                ${field('Periode', report.periode || key || '', 205, 50, 230, 234)}

                ${renderTable(pageRows, pageIndex)}
                ${isLastPage ? renderSignature() : ''}
            </section>
        `;
    };

    const root = document.createElement('div');
    root.id = 'siopi-official-print-root';
    root.className = 'siopi-official-print official-form-02ap official-form-02ap-batch';
    root.innerHTML = pages.map(renderPage).join('');
    document.body.appendChild(root);
    return root;
}

function buildOfficialPrint03P(key = '') {
    const db03P = getLS('03P_' + currentDI) || {};
    const report = db03P[key] || null;
    if (!report) return document.getElementById('tabContentPem-03P');

    const pData = getProfilData(currentDI);
    const pengamatInfo = getPengamatSignatureInfo(pData);
    const tanggalLaporan = formatTanggalLaporan(report.updatedAt || report.createdAt || report.timestamp);
    const tanggalKejadian = formatTanggalLaporan(report.tgl || key);
    const totalLuasDI = getTotalLuasDI01O(pData);
    const rows = Array.isArray(report.rows) ? report.rows : [];
    const rowsPerPage = 12;
    const pages = [];
    for (let i = 0; i < Math.max(rows.length, 1); i += rowsPerPage) {
        pages.push(rows.slice(i, i + rowsPerPage));
    }

    const field = (label, value, leftLabel, top, leftColon, leftValue) => `
        <div class="field-label" style="left:${leftLabel}mm; top:${top}mm;">${escapePrintValue(label)}</div>
        <div class="field-colon" style="left:${leftColon}mm; top:${top}mm;">:</div>
        <div class="field-value" style="left:${leftValue}mm; top:${top}mm;">${escapePrintValue(value)}</div>
    `;
    const rowValue = (row, col) => escapePrintValue(row?.[col] || '');
    const renderRows = (pageRows, pageIndex) => {
        const safeRows = pageRows.length > 0 ? pageRows : [{}];
        return safeRows.map((row, idx) => `
            <tr>
                <td>${pageIndex * rowsPerPage + idx + 1}</td>
                <td class="left">${rowValue(row, 'sal')}</td>
                <td class="left">${rowValue(row, 'bang')}</td>
                <td class="left wrap">${rowValue(row, 'pyb')}</td>
                <td class="left wrap">${rowValue(row, 'jns')}</td>
                <td>${rowValue(row, 'tnh')}</td>
                <td>${rowValue(row, 'btu')}</td>
                <td>${rowValue(row, 'btn')}</td>
                <td>${rowValue(row, 'pnt')}</td>
                <td>${rowValue(row, 'grg')}</td>
                <td>${rowValue(row, 'lln')}</td>
                <td>${rowValue(row, 'arl')}</td>
                <td class="left wrap">${rowValue(row, 'tnd')}</td>
                <td class="left wrap">${rowValue(row, 'pbk_ip3a')}</td>
                <td class="left wrap">${rowValue(row, 'pbk_atas')}</td>
            </tr>
        `).join('');
    };

    const renderTable = (pageRows, pageIndex) => `
        <table class="official-main-table">
            <colgroup>
                <col style="width:3.5%">
                <col style="width:10%">
                <col style="width:10%">
                <col style="width:8%">
                <col style="width:8%">
                <col style="width:5.5%">
                <col style="width:5.5%">
                <col style="width:5.5%">
                <col style="width:5.5%">
                <col style="width:5.5%">
                <col style="width:5.5%">
                <col style="width:5.5%">
                <col style="width:9%">
                <col style="width:8%">
                <col style="width:10%">
            </colgroup>
            <thead>
                <tr>
                    <th rowspan="2">No</th>
                    <th rowspan="2">Nama Saluran</th>
                    <th rowspan="2">Nama Bangunan<br>dan Typenya</th>
                    <th rowspan="2">Penyebab<br>Kerusakan</th>
                    <th rowspan="2">Jenis<br>Kerusakan</th>
                    <th colspan="7">Perincian Kerusakan (Volume / Satuan)</th>
                    <th rowspan="2">Tindakan Darurat<br>yang Telah Dilakukan</th>
                    <th colspan="2">Perbaikan yang Masih Diperlukan</th>
                </tr>
                <tr>
                    <th>Tanah Tanggul<br>(m)</th>
                    <th>Pas. Batu<br>(m3)</th>
                    <th>Beton<br>(m3)</th>
                    <th>Pintu Air<br>(bh)</th>
                    <th>Gorong2<br>(d/l)</th>
                    <th>Lain-lain</th>
                    <th>Areal Terancam<br>(ha)</th>
                    <th>Oleh IP3A/<br>Pekarya</th>
                    <th>Usulan<br>ke Atas</th>
                </tr>
            </thead>
            <tbody>${renderRows(pageRows, pageIndex)}</tbody>
        </table>
    `;

    const renderSignature = () => `
        <div class="official-signatures single-signature">
            <div>
                <div>${escapePrintValue(tanggalLaporan || '')}</div>
                <div>Pengamat</div>
                <span class="signature-name">${escapePrintValue(pengamatInfo.nama || 'Nama')}</span>
                <div>NIP. ${escapePrintValue(pengamatInfo.nip || '')}</div>
            </div>
        </div>
    `;

    const renderPage = (pageRows, pageIndex) => {
        const isLastPage = pageIndex === pages.length - 1;
        const tableBottom = 64 + 13 + (Math.max(pageRows.length, 1) * 6.1);
        const signatureTop = Math.min(156, tableBottom + 8);
        return `
            <section class="official-form-03p-page" style="--signature-top:${signatureTop}mm;">
                <div class="official-code">Blangko 03 - P</div>
                <h1 class="official-title">Laporan Kerusakan Akibat Bencana</h1>
                <div class="official-subtitle">Kejadian Tanggal ${escapePrintValue(tanggalKejadian || report.tgl || key)}</div>

                ${field('Daerah Irigasi', currentDI, 18, 38, 62, 66)}
                ${field('Nomor Kode D.I', pData.kodeDI || '', 18, 44, 62, 66)}
                ${field('Total L. Sawah Irigasi D.I', totalLuasDI, 18, 50, 62, 66)}
                ${field('Kabupaten', pData.kabupaten || '', 205, 38, 230, 234)}
                ${field('Pengamat', pData.pengamat || '', 205, 44, 230, 234)}

                ${renderTable(pageRows, pageIndex)}
                ${isLastPage ? renderSignature() : ''}
            </section>
        `;
    };

    const root = document.createElement('div');
    root.id = 'siopi-official-print-root';
    root.className = 'siopi-official-print official-form-03p official-form-03p-batch';
    root.innerHTML = pages.map(renderPage).join('');
    document.body.appendChild(root);
    return root;
}

function buildOfficialPrint04P(key = '') {
    const db04P = getLS('04P_' + currentDI) || {};
    const report = db04P[key] || null;
    if (!report) return document.getElementById('tabContentPem-04P');

    const pData = getProfilData(currentDI);
    const tanggalLaporan = formatTanggalLaporan(report.updatedAt || report.createdAt || report.timestamp);
    const rows = Array.isArray(report.rows) ? report.rows : [];
    const rowsPerPage = 14;
    const pages = [];
    for (let i = 0; i < Math.max(rows.length, 1); i += rowsPerPage) {
        pages.push(rows.slice(i, i + rowsPerPage));
    }

    const field = (label, value, leftLabel, top, leftColon, leftValue) => `
        <div class="field-label" style="left:${leftLabel}mm; top:${top}mm;">${escapePrintValue(label)}</div>
        <div class="field-colon" style="left:${leftColon}mm; top:${top}mm;">:</div>
        <div class="field-value" style="left:${leftValue}mm; top:${top}mm;">${escapePrintValue(value)}</div>
    `;
    const rowValue = (row, col) => escapePrintValue(row?.[col] || '');
    const money04P = (value) => {
        const num = parseFloat(String(value ?? '').replace(',', '.'));
        if (!Number.isFinite(num) || num === 0) return '';
        return num.toLocaleString('id-ID');
    };
    const date04P = (value) => {
        if (!value) return '';
        return formatTanggalLaporan(value) || value;
    };
    const renderRows = (pageRows, pageIndex) => {
        const safeRows = pageRows.length > 0 ? pageRows : [{}];
        return safeRows.map((row, idx) => `
            <tr>
                <td>${pageIndex * rowsPerPage + idx + 1}</td>
                <td class="left">${rowValue(row, 'di')}</td>
                <td class="left wrap">${rowValue(row, 'sal_bang')}</td>
                <td class="left wrap">${rowValue(row, 'lok_uraian')}</td>
                <td class="left wrap">${rowValue(row, 'jns')}</td>
                <td>${rowValue(row, 'vol')}</td>
                <td class="right">${escapePrintValue(money04P(row?.b_upah))}</td>
                <td class="right">${escapePrintValue(money04P(row?.b_bahan))}</td>
                <td class="right">${escapePrintValue(money04P(row?.b_jml))}</td>
                <td>${escapePrintValue(date04P(row?.tgl_m))}</td>
                <td>${escapePrintValue(date04P(row?.tgl_s))}</td>
                <td class="left wrap">${rowValue(row, 'ket')}</td>
            </tr>
        `).join('');
    };
    const renderTable = (pageRows, pageIndex) => `
        <table class="official-main-table">
            <colgroup>
                <col style="width:4%">
                <col style="width:10%">
                <col style="width:13%">
                <col style="width:12%">
                <col style="width:14%">
                <col style="width:7%">
                <col style="width:8%">
                <col style="width:8%">
                <col style="width:9%">
                <col style="width:7%">
                <col style="width:7%">
                <col style="width:11%">
            </colgroup>
            <thead>
                <tr>
                    <th rowspan="2">No</th>
                    <th rowspan="2">Daerah<br>Irigasi</th>
                    <th colspan="2">Lokasi</th>
                    <th rowspan="2">Jenis Pekerjaan<br>Pemeliharaan</th>
                    <th rowspan="2">Tolak Ukur<br>Pekerjaan<br>(Bh/Km)</th>
                    <th colspan="3">Biaya (Rp)</th>
                    <th colspan="2">Jadwal Pelaksanaan</th>
                    <th rowspan="2">Keterangan</th>
                </tr>
                <tr>
                    <th>Nama Saluran<br>& Bangunan</th>
                    <th>Uraian</th>
                    <th>Upah</th>
                    <th>Bahan</th>
                    <th>Jumlah</th>
                    <th>Mulai</th>
                    <th>Selesai</th>
                </tr>
            </thead>
            <tbody>${renderRows(pageRows, pageIndex)}</tbody>
        </table>
    `;
    const renderSignature = () => `
        <div class="official-signatures single-signature">
            <div>
                <div>${escapePrintValue(tanggalLaporan || '')}</div>
                <div>${escapePrintValue(report.dinas || 'Dinas Pengairan / Balai PSDA')}</div>
                <span class="signature-name">Nama</span>
                <div>NIP.</div>
            </div>
        </div>
    `;
    const renderPage = (pageRows, pageIndex) => {
        const isLastPage = pageIndex === pages.length - 1;
        const tableBottom = 58 + 12 + (Math.max(pageRows.length, 1) * 6);
        const signatureTop = Math.min(160, tableBottom + 8);
        return `
            <section class="official-form-04p-page" style="--signature-top:${signatureTop}mm;">
                <div class="official-code">Blangko 04 - P</div>
                <h1 class="official-title">Program Pekerjaan Swakelola</h1>
                <div class="official-subtitle">Tahun Program ${escapePrintValue(report.tahun || key || '')}</div>

                ${field('Instansi Pelaksana', report.dinas || '', 18, 38, 58, 62)}
                ${field('Tahun Program', report.tahun || key || '', 18, 44, 58, 62)}

                ${renderTable(pageRows, pageIndex)}
                ${isLastPage ? renderSignature() : ''}
            </section>
        `;
    };

    const root = document.createElement('div');
    root.id = 'siopi-official-print-root';
    root.className = 'siopi-official-print official-form-04p official-form-04p-batch';
    root.innerHTML = pages.map(renderPage).join('');
    document.body.appendChild(root);
    return root;
}

function buildOfficialPrint05P(key = '') {
    const db05P = getLS('05P_' + currentDI) || {};
    const report = db05P[key] || null;
    if (!report) return document.getElementById('tabContentPem-05P');

    const tanggalLaporan = formatTanggalLaporan(report.updatedAt || report.createdAt || report.timestamp);
    const rows = Array.isArray(report.rows) ? report.rows : [];
    const rowsPerPage = 15;
    const pages = [];
    for (let i = 0; i < Math.max(rows.length, 1); i += rowsPerPage) {
        pages.push(rows.slice(i, i + rowsPerPage));
    }

    const field = (label, value, leftLabel, top, leftColon, leftValue) => `
        <div class="field-label" style="left:${leftLabel}mm; top:${top}mm;">${escapePrintValue(label)}</div>
        <div class="field-colon" style="left:${leftColon}mm; top:${top}mm;">:</div>
        <div class="field-value" style="left:${leftValue}mm; top:${top}mm;">${escapePrintValue(value)}</div>
    `;
    const rowValue = (row, col) => escapePrintValue(row?.[col] || '');
    const money05P = (value) => {
        const num = parseFloat(String(value ?? '').replace(',', '.'));
        if (!Number.isFinite(num) || num === 0) return '';
        return num.toLocaleString('id-ID');
    };
    const date05P = (value) => {
        if (!value) return '';
        return formatTanggalLaporan(value) || value;
    };
    const renderRows = (pageRows, pageIndex) => {
        const safeRows = pageRows.length > 0 ? pageRows : [{}];
        return safeRows.map((row, idx) => `
            <tr>
                <td>${pageIndex * rowsPerPage + idx + 1}</td>
                <td class="left">${rowValue(row, 'di')}</td>
                <td class="left wrap">${rowValue(row, 'sal_bang')}</td>
                <td class="left wrap">${rowValue(row, 'jns')}</td>
                <td class="left wrap">${rowValue(row, 'lok')}</td>
                <td>${rowValue(row, 'vol')}</td>
                <td class="right">${escapePrintValue(money05P(row?.biaya))}</td>
                <td>${escapePrintValue(date05P(row?.tgl_m))}</td>
                <td>${escapePrintValue(date05P(row?.tgl_s))}</td>
                <td class="left wrap">${rowValue(row, 'ket')}</td>
            </tr>
        `).join('');
    };
    const renderTable = (pageRows, pageIndex) => `
        <table class="official-main-table">
            <colgroup>
                <col style="width:4%">
                <col style="width:11%">
                <col style="width:18%">
                <col style="width:17%">
                <col style="width:12%">
                <col style="width:8%">
                <col style="width:10%">
                <col style="width:8%">
                <col style="width:8%">
                <col style="width:12%">
            </colgroup>
            <thead>
                <tr>
                    <th rowspan="2">No</th>
                    <th rowspan="2">Daerah<br>Irigasi</th>
                    <th rowspan="2">Nama Saluran<br>& Bangunan</th>
                    <th rowspan="2">Jenis Pekerjaan<br>Pemeliharaan</th>
                    <th rowspan="2">Lokasi</th>
                    <th rowspan="2">Tolak Ukur<br>Pekerjaan<br>(bh/km)</th>
                    <th rowspan="2">Biaya<br>(Rp)</th>
                    <th colspan="2">Jadwal Pelaksanaan</th>
                    <th rowspan="2">Keterangan</th>
                </tr>
                <tr>
                    <th>Mulai</th>
                    <th>Selesai</th>
                </tr>
            </thead>
            <tbody>${renderRows(pageRows, pageIndex)}</tbody>
        </table>
    `;
    const renderSignature = () => `
        <div class="official-signatures single-signature">
            <div>
                <div>${escapePrintValue(tanggalLaporan || '')}</div>
                <div>${escapePrintValue(report.dinas || 'Dinas Pengairan / Balai PSDA')}</div>
                <span class="signature-name">Nama</span>
                <div>NIP.</div>
            </div>
        </div>
    `;
    const renderPage = (pageRows, pageIndex) => {
        const isLastPage = pageIndex === pages.length - 1;
        const tableBottom = 58 + 12 + (Math.max(pageRows.length, 1) * 5.7);
        const signatureTop = Math.min(160, tableBottom + 8);
        return `
            <section class="official-form-05p-page" style="--signature-top:${signatureTop}mm;">
                <div class="official-code">Blangko 05 - P</div>
                <h1 class="official-title">Program Pekerjaan Kontraktual</h1>
                <div class="official-subtitle">Tahun Program ${escapePrintValue(report.tahun || key || '')}</div>

                ${field('Instansi Pelaksana', report.dinas || '', 18, 38, 58, 62)}
                ${field('Tahun Program', report.tahun || key || '', 18, 44, 58, 62)}

                ${renderTable(pageRows, pageIndex)}
                ${isLastPage ? renderSignature() : ''}
            </section>
        `;
    };

    const root = document.createElement('div');
    root.id = 'siopi-official-print-root';
    root.className = 'siopi-official-print official-form-05p official-form-05p-batch';
    root.innerHTML = pages.map(renderPage).join('');
    document.body.appendChild(root);
    return root;
}

function buildOfficialPrint06P(key = '') {
    const db06P = getLS('06P_' + currentDI) || {};
    const report = db06P[key] || null;
    if (!report) return document.getElementById('tabContentPem-06P');

    const pData = getProfilData(currentDI);
    const pengamatInfo = getPengamatSignatureInfo(pData);
    const juruInfo = getJuruSignatureInfo(pData, report.juru);
    const tanggalLaporan = formatTanggalLaporan(report.updatedAt || report.createdAt || report.timestamp);
    const rows = Array.isArray(report.rows) ? report.rows : [];
    const rowsPerPage = 12;
    const pages = [];
    for (let i = 0; i < Math.max(rows.length, 1); i += rowsPerPage) {
        pages.push(rows.slice(i, i + rowsPerPage));
    }

    const field = (label, value, leftLabel, top, leftColon, leftValue) => `
        <div class="field-label" style="left:${leftLabel}mm; top:${top}mm;">${escapePrintValue(label)}</div>
        <div class="field-colon" style="left:${leftColon}mm; top:${top}mm;">:</div>
        <div class="field-value" style="left:${leftValue}mm; top:${top}mm;">${escapePrintValue(value)}</div>
    `;
    const rowValue = (row, col) => escapePrintValue(row?.[col] || '');
    const renderRows = (pageRows, pageIndex) => {
        const safeRows = pageRows.length > 0 ? pageRows : [{}];
        return safeRows.map((row, idx) => `
            <tr>
                <td>${pageIndex * rowsPerPage + idx + 1}</td>
                <td class="left">${rowValue(row, 'sal')}</td>
                <td class="left">${rowValue(row, 'bang')}</td>
                <td>${rowValue(row, 'sp')}</td>
                <td>${rowValue(row, 'sl')}</td>
                <td>${rowValue(row, 'st')}</td>
                <td>${rowValue(row, 'stot')}</td>
                <td>${rowValue(row, 'bp')}</td>
                <td>${rowValue(row, 'bl')}</td>
                <td>${rowValue(row, 'bt')}</td>
                <td>${rowValue(row, 'bjml')}</td>
                <td>${rowValue(row, 'b_teer')}</td>
                <td>${rowValue(row, 'b_paslin')}</td>
                <td>${rowValue(row, 'b_solar')}</td>
                <td>${rowValue(row, 'b_oli20')}</td>
                <td>${rowValue(row, 'b_oli90')}</td>
                <td>${rowValue(row, 'b_amplas')}</td>
                <td>${rowValue(row, 'b_semen')}</td>
                <td>${rowValue(row, 'b_pasir')}</td>
                <td>${rowValue(row, 'b_batu')}</td>
                <td>${rowValue(row, 'b_kerikil')}</td>
                <td>${rowValue(row, 'b_urug')}</td>
                <td>${rowValue(row, 'b_paku')}</td>
                <td>${rowValue(row, 'b_sbaja')}</td>
                <td>${rowValue(row, 'b_lap')}</td>
                <td>${rowValue(row, 'b_kuas')}</td>
                <td class="left">${rowValue(row, 'b_lain')}</td>
                <td class="left wrap">${rowValue(row, 'ket')}</td>
            </tr>
        `).join('');
    };
    const renderTable = (pageRows, pageIndex) => `
        <table class="official-main-table">
            <colgroup>
                <col style="width:2.7%">
                <col style="width:7.5%">
                <col style="width:7.5%">
                ${Array.from({ length: 8 }, () => '<col style="width:3.1%">').join('')}
                ${Array.from({ length: 16 }, () => '<col style="width:3.05%">').join('')}
                <col style="width:5%">
            </colgroup>
            <thead>
                <tr>
                    <th rowspan="2">No</th>
                    <th rowspan="2">Nama Saluran</th>
                    <th rowspan="2">Nama Bangunan</th>
                    <th colspan="4">Saluran</th>
                    <th colspan="4">Bangunan</th>
                    <th colspan="16">Bahan yang Dibutuhkan</th>
                    <th rowspan="2">Ket.</th>
                </tr>
                <tr>
                    <th>P</th>
                    <th>L</th>
                    <th>T</th>
                    <th>Tot. LT</th>
                    <th>P</th>
                    <th>L</th>
                    <th>T</th>
                    <th>Jml. P</th>
                    <th>Teer</th>
                    <th>Paslin</th>
                    <th>Solar</th>
                    <th>Oli 20</th>
                    <th>Oli 90</th>
                    <th>Amplas</th>
                    <th>Semen</th>
                    <th>Pasir</th>
                    <th>Batu</th>
                    <th>Kerikil</th>
                    <th>Urug</th>
                    <th>Paku</th>
                    <th>S. Baja</th>
                    <th>Lap</th>
                    <th>Kuas</th>
                    <th>Lain</th>
                </tr>
            </thead>
            <tbody>${renderRows(pageRows, pageIndex)}</tbody>
        </table>
    `;
    const renderSignature = () => `
        <div class="official-signatures">
            <div>
                <div>${escapePrintValue(tanggalLaporan || '')}</div>
                <div>Pengamat</div>
                <span class="signature-name">${escapePrintValue(pengamatInfo.nama || 'Nama')}</span>
                <div>NIP. ${escapePrintValue(pengamatInfo.nip || '')}</div>
            </div>
        </div>
    `;
    const renderPage = (pageRows, pageIndex) => {
        const isLastPage = pageIndex === pages.length - 1;
        const tableBottom = 50 + 12 + (Math.max(pageRows.length, 1) * 4.5);
        const signatureTop = Math.min(164, tableBottom + 8);
        return `
            <section class="official-form-06p-page" style="--signature-top:${signatureTop}mm;">
                <div class="official-code">Blangko 06 - P</div>
                <h1 class="official-title">Daftar Kebutuhan Bahan Swakelola (Rutin)</h1>
                <div class="official-subtitle">Tahun ${escapePrintValue(report.tahun || '')}</div>

                ${field('Daerah Irigasi', currentDI, 18, 32, 55, 59)}
                ${field('Nomor Kode D.I', pData.kodeDI || '', 18, 38, 55, 59)}
                ${field('Total L. Sawah Irigasi D.I', getTotalLuasDI01O(pData), 18, 44, 55, 59)}
                ${field('Juru', report.juru || '', 205, 32, 235, 239)}
                ${field('Luas Areal Juru', report.luas || '', 205, 38, 235, 239)}

                ${renderTable(pageRows, pageIndex)}
                ${isLastPage ? renderSignature() : ''}
            </section>
        `;
    };

    const root = document.createElement('div');
    root.id = 'siopi-official-print-root';
    root.className = 'siopi-official-print official-form-06p official-form-06p-batch';
    root.innerHTML = pages.map(renderPage).join('');
    document.body.appendChild(root);
    return root;
}

function buildOfficialPrint07P(key = '') {
    const db07P = getLS('07P_' + currentDI) || {};
    const report = db07P[key] || null;
    if (!report) return document.getElementById('tabContentPem-07P');

    const pData = getProfilData(currentDI);
    const pengamatInfo = getPengamatSignatureInfo(pData);
    const tanggalLaporan = formatTanggalLaporan(report.updatedAt || report.createdAt || report.timestamp);
    const rows = Array.isArray(report.rows) ? report.rows : [];
    const rowsPerPage = 12;
    const pages = [];
    for (let i = 0; i < Math.max(rows.length, 1); i += rowsPerPage) {
        pages.push(rows.slice(i, i + rowsPerPage));
    }

    const field = (label, value, leftLabel, top, leftColon, leftValue) => `
        <div class="field-label" style="left:${leftLabel}mm; top:${top}mm;">${escapePrintValue(label)}</div>
        <div class="field-colon" style="left:${leftColon}mm; top:${top}mm;">:</div>
        <div class="field-value" style="left:${leftValue}mm; top:${top}mm;">${escapePrintValue(value)}</div>
    `;
    const rowValue = (row, col) => escapePrintValue(row?.[col] || '');
    const renderRows = (pageRows, pageIndex) => {
        const safeRows = pageRows.length > 0 ? pageRows : [{}];
        return safeRows.map((row, idx) => `
            <tr>
                <td>${pageIndex * rowsPerPage + idx + 1}</td>
                <td class="left">${rowValue(row, 'sal')}</td>
                <td class="left">${rowValue(row, 'bang')}</td>
                <td>${rowValue(row, 'sp')}</td>
                <td>${rowValue(row, 'sl')}</td>
                <td>${rowValue(row, 'st')}</td>
                <td>${rowValue(row, 'stot')}</td>
                <td>${rowValue(row, 'bp')}</td>
                <td>${rowValue(row, 'bl')}</td>
                <td>${rowValue(row, 'bt')}</td>
                <td>${rowValue(row, 'bjml')}</td>
                <td>${rowValue(row, 'b_cat')}</td>
                <td>${rowValue(row, 'b_teer')}</td>
                <td>${rowValue(row, 'b_amplas')}</td>
                <td>${rowValue(row, 'b_semen')}</td>
                <td>${rowValue(row, 'b_pasir')}</td>
                <td>${rowValue(row, 'b_batu')}</td>
                <td>${rowValue(row, 'b_kerikil')}</td>
                <td>${rowValue(row, 'b_turug')}</td>
                <td>${rowValue(row, 'b_purug')}</td>
                <td>${rowValue(row, 'b_paku')}</td>
                <td class="left">${rowValue(row, 'b_lain')}</td>
                <td>${rowValue(row, 't_tukang')}</td>
                <td>${rowValue(row, 't_pekerja')}</td>
                <td class="left wrap">${rowValue(row, 'ket')}</td>
            </tr>
        `).join('');
    };
    const renderTable = (pageRows, pageIndex) => `
        <table class="official-main-table">
            <colgroup>
                <col style="width:2.7%">
                <col style="width:7.4%">
                <col style="width:7.4%">
                ${Array.from({ length: 8 }, () => '<col style="width:3.35%">').join('')}
                ${Array.from({ length: 11 }, () => '<col style="width:3.4%">').join('')}
                ${Array.from({ length: 2 }, () => '<col style="width:3.5%">').join('')}
                <col style="width:6%">
            </colgroup>
            <thead>
                <tr>
                    <th rowspan="2">No</th>
                    <th rowspan="2">Nama Saluran</th>
                    <th rowspan="2">Nama Bangunan</th>
                    <th colspan="4">Saluran</th>
                    <th colspan="4">Bangunan</th>
                    <th colspan="11">Bahan yang Dibutuhkan</th>
                    <th colspan="2">Kebutuhan Tenaga</th>
                    <th rowspan="2">Ket.</th>
                </tr>
                <tr>
                    <th>P</th>
                    <th>L</th>
                    <th>T</th>
                    <th>Tot. LT</th>
                    <th>P</th>
                    <th>L</th>
                    <th>T</th>
                    <th>Jml. P</th>
                    <th>Cat</th>
                    <th>Teer</th>
                    <th>Amplas</th>
                    <th>Semen</th>
                    <th>Pasir</th>
                    <th>Batu</th>
                    <th>Kerikil</th>
                    <th>T. Urug</th>
                    <th>P. Urug</th>
                    <th>Paku</th>
                    <th>Lain</th>
                    <th>Tukang</th>
                    <th>Pekerja</th>
                </tr>
            </thead>
            <tbody>${renderRows(pageRows, pageIndex)}</tbody>
        </table>
    `;
    const renderSignature = () => `
        <div class="official-signatures">
            <div>
                <div>${escapePrintValue(tanggalLaporan || '')}</div>
                <div>Pengamat</div>
                <span class="signature-name">${escapePrintValue(pengamatInfo.nama || 'Nama')}</span>
                <div>NIP. ${escapePrintValue(pengamatInfo.nip || '')}</div>
            </div>
        </div>
    `;
    const renderPage = (pageRows, pageIndex) => {
        const isLastPage = pageIndex === pages.length - 1;
        const tableBottom = 56 + 12 + (Math.max(pageRows.length, 1) * 4.5);
        const signatureTop = Math.min(164, tableBottom + 8);
        return `
            <section class="official-form-07p-page" style="--signature-top:${signatureTop}mm;">
                <div class="official-code">Blangko 07 - P</div>
                <h1 class="official-title">Daftar Kebutuhan Bahan Swakelola dan Tenaga Kerja (Berkala)</h1>
                <div class="official-subtitle">Tahun ${escapePrintValue(report.tahun || '')}</div>

                ${field('Daerah Irigasi', currentDI, 18, 32, 55, 59)}
                ${field('Nomor Kode D.I', pData.kodeDI || '', 18, 38, 55, 59)}
                ${field('Total L. Sawah Irigasi D.I', getTotalLuasDI01O(pData), 18, 44, 55, 59)}
                ${field('Juru', report.juru || '', 205, 32, 235, 239)}
                ${field('Luas Areal Juru', report.luas || '', 205, 38, 235, 239)}
                ${field('Kabupaten', pData.kabupaten || '', 205, 44, 235, 239)}
                ${field('Pengamat', pData.pengamat || '', 205, 50, 235, 239)}

                ${renderTable(pageRows, pageIndex)}
                ${isLastPage ? renderSignature() : ''}
            </section>
        `;
    };

    const root = document.createElement('div');
    root.id = 'siopi-official-print-root';
    root.className = 'siopi-official-print official-form-07p official-form-07p-batch';
    root.innerHTML = pages.map(renderPage).join('');
    document.body.appendChild(root);
    return root;
}

function buildOfficialPrint08P(key = '') {
    const db08P = getLS('08P_' + currentDI) || {};
    const report = db08P[key] || null;
    if (!report) return document.getElementById('tabContentPem-08P');

    const pData = getProfilData(currentDI);
    const pengamatInfo = getPengamatSignatureInfo(pData);
    const firstJuruName = (pData.jurus || []).map(item => typeof item === 'string' ? item : item?.nama).find(Boolean) || '';
    const juruInfo = getJuruSignatureInfo(pData, firstJuruName);
    const tanggalLaporan = formatTanggalLaporan(report.updatedAt || report.createdAt || report.timestamp);
    const periodeLaporan = [formatTanggalPanjang01O(report.tglMulai), formatTanggalPanjang01O(report.tglSelesai)].filter(Boolean).join(' s/d ');
    const rows = Array.isArray(report.rows) ? report.rows : [];
    const rowsPerPage = 14;
    const pages = [];
    for (let i = 0; i < Math.max(rows.length, 1); i += rowsPerPage) {
        pages.push(rows.slice(i, i + rowsPerPage));
    }

    const field = (label, value, leftLabel, top, leftColon, leftValue) => `
        <div class="field-label" style="left:${leftLabel}mm; top:${top}mm;">${escapePrintValue(label)}</div>
        <div class="field-colon" style="left:${leftColon}mm; top:${top}mm;">:</div>
        <div class="field-value" style="left:${leftValue}mm; top:${top}mm;">${escapePrintValue(value)}</div>
    `;
    const rowValue = (row, col) => escapePrintValue(row?.[col] || '');
    const renderRows = (pageRows, pageIndex) => {
        const safeRows = pageRows.length > 0 ? pageRows : [{}];
        return safeRows.map((row, idx) => `
            <tr>
                <td>${pageIndex * rowsPerPage + idx + 1}</td>
                <td class="left">${rowValue(row, 'uraian')}</td>
                <td>${rowValue(row, 't_vol')}</td>
                <td>${rowValue(row, 't_rp')}</td>
                <td>${rowValue(row, 'l_vol')}</td>
                <td>${rowValue(row, 'l_rp')}</td>
                <td>${rowValue(row, 'i_vol')}</td>
                <td>${rowValue(row, 'i_rp')}</td>
                <td>${rowValue(row, 'sd_vol')}</td>
                <td>${rowValue(row, 'sd_rp')}</td>
                <td>${rowValue(row, 'sd_persen')}</td>
                <td class="left">${rowValue(row, 'ket')}</td>
            </tr>
        `).join('');
    };
    const renderTable = (pageRows, pageIndex) => `
        <table class="official-main-table">
            <colgroup>
                <col style="width:4%">
                <col style="width:24%">
                ${Array.from({ length: 2 }, () => '<col style="width:8%">').join('')}
                ${Array.from({ length: 2 }, () => '<col style="width:8%">').join('')}
                ${Array.from({ length: 2 }, () => '<col style="width:8%">').join('')}
                <col style="width:8%">
                <col style="width:8%">
                <col style="width:6%">
                <col style="width:10%">
            </colgroup>
            <thead>
                <tr>
                    <th rowspan="2">No</th>
                    <th rowspan="2">Uraian Pekerjaan</th>
                    <th colspan="2">Target Fisik / Plafond Biaya</th>
                    <th colspan="2">Progres Bulan Lalu</th>
                    <th colspan="2">Progres Bulan Ini</th>
                    <th colspan="3">Progres s/d Bulan Ini</th>
                    <th rowspan="2">Ket.</th>
                </tr>
                <tr>
                    <th>Volume</th>
                    <th>Biaya (Rp)</th>
                    <th>Volume</th>
                    <th>Biaya (Rp)</th>
                    <th>Volume</th>
                    <th>Biaya (Rp)</th>
                    <th>Volume</th>
                    <th>Biaya (Rp)</th>
                    <th>%</th>
                </tr>
            </thead>
            <tbody>${renderRows(pageRows, pageIndex)}</tbody>
        </table>
    `;
    const renderSignature = () => `
        <div class="official-signatures">
            <div class="signature-known">Mengetahui,</div>
            <div>
                <div>&nbsp;</div>
                <div>Pengamat</div>
                <span class="signature-name">${escapePrintValue(pengamatInfo.nama || 'Nama')}</span>
                <div>NIP. ${escapePrintValue(pengamatInfo.nip || '')}</div>
            </div>
            <div>
                <div>&nbsp;</div>
                <div>Juru</div>
                <span class="signature-name">${escapePrintValue(juruInfo.nama || 'Nama')}</span>
                <div>NIP. ${escapePrintValue(juruInfo.nip || '')}</div>
            </div>
            <div>
                <div>${escapePrintValue(tanggalLaporan || '')}</div>
                <div>Pelaksana</div>
                <span class="signature-name">${escapePrintValue(report.pelaksana || 'Nama')}</span>
                <div>&nbsp;</div>
            </div>
        </div>
    `;
    const renderPage = (pageRows, pageIndex) => {
        const isLastPage = pageIndex === pages.length - 1;
        const tableBottom = 48 + 13 + (Math.max(pageRows.length, 1) * 5.2);
        const signatureTop = Math.min(154, tableBottom + 8);
        return `
            <section class="official-form-08p-page" style="--signature-top:${signatureTop}mm;">
                <div class="official-code">Blangko 08 - P</div>
                <h1 class="official-title">Laporan Bulanan Pelaksanaan Pekerjaan Swakelola</h1>

                ${field('Pelaksana Pekerjaan', report.pelaksana || '', 18, 28, 60, 64)}
                ${field('Nama Pekerjaan', report.pekerjaan || '', 18, 34, 60, 64)}
                ${field('Daerah Irigasi', currentDI, 165, 28, 200, 204)}
                ${field('Periode Laporan', periodeLaporan, 165, 34, 200, 204)}

                ${renderTable(pageRows, pageIndex)}
                ${isLastPage ? renderSignature() : ''}
            </section>
        `;
    };

    const root = document.createElement('div');
    root.id = 'siopi-official-print-root';
    root.className = 'siopi-official-print official-form-08p official-form-08p-batch';
    root.innerHTML = pages.map(renderPage).join('');
    document.body.appendChild(root);
    return root;
}

function buildOfficialPrint09P(key = '') {
    const db09P = getLS('09P_' + currentDI) || {};
    const report = db09P[key] || null;
    if (!report) return document.getElementById('tabContentPem-09P');

    const rows = Array.isArray(report.rows) ? report.rows : [];
    const rowsPerPage = 16;
    const pages = [];
    for (let i = 0; i < Math.max(rows.length, 1); i += rowsPerPage) {
        pages.push(rows.slice(i, i + rowsPerPage));
    }

    const namaBulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"][parseInt(report.bulan, 10) - 1] || report.bulan || '';
    const periodeLaporan = [namaBulan, report.tahun].filter(Boolean).join(' ');
    const tanggalLaporan = formatTanggalLaporan(report.updatedAt || report.createdAt || report.timestamp);
    const kepalaInfo = {
        nama: report.kepala || report.kepalaInstansi || report.kepala_dinas || 'Nama',
        nip: report.nipKepala || report.nip_kepala || ''
    };

    const field = (label, value, leftLabel, top, leftColon, leftValue) => `
        <div class="field-label" style="left:${leftLabel}mm; top:${top}mm;">${escapePrintValue(label)}</div>
        <div class="field-colon" style="left:${leftColon}mm; top:${top}mm;">:</div>
        <div class="field-value" style="left:${leftValue}mm; top:${top}mm;">${escapePrintValue(value)}</div>
    `;
    const rowValue = (row, col) => escapePrintValue(row?.[col] || '');
    const renderRows = (pageRows, pageIndex) => {
        const safeRows = pageRows.length > 0 ? pageRows : [{}];
        return safeRows.map((row, idx) => `
            <tr>
                <td>${pageIndex * rowsPerPage + idx + 1}</td>
                <td class="left">${rowValue(row, 'paket')}</td>
                <td>${rowValue(row, 'a_rp')}</td>
                <td>${rowValue(row, 'b_bobot')}</td>
                <td>${rowValue(row, 'c_rp')}</td>
                <td>${rowValue(row, 'd_persen')}</td>
                <td>${rowValue(row, 'e_fisik')}</td>
                <td>${rowValue(row, 'tertimbang')}</td>
                <td class="left">${rowValue(row, 'ket')}</td>
            </tr>
        `).join('');
    };
    const renderTable = (pageRows, pageIndex) => `
        <table class="official-main-table">
            <colgroup>
                <col style="width:4%">
                <col style="width:24%">
                <col style="width:13%">
                <col style="width:8%">
                <col style="width:13%">
                <col style="width:8%">
                <col style="width:10%">
                <col style="width:9%">
                <col style="width:11%">
            </colgroup>
            <thead>
                <tr>
                    <th rowspan="2">No</th>
                    <th rowspan="2">Paket Pekerjaan</th>
                    <th colspan="2">Biaya Menurut DIPA/DASK</th>
                    <th colspan="3">Realisasi Menurut Kontrak</th>
                    <th rowspan="2">Progres<br>Tertimbang (%)<br>b x d x e</th>
                    <th rowspan="2">Ket.</th>
                </tr>
                <tr>
                    <th>a. Biaya (Rp)</th>
                    <th>b. Bobot (%)</th>
                    <th>c. Biaya (Rp)</th>
                    <th>d. % thd DIPA</th>
                    <th>e. Progres Fisik (%)</th>
                </tr>
            </thead>
            <tbody>${renderRows(pageRows, pageIndex)}</tbody>
        </table>
    `;
    const renderSignature = () => `
        <div class="official-signatures">
            <div>
                <div>${escapePrintValue(tanggalLaporan || '')}</div>
                <div>Kepala Instansi Pelaksana</div>
                <span class="signature-name">${escapePrintValue(kepalaInfo.nama || 'Nama')}</span>
                <div>NIP. ${escapePrintValue(kepalaInfo.nip || '')}</div>
            </div>
        </div>
    `;
    const renderPage = (pageRows, pageIndex) => {
        const isLastPage = pageIndex === pages.length - 1;
        const tableBottom = 44 + 13 + (Math.max(pageRows.length, 1) * 5.2);
        const signatureTop = Math.min(154, tableBottom + 8);
        return `
            <section class="official-form-09p-page" style="--signature-top:${signatureTop}mm;">
                <div class="official-code">Blangko 09 - P</div>
                <h1 class="official-title">Laporan Bulanan Realisasi Pekerjaan Kontraktual</h1>

                ${field('Instansi Pelaksana', report.dinas || '', 18, 28, 50, 54)}
                ${field('Periode Laporan', periodeLaporan, 18, 34, 50, 54)}

                ${renderTable(pageRows, pageIndex)}
                ${isLastPage ? renderSignature() : ''}
            </section>
        `;
    };

    const root = document.createElement('div');
    root.id = 'siopi-official-print-root';
    root.className = 'siopi-official-print official-form-09p official-form-09p-batch';
    root.innerHTML = pages.map(renderPage).join('');
    document.body.appendChild(root);
    return root;
}

function buildOfficialPrint10P(key = '') {
    const db10P = getLS('10P_' + currentDI) || {};
    const report = db10P[key] || null;
    if (!report) return document.getElementById('tabContentPem-10P');

    const rows = Array.isArray(report.rows) ? report.rows : [];
    const rowsPerPage = 15;
    const pages = [];
    for (let i = 0; i < Math.max(rows.length, 1); i += rowsPerPage) {
        pages.push(rows.slice(i, i + rowsPerPage));
    }

    const tanggalLaporan = formatTanggalLaporan(report.updatedAt || report.createdAt || report.timestamp);
    const kepalaInfo = {
        nama: report.kepala || report.kepalaInstansi || report.kepala_dinas || 'Nama',
        nip: report.nipKepala || report.nip_kepala || ''
    };

    const field = (label, value, leftLabel, top, leftColon, leftValue) => `
        <div class="field-label" style="left:${leftLabel}mm; top:${top}mm;">${escapePrintValue(label)}</div>
        <div class="field-colon" style="left:${leftColon}mm; top:${top}mm;">:</div>
        <div class="field-value" style="left:${leftValue}mm; top:${top}mm;">${escapePrintValue(value)}</div>
    `;
    const rowValue = (row, col) => escapePrintValue(row?.[col] || '');
    const renderRows = (pageRows, pageIndex) => {
        const safeRows = pageRows.length > 0 ? pageRows : [{}];
        return safeRows.map((row, idx) => `
            <tr>
                <td>${pageIndex * rowsPerPage + idx + 1}</td>
                <td class="left">${rowValue(row, 'paket')}</td>
                <td class="left">${rowValue(row, 'jaringan')}</td>
                <td>${rowValue(row, 't_fisik')}</td>
                <td>${rowValue(row, 't_rp')}</td>
                <td class="left">${rowValue(row, 'u_surat')}</td>
                <td>${escapePrintValue(formatTanggalCetak01O(row?.u_tgl_m) || row?.u_tgl_m || '')}</td>
                <td>${escapePrintValue(formatTanggalCetak01O(row?.u_tgl_s) || row?.u_tgl_s || '')}</td>
                <td>${rowValue(row, 'r_fisik')}</td>
                <td>${rowValue(row, 'r_rp')}</td>
                <td class="left">${rowValue(row, 'spj')}</td>
                <td class="left">${rowValue(row, 'ket')}</td>
            </tr>
        `).join('');
    };
    const renderTable = (pageRows, pageIndex) => `
        <table class="official-main-table">
            <colgroup>
                <col style="width:3.8%">
                <col style="width:15%">
                <col style="width:14%">
                <col style="width:7%">
                <col style="width:9%">
                <col style="width:12%">
                <col style="width:7.5%">
                <col style="width:7.5%">
                <col style="width:7%">
                <col style="width:9%">
                <col style="width:8%">
                <col style="width:10.2%">
            </colgroup>
            <thead>
                <tr>
                    <th rowspan="2">No</th>
                    <th rowspan="2">Paket Pekerjaan</th>
                    <th rowspan="2">Jaringan Irigasi /<br>Lokasi Paket</th>
                    <th colspan="2">Target Perencanaan</th>
                    <th colspan="5">Uraian Realisasi Pekerjaan</th>
                    <th rowspan="2">SPJ</th>
                    <th rowspan="2">Ket.</th>
                </tr>
                <tr>
                    <th>Fisik</th>
                    <th>Biaya (Rp)</th>
                    <th>No & Tgl Surat Penugasan</th>
                    <th>Tgl Mulai</th>
                    <th>Tgl Selesai</th>
                    <th>Real Fisik</th>
                    <th>Real Biaya (Rp)</th>
                </tr>
            </thead>
            <tbody>${renderRows(pageRows, pageIndex)}</tbody>
        </table>
    `;
    const renderSignature = () => `
        <div class="official-signatures">
            <div>
                <div>${escapePrintValue(tanggalLaporan || '')}</div>
                <div>Kepala Instansi Pelaksana</div>
                <span class="signature-name">${escapePrintValue(kepalaInfo.nama || 'Nama')}</span>
                <div>NIP. ${escapePrintValue(kepalaInfo.nip || '')}</div>
            </div>
        </div>
    `;
    const renderPage = (pageRows, pageIndex) => {
        const isLastPage = pageIndex === pages.length - 1;
        const tableBottom = 44 + 13 + (Math.max(pageRows.length, 1) * 5.2);
        const signatureTop = Math.min(154, tableBottom + 8);
        return `
            <section class="official-form-10p-page" style="--signature-top:${signatureTop}mm;">
                <div class="official-code">Blangko 10 - P</div>
                <h1 class="official-title">Laporan Tahunan Realisasi Pekerjaan Pemeliharaan</h1>

                ${field('Instansi Pelaksana', report.dinas || '', 18, 28, 50, 54)}
                ${field('Tahun Anggaran', report.tahun || key || '', 18, 34, 50, 54)}

                ${renderTable(pageRows, pageIndex)}
                ${isLastPage ? renderSignature() : ''}
            </section>
        `;
    };

    const root = document.createElement('div');
    root.id = 'siopi-official-print-root';
    root.className = 'siopi-official-print official-form-10p official-form-10p-batch';
    root.innerHTML = pages.map(renderPage).join('');
    document.body.appendChild(root);
    return root;
}

function buildOfficialPrint01O(key = '') {
    const savedData = getLS('01O_' + currentDI) || {};
    const bendung = key || document.getElementById('o1-bendung-select')?.value || '';
    if (!bendung) return document.getElementById('tabContent-01O');

    const pData = getProfilData(currentDI);
    const report = savedData[bendung] || null;
    const meta = getBendungMeta01O(bendung, pData);
    const valuesFor01O = (idx) => ['u1', 'u2', 'u3', 'k1', 'k2', 'k3']
        .map(col => escapePrintValue(getReportTableValue01O(report, col, idx)));
    const dataCells01O = (idx) => valuesFor01O(idx)
        .map(value => `<td class="center">${value}</td>`)
        .join('');
    const simpleRow01O = (label, idx) => `
        <tr>
            <td colspan="2" class="center">${escapePrintValue(label)}</td>
            ${dataCells01O(idx)}
        </tr>
    `;

    const rowsHtml = [
        simpleRow01O('Padi', 0),
        `
            <tr>
                <td rowspan="2" class="center">Tebu</td>
                <td class="center">ADA</td>
                ${dataCells01O(1)}
            </tr>
            <tr>
                <td class="center">YAD</td>
                ${dataCells01O(2)}
            </tr>
        `,
        simpleRow01O('Palawija', 3),
        simpleRow01O('Keperluan lain', 4),
        simpleRow01O('Bero', 5),
        simpleRow01O('Luas sawah irigasi', 6),
        simpleRow01O('Golongan Tanam', 7),
        simpleRow01O('Tgl Pengolahan Tanah', 8)
    ].join('');

    const root = document.createElement('div');
    root.id = 'siopi-official-print-root';
    root.className = 'siopi-official-print official-form-01o';
    root.style.setProperty('--signature-top', '190mm');
    const kasieInfo01 = getKasieSignatureInfo(pData);
    const pengamatInfo01 = getPengamatSignatureInfo(pData);
    const tanggalLaporan01 = formatTanggalLaporan(report?.updatedAt || report?.createdAt || report?.timestamp || getReportValue01O(report, 'tglKeputusan') || getReportValue01O(report, 'tglUsulan'));
    const field = (label, value, leftLabel, top, leftColon, leftValue) => `
        <div class="field-label" style="left:${leftLabel}mm; top:${top}mm;">${escapePrintValue(label)}</div>
        <div class="field-colon" style="left:${leftColon}mm; top:${top}mm;">:</div>
        <div class="field-value" style="left:${leftValue}mm; top:${top}mm;">${escapePrintValue(value)}</div>
    `;

    root.innerHTML = `
        <div class="official-code">Blangko 01 - O</div>
        <h1 class="official-title">Usulan dan Keputusan Luas Tanam Per Daerah Irigasi</h1>

        ${field('Daerah irigasi', currentDI, 22, 39, 54, 58)}
        ${field('No. Kode DI', pData.kodeDI || getPrintTextValue('o1-kodeDI'), 22, 47, 54, 58)}
        ${field('Total L. Sawah D.I', getTotalLuasDI01O(pData), 22, 55, 54, 58)}
        ${field('Bendung/Pngmbln', bendung, 22, 63, 54, 58)}
        ${field('Total L. Sawah', meta.luas, 22, 71, 54, 58)}
        ${field('Periode Masa Tanam', getReportValue01O(report, 'periode'), 22, 79, 54, 58)}
        ${field('MT 1', getReportValue01O(report, 'mt1'), 57, 89, 67, 71)}
        ${field('MT 2', getReportValue01O(report, 'mt2'), 57, 97, 67, 71)}
        ${field('MT 3', getReportValue01O(report, 'mt3'), 57, 105, 67, 71)}

        ${field('Nama Org. IP3A/GP3A', meta.p3a, 119, 39, 160, 164)}
        ${field('Pengamat', pData.pengamat || getPrintTextValue('o1-pengamat'), 119, 47, 160, 164)}
        ${field('Kecamatan', meta.kecamatan, 119, 55, 160, 164)}
        ${field('Kabupaten', pData.kabupaten || getPrintTextValue('o1-kabupaten'), 119, 63, 160, 164)}
        ${field('Juru', meta.juru, 119, 71, 160, 164)}

        <table class="official-main-table">
            <colgroup>
                <col style="width: 22%">
                <col style="width: 8%">
                <col style="width: 11.66%">
                <col style="width: 11.66%">
                <col style="width: 11.66%">
                <col style="width: 11.66%">
                <col style="width: 11.66%">
                <col style="width: 11.70%">
            </colgroup>
            <thead>
                <tr>
                    <th colspan="2" rowspan="2" class="center">Jenis Tanaman & Lain-lain</th>
                    <th colspan="3" class="center">1) Usulan IP3A/GP3A (ha)</th>
                    <th colspan="3" class="center">2) Keputusan Komisi Irigasi Kab. (ha)</th>
                </tr>
                <tr>
                    <th class="center">MT1</th>
                    <th class="center">MT2</th>
                    <th class="center">MT3</th>
                    <th class="center">MT1</th>
                    <th class="center">MT2</th>
                    <th class="center">MT3</th>
                </tr>
                <tr>
                    <th colspan="2" class="center">1</th>
                    <th class="center">2</th>
                    <th class="center">3</th>
                    <th class="center">4</th>
                    <th class="center">5</th>
                    <th class="center">6</th>
                    <th class="center">7</th>
                </tr>
            </thead>
            <tbody>
                ${rowsHtml}
            </tbody>
        </table>

        <div class="official-signatures">
            <div>
                <div>Mengetahui,</div>
                <div>Kasi OP Wil. Kabupaten</div>
                <span class="signature-name">${escapePrintValue(kasieInfo01.nama || 'Nama')}</span>
                <div>NIP. ${escapePrintValue(kasieInfo01.nip || '')}</div>
            </div>
            <div>
                <div>${escapePrintValue(tanggalLaporan01 || '')}</div>
                <div>Pengamat</div>
                <span class="signature-name">${escapePrintValue(pengamatInfo01.nama || 'Nama')}</span>
                <div>NIP. ${escapePrintValue(pengamatInfo01.nip || '')}</div>
            </div>
        </div>
    `;

    document.body.appendChild(root);
    return root;
}

function buildOfficialPrint02O(key = '') {
    const mt = key || document.getElementById('o2-mt-select')?.value || '';
    if (!mt) return null;

    const saved02 = getLS('02O_' + currentDI) || {};
    const report02 = saved02[mt] || {};
    const o1Data = getLS('01O_' + currentDI) || {};
    const pData = getProfilData(currentDI);
    const keys = Object.keys(o1Data).sort();
    const mtProp = mt.toLowerCase();
    const valProp = mt.slice(-1);
    const periodeUtama = keys.find(k => o1Data[k]?.periode)?.toString() ? o1Data[keys.find(k => o1Data[k]?.periode)].periode : '';
    const periodeMT = report02.periode || keys.map(k => o1Data[k]?.[mtProp]).find(Boolean) || '';
    const db03 = getLS('03O_' + currentDI) || {};
    const arsip03 = db03[periodeUtama] || { data: {} };

    const rowCells = keys.map((bendungNama, idx) => {
        const rep = o1Data[bendungNama] || {};
        const table = rep.table || [];
        const meta = getBendungAreaMeta(bendungNama, pData);
        const savedDates = report02.data?.[bendungNama] || {};
        const keputusan03 = arsip03.data?.[bendungNama] || {};
        const getRowVal = (rowIdx, type) => getOfficialValue02O(table[rowIdx]?.[type + valProp]);
        const uVals = [0, 1, 2, 3, 4, 5].map(rowIdx => parseFloat(table[rowIdx]?.['u' + valProp]) || 0);
        const kVals = [0, 1, 2, 3, 4, 5].map(rowIdx => parseFloat(table[rowIdx]?.['k' + valProp]) || 0);
        const sumU = uVals.reduce((a, b) => a + b, 0);
        const sumK = kVals.reduce((a, b) => a + b, 0);
        const golongan = keputusan03.golongan || table[7]?.['k' + valProp] || '';
        const mulai = savedDates.mulai || keputusan03['tgl-mulai'] || '';
        const selesai = savedDates.selesai || keputusan03['tgl-selesai'] || '';

        return `
            <tr>
                <td>${idx + 1}</td>
                <td class="left">${escapePrintValue(bendungNama)}</td>
                <td class="left">${escapePrintValue(meta.kecamatan)}</td>
                <td>${escapePrintValue(meta.luas)}</td>
                <td>${escapePrintValue(getRowVal(0, 'u'))}</td>
                <td>${escapePrintValue(getRowVal(1, 'u'))}</td>
                <td>${escapePrintValue(getRowVal(2, 'u'))}</td>
                <td>${escapePrintValue(getRowVal(3, 'u'))}</td>
                <td>${escapePrintValue(getRowVal(4, 'u'))}</td>
                <td>${escapePrintValue(getRowVal(5, 'u'))}</td>
                <td>${sumU > 0 ? getOfficialValue02O(sumU) : ''}</td>
                <td>${escapePrintValue(getRowVal(0, 'k'))}</td>
                <td>${escapePrintValue(getRowVal(1, 'k'))}</td>
                <td>${escapePrintValue(getRowVal(2, 'k'))}</td>
                <td>${escapePrintValue(getRowVal(3, 'k'))}</td>
                <td>${escapePrintValue(getRowVal(4, 'k'))}</td>
                <td>${escapePrintValue(getRowVal(5, 'k'))}</td>
                <td>${sumK > 0 ? getOfficialValue02O(sumK) : ''}</td>
                <td>${escapePrintValue(golongan)}</td>
                <td>${escapePrintValue(formatTanggalCetak01O(mulai))}</td>
                <td>${escapePrintValue(formatTanggalCetak01O(selesai))}</td>
            </tr>
        `;
    }).join('');

    const totalArea = keys.reduce((sum, bendungNama) => {
        const meta = getBendungAreaMeta(bendungNama, pData);
        return sum + (parseFloat(meta.luas) || 0);
    }, 0);

    const field = (label, value, leftLabel, top, leftColon, leftValue) => `
        <div class="field-label" style="left:${leftLabel}mm; top:${top}mm;">${escapePrintValue(label)}</div>
        <div class="field-colon" style="left:${leftColon}mm; top:${top}mm;">:</div>
        <div class="field-value" style="left:${leftValue}mm; top:${top}mm;">${escapePrintValue(value)}</div>
    `;

    const root = document.createElement('div');
    root.id = 'siopi-official-print-root';
    root.className = 'siopi-official-print official-form-02o';
    const signatureTop = Math.min(156, 47 + 20 + ((keys.length || 1) + 1) * 5 + 8);
    root.style.setProperty('--signature-top', `${signatureTop}mm`);
    root.innerHTML = `
        <div class="official-code">Blangko 02 - O</div>
        <h1 class="official-title">Rencana Tanam Per Wilayah Mantri/Juru Per Masa Tanam</h1>

        ${field('Daerah irigasi', currentDI, 18, 27, 43, 46)}
        ${field('No. Kode DI', pData.kodeDI || '', 18, 32, 43, 46)}
        ${field('Total L. Sawah D.I', getTotalLuasDI01O(pData), 18, 37, 43, 46)}
        ${field('Periode Masa Tanam', `${periodeMT} (${mt})`, 18, 43, 43, 46)}
        ${field('Pengamat', pData.pengamat || '', 170, 27, 193, 196)}
        ${field('Kabupaten/Kota', pData.kabupaten || '', 170, 32, 193, 196)}

        <table class="official-main-table">
            <colgroup>
                <col style="width: 3%">
                <col style="width: 12%">
                <col style="width: 9%">
                <col style="width: 5%">
                ${Array.from({ length: 17 }).map(() => '<col style="width: 4.17%">').join('')}
            </colgroup>
            <thead>
                <tr>
                    <th rowspan="3">No</th>
                    <th rowspan="3">Nama Wil. Kerja<br>Mantri/Juru</th>
                    <th rowspan="3">Kecamatan</th>
                    <th rowspan="3">Luas<br>Sawah<br>Irigasi<br><span class="small">(ha)</span></th>
                    <th colspan="7">1) Usulan IP3A / GP3A *)</th>
                    <th colspan="10">2) Usulan Keputusan Komisi Irigasi</th>
                </tr>
                <tr>
                    <th rowspan="2">Padi<br><span class="small">(ha)</span></th>
                    <th colspan="2">Tebu<br><span class="small">(ha)</span></th>
                    <th rowspan="2">Palawija<br><span class="small">(ha)</span></th>
                    <th rowspan="2">Lain-lain<br><span class="small">(ha)</span></th>
                    <th rowspan="2">Bero<br><span class="small">(ha)</span></th>
                    <th rowspan="2">Jumlah<br><span class="small">(ha)</span></th>
                    <th rowspan="2">Padi<br><span class="small">(ha)</span></th>
                    <th colspan="2">Tebu<br><span class="small">(ha)</span></th>
                    <th rowspan="2">Palawija<br><span class="small">(ha)</span></th>
                    <th rowspan="2">Lain-lain<br><span class="small">(ha)</span></th>
                    <th rowspan="2">Bero<br><span class="small">(ha)</span></th>
                    <th rowspan="2">Jumlah<br><span class="small">(ha)</span></th>
                    <th rowspan="2">Golongan<br>tanam</th>
                    <th colspan="2">Pemberian Air</th>
                </tr>
                <tr>
                    <th>ADA</th><th>YAD</th>
                    <th>ADA</th><th>YAD</th>
                    <th>Mulai</th><th>Selesai</th>
                </tr>
                <tr>
                    ${Array.from({ length: 21 }).map((_, idx) => `<th>${idx + 1}</th>`).join('')}
                </tr>
            </thead>
            <tbody>
                ${rowCells || `<tr><td colspan="21">Belum ada data 01-O untuk ${escapePrintValue(mt)}</td></tr>`}
                <tr>
                    <td colspan="3">Jumlah Areal Kerja Pengamat</td>
                    <td>${totalArea > 0 ? totalArea.toFixed(2) : ''}</td>
                    <td colspan="17"></td>
                </tr>
            </tbody>
        </table>

        ${(() => {
            const kasie = getKasieSignatureInfo(pData);
            const pengamat = getPengamatSignatureInfo(pData);
            return `<div class="official-signatures">
            <div>
                <div>Mengetahui,</div>
                <div>Kasi OP Wil. Kabupaten</div>
                <span class="signature-name">${escapePrintValue(kasie.nama || 'Nama')}</span>
                <div>NIP. ${escapePrintValue(kasie.nip)}</div>
            </div>
            <div>
                <div>${escapePrintValue(formatTanggalLaporan(report02.updatedAt || report02.createdAt))}</div>
                <div>Pengamat</div>
                <span class="signature-name">${escapePrintValue(pengamat.nama || 'Nama')}</span>
                <div>NIP. ${escapePrintValue(pengamat.nip)}</div>
            </div>
        </div>`;
        })()}
    `;

    document.body.appendChild(root);
    return root;
}

function buildOfficialPrint03O(key = '') {
    const db03 = getLS('03O_' + currentDI) || {};
    const periode = key || Object.keys(db03).sort().reverse()[0] || '';
    const report = db03[periode] || null;
    if (!report) return document.getElementById('tabContent-03O');

    const pData = getProfilData(currentDI);
    const reportRows = report.data || {};
    const bendungs = Object.keys(reportRows);
    const totalLuasDI = getTotalLuasDI01O(pData);
    const pengamatInfo = getPengamatSignatureInfo(pData);
    const kasieInfo = getKasieSignatureInfo(pData);
    const tanggalLaporan = formatTanggalLaporan(report.updatedAt || report.createdAt || report.timestamp);
    const value = (bendung, col) => escapePrintValue(reportRows[bendung]?.[col] || '');
    const numberValue = (bendung, col) => {
        const raw = reportRows[bendung]?.[col];
        if (raw === '' || raw === undefined || raw === null) return '';
        const num = parseFloat(raw);
        return Number.isFinite(num) ? num.toFixed(2) : escapePrintValue(raw);
    };
    const findBendungMeta = (nama) => getBendungMeta01O(nama, pData);

    const maxRowsPerPage03O = 16;
    const rowKeys03O = bendungs.length ? bendungs : [''];
    const rowPages03O = [];
    for (let i = 0; i < rowKeys03O.length; i += maxRowsPerPage03O) {
        rowPages03O.push(rowKeys03O.slice(i, i + maxRowsPerPage03O));
    }
    const renderRow03O = (bendung, idx) => {
        if (!bendung) {
            return `
            <tr>
                <td colspan="19">Data keputusan Komisi Irigasi belum tersedia.</td>
            </tr>
        `;
        }
        const meta = findBendungMeta(bendung);
        return `
            <tr>
                <td>${idx + 1}</td>
                <td class="left">${escapePrintValue(currentDI)}</td>
                <td class="left">${escapePrintValue(bendung)}</td>
                <td>${escapePrintValue(meta.luas || '')}</td>
                <td>${numberValue(bendung, 'padi-1')}</td>
                <td>${numberValue(bendung, 'padi-2')}</td>
                <td>${numberValue(bendung, 'padi-3')}</td>
                <td>${numberValue(bendung, 'palawija-1')}</td>
                <td>${numberValue(bendung, 'palawija-2')}</td>
                <td>${numberValue(bendung, 'palawija-3')}</td>
                <td>${numberValue(bendung, 'tebu-ada')}</td>
                <td>${numberValue(bendung, 'tebu-yad')}</td>
                <td>${numberValue(bendung, 'lain-1')}</td>
                <td>${numberValue(bendung, 'lain-2')}</td>
                <td>${numberValue(bendung, 'lain-3')}</td>
                <td>${numberValue(bendung, 'jumlah')}</td>
                <td>${value(bendung, 'golongan')}</td>
                <td>${escapePrintValue(formatTanggalPanjang01O(value(bendung, 'tgl-mulai')))}</td>
                <td>${escapePrintValue(formatTanggalPanjang01O(value(bendung, 'tgl-selesai')))}</td>
            </tr>
        `;
    };
    const renderTable03O = (pageRows, pageIndex) => `
        <table class="official-main-table">
            <colgroup>
                <col style="width: 3.5%">
                <col style="width: 12%">
                <col style="width: 12%">
                <col style="width: 5.5%">
                <col style="width: 4.6%">
                <col style="width: 4.6%">
                <col style="width: 4.6%">
                <col style="width: 4.6%">
                <col style="width: 4.6%">
                <col style="width: 4.6%">
                <col style="width: 4.4%">
                <col style="width: 4.4%">
                <col style="width: 4.4%">
                <col style="width: 4.4%">
                <col style="width: 4.4%">
                <col style="width: 5%">
                <col style="width: 5%">
                <col style="width: 6%">
                <col style="width: 6%">
            </colgroup>
            <thead>
                <tr>
                    <th rowspan="2">No.</th>
                    <th rowspan="2">Nama Wilayah Pengamat<br>(Daerah Irigasi)</th>
                    <th rowspan="2">Nama Wilayah Kerja Juru<br>(Bendung)</th>
                    <th rowspan="2">Luas Sawah<br>(ha)</th>
                    <th colspan="3">Padi (ha)</th>
                    <th colspan="3">Palawija (ha)</th>
                    <th colspan="2">Tebu (ha)</th>
                    <th colspan="3">Keperluan Lain (ha)</th>
                    <th rowspan="2">Jumlah Luas<br>(ha)</th>
                    <th rowspan="2">Golongan</th>
                    <th colspan="2">Tgl Pemberian Air</th>
                </tr>
                <tr>
                    <th>MT1</th>
                    <th>MT2</th>
                    <th>MT3</th>
                    <th>MT1</th>
                    <th>MT2</th>
                    <th>MT3</th>
                    <th>Ada</th>
                    <th>YAD</th>
                    <th>MT1</th>
                    <th>MT2</th>
                    <th>MT3</th>
                    <th>Mulai</th>
                    <th>Selesai</th>
                </tr>
            </thead>
            <tbody>${pageRows.map((bendung, idx) => renderRow03O(bendung, pageIndex * maxRowsPerPage03O + idx)).join('')}</tbody>
        </table>
    `;
    const field = (label, val, leftLabel, top, leftColon, leftValue) => `
        <div class="field-label" style="left:${leftLabel}mm; top:${top}mm;">${escapePrintValue(label)}</div>
        <div class="field-colon" style="left:${leftColon}mm; top:${top}mm;">:</div>
        <div class="field-value" style="left:${leftValue}mm; top:${top}mm;">${escapePrintValue(val)}</div>
    `;
    const renderSignature03O = () => `
        <div class="official-signatures">
            <div>
                <div>Mengetahui,</div>
                <div>Kasi OP Wil. Kabupaten</div>
                <span class="signature-name">${escapePrintValue(kasieInfo.nama || 'Nama')}</span>
                <div>NIP. ${escapePrintValue(kasieInfo.nip || '')}</div>
            </div>
            <div>
                <div>${escapePrintValue(tanggalLaporan || '')}</div>
                <div>Pengamat</div>
                <span class="signature-name">${escapePrintValue(pengamatInfo.nama || 'Nama')}</span>
                <div>NIP. ${escapePrintValue(pengamatInfo.nip || '')}</div>
            </div>
        </div>
    `;
    const renderPage03O = (pageRows, pageIndex) => {
        const isLastPage = pageIndex === rowPages03O.length - 1;
        const signatureTop = Math.min(145, 56 + 12 + (Math.max(pageRows.length, 1) * 4.6) + 8);
        return `
        <section class="official-form-03o official-form-03o-page" style="--signature-top:${signatureTop}mm;">
            <div class="official-code">Blangko 03 - O</div>
            <h1 class="official-title">Kutipan Lampiran Keputusan Komisi Irigasi</h1>
            <div class="official-subtitle">Mengenai Rencana Tata Tanam Per Daerah Irigasi</div>

            ${field('Daerah Irigasi', currentDI, 22, 30, 51, 55)}
            ${field('No. Kode D.I', pData.kodeDI || getPrintTextValue('o3-kodeDI'), 22, 36, 51, 55)}
            ${field('Total L. Sawah Irigasi D.I', totalLuasDI, 22, 42, 51, 55)}
            ${field('Periode Masa Tanam', report.periode || periode, 22, 48, 51, 55)}
            ${field('Pengamat', pData.pengamat || getPrintTextValue('o3-pengamat'), 178, 30, 206, 210)}
            ${field('Kabupaten/Kota', pData.kabupaten || getPrintTextValue('o3-kabupaten'), 178, 36, 206, 210)}

            ${renderTable03O(pageRows, pageIndex)}
            ${isLastPage ? renderSignature03O() : ''}
        </section>
        `;
    };

    const root = document.createElement('div');
    root.id = 'siopi-official-print-root';
    root.className = 'siopi-official-print official-form-03o official-form-03o-batch';
    root.innerHTML = rowPages03O.map(renderPage03O).join('');

    document.body.appendChild(root);
    return root;
}

function buildOfficialPrint04O(key = '') {
    const db04 = getLS('04O_' + currentDI) || {};
    const report = db04[key] || null;
    if (!report) return document.getElementById('tabContent-04O');

    const pData = getProfilData(currentDI);
    const meta = getBendungMeta01O(report.bendung || '', pData);
    const pengamatInfo = getPengamatSignatureInfo(pData);
    const tanggalLaporan = formatTanggalLaporan(report.updatedAt || report.createdAt || report.timestamp);
    const usul = report.usul || {};
    const real = report.real || {};
    const rusak = report.rusak || {};
    const o1Data04 = getLS('01O_' + currentDI) || {};
    const mt04 = report.mt || '';
    const mtProp04 = String(mt04).toLowerCase();
    const periodeMT04 = Object.keys(o1Data04)
        .map(k => o1Data04[k]?.[mtProp04])
        .find(Boolean) || mt04;
    const luasSawah = parseFloat(meta.luas || 0) || 0;
    const sum = (obj, keys) => keys.reduce((total, k) => total + (parseFloat(obj[k]) || 0), 0);
    const display = (value) => {
        if (value === undefined || value === null || value === '') return '';
        const num = parseFloat(value);
        return Number.isFinite(num) && String(value).trim() !== '' ? num.toFixed(2) : escapePrintValue(value);
    };
    const calcBero = (obj) => {
        const used = sum(obj, ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11']);
        if (!luasSawah) return '';
        return Math.max(0, luasSawah - used).toFixed(2);
    };
    const row = (no, jenis, usulVal, realVal) => `
        <tr>
            <td>${escapePrintValue(no)}</td>
            <td class="left">${escapePrintValue(jenis)}</td>
            <td>${display(usulVal)}</td>
            <td>${display(realVal)}</td>
        </tr>
    `;
    const field = (label, val, leftLabel, top, leftColon, leftValue) => `
        <div class="field-label" style="left:${leftLabel}mm; top:${top}mm;">${escapePrintValue(label)}</div>
        <div class="field-colon" style="left:${leftColon}mm; top:${top}mm;">:</div>
        <div class="field-value" style="left:${leftValue}mm; top:${top}mm;">${escapePrintValue(val)}</div>
    `;

    const root = document.createElement('div');
    root.id = 'siopi-official-print-root';
    root.className = 'siopi-official-print official-form-04o';
    root.innerHTML = `
        <div class="official-code">Blangko 04 - O</div>
        <table class="excel-grid-04o">
            <colgroup>
                <col style="width: 5.1%">
                <col style="width: 14.2%">
                <col style="width: 3.2%">
                <col style="width: 19.2%">
                <col style="width: 8.1%">
                <col style="width: 16.5%">
                <col style="width: 3.2%">
                <col style="width: 18.2%">
                <col style="width: 12.3%">
            </colgroup>
            <tbody>
                <tr><td colspan="9" class="center title">Laporan Keadaan Air dan Tanaman Pada Wilayah Mantri / Juru</td></tr>
                <tr><td colspan="9" class="gap"></td></tr>
                <tr>
                    <td colspan="2" class="left bold">Daerah Irigasi</td><td class="center bold">:</td><td colspan="2" class="left">${escapePrintValue(currentDI)}</td>
                    <td class="left bold">Luas Sawah Irigasi</td><td class="center bold">:</td><td colspan="2" class="left">${escapePrintValue(meta.luas || '')}</td>
                </tr>
                <tr>
                    <td colspan="2" class="left bold">Nomor Kode DI</td><td class="center bold">:</td><td colspan="2" class="left">${escapePrintValue(pData.kodeDI || '')}</td>
                    <td class="left bold">Periode Pemberian Air</td><td class="center bold">:</td><td colspan="2" class="left">${escapePrintValue(report.periode || '')}</td>
                </tr>
                <tr>
                    <td colspan="2" class="left bold">Total L. Sawah Irigasi D.I</td><td class="center bold">:</td><td colspan="2" class="left">${escapePrintValue(getTotalLuasDI01O(pData))}</td>
                    <td colspan="4"></td>
                </tr>
                <tr>
                    <td colspan="2" class="left bold">Kabupaten</td><td class="center bold">:</td><td colspan="2" class="left">${escapePrintValue(pData.kabupaten || '')}</td>
                    <td colspan="4"></td>
                </tr>
                <tr>
                    <td colspan="2" class="left bold">Bendung/Pengambilan</td><td class="center bold">:</td><td colspan="2" class="left">${escapePrintValue(report.bendung || '')}</td>
                    <td colspan="4"></td>
                </tr>
                <tr>
                    <td colspan="9" class="gap"></td>
                </tr>
                <tr>
                    <td colspan="2" class="left bold">Periode Masa Tanam</td><td class="center bold">:</td><td colspan="6" class="left">${escapePrintValue(`${periodeMT04}${mt04 ? ` (${mt04})` : ''}`)}</td>
                </tr>
                <tr><td colspan="9" class="b gap"></td></tr>
                <tr><td class="bold">1.</td><td colspan="8" class="bold">Keputusan Target Areal Tanam (data dari Blangko 01)</td></tr>
                <tr><td></td><td class="left target-label">Padi</td><td class="center target-colon">:</td><td colspan="2" class="left target-amount">${display(sum(usul, ['0','1','2','3']))} Ha</td><td colspan="4"></td></tr>
                <tr><td></td><td class="left target-label">Tebu Muda</td><td class="center target-colon">:</td><td colspan="2" class="left target-amount">${display(usul[5])} Ha</td><td colspan="4"></td></tr>
                <tr><td></td><td class="left target-label">Tebu Tua</td><td class="center target-colon">:</td><td colspan="2" class="left target-amount">${display(usul[6])} Ha</td><td colspan="4"></td></tr>
                <tr><td></td><td class="left target-label">Palawija</td><td class="center target-colon">:</td><td colspan="2" class="left target-amount">${display(sum(usul, ['7','8']))} Ha</td><td colspan="4"></td></tr>
                <tr><td></td><td class="left target-label">Lain-lain</td><td class="center target-colon">:</td><td colspan="2" class="left target-amount">${display(usul[10])} Ha</td><td colspan="4"></td></tr>
                <tr><td></td><td class="left target-label">Jumlah Tanaman</td><td class="center target-colon">:</td><td colspan="2" class="left target-amount">${display(sum(usul, ['0','1','2','3','4','5','6','7','8','9','10']))} Ha</td><td colspan="4" class="left target-bero-inline">Bero : ${calcBero(usul)} Ha</td></tr>
                <tr><td colspan="9" class="gap"></td></tr>
                <tr><td class="bold">2.</td><td colspan="8" class="bold">Usulan dan Realisasi Luas Tanam (ha)</td></tr>
                <tr>
                    <td rowspan="2" class="b center bold">No</td>
                    <td colspan="3" class="b center bold">Realisasi Luas Tanam s/d saat lap dibuat</td>
                    <td></td>
                    <td colspan="4" class="b center bold">Usulan Luas Tanam pada Periode Tersebut</td>
                </tr>
                <tr>
                    <td colspan="2" class="b center bold">Jenis Tanaman</td><td class="b center bold">Areal (ha)</td><td></td>
                    <td colspan="2" class="b center bold">Jenis Tanaman</td><td class="b center bold">Areal (ha)</td><td class="b center bold">Jumlah</td>
                </tr>
                <tr><td class="b center">1</td><td colspan="2" class="b center">2.1.</td><td class="b center">2.2.</td><td></td><td colspan="2" class="b center">3.1.</td><td class="b center">3.2.</td><td class="b center">3.3.</td></tr>
                <tr><td class="b center">2.1.</td><td colspan="2" class="b left">Padi ${escapePrintValue(report.mt || '')}</td><td class="b center">${display(real[0])}</td><td></td><td colspan="2" class="b left">Padi Rendeng/Padi Gadu Ijin :</td><td class="b center"></td><td class="b center"></td></tr>
                <tr><td class="b"></td><td colspan="2" class="b"></td><td class="b"></td><td></td><td colspan="2" class="b left">a) Pengolahan Tanah + Persemaian</td><td class="b center">${display(usul[0])}</td><td rowspan="4" class="b center">${display(sum(usul, ['0','1','2','3']))}</td></tr>
                <tr><td class="b"></td><td colspan="2" class="b"></td><td class="b"></td><td></td><td colspan="2" class="b left">b) Pertumbuhan</td><td class="b center">${display(usul[1])}</td></tr>
                <tr><td class="b"></td><td colspan="2" class="b"></td><td class="b"></td><td></td><td colspan="2" class="b left">c) Pemasakan</td><td class="b center">${display(usul[2])}</td></tr>
                <tr><td class="b center">2.2.</td><td colspan="2" class="b left">Tebu Muda</td><td class="b center">${display(real[1])}</td><td></td><td colspan="2" class="b left">d) Panen</td><td class="b center">${display(usul[3])}</td></tr>
                <tr><td class="b"></td><td colspan="2" class="b left">Tebu Tua</td><td class="b center">${display(real[2])}</td><td></td><td colspan="2" class="b left">Tebu :</td><td class="b center"></td><td rowspan="4" class="b center">${display(sum(usul, ['4','5','6']))}</td></tr>
                <tr><td class="b"></td><td colspan="2" class="b"></td><td class="b"></td><td></td><td colspan="2" class="b left">a) Pengolahan Tanah + Persemaian</td><td class="b center">${display(usul[4])}</td></tr>
                <tr><td class="b"></td><td colspan="2" class="b"></td><td class="b"></td><td></td><td colspan="2" class="b left">b) Tebu Muda</td><td class="b center">${display(usul[5])}</td></tr>
                <tr><td class="b center">2.3.</td><td colspan="2" class="b left">Palawija</td><td class="b center">${display(real[3])}</td><td></td><td colspan="2" class="b left">c) Tebu Tua</td><td class="b center">${display(usul[6])}</td></tr>
                <tr><td class="b"></td><td colspan="2" class="b"></td><td class="b"></td><td></td><td colspan="2" class="b left">Palawija :</td><td class="b center"></td><td rowspan="3" class="b center">${display(sum(usul, ['7','8']))}</td></tr>
                <tr><td class="b"></td><td colspan="2" class="b"></td><td class="b"></td><td></td><td colspan="2" class="b left">a) Yang perlu banyak air</td><td class="b center">${display(usul[7])}</td></tr>
                <tr><td class="b"></td><td colspan="2" class="b"></td><td class="b"></td><td></td><td colspan="2" class="b left">b) Yang perlu sedikit air</td><td class="b center">${display(usul[8])}</td></tr>
                <tr><td class="b center">2.4.</td><td colspan="2" class="b left">Gadu Tidak Izin</td><td class="b center">${display(real[4])}</td><td></td><td colspan="2" class="b left">Gadu Tidak Izin :</td><td class="b center">${display(usul[9])}</td><td class="b center"></td></tr>
                <tr><td class="b center">2.5.</td><td colspan="2" class="b left">Lain-lain</td><td class="b center">${display(real[5])}</td><td></td><td colspan="2" class="b left">Lain-lain keperluan</td><td class="b center">${display(usul[10])}</td><td class="b center"></td></tr>
                <tr><td class="b center">2.6.</td><td colspan="2" class="b left">Bero</td><td class="b center">${calcBero(real)}</td><td></td><td colspan="2" class="b left">Bero</td><td class="b center">${calcBero(usul)}</td><td class="b center"></td></tr>
                <tr><td class="b center">2.7.</td><td colspan="2" class="b left">Jum : (L sawah Irigasi)</td><td class="b center">${luasSawah ? luasSawah.toFixed(2) : ''}</td><td></td><td colspan="2" class="b left">Jumlah : (Luas Sawah Irigasi)</td><td class="b center">${luasSawah ? luasSawah.toFixed(2) : ''}</td><td class="b center"></td></tr>
                <tr><td colspan="9" class="gap"></td></tr>
                <tr><td></td><td colspan="8" class="left keadaan-air-inline">Keadaan Air Irigasi di Petak tersier : ${escapePrintValue(report.keadaanAir || '')}</td></tr>
                <tr><td></td><td colspan="3" class="left">Kerusakan Tanaman (ha) :</td><td></td><td colspan="2" class="b center">Tanaman</td><td class="b center">Kekeringan</td><td class="b center">Genangan/kebanjiran</td></tr>
                <tr><td></td><td colspan="4"></td><td colspan="2" class="b center">Padi</td><td class="b center">${display(rusak['padi-kering'])}</td><td class="b center">${display(rusak['padi-genang'])}</td></tr>
                <tr><td></td><td colspan="4"></td><td colspan="2" class="b center">Tebu</td><td class="b center">${display(rusak['tebu-kering'])}</td><td class="b center">${display(rusak['tebu-genang'])}</td></tr>
                <tr><td></td><td colspan="4"></td><td colspan="2" class="b center">Palawija</td><td class="b center">${display(rusak['pala-kering'])}</td><td class="b center">${display(rusak['pala-genang'])}</td></tr>
                <tr><td colspan="9" class="gap"></td></tr>
                <tr><td></td><td colspan="3" class="center">Mengetahui,</td><td colspan="2"></td><td colspan="3" class="center">${escapePrintValue(tanggalLaporan || '')}</td></tr>
                <tr><td></td><td colspan="3" class="center">Ranting/Pengamat</td><td colspan="2"></td><td colspan="3" class="center">${escapePrintValue(meta.juru || 'Mantri / Juru')}</td></tr>
                <tr><td colspan="9" class="signature-space"></td></tr>
                <tr><td></td><td colspan="3" class="center bold">( ${escapePrintValue(pengamatInfo.nama || 'NAMA')} )</td><td colspan="2"></td><td colspan="3" class="center bold">( ${escapePrintValue(meta.juru || 'NAMA')} )</td></tr>
                <tr><td></td><td colspan="3" class="center">Nip. ${escapePrintValue(pengamatInfo.nip || '')}</td><td colspan="2"></td><td colspan="3" class="center">Nip.</td></tr>
            </tbody>
        </table>
    `;

    document.body.appendChild(root);
    return root;
}

function buildOfficialPrint05O(key = '') {
    const db05 = getLS('05O_' + currentDI) || {};
    const report = db05[key] || null;
    if (!report) return document.getElementById('tabContent-05O');

    const pData = getProfilData(currentDI);
    const o1Data = getLS('01O_' + currentDI) || {};
    const actualBendungs = Object.keys(o1Data).sort();
    const bendungSlotCount05O = 10;
    const bendungPages05O = [];
    for (let i = 0; i < Math.max(actualBendungs.length, 1); i += bendungSlotCount05O) {
        bendungPages05O.push(Array.from({ length: bendungSlotCount05O }, (_, idx) => actualBendungs[i + idx] || ''));
    }
    const rows = report.rows || {};
    const faktor = report.faktor || {};
    const mt = report.mt || '';
    const periodeAir = report.periodeAir || '';
    const mtProp = String(mt).toLowerCase();
    const periodeMT = actualBendungs.map(b => o1Data[b]?.[mtProp]).find(Boolean) || mt;
    const pengamatInfo = getPengamatSignatureInfo(pData);
    const kasieInfo = getKasieSignatureInfo(pData);
    const tanggalLaporan = formatTanggalLaporan(report.updatedAt || report.createdAt || report.timestamp);
    const data04All = getLS('04O_' + currentDI) || {};

    const display05 = (value) => {
        if (value === undefined || value === null || value === '') return '';
        const num = parseFloat(value);
        return Number.isFinite(num) && String(value).trim() !== '' ? num.toFixed(2) : escapePrintValue(value);
    };
    const rowValue = (rowId, bIdx) => {
        const satuan = parseFloat(rows[rowId]?.satuan) || 0;
        const usul = parseFloat(rows[rowId]?.usul?.[bIdx]) || 0;
        return {
            satuan: rows[rowId]?.satuan || '',
            usul: rows[rowId]?.usul?.[bIdx] || '',
            air: (satuan > 0 || usul > 0) ? (satuan * usul).toFixed(2) : ''
        };
    };
    const dataRowIds = baris05O.map(r => r.id);
    const totalSawah = (bIdx) => dataRowIds.reduce((total, rowId) => total + (parseFloat(rowValue(rowId, bIdx).air) || 0), 0);
    const totalPintu = (bIdx) => {
        const f = parseFloat(faktor[bIdx]) || 0;
        return totalSawah(bIdx) * f;
    };
    const totalRusak = (bendung) => {
        const rep04 = data04All[`${bendung}_${mt}_${periodeAir}`];
        if (!rep04 || !rep04.rusak) return '';
        const total = Object.values(rep04.rusak).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
        return total > 0 ? total.toFixed(2) : '';
    };
    const bendungMeta = (nama) => getBendungMeta01O(nama, pData);
    const isActiveBendungSlot = (b) => Boolean(String(b || '').trim());
    const getRowCells = (rowId, pageBendungs, pageOffset) => pageBendungs.map((b, localIdx) => {
        if (!isActiveBendungSlot(b)) return '<td></td><td></td>';
        const bIdx = pageOffset + localIdx;
        const v = rowValue(rowId, bIdx);
        return `<td>${display05(v.usul)}</td><td>${display05(v.air)}</td>`;
    }).join('');
    const getEmptyCells = (pageBendungs) => pageBendungs.map(() => '<td></td><td></td>').join('');
    const getTotalCells = (kind, pageBendungs, pageOffset) => pageBendungs.map((b, localIdx) => {
        if (!isActiveBendungSlot(b)) return '<td></td><td></td>';
        const bIdx = pageOffset + localIdx;
        if (kind === 'sawah') return `<td></td><td>${display05(totalSawah(bIdx))}</td>`;
        if (kind === 'faktor') return `<td></td><td>${display05(faktor[bIdx])}</td>`;
        if (kind === 'pintu') return `<td></td><td>${display05(totalPintu(bIdx))}</td>`;
        if (kind === 'rusak') return `<td></td><td>${display05(totalRusak(b))}</td>`;
        return '<td></td><td></td>';
    }).join('');

    const colPairWidth = 75 / bendungSlotCount05O;
    const colgroup = `
        <col style="width: 3%">
        <col style="width: 17%">
        <col style="width: 5%">
        ${Array.from({ length: bendungSlotCount05O }).map(() => `<col style="width: ${colPairWidth / 2}%"><col style="width: ${colPairWidth / 2}%">`).join('')}
    `;
    const field = (label, val, leftLabel, top, leftColon, leftValue) => `
        <div class="field-label" style="left:${leftLabel}mm; top:${top}mm;">${escapePrintValue(label)}</div>
        <div class="field-colon" style="left:${leftColon}mm; top:${top}mm;">:</div>
        <div class="field-value" style="left:${leftValue}mm; top:${top}mm;">${escapePrintValue(val)}</div>
    `;
    const buildPage05O = (pageBendungs, pageIndex) => {
        const pageOffset = pageIndex * bendungSlotCount05O;
        const isLastPage = pageIndex === bendungPages05O.length - 1;
        const numberRowCount = 3 + (pageBendungs.length * 2);

        return `
        <section class="official-form-05o official-form-05o-page">
        <div class="official-code">Blangko 05 - O</div>
        <h1 class="official-title">Rencana Kebutuhan Air Di Pintu Pengambilan</h1>

        ${field('Daerah Irigasi', currentDI, 20, 24, 54, 58)}
        ${field('Nomor Kode DI', pData.kodeDI || '', 20, 29, 54, 58)}
        ${field('Total Luas Irigasi DI', getTotalLuasDI01O(pData), 20, 34, 54, 58)}
        ${field('Kabupaten', pData.kabupaten || '', 20, 39, 54, 58)}
        ${field('Periode Masa Tanam', `${mt}${periodeMT ? ` / ${periodeMT}` : ''}`, 210, 24, 247, 251)}
        ${field('Periode Pemberian Air', periodeAir, 210, 29, 247, 251)}

        <table class="official-main-table">
            <colgroup>${colgroup}</colgroup>
            <thead>
                <tr>
                    <th rowspan="3">No.</th>
                    <th rowspan="3">Uraian / Bab</th>
                    <th rowspan="3">Satuan keb Air di Sawah<br>(l/det/ha)</th>
                    ${pageBendungs.map(b => `<th colspan="2">${escapePrintValue(b)}</th>`).join('')}
                </tr>
                <tr>
                    ${pageBendungs.map(() => `<th>Usulan Luas Tanam<br>(ha)</th><th>Kebutuhan Air di Sawah<br>(l/det)</th>`).join('')}
                </tr>
                <tr>
                    ${pageBendungs.map((b, idx) => `<th>${4 + (idx * 2)}</th><th>${5 + (idx * 2)}=(3.1x${4 + (idx * 2)})</th>`).join('')}
                </tr>
                <tr>
                    ${Array.from({ length: numberRowCount }).map((_, idx) => `<th>${idx + 1}</th>`).join('')}
                </tr>
            </thead>
            <tbody>
                <tr class="section"><td>1</td><td class="left">Padi Rendeng/Padi Gadu Izin</td><td></td>${getEmptyCells(pageBendungs)}</tr>
                <tr><td></td><td class="left">a). Pengolahan tanah + Persemaian</td><td>${display05(rows['padi-olah']?.satuan)}</td>${getRowCells('padi-olah', pageBendungs, pageOffset)}</tr>
                <tr><td></td><td class="left">b). Pertumbuhan</td><td>${display05(rows['padi-tumbuh']?.satuan)}</td>${getRowCells('padi-tumbuh', pageBendungs, pageOffset)}</tr>
                <tr><td></td><td class="left">c). Pemasakan</td><td>${display05(rows['padi-masak']?.satuan)}</td>${getRowCells('padi-masak', pageBendungs, pageOffset)}</tr>
                <tr><td></td><td class="left">d). Panen</td><td>${display05(rows['padi-panen']?.satuan)}</td>${getRowCells('padi-panen', pageBendungs, pageOffset)}</tr>
                <tr class="section"><td>2</td><td class="left">Tebu</td><td></td>${getEmptyCells(pageBendungs)}</tr>
                <tr><td></td><td class="left">a). Pengolahan tanah + Persemaian</td><td>${display05(rows['tebu-olah']?.satuan)}</td>${getRowCells('tebu-olah', pageBendungs, pageOffset)}</tr>
                <tr><td></td><td class="left">b). Tebu Muda (MT.1)</td><td>${display05(rows['tebu-muda']?.satuan)}</td>${getRowCells('tebu-muda', pageBendungs, pageOffset)}</tr>
                <tr><td></td><td class="left">c). Tebu Tua (MT.2)</td><td>${display05(rows['tebu-tua']?.satuan)}</td>${getRowCells('tebu-tua', pageBendungs, pageOffset)}</tr>
                <tr class="section"><td>3</td><td class="left">Palawija</td><td></td>${getEmptyCells(pageBendungs)}</tr>
                <tr><td></td><td class="left">a). Yang perlu banyak air</td><td>${display05(rows['pala-banyak']?.satuan)}</td>${getRowCells('pala-banyak', pageBendungs, pageOffset)}</tr>
                <tr><td></td><td class="left">b). Yang perlu sedikit air</td><td>${display05(rows['pala-sedikit']?.satuan)}</td>${getRowCells('pala-sedikit', pageBendungs, pageOffset)}</tr>
                <tr class="section"><td>4</td><td class="left">Gadu tanpa izin</td><td>${display05(rows['gadu']?.satuan)}</td>${getRowCells('gadu', pageBendungs, pageOffset)}</tr>
                <tr class="section"><td>5</td><td class="left">Lain-lain</td><td>${display05(rows['lain']?.satuan)}</td>${getRowCells('lain', pageBendungs, pageOffset)}</tr>
                <tr><td>6</td><td class="left">Bero sementara</td><td></td>${getEmptyCells(pageBendungs)}</tr>
                <tr class="section"><td>7</td><td class="left">Jumlah di Sawah (l/det)</td><td></td>${getTotalCells('sawah', pageBendungs, pageOffset)}</tr>
                <tr><td>8</td><td class="left">Faktor Tersier</td><td></td>${getTotalCells('faktor', pageBendungs, pageOffset)}</tr>
                <tr class="section"><td>9</td><td class="left">Kebutuhan air di pintu tersier (l/det)</td><td></td>${getTotalCells('pintu', pageBendungs, pageOffset)}</tr>
                <tr><td>10</td><td class="left">Kerusakan Tanaman (Banjir/Kering)</td><td></td>${getTotalCells('rusak', pageBendungs, pageOffset)}</tr>
            </tbody>
        </table>

        ${isLastPage ? `
        <div class="official-signatures">
            <div>
                <div>Mengetahui,</div>
                <div>Kasi OP Wil. Kabupaten</div>
                <span class="signature-name">${escapePrintValue(kasieInfo.nama || 'Nama')}</span>
                <div>NIP. ${escapePrintValue(kasieInfo.nip || '')}</div>
            </div>
            <div>
                <div>${escapePrintValue(tanggalLaporan || '')}</div>
                <div>Pengamat</div>
                <span class="signature-name">${escapePrintValue(pengamatInfo.nama || 'Nama')}</span>
                <div>NIP. ${escapePrintValue(pengamatInfo.nip || '')}</div>
            </div>
        </div>
        ` : ''}
        </section>
    `;
    };

    const root = document.createElement('div');
    root.id = 'siopi-official-print-root';
    root.className = 'siopi-official-print official-form-05o official-form-05o-batch';
    root.innerHTML = bendungPages05O.map(buildPage05O).join('');

    document.body.appendChild(root);
    return root;
}

function buildOfficialPrint06O(key = '') {
    const db06 = getLS('06O_' + currentDI) || {};
    const report = db06[key] || null;
    if (!report) return document.getElementById('tabContent-06O');

    const pData = getProfilData(currentDI);
    const bendungNama = report.bendung || '';
    const periode = report.periode || '';
    const bendungMeta = getBendungMeta01O(bendungNama, pData);
    const bendung = (pData.bendungs || []).find(b => b.nama === bendungNama) || {};
    const petaks = (bendung.rincian || []).filter(r => r.petak && r.petak.trim() !== '');
    const values = report.values || [];
    const pengamatInfo = getPengamatSignatureInfo(pData);
    const kasieInfo = getKasieSignatureInfo(pData);
    const tanggalLaporan = formatTanggalLaporan(report.updatedAt || report.createdAt || report.timestamp);

    const parsePeriodeDays = (periodeStr) => {
        const match = String(periodeStr || '').match(/^(\d+)-(\d+)/);
        if (!match) return [];
        const start = parseInt(match[1], 10);
        const end = parseInt(match[2], 10);
        if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return [];
        return Array.from({ length: end - start + 1 }, (_, idx) => start + idx);
    };
    const days = parsePeriodeDays(periode);
    const dayCount = Math.max(days.length, values[0]?.length || 0, 1);
    const displayDays = days.length ? days : Array.from({ length: dayCount }, (_, idx) => idx + 1);
    const display06 = (value) => {
        if (value === undefined || value === null || value === '') return '';
        const num = parseFloat(value);
        return Number.isFinite(num) && String(value).trim() !== '' ? num.toFixed(2) : escapePrintValue(value);
    };
    const number06 = (value) => {
        const num = parseFloat(value);
        return Number.isFinite(num) ? num : 0;
    };
    const rowSum = (rowVals) => rowVals.reduce((total, val) => total + number06(val), 0);
    const rowAvg = (rowVals) => {
        const filled = rowVals.filter(val => val !== undefined && val !== null && val !== '');
        if (!filled.length) return 0;
        return rowSum(filled) / filled.length;
    };
    const colSums = Array.from({ length: dayCount }, (_, dIdx) => {
        return values.reduce((total, rowVals) => total + number06(rowVals?.[dIdx]), 0);
    });
    const totalAll = colSums.reduce((total, val) => total + val, 0);
    const totalAvg = petaks.length && dayCount ? totalAll / (petaks.length * dayCount) : 0;
    const totalLuas = petaks.reduce((total, petak) => total + (parseFloat(petak.luasFungsional) || 0), 0);
    const maxRowsPerPage06O = 20;
    const petakRows = petaks.length ? petaks : [{ petak: '', luasFungsional: '' }];
    const rowPages06O = [];
    for (let i = 0; i < petakRows.length; i += maxRowsPerPage06O) {
        rowPages06O.push(petakRows.slice(i, i + maxRowsPerPage06O));
    }
    const dayColWidth = Math.max(2.1, 46 / dayCount);
    const colgroup = `
        <col style="width: 3%">
        <col style="width: 15%">
        <col style="width: 5%">
        ${Array.from({ length: dayCount }).map(() => `<col style="width: ${dayColWidth}%">`).join('')}
        <col style="width: 6%">
        <col style="width: 6%">
        <col style="width: 4%">
        <col style="width: 4%">
        <col style="width: 4%">
        <col style="width: 4%">
    `;
    const field = (label, val, leftLabel, top, leftColon, leftValue) => `
        <div class="field-label" style="left:${leftLabel}mm; top:${top}mm;">${escapePrintValue(label)}</div>
        <div class="field-colon" style="left:${leftColon}mm; top:${top}mm;">:</div>
        <div class="field-value" style="left:${leftValue}mm; top:${top}mm;">${escapePrintValue(val)}</div>
    `;
    const renderRow06O = (petak, localIdx, pageIndex) => {
        const globalIdx = pageIndex * maxRowsPerPage06O + localIdx;
        const rowVals = Array.from({ length: dayCount }, (_, dIdx) => values[globalIdx]?.[dIdx] || '');
        const meta = report.meta?.[globalIdx] || {};
        const mark = (value) => value ? 'V' : '';
        const sum = rowSum(rowVals);
        const avg = rowAvg(rowVals);
        return `
            <tr>
                <td>${globalIdx + 1}</td>
                <td class="left">${escapePrintValue(petak.petak || '')}</td>
                <td>${display06(petak.luasFungsional || '')}</td>
                ${rowVals.map(val => `<td>${display06(val)}</td>`).join('')}
                <td>${sum > 0 ? display06(sum) : ''}</td>
                <td>${avg > 0 ? display06(avg) : ''}</td>
                <td>${escapePrintValue(meta.caraA || '')}</td>
                <td>${escapePrintValue(meta.caraB || '')}</td>
                <td>${mark(meta.alatBaik)}</td>
                <td>${mark(meta.alatRusak)}</td>
            </tr>
        `;
    };
    const renderFooter06O = () => `
        <tr class="section">
            <td colspan="2">Jumlah</td>
            <td>${display06(totalLuas)}</td>
            ${colSums.map(sum => `<td>${sum > 0 ? display06(sum) : ''}</td>`).join('')}
            <td>${totalAll > 0 ? display06(totalAll) : ''}</td>
            <td>${totalAvg > 0 ? display06(totalAvg) : ''}</td>
            <td colspan="4"></td>
        </tr>
    `;
    const renderSignature06O = () => `
        <div class="official-signatures">
            <div>
                <div>Mengetahui,</div>
                <div>Kasi OP Wil. Kabupaten</div>
                <span class="signature-name">${escapePrintValue(kasieInfo.nama || 'Nama')}</span>
                <div>NIP. ${escapePrintValue(kasieInfo.nip || '')}</div>
            </div>
            <div>
                <div>${escapePrintValue(tanggalLaporan || '')}</div>
                <div>Pengamat</div>
                <span class="signature-name">${escapePrintValue(pengamatInfo.nama || 'Nama')}</span>
                <div>NIP. ${escapePrintValue(pengamatInfo.nip || '')}</div>
            </div>
        </div>
    `;
    const renderPage06O = (pageRows, pageIndex) => {
        const isLastPage = pageIndex === rowPages06O.length - 1;
        const tableRowsCount = pageRows.length + (isLastPage ? 1 : 0);
        const signatureTop = Math.min(165, 50 + 13 + (Math.max(tableRowsCount, 1) * 4.25) + 8);
        return `
        <section class="official-form-06o official-form-06o-page" style="--signature-top:${signatureTop}mm;">
            <div class="official-code">Blangko 06 - O</div>
            <h1 class="official-title">Pencatatan Debit Saluran</h1>

            ${field('Daerah Irigasi', currentDI, 20, 24, 54, 58)}
            ${field('Nomor Kode DI', pData.kodeDI || '', 20, 29, 54, 58)}
            ${field('Total Luas Irigasi DI', getTotalLuasDI01O(pData), 20, 34, 54, 58)}
            ${field('Bendung/Pengambilan', bendungNama, 20, 39, 54, 58)}
            ${field('Luas Sawah Irigasi', bendungMeta.luas || totalLuas.toFixed(2), 20, 44, 54, 58)}
            ${field('Pengamat', pData.pengamat || '', 210, 24, 247, 251)}
            ${field('Kabupaten/Kota', pData.kabupaten || '', 210, 29, 247, 251)}
            ${field('Periode Pemberian Air', periode, 210, 34, 247, 251)}

            <table class="official-main-table">
                <colgroup>${colgroup}</colgroup>
                <thead>
                    <tr>
                        <th rowspan="2">No.</th>
                        <th rowspan="2">Nama Petak Tersier</th>
                        <th rowspan="2">Luas<br>(ha)</th>
                        <th colspan="${dayCount}">Debit Saluran Harian (l/det)</th>
                        <th rowspan="2">Jumlah<br>Debit</th>
                        <th rowspan="2">Rata-rata</th>
                        <th colspan="2">Cara Pengukuran<br>Debit</th>
                        <th colspan="2">Kondisi Alat Ukur</th>
                    </tr>
                    <tr>
                        ${displayDays.map(day => `<th>${day}</th>`).join('')}
                        <th>a</th>
                        <th>b</th>
                        <th>Baik</th>
                        <th>Rusak</th>
                    </tr>
                </thead>
                <tbody>
                    ${pageRows.map((petak, idx) => renderRow06O(petak, idx, pageIndex)).join('')}
                    ${isLastPage ? renderFooter06O() : ''}
                </tbody>
            </table>
            ${isLastPage ? renderSignature06O() : ''}
        </section>
        `;
    };

    const root = document.createElement('div');
    root.id = 'siopi-official-print-root';
    root.className = 'siopi-official-print official-form-06o official-form-06o-batch';
    root.innerHTML = rowPages06O.map(renderPage06O).join('');

    document.body.appendChild(root);
    return root;
}

function buildOfficialPrint07O(key = '') {
    const db07 = getLS('07O_' + currentDI) || {};
    const report = db07[key] || null;
    if (!report) return document.getElementById('tabContent-07O');

    const pData = getProfilData(currentDI);
    const bendungNama = report.bendung || '';
    const mt = report.mt || '';
    const periode = report.periode || '';
    const bendung = (pData.bendungs || []).find(b => b.nama === bendungNama) || {};
    const petaks = (bendung.rincian || []).filter(r => r.petak && r.petak.trim() !== '');
    const rowsSaved = report.rows || {};
    const o1Data = getLS('01O_' + currentDI) || {};
    const mtProp = mt === 'MT1' ? 'mt1' : (mt === 'MT2' ? 'mt2' : 'mt3');
    const periodeMT = o1Data[bendungNama]?.[mtProp] || '';
    const data06 = (getLS('06O_' + currentDI) || {})[`${bendungNama}_${periode}`]?.values || [];
    const data05a = (getLS('05Oa_' + currentDI) || {})[`${bendungNama}_${mt}_${periode}`] || null;
    const pengamatInfo = getPengamatSignatureInfo(pData);
    const kasieInfo = getKasieSignatureInfo(pData);
    const tanggalLaporan = formatTanggalLaporan(report.updatedAt || report.createdAt || report.timestamp);

    const display07 = (value) => {
        if (value === undefined || value === null || value === '' || value === '-') return '';
        const num = parseFloat(String(value).replace(',', '.'));
        return Number.isFinite(num) ? num.toFixed(2) : escapePrintValue(value);
    };
    const num07 = (value) => {
        const num = parseFloat(String(value ?? '').replace(',', '.'));
        return Number.isFinite(num) ? num : 0;
    };
    const get06Stats = (idx) => {
        const rowVals = data06[idx] || [];
        let sum = 0;
        let count = 0;
        rowVals.forEach(val => {
            const parsed = num07(val);
            if (val !== undefined && val !== null && val !== '') {
                sum += parsed;
                count++;
            }
        });
        const last = rowVals.length ? num07(rowVals[rowVals.length - 1]) : 0;
        return { avg: count ? sum / count : 0, last };
    };
    const get05aStats = (idx) => {
        const dataPetak = data05a?.petak?.[idx] || null;
        if (!dataPetak) return { usul: 0, tersier: 0 };
        let usul = 0;
        let totalAirSawah = 0;
        if (dataPetak.luas) {
            Object.entries(dataPetak.luas).forEach(([rowId, val]) => {
                const luas = num07(val);
                const satuan = num07(data05a?.satuan?.[rowId]);
                usul += luas;
                totalAirSawah += luas * satuan;
            });
        }
        const faktor = num07(dataPetak.faktor) || 1.20;
        return { usul, tersier: totalAirSawah * faktor };
    };
    const petakRows = (petaks.length ? petaks : [{ petak: 'Tersier Utama', luasFungsional: 0 }]).map((petak, idx) => {
        const nama = petak.petak || petak.nama || `Petak ${idx + 1}`;
        const saved = rowsSaved[nama] || {};
        const stats06 = get06Stats(idx);
        const stats05a = get05aStats(idx);
        const lain = num07(saved.lain);
        const suplesi = num07(saved.suplesi);
        const hilang = stats05a.tersier * 0.20;
        const bagi = Math.max((stats05a.tersier + lain + hilang) - suplesi, 0);
        const diberikan = num07(saved.diberikan) || bagi;
        return {
            nama,
            luas: num07(petak.luasFungsional),
            avg06: stats06.avg,
            last06: stats06.last,
            usul: stats05a.usul || num07(saved.usul),
            tersier: stats05a.tersier || num07(saved.tersier),
            lain,
            hilang,
            suplesi,
            bagi,
            diberikan
        };
    });
    const totals = petakRows.reduce((acc, row) => {
        Object.keys(acc).forEach(key => acc[key] += row[key] || 0);
        return acc;
    }, { luas: 0, avg06: 0, last06: 0, usul: 0, tersier: 0, lain: 0, hilang: 0, suplesi: 0, bagi: 0, diberikan: 0 });
    const maxRowsPerPage07O = 20;
    const rowPages07O = [];
    for (let i = 0; i < petakRows.length; i += maxRowsPerPage07O) {
        rowPages07O.push(petakRows.slice(i, i + maxRowsPerPage07O));
    }
    const colgroup = `
        <col style="width: 3%">
        <col style="width: 18%">
        <col style="width: 7%">
        <col style="width: 8%">
        <col style="width: 8%">
        <col style="width: 8%">
        <col style="width: 9%">
        <col style="width: 8%">
        <col style="width: 8%">
        <col style="width: 7%">
        <col style="width: 8%">
        <col style="width: 8%">
    `;
    const field = (label, val, leftLabel, top, leftColon, leftValue) => `
        <div class="field-label" style="left:${leftLabel}mm; top:${top}mm;">${escapePrintValue(label)}</div>
        <div class="field-colon" style="left:${leftColon}mm; top:${top}mm;">:</div>
        <div class="field-value" style="left:${leftValue}mm; top:${top}mm;">${escapePrintValue(val)}</div>
    `;
    const renderRow07O = (row, localIdx, pageIndex) => {
        const globalIdx = pageIndex * maxRowsPerPage07O + localIdx;
        return `
            <tr>
                <td>${globalIdx + 1}</td>
                <td class="left">${escapePrintValue(row.nama)}</td>
                <td>${display07(row.luas)}</td>
                <td>${display07(row.avg06)}</td>
                <td>${display07(row.last06)}</td>
                <td>${display07(row.usul)}</td>
                <td>${display07(row.tersier)}</td>
                <td>${display07(row.lain)}</td>
                <td>${display07(row.hilang)}</td>
                <td>${display07(row.suplesi)}</td>
                <td>${display07(row.bagi)}</td>
                <td>${display07(row.diberikan)}</td>
            </tr>
        `;
    };
    const renderFooter07O = () => `
        <tr class="section">
            <td colspan="2">Jumlah</td>
            <td>${display07(totals.luas)}</td>
            <td>${display07(totals.avg06)}</td>
            <td>${display07(totals.last06)}</td>
            <td>${display07(totals.usul)}</td>
            <td>${display07(totals.tersier)}</td>
            <td>${display07(totals.lain)}</td>
            <td>${display07(totals.hilang)}</td>
            <td>${display07(totals.suplesi)}</td>
            <td>${display07(totals.bagi)}</td>
            <td>${display07(totals.diberikan)}</td>
        </tr>
    `;
    const renderSignature07O = () => `
        <div class="official-signatures">
            <div>
                <div>Mengetahui,</div>
                <div>Kasi OP Wil. Kabupaten</div>
                <span class="signature-name">${escapePrintValue(kasieInfo.nama || 'Nama')}</span>
                <div>NIP. ${escapePrintValue(kasieInfo.nip || '')}</div>
            </div>
            <div>
                <div>${escapePrintValue(tanggalLaporan || '')}</div>
                <div>Pengamat</div>
                <span class="signature-name">${escapePrintValue(pengamatInfo.nama || 'Nama')}</span>
                <div>NIP. ${escapePrintValue(pengamatInfo.nip || '')}</div>
            </div>
        </div>
    `;
    const renderPage07O = (pageRows, pageIndex) => {
        const isLastPage = pageIndex === rowPages07O.length - 1;
        const tableRowsCount = pageRows.length + (isLastPage ? 1 : 0);
        const signatureTop = Math.min(165, 50 + 13 + (Math.max(tableRowsCount, 1) * 4.45) + 8);
        return `
        <section class="official-form-07o official-form-07o-page" style="--signature-top:${signatureTop}mm;">
            <div class="official-code">Blangko 07 - O</div>
            <h1 class="official-title">Rencana Kebutuhan Air Di Jaringan Utama</h1>

            ${field('Daerah Irigasi', currentDI, 20, 24, 54, 58)}
            ${field('Nomor Kode DI', pData.kodeDI || '', 20, 29, 54, 58)}
            ${field('Total Luas Irigasi DI', getTotalLuasDI01O(pData), 20, 34, 54, 58)}
            ${field('Bendung/Pengambilan', bendungNama, 20, 39, 54, 58)}
            ${field('Periode Masa Tanam', `${mt}${periodeMT ? ` / ${periodeMT}` : ''}`, 210, 24, 247, 251)}
            ${field('Periode Pemberian Air', periode, 210, 29, 247, 251)}
            ${field('Pengamat', pData.pengamat || '', 210, 34, 247, 251)}
            ${field('Kabupaten/Kota', pData.kabupaten || '', 210, 39, 247, 251)}

            <table class="official-main-table">
                <colgroup>${colgroup}</colgroup>
                <thead>
                    <tr>
                        <th rowspan="2">No.</th>
                        <th rowspan="2">Wilayah Kerja Juru<br>(Petak Tersier)</th>
                        <th rowspan="2">Luas Sawah<br>(ha)</th>
                        <th colspan="2">Realisasi Debit<br>(l/det)</th>
                        <th rowspan="2">Usulan Tanam<br>(ha)</th>
                        <th colspan="5">Rencana Kebutuhan Air (l/det)</th>
                        <th rowspan="2">Debit Diberikan<br>(l/det)</th>
                    </tr>
                    <tr>
                        <th>Rata-rata</th>
                        <th>Akhir Per.</th>
                        <th>Pintu Tersier</th>
                        <th>Lain-lain</th>
                        <th>Q Hilang<br>20%</th>
                        <th>Suplesi</th>
                        <th>Bang. Bagi</th>
                    </tr>
                </thead>
                <tbody>
                    ${pageRows.map((row, idx) => renderRow07O(row, idx, pageIndex)).join('')}
                    ${isLastPage ? renderFooter07O() : ''}
                </tbody>
            </table>
            ${isLastPage ? renderSignature07O() : ''}
        </section>
        `;
    };

    const root = document.createElement('div');
    root.id = 'siopi-official-print-root';
    root.className = 'siopi-official-print official-form-07o official-form-07o-batch';
    root.innerHTML = rowPages07O.map(renderPage07O).join('');

    document.body.appendChild(root);
    return root;
}

function buildOfficialPrint08O(key = '') {
    const db08 = getLS('08O_' + currentDI) || {};
    const report = db08[key] || null;
    if (!report) return document.getElementById('tabContent-08O');

    const pData = getProfilData(currentDI);
    const bendungNama = report.bendung || '';
    const periode = report.periode || '';
    const rowsSaved = report.rows || {};
    const bendungMeta = getBendungMeta01O(bendungNama, pData);
    const pengamatInfo = getPengamatSignatureInfo(pData);
    const kasieInfo = getKasieSignatureInfo(pData);
    const tanggalLaporan = formatTanggalLaporan(report.updatedAt || report.createdAt || report.timestamp);

    const parseDays = (periodeStr) => {
        const match = String(periodeStr || '').match(/^(\d+)-(\d+)/);
        if (!match) return Object.keys(rowsSaved).map(Number).filter(Number.isFinite).sort((a, b) => a - b);
        const start = parseInt(match[1], 10);
        const end = parseInt(match[2], 10);
        if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return [];
        return Array.from({ length: end - start + 1 }, (_, idx) => start + idx);
    };
    const days = parseDays(periode);
    const num08 = (value) => {
        const num = parseFloat(String(value ?? '').replace(',', '.'));
        return Number.isFinite(num) ? num : 0;
    };
    const display08 = (value) => {
        if (value === undefined || value === null || value === '' || value === '-') return '';
        const num = num08(value);
        return Number.isFinite(num) ? num.toFixed(2) : escapePrintValue(value);
    };
    const rowValues = days.map(day => {
        const saved = rowsSaved[String(day)] || rowsSaved[day] || {};
        const limpasH = num08(saved['limpas-h']);
        const limpasQ = num08(saved['limpas-q']);
        const kiriH = num08(saved['kiri-h']);
        const kiriQ = num08(saved['kiri-q']);
        const kananH = num08(saved['kanan-h']);
        const kananQ = num08(saved['kanan-q']);
        const saluran = num08(saved.saluran) || (kiriQ + kananQ);
        const sungai = num08(saved.sungai) || (saluran + limpasQ);
        const chunkIndex = days[0] === 1 ? Math.floor((day - 1) / 5) : Math.floor((day - 16) / 5);
        return { day, limpasH, limpasQ, kiriH, kiriQ, kananH, kananQ, saluran, sungai, chunkIndex };
    });
    const chunks = {};
    rowValues.forEach(row => {
        if (!chunks[row.chunkIndex]) chunks[row.chunkIndex] = { sum: 0, count: 0 };
        if (row.sungai > 0) {
            chunks[row.chunkIndex].sum += row.sungai;
            chunks[row.chunkIndex].count++;
        }
    });
    rowValues.forEach(row => {
        const chunk = chunks[row.chunkIndex];
        row.avg5 = chunk && chunk.count ? chunk.sum / chunk.count : 0;
    });
    const sums = rowValues.reduce((acc, row) => {
        acc.limpasH += row.limpasH;
        acc.limpasQ += row.limpasQ;
        acc.saluran += row.saluran;
        acc.sungai += row.sungai;
        return acc;
    }, { limpasH: 0, limpasQ: 0, saluran: 0, sungai: 0 });
    const dayCount = Math.max(rowValues.length, 1);
    const avgs = {
        limpasH: sums.limpasH / dayCount,
        limpasQ: sums.limpasQ / dayCount,
        saluran: sums.saluran / dayCount,
        sungai: sums.sungai / dayCount
    };
    const targetDebit = Object.values(getLS('07O_' + currentDI) || {}).reduce((total, data07) => {
        if (!data07 || data07.bendung !== bendungNama || data07.periode !== periode || !data07.rows) return total;
        return total + Object.values(data07.rows).reduce((sum, row) => sum + num08(row.diberikan), 0);
    }, 0);
    const maxRowsPerPage08O = 18;
    const rowPages08O = [];
    for (let i = 0; i < Math.max(rowValues.length, 1); i += maxRowsPerPage08O) {
        rowPages08O.push(rowValues.slice(i, i + maxRowsPerPage08O));
    }
    const field = (label, val, leftLabel, top, leftColon, leftValue) => `
        <div class="field-label" style="left:${leftLabel}mm; top:${top}mm;">${escapePrintValue(label)}</div>
        <div class="field-colon" style="left:${leftColon}mm; top:${top}mm;">:</div>
        <div class="field-value" style="left:${leftValue}mm; top:${top}mm;">${escapePrintValue(val)}</div>
    `;
    const colgroup = `
        <col style="width: 6%">
        <col style="width: 8%">
        <col style="width: 9%">
        <col style="width: 8%">
        <col style="width: 9%">
        <col style="width: 8%">
        <col style="width: 9%">
        <col style="width: 11%">
        <col style="width: 11%">
        <col style="width: 21%">
    `;
    const renderRow08O = (row) => `
        <tr>
            <td>${row.day || ''}</td>
            <td>${display08(row.limpasH)}</td>
            <td>${display08(row.limpasQ)}</td>
            <td>${display08(row.kiriH)}</td>
            <td>${display08(row.kiriQ)}</td>
            <td>${display08(row.kananH)}</td>
            <td>${display08(row.kananQ)}</td>
            <td>${display08(row.saluran)}</td>
            <td>${display08(row.sungai)}</td>
            <td>${display08(row.avg5)}</td>
        </tr>
    `;
    const renderFooter08O = () => `
        <tr class="section">
            <td></td>
            <td>${display08(sums.limpasH)}</td>
            <td>${display08(sums.limpasQ)}</td>
            <td colspan="4">Jumlah</td>
            <td>${display08(sums.saluran)}</td>
            <td>${display08(sums.sungai)}</td>
            <td></td>
        </tr>
        <tr class="section">
            <td></td>
            <td>${display08(avgs.limpasH)}</td>
            <td>${display08(avgs.limpasQ)}</td>
            <td colspan="4">Debit Rata-rata</td>
            <td>${display08(avgs.saluran)}</td>
            <td>${display08(avgs.sungai)}</td>
            <td></td>
        </tr>
    `;
    const renderSignature08O = () => `
        <div class="official-signatures">
            <div>
                <div>Mengetahui,</div>
                <div>Kasi OP Wil. Kabupaten</div>
                <span class="signature-name">${escapePrintValue(kasieInfo.nama || 'Nama')}</span>
                <div>NIP. ${escapePrintValue(kasieInfo.nip || '')}</div>
            </div>
            <div>
                <div>${escapePrintValue(tanggalLaporan || '')}</div>
                <div>Pengamat</div>
                <span class="signature-name">${escapePrintValue(pengamatInfo.nama || 'Nama')}</span>
                <div>NIP. ${escapePrintValue(pengamatInfo.nip || '')}</div>
            </div>
        </div>
    `;
    const renderPage08O = (pageRows, pageIndex) => {
        const isLastPage = pageIndex === rowPages08O.length - 1;
        const tableRowsCount = pageRows.length + (isLastPage ? 2 : 0);
        const signatureTop = Math.min(292, 58 + 17 + (Math.max(tableRowsCount, 1) * 4.6) + 10);
        return `
        <section class="official-form-08o official-form-08o-page" style="--signature-top:${signatureTop}mm;">
            <div class="official-code">Blangko 08 - O</div>
            <h1 class="official-title">Pencatatan Debit Bangunan Pengambilan Dan Sungai</h1>

            ${field('Daerah Irigasi', currentDI, 20, 28, 49, 53)}
            ${field('Nomor Kode DI', pData.kodeDI || '', 20, 33, 49, 53)}
            ${field('Total Luas Irigasi DI', getTotalLuasDI01O(pData), 20, 38, 49, 53)}
            ${field('Bendung/Pengambilan', bendungNama, 20, 43, 49, 53)}
            ${field('Luas Sawah Irigasi', bendungMeta.luas || '', 20, 48, 49, 53)}
            ${field('Periode Pemberian Air', periode, 112, 28, 149, 153)}
            ${field('Target Debit Saluran', targetDebit > 0 ? `${targetDebit.toFixed(2)} l/det` : '', 112, 33, 149, 153)}
            ${field('Pengamat', pData.pengamat || '', 112, 38, 149, 153)}
            ${field('Kabupaten/Kota', pData.kabupaten || '', 112, 43, 149, 153)}

            <table class="official-main-table">
                <colgroup>${colgroup}</colgroup>
                <thead>
                    <tr>
                        <th rowspan="3">Tanggal</th>
                        <th colspan="2">Debit Limpas Bendung</th>
                        <th colspan="4">Debit Pintu Masuk Pengambilan</th>
                        <th rowspan="3">Debit Saluran<br>(l/det)</th>
                        <th rowspan="3">Debit Sungai<br>(l/det)</th>
                        <th rowspan="3">Debit Sungai Rata-rata<br>5 Harian (l/det)</th>
                    </tr>
                    <tr>
                        <th rowspan="2">H<br>(cm)</th>
                        <th rowspan="2">Q<br>(l/det)</th>
                        <th colspan="2">Kiri</th>
                        <th colspan="2">Kanan</th>
                    </tr>
                    <tr>
                        <th>H<br>(cm)</th>
                        <th>Q<br>(l/det)</th>
                        <th>H<br>(cm)</th>
                        <th>Q<br>(l/det)</th>
                    </tr>
                </thead>
                <tbody>
                    ${pageRows.map(renderRow08O).join('')}
                    ${isLastPage ? renderFooter08O() : ''}
                </tbody>
            </table>
            ${isLastPage ? renderSignature08O() : ''}
        </section>
        `;
    };

    const root = document.createElement('div');
    root.id = 'siopi-official-print-root';
    root.className = 'siopi-official-print official-form-08o official-form-08o-batch';
    root.innerHTML = rowPages08O.map(renderPage08O).join('');

    document.body.appendChild(root);
    return root;
}

function buildOfficialPrint09O(key = '') {
    const db09 = getLS('09O_' + currentDI) || {};
    const report = db09[key] || null;
    if (!report) return document.getElementById('tabContent-09O');

    const pData = getProfilData(currentDI);
    const bendungNama = report.bendung || '';
    const periode = report.periode || '';
    const bendungMeta = getBendungMeta01O(bendungNama, pData);
    const pengamatInfo = getPengamatSignatureInfo(pData);
    const kasieInfo = getKasieSignatureInfo(pData);
    const tanggalLaporan = formatTanggalLaporan(report.updatedAt || report.createdAt || report.timestamp);

    const num09 = (value) => {
        const num = parseFloat(String(value ?? '').replace(',', '.'));
        return Number.isFinite(num) ? num : 0;
    };
    const fmt09 = (value, showZero = false) => {
        if ((value === undefined || value === null || value === '') && !showZero) return '';
        const num = num09(value);
        if (!showZero && num === 0) return '';
        return num.toFixed(2);
    };
    const field = (label, val, leftLabel, top, leftColon, leftValue) => `
        <div class="field-label" style="left:${leftLabel}mm; top:${top}mm;">${escapePrintValue(label)}</div>
        <div class="field-colon" style="left:${leftColon}mm; top:${top}mm;">:</div>
        <div class="field-value" style="left:${leftValue}mm; top:${top}mm;">${escapePrintValue(val)}</div>
    `;

    const qt = num09(report.qt);
    const ql = num09(report.ql);
    const qh = num09(report.qh);
    const qs = num09(report.qs);
    const jumlahKebutuhan = qt + ql + qh;
    const qb = jumlahKebutuhan - qs;

    const o8Data = getLS('08O_' + currentDI) || {};
    const rows08 = o8Data[`${bendungNama}_${periode}`]?.rows || {};
    const parts = String(periode || '').split(' ');
    const range = String(parts[0] || '').split('-');
    const startDay = parseInt(range[0], 10);
    const endDay = parseInt(range[1], 10);
    const dayCount = Number.isFinite(startDay) && Number.isFinite(endDay) && endDay >= startDay
        ? endDay - startDay + 1
        : Math.max(Object.keys(rows08).length, 1);
    const chunks = {};
    let sumSaluran = 0;
    Object.entries(rows08).forEach(([day, cols]) => {
        const d = parseInt(day, 10);
        const sungai = num09(cols?.sungai);
        const saluran = num09(cols?.saluran);
        if (saluran > 0) sumSaluran += saluran;
        if (sungai > 0 && Number.isFinite(d)) {
            const idx = d <= 15 ? Math.floor((d - 1) / 5) : Math.floor((d - 16) / 5);
            if (!chunks[idx]) chunks[idx] = { start: d, end: d, sum: 0, count: 0 };
            chunks[idx].start = Math.min(chunks[idx].start, d);
            chunks[idx].end = Math.max(chunks[idx].end, d);
            chunks[idx].sum += sungai;
            chunks[idx].count += 1;
        }
    });
    const chunkRows = Object.values(chunks)
        .sort((a, b) => a.start - b.start)
        .map(chunk => ({
            label: `${chunk.start}-${chunk.end}`,
            val: chunk.count ? chunk.sum / chunk.count : 0
        }));
    const qraFrom08 = chunkRows.length
        ? chunkRows.reduce((sum, row) => sum + row.val, 0) / chunkRows.length
        : 0;
    const qra = num09(report.qra) || qraFrom08;
    const batas100 = num09(report.batas100) || (sumSaluran > 0 ? sumSaluran / dayCount : 0);
    const batas70 = num09(report.batas70) || (batas100 * 0.7);
    const qa = Math.min(qra, qb);
    const qaQs = qa + qs;
    const qlQh = ql + qh;
    const selisih = qaQs - qlQh;
    const faktorK = qt > 0 ? Math.max(0, selisih / qt) : 0;
    const status = batas100 > 0
        ? (qa < batas100 * 0.6
            ? 'Sistem Pemberian Air: Giliran'
            : (qa >= batas70 ? 'Sistem Pemberian Air: Terus Menerus' : 'Sistem Pemberian Air: Terus Menerus (Mendekati Batas Giliran)'))
        : '';

    const row = (no, kode, uraian, jumlah, cls = '') => `
        <tr class="${cls}">
            <td>${escapePrintValue(no)}</td>
            <td>${escapePrintValue(kode)}</td>
            <td class="left">${escapePrintValue(uraian)}</td>
            <td>${escapePrintValue(jumlah)}</td>
        </tr>
    `;
    const table2Rows = chunkRows.length
        ? chunkRows.map((item, idx) => `
            <tr>
                <td>${idx + 1}</td>
                <td>${escapePrintValue(item.label)}</td>
                <td>${fmt09(item.val, true)}</td>
                <td>${fmt09(faktorK, true)}</td>
            </tr>
        `).join('')
        : `<tr><td colspan="4" class="left">Data debit sungai dari 08-O belum tersedia.</td></tr>`;

    const root = document.createElement('div');
    root.id = 'siopi-official-print-root';
    root.className = 'siopi-official-print official-form-09o';
    root.innerHTML = `
        <h1 class="official-title">Perhitungan Faktor - K</h1>

        ${field('Daerah Irigasi', currentDI, 20, 26, 51, 55)}
        ${field('No. Kode DI', pData.kodeDI || '', 20, 31, 51, 55)}
        ${field('Total Luas Irigasi DI', getTotalLuasDI01O(pData), 20, 36, 51, 55)}
        ${field('Bendung/Pengambilan', bendungNama, 108, 26, 148, 152)}
        ${field('Ranting/Pengamat', pData.pengamat || '', 108, 31, 148, 152)}
        ${field('Kabupaten', pData.kabupaten || '', 108, 36, 148, 152)}
        ${field('Periode Pemberian Air Tanggal', periode, 108, 41, 148, 152)}

        <div class="official-layout-09o">
            <div>
                <div class="official-section-title">1. Debit diperlukan (dari blanko 07 - O)</div>
                <table class="official-mini-table">
                    <colgroup>
                        <col style="width: 12%"><col style="width: 14%"><col style="width: 42%"><col style="width: 24%"><col style="width: 8%">
                    </colgroup>
                    <thead>
                        <tr>
                            <th rowspan="2">No</th>
                            <th rowspan="2">Kode</th>
                            <th rowspan="2">Debit</th>
                            <th rowspan="2">Jumlah<br>( l/det )</th>
                            <th rowspan="2"></th>
                        </tr>
                        <tr></tr>
                    </thead>
                    <tbody>
                        <tr><td>1.1.</td><td>Qt</td><td class="left">Di pintu tersier</td><td>${fmt09(qt)}</td><td></td></tr>
                        <tr><td>1.2.</td><td>Ql</td><td class="left">Kep. Lain-lain</td><td>${fmt09(ql)}</td><td></td></tr>
                        <tr><td>1.3.</td><td>Qh</td><td class="left">Hilang</td><td>${fmt09(qh)}</td><td>(+)</td></tr>
                        <tr><td rowspan="2">1.4.</td><td rowspan="2">Qs</td><td class="left">Jumlah</td><td>${fmt09(jumlahKebutuhan, true)}</td><td></td></tr>
                        <tr><td class="left">Suplesi</td><td>${fmt09(qs)}</td><td>(-)</td></tr>
                        <tr class="strong"><td>1.5.</td><td>Qb</td><td class="left">Di Bendung</td><td>${fmt09(qb, true)}</td><td></td></tr>
                    </tbody>
                </table>
            </div>

            <div>
                <div class="official-section-title">2. Debit Tersedia (dari Blanko 08 - O) **)</div>
                <table class="official-mini-table">
                    <colgroup>
                        <col style="width: 12%"><col style="width: 30%"><col style="width: 29%"><col style="width: 29%">
                    </colgroup>
                    <thead>
                        <tr><th rowspan="3">No</th><th colspan="3">Q Rata-rata</th></tr>
                        <tr><th rowspan="2">Tanggal</th><th>Jumlah</th><th>Faktor K</th></tr>
                        <tr><th>(m3/det)</th><th>(K1/K2/K3...)</th></tr>
                    </thead>
                    <tbody>${table2Rows}</tbody>
                </table>
            </div>

            <div class="official-wide-09o">
                <div class="official-section-title">3. Debit dialirkan</div>
                <table class="official-mini-table">
                    <colgroup>
                        <col style="width: 24%"><col style="width: 12%"><col style="width: 16%"><col style="width: 16%"><col style="width: 32%">
                    </colgroup>
                    <thead>
                        <tr><th colspan="2">N e r a c a</th><th>Debit dialirkan (Qa)</th><th colspan="2">Batas Normal</th></tr>
                        <tr><th>Debit</th><th>( l/det )</th><th>(l/det)</th><th>(l/det)</th><th>Debit</th></tr>
                    </thead>
                    <tbody>
                        <tr><td class="left">Tersedia (Qra) (b)</td><td>${fmt09(qra, true)}</td><td rowspan="2" class="strong">${fmt09(qa, true)}</td><td>${fmt09(batas100, true)}</td><td>Q 100% Saluran</td></tr>
                        <tr><td class="left">Diperlukan (Qb) (a)</td><td>${fmt09(qb, true)}</td><td>${fmt09(batas70, true)}</td><td>Q 70% Saluran</td></tr>
                    </tbody>
                </table>
            </div>

            <div class="official-bottom-09o">
                <div>
                    <div class="official-section-title">4. Perhitungan Faktor K</div>
                    <table class="official-mini-table">
                        <colgroup>
                            <col style="width: 14%"><col style="width: 16%"><col style="width: 42%"><col style="width: 28%">
                        </colgroup>
                        <thead>
                            <tr><th rowspan="2">No</th><th rowspan="2">Kode</th><th>Debit<br>(l/det)</th><th>Total Debit<br>( l/det )</th></tr>
                            <tr></tr>
                        </thead>
                        <tbody>
                            <tr><td>4.1.</td><td>(Qa)</td><td>${fmt09(qa, true)}</td><td class="strong">( c )</td></tr>
                            <tr><td>4.2.</td><td>Qs</td><td>${fmt09(qs, true)}</td><td>${fmt09(qaQs, true)}</td></tr>
                            <tr><td>4.3.</td><td>Ql</td><td>${fmt09(ql, true)}</td><td class="strong">(d)</td></tr>
                            <tr><td>4.4.</td><td>Qh</td><td>${fmt09(qh, true)}</td><td>${fmt09(qlQh, true)}</td></tr>
                            <tr><td>4.5.</td><td colspan="2">Selisih = ( c ) - (d)</td><td>${fmt09(selisih, true)}</td></tr>
                            <tr><td>4.6.</td><td colspan="2">Qt</td><td>${fmt09(qt, true)}</td></tr>
                            <tr class="strong"><td colspan="2" rowspan="2">Faktor - K =</td><td style="border-bottom:1px solid #000000 !important;">4.5</td><td rowspan="2">${fmt09(faktorK, true)}</td></tr>
                            <tr class="strong"><td>4.6</td></tr>
                        </tbody>
                    </table>
                </div>

                <div class="official-signatures">
                    <div>${escapePrintValue(tanggalLaporan || 'Tanggal Laporan')}</div>
                    <div>Ranting /Pengamat</div>
                    <div>${escapePrintValue(bendungNama || currentDI)}</div>
                    <span class="signature-name">${escapePrintValue(pengamatInfo.nama || 'Nama')}</span>
                    <div>NIP. ${escapePrintValue(pengamatInfo.nip || '')}</div>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(root);
    return root;
}

function buildOfficialPrint10O(key = '') {
    const db10 = getLS('10O_' + currentDI) || {};
    const report = db10[key] || null;
    if (!report) return document.getElementById('tabContent-10O');

    const pData = getProfilData(currentDI);
    const pengamatInfo = getPengamatSignatureInfo(pData);
    const kasieInfo = getKasieSignatureInfo(pData);
    const tanggalLaporan = formatTanggalLaporan(report.updatedAt || report.createdAt || report.timestamp);
    const luasSawah = parseFloat(String(getTotalLuasDI01O(pData)).replace(',', '.')) || 0;
    const jumlahJuru = (pData.jurus || []).filter(juru => juru && String(juru.nama || '').trim() !== '').length;
    const num10 = (value) => {
        const num = parseFloat(String(value ?? '').replace(',', '.'));
        return Number.isFinite(num) ? num : 0;
    };
    const fmt10 = (value, showZero = false) => {
        const num = num10(value);
        if (!showZero && num === 0) return '';
        return num.toFixed(2);
    };
    const field = (label, val, leftLabel, top, leftColon, leftValue) => `
        <div class="field-label" style="left:${leftLabel}mm; top:${top}mm;">${escapePrintValue(label)}</div>
        <div class="field-colon" style="left:${leftColon}mm; top:${top}mm;">:</div>
        <div class="field-value" style="left:${leftValue}mm; top:${top}mm;">${escapePrintValue(val)}</div>
    `;
    const periods = buildPeriods10O(report.periode || key);
    const tanamCols = ['padi-1','padi-2i','padi-2t','padi-3','pala-1','pala-2','pala-3','tebu','lain'];
    const maxTanam = Object.fromEntries([...tanamCols, 'jumlah'].map(c => [c, 0]));
    const calcRow = (saved = {}) => {
        const values = {};
        tanamCols.forEach(col => values[col] = num10(saved[col]));
        values.jumlah = tanamCols.reduce((sum, col) => sum + values[col], 0);
        values.bero = luasSawah > 0 ? Math.max(0, luasSawah - values.jumlah) : 0;
        ['q-tersedia','q-ambil','q-limpas','q-suplesi','keb-tersier','keb-lain','faktor-k','q-rencana','hujan'].forEach(col => values[col] = num10(saved[col]));
        values['q-hilang'] = saved['q-hilang'] !== undefined && saved['q-hilang'] !== '' ? num10(saved['q-hilang']) : (values['q-ambil'] || values['q-rencana'] ? values['q-ambil'] - values['q-rencana'] : 0);
        values.neraca = saved['q-tersedia'] !== undefined && saved['q-tersedia'] !== '' ? values['q-tersedia'] - (values['keb-tersier'] + values['keb-lain']) : 0;
        values.rasio = values['q-rencana'] > 0 ? values['q-ambil'] / values['q-rencana'] : 0;
        tanamCols.forEach(col => { if (values[col] > maxTanam[col]) maxTanam[col] = values[col]; });
        if (values.jumlah > maxTanam.jumlah) maxTanam.jumlah = values.jumlah;
        return values;
    };
    const rowHtml = periods.map(period => {
        const values = calcRow(report.rows?.[period.key] || {});
        return `
            <tr>
                <td class="left">${escapePrintValue(period.label)}</td>
                <td>${fmt10(values['padi-1'])}</td>
                <td>${fmt10(values['padi-2i'])}</td>
                <td>${fmt10(values['padi-2t'])}</td>
                <td>${fmt10(values['padi-3'])}</td>
                <td>${fmt10(values['pala-1'])}</td>
                <td>${fmt10(values['pala-2'])}</td>
                <td>${fmt10(values['pala-3'])}</td>
                <td>${fmt10(values.tebu)}</td>
                <td>${fmt10(values.lain)}</td>
                <td>${fmt10(values.jumlah)}</td>
                <td>${fmt10(values.bero, luasSawah > 0)}</td>
                <td>${fmt10(values['q-tersedia'])}</td>
                <td>${fmt10(values['q-ambil'])}</td>
                <td>${fmt10(values['q-limpas'])}</td>
                <td>${fmt10(values['q-hilang'])}</td>
                <td>${fmt10(values['q-suplesi'])}</td>
                <td>${fmt10(values['keb-tersier'])}</td>
                <td>${fmt10(values['keb-lain'])}</td>
                <td>${fmt10(values['faktor-k'])}</td>
                <td>${fmt10(values['q-rencana'])}</td>
                <td>${fmt10(values.hujan)}</td>
                <td>${fmt10(values.neraca)}</td>
                <td>${fmt10(values.rasio)}</td>
            </tr>
        `;
    }).join('');
    const intensity = (col) => luasSawah > 0 && maxTanam[col] > 0 ? `${((maxTanam[col] / luasSawah) * 100).toFixed(2)}%` : '';
    const totalIntensity = ['padi-1','padi-2i','padi-2t','padi-3','pala-1','pala-2','pala-3','tebu'].reduce((sum, col) => sum + (luasSawah > 0 ? (maxTanam[col] / luasSawah) * 100 : 0), 0);
    const cropDamageSubCols = `
        <col style="width:16%">${Array.from({ length: 10 }, () => '<col style="width:8.4%">').join('')}
    `;
    const planSubCols = `
        <col style="width:16%">${Array.from({ length: 11 }, () => '<col style="width:7.636%">').join('')}
    `;
    const cropDamageCols10 = ['padi-1','padi-2i','padi-2t','padi-3','pala-1','pala-2','pala-3','tebu','lain','jumlah'];
    const planCols10 = [...cropDamageCols10, 'bero'];
    const extra10 = report.extra || {};
    const cropDamage10 = getCropDamage10OFrom05O();
    const plantPlanThisYear10 = getPlantPlanThisYear10OFrom04O();
    const extraVal10 = (section, row, col) => escapePrintValue(extra10?.[section]?.[row]?.[col] || '');
    const cropDamageCells10 = (row) => cropDamageCols10.map(col => {
        const val = cropDamage10?.[row]?.[col] || 0;
        return `<td>${fmt10(val)}</td>`;
    }).join('');
    const plantPlanCells10 = (row) => planCols10.map(col => {
        if (row === 'thisYear') return `<td>${fmt10(plantPlanThisYear10[col])}</td>`;
        return `<td>${extraVal10('plantPlan', row, col)}</td>`;
    }).join('');
    const produksiPadi = maxTanam['padi-1'];
    const produksiGaduIzin = maxTanam['padi-2i'];
    const produksiGaduTidakIzin = maxTanam['padi-2t'];
    const produksiPalawija = Math.max(maxTanam['pala-1'], maxTanam['pala-2'], maxTanam['pala-3']);
    const produksiTebu = maxTanam.tebu;
    const produksiCols10 = [
        { key: 'padi', peak: produksiPadi },
        { key: 'gaduIzin', peak: produksiGaduIzin },
        { key: 'gaduTidak', peak: produksiGaduTidakIzin },
        { key: 'palawija', peak: produksiPalawija },
        { key: 'tebu', peak: produksiTebu }
    ];
    const productionCells10 = (row, autoMultiply = false) => produksiCols10.map(item => {
        if (autoMultiply) {
            const saved = extra10?.production?.hasil?.[item.key];
            if (saved !== undefined && saved !== '') return `<td>${escapePrintValue(saved)}</td>`;
            const ubinan = num10(extra10?.production?.ubinan?.[item.key]);
            const hasil = item.peak * ubinan;
            return `<td>${fmt10(hasil)}</td>`;
        }
        if (row === 'jumlah') {
            const saved = extra10?.production?.hasil?.[item.key];
            if (saved !== undefined && saved !== '') return `<td>${fmt10(item.peak + num10(saved))}</td>`;
            const ubinan = num10(extra10?.production?.ubinan?.[item.key]);
            const hasil = item.peak * ubinan;
            return `<td>${fmt10(item.peak + hasil)}</td>`;
        }
        return `<td>${extraVal10('production', row, item.key)}</td>`;
    }).join('');

    const root = document.createElement('div');
    root.id = 'siopi-official-print-root';
    root.className = 'siopi-official-print official-form-10o';
    root.innerHTML = `
        <div class="official-code">Blangko 10 - O</div>
        <h1 class="official-title">Laporan Tahunan Rekapitulasi Operasi Daerah Irigasi</h1>
        ${field('Daerah Irigasi', currentDI, 20, 24, 54, 58)}
        ${field('No. Kode DI', pData.kodeDI || '', 20, 29, 54, 58)}
        ${field('Total Luas Irigasi DI', getTotalLuasDI01O(pData), 20, 34, 54, 58)}
        ${field('Kabupaten/Kota', pData.kabupaten || '', 20, 39, 54, 58)}
        ${field('Periode Masa Tanam', report.periode || key, 190, 24, 225, 229)}
        ${field('Pengamat', pData.pengamat || '', 190, 29, 225, 229)}
        ${field('Jumlah Juru', jumlahJuru > 0 ? `${jumlahJuru} Juru` : '', 190, 34, 225, 229)}

        <table class="official-main-table">
            <colgroup>
                <col style="width:6.5%">${Array.from({ length: 23 }, () => '<col style="width:4.065%">').join('')}
            </colgroup>
            <thead>
                <tr>
                    <th rowspan="3">Bulan</th>
                    <th colspan="11">Realisasi Tanam (Akumulasi D.I)</th>
                    <th colspan="12">Keadaan Air (Akumulasi D.I)</th>
                </tr>
                <tr>
                    <th colspan="4">Padi (ha)</th>
                    <th colspan="3">Palawija (ha)</th>
                    <th rowspan="2">Tebu</th>
                    <th rowspan="2">Lain</th>
                    <th rowspan="2">Jumlah</th>
                    <th rowspan="2">Bero</th>
                    <th rowspan="2">Debit Tersedia</th>
                    <th rowspan="2">Debit Ambil</th>
                    <th rowspan="2">Q Limpas</th>
                    <th rowspan="2">Kel. Air</th>
                    <th rowspan="2">Q Suplesi</th>
                    <th colspan="2">Kebutuhan Air</th>
                    <th rowspan="2">Faktor K</th>
                    <th rowspan="2">Debit Rencana</th>
                    <th rowspan="2">Hujan</th>
                    <th rowspan="2">Neraca</th>
                    <th rowspan="2">Q Ambil / Rencana</th>
                </tr>
                <tr>
                    <th>MT1</th><th>MT2 Izin</th><th>MT2 Tdk Izin</th><th>MT3</th>
                    <th>MT1</th><th>MT2</th><th>MT3</th>
                    <th>Tersier</th><th>Lain</th>
                </tr>
            </thead>
            <tbody>
                ${rowHtml}
                <tr class="section">
                    <td class="left">Puncak Luas Tanam</td>
                    <td>${fmt10(maxTanam['padi-1'])}</td><td>${fmt10(maxTanam['padi-2i'])}</td><td>${fmt10(maxTanam['padi-2t'])}</td><td>${fmt10(maxTanam['padi-3'])}</td>
                    <td>${fmt10(maxTanam['pala-1'])}</td><td>${fmt10(maxTanam['pala-2'])}</td><td>${fmt10(maxTanam['pala-3'])}</td><td>${fmt10(maxTanam.tebu)}</td><td>${fmt10(maxTanam.lain)}</td><td>${fmt10(maxTanam.jumlah)}</td>
                    <td colspan="13"></td>
                </tr>
                <tr class="section">
                    <td class="left">Intensitas Tanam MT</td>
                    <td>${intensity('padi-1')}</td><td>${intensity('padi-2i')}</td><td>${intensity('padi-2t')}</td><td>${intensity('padi-3')}</td>
                    <td>${intensity('pala-1')}</td><td>${intensity('pala-2')}</td><td>${intensity('pala-3')}</td><td>${intensity('tebu')}</td><td>${intensity('lain')}</td><td>${intensity('jumlah')}</td>
                    <td colspan="13"></td>
                </tr>
                <tr class="section">
                    <td class="left" colspan="10">Intensitas Tanaman Total</td>
                    <td>${totalIntensity > 0 ? `${totalIntensity.toFixed(2)}%` : ''}</td>
                    <td colspan="13"></td>
                </tr>
            </tbody>
        </table>

        <table class="official-side-table official-crop-damage-table">
            <colgroup>${cropDamageSubCols}</colgroup>
            <thead>
                <tr><th colspan="11" class="title-left">2. Kerusakan Tanam dari Blanko 05 - O</th></tr>
                <tr>
                    <th rowspan="2">Uraian</th>
                    <th colspan="4">Padi (ha)</th>
                    <th colspan="3">Palawija (ha)</th>
                    <th rowspan="2">Tebu</th>
                    <th rowspan="2">Lain</th>
                    <th rowspan="2">Jumlah</th>
                </tr>
                <tr>
                    <th>MT1</th><th>MT2 Izin</th><th>MT2 Tdk Izin</th><th>MT3</th>
                    <th>MT1</th><th>MT2</th><th>MT3</th>
                </tr>
            </thead>
            <tbody>
                <tr><td class="left">Genangan/banjir</td>${cropDamageCells10('flood')}</tr>
                <tr><td class="left">Kekeringan</td>${cropDamageCells10('drought')}</tr>
            </tbody>
        </table>

        <table class="official-side-table official-plant-plan-table">
            <colgroup>${planSubCols}</colgroup>
            <thead>
                <tr><th colspan="12" class="title-left">3. Rencana Tanam</th></tr>
                <tr>
                    <th rowspan="2">Uraian</th>
                    <th colspan="4">Padi (ha)</th>
                    <th colspan="3">Palawija (ha)</th>
                    <th rowspan="2">Tebu</th>
                    <th rowspan="2">Lain</th>
                    <th rowspan="2">Jumlah</th>
                    <th rowspan="2">Bero</th>
                </tr>
                <tr>
                    <th>MT1</th><th>MT2 Izin</th><th>MT2 Tdk Izin</th><th>MT3</th>
                    <th>MT1</th><th>MT2</th><th>MT3</th>
                </tr>
            </thead>
            <tbody>
                <tr><td class="left">Rencana tahun ini</td>${plantPlanCells10('thisYear')}</tr>
                <tr><td class="left">Rencana YAD</td>${plantPlanCells10('nextYear')}</tr>
            </tbody>
        </table>

        <table class="official-production-table">
            <colgroup>
                <col style="width:34%">
                <col style="width:13.2%">
                <col style="width:13.2%">
                <col style="width:13.2%">
                <col style="width:13.2%">
                <col style="width:13.2%">
            </colgroup>
            <thead>
                <tr><th colspan="6" class="title-left">5. Produksi Tanaman</th></tr>
                <tr>
                    <th>Perihal</th>
                    <th>Padi Rendeng</th>
                    <th>Gadu Izin</th>
                    <th>Gadu tak Izin</th>
                    <th>Palawija</th>
                    <th>Tebu/bibit</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td class="left">a) Puncak luas tanam (ha)</td>
                    <td>${fmt10(produksiPadi)}</td>
                    <td>${fmt10(produksiGaduIzin)}</td>
                    <td>${fmt10(produksiGaduTidakIzin)}</td>
                    <td>${fmt10(produksiPalawija)}</td>
                    <td>${fmt10(produksiTebu)}</td>
                </tr>
                <tr><td class="left">b) Data ubinan dari DIPERTA rata2</td>${productionCells10('ubinan')}</tr>
                <tr><td class="left">c) = (a) x (b). Produksi padi ton</td>${productionCells10('hasil', true)}</tr>
                <tr><td class="left">Jumlah Produksi (ton)</td>${productionCells10('jumlah')}</tr>
            </tbody>
        </table>

        <div class="official-signatures">
            <div>
                <div>Mengetahui,</div>
                <div>Kasi OP Wil. Kabupaten</div>
                <span class="signature-name">${escapePrintValue(kasieInfo.nama || 'Nama')}</span>
                <div>NIP. ${escapePrintValue(kasieInfo.nip || '')}</div>
            </div>
            <div>
                <div>${escapePrintValue(tanggalLaporan || '')}</div>
                <div>Pengamat</div>
                <span class="signature-name">${escapePrintValue(pengamatInfo.nama || 'Nama')}</span>
                <div>NIP. ${escapePrintValue(pengamatInfo.nip || '')}</div>
            </div>
        </div>
    `;

    document.body.appendChild(root);
    return root;
}

function buildOfficialPrint11O(key = '') {
    const db11 = getLS('11O_GLOBAL') || {};
    const report = db11[key] || null;
    if (!report) return document.getElementById('tabContent-11O');

    const kab = report.kab || String(key || '').split('_')[0] || '';
    const mt = report.mt || String(key || '').split('_')[1] || '';
    const allDIs = getAllDI().filter(di => {
        const pData = getProfilData(di);
        return pData && pData.kabupaten && pData.kabupaten.trim() === kab;
    });
    const firstProfile = getProfilData(allDIs[0] || currentDI);
    const kasieInfo = getKasieSignatureInfo(firstProfile);
    const tanggalLaporan = formatTanggalLaporan(report.updatedAt || report.createdAt || report.timestamp);
    const periodeText = (() => {
        for (let di of allDIs) {
            const o1Data = getLS('01O_' + di) || {};
            const keys = Object.keys(o1Data);
            if (keys.length > 0) {
                const propMT = mt === 'MT1' ? 'mt1' : (mt === 'MT2' ? 'mt2' : 'mt3');
                if (o1Data[keys[0]]?.[propMT]) return o1Data[keys[0]][propMT];
            }
        }
        return mt || '';
    })();
    const num = (value) => parseFloat(String(value ?? '').replace(',', '.')) || 0;
    const fmt = (value, showZero = false) => {
        const n = num(value);
        if (!showZero && n === 0) return '';
        return n.toFixed(2);
    };
    const field = (label, val, leftLabel, top, leftColon, leftValue) => `
        <div class="field-label" style="left:${leftLabel}mm; top:${top}mm;">${escapePrintValue(label)}</div>
        <div class="field-colon" style="left:${leftColon}mm; top:${top}mm;">:</div>
        <div class="field-value" style="left:${leftValue}mm; top:${top}mm;">${escapePrintValue(val)}</div>
    `;
    const cols = ['ren-padi','ren-tebu-b','ren-tebu-l','ren-pala','ren-lain','ren-jml','ren-bero',
        'real-padi-i','real-padi-t','real-tebu','real-pala','real-lain','real-jml','real-bero',
        'k-padi','k-pala','k-tebu','b-padi','b-pala','b-tebu'];
    const totals = { luas: 0 };
    cols.forEach(col => totals[col] = 0);
    let totalJuru = 0;
    let totalPengamat = 0;
    const rowHtmlItems = allDIs.map((diName, index) => {
        const pData = getProfilData(diName);
        const rowData = report.rows?.[diName] || {};
        const juruSet = new Set();
        let luas = 0;
        (pData.bendungs || []).forEach(b => {
            if (b.juru) juruSet.add(b.juru);
            else if (b.nama) juruSet.add(`Juru ${b.nama}`);
            (b.rincian || []).forEach(r => luas += num(r.luasFungsional));
        });
        totalJuru += juruSet.size;
        if (pData.pengamat) totalPengamat += 1;
        const renJml = num(rowData['ren-padi']) + num(rowData['ren-tebu-b']) + num(rowData['ren-tebu-l']) + num(rowData['ren-pala']) + num(rowData['ren-lain']);
        const renBero = luas > 0 ? Math.max(0, luas - renJml) : 0;
        const realJml = num(rowData['real-padi-i']) + num(rowData['real-padi-t']) + num(rowData['real-tebu']) + num(rowData['real-pala']) + num(rowData['real-lain']);
        const realBero = luas > 0 ? Math.max(0, luas - realJml) : 0;
        const values = {
            ...rowData,
            'ren-jml': renJml,
            'ren-bero': renBero,
            'real-jml': realJml,
            'real-bero': realBero
        };
        totals.luas += luas;
        cols.forEach(col => totals[col] += num(values[col]));
        return `
            <tr>
                <td>${index + 1}</td>
                <td class="left">${escapePrintValue(diName)}</td>
                <td class="left">${escapePrintValue(pData.pengamat || '')}</td>
                <td class="left">${escapePrintValue(Array.from(juruSet).join(', '))}</td>
                <td>${fmt(luas, true)}</td>
                <td>${fmt(values['ren-padi'])}</td>
                <td>${fmt(values['ren-tebu-b'])}</td>
                <td>${fmt(values['ren-tebu-l'])}</td>
                <td>${fmt(values['ren-pala'])}</td>
                <td>${fmt(values['ren-lain'])}</td>
                <td>${fmt(values['ren-jml'])}</td>
                <td>${fmt(values['ren-bero'], luas > 0)}</td>
                <td>${fmt(values['real-padi-i'])}</td>
                <td>${fmt(values['real-padi-t'])}</td>
                <td>${fmt(values['real-tebu'])}</td>
                <td>${fmt(values['real-pala'])}</td>
                <td>${fmt(values['real-lain'])}</td>
                <td>${fmt(values['real-jml'])}</td>
                <td>${fmt(values['real-bero'], luas > 0)}</td>
                <td>${fmt(values['k-padi'])}</td>
                <td>${fmt(values['k-pala'])}</td>
                <td>${fmt(values['k-tebu'])}</td>
                <td>${fmt(values['b-padi'])}</td>
                <td>${fmt(values['b-pala'])}</td>
                <td>${fmt(values['b-tebu'])}</td>
            </tr>
        `;
    });
    const totalCell = (col) => `<td>${fmt(totals[col], col.includes('bero') || col === 'luas')}</td>`;
    const maxRowsPerPage11O = 22;
    const rowPages11O = [];
    if (rowHtmlItems.length === 0) {
        rowPages11O.push([`<tr><td colspan="25">Tidak ada data D.I. untuk kabupaten/kota ini.</td></tr>`]);
    } else {
        for (let i = 0; i < rowHtmlItems.length; i += maxRowsPerPage11O) {
            rowPages11O.push(rowHtmlItems.slice(i, i + maxRowsPerPage11O));
        }
    }
    const renderTable11O = (pageRows, isLastPage) => `
        <table class="official-main-table">
            <colgroup>
                <col style="width:2.5%">
                <col style="width:10.5%">
                <col style="width:8.5%">
                <col style="width:10%">
                <col style="width:4%">
                ${Array.from({ length: 20 }, () => '<col style="width:3.225%">').join('')}
            </colgroup>
            <thead>
                <tr>
                    <th rowspan="3">No.</th>
                    <th rowspan="3">Daerah Irigasi</th>
                    <th rowspan="3">Pengamat / UPTD</th>
                    <th rowspan="3">Mantri / Juru</th>
                    <th rowspan="3">Luas Sawah<br>(ha)</th>
                    <th colspan="7">Rencana Luas Tanam (ha)</th>
                    <th colspan="7">Realisasi Luas Tanam (ha)</th>
                    <th colspan="6">Areal Kena Musibah (ha)</th>
                </tr>
                <tr>
                    <th rowspan="2">Padi</th>
                    <th colspan="2">Tebu</th>
                    <th rowspan="2">Palawija</th>
                    <th rowspan="2">Lain-lain</th>
                    <th rowspan="2">Jumlah</th>
                    <th rowspan="2">Bero</th>
                    <th colspan="2">Padi</th>
                    <th rowspan="2">Tebu</th>
                    <th rowspan="2">Palawija</th>
                    <th rowspan="2">Lain-lain</th>
                    <th rowspan="2">Jumlah</th>
                    <th rowspan="2">Bero</th>
                    <th colspan="3">Kekeringan</th>
                    <th colspan="3">Genangan Banjir</th>
                </tr>
                <tr>
                    <th>Baru</th><th>Lama</th>
                    <th>Izin</th><th>Tdk Izin</th>
                    <th>Padi Izin</th><th>Palawija</th><th>Tebu</th>
                    <th>Padi</th><th>Palawija</th><th>Tebu</th>
                </tr>
            </thead>
            <tbody>
                ${pageRows.join('')}
                ${isLastPage ? `
                <tr class="section">
                    <td colspan="4" class="left">Jumlah</td>
                    ${totalCell('luas')}
                    ${totalCell('ren-padi')}${totalCell('ren-tebu-b')}${totalCell('ren-tebu-l')}${totalCell('ren-pala')}${totalCell('ren-lain')}${totalCell('ren-jml')}${totalCell('ren-bero')}
                    ${totalCell('real-padi-i')}${totalCell('real-padi-t')}${totalCell('real-tebu')}${totalCell('real-pala')}${totalCell('real-lain')}${totalCell('real-jml')}${totalCell('real-bero')}
                    ${totalCell('k-padi')}${totalCell('k-pala')}${totalCell('k-tebu')}${totalCell('b-padi')}${totalCell('b-pala')}${totalCell('b-tebu')}
                </tr>
                <tr class="section">
                    <td colspan="4" class="left">D.I: ${allDIs.length} &nbsp;&nbsp; Pengamat: ${totalPengamat} &nbsp;&nbsp; Juru: ${totalJuru}</td>
                    <td colspan="21"></td>
                </tr>` : ''}
            </tbody>
        </table>
    `;
    const renderSignature11O = () => `
        <div class="official-signatures">
            <div>
                <div>${escapePrintValue(tanggalLaporan || '')}</div>
                <div>Koordinator OP Irigasi Wilayah Kabupaten</div>
                <span class="signature-name">${escapePrintValue(kasieInfo.nama || 'Nama')}</span>
                <div>NIP. ${escapePrintValue(kasieInfo.nip || '')}</div>
            </div>
        </div>
    `;
    const renderPage11O = (pageRows, pageIndex) => {
        const isLastPage = pageIndex === rowPages11O.length - 1;
        const tableRowsCount = pageRows.length + (isLastPage ? 2 : 0);
        const signatureTop = Math.min(172, 43 + 13 + (Math.max(tableRowsCount, 1) * 4.1) + 8);
        return `
        <section class="official-form-11o official-form-11o-page" style="--signature-top:${signatureTop}mm;">
            <div class="official-code">Blangko 11 - O</div>
            <h1 class="official-title">Rekapitulasi Rencana, Realisasi Tanam dan Areal Kena Musibah per Kabupaten/Kota</h1>
            ${field('Kabupaten/Kota', kab, 22, 24, 55, 59)}
            ${field('Periode Masa Tanam', periodeText, 22, 30, 55, 59)}
            ${renderTable11O(pageRows, isLastPage)}
            ${isLastPage ? renderSignature11O() : ''}
        </section>
        `;
    };

    const root = document.createElement('div');
    root.id = 'siopi-official-print-root';
    root.className = 'siopi-official-print official-form-11o official-form-11o-batch';
    root.innerHTML = rowPages11O.map(renderPage11O).join('');

    document.body.appendChild(root);
    return root;
}

function buildOfficialPrint12O(key = '') {
    const db12 = getLS('12O_GLOBAL') || {};
    const periode = key || Object.keys(db12).sort().reverse()[0] || '';
    const report = db12[periode] || null;
    if (!report) return document.getElementById('tabContent-12O');

    const firstProfile = getProfilData(currentDI);
    const koordinatorInfo = getKasieSignatureInfo(firstProfile);
    const tanggalLaporan = formatTanggalLaporan(report.updatedAt || report.createdAt || report.timestamp);
    const num = (value) => parseFloat(String(value ?? '').replace(',', '.')) || 0;
    const fmt = (value, showZero = false) => {
        const n = num(value);
        if (!showZero && n === 0) return '';
        return n.toFixed(2);
    };
    const field = (label, val, leftLabel, top, leftColon, leftValue) => `
        <div class="field-label" style="left:${leftLabel}mm; top:${top}mm;">${escapePrintValue(label)}</div>
        <div class="field-colon" style="left:${leftColon}mm; top:${top}mm;">:</div>
        <div class="field-value" style="left:${leftValue}mm; top:${top}mm;">${escapePrintValue(val)}</div>
    `;
    const cols = ['jml-di',
        'ren-padi-1','ren-padi-2','ren-padi-3','ren-pala-1','ren-pala-2','ren-pala-3','ren-tebu-m','ren-tebu-t','ren-lain','ren-jml','ren-bero',
        'real-padi-1','real-padi-2','real-padi-3','real-pala-1','real-pala-2','real-pala-3','real-tebu-m','real-tebu-t','real-lain','real-jml','real-bero',
        'k-padi','k-pala','k-tebu','b-padi','b-pala','b-tebu'];
    const totals = {};
    cols.forEach(col => totals[col] = 0);
    const kabNames = Object.keys(report.rows || {}).sort();
    const calcRowValues = (rowData = {}) => {
        const values = { ...rowData };
        values['ren-jml'] = num(values['ren-padi-1']) + num(values['ren-padi-2']) + num(values['ren-padi-3']) +
            num(values['ren-pala-1']) + num(values['ren-pala-2']) + num(values['ren-pala-3']) +
            num(values['ren-tebu-m']) + num(values['ren-tebu-t']) + num(values['ren-lain']);
        values['real-jml'] = num(values['real-padi-1']) + num(values['real-padi-2']) + num(values['real-padi-3']) +
            num(values['real-pala-1']) + num(values['real-pala-2']) + num(values['real-pala-3']) +
            num(values['real-tebu-m']) + num(values['real-tebu-t']) + num(values['real-lain']);
        return values;
    };
    const rowHtmlItems = (kabNames.length ? kabNames : ['']).map((kabName, index) => {
        if (!kabName) return `<tr><td colspan="31">Tidak ada data kabupaten/kota.</td></tr>`;
        const values = calcRowValues(report.rows[kabName] || {});
        cols.forEach(col => totals[col] += num(values[col]));
        return `
            <tr>
                <td>${index + 1}</td>
                <td class="left">${escapePrintValue(kabName)}</td>
                <td>${fmt(values['jml-di'], true)}</td>
                <td>${fmt(values['ren-padi-1'])}</td><td>${fmt(values['ren-padi-2'])}</td><td>${fmt(values['ren-padi-3'])}</td>
                <td>${fmt(values['ren-pala-1'])}</td><td>${fmt(values['ren-pala-2'])}</td><td>${fmt(values['ren-pala-3'])}</td>
                <td>${fmt(values['ren-tebu-m'])}</td><td>${fmt(values['ren-tebu-t'])}</td><td>${fmt(values['ren-lain'])}</td><td>${fmt(values['ren-jml'])}</td><td>${fmt(values['ren-bero'])}</td>
                <td>${fmt(values['real-padi-1'])}</td><td>${fmt(values['real-padi-2'])}</td><td>${fmt(values['real-padi-3'])}</td>
                <td>${fmt(values['real-pala-1'])}</td><td>${fmt(values['real-pala-2'])}</td><td>${fmt(values['real-pala-3'])}</td>
                <td>${fmt(values['real-tebu-m'])}</td><td>${fmt(values['real-tebu-t'])}</td><td>${fmt(values['real-lain'])}</td><td>${fmt(values['real-jml'])}</td><td>${fmt(values['real-bero'])}</td>
                <td>${fmt(values['k-padi'])}</td><td>${fmt(values['k-pala'])}</td><td>${fmt(values['k-tebu'])}</td>
                <td>${fmt(values['b-padi'])}</td><td>${fmt(values['b-pala'])}</td><td>${fmt(values['b-tebu'])}</td>
            </tr>
        `;
    });
    const totalCell = (col) => `<td>${fmt(totals[col], col === 'jml-di')}</td>`;
    const maxRowsPerPage12O = 20;
    const rowPages12O = [];
    for (let i = 0; i < rowHtmlItems.length; i += maxRowsPerPage12O) {
        rowPages12O.push(rowHtmlItems.slice(i, i + maxRowsPerPage12O));
    }
    const renderTable12O = (pageRows, isLastPage) => `
        <table class="official-main-table">
            <colgroup>
                <col style="width:2.5%"><col style="width:9%"><col style="width:4%">
                ${Array.from({ length: 28 }, () => '<col style="width:3.018%">').join('')}
            </colgroup>
            <thead>
                <tr>
                    <th rowspan="3">No.</th>
                    <th rowspan="3">Kabupaten/Kota</th>
                    <th rowspan="3">Jml D.I</th>
                    <th colspan="11">Rencana Luas Tanam (ha)</th>
                    <th colspan="11">Realisasi Luas Tanam (ha)</th>
                    <th colspan="6">Areal Kena Musibah (ha)</th>
                </tr>
                <tr>
                    <th colspan="3">Padi</th><th colspan="3">Palawija</th><th colspan="2">Tebu</th><th rowspan="2">Lain</th><th rowspan="2">Jumlah</th><th rowspan="2">Bero</th>
                    <th colspan="3">Padi</th><th colspan="3">Palawija</th><th colspan="2">Tebu</th><th rowspan="2">Lain</th><th rowspan="2">Jumlah</th><th rowspan="2">Bero</th>
                    <th colspan="3">Kekeringan</th><th colspan="3">Genangan Banjir</th>
                </tr>
                <tr>
                    <th>MT1</th><th>MT2</th><th>MT3</th><th>MT1</th><th>MT2</th><th>MT3</th><th>Muda</th><th>Tua</th>
                    <th>MT1</th><th>MT2</th><th>MT3</th><th>MT1</th><th>MT2</th><th>MT3</th><th>Muda</th><th>Tua</th>
                    <th>Padi</th><th>Pala.</th><th>Tebu</th><th>Padi</th><th>Pala.</th><th>Tebu</th>
                </tr>
            </thead>
            <tbody>
                ${pageRows.join('')}
                ${isLastPage ? `
                <tr class="section">
                    <td colspan="2" class="left">Jumlah</td>
                    ${totalCell('jml-di')}
                    ${totalCell('ren-padi-1')}${totalCell('ren-padi-2')}${totalCell('ren-padi-3')}${totalCell('ren-pala-1')}${totalCell('ren-pala-2')}${totalCell('ren-pala-3')}${totalCell('ren-tebu-m')}${totalCell('ren-tebu-t')}${totalCell('ren-lain')}${totalCell('ren-jml')}${totalCell('ren-bero')}
                    ${totalCell('real-padi-1')}${totalCell('real-padi-2')}${totalCell('real-padi-3')}${totalCell('real-pala-1')}${totalCell('real-pala-2')}${totalCell('real-pala-3')}${totalCell('real-tebu-m')}${totalCell('real-tebu-t')}${totalCell('real-lain')}${totalCell('real-jml')}${totalCell('real-bero')}
                    ${totalCell('k-padi')}${totalCell('k-pala')}${totalCell('k-tebu')}${totalCell('b-padi')}${totalCell('b-pala')}${totalCell('b-tebu')}
                </tr>
                ` : ''}
            </tbody>
        </table>
    `;
    const renderSignature12O = () => `
        <div class="official-signatures">
            <div>
                <div>${escapePrintValue(tanggalLaporan || '')}</div>
                <div>Koordinator OP Irigasi Tingkat Provinsi</div>
                <span class="signature-name">${escapePrintValue(koordinatorInfo.nama || 'Nama')}</span>
                <div>NIP. ${escapePrintValue(koordinatorInfo.nip || '')}</div>
            </div>
        </div>
    `;
    const renderPage12O = (pageRows, pageIndex) => {
        const isLastPage = pageIndex === rowPages12O.length - 1;
        const tableRowsCount = pageRows.length + (isLastPage ? 2 : 0);
        const signatureTop = Math.min(172, 43 + 13 + (Math.max(tableRowsCount, 1) * 4.1) + 8);
        return `
        <section class="official-form-12o official-form-12o-page" style="--signature-top:${signatureTop}mm;">
            <div class="official-code">Blangko 12 - O</div>
            <h1 class="official-title">Rekapitulasi Rencana, Realisasi Tanam dan Areal Kena Musibah Tingkat Provinsi</h1>
            ${field('Tingkat Laporan', 'Provinsi', 22, 24, 55, 59)}
            ${field('Periode Masa Tanam', report.periode || periode, 22, 30, 55, 59)}
            ${renderTable12O(pageRows, isLastPage)}
            ${isLastPage ? renderSignature12O() : ''}
        </section>
        `;
    };

    const root = document.createElement('div');
    root.id = 'siopi-official-print-root';
    root.className = 'siopi-official-print official-form-12o official-form-12o-batch';
    root.innerHTML = rowPages12O.map(renderPage12O).join('');

    document.body.appendChild(root);
    return root;
}

function printBlankoAktif(blanko, key = '') {
    cleanupPrintMode();

    const target = getPrintTargetForBlanko(blanko, key);
    if (!target) {
        alert(`Format PDF untuk ${blanko} belum ditemukan di halaman.`);
        return;
    }

    target.classList.add('siopi-print-target');
    document.body.classList.add('siopi-print-mode');
    if (target.id === 'siopi-official-print-root') {
        document.body.classList.add('siopi-print-official-mode');
        if (target.classList.contains('official-form-02o') || target.classList.contains('official-form-03o') || target.classList.contains('official-form-01p') || target.classList.contains('official-form-02p') || target.classList.contains('official-form-02ap') || target.classList.contains('official-form-03p') || target.classList.contains('official-form-04p') || target.classList.contains('official-form-05p') || target.classList.contains('official-form-08p') || target.classList.contains('official-form-09p') || target.classList.contains('official-form-10p')) {
            document.documentElement.classList.add('siopi-print-official-landscape-mode');
            document.body.classList.add('siopi-print-official-landscape-mode');
        }
        if (target.classList.contains('official-form-05o') || target.classList.contains('official-form-06o') || target.classList.contains('official-form-07o') || target.classList.contains('official-form-10o') || target.classList.contains('official-form-11o') || target.classList.contains('official-form-12o') || target.classList.contains('official-form-06p') || target.classList.contains('official-form-07p')) {
            document.documentElement.classList.add('siopi-print-official-legal-landscape-mode');
            document.body.classList.add('siopi-print-official-legal-landscape-mode');
        }
    }

    const titleBeforePrint = document.title;
    const idBlanko = String(blanko || '').replace('-', '');
    const data01O = (getLS('01O_' + currentDI) || {})[key] || null;
    const data02O = (getLS('02O_' + currentDI) || {})[key] || null;
    const data03O = (getLS('03O_' + currentDI) || {})[key] || null;
    const data04O = (getLS('04O_' + currentDI) || {})[key] || null;
    const data05O = (getLS('05O_' + currentDI) || {})[key] || null;
    const data06O = (getLS('06O_' + currentDI) || {})[key] || null;
    const data07O = (getLS('07O_' + currentDI) || {})[key] || null;
    const data08O = (getLS('08O_' + currentDI) || {})[key] || null;
    const data09O = (getLS('09O_' + currentDI) || {})[key] || null;
    const data10O = (getLS('10O_' + currentDI) || {})[key] || null;
    const data11O = (getLS('11O_GLOBAL') || {})[key] || null;
    const data12O = (getLS('12O_GLOBAL') || {})[key] || null;
    const data01P = (getLS('01P_' + currentDI) || {})[key] || null;
    const data02P = (getLS('02P_' + currentDI) || {})[key] || null;
    const data02aP = (getLS('02aP_' + currentDI) || {})[key] || null;
    const data03P = (getLS('03P_' + currentDI) || {})[key] || null;
    const data04P = (getLS('04P_' + currentDI) || {})[key] || null;
    const data05P = (getLS('05P_' + currentDI) || {})[key] || null;
    const data06P = (getLS('06P_' + currentDI) || {})[key] || null;
    const data07P = (getLS('07P_' + currentDI) || {})[key] || null;
    const data08P = (getLS('08P_' + currentDI) || {})[key] || null;
    const data09P = (getLS('09P_' + currentDI) || {})[key] || null;
    const data10P = (getLS('10P_' + currentDI) || {})[key] || null;
    const periode = idBlanko === '01O'
        ? (data01O?.periode || getPrintInputValue('o1-periode') || 'PERIODE')
        : idBlanko === '02O'
            ? (data02O?.periode || 'PERIODE')
            : idBlanko === '03O'
                ? (data03O?.periode || key || 'PERIODE')
                : idBlanko === '04O'
                    ? (data04O?.periode || 'PERIODE')
                    : idBlanko === '05O'
                        ? (data05O?.periodeAir || 'PERIODE')
                        : idBlanko === '06O'
                            ? (data06O?.periode || 'PERIODE')
                            : idBlanko === '07O'
                                ? (data07O?.periode || 'PERIODE')
                                : idBlanko === '08O'
                                    ? (data08O?.periode || 'PERIODE')
                                    : idBlanko === '09O'
                                        ? (data09O?.periode || 'PERIODE')
                                        : idBlanko === '10O'
                                            ? (data10O?.periode || key || 'PERIODE')
                                            : idBlanko === '11O'
                                                ? (data11O?.mt || key || 'PERIODE')
                                                : idBlanko === '12O'
                                                    ? (data12O?.periode || key || 'PERIODE')
                        : getPrintInputValue('o1-periode') || 'PERIODE';
    const bendung = idBlanko === '01O' ? (key || document.getElementById('o1-bendung-select')?.value || 'BENDUNG') : document.getElementById('o1-bendung-select')?.value || 'BENDUNG';
    const safeTitle = idBlanko === '01O'
        ? `01-O_${periode}_${bendung}`
        : idBlanko === '02O'
            ? `02-O_${key || data02O?.mt || 'MT'}_${periode}`
            : idBlanko === '03O'
                ? `03-O_${periode}_${currentDI}`
                : idBlanko === '04O'
                    ? `04-O_${periode}_${data04O?.bendung || 'BENDUNG'}_${data04O?.mt || 'MT'}`
                : idBlanko === '05O'
                    ? `05-O_${data05O?.mt || 'MT'}_${periode}`
                    : idBlanko === '06O'
                        ? `06-O_${data06O?.bendung || 'BENDUNG'}_${periode}`
                        : idBlanko === '07O'
                            ? `07-O_${data07O?.bendung || 'BENDUNG'}_${data07O?.mt || 'MT'}_${periode}`
                            : idBlanko === '08O'
                                ? `08-O_${data08O?.bendung || 'BENDUNG'}_${periode}`
                                : idBlanko === '09O'
                                    ? `09-O_${data09O?.bendung || 'BENDUNG'}_${periode}`
                                    : idBlanko === '10O'
                                        ? `10-O_${periode}_${currentDI}`
                                        : idBlanko === '11O'
                                            ? `11-O_${data11O?.kab || 'KABUPATEN'}_${data11O?.mt || 'MT'}`
                                            : idBlanko === '12O'
                                                ? `12-O_${periode}_PROVINSI`
                                                : idBlanko === '01P'
                                                    ? `01-P_${data01P?.bulan || 'PERIODE'}_${data01P?.juru || 'JURU'}`
                                                    : idBlanko === '02P'
                                                        ? `02-P_${data02P?.bulan || key || 'PERIODE'}_${currentDI}`
                                                        : idBlanko === '02aP'
                                                            ? `02a-P_${data02aP?.periode || key || 'PERIODE'}_${currentDI}`
                                                            : idBlanko === '03P'
                                                                ? `03-P_${data03P?.tgl || key || 'TANGGAL'}_${currentDI}`
                                                                : idBlanko === '04P'
                                                                    ? `04-P_${data04P?.tahun || key || 'TAHUN'}_${data04P?.dinas || 'DINAS'}`
                                                                    : idBlanko === '05P'
                                                                        ? `05-P_${data05P?.tahun || key || 'TAHUN'}_${data05P?.dinas || 'DINAS'}`
                                                                        : idBlanko === '06P'
                                                                            ? `06-P_${data06P?.tahun || 'TAHUN'}_${data06P?.juru || 'JURU'}`
                                                                            : idBlanko === '07P'
                                                                                ? `07-P_${data07P?.tahun || 'TAHUN'}_${data07P?.juru || 'JURU'}`
                                                                                : idBlanko === '08P'
                                                                                    ? `08-P_${data08P?.tglMulai || 'PERIODE'}_${data08P?.pekerjaan || 'PEKERJAAN'}`
                                                                                    : idBlanko === '09P'
                                                                                        ? `09-P_${data09P?.tahun || 'TAHUN'}_${data09P?.bulan || 'BULAN'}_${data09P?.dinas || 'INSTANSI'}`
                                                                                        : idBlanko === '10P'
                                                                                            ? `10-P_${data10P?.tahun || key || 'TAHUN'}_${data10P?.dinas || 'INSTANSI'}`
                    : `SiOPI_${String(blanko || 'SiOPI')}_${currentDI}`;
    document.title = safeTitle.replace(/[^a-zA-Z0-9._-]+/g, '_');

    setTimeout(() => {
        window.print();
        document.title = titleBeforePrint;
    }, 100);
}

window.addEventListener('afterprint', cleanupPrintMode);
window.addEventListener('beforeunload', cleanupPrintMode);

function unduhPdfTunggal(blanko, key) {
    showToast(`Mempersiapkan dokumen PDF untuk ${blanko}...`, 'info');
    if (hasOfficialPrintBuilder(blanko)) {
        setTimeout(() => {
            printBlankoAktif(blanko, key);
        }, 150);
        return;
    }

    showToast(`Format PDF resmi untuk ${blanko} belum dibuat. Modal detail tetap dibuka.`, 'info');
}

function unduhSemuaPdfOperasi() {
    showToast(`Mengkompilasi seluruh Formulir ke dalam 1 PDF...`, 'info');
    
    const btnUnduh = document.querySelector('button[onclick="unduhSemuaPdfOperasi()"]');
    if(btnUnduh) {
        const oriHtml = btnUnduh.innerHTML;
        btnUnduh.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> Menyusun PDF...';
        btnUnduh.disabled = true;
        
        setTimeout(() => {
            btnUnduh.innerHTML = oriHtml;
            btnUnduh.disabled = false;
            if(typeof initIcons === 'function') initIcons();
            showToast(`Buku Laporan Operasi berhasil diunduh.`, 'success');
        }, 3000);
    }
}

// -----------------------------------------------------------------------------------------
// BAGIAN 4: EXPORT & BACKUP MASSAL (ZIP)
// -----------------------------------------------------------------------------------------

async function downloadZip(kategori) {
    if (typeof XLSX === 'undefined' || typeof JSZip === 'undefined' || typeof saveAs === 'undefined') {
        alert("Sistem membutuhkan koneksi internet untuk pertama kali memuat mesin pembuat Excel/ZIP.");
        return;
    }

    showFormAlert('rekap', `Sedang mengumpulkan seluruh arsip ${kategori}... Mohon tunggu.`, 'info');

    let forms = [];
    if (kategori === 'operasi') {
        forms = ['01O','02O','03O','04O','04Oa','05O','05Oa','06O','07O','08O','09O','10O','11O','12O'];
    } else if (kategori === 'pemeliharaan') {
        forms = ['01P','02P','02aP','03P','04P','05P','06P','07P','08P','09P','10P'];
    }

    const zip = new JSZip();
    const folderName = `Backup_Semua_${kategori.toUpperCase()}_${currentDI.replace(/[^a-zA-Z0-9]/g, "")}`;
    const folder = zip.folder(folderName);
    let fileCount = 0;

    forms.forEach(f => {
        const db = getLS(`${f}_${currentDI}`) || {};
        const keys = Object.keys(db);
        
        keys.forEach(k => {
            try {
                const excelBuffer = convertToExcelBuffer(db[k]);
                const safeKey = k.replace(/[^a-zA-Z0-9 \-_]/g, "_");
                folder.file(`${f}_${safeKey}.xlsx`, excelBuffer);
                fileCount++;
            } catch(e) {
                console.error("Gagal mengkonversi form " + f + " dengan ID: " + k, e);
            }
        });
    });

    if (fileCount === 0) {
        hideFormAlert('rekap');
        alert(`Brankas masih kosong. Tidak ada data laporan ${kategori} yang bisa di-backup.`);
        return;
    }

    try {
        const zipContent = await zip.generateAsync({ type: "blob" });
        saveAs(zipContent, `${folderName}.zip`);
        showFormAlert('rekap', `Berhasil mengemas ${fileCount} file Excel ke dalam ZIP!`, 'success');
        setTimeout(() => hideFormAlert('rekap'), 4000);
    } catch (e) {
        hideFormAlert('rekap');
        alert("Terjadi kesalahan sistem saat membungkus ZIP.");
        console.error(e);
    } 
}

function getKategoriLaporanOnline(blanko) {
  return String(blanko || '').toUpperCase().includes('P') ? 'pemeliharaan' : 'operasi';
}

async function saveLaporanOnline(blanko, payload, options = {}) {
  if (!siopiDb) throw new Error('Koneksi Supabase belum tersedia.');

  const kategori = options.kategori || getKategoriLaporanOnline(blanko);
  const keyLaporan = options.key_laporan || payload.key_laporan || payload.bendung || payload.periode || payload.tahun || blanko;
  const targetDIs = options.targetAllDI
    ? normalizeDaftarDI([...(daftarDI.length ? daftarDI : DEFAULT_DAFTAR_DI), currentDI])
    : [options.daerah_irigasi || currentDI];
  const rows = targetDIs.map(diName => ({
    daerah_irigasi: diName,
    kategori,
    blanko,
    key_laporan: keyLaporan,
    periode: options.periode || payload.periode || payload.periodeAir || "",
    bendung: options.bendung || payload.bendung || "",
    mt: options.mt || payload.mt || "",
    tahun: options.tahun || payload.tahun || "",
    data: {
      ...payload,
      key_laporan: keyLaporan,
      cakupan_laporan: options.targetAllDI ? 'SEMUA_DI' : 'SATU_DI',
      sumber_daerah_irigasi: currentDI
    }
  }));

  const { data, error } = await siopiDb
    .from("siopi_laporan")
    .upsert(rows, { onConflict: 'daerah_irigasi,kategori,blanko,key_laporan' })
    .select();

  if (error) {
    console.error("Gagal simpan ke Supabase:", error);
    return false;
  }

  console.log("Berhasil simpan ke Supabase:", data);
  return true;
}

async function getLaporanOnline(blanko, options = {}) {
  if (!siopiDb) return [];

  let query = siopiDb
    .from('siopi_laporan')
    .select('*')
    .eq('daerah_irigasi', currentDI)
    .eq('blanko', blanko);

  if (options.kategori) query = query.eq('kategori', options.kategori);
  if (options.key_laporan) query = query.eq('key_laporan', options.key_laporan);

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    console.error(error);
    return [];
  }

  return data;
}


// =========================================================================================
// AKHIR MODUL PUSAT KENDALI
// =========================================================================================

// --- INIT ---
async function initApp() {
    const logo = "https://i.ibb.co.com/3mq52nBH/favicon.png";
    document.getElementById('logo-login').src = logo;
    document.getElementById('logo-sidebar').src = logo;
    document.getElementById('logo-mobile').src = logo;
    
    const saved = getLS('user', null);
    if(saved) { 
        currentUser = saved; 
        if (currentUser.diAkses && currentUser.diAkses !== 'ALL') {
            currentDI = currentUser.diAkses;
        }
        await syncDaftarDIAwal();
        const overlay = document.getElementById('loginOverlay');
        overlay.classList.add('hidden'); 
        overlay.style.opacity = '0';
        setupUIBasedOnRole(); 
        navigate('dashboard'); 
    } else {
        await syncDaftarDIAwal();
        const overlay = document.getElementById('loginOverlay');
        overlay.classList.remove('hidden'); 
        overlay.style.opacity = '1';
    }
    initIcons();
    setTimeout(initIcons, 250);
    setTimeout(initIcons, 1000);
}

window.onload = () => { initApp(); };
