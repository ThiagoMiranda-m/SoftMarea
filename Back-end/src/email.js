const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

exports.sendVerificationCode = async (to, code) => {
  const info = await transporter.sendMail({
    from: '"SoftMarea" <no-reply@softmarea.com>',
    to: to,
    subject: "Seu código de verificação - SoftMarea",
    html: `
      <div style="font-family: sans-serif; text-align: center; padding: 20px;">
        <h2>Seu Código de Verificação</h2>
        <p>Use este código para completar seu registro na SoftMarea:</p>
        <p style="font-size: 28px; font-weight: bold; letter-spacing: 5px; background: #f0f0f0; padding: 10px; border-radius: 5px;">
          ${code}
        </p>
        <p>Este código expira em 10 minutos.</p>
      </div>
    `,
  });

  console.log("E-mail de verificação enviado! Preview URL: %s", nodemailer.getTestMessageUrl(info));

exports.sendPasswordResetEmail = async (to, token) => {
  const resetLink = `http://127.0.0.1:5500/Front-End/HTML/reset-password.html?token=${token}`;

  const info = await transporter.sendMail({
    from: '"SoftMarea" <no-reply@softmarea.com>',
    to: to,
    subject: "Redefinição de Senha - SoftMarea",
    html: `
      <h2>Redefinição de Senha</h2>
      <p>Recebemos uma solicitação para redefinir sua senha. Se foi você, clique no link abaixo para criar uma nova senha:</p>
      <a href="${resetLink}" style="padding: 10px 15px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">
        Redefinir Senha
      </a>
      <p>Este link expira em 1 hora. Se você não solicitou isso, pode ignorar este e-mail.</p>
    `,
  });

  console.log("E-mail de redefinição de senha enviado! Preview URL: %s", nodemailer.getTestMessageUrl(info));
};
};