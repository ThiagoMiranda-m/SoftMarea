"use strict";

/* Helpers */
const $  = (s, el=document) => el.querySelector(s);
const $$ = (s, el=document) => Array.from(el.querySelectorAll(s));

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

/* ================= MODAIS: LOGIN e REGISTRO ================= */
const loginModal    = $('#loginModal');
const registerModal = $('#registerModal');

const btnOpenLogin    = $('#btnLogin');
const btnOpenRegister = $('#btnRegistro');

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

[loginModal, registerModal].forEach(modal=>{
  modal?.addEventListener('click', (e)=>{
    if (e.target.matches('[data-close], .modal__backdrop')) closeModal(modal);
  });
});
document.addEventListener('keydown', (e)=>{
  if (e.key !== 'Escape') return;
  if (loginModal?.classList.contains('is-open'))    closeModal(loginModal);
  if (registerModal?.classList.contains('is-open')) closeModal(registerModal);
});

/* ================= HEADER: estado logado/deslogado ================= */
const btnMenu       = $('#btnMenu');
const userMenu      = $('#userMenu');
const menuHistorico = $('#menuHistorico');
const menuSair      = $('#menuSair');

const btnLoginHdr   = $('#btnLogin');
const btnRegistro   = $('#btnRegistro');

/* --- Melhoria: usar apenas o token para saber login --- */
function isLoggedIn(){ return !!localStorage.getItem('sm_token'); }
function setLoggedIn(v){
  if (!v) {
    localStorage.removeItem('sm_token');
  }
  updateAuthUI(v);
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

/* Expor para auth.js (Firebase ou outro provedor) */
window.setLoggedIn = setLoggedIn;
window.closeAllAuthModals = function(){ closeModal(loginModal); closeModal(registerModal); };

/* ================= FORM: LOGIN E REGISTRO ================= */
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
      body: JSON.stringify(body) // --- melhoria: remove credentials: 'include'
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro no login');

    localStorage.setItem('sm_token', data.token);
    setLoggedIn(true);
    closeModal(loginModal);
  } catch(err){
    alert(err.message);
  }
});

$('#form-register')?.addEventListener('submit', async e=>{
  e.preventDefault();
  const form = new FormData(e.target);
  const body = {
    name: form.get('name'),
    email: form.get('email'),
    password: form.get('password')
  };

  try {
    const res = await fetch(`${API_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body) // --- melhoria: remove credentials: 'include'
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro no registro');

    alert('Conta criada com sucesso!');
    localStorage.setItem('sm_token', data.token); // salva token se backend devolver
    setLoggedIn(true);
    closeModal(registerModal);
  } catch(err){
    alert(err.message);
  }
});

/* QoL: marca input de marca como preenchido */
document.addEventListener('input', (e)=>{
  const t = e.target;
  if (!(t instanceof HTMLInputElement)) return;
  if (!t.classList.contains('brand-input')) return;
  t.classList.toggle('filled', !!t.value.trim());
});
