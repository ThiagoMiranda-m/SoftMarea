"use strict";

// ================== Variáveis Globais para o Mapa ==================
// Estas variáveis precisam estar no escopo global para que a função de callback do Google Maps funcione corretamente com as outras funções.
let map;
let userLatLng = null;
let currentMarkers = [];
let infoWindow;


// ================== Função de Inicialização do Mapa (Callback do Google) ==================
// Esta função é chamada pela API do Google Maps quando o script termina de carregar.
function initMap() {
  const mapEl = document.getElementById('map');
  if (!mapEl) return;

  const defaultLocation = { lat: -16.0333, lng: -48.05 }; // Localização padrão

  map = new google.maps.Map(mapEl, {
    center: defaultLocation,
    zoom: 5,
    mapId: 'SOFTMAREA_MAP_ID' // Opcional: para customização avançada
  });
  
  infoWindow = new google.maps.InfoWindow();

  const fallback = (error) => {
    if (error) {
        console.warn(`Erro de Geolocalização (código ${error.code}): ${error.message}`);
    }
    showToast('Não foi possível obter sua localização.', 'error');
    userLatLng = defaultLocation;
    map.setCenter(userLatLng);
    map.setZoom(13);
    // Dispara a busca inicial mesmo com a localização padrão
    document.querySelector('.map-filter-btn.active').click();
  };

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        userLatLng = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        map.setCenter(userLatLng);
        map.setZoom(14);
        new google.maps.Marker({
            position: userLatLng,
            map,
            title: "Você está aqui!",
            icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 8,
                fillColor: "#4285F4",
                fillOpacity: 1,
                strokeWeight: 2,
                strokeColor: "#ffffff"
            }
        });
        // Dispara a busca inicial assim que a localização é obtida
        document.querySelector('.map-filter-btn.active').click();
      },
      fallback
    );
  } else {
    fallback();
  }
}

// ================== Funções de Apoio ao Mapa (agora no escopo global) ==================

// Limpa os marcadores antigos do mapa
function clearMarkers() {
  for (let i = 0; i < currentMarkers.length; i++) {
    currentMarkers[i].setMap(null);
  }
  currentMarkers = [];
}

// Formata o conteúdo da janela de informações do marcador
function formatInfoWindowContent(place) {
  const hours = place.opening_hours ? (place.opening_hours.open_now ? '<span style="color:green;">Aberto agora</span>' : '<span style="color:red;">Fechado agora</span>') : 'Horário não informado';
  return `
    <div class="map-popup">
      <strong>${place.name}</strong><br>
      <p style="margin: 4px 0;">${place.formatted_address || ''}</p>
      <p style="margin: 4px 0;">Telefone: ${place.formatted_phone_number || 'não informado'}</p>
      <p style="margin: 4px 0;">Horário: ${hours}</p>
      <p style="margin: 4px 0;">Avaliação: ${place.rating || 'N/A'} ⭐</p>
    </div>
  `;
}

