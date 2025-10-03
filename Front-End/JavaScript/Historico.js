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
    return;
  }
  updateAuthUI(true);
  showToast('Conectado com sucesso.', 'success');
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
menuHistorico?.addEventListener('click', ()=>{
  userMenu?.classList.remove('is-open');
});
menuSair?.addEventListener('click', ()=>{
  userMenu?.classList.remove('is-open');
  setLoggedIn(false);
});

/* ================= Proteção de rota ================= */
if (!isLoggedIn()){
  showToast('Faça login para ver o histórico.', 'error', 3200);
}

/* ================== CONFIG API ================== */
const API_BASE     = "http://localhost:3000";
const HISTORY_PATH = "/auth/history";

/* ================== DOM ================== */
const selectBrand   = $('#brandFilter');
const selectPeriod  = $('#periodFilter');
const grid          = $('#histGrid');
const emptyState    = $('#emptyState');

/* ================== Render ================== */
function escapeHTML(s){
  return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}
function renderHistory(items){
  if (!grid) return;
  grid.innerHTML = '';
  const data = Array.isArray(items) ? items : [];
  emptyState?.classList.toggle('is-hidden', data.length > 0);

  for (const it of data){
     const card = document.createElement('article');
     card.className = 'hist-card';

     const when = it.createdAt ? new Date(it.createdAt) : null;
     const dateStr = when ? when.toLocaleString() : '';

     card.innerHTML = `
       <header class="hist-card__top">
         <span class="hist-card__id">#${it.id || ''}</span>
         <time class="hist-card__date">${dateStr}</time>
       </header>
       <h3 class="hist-card__title">${it.brand || '-'} ${it.model || ''} ${it.year || ''}</h3>
       <div class="hist-card__meta">
         ${it.brand ? `<span class="badge">${escapeHTML(it.brand)}</span>` : ''}
         ${it.model ? `<span class="badge">${escapeHTML(it.model)}</span>` : ''}
         ${it.year ? `<span class="badge">${escapeHTML(it.year)}</span>` : ''}
       </div>
       <div class="hist-card__body">
         <p><b>Relato:</b> ${escapeHTML(it.userText || '-')}</p>
         <p><b>Conclusão da IA:</b> ${escapeHTML(it.aiConclusion || '-')}</p>
       </div>
     `;
     grid.appendChild(card);
  }
}

/* ================== Fetch ================== */
async function fetchHistory(params = {}){
  const qs = new URLSearchParams(params).toString();
  const url = `${API_BASE}${HISTORY_PATH}${qs ? `?${qs}` : ''}`;

  const headers = { Accept: 'application/json' };
  const token = localStorage.getItem('sm_token');
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url, { headers });

  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('application/json')){
    const text = await res.text();
    throw new Error(
      text && text.includes('Cannot GET')
        ? 'A rota /auth/history não existe no servidor. Confirme o caminho no backend.'
        : text || `Erro ${res.status}`
    );
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || `Erro ${res.status}`);
  return data;
}

/* ================== Load ================== */
async function loadHistory(){
  try{
    const params = {};
    const period = selectPeriod?.value || '30';
    const brand  = selectBrand?.value  || '';

    if (period) params.period = period;   // 7/30/90 dias
    if (brand)  params.brand  = brand;

    const data = await fetchHistory(params);
    renderHistory(Array.isArray(data) ? data : (data.items || []));
  } catch (err){
    console.error(err);
    showToast(typeof err?.message === 'string' ? err.message : 'Não foi possível carregar o histórico', 'error');
    renderHistory([]);
  }
}

/* ================== Listeners ================== */
selectBrand ?.addEventListener('change', loadHistory);
selectPeriod?.addEventListener('change', loadHistory);

/* ================== Boot ================== */
document.addEventListener('DOMContentLoaded', loadHistory);
loadHistory();
