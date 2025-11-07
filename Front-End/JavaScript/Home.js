"use strict";

document.addEventListener('DOMContentLoaded', () => {
  /* Helpers */
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));

  /* ========= Toast / Notificação ========= */
  let toast = document.getElementById('toast');
  let toastText = document.getElementById('toastText');
  let toastTimer = null;

  function ensureToast() {
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

  function showToast(message, type = 'success', ms = 2600) {
    ensureToast();
    toast.classList.remove('toast--success', 'toast--error', 'is-open');
    toastText.textContent = message;
    toast.classList.add(type === 'error' ? 'toast--error' : 'toast--success');
    requestAnimationFrame(() => toast.classList.add('is-open'));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('is-open'), ms);
  }
  window.showToast = showToast;

  const menuHistorico = document.getElementById('menuHistorico');
menuHistorico?.addEventListener('click', () => {
  // fecha o menu (se existir popover) e redireciona:
  document.getElementById('userMenu')?.classList.remove('is-open');
  document.getElementById('btnMenu')?.setAttribute('aria-expanded', 'false');
  window.location.assign('./Historico.html');
});

  /* ================= CONFIGURAÇÃO DA API E FIREBASE ================= */
  const API_URL = "http://localhost:3000/auth";
const firebaseConfig = {
  apiKey: "AIzaSyCD7RMisuimpkztH2N-eFMSB4XuuLSPaNs",
  authDomain: "softmarea-7eba0.firebaseapp.com",
  projectId: "softmarea-7eba0",
  storageBucket: "softmarea-7eba0.firebasestorage.app",
  messagingSenderId: "44251087941",
  appId: "1:44251087941:web:d5444c12c8f251731ecf2c",
  measurementId: "G-GR082GLZY0"
};
  firebase.initializeApp(firebaseConfig);
  const auth = firebase.auth();

  /* =================== DADOS: MODELOS / ANOS =================== */
  const CAR_DATA = {
    Ford: ["Ka", "Fiesta", "Focus", "Fusion", "EcoSport", "Ranger", "Territory", "Maverick"],
    Chevrolet: ["Onix", "Onix Plus", "Prisma", "Cruze", "Tracker", "S10", "Montana", "Spin", "Trailblazer", "Equinox", "Captiva", "Camaro"],
    Toyota: ["Etios", "Yaris", "Corolla", "Corolla Cross", "Hilux", "SW4", "RAV4"],
    Honda: ["Fit", "City", "Civic", "HR-V", "WR-V", "CR-V"],
    Volkswagen: ["Gol", "Polo", "Virtus", "T-Cross", "Nivus", "Saveiro", "Jetta"],
    Fiat: ["Mobi", "Argo", "Cronos", "Pulse", "Fastback", "Toro", "Strada"]
  };

  function generateYears(from = 1995, to = (new Date()).getFullYear()) {
    const r = [];
    for (let y = to; y >= from; y--) r.push(String(y));
    return r;
  }
  const YEARS = generateYears(1995);

  /* ================= PANORAMA + LOGOS ================= */
  const panorama = $('#panorama');

  function pauseAllVideos(root = document) {
    $$('.panel__media video', root).forEach(v => {
      try {
        v.pause();
      } catch {}
    });
  }

  function playAutoplayVideo(panel) {
    const v = $('.panel__media video[autoplay]', panel);
    if (!v) return;
    try {
      v.muted = true;
      v.play().catch(() => {});
    } catch {}
  }

  function fillBrand(panel) {
    const brand = panel?.dataset?.brand || '';
    const el = $('.brand-input', panel);
    if (!el || !brand) return;
    el.value = brand;
    el.classList.add('filled');
  }

  function populateSelectors(panel) {
    if (!panel) return;
    const brand = panel?.dataset?.brand || '';
    const modelEl = $('.model-select', panel);
    const yearEl = $('.year-select', panel);

    if (modelEl) {
      modelEl.innerHTML = '';
      const ph = new Option('Modelo', '');
      ph.disabled = true;
      ph.selected = true;
      modelEl.appendChild(ph);
      (CAR_DATA[brand] || []).forEach(m => modelEl.appendChild(new Option(m, m)));
    }
    if (yearEl) {
      yearEl.innerHTML = '';
      const ph = new Option('Ano', '');
      ph.disabled = true;
      ph.selected = true;
      yearEl.appendChild(ph);
      YEARS.forEach(y => yearEl.appendChild(new Option(y, y)));
    }
  }

  function activatePanel(panel) {
    if (!panel) return;
    $$('.panel.active', panorama).forEach(p => p.classList.remove('active'));
    panel.classList.add('active');
    pauseAllVideos(panorama);
    playAutoplayVideo(panel);
    fillBrand(panel);
    populateSelectors(panel);
    try {
      panel.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest'
      });
    } catch {}
  }

  /* ===== Redirecionamento para o Chat ===== */
  const CHAT_PAGE_PATH = './ChatBot.html';

  function buildChatURL(brand, model, year) {
    const url = new URL(CHAT_PAGE_PATH, window.location.href);
    url.search = new URLSearchParams({
      brand,
      model,
      year
    }).toString();
    return url.toString();
  }

  function handleDiagnosticar(panel) {
    const brand = panel?.dataset?.brand || '';
    const model = $('.model-select', panel)?.value || '';
    const year = $('.year-select', panel)?.value || '';
    if (!model || !year) {
      showToast('Escolha o modelo e o ano.', 'error');
      return;
    }
    window.location.assign(buildChatURL(brand, model, year));
  }

  panorama?.addEventListener('click', (ev) => {
    const cta = ev.target.closest('button.cta');
    if (cta) {
      handleDiagnosticar(cta.closest('.panel'));
      return;
    }
    const logo = ev.target.closest('.logo-btn');
    if (logo) {
      activatePanel(logo.closest('.panel'));
    }
  });

  /* ================= MODAIS E AUTENTICAÇÃO ================= */
  const loginModal = $('#loginModal');
  const registerModal = $('#registerModal');
  const verifyCodeModal = $('#verifyCodeModal');
  const forgotPasswordModal = $('#forgotPasswordModal');
  const phoneAuthModal = $('#phoneAuthModal');
  const btnOpenLogin = $('#btnLogin');
  const btnOpenRegister = $('#btnRegistro');
  const btnForgotPassword = $('#btnForgotPassword');
  const btnsOpenPhoneLogin = $$('.js-open-phone-login'); // <-- CORREÇÃO BUG 2
  const btnMenu = $('#btnMenu');
  const userMenu = $('#userMenu');
  const menuSair = $('#menuSair');
  const btnLoginHdr = $('#btnLogin');
  const btnRegistro = $('#btnRegistro');

  let userEmailForVerification = '';

  function openModal(modal) {
    if (!modal) return;
    modal.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }

  function closeModal(modal) {
    if (!modal) return;
    modal.classList.remove('is-open');
    document.body.style.overflow = '';
  }

  window.closeAllAuthModals = function() {
    closeModal(loginModal);
    closeModal(registerModal);
    closeModal(verifyCodeModal);
    closeModal(forgotPasswordModal);
    closeModal(phoneAuthModal);
  };

  btnOpenLogin?.addEventListener('click', () => openModal(loginModal));
  btnOpenRegister?.addEventListener('click', () => openModal(registerModal));
  btnForgotPassword?.addEventListener('click', e => {
    e.preventDefault();
    closeModal(loginModal);
    openModal(forgotPasswordModal);
  });

  // ***** INÍCIO DA CORREÇÃO PARA O BUG 2 *****
  btnsOpenPhoneLogin.forEach(btn => {
    btn.addEventListener('click', () => {
      closeAllAuthModals();
      openModal(phoneAuthModal);
      $('#form-phone-send-code').classList.remove('is-hidden');
      $('#form-phone-verify-code').classList.add('is-hidden');
      setupRecaptcha(); // Função de setup do reCAPTCHA
    });
  });
  // ***** FIM DA CORREÇÃO PARA O BUG 2 *****

  [loginModal, registerModal, verifyCodeModal, forgotPasswordModal, phoneAuthModal].forEach(modal => {
    modal?.addEventListener('click', (e) => {
      if (e.target.matches('[data-close], .modal__backdrop')) closeModal(modal);
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const open = $('.modal.is-open');
      if (open) closeModal(open);
    }
  });

  function isLoggedIn() {
    return !!localStorage.getItem('sm_token');
  }

  function setLoggedIn(v, origin = 'login') {
    if (!v) {
      localStorage.removeItem('sm_token');
      updateAuthUI(false);
      return;
    }
    updateAuthUI(true);
    closeAllAuthModals();
    const msg = origin === 'register' ? 'Registrado com sucesso' : 'Conectado com sucesso';
    showToast(msg, 'success');
  }
  window.setLoggedIn = setLoggedIn;

  function updateAuthUI(logged) {
    btnRegistro?.classList.toggle('is-hidden', logged);
    btnLoginHdr?.classList.toggle('is-hidden', logged);
    btnMenu?.classList.toggle('is-hidden', !logged);
    if (!logged) {
      userMenu?.classList.remove('is-open');
      btnMenu?.setAttribute('aria-expanded', 'false');
    }
  }

  btnMenu?.addEventListener('click', (e) => {
    const open = userMenu.classList.toggle('is-open');
    btnMenu.setAttribute('aria-expanded', String(open));
    e.stopPropagation();
  });

  document.addEventListener('click', (e) => {
    if (!userMenu?.classList.contains('is-open')) return;
    if (!e.target.closest('#userMenu, #btnMenu')) {
      userMenu.classList.remove('is-open');
      btnMenu?.setAttribute('aria-expanded', 'false');
    }
  });

  menuSair?.addEventListener('click', () => {
    userMenu?.classList.remove('is-open');
    setLoggedIn(false);
  });

  /* Formulários de Autenticação */

// Helper para alternar o estado do botão
const toggleButtonState = (form, isDisabled, text) => {
  const submitButton = form.querySelector('button[type="submit"]');
  if (submitButton) {
    submitButton.disabled = isDisabled;
    submitButton.textContent = text;
  }
};

// Login
$('#form-login')?.addEventListener('submit', async e => {
  e.preventDefault();
  const form = e.target;
  toggleButtonState(form, true, 'Entrando...');

  const formData = new FormData(form);
  const email = formData.get('email');
  const password = formData.get('password');

  try {
    const res = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    
    if (!res.ok) {
      if (res.status === 403 && data.error.includes('verifique seu e-mail')) {
        userEmailForVerification = email;
        closeModal(loginModal);
        openModal(verifyCodeModal);
        showToast('Seu e-mail não foi verificado. Por favor, insira o código.', 'error', 4000);
        return;
      }
      throw new Error(data.error || `Erro ${res.status}`);
    }

    localStorage.setItem('sm_token', data.token);
    setLoggedIn(true, 'login');

  } catch (err) {
    console.error(err);
    showToast(err.message || 'Erro ao fazer login.', 'error');
  } finally {
    toggleButtonState(form, false, 'Entrar');
  }
});

// Registro
$('#form-register')?.addEventListener('submit', async e => {
  e.preventDefault();
  const form = e.target;
  toggleButtonState(form, true, 'Registrando...');
  
  const formData = new FormData(form);
  const name = formData.get('name');
  const email = formData.get('email');
  const password = formData.get('password');

  try {
    const res = await fetch(`${API_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `Erro ${res.status}`);

    // Sucesso: armazena email para a próxima etapa
    userEmailForVerification = email;
    closeModal(registerModal);
    openModal(verifyCodeModal);
    showToast(data.message || 'Código de verificação enviado.', 'success');

  } catch (err) {
    console.error(err);
    showToast(err.message || 'Erro ao registrar.', 'error');
  } finally {
    toggleButtonState(form, false, 'Criar conta');
  }
});

// Verificação de Código
$('#form-verify-code')?.addEventListener('submit', async e => {
  e.preventDefault();
  const form = e.target;
  toggleButtonState(form, true, 'Verificando...');

  if (!userEmailForVerification) {
     showToast('Erro: O email de registro não foi encontrado. Tente registrar novamente.', 'error');
     toggleButtonState(form, false, 'Verificar e Concluir');
     return;
  }
  
  const code = new FormData(form).get('code');
  const email = userEmailForVerification; // Usa o email armazenado

  try {
    const res = await fetch(`${API_URL}/verify-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `Erro ${res.status}`);

    localStorage.setItem('sm_token', data.token);
    userEmailForVerification = ''; // Limpa o email
    setLoggedIn(true, 'register'); // Loga e mostra toast de sucesso no registro

  } catch (err) {
    console.error(err);
    showToast(err.message || 'Erro ao verificar código.', 'error');
  } finally {
    toggleButtonState(form, false, 'Verificar e Concluir');
  }
});

// Esqueci a Senha
$('#form-forgot-password')?.addEventListener('submit', async e => {
  e.preventDefault();
  const form = e.target;
  toggleButtonState(form, true, 'Enviando...');

  const email = new FormData(form).get('email');

  try {
    const res = await fetch(`${API_URL}/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `Erro ${res.status}`);

    showToast('Link de redefinição enviado com sucesso (se o e-mail existir).', 'success', 5000);
    closeModal(forgotPasswordModal);

  } catch (err) {
    console.error(err);
    showToast(err.message || 'Erro ao enviar link.', 'error');
  } finally {
    toggleButtonState(form, false, 'Enviar Link');
  }
});


  /* ===== LÓGICA DE LOGIN COM TELEFONE ===== */
  const formSendCode = $('#form-phone-send-code');
  const formVerifyCode = $('#form-phone-verify-code');
  //const btnSendPhoneCode = $('#btn-send-phone-code');//

function setupRecaptcha() {
    // 1. Destrói o verifier ANTERIOR, se ele existir na memória
    if (window.recaptchaVerifier && typeof window.recaptchaVerifier.clear === 'function') {
      window.recaptchaVerifier.clear();
      console.log("Verifier anterior limpo.");
    }

    // 2. Encontra e limpa o container do DOM
    const recaptchaContainer = $('#recaptcha-container');
    if (!recaptchaContainer) {
      console.error('Container do reCAPTCHA não encontrado.');
      return;
    }
    recaptchaContainer.innerHTML = ''; 

    // 3. Cria o NOVO verifier no container limpo
    try {
      window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier(recaptchaContainer, { 
        'size': 'invisible',
        'callback': (response) => {
          // Este callback é chamado quando o reCAPTCHA é resolvido
          // O signInWithPhoneNumber continua a partir daqui
          console.log("reCAPTCHA resolvido, enviando SMS...");
        }
      });
      
      // 4. IMPORTANTE: NÃO chame .render() aqui.
      // O .render() será acionado automaticamente pelo
      // signInWithPhoneNumber quando o usuário clicar no botão "Enviar Código".
      console.log("Novo reCAPTCHA verifier pronto.");
      
    } catch (err) {
      console.error("Erro ao criar RecaptchaVerifier:", err);
      showToast('Erro ao iniciar reCAPTCHA. Tente novamente.', 'error');
    }
  }

  formSendCode?.addEventListener('submit', async (e) => { // Mudado para 'submit'
      e.preventDefault();
      
      const phoneNumber = new FormData(formSendCode).get('phone');
      const appVerifier = window.recaptchaVerifier;

      if (!appVerifier) {
          showToast('reCAPTCHA não inicializado. Tente fechar e abrir o modal.', 'error');
          return;
      }
      
      const submitButton = $('#btn-send-phone-code');
      if(submitButton) submitButton.disabled = true;

      auth.signInWithPhoneNumber(phoneNumber, appVerifier)
        .then(confirmationResult => {
          window.confirmationResult = confirmationResult;
          formSendCode.classList.add('is-hidden');
          formVerifyCode.classList.remove('is-hidden');
          showToast('Código SMS enviado!', 'success');
        })
        .catch(err => {
          // Se falhar (ex: número inválido, reCAPTCHA falhou),
          // limpamos o verifier e preparamos um novo para a próxima tentativa.
          if (window.recaptchaVerifier && typeof window.recaptchaVerifier.clear === 'function') {
              window.recaptchaVerifier.clear();
          }
          setupRecaptcha(); // Prepara um novo verifier
          
          showToast(`Erro: ${err.message}`, 'error');
        })
        .finally(() => {
           // Reativa o botão
           if(submitButton) submitButton.disabled = false;
        });
  });

  formVerifyCode?.addEventListener('submit', async e => {
// ... (O restante desta função permanece exatamente igual)
    e.preventDefault();
    const submitButton = e.target.querySelector('button[type="submit"]');
    submitButton.disabled = true;

    const code = new FormData(formVerifyCode).get('code');
    if (!window.confirmationResult) {
      showToast('A confirmação expirou. Por favor, tente novamente.', 'error');
      submitButton.disabled = false;
      return;
    }

    try {
      // 1. Confirma o código com o Firebase
      const result = await window.confirmationResult.confirm(code);
      const firebaseUser = result.user;
      
      // 2. Pega o token de ID do Firebase
      const firebaseToken = await firebaseUser.getIdToken();
      
      // 3. Envia o token para o seu back-end para trocar por um token da sua aplicação
      const res = await fetch(`${API_URL}/phone-signin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firebaseToken })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // 4. Salva o token da sua aplicação e finaliza o login
      localStorage.setItem('sm_token', data.token);
      setLoggedIn(true, 'login'); 
      closeModal(phoneAuthModal);

    } catch (err) {
      showToast(`Erro: ${err.message}`, 'error');
    } finally {
      submitButton.disabled = false;
    }
  });
  

  /* ================= INICIALIZAÇÃO ================= */
  const activePanel = $('.panel.active');
  if (activePanel) {
    fillBrand(activePanel);
    populateSelectors(activePanel);
    playAutoplayVideo(activePanel);
  }

  // ***** INÍCIO DA CORREÇÃO PARA O BUG 1 *****
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  if (token) {
    localStorage.setItem('sm_token', token);
    // Limpa a URL para não mostrar o token
    window.history.replaceState({}, document.title, window.location.pathname);
  }
  // ***** FIM DA CORREÇÃO PARA O BUG 1 *****

  // Atualiza a UI com base no token (do localStorage ou da URL)
  updateAuthUI(isLoggedIn());
});