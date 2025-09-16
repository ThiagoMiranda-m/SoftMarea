const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const pool = require('./db');

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/callback"
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const googleId = profile.id;
      const email = profile.emails[0].value;
      const name = profile.displayName;

      let [rows] = await pool.query('SELECT * FROM users WHERE google_id = ?', [googleId]);
      let user = rows[0];

      if (!user) {
        // Se não encontrar pelo google_id, procura pelo e-mail
        [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        user = rows[0];

        if (user) {
          // Se o utilizador já existe (criado com e-mail/senha), apenas liga o google_id a ele
          await pool.query('UPDATE users SET google_id = ? WHERE id = ?', [googleId, user.id]);
        } else {
          // Se não existe de todo, cria um novo utilizador
          const [result] = await pool.query(
            'INSERT INTO users (name, email, google_id, is_verified) VALUES (?, ?, ?, ?)',
            [name, email, googleId, true] // Já vem verificado do Google
          );
          // Busca o utilizador recém-criado para passar para o 'done'
          [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [result.insertId]);
          user = rows[0];
        }
      }
      return done(null, user);
    } catch (err) {
      return done(err, null);
    }
  }
)); // A correção foi aqui, removendo um ')' extra

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
    done(null, rows[0]);
  } catch (err) {
    done(err, null);
  }
});