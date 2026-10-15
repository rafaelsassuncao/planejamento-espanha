// Login com Google e sincronização dos dados com o Firestore
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  terminate,
  clearIndexedDbPersistence,
  doc,
  onSnapshot,
  setDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

// Configuração pública do app web; quem protege os dados são as regras do Firestore (firestore.rules)
const firebaseConfig = {
  apiKey: "AIzaSyASlzmWvyyW4SJwujxlLJ25d1CDOs2tNQk",
  authDomain: "planejamento-espanha.firebaseapp.com",
  projectId: "planejamento-espanha",
  storageBucket: "planejamento-espanha.firebasestorage.app",
  messagingSenderId: "806759185393",
  appId: "1:806759185393:web:b808fb963d86437be7e250",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});
// Todo o planejamento fica em um único documento compartilhado pela família
const ref = doc(db, "planos", "familia");
let unsubscribe = null,
  ready = false;

function showLogin(message, canSwitch = false) {
  $("#login").hidden = false;
  $("#loginmsg").textContent = message;
  $("#loginbtn").hidden = canSwitch || message === "Carregando…";
  $("#switchbtn").hidden = !canSwitch;
}

window.cloudSave = (d) => {
  if (!ready) return;
  setDoc(ref, {
    ...JSON.parse(JSON.stringify(d)),
    updatedAt: serverTimestamp(),
    updatedBy: auth.currentUser.email,
  }).catch(() => toast("Não foi possível salvar na nuvem"));
};

const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: "select_account" });

window.signIn = () =>
  signInWithPopup(auth, provider).catch((e) => {
    if (!["auth/popup-closed-by-user", "auth/cancelled-popup-request"].includes(e.code))
      showLogin("Não foi possível entrar. Tente novamente.");
  });

// Sai e apaga os dados guardados neste aparelho
window.logout = async () => {
  unsubscribe?.();
  await signOut(auth);
  localStorage.removeItem(KEY);
  await terminate(db);
  await clearIndexedDbPersistence(db).catch(() => {});
  location.reload();
};

// Troca de conta sem apagar o que já está neste navegador (ainda não enviado à nuvem)
window.switchAccount = () => signOut(auth);

onAuthStateChanged(auth, (user) => {
  unsubscribe?.();
  ready = false;
  window.currentEmail = user?.email || "";
  if (!user) {
    showLogin("Entre com sua conta Google para ver o planejamento da família.");
    return;
  }
  showLogin("Carregando…");
  let first = true;
  unsubscribe = onSnapshot(
    ref,
    { includeMetadataChanges: false },
    (snap) => {
      if (!snap.exists()) {
        // Primeiro acesso: aguarda a confirmação do servidor e envia o que já existe neste navegador
        if (snap.metadata.fromCache) return;
        ready = true;
        $("#login").hidden = true;
        window.cloudSave(data);
        render();
        return;
      }
      ready = true;
      $("#login").hidden = true;
      if (snap.metadata.hasPendingWrites && !first) return;
      const { updatedAt, updatedBy, ...d } = snap.data();
      setData(d);
      if (!$("#modal").open) render();
      if (first) refreshRate();
      first = false;
    },
    (err) =>
      showLogin(
        err.code === "permission-denied"
          ? `O e-mail ${user.email} não tem acesso a este planejamento.`
          : "Não foi possível carregar os dados. Verifique a internet e recarregue a página.",
        true,
      ),
  );
});
