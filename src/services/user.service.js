import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  startAfter,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  increment,
  writeBatch,
  or,
  getCountFromServer
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';
import { getDB, getStorageInstance } from './firebase.js';
import { createNotification } from './notification.service.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function storageRef(path) {
  return ref(getStorageInstance(), path);
}

async function uploadFile(storagePath, file, onProgress) {
  const fileRef = storageRef(storagePath);
  return new Promise((resolve, reject) => {
    const task = uploadBytesResumable(fileRef, file);
    task.on(
      'state_changed',
      snapshot => {
        if (typeof onProgress === 'function') {
          onProgress(Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100));
        }
      },
      reject,
      async () => {
        try {
          const url = await getDownloadURL(task.snapshot.ref);
          resolve(url);
        } catch (e) {
          reject(e);
        }
      }
    );
  });
}

// ---------------------------------------------------------------------------
// Profile retrieval
// ---------------------------------------------------------------------------

/**
 * Get a user's Firestore document by UID.
 * @param {string} uid
 * @returns {Promise<Object|null>}
 */
export async function getUserProfile(uid) {
  try {
    const snap = await getDoc(doc(getDB(), 'users', uid));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  } catch (err) {
    console.error('getUserProfile error:', err);
    throw new Error('Failed to load user profile.');
  }
}

/**
 * Get a user document by username.
 * @param {string} username
 * @returns {Promise<Object|null>}
 */
