const jwt = require('jsonwebtoken');

module.exports = function auth(req, res, next) {
  // Suporte a token via Header Authorization: Bearer <token> ou via cookie "token"
  const authHeader = req.headers.authorization || '';
  const cookieToken = req.cookies?.token;
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : cookieToken;

  if (!token) return res.status(401).json({ error: 'Token ausente.' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido ou expirado.' });
  }
};
