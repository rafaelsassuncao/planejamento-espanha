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
  runTransaction,
  getDocFromServer,
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
const DIRTY = KEY + "-pendente";
let unsubscribe = null,
  // Só grava na nuvem depois de receber a versão do servidor (nunca a partir de uma cópia antiga do aparelho)
  ready = false,
  saving = false,
  again = false;
const myRevs = new Set(),
  rev = (d) => Number(d?.rev) || 0,
  isDirty = () => localStorage.getItem(DIRTY) === "1",
  setDirty = (v) => {
    try {
      v ? localStorage.setItem(DIRTY, "1") : localStorage.removeItem(DIRTY);
    } catch {}
  };

function showLogin(message, canSwitch = false) {
  $("#login").hidden = false;
  $("#loginmsg").textContent = message;
  $("#loginbtn").hidden = canSwitch || message === "Carregando…";
  $("#switchbtn").hidden = !canSwitch;
}

// Aplica os dados vindos da nuvem, mantendo a cotação mais recente deste aparelho
function applyServer(d) {
  const { updatedAt, updatedBy, ...clean } = d,
    local = { rate: data.rate, rateAt: data.rateAt, rateFetchedAt: data.rateFetchedAt };
  setData(clean);
  if ((local.rateFetchedAt || "") > (data.rateFetchedAt || "")) Object.assign(data, local);
  if (!$("#modal").open) render();
}

// Grava com controle de versão: se a nuvem mudou desde a nossa última leitura, não sobrescreve
async function push() {
  if (saving) return (again = true);
  saving = true;
  try {
    do {
      again = false;
      const base = rev(data),
        payload = { ...JSON.parse(JSON.stringify(data)), rev: base + 1 };
      myRevs.add(base + 1);
      await runTransaction(db, async (tx) => {
        const s = await tx.get(ref);
        if ((s.exists() ? rev(s.data()) : 0) !== base)
          throw Object.assign(Error("versão antiga"), { stale: true });
        tx.set(ref, { ...payload, updatedAt: serverTimestamp(), updatedBy: auth.currentUser.email });
      });
      data.rev = Math.max(rev(data), base + 1);
      try {
        localStorage.setItem(KEY, JSON.stringify(data));
      } catch {}
    } while (again);
    setDirty(false);
  } catch (e) {
    if (e.stale) {
      setDirty(false);
      const s = await getDocFromServer(ref).catch(() => null);
      if (s?.exists()) applyServer(s.data());
      toast(
        "Os dados foram alterados em outro aparelho. A tela foi atualizada; confira e refaça a última alteração se precisar.",
      );
    } else
      toast(
        navigator.onLine
          ? "Não foi possível salvar na nuvem. Tente de novo."
          : "Sem internet: a alteração ficou salva neste aparelho e será enviada quando a conexão voltar.",
      );
  } finally {
    saving = false;
  }
}

window.cloudSave = () => {
  setDirty(true);
  if (ready) push();
};
window.addEventListener("online", () => ready && isDirty() && push());

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
  setDirty(false);
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
    { includeMetadataChanges: true },
    (snap) => {
      const fromServer = !snap.metadata.fromCache;
      if (!snap.exists()) {
        // Primeiro acesso: aguarda a confirmação do servidor e envia o que já existe neste navegador
        if (!fromServer) return;
        ready = true;
        $("#login").hidden = true;
        render();
        push();
        return;
      }
      $("#login").hidden = true;
      const d = snap.data(),
        incoming = rev(d);
      if (myRevs.has(incoming)) {
        // Eco da nossa própria gravação
        data.rev = Math.max(rev(data), incoming);
      } else if (!ready && fromServer) {
        // Primeira resposta do servidor: ele é a referência. Alterações feitas sem internet
        // só são enviadas se ninguém mudou a nuvem nesse meio-tempo
        ready = true;
        if (isDirty() && incoming === rev(data)) push();
        else {
          if (isDirty() && incoming !== rev(data))
            toast("Alterações feitas sem internet não foram enviadas: os dados mudaram em outro aparelho.");
          setDirty(false);
          applyServer(d);
          if (migrate(structuredClone(d))) push();
        }
      } else if (incoming > rev(data)) applyServer(d);
      else if (!ready && first) render();
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
