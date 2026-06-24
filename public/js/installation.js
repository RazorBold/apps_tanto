// ===================================
// INSTALLATION PAGE
// ===================================

let installDevices = [];
let selectedDeviceData = null;
let deviceMap = null;

async function loadInstallation() {
  const loading = document.getElementById('install-loading');
  const list = document.getElementById('install-device-list');

  loading.classList.remove('hidden');
  list.innerHTML = '';

  try {
    const data = await apiRequest('/api/devices');
    const devices = data.devices || [];

    // Only show uninstalled devices
    installDevices = devices.filter(d => !d.device_model);
    renderInstallDeviceList(installDevices);
  } catch (err) {
    console.error('Load install devices error:', err);
    showToast('Gagal memuat data device: ' + err.message, 'error');
  } finally {
    loading.classList.add('hidden');
  }
}

function renderInstallDeviceList(devices) {
  const list = document.getElementById('install-device-list');
  const searchQuery = document.getElementById('install-search').value.toLowerCase();

  const filtered = devices.filter(d =>
    !searchQuery || d.imei.toLowerCase().includes(searchQuery)
  );

  if (filtered.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <p>${searchQuery ? 'Tidak ada IMEI ditemukan' : 'Semua device sudah terinstal'}</p>
      </div>
    `;
    return;
  }

  list.innerHTML = filtered.map(d => `
    <div class="install-device-item" onclick="openDeviceDetail('${d.imei}')">
      <div class="device-item-info">
        <span class="device-item-imei">${d.imei}</span>
        <span class="device-item-status">Belum terinstal</span>
      </div>
      <span class="device-item-arrow">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
      </span>
    </div>
  `).join('');
}

function filterInstallDevices() {
  renderInstallDeviceList(installDevices);
}

async function openDeviceDetail(imei) {
  const modal = document.getElementById('device-detail-modal');
  const content = document.getElementById('device-detail-content');

  modal.classList.remove('hidden');
  content.innerHTML = `
    <div class="loading-state">
      <span class="spinner large"></span>
      <p>Mengambil data terakhir...</p>
    </div>
  `;

  try {
    const data = await apiRequest(`/api/devices/${imei}/latest`);
    selectedDeviceData = data;
    renderDeviceDetail(data);
  } catch (err) {
    console.error('Fetch device detail error:', err);
    content.innerHTML = `
      <div class="empty-state">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
        <p>Gagal mengambil data: ${err.message}</p>
        <button class="btn btn-outline btn-sm mt-16" onclick="openDeviceDetail('${imei}')">Coba Lagi</button>
      </div>
    `;
  }
}

function renderDeviceDetail(data) {
  const content = document.getElementById('device-detail-content');
  const d = data.data || data;
  const isOnline = checkOnlineStatus(d.timestamp || data.timestamp);

  content.innerHTML = `
    <!-- Online Status -->
    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
      <span class="text-mono" style="font-size: 1rem; font-weight: 700;">${d.imei || data.imei}</span>
      ${getOnlineBadge(isOnline)}
    </div>

    <!-- Map -->
    ${d.latitude && d.longitude ? `<div class="device-map" id="device-map-container"></div>` : ''}

    <!-- Detail Grid -->
    <div class="device-detail-grid">
      <div class="detail-item">
        <div class="detail-label">Serial Number</div>
        <div class="detail-value">${d.serial_number || '-'}</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">Kota</div>
        <div class="detail-value">${d.city || '-'}</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">Last Activity</div>
        <div class="detail-value">${d.last_activity || '-'}</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">Koordinat</div>
        <div class="detail-value mono" style="font-size: 0.82rem;">${d.latitude || '-'}, ${d.longitude || '-'}</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">Kecepatan</div>
        <div class="detail-value">${d.speed_kmh != null ? d.speed_kmh + ' km/h' : '-'}</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">Alarm</div>
        <div class="detail-value">${d.alarm || '-'}</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">Timestamp Terakhir</div>
        <div class="detail-value">${formatDate(d.timestamp || data.timestamp)}</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">G-Sensor</div>
        <div class="detail-value">${d.g_sensor_status != null ? (d.g_sensor_status ? 'Active' : 'Inactive') : '-'}</div>
      </div>
      <div class="detail-item full-width">
        <div class="detail-label">Baterai</div>
        <div class="detail-value">${getBatteryHTML(d.persentase_baterai)}</div>
      </div>
    </div>

    <!-- Actions -->
    <div class="device-actions">
      <button class="btn btn-outline" onclick="openDeviceDetail('${d.imei || data.imei}')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
        Refresh
      </button>
      <button class="btn btn-success" onclick="openRegisterForm('${d.imei || data.imei}')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        Daftarkan
      </button>
    </div>
  `;

  // Initialize map if coordinates available
  if (d.latitude && d.longitude) {
    setTimeout(() => {
      initDeviceMap(d.latitude, d.longitude, d.imei || data.imei);
    }, 100);
  }
}

function initDeviceMap(lat, lng, label) {
  const mapContainer = document.getElementById('device-map-container');
  if (!mapContainer || typeof L === 'undefined') return;

  if (deviceMap) {
    deviceMap.remove();
  }

  deviceMap = L.map('device-map-container', {
    zoomControl: false,
    attributionControl: false
  }).setView([lat, lng], 14);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18
  }).addTo(deviceMap);

  L.marker([lat, lng]).addTo(deviceMap)
    .bindPopup(`<b>${label}</b><br>${lat}, ${lng}`)
    .openPopup();

  // Fix map rendering in modal
  setTimeout(() => deviceMap.invalidateSize(), 200);
}

function closeDeviceModal() {
  document.getElementById('device-detail-modal').classList.add('hidden');
  if (deviceMap) {
    deviceMap.remove();
    deviceMap = null;
  }
}

function openRegisterForm(imei) {
  closeDeviceModal();

  const modal = document.getElementById('register-modal');
  const d = selectedDeviceData?.data || selectedDeviceData || {};
  const user = getCurrentUser();

  document.getElementById('reg-installer').value = user ? user.full_name : '-';
  document.getElementById('reg-imei').value = imei;
  document.getElementById('reg-device-model').value = d.serial_number || '';
  document.getElementById('reg-latitude').value = d.latitude || '';
  document.getElementById('reg-longitude').value = d.longitude || '';
  document.getElementById('reg-city').value = d.city || '';
  document.getElementById('reg-battery').value = d.persentase_baterai || '';
  document.getElementById('reg-last-timestamp').value = d.timestamp || '';
  document.getElementById('reg-notes').value = '';
  document.getElementById('reg-photo').value = '';
  document.getElementById('reg-photo-preview').classList.add('hidden');

  modal.classList.remove('hidden');

  // Auto-detect city from coordinates
  const lat = d.latitude;
  const lng = d.longitude;
  const cityDisplay = document.getElementById('reg-city-display');
  const cityLoader = document.getElementById('reg-city-loader');

  if (lat && lng) {
    if (d.city) {
      cityDisplay.value = d.city;
    } else {
      cityDisplay.value = '';
      cityDisplay.placeholder = 'Mendeteksi lokasi...';
      cityLoader.classList.remove('hidden');

      reverseGeocode(lat, lng)
        .then(city => {
          document.getElementById('reg-city').value = city;
          cityDisplay.value = city || '-';
          cityDisplay.placeholder = '-';
        })
        .catch(() => {
          cityDisplay.value = '';
          cityDisplay.placeholder = 'Gagal deteksi lokasi';
        })
        .finally(() => {
          cityLoader.classList.add('hidden');
        });
    }
  } else {
    cityDisplay.value = '-';
    cityDisplay.placeholder = 'Koordinat tidak tersedia';
  }
}

function closeRegisterModal() {
  document.getElementById('register-modal').classList.add('hidden');
}

function initRegisterForm() {
  const form = document.getElementById('register-form');
  form.addEventListener('submit', handleRegister);

  // Photo preview when captured from camera
  document.getElementById('reg-photo').addEventListener('change', function(e) {
    const file = e.target.files[0];
    const preview = document.getElementById('reg-photo-preview');
    const img = document.getElementById('reg-photo-img');

    if (file) {
      const reader = new FileReader();
      reader.onload = function(ev) {
        img.src = ev.target.result;
        preview.classList.remove('hidden');
      };
      reader.readAsDataURL(file);
    } else {
      preview.classList.add('hidden');
    }
  });
}

async function handleRegister(e) {
  e.preventDefault();

  const btn = document.getElementById('register-btn');
  btn.disabled = true;
  btn.querySelector('.btn-text').classList.add('hidden');
  btn.querySelector('.btn-loader').classList.remove('hidden');

  try {
    const formData = new FormData(document.getElementById('register-form'));

    const photoInput = document.getElementById('reg-photo');
    if (photoInput.files[0]) {
      const compressed = await compressImage(photoInput.files[0]);
      formData.set('photo', compressed, 'photo.jpg');
    }

    await apiRequest('/api/installations', {
      method: 'POST',
      body: formData,
      headers: {}
    });

    showToast('Device berhasil didaftarkan!', 'success');
    closeRegisterModal();
    loadInstallation();
  } catch (err) {
    console.error('Register error:', err);
    showToast('Gagal mendaftarkan: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.querySelector('.btn-text').classList.remove('hidden');
    btn.querySelector('.btn-loader').classList.add('hidden');
  }
}
