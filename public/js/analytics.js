// ===================================
// ANALYTICS PAGE
// ===================================

let dailyChart = null;
let usersChart = null;
let techDetailChart = null;
let currentTechId = null;
let currentTechDays = 7;
let analyticsUsersCache = [];

async function loadAnalytics() {
  const days = document.getElementById('analytics-days').value;

  try {
    // Load all analytics data in parallel
    const [summaryData, dailyData, userData] = await Promise.all([
      apiRequest('/api/analytics/summary'),
      apiRequest(`/api/analytics/daily?days=${days}`),
      apiRequest('/api/analytics/users')
    ]);

    // Update summary cards
    animateCounter('analytics-total', summaryData.total_installations);
    animateCounter('analytics-today', summaryData.today_installations);
    animateCounter('analytics-users', summaryData.total_users);
    document.getElementById('analytics-avg').textContent = summaryData.avg_per_day || '0';

    // Render charts
    renderDailyChart(dailyData.stats, parseInt(days));
    renderUsersChart(userData.users);

    // Render user table
    renderUserTable(userData.users);
  } catch (err) {
    console.error('Load analytics error:', err);
    showToast('Gagal memuat data analisa: ' + err.message, 'error');
  }
}

function renderDailyChart(stats, days) {
  const ctx = document.getElementById('chart-daily');
  if (!ctx) return;

  // Fill missing dates
  const labels = [];
  const values = [];
  const today = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    labels.push(formatDateShort(dateStr));

    const found = stats.find(s => s.date === dateStr);
    values.push(found ? found.total_installations : 0);
  }

  if (dailyChart) {
    dailyChart.destroy();
  }

  dailyChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Instalasi',
        data: values,
        backgroundColor: createGradient(ctx, 'rgba(20, 184, 166, 0.5)', 'rgba(20, 184, 166, 0.1)'),
        borderColor: 'rgba(20, 184, 166, 1)',
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false,
        barThickness: days > 14 ? 'flex' : 24,
        maxBarThickness: 32
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(30, 41, 59, 0.95)',
          titleColor: '#F1F5F9',
          bodyColor: '#94A3B8',
          borderColor: 'rgba(148, 163, 184, 0.1)',
          borderWidth: 1,
          cornerRadius: 8,
          padding: 12
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            color: '#64748B',
            font: { size: 11, family: 'Inter' },
            maxTicksLimit: 10
          }
        },
        y: {
          beginAtZero: true,
          grid: {
            color: 'rgba(148, 163, 184, 0.06)',
            drawBorder: false
          },
          ticks: {
            color: '#64748B',
            font: { size: 11, family: 'Inter' },
            stepSize: 1
          }
        }
      }
    }
  });
}

function renderUsersChart(users) {
  const ctx = document.getElementById('chart-users');
  if (!ctx) return;

  const activeUsers = users.filter(u => u.today_installations > 0);

  if (activeUsers.length === 0) {
    // Show empty state
    if (usersChart) usersChart.destroy();

    usersChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Belum ada instalasi hari ini'],
        datasets: [{
          data: [1],
          backgroundColor: ['rgba(100, 116, 139, 0.2)'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: '#64748B', font: { size: 12, family: 'Inter' } }
          }
        }
      }
    });
    return;
  }

  const colors = generateColors(activeUsers.length);

  if (usersChart) {
    usersChart.destroy();
  }

  usersChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: activeUsers.map(u => u.full_name),
      datasets: [{
        data: activeUsers.map(u => u.today_installations),
        backgroundColor: colors.map(c => c + '80'),
        borderColor: colors,
        borderWidth: 2,
        hoverOffset: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '65%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: '#94A3B8',
            font: { size: 12, family: 'Inter' },
            padding: 16,
            usePointStyle: true,
            pointStyleWidth: 12
          }
        },
        tooltip: {
          backgroundColor: 'rgba(30, 41, 59, 0.95)',
          titleColor: '#F1F5F9',
          bodyColor: '#94A3B8',
          borderColor: 'rgba(148, 163, 184, 0.1)',
          borderWidth: 1,
          cornerRadius: 8,
          padding: 12
        }
      }
    }
  });
}

function renderUserTable(users) {
  analyticsUsersCache = users;
  const tbody = document.getElementById('analytics-user-table');

  if (users.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 30px; color: var(--text-muted);">Belum ada data</td></tr>`;
    return;
  }

  const sorted = [...users].sort((a, b) => b.today_installations - a.today_installations || b.total_installations - a.total_installations);

  tbody.innerHTML = sorted.map((u, i) => `
    <tr style="cursor:pointer;" onclick="openTechDetail(${u.id})">
      <td>
        <span style="display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 50%; background: ${i < 3 ? 'linear-gradient(135deg, var(--accent), var(--accent-light))' : 'var(--bg-surface)'}; color: ${i < 3 ? 'var(--text-inverse)' : 'var(--text-secondary)'}; font-size: 0.75rem; font-weight: 700;">
          ${i + 1}
        </span>
      </td>
      <td>
        <div style="display: flex; align-items: center; gap: 10px;">
          <span class="user-avatar" style="width: 32px; height: 32px; font-size: 0.75rem;">${u.full_name.charAt(0).toUpperCase()}</span>
          <div>
            <div style="font-weight: 600;">${u.full_name}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">@${u.username}</div>
          </div>
        </div>
      </td>
      <td>
        <span style="font-weight: 700; color: ${u.today_installations > 0 ? 'var(--success)' : 'var(--text-muted)'};">
          ${u.today_installations}
        </span>
      </td>
      <td>
        <span style="font-weight: 600;">${u.total_installations}</span>
      </td>
    </tr>
  `).join('');
}

