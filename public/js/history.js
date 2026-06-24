// ===================================
// HISTORY INSTALASI PAGE
// ===================================

let historyCurrentPage = 1;
let historyTotalPages = 1;
let historySearchTimeout = null;
let historyStore = {};

async function loadHistory() {
  historyCurrentPage = 1;
  await Promise.all([loadHistoryUsers(), loadHistoryData()]);
}

async function loadHistoryUsers() {
  const select = document.getElementById('history-user-filter');
  const currentVal = select.value;
  try {
    const data = await apiRequest('/api/auth/users');
    select.innerHTML = '<option value="">Semua Teknisi</option>' +
      (data.users || []).map(u =>
        `<option value="${u.id}"${currentVal == u.id ? ' selected' : ''}>${u.full_name}</option>`
      ).join('');
  } catch (err) {
    console.error('Load history users error:', err);
  }
}

async function loadHistoryData() {
  const loadingEl = document.getElementById('history-loading');
  const tableEl = document.getElementById('history-table');
  const emptyEl = document.getElementById('history-empty');
  const tbody = document.getElementById('history-table-body');

  loadingEl.classList.remove('hidden');
  tableEl.style.display = 'none';
  emptyEl.classList.add('hidden');

  const search = document.getElementById('history-search').value.trim();
  const userId = document.getElementById('history-user-filter').value;
  const date = document.getElementById('history-date-filter').value;
  const limit = 20;

  const params = new URLSearchParams({ page: historyCurrentPage, limit });
  if (search) params.set('search', search);
  if (userId) params.set('user_id', userId);
  if (date) params.set('date', date);

  try {
    const data = await apiRequest(`/api/installations?${params}`);
    const installations = data.installations || [];
    historyStore = {};
    installations.forEach(inst => { historyStore[inst.id] = inst; });

    historyTotalPages = Math.max(1, Math.ceil(data.total / limit));

    const infoEl = document.getElementById('history-result-info');
    infoEl.textContent = data.total > 0
      ? `Menampilkan ${installations.length} dari ${data.total} data instalasi`
      : '';

    loadingEl.classList.add('hidden');

    if (installations.length === 0) {
      emptyEl.classList.remove('hidden');
      document.getElementById('history-pagination').classList.add('hidden');
      return;
    }

    tbody.innerHTML = installations.map((inst, i) => {
      const rowNum = (historyCurrentPage - 1) * limit + i + 1;
      const dateStr = formatDateShort(inst.installation_date);
      return `
        <tr>
          <td>${rowNum}</td>
          <td><span class="text-mono" style="font-size:0.82rem;">${inst.imei}</span></td>
          <td>${inst.device_model || '-'}</td>
          <td>
            <div style="display:flex;align-items:center;gap:8px;">
              <span class="user-avatar" style="width:26px;height:26px;font-size:0.7rem;flex-shrink:0;">
                ${inst.installer_name ? inst.installer_name.charAt(0).toUpperCase() : '?'}
              </span>
              <span>${inst.installer_name || '-'}</span>
            </div>
          </td>
          <td style="white-space:nowrap;">${dateStr}</td>
          <td>${inst.city || '-'}</td>
          <td>
            <button class="btn btn-outline btn-sm" onclick="openHistoryDetail(${inst.id})">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              Detail
            </button>
          </td>
        </tr>
      `;
    }).join('');

    tableEl.style.display = '';
    renderHistoryPagination(data.total, limit);
  } catch (err) {
    loadingEl.classList.add('hidden');
    console.error('Load history error:', err);
    showToast('Gagal memuat history: ' + err.message, 'error');
  }
}

function renderHistoryPagination(total, limit) {
  const paginationEl = document.getElementById('history-pagination');
  const pageInfoEl = document.getElementById('history-page-info');
  const prevBtn = document.getElementById('history-prev-btn');
  const nextBtn = document.getElementById('history-next-btn');

  if (historyTotalPages <= 1) {
    paginationEl.classList.add('hidden');
    return;
  }

  paginationEl.classList.remove('hidden');
  pageInfoEl.textContent = `Halaman ${historyCurrentPage} / ${historyTotalPages}`;
  prevBtn.disabled = historyCurrentPage <= 1;
  nextBtn.disabled = historyCurrentPage >= historyTotalPages;
}

function changeHistoryPage(delta) {
  const newPage = historyCurrentPage + delta;
  if (newPage < 1 || newPage > historyTotalPages) return;
  historyCurrentPage = newPage;
  loadHistoryData();
}

function onHistoryFilterChange() {
  historyCurrentPage = 1;
  loadHistoryData();
}

