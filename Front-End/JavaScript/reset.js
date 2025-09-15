"use strict";

/* =================== LÓGICA DA PÁGINA DE REDEFINIÇÃO DE SENHA =================== */
const $ = (s, el = document) => el.querySelector(s);

const form = $('#form-reset-password');
const newPasswordInput = $('#newPassword');

form.addEventListener('submit', async e => {
  e.preventDefault();
  const form = e.target;
  const submitButton = form.querySelector('button[type="submit"]');
  submitButton.disabled = true;

  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  const password = new FormData(form).get('password');

  if (!token) {
    alert('Erro: Token de redefinição não encontrado na URL.');
    submitButton.disabled = false;
    return;
  }

  try {
    const res = await fetch(`http://localhost:3000/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    alert('Senha redefinida com sucesso! Você já pode fechar esta página e fazer o login.');
    form.innerHTML = '<p style="text-align: center;">Senha alterada com sucesso!</p>';
  } catch (err) {
    alert(`Erro: ${err.message}`);
    submitButton.disabled = false;
  }
});


/* ================= VALIDAÇÃO DE SENHA EM TEMPO REAL (PARA A NOVA SENHA) ================= */
const passwordReqsContainer = $('#password-reqs');

if (newPasswordInput && passwordReqsContainer) {
  passwordReqsContainer.innerHTML = `
    <div class="req" data-req="length"><span class="req__bullet"></span> Mínimo 8 caracteres</div>
    <div class="req" data-req="case"><span class="req__bullet"></span> Uma letra maiúscula</div>
    <div class="req" data-req="number"><span class="req__bullet"></span> Um número</div>
  `;
  
  const reqs = {
    length: $('[data-req="length"]', passwordReqsContainer),
    case:   $('[data-req="case"]', passwordReqsContainer),
    number: $('[data-req="number"]', passwordReqsContainer),
  };

  newPasswordInput.addEventListener('input', () => {
    const pass = newPasswordInput.value;
    
    reqs.length.classList.toggle('is-valid', pass.length >= 8);
    reqs.case.classList.toggle('is-valid', /[A-Z]/.test(pass));
    reqs.number.classList.toggle('is-valid', /[0-9]/.test(pass));
  });
}