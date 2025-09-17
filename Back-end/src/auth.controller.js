const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('./db');
const {sendVerificationCode, sendPasswordResetEmail } = require('./email');
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

const isPasswordValid = (password) => {
  const hasUpperCase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasMinLength = password.length >= 8;
  return hasUpperCase && hasNumber && hasMinLength;
};

exports.register = async (req, res) => {
  try {
    const name = String(req.body.name || '').trim();
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || '');

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Nome, e-mail e senha são obrigatórios.' });
    }

    if (!isPasswordValid(password)) {
      return res.status(400).json({
        error: 'A senha deve ter no mínimo 8 caracteres, uma letra maiúscula e um número.'
      });
    }

    // Verifica se já existe um usuário VERIFICADO com este e-mail
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ? AND is_verified = TRUE', [email]);
    if (existing.length) {
      return res.status(409).json({ error: 'Este e-mail já está em uso.' });
    }

    // Se houver um registro antigo não verificado, ele será substituído
    await pool.query('DELETE FROM users WHERE email = ? AND is_verified = FALSE', [email]);

    const password_hash = await bcrypt.hash(password, 12);
    const verification_code = Math.floor(100000 + Math.random() * 900000).toString(); // Gera código de 6 dígitos
    const code_expires_at = new Date(Date.now() + 10 * 60 * 1000); // Código expira em 10 minutos

    await pool.query(
      'INSERT INTO users (name, email, password_hash, verification_code, code_expires_at) VALUES (?, ?, ?, ?, ?)',
      [name, email, password_hash, verification_code, code_expires_at]
    );

    await sendVerificationCode(email, verification_code);

    return res.status(201).json({ message: 'Código de verificação enviado para o seu e-mail.' });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro interno ao registrar.' });
  }
};

exports.verifyCode = async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ error: 'E-mail e código são obrigatórios.' });
    }

    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [normalizeEmail(email)]);
    const user = rows[0];

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }
    
    // Verifica se o código é válido e não expirou
    if (user.verification_code !== code || new Date() > new Date(user.code_expires_at)) {
      return res.status(400).json({ error: 'Código inválido ou expirado.' });
    }

    // Marca o usuário como verificado e limpa os campos de código
    await pool.query(
      'UPDATE users SET is_verified = TRUE, verification_code = NULL, code_expires_at = NULL WHERE id = ?',
      [user.id]
    );

    // Gera um token de login para o usuário ser autenticado imediatamente
    const token = jwt.sign(
      { sub: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
    );
    
    return res.status(200).json({ message: 'E-mail verificado com sucesso!', token });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro interno ao verificar o código.' });
  }
};

exports.login = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || '');

    if (!email || !password) {
      return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
    }

    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    const user = rows[0];
    if (!user) return res.status(401).json({ error: 'Credenciais inválidas.' });
    
    // VERIFICAÇÃO ADICIONAL: Impede login se o e-mail não foi verificado
    if (!user.is_verified) {
      return res.status(403).json({ error: 'Por favor, verifique seu e-mail antes de fazer o login.' });
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Credenciais inválidas.' });

    const token = jwt.sign(
      { sub: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
    );

    return res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro interno ao logar.' });
  }
};

exports.me = async (req, res) => {
  return res.json({ userId: req.user.sub, email: req.user.email });
};


exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const normalizedEmail = normalizeEmail(email);

    const [rows] = await pool.query('SELECT * FROM users WHERE email = ? AND is_verified = TRUE', [normalizedEmail]);
    const user = rows[0];

    if (!user) {
      return res.status(200).json({ message: 'Se um utilizador com este e-mail existir, um link de redefinição será enviado.' });
    }

    const reset_token = crypto.randomBytes(32).toString('hex');
    const reset_token_expires_at = new Date(Date.now() + 60 * 60 * 1000); // Expira em 1 hora

    await pool.query(
      'UPDATE users SET reset_token = ?, reset_token_expires_at = ? WHERE id = ?',
      [reset_token, reset_token_expires_at, user.id]
    );

    await sendPasswordResetEmail(user.email, reset_token);
    return res.status(200).json({ message: 'Se um utilizador com este e-mail existir, um link de redefinição será enviado.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro interno no servidor.' });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ error: 'Token e nova senha são obrigatórios.' });
    }

    if (!isPasswordValid(password)) {
      return res.status(400).json({
        error: 'A senha deve ter no mínimo 8 caracteres, uma letra maiúscula e um número.'
      });
    }

    // PASSO 1: Encontra o utilizador APENAS pelo token, sem verificar a data no SQL.
    const [rows] = await pool.query('SELECT * FROM users WHERE reset_token = ?', [token]);
    const user = rows[0];

    // PASSO 2: Agora, verificamos o token e a data de expiração no JavaScript.
    // Isto evita qualquer problema de fuso horário com o banco de dados.
    if (!user || new Date() > new Date(user.reset_token_expires_at)) {
      return res.status(400).json({ error: 'Token de redefinição inválido ou expirado.' });
    }

    const new_password_hash = await bcrypt.hash(password, 12);

    await pool.query(
      'UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires_at = NULL WHERE id = ?',
      [new_password_hash, user.id]
    );

    return res.status(200).json({ message: 'Senha redefinida com sucesso!' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro interno ao redefinir a senha.' });
  }
};

exports.phoneSignIn = async (req, res) => {
  try {
    const { firebaseToken } = req.body;
    if (!firebaseToken) {
      return res.status(400).json({ error: 'Firebase token é obrigatório.' });
    }

    const decodedToken = await admin.auth().verifyIdToken(firebaseToken);
    const phoneNumber = decodedToken.phone_number;

    let [rows] = await pool.query('SELECT * FROM users WHERE phone_number = ?', [phoneNumber]);
    let user = rows[0];

    if (!user) {
      // Se o utilizador não existe, cria um novo.
      const [result] = await pool.query(
        'INSERT INTO users (phone_number, name, email, is_verified) VALUES (?, ?, ?, ?)',
        [phoneNumber, phoneNumber, null, true] // A LINHA MAIS IMPORTANTE
      );

      // Busca o utilizador que acabamos de criar para obter o ID.
      [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [result.insertId]);
      user = rows[0];
    }
    
    // Gera o nosso próprio token JWT para a nossa aplicação.
    const token = jwt.sign(
      { sub: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
    );

    return res.json({ token, user: { id: user.id, name: user.name, email: user.email } });

  } catch (err) {
    // IMPORTANTE: Veja o erro no console do servidor!
    console.error("Erro detalhado em phoneSignIn:", err);
    return res.status(500).json({ error: 'Erro na autenticação com telefone.' });
  }
};