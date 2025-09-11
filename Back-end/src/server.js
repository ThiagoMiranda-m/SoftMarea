// SoftMarea/Back-end/src/server.js CORRIGIDO
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const app = express();

app.use(express.json());
app.use(cookieParser());

// ================== ALTERAÇÃO IMPORTANTE AQUI ==================
// Permite que o front-end (rodando de qualquer lugar) se comunique com a API
app.use(cors({
  // Se você usa cookies/sessões, é importante especificar a origem
  // e manter credentials: true. Se não, um cors() simples resolve.
  // Para funcionar com arquivos abertos localmente, a origem pode variar.
  // Vamos usar uma configuração mais permissiva para desenvolvimento.
  origin: true, // Reflete a origem da requisição, útil para `file://`
  credentials: true
}));
// ==============================================================

app.get('/', (_, res) => res.send('API OK'));
app.use('/auth', require('./auth.routes'));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log('Server on http://localhost:' + port));