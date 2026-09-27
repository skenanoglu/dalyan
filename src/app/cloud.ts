import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, firebaseReady } from './firebase';
import { parseProfile, type Profile } from './save';

export { firebaseReady };
export type { User };

export function watchAuth(cb: (user: User | null) => void): () => void {
  if (!auth) return () => {};
  return onAuthStateChanged(auth, cb);
}

export async function signUp(email: string, password: string): Promise<void> {
  if (!auth) throw new Error('not-configured');
  await createUserWithEmailAndPassword(auth, email, password);
}

export async function signIn(email: string, password: string): Promise<void> {
  if (!auth) throw new Error('not-configured');
  await signInWithEmailAndPassword(auth, email, password);
}

export async function signInWithGoogle(): Promise<void> {
  if (!auth) throw new Error('not-configured');
  await signInWithPopup(auth, new GoogleAuthProvider());
}

export async function signOutUser(): Promise<void> {
  if (!auth) return;
  await signOut(auth);
}

/** Buluttaki profili okur; kayıt yoksa ya da bozuksa null döner. */
export async function pullProfile(uid: string): Promise<Profile | null> {
  if (!db) return null;
  const snap = await getDoc(doc(db, 'profiles', uid));
  if (!snap.exists()) return null;
  return parseProfile(JSON.stringify(snap.data().profile ?? null));
}

export async function pushProfile(uid: string, profile: Profile): Promise<void> {
  if (!db) return;
  await setDoc(doc(db, 'profiles', uid), { profile, updatedAt: Date.now() });
}

/** Firebase hata kodlarını kullanıcıya gösterilecek kısa Türkçe mesaja çevirir. */
export function authErrorMessage(err: unknown): string {
  const code = err instanceof Error && 'code' in err ? String((err as { code: unknown }).code) : '';
  switch (code) {
    case 'auth/invalid-email':
      return 'E-posta adresi geçersiz.';
    case 'auth/missing-password':
      return 'Şifre gerekli.';
    case 'auth/weak-password':
      return 'Şifre en az 6 karakter olmalı.';
    case 'auth/email-already-in-use':
      return 'Bu e-posta zaten kayıtlı. Giriş yapmayı dene.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'E-posta ya da şifre hatalı.';
    case 'auth/too-many-requests':
      return 'Çok fazla deneme yapıldı, biraz sonra tekrar dene.';
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return '';
    case 'auth/network-request-failed':
      return 'İnternet bağlantısı yok gibi görünüyor.';
    default:
      return err instanceof Error && err.message === 'not-configured'
        ? 'Bu oyun kopyasında bulut girişi ayarlanmamış.'
        : 'Bir şeyler ters gitti, tekrar dene.';
  }
}
