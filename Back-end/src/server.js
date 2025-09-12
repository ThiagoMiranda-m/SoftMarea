// SoftMarea/Back-end/src/server.js CORRIGIDO
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const app = express();

app.use(express.json());
app.use(cookieParser());

// ================== ALTERAÇÃO IMPORTANTE AQUI ==================
// Permite que qualquer origem (incluindo seu arquivo HTML local) 
// se comunique com a API.
app.use(cors());
// ==============================================================

app.get('/', (_, res) => res.send('API OK'));
app.use('/auth', require('./auth.routes'));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log('Server on http://localhost:' + port));