// Busca os locais na API do backend
async function fetchNearbyPlaces(lat, lng, type) {
  document.getElementById('mapLoading')?.classList.remove('is-hidden');
  const token = localStorage.getItem('sm_token');
  try {
    const res = await fetch(`http://localhost:3000/auth/places?lat=${lat}&lng=${lng}&type=${type}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (!res.ok) throw new Error('Falha ao buscar locais');
    const data = await res.json();
    return data.places || [];
  } catch (err) {
    console.error(err);
    showToast('Não foi possível carregar os locais.', 'error');
    return [];
  } finally {
    document.getElementById('mapLoading')?.classList.add('is-hidden');
  }
}

// Atualiza os marcadores no mapa com base no filtro
async function updateMapMarkers(type) {
  if (!userLatLng || !map) return;
  
  clearMarkers();
  
  const places = await fetchNearbyPlaces(userLatLng.lat, userLatLng.lng, type);
  const bounds = new google.maps.LatLngBounds();

  places.forEach(place => {
    if (place.geometry && place.geometry.location) {
      const marker = new google.maps.Marker({
        position: place.geometry.location,
        map: map,
        title: place.name,
      });

      marker.addListener('click', () => {
        infoWindow.setContent(formatInfoWindowContent(place));
        infoWindow.open(map, marker);
      });

      currentMarkers.push(marker);
      bounds.extend(marker.getPosition());
    }
  });
  
  if (currentMarkers.length > 0) {
    // Inclui a posição do usuário no zoom para garantir que ele esteja visível
    bounds.extend(userLatLng);
    map.fitBounds(bounds);
  } else {
    showToast('Nenhum local encontrado no raio de 5km.', 'success');
    map.setCenter(userLatLng);
    map.setZoom(14);
  }
}


// ================== Código Principal da Página (executado quando o DOM está pronto) ==================
document.addEventListener('DOMContentLoaded', () => {
  /* ================== Helpers / Seletor ================== */
  const $  = (s, el=document) => el.querySelector(s);
  const $$ = (s, el=document) => Array.from(el.querySelectorAll(s));

  /* ================== Toast ================== */
  // A função showToast agora está no escopo global para ser acessível pelo fallback do mapa
  window.toast = $('#toast');
  window.toastText = $('#toastText');
  window.toastTimer = null;

  function ensureToast(){
    if (!window.toast) {
      window.toast = document.createElement('div');
      window.toast.id = 'toast';
      window.toast.className = 'toast';
      window.toastText = document.createElement('span');
      window.toastText.id = 'toastText';
      window.toast.appendChild(window.toastText);
      document.body.appendChild(window.toast);
    }
    if (!window.toastText) {
      window.toastText = document.createElement('span');
      window.toastText.id = 'toastText';
      window.toast.appendChild(window.toastText);
    }
  }
  window.showToast = function(message, type='success', ms=2600){
    ensureToast();
    window.toast.classList.remove('toast--success','toast--error','is-open');
    window.toastText.textContent = message;
    window.toast.classList.add(type === 'error' ? 'toast--error' : 'toast--success');
    requestAnimationFrame(()=> window.toast.classList.add('is-open'));
    clearTimeout(window.toastTimer);
    window.toastTimer = setTimeout(()=> window.toast.classList.remove('is-open'), ms);
  }


  /* ================= CONFIGURAÇÃO DA API E FIREBASE ================= */
  const API_URL = "http://localhost:3000/auth";

  /* ================== Header / Auth UI ================== */
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
  function setLoggedIn(v, origin='login'){
    if (!v){
      localStorage.removeItem('sm_token');
      updateAuthUI(false);
      userMenu?.classList.remove('is-open');
      btnMenu ?.setAttribute('aria-expanded','false');
      return;
    }
    updateAuthUI(true);
    closeAllAuthModals();
    const msg = origin === 'register' ? 'Registrado com sucesso' : 'Conectado com sucesso';
    showToast(msg, 'success');
  }
  window.setLoggedIn = setLoggedIn;

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
    btnMenu?.setAttribute('aria-expanded','false');
    window.location.assign('./Historico.html');
  });
  menuSair?.addEventListener('click', ()=>{ userMenu?.classList.remove('is-open'); setLoggedIn(false); });

  /* ================== Chat ================== */
  const layout = $('#chatLayout');
  const chatBox = $('#chatBox');
  const btnShop = $('#btnContactShop');
  const composer = $('#composer');
  const input = $('#composerInput');
  const sendBtn = $('#composerSend');
  const btnFinish = $('#btnFinish'); // novo botão
  const confirmationButtonsContainer = $('#confirmationButtons');

  const history = [];
  let vehicleInfo = {}; // {brand, model, year}

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
    wrap.innerHTML = `<span class="sm-typing"><span class="sm-typing__dot"></span><span class="sm-typing__dot"></span><span class="sm-typing__dot"></span></span>`;
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
  
  // Função global para ser chamada pelo fallback do mapa
  window.addMsg = addMsg;

  function startChatFlow(){
    const p = new URLSearchParams(location.search);
    vehicleInfo = { brand: p.get('brand'), model: p.get('model'), year: p.get('year') };

    const title = $('#caseTitle');
    const sub   = $('#caseSub');
    if (vehicleInfo.brand || vehicleInfo.model || vehicleInfo.year){
      title.textContent = `Diagnóstico: ${[vehicleInfo.brand, vehicleInfo.model, vehicleInfo.year].filter(Boolean).join(' ')}`;
      sub.textContent   = 'Por favor, confirme os dados do veículo abaixo para iniciar.';
    }

    if (vehicleInfo.model && vehicleInfo.year){
      addMsg(`Olá, vamos começar o seu diagnóstico. O seu carro é um ${vehicleInfo.model} de ${vehicleInfo.year}?`);
      showConfirmationButtons();
    } else {
      addMsg('Dados do veículo não encontrados. Por favor, volte e selecione o seu carro.');
    }
  }

  function showConfirmationButtons(){
    confirmationButtonsContainer.innerHTML = `
      <button class="action-btn" id="btnConfirmYes">Sim</button>
      <button class="action-btn action-btn--hollow" id="btnConfirmNo">Não</button>
    `;
    $('#btnConfirmYes')?.addEventListener('click', handleConfirmYes);
    $('#btnConfirmNo') ?.addEventListener('click', handleConfirmNo);
  }
  function handleConfirmYes(){
    confirmationButtonsContainer.innerHTML = '';
    addMsg("Sim", "user");
    addMsg("Ok, certo! Conte com as suas palavras o que está acontecendo.");
    composer.classList.remove('is-hidden');
    input.focus();
    btnFinish?.classList.remove('is-hidden'); // mostra o botão Diagnóstico Concluído
  }
  function handleConfirmNo(){
    confirmationButtonsContainer.innerHTML = '';
    addMsg("Não", "user");
    addMsg("Beleza, volte à seleção de carro e selecione o seu carro novamente!");
  }

  // Envio para IA
  async function sendToAI(message){
    const res = await fetch('http://localhost:3000/auth/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, history, vehicleInfo })
    });
    if (!res.ok) throw new Error(await res.text().catch(()=> 'Erro no servidor'));
    const data = await res.json().catch(()=> null);
    if (!data || typeof data.reply !== 'string') throw new Error('Resposta inválida do servidor de IA.');
    return data.reply.trim();
  }

  composer?.addEventListener('submit', async (ev)=>{
    ev.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    sendBtn.disabled = true;

    addMsg(text, 'user');
    history.push({ role:'user', content:text });
    input.value = '';

    const typingEl = addTyping();
    try{
      const reply = await sendToAI(text);
      replaceTyping(typingEl, reply);
      history.push({ role:'assistant', content: reply });
    } catch (err){
      console.error(err);
      replaceTyping(typingEl, 'Desculpe, ocorreu um erro. Tente novamente.');
    } finally {
      sendBtn.disabled = false;
      input.focus();
    }
  });
  input?.addEventListener('keydown', (e)=>{
    if (e.key === 'Enter' && !e.shiftKey){
      e.preventDefault();
      composer.requestSubmit();
    }
  });

    /* ================== Event Listeners do Mapa ================== */
    
    const filterButtons = $$('.map-filter-btn');
    
    btnShop.addEventListener('click', () => {
        if (!isLoggedIn()) {
          showToast('Faça login para buscar locais próximos.', 'error');
          openModal($('#loginModal'));
          return;
        }
        $('#chatLayout').classList.add('show-map');
        addMsg('Buscando oficinas próximas no mapa à direita…', 'bot');
    });

  function initMap(){
    mapReady = true;
    const mapEl = document.getElementById('map');
    if (!mapEl) return;

    const mapObj = L.map(mapEl, { zoomControl: true });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap'
    }).addTo(mapObj);

    const fallback = ()=>{
      const df = [-16.0333, -48.05];
      mapObj.setView(df, 13);
      addShops(df, mapObj);
    };

    if (navigator.geolocation){
      navigator.geolocation.getCurrentPosition(pos=>{
        const latlng = [pos.coords.latitude, pos.coords.longitude];
        mapObj.setView(latlng, 14);
        L.marker(latlng).addTo(mapObj).bindPopup('Você está aqui');
        addShops(latlng, mapObj);
      }, fallback);
    } else {
      fallback();
    }
    map = mapObj;
  }
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

  /* ================== Boot ================== */
  startChatFlow();

  /* ===== Botão "Diagnóstico Concluído" (salva histórico e redireciona) ===== */
  (function(){
    const btnFinish = document.getElementById('btnFinish');
    if (!btnFinish) return;

    function extractSummary(){
      const firstUser = (history.find(m => m.role === 'user') || {}).content || '';
      const lastAI = ([...history].reverse().find(m => m.role === 'assistant') || {}).content || '';
      return { userText: (firstUser || '').trim(), aiConclusion: (lastAI || '').trim() };
    }

    async function postHistory(payload){
      const headers = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
      const token = localStorage.getItem('sm_token');
      await fetch(API_HISTORY, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      const ct = res.headers.get('content-type') || '';
      if (!ct.includes('application/json')){
        throw new Error(await res.text());
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `Erro ${res.status}`);
      return data;
    }

    btnFinish.addEventListener('click', async ()=>{
      if (!isLoggedIn()){
        showToast('Faça login para salvar no histórico.', 'error', 3200);
        const lm = document.getElementById('loginModal');
        if (lm && typeof openModal === 'function') openModal(lm);
        return;
      }

      const { userText, aiConclusion } = extractSummary();
      if (!vehicleInfo?.model || !vehicleInfo?.year){
        showToast('Dados do veículo ausentes. Volte e selecione o carro.', 'error');
        return;
      }
      if (!userText || !aiConclusion){
        showToast('Converse com a IA (relato e resposta) antes de concluir.', 'error', 3600);
        return;
      }

      btnFinish.disabled = true;
      const payload = {
        brand: vehicleInfo.brand || '',
        model: vehicleInfo.model || '',
        year:  vehicleInfo.year  || '',
        userText,
        aiConclusion,
        createdAt: new Date().toISOString()
      };

      try{
        await postHistory(payload);
        showToast('Diagnóstico salvo no histórico.', 'success', 2000);
        window.location.assign('../HTML/Home.html');
      }catch(err){
        console.error(err);
        showToast(err?.message || 'Erro ao salvar diagnóstico.', 'error', 3600);
      }finally{
        btnFinish.disabled = false;
      }
    });
  })();
});