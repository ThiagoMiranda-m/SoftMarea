"use strict";

document.addEventListener('DOMContentLoaded', () => {
  /* ===== Seletores de Elementos ===== */
  const $ = (s, el = document) => el.querySelector(s);
  const layout = $('#chatLayout');
  const chatBox = $('#chatBox');
  const btnShop = $('#btnContactShop');
  const composer = $('#composer');
  const input = $('#composerInput');
  const sendBtn = $('#composerSend');
  const confirmationButtonsContainer = $('#confirmationButtons');

  let map, mapReady = false;
  const history = [];
  let vehicleInfo = {}; // Objeto para guardar os dados do carro

  /* ===== UI: Funções de Mensagem ===== */
  function addMsg(text, who = 'bot') {
    const div = document.createElement('div');
    div.className = 'sm-msg ' + who;
    div.textContent = text;
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
    return div;
  }

  function addTyping() {
    const wrap = document.createElement('div');
    wrap.className = 'sm-msg bot';
    wrap.innerHTML = `<span class="sm-typing"><span class="sm-typing__dot"></span><span class="sm-typing__dot"></span><span class="sm-typing__dot"></span></span>`;
    chatBox.appendChild(wrap);
    chatBox.scrollTop = chatBox.scrollHeight;
    return wrap;
  }

  function replaceTyping(el, text) {
    if (!el) return addMsg(text, 'bot');
    el.className = 'sm-msg bot';
    el.textContent = text;
    chatBox.scrollTop = chatBox.scrollHeight;
  }

  /* ===== LÓGICA DE INICIALIZAÇÃO DO CHAT ===== */
  function startChatFlow() {
    const p = new URLSearchParams(location.search);
    vehicleInfo = { brand: p.get('brand'), model: p.get('model'), year: p.get('year') };

    const title = $('#caseTitle');
    const sub = $('#caseSub');
    if (vehicleInfo.brand || vehicleInfo.model || vehicleInfo.year) {
      title.textContent = `Diagnóstico: ${[vehicleInfo.brand, vehicleInfo.model, vehicleInfo.year].filter(Boolean).join(' ')}`;
      sub.textContent = 'Por favor, confirme os dados do veículo abaixo para iniciar.';
    }

    if (vehicleInfo.model && vehicleInfo.year) {
      addMsg(`Olá, vamos começar o seu diágnostico. O seu carro é um ${vehicleInfo.model} de ${vehicleInfo.year}?`);
      showConfirmationButtons();
    } else {
      addMsg('Dados do veículo não encontrados. Por favor, volte e selecione o seu carro.');
    }
  }

  function showConfirmationButtons() {
    confirmationButtonsContainer.innerHTML = `
      <button class="action-btn" id="btnConfirmYes">Sim</button>
      <button class="action-btn action-btn--hollow" id="btnConfirmNo">Não</button>
    `;
    $('#btnConfirmYes').addEventListener('click', handleConfirmYes);
    $('#btnConfirmNo').addEventListener('click', handleConfirmNo);
  }

  function handleConfirmYes() {
    confirmationButtonsContainer.innerHTML = ''; // Limpa os botões
    addMsg("Sim", "user");
    addMsg("Ok, certo! Conte com as suas palavras o que está acontecendo.");
    composer.classList.remove('is-hidden');
    input.focus();
  }

  function handleConfirmNo() {
    confirmationButtonsContainer.innerHTML = '';
    addMsg("Não", "user");
    addMsg("Beleza, volte a seleção de carro e selecione o seu carro novamente!");
  }

  /* ===== Envio para IA ===== */
  async function sendToAI(message) {
    const res = await fetch('http://localhost:3000/auth/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, history, vehicleInfo })
    });
    if (!res.ok) throw new Error(await res.text().catch(() => 'Erro no servidor'));
    const data = await res.json().catch(() => null);
    if (!data || typeof data.reply !== 'string') throw new Error('Resposta inválida do servidor de IA.');
    return data.reply.trim();
  }

  /* ===== Composer (Envio de Mensagem) ===== */
  composer.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    sendBtn.disabled = true;
    addMsg(text, 'user');
    history.push({ role: 'user', content: text });
    input.value = '';
    const typingEl = addTyping();
    try {
      const reply = await sendToAI(text);
      replaceTyping(typingEl, reply);
      history.push({ role: 'assistant', content: reply });
    } catch (err) {
      console.error(err);
      replaceTyping(typingEl, 'Desculpe, ocorreu um erro. Tente novamente.');
    } finally {
      sendBtn.disabled = false;
      input.focus();
    }
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      composer.requestSubmit();
    }
  });
  
  /* ===== Mapa ===== */
  btnShop.addEventListener('click', () => {
    layout.classList.add('show-map');
    if (!mapReady) initMap();
    addMsg('Buscando oficinas próximas no mapa à direita…', 'bot');
  });

  function initMap() {
    mapReady = true;
    const mapEl = document.getElementById('map');
    if (!mapEl) return;

    const mapObj = L.map(mapEl, { zoomControl: true });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap'
    }).addTo(mapObj);

    const fallback = () => {
      const df = [-16.0333, -48.05]; // Localização Padrão: Novo Gama, GO
      mapObj.setView(df, 13);
      addShops(df, mapObj);
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(pos => {
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
  
  function addShops([lat, lng], ref) {
    const pts = [
      [lat + 0.01, lng + 0.01, 'Oficina Centro'],
      [lat - 0.008, lng + 0.014, 'Auto Mecânica Azul'],
      [lat + 0.012, lng - 0.012, 'Garage 24h'],
    ];
    pts.forEach(([y, x, name]) => {
      L.marker([y, x]).addTo(ref).bindPopup(name);
    });
  }

  // Inicia o fluxo do chat ao carregar a página
  startChatFlow();
});