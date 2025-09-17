"use strict";

document.addEventListener('DOMContentLoaded', () => {
  
  /* Helpers */
  const $  = (s, el=document) => el.querySelector(s);
  const $$ = (s, el=document) => Array.from(el.querySelectorAll(s));

  /* ========= Toast / Notificação ========= */
  const toast = $('#toast');
  const toastText = $('#toastText');
  let toastTimer = null;

  function showToast(message, type = 'success', ms = 2600){
    if (!toast || !toastText) return;
    toast.classList.remove('toast--success','toast--error','is-open');
    toastText.textContent = message;
    toast.classList.add(type === 'error' ? 'toast--error' : 'toast--success');
    requestAnimationFrame(()=> toast.classList.add('is-open'));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(()=> toast.classList.remove('is-open'), ms);
  }
  window.showToast = showToast;

  /* ================= CONFIGURAÇÃO DA API E FIREBASE ================= */
  const API_URL = "http://localhost:3000/auth";
  const firebaseConfig = {
    apiKey: "AIzaSyCD7RMisuimpkztH2N-eFMSB4XuuLSPaNs",
    authDomain: "softmarea-7eba0.firebaseapp.com",
    projectId: "softmarea-7eba0",
    storageBucket: "softmarea-7eba0.appspot.com",
    messagingSenderId: "44251087941",
    appId: "1:44251087941:web:d5444c12c8f251731ecf2c"
  };
  firebase.initializeApp(firebaseConfig);
  const auth = firebase.auth();

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
  const phoneAuthModal      = $('#phoneAuthModal');

  const btnOpenLogin        = $('#btnLogin');
  const btnOpenRegister     = $('#btnRegistro');
  const btnForgotPassword   = $('#btnForgotPassword');
  const btnsOpenPhoneLogin  = $$('.js-open-phone-login');

  let userEmailForVerification = '';

  function openModal(modal) {
    if(!modal) return;
    modal.setAttribute('aria-hidden', 'false');
    modal.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }
  function closeModal(modal) {
    if(!modal) return;
    modal.setAttribute('aria-hidden', 'true');
    modal.classList.remove('is-open');
    document.body.style.overflow = '';
  }

  window.closeAllAuthModals = function(){
    closeModal(loginModal);
    closeModal(registerModal);
    closeModal(verifyCodeModal);
    closeModal(forgotPasswordModal);
    closeModal(phoneAuthModal);
  };

  btnOpenLogin?.addEventListener('click', ()=> openModal(loginModal));
  btnOpenRegister?.addEventListener('click', ()=> openModal(registerModal));
  btnForgotPassword?.addEventListener('click', e => {
    e.preventDefault();
    closeModal(loginModal);
    openModal(forgotPasswordModal);
  });
  btnsOpenPhoneLogin.forEach(btn => {
    btn.addEventListener('click', () => {
      closeAllAuthModals();
      openModal(phoneAuthModal);
      formSendCode.classList.remove('is-hidden');
      formVerifyCode.classList.add('is-hidden');
      setupRecaptcha();
    });
  });

  [loginModal, registerModal, verifyCodeModal, forgotPasswordModal, phoneAuthModal].forEach(modal=>{
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
  const menuSair      = $('#menuSair');
  const btnLoginHdr   = $('#btnLogin');
  const btnRegistro   = $('#btnRegistro');

  function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
  }
  function isLoggedIn(){
    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get('token');
    if (urlToken) {
      localStorage.setItem('sm_token', urlToken);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    const cookieToken = getCookie('sm_token');
    if (cookieToken) {
      localStorage.setItem('sm_token', cookieToken);
      document.cookie = 'sm_token=; Max-Age=-99999999; path=/;';
    }
    return !!localStorage.getItem('sm_token');
  }

  function setLoggedIn(v, origin = 'login') {
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

  function updateAuthUI(logged) {
    btnRegistro?.classList.toggle('is-hidden', logged);
    btnLoginHdr?.classList.toggle('is-hidden', logged);
    btnMenu?.classList.toggle('is-hidden', !logged);
    if (!logged) {
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
  menuSair?.addEventListener('click', ()=>{
    userMenu?.classList.remove('is-open');
    setLoggedIn(false);
  });

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

  /* ================= FORM: LOGIN COM TELEFONE (COM LOGS DE DEPURAÇÃO) ================= */
/* ================= FORM: LOGIN COM TELEFONE (TESTE COM EVENTO DE CLIQUE) ================= */
  const formSendCode = $('#form-phone-send-code');
  const formVerifyCode = $('#form-phone-verify-code');
  const btnSendPhoneCode = $('#btn-send-phone-code');

  console.log('Verificando elementos para o teste de clique...');
  console.log('Formulário encontrado:', formSendCode);
  console.log('Botão encontrado:', btnSendPhoneCode);

  if (btnSendPhoneCode) {
    btnSendPhoneCode.addEventListener('click', e => {
      // Previne o comportamento padrão do botão, que é submeter o formulário
      e.preventDefault(); 
      
      console.log('✅ O CLIQUE NO BOTÃO FOI DETECTADO!');

      const phoneNumber = new FormData(formSendCode).get('phone');
      const appVerifier = window.recaptchaVerifier;

      console.log('Número de telefone:', phoneNumber);

      if (!appVerifier) {
        console.error('O appVerifier (reCAPTCHA) não existe. Tentando configurar novamente...');
        setupRecaptcha(); // Tenta reconfigurar caso não exista
        showToast('Ocorreu um erro, tente novamente.', 'error');
        return;
      }

      auth.signInWithPhoneNumber(phoneNumber, appVerifier)
        .then(confirmationResult => {
          console.log('SUCESSO: A Promise foi resolvida!', confirmationResult);
          window.confirmationResult = confirmationResult;
          
          formSendCode.classList.add('is-hidden');
          formVerifyCode.classList.remove('is-hidden');
          showToast('Código SMS enviado!', 'success');
        })
        .catch(err => {
          console.error('FALHA: A Promise foi rejeitada!', err);
          showToast(`Erro: ${err.message}`, 'error');
        });
    });
  } else {
    console.error('Não foi possível anexar o event listener porque o botão btnSendPhoneCode não foi encontrado.');
  }

  function setupRecaptcha() {
    console.log('Tentando configurar o reCAPTCHA...');
    if (!btnSendPhoneCode) return;
    
    // Evita recriar o verificador se ele já existir e estiver visível
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier('btn-send-phone-code', {
        'size': 'invisible',
        'callback': (response) => {
          console.log('reCAPTCHA resolvido!');
        }
      });
      window.recaptchaVerifier.render();
    }
  }

  // ... (o código de 'formVerifyCode' continua o mesmo) ...
  formVerifyCode?.addEventListener('submit', async e => {
    e.preventDefault();
    const code = new FormData(formVerifyCode).get('code');
    
    if (!window.confirmationResult) {
      showToast('Erro: A confirmação expirou. Tente novamente.', 'error');
      return;
    }

    try {
      const result = await window.confirmationResult.confirm(code);
      const firebaseUser = result.user;
      const firebaseToken = await firebaseUser.getIdToken();
      
      const res = await fetch(`${API_URL}/phone-signin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firebaseToken })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      localStorage.setItem('sm_token', data.token);
      setLoggedIn(true, 'login');
    } catch (err) {
      showToast(`Erro: ${err.message}`, 'error');
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

  // =================== INICIALIZAÇÃO FINAL ===================
  const activePanel = $('.panel.active');
  if (activePanel){
    fillBrand(activePanel);
    populateSelectors(activePanel);
    playAutoplayVideo(activePanel);
  }
  if (isLoggedIn()) {
    setLoggedIn(true, 'login');
  } else {
    updateAuthUI(false);
  }
});