export async function getUserByUsername(username) {
  try {
    const q = query(
      collection(getDB(), 'users'),
      where('username', '==', username.toLowerCase().trim())
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const d = snap.docs[0];
    return { id: d.id, ...d.data() };
  } catch (err) {
    console.error('getUserByUsername error:', err);
    throw new Error('Failed to find user.');
  }
}

// ---------------------------------------------------------------------------
// Profile mutation
// ---------------------------------------------------------------------------

/**
 * Update fields on a user's document.
 * @param {string} uid
 * @param {Object} data
 * @returns {Promise<void>}
 */
export async function updateUserProfile(uid, data) {
  try {
    const allowed = [
      'displayName', 'bio', 'website', 'location', 'username',
      'isPrivate', 'photoURL', 'coverPhotoURL', 'links'
    ];
    const safe = Object.fromEntries(
      Object.entries(data).filter(([k]) => allowed.includes(k))
    );
    safe.updatedAt = serverTimestamp();
    await updateDoc(doc(getDB(), 'users', uid), safe);
  } catch (err) {
    console.error('updateUserProfile error:', err);
    throw new Error('Failed to update profile.');
  }
}

/**
 * Upload an avatar image, update the user doc and return the download URL.
 * @param {string} uid
 * @param {File} file
 * @param {Function} [onProgress]
 * @returns {Promise<string>} Download URL
 */
export async function uploadAvatar(uid, file, onProgress) {
  try {
    const ext = file.name.split('.').pop();
    const path = `avatars/${uid}/avatar_${Date.now()}.${ext}`;
    const url = await uploadFile(path, file, onProgress);
    await updateDoc(doc(getDB(), 'users', uid), { photoURL: url, updatedAt: serverTimestamp() });
    return url;
  } catch (err) {
    console.error('uploadAvatar error:', err);
    throw new Error('Failed to upload avatar.');
  }
}

/**
 * Upload a cover photo and return the download URL.
 * @param {string} uid
 * @param {File} file
 * @param {Function} [onProgress]
 * @returns {Promise<string>}
 */
export async function uploadCoverPhoto(uid, file, onProgress) {
  try {
    const ext = file.name.split('.').pop();
    const path = `covers/${uid}/cover_${Date.now()}.${ext}`;
    const url = await uploadFile(path, file, onProgress);
    await updateDoc(doc(getDB(), 'users', uid), { coverPhotoURL: url, updatedAt: serverTimestamp() });
    return url;
  } catch (err) {
    console.error('uploadCoverPhoto error:', err);
    throw new Error('Failed to upload cover photo.');
  }
}

// ---------------------------------------------------------------------------
// Follow / Unfollow
// ---------------------------------------------------------------------------

/**
 * Follow a user. If the target account is private, sends a follow request instead.
 * @param {string} currentUid
 * @param {string} targetUid
 * @returns {Promise<'following'|'requested'>}
 */
export async function followUser(currentUid, targetUid) {
  try {
    if (currentUid === targetUid) throw new Error('Cannot follow yourself.');
    const db = getDB();
    const targetSnap = await getDoc(doc(db, 'users', targetUid));
    if (!targetSnap.exists()) throw new Error('User not found.');
    const target = targetSnap.data();
    const currentSnap = await getDoc(doc(db, 'users', currentUid));
    const current = currentSnap.data();

    const batch = writeBatch(db);

    if (target.isPrivate) {
      // Send follow request
      batch.update(doc(db, 'users', targetUid), {
        followRequests: arrayUnion(currentUid)
      });
      batch.commit();
      await createNotification(targetUid, currentUid, {
        displayName: current.displayName,
        photoURL:    current.photoURL,
        username:    current.username
      }, 'follow_request', { requesterId: currentUid });
      return 'requested';
    }

    // Public account — follow directly
    batch.update(doc(db, 'users', currentUid), {
      following:      arrayUnion(targetUid),
      followingCount: increment(1)
    });
    batch.update(doc(db, 'users', targetUid), {
      followers:      arrayUnion(currentUid),
      followerCount:  increment(1)
    });
    await batch.commit();

    await createNotification(targetUid, currentUid, {
      displayName: current.displayName,
      photoURL:    current.photoURL,
      username:    current.username
    }, 'follow', { followerId: currentUid });

    return 'following';
  } catch (err) {
    console.error('followUser error:', err);
    throw new Error(err.message || 'Failed to follow user.');
  }
}

/**
 * Unfollow a user.
 * @param {string} currentUid
 * @param {string} targetUid
 * @returns {Promise<void>}
 */
export async function unfollowUser(currentUid, targetUid) {
  try {
    const db = getDB();
    const batch = writeBatch(db);
    batch.update(doc(db, 'users', currentUid), {
      following:      arrayRemove(targetUid),
      followingCount: increment(-1)
    });
    batch.update(doc(db, 'users', targetUid), {
      followers:     arrayRemove(currentUid),
      followerCount: increment(-1)
    });
    await batch.commit();
  } catch (err) {
    console.error('unfollowUser error:', err);
    throw new Error('Failed to unfollow user.');
  }
}

/**
 * Accept a pending follow request.
 * @param {string} currentUid   - The account owner accepting the request.
 * @param {string} requesterId  - The user who sent the request.
 * @returns {Promise<void>}
 */
export async function acceptFollowRequest(currentUid, requesterId) {
  try {
    const db = getDB();
    const currentSnap = await getDoc(doc(db, 'users', currentUid));
    const current = currentSnap.data();
    const batch = writeBatch(db);
    batch.update(doc(db, 'users', currentUid), {
      followRequests: arrayRemove(requesterId),
      followers:      arrayUnion(requesterId),
      followerCount:  increment(1)
    });
    batch.update(doc(db, 'users', requesterId), {
      following:      arrayUnion(currentUid),
      followingCount: increment(1)
    });
    await batch.commit();
    await createNotification(requesterId, currentUid, {
      displayName: current.displayName,
      photoURL:    current.photoURL,
      username:    current.username
    }, 'follow_accept', { acceptedUid: currentUid });
  } catch (err) {
    console.error('acceptFollowRequest error:', err);
    throw new Error('Failed to accept follow request.');
  }
}

/**
 * Reject a pending follow request.
 * @param {string} currentUid
 * @param {string} requesterId
 * @returns {Promise<void>}
 */
export async function rejectFollowRequest(currentUid, requesterId) {
  try {
    await updateDoc(doc(getDB(), 'users', currentUid), {
      followRequests: arrayRemove(requesterId)
    });
  } catch (err) {
    console.error('rejectFollowRequest error:', err);
    throw new Error('Failed to reject follow request.');
  }
}

// ---------------------------------------------------------------------------
// Followers / Following lists
// ---------------------------------------------------------------------------

/**
 * Get followers with profile data.
 * @param {string} uid
 * @param {number} [maxLimit=20]
 * @returns {Promise<Object[]>}
 */
export async function getFollowers(uid, maxLimit = 20) {
  try {
    const profile = await getUserProfile(uid);
    if (!profile) return [];
    const ids = (profile.followers || []).slice(0, maxLimit);
    if (ids.length === 0) return [];
    const profiles = await Promise.all(ids.map(id => getUserProfile(id)));
    return profiles.filter(Boolean);
  } catch (err) {
    console.error('getFollowers error:', err);
    throw new Error('Failed to load followers.');
  }
}

/**
 * Get following list with profile data.
 * @param {string} uid
 * @param {number} [maxLimit=20]
 * @returns {Promise<Object[]>}
 */
export async function getFollowing(uid, maxLimit = 20) {
  try {
    const profile = await getUserProfile(uid);
    if (!profile) return [];
    const ids = (profile.following || []).slice(0, maxLimit);
    if (ids.length === 0) return [];
    const profiles = await Promise.all(ids.map(id => getUserProfile(id)));
    return profiles.filter(Boolean);
  } catch (err) {
    console.error('getFollowing error:', err);
    throw new Error('Failed to load following.');
  }
}

// ---------------------------------------------------------------------------
// Search / Discovery
// ---------------------------------------------------------------------------

/**
 * Search users by username or display name prefix.
 * @param {string} queryStr
 * @param {number} [maxLimit=10]
 * @returns {Promise<Object[]>}
 */
export async function searchUsers(queryStr, maxLimit = 10) {
  try {
    const db = getDB();
    const q = queryStr.toLowerCase().trim();
    if (!q) return [];

    // Query by username prefix
    const usernameQ = query(
      collection(db, 'users'),
      where('username', '>=', q),
      where('username', '<=', q + '\uf8ff'),
      firestoreLimit(maxLimit)
    );
    // Query by displayName prefix (case-sensitive Firestore limitation)
    const displayQ = query(
      collection(db, 'users'),
      where('displayName', '>=', q),
      where('displayName', '<=', q + '\uf8ff'),
      firestoreLimit(maxLimit)
    );

    const [uSnap, dSnap] = await Promise.all([getDocs(usernameQ), getDocs(displayQ)]);
    const seen = new Set();
    const results = [];
    [...uSnap.docs, ...dSnap.docs].forEach(d => {
      if (!seen.has(d.id)) {
        seen.add(d.id);
        results.push({ id: d.id, ...d.data() });
      }
    });
    return results.slice(0, maxLimit);
  } catch (err) {
    console.error('searchUsers error:', err);
    throw new Error('Search failed.');
  }
}

/**
 * Get suggested users to follow (not already followed, not self).
 * @param {string} currentUid
 * @param {number} [maxLimit=8]
 * @returns {Promise<Object[]>}
 */
export async function getSuggestedUsers(currentUid, maxLimit = 8) {
  try {
    const profile = await getUserProfile(currentUid);
    const excluded = new Set([currentUid, ...(profile?.following || []), ...(profile?.blockedUsers || [])]);

    const q = query(
      collection(getDB(), 'users'),
      where('isBanned', '==', false),
      orderBy('followerCount', 'desc'),
      firestoreLimit(maxLimit + excluded.size + 5)
    );
    const snap = await getDocs(q);
    return snap.docs
      .filter(d => !excluded.has(d.id))
      .slice(0, maxLimit)
      .map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error('getSuggestedUsers error:', err);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Presence
// ---------------------------------------------------------------------------

/**
 * Update a user's online status and last-seen timestamp.
 * @param {string} uid
 * @param {boolean} isOnline
 * @returns {Promise<void>}
 */
export async function updateOnlineStatus(uid, isOnline) {
  try {
    await updateDoc(doc(getDB(), 'users', uid), {
      isOnline,
      lastSeen: serverTimestamp()
    });
  } catch (err) {
    console.error('updateOnlineStatus error:', err);
  }
}

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

/**
 * Get aggregated stats for a user (counts pulled from the document).
 * @param {string} uid
 * @returns {Promise<{postCount: number, followerCount: number, followingCount: number, projectCount: number}>}
 */
export async function getUserStats(uid) {
  try {
    const profile = await getUserProfile(uid);
    if (!profile) throw new Error('User not found.');
    return {
      postCount:      profile.postCount      || 0,
      followerCount:  profile.followerCount  || 0,
      followingCount: profile.followingCount || 0,
      projectCount:   profile.projectCount   || 0
    };
  } catch (err) {
    console.error('getUserStats error:', err);
    throw new Error('Failed to load user stats.');
  }
}

// ---------------------------------------------------------------------------
// Block / Unblock
// ---------------------------------------------------------------------------

/**
 * Block a user (also unfollows in both directions).
 * @param {string} currentUid
 * @param {string} targetUid
 * @returns {Promise<void>}
 */
export async function blockUser(currentUid, targetUid) {
  try {
    if (currentUid === targetUid) throw new Error('Cannot block yourself.');
    const db = getDB();
    const batch = writeBatch(db);
    batch.update(doc(db, 'users', currentUid), {
      blockedUsers:   arrayUnion(targetUid),
      following:      arrayRemove(targetUid),
      followers:      arrayRemove(targetUid),
      followingCount: increment(-1)
    });
    batch.update(doc(db, 'users', targetUid), {
      following:      arrayRemove(currentUid),
      followers:      arrayRemove(currentUid),
      followerCount:  increment(-1)
    });
    await batch.commit();
  } catch (err) {
    console.error('blockUser error:', err);
    throw new Error(err.message || 'Failed to block user.');
  }
}

/**
 * Unblock a user.
 * @param {string} currentUid
 * @param {string} targetUid
 * @returns {Promise<void>}
 */
export async function unblockUser(currentUid, targetUid) {
  try {
    await updateDoc(doc(getDB(), 'users', currentUid), {
      blockedUsers: arrayRemove(targetUid)
    });
  } catch (err) {
    console.error('unblockUser error:', err);
    throw new Error('Failed to unblock user.');
  }
}

/**
 * Get the list of users blocked by the current user.
 * @param {string} uid
 * @returns {Promise<Object[]>}
 */
export async function getBlockedUsers(uid) {
  try {
    const profile = await getUserProfile(uid);
    if (!profile || !profile.blockedUsers?.length) return [];
    const profiles = await Promise.all(profile.blockedUsers.map(id => getUserProfile(id)));
    return profiles.filter(Boolean);
  } catch (err) {
    console.error('getBlockedUsers error:', err);
    throw new Error('Failed to load blocked users.');
  }
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

/**
 * Submit a report against a user.
 * @param {string} reporterId
 * @param {string} targetUid
 * @param {string} reason
 * @returns {Promise<void>}
 */
export async function reportUser(reporterId, targetUid, reason) {
  try {
    const db = getDB();
    const reportRef = doc(collection(db, 'reports'));
    await setDoc(reportRef, {
      type:       'user',
      reporterId,
      targetUid,
      reason,
      status:     'pending',
      createdAt:  serverTimestamp()
    });
  } catch (err) {
    console.error('reportUser error:', err);
    throw new Error('Failed to submit report.');
  }
}

// ---------------------------------------------------------------------------
// Relationship checks
// ---------------------------------------------------------------------------

/**
 * Check if currentUid is following targetUid.
 * @param {string} currentUid
 * @param {string} targetUid
 * @returns {Promise<boolean>}
 */
export async function isFollowing(currentUid, targetUid) {
  try {
    const profile = await getUserProfile(currentUid);
    return (profile?.following || []).includes(targetUid);
  } catch (err) {
    console.error('isFollowing error:', err);
    return false;
  }
}

/**
 * Check if currentUid has a pending follow request to targetUid.
 * @param {string} currentUid
 * @param {string} targetUid
 * @returns {Promise<boolean>}
 */
export async function hasPendingRequest(currentUid, targetUid) {
  try {
    const profile = await getUserProfile(targetUid);
    return (profile?.followRequests || []).includes(currentUid);
  } catch (err) {
    console.error('hasPendingRequest error:', err);
    return false;
  }
}
