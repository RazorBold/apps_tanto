// ===================================
// APP - MAIN SPA ROUTER & INIT
// ===================================

let currentPage = 'dashboard';

function navigateTo(page) {
  currentPage = page;

  // Update active sidebar link
  document.querySelectorAll('.sidebar-link').forEach(link => {
    link.classList.toggle('active', link.dataset.page === page);
  });

  // Update active content page
  document.querySelectorAll('.content-page').forEach(p => {
    p.classList.remove('active');
  });

  const pageEl = document.getElementById(`page-${page}`);
  if (pageEl) {
    pageEl.classList.add('active');
  }

  // Update page title
  const titles = {
    dashboard: 'Dashboard',
    installation: 'Instalasi',
    analytics: 'Analisa',
    history: 'History Instalasi',
    users: 'Kelola User'
  };
  document.getElementById('page-title').textContent = titles[page] || 'Dashboard';

  // Load page data
  switch (page) {
    case 'dashboard':
      loadDashboard();
      break;
    case 'installation':
      loadInstallation();
      break;
    case 'analytics':
      loadAnalytics();
      break;
    case 'history':
      loadHistory();
      break;
    case 'users':
      loadUsers();
      break;
  }

  // Close sidebar on mobile
  closeSidebar();
}

// --- Sidebar Toggle ---
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  const hamburger = document.getElementById('hamburger-btn');

  sidebar.classList.toggle('open');
  overlay.classList.toggle('active');
  hamburger.classList.toggle('active');
}

function closeSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  const hamburger = document.getElementById('hamburger-btn');

  sidebar.classList.remove('open');
  overlay.classList.remove('active');
  hamburger.classList.remove('active');
}

// --- Users Management (Admin) ---
async function loadUsers() {
  const tbody = document.getElementById('users-table-body');
  tbody.innerHTML = `<tr><td colspan="5"><div class="loading-state"><span class="spinner"></span><p>Memuat...</p></div></td></tr>`;

  try {
    const data = await apiRequest('/api/auth/users');
    const users = data.users || [];

    tbody.innerHTML = users.map((u, i) => `
      <tr>
        <td>${i + 1}</td>
        <td><span class="text-mono">${u.username}</span></td>
        <td>${u.full_name}</td>
        <td><span class="badge ${u.role === 'admin' ? 'badge-installed' : 'badge-online'}">${u.role}</span></td>
        <td>${u.is_active ? '<span class="badge badge-installed">Active</span>' : '<span class="badge badge-offline">Inactive</span>'}</td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Load users error:', err);
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 30px;">Gagal memuat data user</td></tr>`;
  }
}

function showAddUserModal() {
  document.getElementById('add-user-modal').classList.remove('hidden');
}

function closeAddUserModal() {
  document.getElementById('add-user-modal').classList.add('hidden');
}

function initAddUserForm() {
  const form = document.getElementById('add-user-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('new-username').value.trim();
    const password = document.getElementById('new-password').value;
    const full_name = document.getElementById('new-fullname').value.trim();
    const role = document.getElementById('new-role').value;

    if (!username || !password || !full_name) {
      showToast('Semua field wajib diisi', 'error');
      return;
    }

    try {
      await apiRequest('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ username, password, full_name, role })
      });

      showToast('User berhasil ditambahkan!', 'success');
      closeAddUserModal();
      form.reset();
      loadUsers();
    } catch (err) {
      showToast('Gagal: ' + err.message, 'error');
    }
  });
}

// --- Initialize App ---
document.addEventListener('DOMContentLoaded', () => {
  initAuth();
  initRegisterForm();
  initAddUserForm();

  // Check if already logged in
  if (!checkAuth()) {
    // Show login page
    document.getElementById('login-page').classList.add('active');
  }

  // Close modals on overlay click
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.classList.add('hidden');
        if (deviceMap) { deviceMap.remove(); deviceMap = null; }
        if (typeof historyMap !== 'undefined' && historyMap) { historyMap.remove(); historyMap = null; }
        if (typeof techDetailChart !== 'undefined' && techDetailChart) { techDetailChart.destroy(); techDetailChart = null; }
      }
    });
  });

  // Close modals on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
      closeSidebar();
      if (deviceMap) { deviceMap.remove(); deviceMap = null; }
      if (typeof historyMap !== 'undefined' && historyMap) { historyMap.remove(); historyMap = null; }
      if (typeof techDetailChart !== 'undefined' && techDetailChart) { techDetailChart.destroy(); techDetailChart = null; }
    }
  });
});
