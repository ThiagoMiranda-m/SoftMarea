// SoftMarea/Back-end/src/auth.routes.js ATUALIZADO
const express = require('express');
const router = express.Router();
const ctrl = require('./auth.controller');
const auth = require('./auth.middleware');

router.post('/register', ctrl.register);
router.post('/verify-code', ctrl.verifyCode);
router.post('/login', ctrl.login);
router.get('/me', auth, ctrl.me);

// ==== NOVAS ROTAS PARA ESQUECER A SENHA ====
router.post('/forgot-password', ctrl.forgotPassword);
router.post('/reset-password', ctrl.resetPassword);

module.exports = router;