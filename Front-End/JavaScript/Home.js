"use strict";

/* Helpers */
const $  = (s, el=document) => el.querySelector(s);
const $$ = (s, el=document) => Array.from(el.querySelectorAll(s));



/* ========= Toast / Notificação ========= */
let toast = document.getElementById('toast');
let toastText = document.getElementById('toastText');
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
const API_URL = "http://localhost:3000/auth"; // ajuste se seu backend tiver outro endereço

/* ================= PANORAMA + LOGOS ================= */
const panorama = $('#panorama');

function pauseAllVideos(root=document){
  $$('.panel__media video', root).forEach(v => { try{ v.pause(); }catch{} });
}
function playAutoplayVideo(panel){
  const v = $('.panel__media video[autoplay]', panel);
  if (!v) return; try { v.muted = true; v.play().catch(()=>{}); } catch {}
}
function fillBrand(panel){
  const brand =
    panel?.dataset?.brand ||
    $('.logo-btn', panel)?.getAttribute('aria-label') ||
    $('.logo-btn img', panel)?.alt || '';
  const el = $('.brand-input', panel);
  if(!el || !brand) return;

  if (el.tagName === 'SELECT'){
    const opt = [...el.options].find(o =>
      o.value.toLowerCase() === brand.toLowerCase() ||
      o.text.toLowerCase()  === brand.toLowerCase()
    );
    if (opt) el.value = opt.value;
  } else {
    el.value = brand;
  }
  el.classList.add('filled');
  el.dispatchEvent(new Event('input',{bubbles:true}));
  el.dispatchEvent(new Event('change',{bubbles:true}));
}
function activatePanel(panel){
  if(!panel) return;
  $$('.panel.active', panorama).forEach(p=>p.classList.remove('active'));
  panel.classList.add('active');
  pauseAllVideos(panorama);
  playAutoplayVideo(panel);
  fillBrand(panel);
  try{ panel.scrollIntoView({behavior:'smooth', inline:'center', block:'nearest'});}catch{}
}
document.addEventListener('DOMContentLoaded', ()=>{
  const active = $('.panel.active');
  if (active){ fillBrand(active); playAutoplayVideo(active); }
});
panorama?.addEventListener('click', (ev)=>{
  const btn = ev.target.closest('.logo-btn'); if(!btn) return;
  activatePanel(btn.closest('.panel'));
});

/* ================= MODAIS: LOGIN, REGISTRO E VERIFICAÇÃO ================= */
const loginModal      = $('#loginModal');
const registerModal   = $('#registerModal');
const verifyCodeModal = $('#verifyCodeModal'); 
const forgotPasswordModal = $('#forgotPasswordModal');// Novo modal

const btnOpenLogin    = $('#btnLogin');
const btnOpenRegister = $('#btnRegistro');
const btnForgotPassword = $('#btnForgotPassword'); // Novo botão

let userEmailForVerification = ''; // Variável para guardar o email durante a verificação

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

// Atualizado para incluir todos os modais na lógica de fechar
[loginModal, registerModal, verifyCodeModal, forgotPasswordModal].forEach(modal=>{
  modal?.addEventListener('click', (e)=>{
    if (e.target.matches('[data-close], .modal__backdrop')) closeModal(modal);
  });
});
document.addEventListener('keydown', (e)=>{
  if (e.key !== 'Escape') return;
  if (loginModal?.classList.contains('is-open'))    closeModal(loginModal);
  if (registerModal?.classList.contains('is-open')) closeModal(registerModal);
  if (verifyCodeModal?.classList.contains('is-open')) closeModal(verifyCodeModal);
  if (forgotPasswordModal?.classList.contains('is-open')) closeModal(forgotPasswordModal);
});


/* ================= HEADER: estado logado/deslogado ================= */
const btnMenu       = $('#btnMenu');
const userMenu      = $('#userMenu');
const menuHistorico = $('#menuHistorico');
const menuSair      = $('#menuSair');

const btnLoginHdr   = $('#btnLogin');
const btnRegistro   = $('#btnRegistro');

function isLoggedIn(){ return !!localStorage.getItem('sm_token'); }
function setLoggedIn(v, origin = 'login'){
  if (!v) {
    localStorage.removeItem('sm_token');
    updateAuthUI(false);
    userMenu?.classList.remove('is-open');
    btnMenu ?.setAttribute('aria-expanded','false');
    return;
  }
  updateAuthUI(true);
  window.closeAllAuthModals?.();
  const msg = origin === 'register' ? 'Registrado com sucesso' : 'Conectado com sucesso';
  window.showToast?.(msg, 'success');
}

