const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('./db');
const {sendVerificationCode, sendPasswordResetEmail } = require('./email');
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');
const { GoogleGenerativeAI } = require('@google/generative-ai'); // <-- Pacote da IA
const { Client } = require('@googlemaps/google-maps-services-js');

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

// =================== ALTERAÇÃO AQUI: BUSCA DADOS COMPLETOS ===================
exports.me = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, name, email, phone_number, is_verified FROM users WHERE id = ?', [req.user.sub]);
    const user = rows[0];
    
    if (!user) {
        return res.status(404).json({ error: "Usuário não encontrado." });
    }
    
    // Retorna todos os campos necessários para a página de perfil
    return res.json({ 
        id: user.id, 
        name: user.name, 
        email: user.email, 
        phone_number: user.phone_number,
        is_verified: user.is_verified
    });
  } catch (err) {
    console.error("Erro ao buscar dados do usuário:", err);
    return res.status(500).json({ error: 'Erro interno do servidor.' });
  }
};
// =============================================================================

// =================== NOVO: FUNÇÃO PARA ATUALIZAR PERFIL ======================
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.sub;
    const { name, phone_number } = req.body;

    // 1. Validação mínima dos dados
    if (!name && phone_number === undefined) {
      return res.status(400).json({ error: "Pelo menos o nome ou telefone deve ser fornecido para a atualização." });
    }

    let query = 'UPDATE users SET ';
    const params = [];
    const fields = [];

    // Adiciona nome à atualização, se fornecido
    if (name !== undefined) {
      fields.push('name = ?');
      params.push(String(name).trim());
    }
    
    // Adiciona telefone à atualização. Permite enviar null ou string vazia para limpar o campo.
    if (phone_number !== undefined) {
      fields.push('phone_number = ?');
      params.push(phone_number ? String(phone_number).trim() : null); 
    }

    if (fields.length === 0) {
      // Se a validação inicial passar mas nenhum campo for alterado (por exemplo, todos undefined)
      return res.status(400).json({ error: "Nenhum campo válido fornecido para atualização." });
    }

    // 2. Construção e Execução da Query
    query += fields.join(', ') + ' WHERE id = ?';
    params.push(userId);

    const [result] = await pool.query(query, params);

    if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Usuário não encontrado ou nenhum dado alterado." });
    }

    // 3. Busca e Retorna os dados atualizados
    const [rows] = await pool.query('SELECT id, name, email, phone_number, is_verified FROM users WHERE id = ?', [userId]);
    const updatedUser = rows[0];
    
    if (!updatedUser) {
        return res.status(500).json({ error: "Erro ao buscar dados do usuário após atualização." });
    }

    return res.status(200).json({ 
        message: 'Perfil atualizado com sucesso!',
        user: { 
            id: updatedUser.id, 
            name: updatedUser.name, 
            email: updatedUser.email,
            phone_number: updatedUser.phone_number,
            is_verified: updatedUser.is_verified,
        }
    });

  } catch (err) {
    console.error("Erro ao atualizar perfil:", err);
    return res.status(500).json({ error: 'Erro interno ao atualizar o perfil.' });
  }
};
// =============================================================================


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