// ===== TECHNICIAN DETAIL =====

async function openTechDetail(userId) {
  currentTechId = userId;
  currentTechDays = 7;

  const modal = document.getElementById('tech-detail-modal');
  if (!modal) {
    showToast('Terjadi kesalahan tampilan. Silakan refresh halaman (Ctrl+Shift+R).', 'error');
    return;
  }

  const user = analyticsUsersCache.find(u => u.id === userId);
  modal.classList.remove('hidden');

  if (user) {
    document.getElementById('tech-detail-avatar').textContent = user.full_name.charAt(0).toUpperCase();
    document.getElementById('tech-detail-name').textContent = user.full_name;
    document.getElementById('tech-detail-username').textContent = '@' + user.username;
  }

  // Reset days tabs
  document.querySelectorAll('#tech-detail-modal .filter-tab').forEach(t => {
    t.classList.toggle('active', parseInt(t.dataset.days) === 7);
  });

  document.getElementById('tech-detail-loading').classList.remove('hidden');
  document.getElementById('tech-detail-content').classList.add('hidden');

  await loadTechDetailData();
}

async function loadTechDetailData() {
  try {
    const data = await apiRequest(`/api/analytics/users/${currentTechId}/daily?days=${currentTechDays}`);
    renderTechDetail(data);
  } catch (err) {
    showToast('Gagal memuat detail: ' + err.message, 'error');
    document.getElementById('tech-detail-loading').classList.add('hidden');
  }
}

function renderTechDetail({ user, stats, days }) {
  // Header info (already set on open, but update from API data for accuracy)
  document.getElementById('tech-detail-avatar').textContent = user.full_name.charAt(0).toUpperCase();
  document.getElementById('tech-detail-name').textContent = user.full_name;
  document.getElementById('tech-detail-username').textContent = '@' + user.username;

  const total = stats.reduce((sum, s) => sum + s.installations, 0);
  const avg = (total / parseInt(days)).toFixed(1);
  const max = stats.length > 0 ? Math.max(...stats.map(s => s.installations)) : 0;

  document.getElementById('tech-stat-total').textContent = total;
  document.getElementById('tech-stat-avg').textContent = avg;
  document.getElementById('tech-stat-max').textContent = max;

  renderTechChart(stats, parseInt(days));

  document.getElementById('tech-detail-loading').classList.add('hidden');
  document.getElementById('tech-detail-content').classList.remove('hidden');
}

function renderTechChart(stats, days) {
  const ctx = document.getElementById('chart-tech-daily');
  if (!ctx) return;

  const labels = [];
  const values = [];
  const today = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    labels.push(formatDateShort(dateStr));
    const found = stats.find(s => s.date === dateStr);
    values.push(found ? found.installations : 0);
  }

  if (techDetailChart) { techDetailChart.destroy(); techDetailChart = null; }

  techDetailChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Instalasi',
        data: values,
        backgroundColor: 'rgba(20, 184, 166, 0.45)',
        borderColor: 'rgba(20, 184, 166, 1)',
        borderWidth: 2,
        borderRadius: 6,
        borderSkipped: false,
        barThickness: days > 14 ? 'flex' : 22,
        maxBarThickness: 30
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(30, 41, 59, 0.95)',
          titleColor: '#F1F5F9',
          bodyColor: '#94A3B8',
          borderColor: 'rgba(148, 163, 184, 0.1)',
          borderWidth: 1,
          cornerRadius: 8,
          padding: 10,
          callbacks: {
            label: (ctx) => ` ${ctx.parsed.y} instalasi`
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: '#64748B', font: { size: 10, family: 'Inter' }, maxTicksLimit: 10 }
        },
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(148, 163, 184, 0.06)', drawBorder: false },
          ticks: { color: '#64748B', font: { size: 10, family: 'Inter' }, stepSize: 1 }
        }
      }
    }
  });
}

function setTechDays(days) {
  currentTechDays = days;
  document.querySelectorAll('#tech-detail-modal .filter-tab').forEach(t => {
    t.classList.toggle('active', parseInt(t.dataset.days) === days);
  });
  document.getElementById('tech-detail-loading').classList.remove('hidden');
  document.getElementById('tech-detail-content').classList.add('hidden');
  loadTechDetailData();
}

function closeTechModal() {
  document.getElementById('tech-detail-modal').classList.add('hidden');
  if (techDetailChart) { techDetailChart.destroy(); techDetailChart = null; }
}

// --- Chart Helpers ---
function createGradient(ctx, color1, color2) {
  const canvas = ctx.getContext ? ctx : ctx.canvas;
  const context = canvas.getContext('2d');
  const gradient = context.createLinearGradient(0, 0, 0, 280);
  gradient.addColorStop(0, color1);
  gradient.addColorStop(1, color2);
  return gradient;
}

function generateColors(count) {
  const baseColors = [
    '#14B8A6', '#F59E0B', '#3B82F6', '#EF4444', '#8B5CF6',
    '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
  ];

  const colors = [];
  for (let i = 0; i < count; i++) {
    colors.push(baseColors[i % baseColors.length]);
  }
  return colors;
}
