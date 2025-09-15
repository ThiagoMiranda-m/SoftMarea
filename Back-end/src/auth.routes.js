// SoftMarea/Back-end/src/auth.routes.js ATUALIZADO
const express = require('express');
const router = express.Router();
const ctrl = require('./auth.controller');
const auth = require('./auth.middleware');

router.post('/register', ctrl.register);
router.post('/login',    ctrl.login);
router.get('/me',        auth, ctrl.me);

// ==== NOVA ROTA PARA VERIFICAR O CÓDIGO ====
router.post('/verify-code', ctrl.verifyCode);

module.exports = router;