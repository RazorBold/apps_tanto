// ===================================
// AUTHENTICATION
// ===================================

function initAuth() {
  const form = document.getElementById('login-form');
  form.addEventListener('submit', handleLogin);
  createParticles();
}

async function handleLogin(e) {
  e.preventDefault();

  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;
  const btn = document.getElementById('login-btn');
  const errorEl = document.getElementById('login-error');

  if (!username || !password) {
    showLoginError('Username dan password wajib diisi');
    return;
  }

  // Show loading
  btn.disabled = true;
  btn.querySelector('.btn-text').classList.add('hidden');
  btn.querySelector('.btn-loader').classList.remove('hidden');
  errorEl.classList.add('hidden');

  try {
    const data = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });

    // Save token and user info
    localStorage.setItem('auth_token', data.token);
    localStorage.setItem('user_info', JSON.stringify(data.user));

    // Transition to app
    showApp(data.user);
    showToast(`Selamat datang, ${data.user.full_name}!`, 'success');
  } catch (err) {
    showLoginError(err.message);
  } finally {
    btn.disabled = false;
    btn.querySelector('.btn-text').classList.remove('hidden');
    btn.querySelector('.btn-loader').classList.add('hidden');
  }
}

function showLoginError(message) {
  const errorEl = document.getElementById('login-error');
  errorEl.textContent = message;
  errorEl.classList.remove('hidden');
}

function showApp(user) {
  document.getElementById('login-page').classList.remove('active');
  document.getElementById('app-shell').classList.remove('hidden');

  // Update user info in header/sidebar
  const initial = user.full_name.charAt(0).toUpperCase();
  document.getElementById('header-avatar').textContent = initial;
  document.getElementById('sidebar-avatar').textContent = initial;
  document.getElementById('sidebar-username').textContent = user.full_name;
  document.getElementById('sidebar-role').textContent = user.role === 'admin' ? 'Administrator' : 'Teknisi';

  // Show admin menu
  if (user.role === 'admin') {
    document.getElementById('nav-users').classList.remove('hidden');
  }

  // Load dashboard
  navigateTo('dashboard');
}

function checkAuth() {
  const token = localStorage.getItem('auth_token');
  const userStr = localStorage.getItem('user_info');

  if (token && userStr) {
    try {
      const user = JSON.parse(userStr);
      showApp(user);
      return true;
    } catch (e) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_info');
    }
  }
  return false;
}

function logout() {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('user_info');

  document.getElementById('app-shell').classList.add('hidden');
  document.getElementById('login-page').classList.add('active');
  document.getElementById('login-form').reset();
  document.getElementById('login-error').classList.add('hidden');

  // Reset nav
  document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
  document.querySelectorAll('.content-page').forEach(p => p.classList.remove('active'));

  showToast('Anda telah keluar', 'info');
}

function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem('user_info'));
  } catch {
    return null;
  }
}
