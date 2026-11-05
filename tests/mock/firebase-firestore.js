// Firestore simulado em memória: permite testar a sincronização sem internet nem conta
const M = (window.__mock = { server: null, listener: null, writes: 0 });
const clone = (x) => (x == null ? x : JSON.parse(JSON.stringify(x)));
const snap = (d, fromCache) => ({
  exists: () => d != null,
  data: () => clone(d),
  metadata: { fromCache, hasPendingWrites: false },
});
M.fire = (d, fromCache = false) => M.listener && M.listener(snap(d, fromCache));
M.setServer = (d) => (M.server = clone(d));
export const initializeFirestore = () => ({});
export const persistentLocalCache = () => ({});
export const persistentMultipleTabManager = () => ({});
export const terminate = async () => {};
export const clearIndexedDbPersistence = async () => {};
export const doc = () => ({});
export const serverTimestamp = () => "ts";
export const onSnapshot = (ref, opts, cb) => {
  M.listener = cb;
  return () => (M.listener = null);
};
export const getDocFromServer = async () => snap(M.server, false);
export const runTransaction = async (db, fn) => {
  let pending = null;
  await fn({ get: async () => snap(M.server, false), set: (r, d) => (pending = clone(d)) });
  await new Promise((r) => setTimeout(r, 5));
  M.server = pending;
  M.writes++;
  setTimeout(() => M.fire(M.server, false), 0);
};
