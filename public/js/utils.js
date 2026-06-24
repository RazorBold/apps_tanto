// ===================================
// UTILITY FUNCTIONS
// ===================================

const API_BASE = '';

// --- API Helper ---
async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('auth_token');
  const headers = {
    ...(options.headers || {})
  };

  // Don't set Content-Type for FormData (browser sets it with boundary)
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers
    });

    if (response.status === 401) {
      // Token expired or invalid
      logout();
      throw new Error('Sesi telah berakhir. Silakan login kembali.');
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `Request failed with status ${response.status}`);
    }

    return data;
  } catch (err) {
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      throw new Error('Tidak dapat terhubung ke server. Periksa koneksi Anda.');
    }
    throw err;
  }
}

// --- Toast Notifications ---
function showToast(message, type = 'info', duration = 4000) {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const icons = {
    success: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
    error: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
    info: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
  };

  toast.innerHTML = `${icons[type] || icons.info}<span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('toast-exit');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// --- Date Formatting ---
function formatDate(dateStr) {
  if (!dateStr) return '-';
  const date = new Date(dateStr.replace(' ', 'T'));
  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatDateShort(dateStr) {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short'
  });
}

// --- Device Status Helpers ---
function getDeviceStatus(deviceModel) {
  if (!deviceModel) return 'not_installed';
  if (deviceModel.toLowerCase() === 'dismantle') return 'dismantle';
  const prefixes = ['TAKU', 'CICU', 'ICBU'];
  if (prefixes.some(p => deviceModel.toUpperCase().startsWith(p))) return 'installed';
  return 'installed'; // If has a model but not in known prefixes, consider installed
}

function getStatusBadge(status) {
  const badges = {
    installed: '<span class="badge badge-installed"><span class="badge-dot"></span>Terinstal</span>',
    not_installed: '<span class="badge badge-not-installed">Belum Instal</span>',
    dismantle: '<span class="badge badge-dismantle">Dismantle</span>'
  };
  return badges[status] || badges.not_installed;
}

function checkOnlineStatus(timestamp) {
  if (!timestamp) return false;
  const lastTime = new Date(timestamp.replace(' ', 'T'));
  const now = new Date();
  const diffMinutes = (now - lastTime) / (1000 * 60);
  return diffMinutes <= 30;
}

function getOnlineBadge(isOnline) {
  return isOnline
    ? '<span class="badge badge-online"><span class="badge-dot"></span>Online</span>'
    : '<span class="badge badge-offline">Offline</span>';
}

// --- Battery Helper ---
function getBatteryHTML(percent) {
  if (percent == null) return '-';
  let cls = 'battery-high';
  if (percent < 20) cls = 'battery-low';
  else if (percent < 50) cls = 'battery-medium';

  return `
    <div class="battery-bar">
      <div class="battery-level">
        <div class="battery-fill ${cls}" style="width: ${percent}%"></div>
      </div>
      <span style="font-size: 0.85rem; font-weight: 600;">${percent}%</span>
    </div>
  `;
}

// --- Reverse Geocoding (BigDataCloud — free, no API key) ---
async function reverseGeocode(lat, lng) {
  const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=id`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Geocode gagal');
  const data = await res.json();
  // Prefer city → locality → principalSubdivision (kab/kota → kecamatan → provinsi)
  return data.city || data.locality || data.principalSubdivision || '';
}

// --- Image Compression ---
function compressImage(file, maxWidth = 1920, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca file foto'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Format foto tidak didukung'));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (!blob) return reject(new Error('Gagal mengkompresi foto'));
            resolve(new File([blob], 'photo.jpg', { type: 'image/jpeg' }));
          },
          'image/jpeg',
          quality
        );
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// --- Particles for Login ---
function createParticles() {
  const container = document.getElementById('login-particles');
  if (!container) return;
  container.innerHTML = '';

  for (let i = 0; i < 30; i++) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    particle.style.left = Math.random() * 100 + '%';
    particle.style.animationDuration = (8 + Math.random() * 12) + 's';
    particle.style.animationDelay = Math.random() * 10 + 's';
    particle.style.width = (2 + Math.random() * 4) + 'px';
    particle.style.height = particle.style.width;

    // Alternate colors
    const colors = ['var(--primary-light)', 'var(--accent)', 'var(--info)'];
    particle.style.background = colors[Math.floor(Math.random() * colors.length)];

    container.appendChild(particle);
  }
}

// --- Toggle Password ---
function togglePassword() {
  const input = document.getElementById('login-password');
  input.type = input.type === 'password' ? 'text' : 'password';
}
