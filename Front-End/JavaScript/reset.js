"use strict";

/* =================== LÓGICA DA PÁGINA DE REDEFINIÇÃO DE SENHA =================== */

// Helper para selecionar elementos (precisamos dele aqui também)
const $ = (s, el = document) => el.querySelector(s);

const form = $('#form-reset-password');
const newPasswordInput = $('#newPassword');
const resetContainer = $('.reset-container'); // Container principal para feedback

form.addEventListener('submit', async e => {
  e.preventDefault();
  const form = e.target;
  const submitButton = form.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  submitButton.textContent = 'Aguarde...';

  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  const password = new FormData(form).get('password');

  if (!token) {
    alert('Erro: Token de redefinição não encontrado na URL.');
    submitButton.disabled = false;
    submitButton.textContent = 'Salvar Nova Senha';
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

    // ============ MUDANÇA AQUI: MOSTRA MENSAGEM E REDIRECIONA ============
    
    // 1. Mostra a mensagem de sucesso na página
    resetContainer.innerHTML = `
      <h2>Senha Redefinida!</h2>
      <p style="text-align: center;">A sua senha foi alterada com sucesso. Você será redirecionado para a página de login em 3 segundos.</p>
    `;

    // 2. Redireciona para a página principal após 3 segundos
    setTimeout(() => {
      window.location.href = 'Home.html'; // Redireciona para a página inicial
    }, 3000); // 3000 milissegundos = 3 segundos

  } catch (err) {
    alert(`Erro: ${err.message}`);
    submitButton.disabled = false;
    submitButton.textContent = 'Salvar Nova Senha';
  }
});


/* ================= VALIDAÇÃO DE SENHA EM TEMPO REAL (PARA A NOVA SENHA) ================= */
const passwordReqsContainer = $('#password-reqs');

if (newPasswordInput && passwordReqsContainer) {
  // Recria os requisitos no JS para garantir que existam
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