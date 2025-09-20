"use strict";

/* ===== util ===== */
const $  = (s, el=document) => el.querySelector(s);

const layout   = $('#chatLayout');
const chatBox  = $('#chatBox');
const btnShop  = $('#btnContactShop');
const composer = $('#composer');
const input    = $('#composerInput');
const sendBtn  = $('#composerSend');

let map, mapReady = false;
const history = [];

/* ===== UI: mensagens ===== */
function addMsg(text, who='bot'){
  const div = document.createElement('div');
  div.className = 'sm-msg ' + who;
  div.textContent = text;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
  return div;
}

function addTyping(){
  const wrap = document.createElement('div');
  wrap.className = 'sm-msg bot';
  wrap.innerHTML = `
    <span class="sm-typing">
      <span class="sm-typing__dot"></span>
      <span class="sm-typing__dot"></span>
      <span class="sm-typing__dot"></span>
    </span>
  `;
  chatBox.appendChild(wrap);
  chatBox.scrollTop = chatBox.scrollHeight;
  return wrap;
}

function replaceTyping(el, text){
  if (!el) return addMsg(text, 'bot');
  el.className = 'sm-msg bot';
  el.textContent = text;
  chatBox.scrollTop = chatBox.scrollHeight;
}

/* ===== título com brand/model/year via querystring ===== */
(function initCaseTitle(){
  const p = new URLSearchParams(location.search);
  const brand = p.get('brand') || '';
  const model = p.get('model') || '';
  const year  = p.get('year')  || '';
  const title = $('#caseTitle');
  const sub   = $('#caseSub');
  if (brand || model || year){
    title.textContent = `Diagnóstico: ${[brand, model, year].filter(Boolean).join(' ')}`;
    sub.textContent   = 'Relate os sintomas. Vou analisar e propor causas e próximos passos.';
  }
})();

/* ===== Envio para IA ===== */
/**
 * Ajuste este endpoint para o seu backend.
 * Esperado: POST /api/chat  body: { message, history }
 * Resposta: { reply: "texto da IA" }
 */
async function sendToAI(message){
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type':'application/json' },
    body: JSON.stringify({ message, history })
  });
  if (!res.ok){
    const errText = await res.text().catch(()=> 'Erro');
    throw new Error(errText || `HTTP ${res.status}`);
  }
  const data = await res.json().catch(()=> null);
  if (!data || typeof data.reply !== 'string'){
    throw new Error('Resposta inválida do servidor de IA.');
  }
  return data.reply.trim();
}

/* ===== Composer ===== */
composer.addEventListener('submit', async (ev)=>{
  ev.preventDefault();
  const text = input.value.trim();
  if (!text) return;

  sendBtn.disabled = true;

  // mostra msg do usuário
  addMsg(text, 'user');
  history.push({ role:'user', content:text });
  input.value = '';

  // “digitando…”
  const typingEl = addTyping();

  try {
    const reply = await sendToAI(text);
    replaceTyping(typingEl, reply);
    history.push({ role:'assistant', content: reply });
  } catch (err){
    console.error(err);
    replaceTyping(typingEl, 'Desculpe, ocorreu um erro ao consultar a IA. Tente novamente em instantes.');
  } finally {
    sendBtn.disabled = false;
    input.focus();
  }
});

/* Enter envia (Shift+Enter reservar, caso vire textarea no futuro) */
input.addEventListener('keydown', (e)=>{
  if (e.key === 'Enter' && !e.shiftKey){
    e.preventDefault();
    composer.requestSubmit();
  }
});

/* ===== Mapa (mesmo comportamento) ===== */
btnShop.addEventListener('click', ()=>{
  layout.classList.add('show-map');
  if (!mapReady) initMap();
  addMsg('Buscando oficinas próximas no mapa à direita…', 'bot');
});

function initMap(){
  mapReady = true;
  const mapEl = document.getElementById('map');
  if (!mapEl) return;

  const mapObj = L.map(mapEl, { zoomControl: true });
  const tiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap'
  });
  tiles.addTo(mapObj);

  if (navigator.geolocation){
    navigator.geolocation.getCurrentPosition(pos=>{
      const latlng = [pos.coords.latitude, pos.coords.longitude];
      mapObj.setView(latlng, 14);
      L.marker(latlng).addTo(mapObj).bindPopup('Você está aqui');
      addShops(latlng, mapObj);
    }, ()=> fallback());
  } else {
    fallback();
  }

  function fallback(){
    const df = [-23.5505, -46.6333]; // São Paulo
    mapObj.setView(df, 13);
    addShops(df, mapObj);
  }

  // Pontos fake de oficinas próximas
  function addShops([lat, lng], ref){
    const pts = [
      [lat+0.01,  lng+0.01,  'Oficina Centro'],
      [lat-0.008, lng+0.014, 'Auto Mecânica Azul'],
      [lat+0.012, lng-0.012, 'Garage 24h'],
    ];
    pts.forEach(([y,x,name])=>{
      L.marker([y,x]).addTo(ref).bindPopup(name);
    });
  }

  map = mapObj;
}
