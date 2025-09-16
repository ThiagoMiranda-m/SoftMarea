// SoftMarea/Back-end/src/server.js ATUALIZADO
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const passport = require('passport');
const session = require('express-session');
require('./passport-setup'); // Vamos criar este ficheiro a seguir

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(cors({ origin: true, credentials: true })); // Garante que os cookies de sessão funcionem

// Configuração da Sessão
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
}));

// Inicia o Passport
app.use(passport.initialize());
app.use(passport.session());

app.get('/', (_, res) => res.send('API OK'));
app.use('/auth', require('./auth.routes'));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log('Server on http://localhost:' + port));