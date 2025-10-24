// SoftMarea/Back-end/src/server.js ATUALIZADO
require('dotenv').config();
const express = require('express');
const cors = require('cors');
// const cookieParser = require('cookie-parser'); // Geralmente desnecessário com express-session moderno
const passport = require('passport');
const session = require('express-session');
require('./passport-setup'); // Importa a configuração do Passport

const app = express();

// --- Configuração de CORS (Mais Segura) --- 🔒
// É crucial definir quais origens (front-ends) podem acessar sua API,
// especialmente ao usar 'credentials: true'.
const allowedOrigins = [
  'https://softmarea.onrender.com', // Ex: Seu front-end local (Create React App)
  'http://localhost:5173', // Ex: Seu front-end local (Vite)
  'http://127.0.0.1:5500',            
  // 'https://seu-dominio-de-producao.com' // Adicione seu site aqui
];

app.use(cors({
  origin: (origin, callback) => {
    // Permite requisições sem 'origin' (ex: Postman, apps móveis) ou da lista
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Origem não permitida pelo CORS'));
    }
  },
  credentials: true // Permite que o front-end envie cookies (para a sessão)
}));

app.use(express.json());
// app.use(cookieParser()); // O 'express-session' já lida com os cookies da sessão.


// --- Configuração da Sessão (Mais Robusta) --- 🚀
// ATENÇÃO: O MemoryStore padrão não é para produção (vaza memória e reinicia).
// Considere usar `connect-mongo`, `connect-redis`, ou `connect-pg-simple`
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,            // Não salva a sessão se não for modificada
  saveUninitialized: false, // NÃO cria sessões para visitantes anônimos
  cookie: {
    secure: process.env.NODE_ENV === 'production', // true: Apenas em HTTPS
    httpOnly: true, // Impede acesso ao cookie via JavaScript no front-end
    maxAge: 1000 * 60 * 60 * 24 // Tempo de vida do cookie (ex: 1 dia)
  }
}));

// Inicia o Passport
app.use(passport.initialize());
app.use(passport.session()); // Conecta o Passport à sessão do Express

// Rotas
app.get('/', (_, res) => res.send('API OK'));
app.use('/auth', require('./auth.routes')); // Suas rotas de autenticação

// Inicialização do Servidor
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Servidor rodando em http://localhost:${port}`));