import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  GithubAuthProvider,
  signOut,
  sendPasswordResetEmail,
  updateEmail,
  updatePassword,
  deleteUser,
  onAuthStateChanged,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updateProfile
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import {
  doc,
  getDoc,
  setDoc,
  query,
  where,
  collection,
  getDocs,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getAuthInstance, getDB } from './firebase.js';

// Map Firebase error codes to human-readable messages
function mapAuthError(code) {
  const errors = {
    'auth/email-already-in-use':    'This email address is already registered.',
    'auth/invalid-email':           'Please enter a valid email address.',
    'auth/user-not-found':          'No account found with this email address.',
    'auth/wrong-password':          'Incorrect password. Please try again.',
    'auth/weak-password':           'Password must be at least 6 characters.',
    'auth/too-many-requests':       'Too many failed attempts. Please try again later.',
    'auth/user-disabled':           'This account has been disabled.',
    'auth/requires-recent-login':   'Please log in again to perform this action.',
    'auth/popup-closed-by-user':    'Sign-in popup was closed before completing.',
    'auth/account-exists-with-different-credential':
                                    'An account already exists with this email using a different sign-in method.',
    'auth/network-request-failed':  'A network error occurred. Check your connection.',
    'auth/credential-already-in-use': 'This credential is already linked to another account.',
    'auth/invalid-credential':      'The credential is invalid or has expired.',
    'auth/operation-not-allowed':   'This sign-in method is not enabled.',
    'auth/expired-action-code':     'This action link has expired.',
    'auth/invalid-action-code':     'This action link is invalid or has already been used.',
  };
  return errors[code] || 'An unexpected error occurred. Please try again.';
}

// Create or update a Firestore user document after registration/social login
async function upsertUserDocument(user, extraData = {}) {
  const db = getDB();
  const userRef = doc(db, 'users', user.uid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) {
    const username = extraData.username ||
      (user.displayName
        ? user.displayName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') + '_' + Math.random().toString(36).slice(2, 6)
        : 'user_' + Math.random().toString(36).slice(2, 8));

    await setDoc(userRef, {
      uid:             user.uid,
      email:           user.email,
      displayName:     extraData.displayName || user.displayName || '',
      username,
      photoURL:        user.photoURL || '',
      bio:             '',
      coverPhotoURL:   '',
      website:         '',
      location:        '',
      isPrivate:       false,
      isVerified:      false,
      isBanned:        false,
      bannedUntil:     null,
      role:            'user',
      following:       [],
      followers:       [],
      followRequests:  [],
      blockedUsers:    [],
      postCount:       0,
      followerCount:   0,
      followingCount:  0,
      projectCount:    0,
      provider:        extraData.provider || 'email',
      createdAt:       serverTimestamp(),
      updatedAt:       serverTimestamp(),
      lastSeen:        serverTimestamp(),
      isOnline:        true,
    });
  } else {
    // Update last seen on every login
    await setDoc(userRef, { lastSeen: serverTimestamp(), isOnline: true }, { merge: true });
  }
}

/**
 * Subscribe to auth state changes.
 * @param {Function} callback - Receives Firebase user or null.
 * @returns {Function} Unsubscribe function.
 */
export function onAuthStateChange(callback) {
  const auth = getAuthInstance();
  return onAuthStateChanged(auth, callback);
}

/**
 * Sign in with email and password.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<import('firebase/auth').User>}
 */
export async function loginWithEmail(email, password) {
  try {
    const auth = getAuthInstance();
    const credential = await signInWithEmailAndPassword(auth, email, password);
    await upsertUserDocument(credential.user);
    return credential.user;
  } catch (err) {
    throw new Error(mapAuthError(err.code));
  }
}

/**
 * Register a new user with email, password, and display name.
 * @param {string} email
 * @param {string} password
 * @param {string} displayName
 * @returns {Promise<import('firebase/auth').User>}
 */
export async function registerWithEmail(email, password, displayName) {
  try {
    const auth = getAuthInstance();
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(credential.user, { displayName });

    // Build a clean username from the display name
    const baseUsername = displayName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    let username = baseUsername;
    const db = getDB();

    // Ensure username uniqueness
    let attempt = 0;
    while (true) {
      const q = query(collection(db, 'users'), where('username', '==', username));
      const snap = await getDocs(q);
      if (snap.empty) break;
      attempt++;
      username = `${baseUsername}_${attempt}`;
    }

    await upsertUserDocument(credential.user, { displayName, username, provider: 'email' });
    return credential.user;
  } catch (err) {
    throw new Error(mapAuthError(err.code));
  }
}

/**
 * Sign in with Google via popup.
 * @returns {Promise<import('firebase/auth').User>}
 */
