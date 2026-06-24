const express = require('express');
const { authMiddleware } = require('../middleware/auth');

const SOLAR_API_BASE = 'http://36.92.47.218:14523/solar-tracker';

function createDevicesRouter(dbHelpers) {
  const { queryRun } = dbHelpers;
  const router = express.Router();

  // GET /api/devices - Proxy to solar tracker API
  router.get('/', authMiddleware, async (req, res) => {
    try {
      const response = await fetch(`${SOLAR_API_BASE}/devices`);
      if (!response.ok) {
        throw new Error(`API responded with status ${response.status}`);
      }
      const data = await response.json();
      res.json(data);
    } catch (err) {
      console.error('Fetch devices error:', err);
      res.status(502).json({ error: 'Gagal mengambil data device dari server', details: err.message });
    }
  });

  // GET /api/devices/:imei/latest - Proxy to solar tracker API
  router.get('/:imei/latest', authMiddleware, async (req, res) => {
    try {
      const { imei } = req.params;
      const response = await fetch(`${SOLAR_API_BASE}/${imei}/latest`);
      if (!response.ok) {
        throw new Error(`API responded with status ${response.status}`);
      }
      const data = await response.json();

      // Log the check
      try {
        const isOnline = checkOnlineStatus(data?.data?.timestamp || data?.timestamp);
        queryRun(
          'INSERT INTO device_check_logs (imei, checked_by, device_data, is_online) VALUES (?, ?, ?, ?)',
          [imei, req.user.id, JSON.stringify(data), isOnline ? 1 : 0]
        );
      } catch (logErr) {
        console.error('Log check error (non-critical):', logErr);
      }

      res.json(data);
    } catch (err) {
      console.error('Fetch device latest error:', err);
      res.status(502).json({ error: 'Gagal mengambil data terakhir device', details: err.message });
    }
  });

  return router;
}

function checkOnlineStatus(timestamp) {
  if (!timestamp) return false;
  const lastTime = new Date(timestamp.replace(' ', 'T'));
  const now = new Date();
  const diffMinutes = (now - lastTime) / (1000 * 60);
  return diffMinutes <= 30;
}

module.exports = createDevicesRouter;