// ================= CHATBOT COM IA (GEMINI) =================
exports.handleChat = async (req, res) => {
  try {
    const { message, history, vehicleInfo } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'A mensagem é obrigatória.' });
    }

    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    // --- INÍCIO DA CORREÇÃO ---
    // Alterado para o modelo 'gemini-flash', que é mais estável e globalmente disponível.
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    // --- FIM DA CORREÇÃO ---

    const systemPrompt = `
      Você é um assistente automotivo especialista chamado SoftMarea.
      O usuário tem um ${vehicleInfo.brand || ''} ${vehicleInfo.model || ''} ano ${vehicleInfo.year || ''}. Baseie seu diagnóstico neste veículo.
      Seu objetivo é ajudar o usuário a diagnosticar problemas.
      Faça perguntas claras e diretas.
      MUITO IMPORTANTE: Mantenha suas respostas curtas e objetivas, com no máximo 100 palavras.
      Sempre conclua recomendando a consulta a um mecânico profissional para confirmação.
      Responda em português do Brasil.
    `;
    
    const chatHistory = (history || []).map(item => ({
      role: item.role === 'user' ? 'user' : 'model',
      parts: [{ text: item.content }],
    }));

    const chat = model.startChat({
      history: chatHistory,
      generationConfig: {
        temperature: 0.8,
        topK: 1,
        topP: 1,
        maxOutputTokens: 256, 
      },
      systemInstruction: {
        role: "model",
        parts: [{ text: systemPrompt }],
      },
    });

    const result = await chat.sendMessage(message);
    const response = result.response;
    const replyText = response.text();

    res.json({ reply: replyText });

  } catch (err) {
    console.error("Erro na API do Chatbot:", err);
    res.status(500).json({ error: 'Ocorreu um erro ao comunicar com a IA.' });
  }
};
// ================= MAPA / GOOGLE PLACES =================
exports.findNearbyPlaces = async (req, res) => {
  const { lat, lng, type } = req.query;

  if (!lat || !lng || !type) {
    return res.status(400).json({ error: 'Latitude, longitude e tipo são obrigatórios.' });
  }

  const client = new Client({});
  const keyword = type === 'shops' ? 'autopeças' : 'oficina mecânica';

  try {
    const response = await client.placesNearby({
      params: {
        location: `${lat},${lng}`,
        radius: 10000, // 5km de raio
        keyword: keyword,
        key: process.env.GOOGLE_MAPS_API_KEY,
        language: 'pt-BR',
      },
      timeout: 5000,
    });

    // Pega detalhes de cada local encontrado
    const placesWithDetails = await Promise.all(
      response.data.results.map(async (place) => {
        if (!place.place_id) return null;
        const detailsResponse = await client.placeDetails({
          params: {
            place_id: place.place_id,
            fields: ['name', 'formatted_address', 'formatted_phone_number', 'website', 'opening_hours', 'rating', 'geometry'],
            key: process.env.GOOGLE_MAPS_API_KEY,
            language: 'pt-BR',
          },
        });
        return detailsResponse.data.result;
      })
    );

    res.json({ places: placesWithDetails.filter(p => p) }); // Filtra nulos

  } catch (err) {
    console.error('Erro na API do Google Places:', err);
    res.status(500).json({ error: 'Erro ao buscar locais próximos.' });
  }
};

// ================= HISTÓRICO DE DIAGNÓSTICOS =================
exports.saveHistory = async (req, res) => {
  try {
    const userId = req.user.sub; // ID do usuário logado, vindo do token
    const { brand, model, year, userText, aiConclusion } = req.body;

    if (!userId || !model || !year || !userText || !aiConclusion) {
      return res.status(400).json({ error: 'Dados insuficientes para salvar o histórico.' });
    }

    const [result] = await pool.query(
      'INSERT INTO history (user_id, brand, model, year, userText, aiConclusion) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, brand, model, year, userText, aiConclusion]
    );

    res.status(201).json({ message: 'Histórico salvo com sucesso!', id: result.insertId });

  } catch (err) {
    console.error("Erro ao salvar histórico:", err);
    res.status(500).json({ error: 'Erro interno ao salvar o histórico.' });
  }
};

exports.getHistory = async (req, res) => {
  try {
    const userId = req.user.sub;
    const { brand, period } = req.query;

    let query = 'SELECT * FROM history WHERE user_id = ?';
    const params = [userId];

    if (brand) {
      query += ' AND brand = ?';
      params.push(brand);
    }

    if (period) {
      query += ' AND createdAt >= DATE_SUB(NOW(), INTERVAL ? DAY)';
      params.push(parseInt(period, 10));
    }

    query += ' ORDER BY createdAt DESC';

    const [rows] = await pool.query(query, params);
    res.json(rows);

  } catch (err) {
    console.error("Erro ao buscar histórico:", err);
    res.status(500).json({ error: 'Erro interno ao buscar o histórico.' });
  }
};