function updateAuthUI(logged){
  btnRegistro?.classList.toggle('is-hidden', logged);
  btnLoginHdr?.classList.toggle('is-hidden', logged);
  btnMenu?.classList.toggle('is-hidden', !logged);
  if (!logged){
    userMenu?.classList.remove('is-open');
    btnMenu?.setAttribute('aria-expanded','false');
  }
}
document.addEventListener('DOMContentLoaded', ()=> updateAuthUI(isLoggedIn()));

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
document.addEventListener('keydown', (e)=>{
  if (e.key === 'Escape'){
    userMenu?.classList.remove('is-open');
    btnMenu?.setAttribute('aria-expanded','false');
  }
});
menuHistorico?.addEventListener('click', ()=>{ userMenu?.classList.remove('is-open'); console.log('Abrir histórico'); });
menuSair?.addEventListener('click', ()=>{ userMenu?.classList.remove('is-open'); setLoggedIn(false); });

// Atualizado para fechar todos os modais
window.closeAllAuthModals = function(){
  closeModal(loginModal);
  closeModal(registerModal);
  closeModal(verifyCodeModal);
  closeModal(forgotPasswordModal);
};

/* ================= FORM: LOGIN ================= */
$('#form-login')?.addEventListener('submit', async e=>{
  e.preventDefault();
  const form = new FormData(e.target);
  const body = {
    email: form.get('email'),
    password: form.get('password')
  };

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
    closeModal(loginModal);
  } catch(err){
    showToast(err.message || 'Erro no login', 'error');
  }
});

/* ================= FORM: REGISTRO ================= */
$('#form-register')?.addEventListener('submit', async e=>{
  e.preventDefault();
  const form = new FormData(e.target);
  userEmailForVerification = form.get('email'); // Guarda o email para o próximo passo

  const body = {
    name: form.get('name'),
    email: userEmailForVerification,
    password: form.get('password')
  };

  try {
    const res = await fetch(`${API_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro no registro');

    closeModal(registerModal);
    openModal(verifyCodeModal); // Abre o modal para inserir o código
    showToast(data.message, 'success');
  } catch(err){
    showToast(err.message || 'Erro no registro', 'error');
  }
});

/* ================= FORM: VERIFICAR CÓDIGO (NOVO) ================= */
$('#form-verify-code')?.addEventListener('submit', async e=>{
  e.preventDefault();
  const form = new FormData(e.target);
  const body = {
    email: userEmailForVerification, // Usa o email guardado
    code: form.get('code')
  };

  try {
    const res = await fetch(`${API_URL}/verify-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro na verificação');

    // Se o código estiver correto, o backend já retorna o token
    localStorage.setItem('sm_token', data.token);
    setLoggedIn(true, 'register'); // Marca como logado
    closeModal(verifyCodeModal); // Fecha o último modal
  } catch(err){
    showToast(err.message || 'Erro na verificação', 'error');
  }
});

/* ================= FORM: ESQUECI A SENHA ================= */
$('#form-forgot-password')?.addEventListener('submit', async e => {
  e.preventDefault();
  const form = new FormData(e.target);
  const body = { email: form.get('email') };

  try {
    const res = await fetch(`${API_URL}/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao enviar o e-mail');

    closeModal(forgotPasswordModal);
    showToast(data.message, 'success', 4000);
  } catch (err) {
    showToast(err.message, 'error');
  }
});

/* ================= VALIDAÇÃO DE SENHA EM TEMPO REAL ================= */
const registerPasswordInput = $('#registerPassword');
const passwordReqsContainer = $('#password-reqs');

if (registerPasswordInput && passwordReqsContainer) {
  const reqs = {
    length: $('[data-req="length"]', passwordReqsContainer),
    case:   $('[data-req="case"]', passwordReqsContainer),
    number: $('[data-req="number"]', passwordReqsContainer),
  };

  registerPasswordInput.addEventListener('input', () => {
    const pass = registerPasswordInput.value;
    const hasMinLength = pass.length >= 8;
    reqs.length.classList.toggle('is-valid', hasMinLength);
    const hasUpperCase = /[A-Z]/.test(pass);
    reqs.case.classList.toggle('is-valid', hasUpperCase);
    const hasNumber = /[0-9]/.test(pass);
    reqs.number.classList.toggle('is-valid', hasNumber);
  });
}

btnForgotPassword?.addEventListener('click', e => {
  e.preventDefault();
  closeModal(loginModal);
  openModal(forgotPasswordModal);
});

// Adicione a lógica de submit para o novo formulário
$('#form-forgot-password')?.addEventListener('submit', async e => {
  e.preventDefault();
  const form = new FormData(e.target);
  const body = { email: form.get('email') };

  try {
    const res = await fetch(`${API_URL}/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao enviar o e-mail');

    closeModal(forgotPasswordModal);
    showToast(data.message, 'success', 4000);
  } catch (err) {
    showToast(err.message, 'error');
  }
});