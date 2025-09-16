"use strict";

/* Helpers */
const $  = (s, el=document) => el.querySelector(s);
const $$ = (s, el=document) => Array.from(el.querySelectorAll(s));

// Função para ler o cookie, necessária para o login com Google
function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
}


/* ========= Toast / Notificação ========= */
let toast = document.getElementById('toast');
let toastText = document.getElementById('toastText');
let toastTimer = null;

function ensureToast(){
  if (!toast) {
    toast = document.createElement('div'); toast.id = 'toast'; toast.className = 'toast';
    toastText = document.createElement('span'); toastText.id = 'toastText';
    toast.appendChild(toastText); document.body.appendChild(toast);
  }
  if (!toastText) {
    toastText = document.createElement('span'); toastText.id = 'toastText';
    toast.appendChild(toastText);
  }
}
function showToast(message, type = 'success', ms = 2600){
  ensureToast();
  toast.classList.remove('toast--success','toast--error','is-open');
  toastText.textContent = message;
  toast.classList.add(type === 'error' ? 'toast--error' : 'toast--success');
  requestAnimationFrame(()=> toast.classList.add('is-open'));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=> toast.classList.remove('is-open'), ms);
}
window.showToast = showToast;

/* ================= CONFIGURAÇÃO DA API ================= */
const API_URL = "http://localhost:3000/auth";

/* =================== DADOS: MODELOS / ANOS =================== */
const CAR_DATA = {
  Ford:        ["Ka", "Fiesta", "Focus", "Fusion", "EcoSport", "Ranger", "Territory", "Maverick"],
  Chevrolet:   ["Onix", "Onix Plus", "Prisma", "Cruze", "Tracker", "S10", "Montana", "Spin"],
  Toyota:      ["Etios", "Yaris", "Corolla", "Corolla Cross", "Hilux", "SW4", "RAV4"],
  Honda:       ["Fit", "City", "Civic", "HR-V", "WR-V", "CR-V"],
  Volkswagen:  ["Gol", "Polo", "Virtus", "T-Cross", "Nivus", "Saveiro", "Jetta"],
  Fiat:        ["Mobi", "Argo", "Cronos", "Pulse", "Fastback", "Toro", "Strada"]
};
function generateYears(from = 1995, to = (new Date()).getFullYear()){
  const list = [];
  for (let y = to; y >= from; y--) list.push(String(y));
  return list;
}
const YEARS = generateYears(1995);

/* ================= PANORAMA + LOGOS ================= */
const panorama = $('#panorama');

function fillBrand(panel){
  const brand = panel?.dataset?.brand || '';
  const el = $('.brand-input', panel);
  if(!el || !brand) return;
  el.value = brand;
  el.classList.add('filled');
}
function populateSelectors(panel){
  if (!panel) return;
  const brand = panel?.dataset?.brand || '';
  const modelSel = $('.model-select', panel);
  const yearSel  = $('.year-select', panel);

  if (modelSel){
    modelSel.innerHTML = '<option value="" disabled selected>Modelo</option>';
    (CAR_DATA[brand] || []).forEach(m=>{
      const op = document.createElement('option');
      op.value = m; op.textContent = m;
      modelSel.appendChild(op);
    });
  }
  if (yearSel){
    yearSel.innerHTML = '<option value="" disabled selected>Ano</option>';
    YEARS.forEach(y=>{
      const op = document.createElement('option');
      op.value = y; op.textContent = y;
      yearSel.appendChild(op);
    });
  }
}
function pauseAllVideos(root=document){
  $$('.panel__media video', root).forEach(v => { try{ v.pause(); }catch{} });
}
function playAutoplayVideo(panel){
  const v = $('.panel__media video[autoplay]', panel);
  if (!v) return;
  try { v.muted = true; v.play().catch(()=>{}); } catch {}
}
function activatePanel(panel){
  if(!panel) return;
  $$('.panel.active', panorama).forEach(p=>p.classList.remove('active'));
  panel.classList.add('active');
  pauseAllVideos(panorama);
  playAutoplayVideo(panel);
  fillBrand(panel);
  populateSelectors(panel);
  try{ panel.scrollIntoView({behavior:'smooth', inline:'center', block:'nearest'});}catch{}
}
panorama?.addEventListener('click', (ev)=>{
  const btn = ev.target.closest('.logo-btn'); if(!btn) return;
  activatePanel(btn.closest('.panel'));
});

