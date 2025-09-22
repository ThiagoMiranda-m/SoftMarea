// SoftMarea/Back-end/src/auth.routes.js CORRIGIDO
const express = require('express');
const router = express.Router();
const ctrl = require('./auth.controller');
const auth = require('./auth.middleware');
const passport = require('passport');
const jwt = require('jsonwebtoken');

router.post('/register', ctrl.register);
router.post('/verify-code', ctrl.verifyCode);
router.post('/login', ctrl.login);
router.get('/me', auth, ctrl.me);
router.post('/phone-signin', ctrl.phoneSignIn);

// Rotas para esquecer a senha
router.post('/forgot-password', ctrl.forgotPassword);
router.post('/reset-password', ctrl.resetPassword);

// NOVA ROTA PARA O CHATBOT
router.post('/chat', ctrl.handleChat);

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