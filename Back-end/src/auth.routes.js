// SoftMarea/Back-end/src/auth.routes.js CORRIGIDO
const express = require('express');
const router = express.Router();
const ctrl = require('./auth.controller');
const auth = require('./auth.middleware');
const passport = require('passport');
const jwt = require('jsonwebtoken');

//ROTAS DE AUTENTICAÇÃO
router.post('/register', ctrl.register);
router.post('/verify-code', ctrl.verifyCode);
router.post('/login', ctrl.login);
router.get('/me', auth, ctrl.me);

// NOVO: ROTA PARA ATUALIZAÇÃO DO PERFIL
router.patch('/profile', auth, ctrl.updateProfile); // <--- ROTA ADICIONADA

router.post('/phone-signin', ctrl.phoneSignIn);
router.post('/forgot-password', ctrl.forgotPassword);
router.post('/reset-password', ctrl.resetPassword);

// NOVA ROTA PARA O CHATBOT
router.post('/chat', ctrl.handleChat);

//ROTA DO MAPA (NOVA)
router.get('/places', auth, ctrl.findNearbyPlaces);

// ROTAS PARA O HISTÓRICO DE DIAGNÓSTICO
router.post('/history', auth, ctrl.saveHistory);
router.get('/history', auth, ctrl.getHistory);

// ==== ROTAS DE LOGIN COM O GOOGLE ====
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback',
  passport.authenticate('google', {
    failureRedirect: 'http://127.0.0.1:5500/Front-End/HTML/Home.html',
    session: false
  }),
  (req, res) => {
    const token = jwt.sign(
      { sub: req.user.id, email: req.user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
    );
    const redirectUrl = `http://127.0.0.1:5500/Front-End/HTML/Home.html?token=${token}`;
    res.redirect(redirectUrl);
  }
);

module.exports = router;