function debounceHistorySearch() {
  clearTimeout(historySearchTimeout);
  historySearchTimeout = setTimeout(() => {
    historyCurrentPage = 1;
    loadHistoryData();
  }, 400);
}

function clearHistoryFilters() {
  document.getElementById('history-search').value = '';
  document.getElementById('history-user-filter').value = '';
  document.getElementById('history-date-filter').value = '';
  historyCurrentPage = 1;
  loadHistoryData();
}

function openHistoryDetail(id) {
  const inst = historyStore[id];
  if (!inst) return;

  const modal = document.getElementById('history-detail-modal');
  const content = document.getElementById('history-detail-content');
  modal.classList.remove('hidden');

  const hasPhoto = inst.photo_path;
  const hasCoords = inst.latitude && inst.longitude;

  content.innerHTML = `
    ${hasPhoto ? `
      <div class="history-photo-wrap">
        <img src="${inst.photo_path}" alt="Foto instalasi" class="history-photo"
          onclick="this.classList.toggle('history-photo-expand')"
          title="Klik untuk perbesar">
      </div>
    ` : `
      <div class="history-photo-wrap no-photo">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
        <span>Tidak ada foto</span>
      </div>
    `}

    <div class="device-detail-grid" style="margin-top: 16px;">
      <div class="detail-item">
        <div class="detail-label">IMEI</div>
        <div class="detail-value mono" style="font-size:0.85rem;">${inst.imei}</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">Nomor Kontainer</div>
        <div class="detail-value">${inst.device_model || '-'}</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">Installer</div>
        <div class="detail-value">
          <div style="display:flex;align-items:center;gap:8px;">
            <span class="user-avatar" style="width:26px;height:26px;font-size:0.7rem;">
              ${inst.installer_name ? inst.installer_name.charAt(0).toUpperCase() : '?'}
            </span>
            ${inst.installer_name || '-'}
          </div>
        </div>
      </div>
      <div class="detail-item">
        <div class="detail-label">Tanggal Instalasi</div>
        <div class="detail-value">${formatDateShort(inst.installation_date)}</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">Waktu Input</div>
        <div class="detail-value">${formatDate(inst.created_at)}</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">Kota</div>
        <div class="detail-value" id="history-inst-city">
          ${inst.city || (hasCoords ? '<span style="color:var(--text-muted);font-size:0.82rem;">Mendeteksi...</span>' : '-')}
        </div>
      </div>
      ${hasCoords ? `
      <div class="detail-item full-width">
        <div class="detail-label">Koordinat</div>
        <div class="detail-value mono" style="font-size:0.82rem;">${inst.latitude}, ${inst.longitude}</div>
      </div>
      ` : ''}
      <div class="detail-item full-width">
        <div class="detail-label">Baterai Saat Pasang</div>
        <div class="detail-value">${getBatteryHTML(inst.battery_percent)}</div>
      </div>
      ${inst.last_device_timestamp ? `
      <div class="detail-item full-width">
        <div class="detail-label">Timestamp Device</div>
        <div class="detail-value">${formatDate(inst.last_device_timestamp)}</div>
      </div>
      ` : ''}
      ${inst.notes ? `
      <div class="detail-item full-width">
        <div class="detail-label">Catatan</div>
        <div class="detail-value" style="white-space:pre-wrap;">${inst.notes}</div>
      </div>
      ` : ''}
    </div>

    ${hasCoords ? `<div class="device-map" id="history-map-container" style="margin-top:12px;"></div>` : ''}
  `;

  if (hasCoords) {
    setTimeout(() => initHistoryMap(inst.latitude, inst.longitude, inst.imei), 100);

    if (!inst.city) {
      reverseGeocode(inst.latitude, inst.longitude)
        .then(city => {
          const el = document.getElementById('history-inst-city');
          if (el) el.textContent = city || '-';
        })
        .catch(() => {
          const el = document.getElementById('history-inst-city');
          if (el) el.textContent = '-';
        });
    }
  }
}

let historyMap = null;

function initHistoryMap(lat, lng, label) {
  const container = document.getElementById('history-map-container');
  if (!container || typeof L === 'undefined') return;
  if (historyMap) { historyMap.remove(); historyMap = null; }

  historyMap = L.map('history-map-container', { zoomControl: false, attributionControl: false })
    .setView([lat, lng], 14);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18 })
    .addTo(historyMap);

  L.marker([lat, lng]).addTo(historyMap)
    .bindPopup(`<b>${label}</b><br>${lat}, ${lng}`)
    .openPopup();

  setTimeout(() => historyMap.invalidateSize(), 200);
}

function closeHistoryModal() {
  document.getElementById('history-detail-modal').classList.add('hidden');
  if (historyMap) { historyMap.remove(); historyMap = null; }
}
