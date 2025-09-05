// auth.js  (ESM)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut,
  signInWithPopup,
  GoogleAuthProvider,
  FacebookAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// 1) Cole aqui as credenciais do seu projeto Firebase
const firebaseConfig = {
  apiKey: "SUA_API_KEY",
  authDomain: "seu-projeto.firebaseapp.com",
  projectId: "seu-projeto",
  appId: "SUA_APP_ID",
  // ... (os outros campos que o console te dá)
};

// 2) Inicializa
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
auth.languageCode = "pt_BR";

// ==== Helpers (UI)
const $ = (sel) => document.querySelector(sel);
const closeModal = () => window.closeModal?.(); // definida no Home.js
const setLoggedIn = (v) => window.setLoggedIn?.(v); // definida no Home.js

function showError(err){
  console.error(err);
  alert(err?.message || "Erro ao autenticar.");
}

// ==== Email / senha
$("#form-login")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = e.target;
  try{
    await signInWithEmailAndPassword(auth, f.email.value, f.password.value);
    closeModal();
  }catch(err){ showError(err); }
});

$("#form-register")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = e.target;
  try{
    await createUserWithEmailAndPassword(auth, f.email.value, f.password.value);
    closeModal();
  }catch(err){ showError(err); }
});

// ==== Provedores sociais
document.querySelectorAll('[data-provider="google"]').forEach(btn=>{
  btn.addEventListener('click', async ()=>{
    // await signInWithPopup(auth, new GoogleAuthProvider());
    // closeModal();
  });
});
document.querySelectorAll('[data-provider="facebook"]').forEach(btn=>{
  btn.addEventListener('click', async ()=>{
    // await signInWithPopup(auth, new FacebookAuthProvider());
    // closeModal();
  });
});
document.querySelectorAll('[data-provider="phone"]').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    // signInWithPhoneNumber(...)
  });
});