/* ================= MODAIS ================= */
const loginModal          = $('#loginModal');
const registerModal       = $('#registerModal');
const verifyCodeModal     = $('#verifyCodeModal');
const forgotPasswordModal = $('#forgotPasswordModal');

const btnOpenLogin        = $('#btnLogin');
const btnOpenRegister     = $('#btnRegistro');
const btnForgotPassword   = $('#btnForgotPassword');

let userEmailForVerification = '';

function openModal(modal){
  if(!modal) return;
  modal.classList.add('is-open');
  document.body.style.overflow = 'hidden';
}
function closeModal(modal){
  if(!modal) return;
  modal.classList.remove('is-open');
  document.body.style.overflow = '';
}

btnOpenLogin?.addEventListener('click', ()=> openModal(loginModal));
btnOpenRegister?.addEventListener('click', ()=> openModal(registerModal));
btnForgotPassword?.addEventListener('click', e => {
  e.preventDefault();
  closeModal(loginModal);
  openModal(forgotPasswordModal);
});

[loginModal, registerModal, verifyCodeModal, forgotPasswordModal].forEach(modal=>{
  modal?.addEventListener('click', (e)=>{
    if (e.target.matches('[data-close], .modal__backdrop')) closeModal(modal);
  });
});
document.addEventListener('keydown', (e)=>{
  if (e.key !== 'Escape') return;
  const openModal = $('.modal.is-open');
  if (openModal) closeModal(openModal);
});

/* ================= HEADER: estado logado/deslogado ================= */
const btnMenu       = $('#btnMenu');
const userMenu      = $('#userMenu');
const menuHistorico = $('#menuHistorico');
const menuSair      = $('#menuSair');
const btnLoginHdr   = $('#btnLogin');
const btnRegistro   = $('#btnRegistro');

// FUNÇÃO isLoggedIn ATUALIZADA
function isLoggedIn(){
  // 1. Procura pelo token na URL (enviado pelo login com Google)
  const urlParams = new URLSearchParams(window.location.search);
  const urlToken = urlParams.get('token');

  if (urlToken) {
    // 2. Se encontrar, guarda no localStorage
    localStorage.setItem('sm_token', urlToken);
    
    // 3. Limpa a URL para que o token não fique visível
    window.history.replaceState({}, document.title, window.location.pathname);
  }
  
  // 4. Agora, verifica o localStorage como antes
  return !!localStorage.getItem('sm_token');
}


function setLoggedIn(v, origin = 'login'){
  if (!v) {
    localStorage.removeItem('sm_token');
    updateAuthUI(false);
    return;
  }
  updateAuthUI(true);
  window.closeAllAuthModals?.();
  const msg = origin === 'register' ? 'Registado com sucesso' : 'Conectado com sucesso';
  window.showToast?.(msg, 'success');
}
window.setLoggedIn = setLoggedIn;

function updateAuthUI(logged){
  btnRegistro?.classList.toggle('is-hidden', logged);
  btnLoginHdr?.classList.toggle('is-hidden', logged);
  btnMenu?.classList.toggle('is-hidden', !logged);
  if (!logged){
    userMenu?.classList.remove('is-open');
    btnMenu?.setAttribute('aria-expanded','false');
  }
}

btnMenu?.addEventListener('click', (e)=>{
  const open = userMenu.classList.toggle('is-open');
  btnMenu.setAttribute('aria-expanded', String(open));
  e.stopPropagation();
});
document.addEventListener('click', (e)=>{
  if (!userMenu?.classList.contains('is-open')) return;
  const inside = e.target.closest('#userMenu, #btnMenu');
  if (!inside){
    userMenu.classList.remove('is-open');
    btnMenu?.setAttribute('aria-expanded','false');
  }
});
menuHistorico?.addEventListener('click', ()=>{
  userMenu?.classList.remove('is-open');
  console.log('Abrir histórico');
});
menuSair?.addEventListener('click', ()=>{
  userMenu?.classList.remove('is-open');
  setLoggedIn(false);
});

window.closeAllAuthModals = function(){
  closeModal(loginModal);
  closeModal(registerModal);
  closeModal(verifyCodeModal);
  closeModal(forgotPasswordModal);
};

