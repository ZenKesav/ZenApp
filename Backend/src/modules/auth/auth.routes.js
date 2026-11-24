const express = require('express');
const router = express.Router();
const AuthController = require('./auth.controller');
const { validateLoginInput } = require('./auth.validation');
const { authMiddleware } = require('../../core/middlewares/auth.middleware');

router.post('/login', validateLoginInput, AuthController.login);
router.get('/me', authMiddleware, AuthController.me);
router.post('/logout', authMiddleware, AuthController.logout);

module.exports = router;
