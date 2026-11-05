const user = { email: "teste@example.com" };
export const getAuth = () => ({ currentUser: user });
export class GoogleAuthProvider {
  setCustomParameters() {}
}
export const onAuthStateChanged = (auth, cb) => setTimeout(() => cb(user), 0);
export const signInWithPopup = async () => {};
export const signOut = async () => {};