/* ================= FORM: LOGIN ================= */
$('#form-login')?.addEventListener('submit', async e=>{
  e.preventDefault();
  const form = e.target;
  const submitButton = form.querySelector('button[type="submit"]');
  if (submitButton) submitButton.disabled = true;

  const formData = new FormData(form);
  const body = { email: formData.get('email'), password: formData.get('password') };

  try {
    const res = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro no login');

    localStorage.setItem('sm_token', data.token);
    setLoggedIn(true, 'login');
  } catch(err){
    showToast(err.message || 'Erro no login', 'error');
  } finally {
    if (submitButton) submitButton.disabled = false;
  }
});

/* ================= FORM: REGISTRO ================= */
$('#form-register')?.addEventListener('submit', async e=>{
  e.preventDefault();
  const form = e.target;
  const submitButton = form.querySelector('button[type="submit"]');
  if (submitButton) submitButton.disabled = true;

  const formData = new FormData(form);
  userEmailForVerification = formData.get('email');
  const body = {
    name: formData.get('name'),
    email: userEmailForVerification,
    password: formData.get('password')
  };

  try {
    const res = await fetch(`${API_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro no registo');

    closeModal(registerModal);
    openModal(verifyCodeModal);
    showToast(data.message || 'Código enviado para o e-mail', 'success');
  } catch(err){
    showToast(err.message || 'Erro no registo', 'error');
  } finally {
    if (submitButton) submitButton.disabled = false;
  }
});

/* ================= FORM: VERIFICAR CÓDIGO ================= */
$('#form-verify-code')?.addEventListener('submit', async e=>{
  e.preventDefault();
  const form = e.target;
  const submitButton = form.querySelector('button[type="submit"]');
  if (submitButton) submitButton.disabled = true;

  const formData = new FormData(form);
  const body = { email: userEmailForVerification, code: formData.get('code') };

  try {
    const res = await fetch(`${API_URL}/verify-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro na verificação');

    localStorage.setItem('sm_token', data.token);
    setLoggedIn(true, 'register');
  } catch(err){
    showToast(err.message || 'Erro na verificação', 'error');
  } finally {
    if (submitButton) submitButton.disabled = false;
  }
});

/* ================= FORM: ESQUECI A SENHA ================= */
$('#form-forgot-password')?.addEventListener('submit', async e => {
  e.preventDefault();
  const form = e.target;
  const submitButton = form.querySelector('button[type="submit"]');
  if (submitButton) submitButton.disabled = true;

  const formData = new FormData(form);
  const body = { email: formData.get('email') };

  try {
    const res = await fetch(`${API_URL}/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao enviar o e-mail');

    closeModal(forgotPasswordModal);
    showToast(data.message || 'E-mail enviado com sucesso', 'success', 4000);
  } catch (err) {
    showToast(err.message || 'Erro ao enviar o e-mail', 'error');
  } finally {
    if (submitButton) submitButton.disabled = false;
  }
});

/* ===== Validação de senha em tempo real ===== */
const registerPasswordInput = document.getElementById('registerPassword');
const passwordReqsContainer = document.getElementById('password-reqs');

if (registerPasswordInput && passwordReqsContainer) {
  const reqs = {
    length: $('[data-req="length"]', passwordReqsContainer),
    case:   $('[data-req="case"]',   passwordReqsContainer),
    number: $('[data-req="number"]', passwordReqsContainer),
  };
  registerPasswordInput.addEventListener('input', () => {
    const pass = registerPasswordInput.value;
    reqs.length?.classList.toggle('is-valid', pass.length >= 8);
    reqs.case  ?.classList.toggle('is-valid', /[A-Z]/.test(pass));
    reqs.number?.classList.toggle('is-valid', /[0-9]/.test(pass));
  });
}


// =================== LÓGICA DE INICIALIZAÇÃO DA PÁGINA ===================
document.addEventListener('DOMContentLoaded', ()=> {
  // 1. Ativa o painel inicial (carros)
  const activePanel = $('.panel.active');
  if (activePanel){
    fillBrand(activePanel);
    populateSelectors(activePanel);
    playAutoplayVideo(activePanel);
  }
  
  // 2. Verifica o estado de login (agora deteta o token da URL)
  if (isLoggedIn()) {
    setLoggedIn(true, 'login');
  } else {
    updateAuthUI(false);
  }
});