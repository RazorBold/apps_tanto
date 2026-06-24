const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { JWT_SECRET, authMiddleware, adminOnly } = require('../middleware/auth');

function createAuthRouter(dbHelpers) {
  const { queryAll, queryGet, queryRun } = dbHelpers;
  const router = express.Router();

  // POST /api/auth/login
  router.post('/login', (req, res) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ error: 'Username dan password wajib diisi' });
      }

      const user = queryGet('SELECT * FROM users WHERE username = ? AND is_active = 1', [username]);
      if (!user) {
        return res.status(401).json({ error: 'Username atau password salah' });
      }

      const validPassword = bcrypt.compareSync(password, user.password_hash);
      if (!validPassword) {
        return res.status(401).json({ error: 'Username atau password salah' });
      }

      const token = jwt.sign(
        { id: user.id, username: user.username, full_name: user.full_name, role: user.role },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          full_name: user.full_name,
          role: user.role
        }
      });
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // POST /api/auth/register (admin only)
  router.post('/register', authMiddleware, adminOnly, (req, res) => {
    try {
      const { username, password, full_name, role } = req.body;

      if (!username || !password || !full_name) {
        return res.status(400).json({ error: 'Username, password, dan nama lengkap wajib diisi' });
      }

      const exists = queryGet('SELECT id FROM users WHERE username = ?', [username]);
      if (exists) {
        return res.status(409).json({ error: 'Username sudah digunakan' });
      }

      const hash = bcrypt.hashSync(password, 10);
      const result = queryRun(
        'INSERT INTO users (username, password_hash, full_name, role) VALUES (?, ?, ?, ?)',
        [username, hash, full_name, role || 'teknisi']
      );

      res.status(201).json({
        message: 'User berhasil didaftarkan',
        user: { id: result.lastInsertRowid, username, full_name, role: role || 'teknisi' }
      });
    } catch (err) {
      console.error('Register error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /api/auth/me
  router.get('/me', authMiddleware, (req, res) => {
    try {
      const user = queryGet('SELECT id, username, full_name, role, created_at FROM users WHERE id = ?', [req.user.id]);
      if (!user) {
        return res.status(404).json({ error: 'User tidak ditemukan' });
      }
      res.json({ user });
    } catch (err) {
      console.error('Get profile error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /api/auth/users (for analytics & admin)
  router.get('/users', authMiddleware, (req, res) => {
    try {
      const users = queryAll('SELECT id, username, full_name, role, created_at, is_active FROM users ORDER BY full_name');
      res.json({ users });
    } catch (err) {
      console.error('Get users error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}

module.exports = createAuthRouter;
