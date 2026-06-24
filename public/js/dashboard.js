// ===================================
// DASHBOARD PAGE
// ===================================

let allDevices = [];
let currentFilter = 'all';

async function loadDashboard() {
  const tableLoading = document.getElementById('device-table-loading');
  const tableBody = document.getElementById('device-table-body');
  const emptyState = document.getElementById('device-empty');

  tableLoading.classList.remove('hidden');
  tableBody.innerHTML = '';
  emptyState.classList.add('hidden');

  try {
    const data = await apiRequest('/api/devices');
    allDevices = data.devices || [];
    updateSummaryCards(allDevices);
    renderDeviceTable(allDevices);
  } catch (err) {
    console.error('Load dashboard error:', err);
    showToast('Gagal memuat data device: ' + err.message, 'error');
    tableBody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 30px; color: var(--text-muted);">Gagal memuat data</td></tr>`;
  } finally {
    tableLoading.classList.add('hidden');
  }
}

function updateSummaryCards(devices) {
  let installed = 0, notInstalled = 0, dismantle = 0;

  devices.forEach(d => {
    const status = getDeviceStatus(d.device_model);
    if (status === 'installed') installed++;
    else if (status === 'dismantle') dismantle++;
    else notInstalled++;
  });

  animateCounter('stat-total', devices.length);
  animateCounter('stat-installed', installed);
  animateCounter('stat-notinstalled', notInstalled);
  animateCounter('stat-dismantle', dismantle);
}

function animateCounter(elementId, targetValue) {
  const el = document.getElementById(elementId);
  const start = parseInt(el.textContent) || 0;
  const duration = 600;
  const startTime = performance.now();

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
    const current = Math.round(start + (targetValue - start) * eased);
    el.textContent = current;

    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }

  requestAnimationFrame(update);
}

function renderDeviceTable(devices) {
  const tableBody = document.getElementById('device-table-body');
  const emptyState = document.getElementById('device-empty');
  const searchQuery = document.getElementById('dashboard-search').value.toLowerCase();

  // Filter by search
  let filtered = devices.filter(d => {
    const matchSearch = !searchQuery ||
      d.imei.toLowerCase().includes(searchQuery) ||
      (d.device_model && d.device_model.toLowerCase().includes(searchQuery));
    return matchSearch;
  });

  // Filter by status
  if (currentFilter !== 'all') {
    filtered = filtered.filter(d => getDeviceStatus(d.device_model) === currentFilter);
  }

  if (filtered.length === 0) {
    tableBody.innerHTML = '';
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');

  tableBody.innerHTML = filtered.map((d, i) => {
    const status = getDeviceStatus(d.device_model);
    return `
      <tr>
        <td>${i + 1}</td>
        <td><span class="text-mono">${d.imei}</span></td>
        <td>${d.device_model || '<span class="text-muted">-</span>'}</td>
        <td>${getStatusBadge(status)}</td>
      </tr>
    `;
  }).join('');
}

function filterDashboardDevices() {
  renderDeviceTable(allDevices);
}

function setDashboardFilter(filter) {
  currentFilter = filter;

  document.querySelectorAll('.filter-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.filter === filter);
  });

  renderDeviceTable(allDevices);
}

function refreshDashboard() {
  loadDashboard();
  showToast('Memperbarui data...', 'info', 2000);
}
