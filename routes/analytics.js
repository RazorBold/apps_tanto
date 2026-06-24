const express = require('express');
const { authMiddleware } = require('../middleware/auth');

function createAnalyticsRouter(dbHelpers) {
  const { queryAll, queryGet } = dbHelpers;
  const router = express.Router();

  // GET /api/analytics/daily - Daily installation stats
  router.get('/daily', authMiddleware, (req, res) => {
    try {
      const { days = 7 } = req.query;
      const stats = queryAll(`
        SELECT 
          installation_date as date,
          COUNT(*) as total_installations,
          COUNT(DISTINCT installed_by) as total_technicians
        FROM installations
        WHERE installation_date >= date('now', '-' || ? || ' days')
        GROUP BY installation_date
        ORDER BY installation_date ASC
      `, [parseInt(days).toString()]);

      res.json({ stats, days: parseInt(days) });
    } catch (err) {
      console.error('Daily analytics error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /api/analytics/users - Summary per user
  router.get('/users', authMiddleware, (req, res) => {
    try {
      const { date } = req.query;
      const todayDate = date || new Date().toISOString().split('T')[0];

      const userStats = queryAll(`
        SELECT 
          u.id,
          u.full_name,
          u.username,
          COALESCE(today.today_count, 0) as today_installations,
          COALESCE(total.total_count, 0) as total_installations
        FROM users u
        LEFT JOIN (
          SELECT installed_by, COUNT(*) as today_count
          FROM installations
          WHERE installation_date = ?
          GROUP BY installed_by
        ) today ON u.id = today.installed_by
        LEFT JOIN (
          SELECT installed_by, COUNT(*) as total_count
          FROM installations
          GROUP BY installed_by
        ) total ON u.id = total.installed_by
        WHERE u.is_active = 1
        ORDER BY today_installations DESC, total_installations DESC
      `, [todayDate]);

      const todayTotal = queryGet(
        'SELECT COUNT(*) as total FROM installations WHERE installation_date = ?',
        [todayDate]
      );

      res.json({
        date: todayDate,
        users: userStats,
        today_total: todayTotal ? todayTotal.total : 0
      });
    } catch (err) {
      console.error('User analytics error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /api/analytics/users/:id/daily - Daily stats for specific user
  router.get('/users/:id/daily', authMiddleware, (req, res) => {
    try {
      const { days = 7 } = req.query;
      const userId = parseInt(req.params.id);

      const user = queryGet('SELECT id, full_name, username FROM users WHERE id = ?', [userId]);
      if (!user) {
        return res.status(404).json({ error: 'User tidak ditemukan' });
      }

      const stats = queryAll(`
        SELECT 
          installation_date as date,
          COUNT(*) as installations
        FROM installations
        WHERE installed_by = ? AND installation_date >= date('now', '-' || ? || ' days')
        GROUP BY installation_date
        ORDER BY installation_date ASC
      `, [userId, parseInt(days).toString()]);

      res.json({ user, stats, days: parseInt(days) });
    } catch (err) {
      console.error('User daily analytics error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /api/analytics/summary - Overall summary
  router.get('/summary', authMiddleware, (req, res) => {
    try {
      const totalInstallations = queryGet('SELECT COUNT(*) as total FROM installations');
      const todayInstallations = queryGet(
        "SELECT COUNT(*) as total FROM installations WHERE installation_date = date('now')"
      );
      const totalUsers = queryGet('SELECT COUNT(*) as total FROM users WHERE is_active = 1');
      const avgPerDay = queryGet(`
        SELECT ROUND(AVG(daily_count), 1) as avg_per_day FROM (
          SELECT COUNT(*) as daily_count FROM installations GROUP BY installation_date
        )
      `);

      res.json({
        total_installations: totalInstallations ? totalInstallations.total : 0,
        today_installations: todayInstallations ? todayInstallations.total : 0,
        total_users: totalUsers ? totalUsers.total : 0,
        avg_per_day: avgPerDay?.avg_per_day || 0
      });
    } catch (err) {
      console.error('Summary analytics error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}

module.exports = createAnalyticsRouter;
