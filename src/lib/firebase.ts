import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  collection,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { Session, Message } from '../types';

// 1. Initialize Firebase App and Firestore
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// 2. Strict Error Handling conforming to Firebase Integration RPC specification
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): FirestoreErrorInfo {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
    },
    operationType,
    path,
  };
  // Log handled error info without crashing execution
  console.warn('Handled Firestore operation:', JSON.stringify(errInfo));
  return errInfo;
}

// 3. Auth Helpers
export async function loginWithGoogle(): Promise<User> {
  const provider = new GoogleAuthProvider();
  const credential = await signInWithPopup(auth, provider);
  return credential.user;
}

export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

// 4. Firestore Operations for Sessions and Messages
export async function saveSessionToFirestore(userId: string, session: Session): Promise<void> {
  if (!userId || userId === 'guest') return;
  const sessionPath = `users/${userId}/sessions/${session.id}`;
  try {
    const sessionRef = doc(db, 'users', userId, 'sessions', session.id);
    await setDoc(sessionRef, {
      ...session,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, sessionPath);
  }
}

export async function deleteSessionFromFirestore(userId: string, sessionId: string): Promise<void> {
  if (!userId || userId === 'guest') return;
  const sessionPath = `users/${userId}/sessions/${sessionId}`;
  try {
    const sessionRef = doc(db, 'users', userId, 'sessions', sessionId);
    await deleteDoc(sessionRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, sessionPath);
  }
}

export async function saveMessageToFirestore(userId: string, sessionId: string, message: Message): Promise<void> {
  if (!userId || userId === 'guest') return;
  const messagePath = `users/${userId}/sessions/${sessionId}/messages/${message.id}`;
  try {
    const msgRef = doc(db, 'users', userId, 'sessions', sessionId, 'messages', message.id);
    await setDoc(msgRef, message);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, messagePath);
  }
}

export function subscribeSessions(
  userId: string,
  onUpdate: (sessions: Session[]) => void,
  onError?: (error: Error) => void
): () => void {
  if (!userId || userId === 'guest') return () => {};
  const sessionsColPath = `users/${userId}/sessions`;
  try {
    const sessionsRef = collection(db, 'users', userId, 'sessions');
    const q = query(sessionsRef, orderBy('updatedAt', 'desc'));
    return onSnapshot(
      q,
      (snapshot) => {
        const list: Session[] = [];
        snapshot.forEach((docSnap) => {
          list.push(docSnap.data() as Session);
        });
        onUpdate(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, sessionsColPath);
        if (onError) onError(error);
      }
    );
  } catch (error: any) {
    handleFirestoreError(error, OperationType.LIST, sessionsColPath);
    return () => {};
  }
}

export function subscribeMessages(
  userId: string,
  sessionId: string,
  onUpdate: (messages: Message[]) => void,
  onError?: (error: Error) => void
): () => void {
  if (!userId || userId === 'guest' || !sessionId) return () => {};
  const messagesColPath = `users/${userId}/sessions/${sessionId}/messages`;
  try {
    const messagesRef = collection(db, 'users', userId, 'sessions', sessionId, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'));
    return onSnapshot(
      q,
      (snapshot) => {
        const list: Message[] = [];
        snapshot.forEach((docSnap) => {
          list.push(docSnap.data() as Message);
        });
        onUpdate(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, messagesColPath);
        if (onError) onError(error);
      }
    );
  } catch (error: any) {
    handleFirestoreError(error, OperationType.LIST, messagesColPath);
    return () => {};
  }
}
