"use strict";

/* ================= Helpers ================= */
const $  = (s, el=document) => el.querySelector(s);

/* ================= Toast ================= */
let toast      = $('#toast');
let toastText  = $('#toastText');
let toastTimer = null;

function ensureToast(){
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    toastText = document.createElement('span');
    toastText.id = 'toastText';
    toast.appendChild(toastText);
    document.body.appendChild(toast);
  }
  if (!toastText) {
    toastText = document.createElement('span');
    toastText.id = 'toastText';
    toast.appendChild(toastText);
  }
}
function showToast(message, type='success', ms=2600){
  ensureToast();
  toast.classList.remove('toast--success','toast--error','is-open');
  toastText.textContent = message;
  toast.classList.add(type === 'error' ? 'toast--error' : 'toast--success');
  requestAnimationFrame(()=> toast.classList.add('is-open'));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=> toast.classList.remove('is-open'), ms);
}

/* ================= Header / auth ================= */
const btnMenu       = $('#btnMenu');
const userMenu      = $('#userMenu');
const menuHistorico = $('#menuHistorico');
const menuSair      = $('#menuSair');
const btnLoginHdr   = $('#btnLogin');
const btnRegistro   = $('#btnRegistro');
const menuPerfil    = $('#menuPerfil'); 

function isLoggedIn(){ return !!localStorage.getItem('sm_token'); }
function updateAuthUI(logged){
  btnRegistro?.classList.toggle('is-hidden', logged);
  btnLoginHdr?.classList.toggle('is-hidden', logged);
  btnMenu?.classList.toggle('is-hidden', !logged);
  if (!logged){
    userMenu?.classList.remove('is-open');
    btnMenu?.setAttribute('aria-expanded','false');
  }
}
function setLoggedIn(v){
  if (!v){
    localStorage.removeItem('sm_token');
    updateAuthUI(false);
    showToast('Sessão encerrada.', 'success');
    window.location.assign('./Home.html'); 
    return;
  }
  updateAuthUI(true);
}
updateAuthUI(isLoggedIn());

btnMenu?.addEventListener('click', (e)=>{
  const open = userMenu.classList.toggle('is-open');
  btnMenu.setAttribute('aria-expanded', String(open));
  e.stopPropagation();
});
document.addEventListener('click', (e)=>{
  if (!userMenu?.classList.contains('is-open')) return;
  if (!e.target.closest('#userMenu, #btnMenu')){
    userMenu.classList.remove('is-open');
    btnMenu?.setAttribute('aria-expanded','false');
  }
});
document.addEventListener('keydown', (e)=>{
  if (e.key === 'Escape'){
    userMenu?.classList.remove('is-open');
    btnMenu?.setAttribute('aria-expanded','false');
  }
});

// Listener para navegação
menuHistorico?.addEventListener('click', ()=>{
  userMenu?.classList.remove('is-open');
  window.location.assign('./Historico.html');
});
menuPerfil?.addEventListener('click', ()=>{
    userMenu?.classList.remove('is-open');
});

menuSair?.addEventListener('click', ()=>{
  userMenu?.classList.remove('is-open');
  setLoggedIn(false);
});

/* ================= Proteção de rota ================= */
if (!isLoggedIn()){
  showToast('Faça login para acessar seu perfil.', 'error', 3200);
  // Redireciona para a home se não estiver logado
  setTimeout(() => {
    window.location.assign('./Home.html');
  }, 1000);
}

/* ================== CONFIG API ================== */
const API_BASE         = "http://localhost:3000/auth";
const API_ME           = `${API_BASE}/me`;
const API_PROFILE_UPDATE = `${API_BASE}/profile`; 

/* ================== DOM Elementos do Perfil ================== */
const loadingState      = $('#loadingState');
const profileForm       = $('#profileForm');
const securitySection   = $('.security-section');

const profileNameInput  = $('#profileName');
const profileEmailInput = $('#profileEmail');
const profilePhoneInput = $('#profilePhone'); 
const verificationStatus = $('#verificationStatus'); 

/* ================== Lógica do Perfil ================== */

async function fetchProfileData(){
  const token = localStorage.getItem('sm_token');
  loadingState?.classList.remove('is-hidden');
  profileForm?.classList.add('is-hidden');
  securitySection?.classList.add('is-hidden');

  try {
    const res = await fetch(API_ME, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || `Erro ${res.status}`);
    
    // O endpoint /me retorna os dados do usuário
    const user = data.user || data; 

    // Preenche o formulário com os dados do usuário
    if (profileNameInput) profileNameInput.value = user.name || '';
    if (profileEmailInput) profileEmailInput.value = user.email || '';
    // O backend envia 'null' se não houver telefone, tratamos aqui para mostrar string vazia
    if (profilePhoneInput) profilePhoneInput.value = user.phone_number || ''; 

    // Atualiza o status de verificação
    if (verificationStatus) {
        const isVerified = !!user.is_verified;
        const statusText = isVerified ? 'Sim' : 'Não';
        verificationStatus.textContent = statusText;
        verificationStatus.classList.toggle('status-verified', isVerified);
        verificationStatus.classList.toggle('status-disabled', !isVerified);
    }

    loadingState?.classList.add('is-hidden');
    profileForm?.classList.remove('is-hidden');
    securitySection?.classList.remove('is-hidden');

  } catch (err) {
    console.error(err);
    showToast('Não foi possível carregar os dados do perfil.', 'error', 3200);
    loadingState.textContent = 'Erro ao carregar o perfil. Tente fazer login novamente.';
    loadingState?.classList.remove('is-hidden');
    profileForm?.classList.add('is-hidden');
  }
}

// Manipulador de Alterar Senha
$('#btnChangePassword')?.addEventListener('click', () => {
    // A função de redefinição de senha está no fluxo de "Esqueci a minha senha" na tela de Login.
    showToast('Use a função "Esqueci a minha senha" na tela de Login para redefinir.', 'success', 5000);
});


// ========================= NOVO: LÓGICA DE ATUALIZAÇÃO DO PERFIL =========================
profileForm?.addEventListener('submit', async e => {
    e.preventDefault();
    
    const token = localStorage.getItem('sm_token');
    const btn = e.submitter;
    const originalText = btn.textContent;

    // Constrói o payload de atualização
    const payload = {
        name: profileNameInput.value.trim(),
        // Se o campo estiver vazio, envia null. O backend tratará isso.
        phone_number: profilePhoneInput.value.trim() || null 
    };

    // Validação de nome (o backend também faz, mas é bom no frontend)
    if (!payload.name) {
        showToast('O nome não pode estar vazio.', 'error');
        return;
    }

    btn.textContent = 'Salvando...';
    btn.disabled = true;

    try {
        const res = await fetch(API_PROFILE_UPDATE, {
            method: 'PATCH', // Método HTTP para atualização parcial
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify(payload)
        });
        
        const data = await res.json();
        
        if (!res.ok) {
            showToast(data.error || 'Erro ao salvar alterações.', 'error', 4000);
            throw new Error(data.error);
        }

        // Atualiza os campos do formulário com os dados retornados
        const updatedUser = data.user;
        if (updatedUser.name) profileNameInput.value = updatedUser.name;
        if (updatedUser.phone_number !== undefined) profilePhoneInput.value = updatedUser.phone_number || ''; 

        showToast(data.message || 'Perfil atualizado com sucesso!', 'success', 3000);
        
    } catch (err) {
        console.error("Erro de atualização:", err);
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
    }
});
// ========================================================================================


/* ================== Boot ================== */
document.addEventListener('DOMContentLoaded', fetchProfileData);