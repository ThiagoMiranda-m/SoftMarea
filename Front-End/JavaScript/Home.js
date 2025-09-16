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

/* ================= CONFIG DA API ================= */
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
  const brand =
    panel?.dataset?.brand ||
    $('.logo-btn', panel)?.getAttribute('aria-label') ||
    $('.logo-btn img', panel)?.alt || '';
  const el = $('.brand-input', panel);
  if(!el || !brand) return;

  el.value = brand;
  el.readOnly = true;                 // trava edição
  el.setAttribute('aria-readonly','true');
  el.classList.add('filled');
  el.dispatchEvent(new Event('input',{bubbles:true}));
  el.dispatchEvent(new Event('change',{bubbles:true}));
}
function populateSelectors(panel){
  if (!panel) return;
  const brand = panel?.dataset?.brand || '';
  const modelSel = $('.model-select', panel);
  const yearSel  = $('.year-select', panel);

  if (modelSel){
    modelSel.innerHTML = '';
    const ph = document.createElement('option');
    ph.value = ''; ph.disabled = true; ph.selected = true;
    ph.textContent = 'Modelo';
    modelSel.appendChild(ph);

    (CAR_DATA[brand] || []).forEach(m=>{
      const op = document.createElement('option');
      op.value = m; op.textContent = m;
      modelSel.appendChild(op);
    });
  }
  if (yearSel){
    yearSel.innerHTML = '';
    const ph = document.createElement('option');
    ph.value = ''; ph.disabled = true; ph.selected = true;
    ph.textContent = 'Ano';
    yearSel.appendChild(ph);

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
document.addEventListener('DOMContentLoaded', ()=>{
  const active = $('.panel.active');
  if (active){
    fillBrand(active);
    populateSelectors(active);
    playAutoplayVideo(active);
  }
});
panorama?.addEventListener('click', (ev)=>{
  const btn = ev.target.closest('.logo-btn'); if(!btn) return;
  activatePanel(btn.closest('.panel'));
});

/* ================= MODAIS: LOGIN / REGISTRO / VERIFICAÇÃO / ESQUECI ================= */
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

btnOpenLogin   ?.addEventListener('click', ()=> openModal(loginModal));
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
  if (loginModal?.classList.contains('is-open'))          closeModal(loginModal);
  if (registerModal?.classList.contains('is-open'))       closeModal(registerModal);
  if (verifyCodeModal?.classList.contains('is-open'))     closeModal(verifyCodeModal);
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
    closeModal(loginModal);
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
    if (!res.ok) throw new Error(data.error || 'Erro no registro');

    closeModal(registerModal);
    openModal(verifyCodeModal);
    showToast(data.message || 'Código enviado para o e-mail', 'success');
  } catch(err){
    showToast(err.message || 'Erro no registro', 'error');
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
    closeModal(verifyCodeModal);
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

/* ===== Validação de senha em tempo real (opcional; exige IDs no HTML) ===== */
const registerPasswordInput = $('#registerPassword');
const passwordReqsContainer = $('#password-reqs');
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
