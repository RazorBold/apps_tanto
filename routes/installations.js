const express = require('express');
const multer = require('multer');
const path = require('path');
const { authMiddleware } = require('../middleware/auth');

// Configure multer for photo uploads
const uploadsDir = process.env.DATA_DIR
  ? path.join(process.env.DATA_DIR, 'uploads')
  : path.join(__dirname, '..', 'public', 'uploads');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB (frontend compresses, this is safety net)
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Hanya file gambar yang diperbolehkan'));
    }
  }
});

// Wrap multer as promise so errors are catchable inside async route handlers
function runUpload(req, res) {
  return new Promise((resolve, reject) => {
    upload.single('photo')(req, res, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

function createInstallationsRouter(dbHelpers) {
  const { queryAll, queryGet, queryRun } = dbHelpers;
  const router = express.Router();

  // POST /api/installations - Create new installation
  router.post('/', authMiddleware, async (req, res) => {
    try {
      await runUpload(req, res);

      const { imei, device_model, container_number, notes, latitude, longitude, city, battery_percent, last_device_timestamp } = req.body;

      if (!imei || !device_model) {
        return res.status(400).json({ error: 'IMEI dan device model wajib diisi' });
      }

      const existing = queryGet('SELECT id FROM installations WHERE imei = ?', [imei]);
      if (existing) {
        return res.status(409).json({ error: 'IMEI sudah terdaftar sebelumnya' });
      }

      const photoPath = req.file ? `/uploads/${req.file.filename}` : null;

      const result = queryRun(
        `INSERT INTO installations (imei, device_model, container_number, notes, installed_by, latitude, longitude, city, battery_percent, last_device_timestamp, photo_path)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          imei, device_model, container_number || null, notes || null,
          req.user.id,
          latitude ? parseFloat(latitude) : null,
          longitude ? parseFloat(longitude) : null,
          city || null,
          battery_percent ? parseInt(battery_percent) : null,
          last_device_timestamp || null,
          photoPath
        ]
      );

      res.status(201).json({
        message: 'Instalasi berhasil dicatat',
        installation: {
          id: result.lastInsertRowid,
          imei,
          device_model,
          installed_by: req.user.full_name
        }
      });
    } catch (err) {
      console.error('Create installation error:', err);
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'Ukuran foto terlalu besar (maksimal 10MB)' });
      }
      res.status(400).json({ error: err.message || 'Internal server error' });
    }
  });

  // GET /api/installations - List installations
  router.get('/', authMiddleware, (req, res) => {
    try {
      const { date, user_id, search, page = 1, limit = 20 } = req.query;
      let query = `
        SELECT i.*, u.full_name as installer_name
        FROM installations i
        JOIN users u ON i.installed_by = u.id
        WHERE 1=1
      `;
      const params = [];

      if (date) {
        query += ' AND i.installation_date = ?';
        params.push(date);
      }
      if (user_id) {
        query += ' AND i.installed_by = ?';
        params.push(parseInt(user_id));
      }
      if (search) {
        query += ' AND (i.imei LIKE ? OR i.device_model LIKE ?)';
        params.push(`%${search}%`, `%${search}%`);
      }

      query += ' ORDER BY i.created_at DESC LIMIT ? OFFSET ?';
      params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

      const installations = queryAll(query, params);

      // Get total count
      let countQuery = 'SELECT COUNT(*) as total FROM installations i WHERE 1=1';
      const countParams = [];
      if (date) {
        countQuery += ' AND i.installation_date = ?';
        countParams.push(date);
      }
      if (user_id) {
        countQuery += ' AND i.installed_by = ?';
        countParams.push(parseInt(user_id));
      }
      if (search) {
        countQuery += ' AND (i.imei LIKE ? OR i.device_model LIKE ?)';
        countParams.push(`%${search}%`, `%${search}%`);
      }
      const countResult = queryGet(countQuery, countParams);
      const total = countResult ? countResult.total : 0;

      res.json({ installations, total, page: parseInt(page), limit: parseInt(limit) });
    } catch (err) {
      console.error('List installations error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /api/installations/:imei - Get installation by IMEI
  router.get('/:imei', authMiddleware, (req, res) => {
    try {
      const installation = queryGet(`
        SELECT i.*, u.full_name as installer_name 
        FROM installations i 
        JOIN users u ON i.installed_by = u.id 
        WHERE i.imei = ?
      `, [req.params.imei]);

      if (!installation) {
        return res.status(404).json({ error: 'Data instalasi tidak ditemukan' });
      }

      res.json({ installation });
    } catch (err) {
      console.error('Get installation error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}

module.exports = createInstallationsRouter;