export async function loginWithGoogle() {
  try {
    const auth = getAuthInstance();
    const provider = new GoogleAuthProvider();
    provider.addScope('email');
    provider.addScope('profile');
    const credential = await signInWithPopup(auth, provider);
    await upsertUserDocument(credential.user, { provider: 'google' });
    return credential.user;
  } catch (err) {
    throw new Error(mapAuthError(err.code));
  }
}

/**
 * Sign in with GitHub via popup.
 * @returns {Promise<import('firebase/auth').User>}
 */
export async function loginWithGithub() {
  try {
    const auth = getAuthInstance();
    const provider = new GithubAuthProvider();
    provider.addScope('read:user');
    provider.addScope('user:email');
    const credential = await signInWithPopup(auth, provider);
    await upsertUserDocument(credential.user, { provider: 'github' });
    return credential.user;
  } catch (err) {
    throw new Error(mapAuthError(err.code));
  }
}

/**
 * Sign out the current user.
 * @returns {Promise<void>}
 */
export async function logout() {
  try {
    const auth = getAuthInstance();
    const user = auth.currentUser;
    if (user) {
      // Mark offline before signing out
      const db = getDB();
      const { updateDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
      await updateDoc(doc(db, 'users', user.uid), {
        isOnline: false,
        lastSeen: serverTimestamp()
      }).catch(() => {});
    }
    await signOut(auth);
  } catch (err) {
    throw new Error(mapAuthError(err.code));
  }
}

/**
 * Send a password reset email.
 * @param {string} email
 * @returns {Promise<void>}
 */
export async function resetPassword(email) {
  try {
    const auth = getAuthInstance();
    await sendPasswordResetEmail(auth, email);
  } catch (err) {
    throw new Error(mapAuthError(err.code));
  }
}

/**
 * Update the current user's email address.
 * @param {string} newEmail
 * @returns {Promise<void>}
 */
export async function updateUserEmail(newEmail) {
  try {
    const auth = getAuthInstance();
    const user = auth.currentUser;
    if (!user) throw new Error('No authenticated user.');
    await updateEmail(user, newEmail);
    const db = getDB();
    const { updateDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
    await updateDoc(doc(db, 'users', user.uid), { email: newEmail, updatedAt: serverTimestamp() });
  } catch (err) {
    throw new Error(mapAuthError(err.code));
  }
}

/**
 * Update the current user's password.
 * @param {string} newPassword
 * @returns {Promise<void>}
 */
export async function updateUserPassword(newPassword) {
  try {
    const auth = getAuthInstance();
    const user = auth.currentUser;
    if (!user) throw new Error('No authenticated user.');
    await updatePassword(user, newPassword);
  } catch (err) {
    throw new Error(mapAuthError(err.code));
  }
}

/**
 * Delete the current user's account and Firestore document.
 * @returns {Promise<void>}
 */
export async function deleteAccount() {
  try {
    const auth = getAuthInstance();
    const user = auth.currentUser;
    if (!user) throw new Error('No authenticated user.');
    const db = getDB();
    const { deleteDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
    await deleteDoc(doc(db, 'users', user.uid));
    await deleteUser(user);
  } catch (err) {
    throw new Error(mapAuthError(err.code));
  }
}

/**
 * Get the currently signed-in Firebase user.
 * @returns {import('firebase/auth').User|null}
 */
export function getCurrentUser() {
  const auth = getAuthInstance();
  return auth.currentUser;
}

/**
 * Reauthenticate the current user with their password (required for sensitive ops).
 * @param {string} password
 * @returns {Promise<import('firebase/auth').UserCredential>}
 */
export async function reauthenticate(password) {
  try {
    const auth = getAuthInstance();
    const user = auth.currentUser;
    if (!user || !user.email) throw new Error('No authenticated user.');
    const credential = EmailAuthProvider.credential(user.email, password);
    return await reauthenticateWithCredential(user, credential);
  } catch (err) {
    throw new Error(mapAuthError(err.code));
  }
}

/**
 * Check whether a given username is available in Firestore.
 * @param {string} username
 * @returns {Promise<boolean>} true if available, false if taken.
 */
export async function checkUsernameAvailable(username) {
  try {
    const db = getDB();
    const clean = username.toLowerCase().trim();
    if (!clean || clean.length < 3) return false;
    if (!/^[a-z0-9_]{3,30}$/.test(clean)) return false;
    const q = query(collection(db, 'users'), where('username', '==', clean));
    const snap = await getDocs(q);
    return snap.empty;
  } catch (err) {
    console.error('checkUsernameAvailable error:', err);
    return false;
  }
}
