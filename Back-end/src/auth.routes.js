// SoftMarea/Back-end/src/auth.routes.js CORRIGIDO
const express = require('express');
const router = express.Router();
const ctrl = require('./auth.controller');
const auth = require('./auth.middleware');
const passport = require('passport');
const jwt = require('jsonwebtoken'); // <-- ADICIONE ESTA LINHA

router.post('/register', ctrl.register);
router.post('/verify-code', ctrl.verifyCode);
router.post('/login', ctrl.login);
router.get('/me', auth, ctrl.me);

// Rotas para esquecer a senha
router.post('/forgot-password', ctrl.forgotPassword);
router.post('/reset-password', ctrl.resetPassword);

// ==== ROTAS DE LOGIN COM O GOOGLE ====
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// Rota de callback ATUALIZADA
router.get('/google/callback',
  passport.authenticate('google', {
    failureRedirect: 'http://127.0.0.1:5500/Front-End/HTML/Home.html', // Endereço do seu front-end
    session: false // Não precisamos de sessão no servidor, vamos usar JWT
  }),
  (req, res) => {
    // Se a autenticação for bem-sucedida, o utilizador está em req.user
    const token = jwt.sign(
      { sub: req.user.id, email: req.user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
    );
    
    // Redireciona para o front-end com o token na URL
    const redirectUrl = `http://127.0.0.1:5500/Front-End/HTML/Home.html?token=${token}`;
    res.redirect(redirectUrl);
  }
);

module.exports = router;