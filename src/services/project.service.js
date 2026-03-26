import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  startAfter,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  increment,
  writeBatch
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  listAll
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';
import { getDB, getStorageInstance } from './firebase.js';
import { createNotification } from './notification.service.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function uploadFile(storagePath, file, onProgress) {
  const fileRef = ref(getStorageInstance(), storagePath);
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
          resolve(await getDownloadURL(task.snapshot.ref));
        } catch (e) {
          reject(e);
        }
      }
    );
  });
}

/**
 * Verify that uid is the project owner. Throws if not.
 */
async function assertOwner(db, projectId, uid) {
  const snap = await getDoc(doc(db, 'projects', projectId));
  if (!snap.exists()) throw new Error('Project not found.');
  if (snap.data().authorId !== uid) throw new Error('Unauthorized.');
  return { snap, data: snap.data() };
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

/**
 * Create a new project.
 * @param {string} uid
 * @param {Object} data
 * @returns {Promise<Object>} Created project with id.
 */
export async function createProject(uid, data) {
  try {
    const db = getDB();
    const projectData = {
      title:           data.title           || 'Untitled Project',
      description:     data.description     || '',
      githubURL:       data.githubURL        || null,
      demoURL:         data.demoURL          || null,
      previewImageURL: data.previewImageURL  || null,
      tags:            data.tags             || [],
      isPrivate:       data.isPrivate        ?? false,
      isFeatured:      false,
      files:           data.files            || [],
      stars:           [],
      starCount:       0,
      forks:           0,
      views:           0,
      authorId:        uid,
      authorName:      data.authorName       || '',
      authorUsername:  data.authorUsername   || '',
      authorAvatar:    data.authorAvatar     || '',
      accessRequests:  [],
      accessGranted:   [],
      createdAt:       serverTimestamp(),
      updatedAt:       serverTimestamp()
    };

    const ref = await addDoc(collection(db, 'projects'), projectData);
    await updateDoc(doc(db, 'users', uid), { projectCount: increment(1) });
    return { id: ref.id, ...projectData };
  } catch (err) {
    console.error('createProject error:', err);
    throw new Error('Failed to create project.');
  }
}

/**
 * Update project fields (owner only).
 * @param {string} projectId
 * @param {string} uid
 * @param {Object} data
 * @returns {Promise<void>}
 */
export async function updateProject(projectId, uid, data) {
  try {
    const db = getDB();
    await assertOwner(db, projectId, uid);

    const allowed = [
      'title', 'description', 'githubURL', 'demoURL',
      'previewImageURL', 'tags', 'isPrivate', 'files'
    ];
    const safe = Object.fromEntries(
      Object.entries(data).filter(([k]) => allowed.includes(k))
    );
    safe.updatedAt = serverTimestamp();
    await updateDoc(doc(db, 'projects', projectId), safe);
  } catch (err) {
    console.error('updateProject error:', err);
    throw new Error(err.message || 'Failed to update project.');
  }
}

/**
 * Delete a project and all its storage files.
 * @param {string} projectId
 * @param {string} uid
 * @returns {Promise<void>}
 */
export async function deleteProject(projectId, uid) {
  try {
    const db = getDB();
    const { data } = await assertOwner(db, projectId, uid);

    await deleteDoc(doc(db, 'projects', projectId));
    await updateDoc(doc(db, 'users', uid), { projectCount: increment(-1) }).catch(() => {});

    // Delete all storage files under projects/{projectId}/
    const storage = getStorageInstance();
    const folderRef = ref(storage, `projects/${projectId}`);
    const listed = await listAll(folderRef).catch(() => null);
    if (listed) {
      await Promise.all(listed.items.map(item => deleteObject(item).catch(() => {})));
    }
  } catch (err) {
    console.error('deleteProject error:', err);
    throw new Error(err.message || 'Failed to delete project.');
  }
}

/**
 * Get a project by ID, enforcing access rules.
 * @param {string} projectId
 * @param {string|null} currentUid
 * @returns {Promise<Object|null>}
 */
export async function getProject(projectId, currentUid) {
  try {
    const db = getDB();
    const snap = await getDoc(doc(db, 'projects', projectId));
    if (!snap.exists()) return null;
    const data = snap.data();

    const isOwner = data.authorId === currentUid;
    const hasAccess = isOwner || (data.accessGranted || []).includes(currentUid);
    if (data.isPrivate && !hasAccess) return null;

    return { id: snap.id, ...data };
  } catch (err) {
    console.error('getProject error:', err);
    throw new Error('Failed to load project.');
  }
}

// ---------------------------------------------------------------------------
// Lists
// ---------------------------------------------------------------------------

/**
 * Get paginated projects for a user.
 * @param {string} uid
 * @param {boolean} isOwner - If true include private projects.
 * @param {Object|null} lastDoc
 * @param {number} [pageLimit=12]
 * @returns {Promise<{projects: Object[], lastDoc: Object|null, hasMore: boolean}>}
 */
export async function getUserProjects(uid, isOwner, lastDoc, pageLimit = 12) {
  try {
    const db = getDB();
    const constraints = [where('authorId', '==', uid), orderBy('createdAt', 'desc'), firestoreLimit(pageLimit)];
    if (!isOwner) constraints.splice(1, 0, where('isPrivate', '==', false));

    let q = query(collection(db, 'projects'), ...constraints);
    if (lastDoc) q = query(q, startAfter(lastDoc));

    const snap = await getDocs(q);
    const projects = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const last = snap.docs[snap.docs.length - 1] || null;
    return { projects, lastDoc: last, hasMore: snap.docs.length === pageLimit };
  } catch (err) {
    console.error('getUserProjects error:', err);
    throw new Error('Failed to load projects.');
  }
}

/**
 * Get paginated public projects.
 * @param {Object|null} lastDoc
 * @param {number} [pageLimit=12]
 * @returns {Promise<{projects: Object[], lastDoc: Object|null, hasMore: boolean}>}
 */
export async function getPublicProjects(lastDoc, pageLimit = 12) {
  try {
    const db = getDB();
    let q = query(
      collection(db, 'projects'),
      where('isPrivate', '==', false),
      orderBy('createdAt', 'desc'),
      firestoreLimit(pageLimit)
    );
    if (lastDoc) q = query(q, startAfter(lastDoc));

    const snap = await getDocs(q);
    const projects = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const last = snap.docs[snap.docs.length - 1] || null;
    return { projects, lastDoc: last, hasMore: snap.docs.length === pageLimit };
  } catch (err) {
    console.error('getPublicProjects error:', err);
    throw new Error('Failed to load projects.');
  }
}

/**
 * Get trending public projects by star count.
 * @param {number} [maxLimit=10]
 * @returns {Promise<Object[]>}
 */
export async function getTrendingProjects(maxLimit = 10) {
  try {
    const db = getDB();
    const q = query(
      collection(db, 'projects'),
      where('isPrivate', '==', false),
      orderBy('starCount', 'desc'),
      firestoreLimit(maxLimit)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error('getTrendingProjects error:', err);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Stars / Forks
// ---------------------------------------------------------------------------

/**
 * Toggle star on a project.
 * @param {string} projectId
 * @param {string} uid
 * @returns {Promise<boolean>} true if now starred.
 */
export async function starProject(projectId, uid) {
  try {
    const db = getDB();
    const ref = doc(db, 'projects', projectId);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error('Project not found.');
    const starred = (snap.data().stars || []).includes(uid);

    await updateDoc(ref, {
      stars:     starred ? arrayRemove(uid) : arrayUnion(uid),
      starCount: increment(starred ? -1 : 1)
    });

    if (!starred) {
      const project = snap.data();
      if (project.authorId !== uid) {
        await createNotification(project.authorId, uid, {}, 'project_star', { projectId }).catch(() => {});
      }
    }

    return !starred;
  } catch (err) {
    console.error('starProject error:', err);
    throw new Error('Failed to star project.');
  }
}

/**
 * Fork a project (create a copy with the forking user as author).
 * @param {string} projectId
 * @param {string} uid - Forking user's UID.
 * @returns {Promise<Object>} The new forked project.
 */
export async function forkProject(projectId, uid) {
  try {
    const db = getDB();
    const snap = await getDoc(doc(db, 'projects', projectId));
    if (!snap.exists()) throw new Error('Project not found.');
    const original = snap.data();

    // Get forker's profile
    const userSnap = await getDoc(doc(db, 'users', uid));
    const user = userSnap.data() || {};

    const forkData = {
      ...original,
      authorId:       uid,
      authorName:     user.displayName   || '',
      authorUsername: user.username      || '',
      authorAvatar:   user.photoURL      || '',
      stars:          [],
      starCount:      0,
      forks:          0,
      views:          0,
      accessRequests: [],
      accessGranted:  [],
      forkedFrom:     projectId,
      title:          `${original.title} (fork)`,
      createdAt:      serverTimestamp(),
      updatedAt:      serverTimestamp()
    };

    const newRef = await addDoc(collection(db, 'projects'), forkData);
    // Increment fork counter on original
    await updateDoc(doc(db, 'projects', projectId), { forks: increment(1) });
    await updateDoc(doc(db, 'users', uid), { projectCount: increment(1) });

    return { id: newRef.id, ...forkData };
  } catch (err) {
    console.error('forkProject error:', err);
    throw new Error('Failed to fork project.');
  }
}

// ---------------------------------------------------------------------------
// Access control
// ---------------------------------------------------------------------------

/**
 * Request access to a private project.
 * @param {string} projectId
 * @param {string} uid
 * @param {string} [message]
 * @returns {Promise<void>}
 */
export async function requestAccess(projectId, uid, message = '') {
  try {
    const db = getDB();
    const snap = await getDoc(doc(db, 'projects', projectId));
    if (!snap.exists()) throw new Error('Project not found.');
    const project = snap.data();

    await updateDoc(doc(db, 'projects', projectId), {
      accessRequests: arrayUnion({ uid, message, requestedAt: new Date().toISOString() })
    });

    await createNotification(project.authorId, uid, {}, 'project_access', {
      projectId,
      message
    }).catch(() => {});
  } catch (err) {
    console.error('requestAccess error:', err);
    throw new Error('Failed to request access.');
  }
}

/**
 * Grant access to a user on a private project (owner only).
 * @param {string} projectId
 * @param {string} ownerUid
 * @param {string} requesterId
 * @returns {Promise<void>}
 */
export async function grantAccess(projectId, ownerUid, requesterId) {
  try {
    const db = getDB();
    const { data } = await assertOwner(db, projectId, ownerUid);

    // Remove from requests, add to granted
    const updatedRequests = (data.accessRequests || []).filter(r => r.uid !== requesterId);
    await updateDoc(doc(db, 'projects', projectId), {
      accessRequests: updatedRequests,
      accessGranted:  arrayUnion(requesterId)
    });

    await createNotification(requesterId, ownerUid, {}, 'project_access', {
      projectId,
      granted: true
    }).catch(() => {});
  } catch (err) {
    console.error('grantAccess error:', err);
    throw new Error(err.message || 'Failed to grant access.');
  }
}

/**
 * Revoke a user's access to a project (owner only).
 * @param {string} projectId
 * @param {string} ownerUid
 * @param {string} userId
 * @returns {Promise<void>}
 */
export async function revokeAccess(projectId, ownerUid, userId) {
  try {
    const db = getDB();
    await assertOwner(db, projectId, ownerUid);
    await updateDoc(doc(db, 'projects', projectId), {
      accessGranted: arrayRemove(userId)
    });
  } catch (err) {
    console.error('revokeAccess error:', err);
    throw new Error(err.message || 'Failed to revoke access.');
  }
}

// ---------------------------------------------------------------------------
// Views
// ---------------------------------------------------------------------------

/**
 * Increment view counter for a project.
 * @param {string} projectId
 * @returns {Promise<void>}
 */
export async function incrementProjectViews(projectId) {
  try {
    await updateDoc(doc(getDB(), 'projects', projectId), { views: increment(1) });
  } catch (err) {
    console.error('incrementProjectViews error:', err);
  }
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

/**
 * Search public projects by title prefix or tags.
 * @param {string} queryStr
 * @param {string[]} [tags=[]]
 * @param {number} [maxLimit=20]
 * @returns {Promise<Object[]>}
 */
export async function searchProjects(queryStr, tags = [], maxLimit = 20) {
  try {
    const db = getDB();
    const results = [];
    const seen = new Set();

    if (queryStr.trim()) {
      const q = query(
        collection(db, 'projects'),
        where('isPrivate', '==', false),
        where('title', '>=', queryStr),
        where('title', '<=', queryStr + '\uf8ff'),
        firestoreLimit(maxLimit)
      );
      const snap = await getDocs(q);
      snap.docs.forEach(d => {
        if (!seen.has(d.id)) {
          seen.add(d.id);
          results.push({ id: d.id, ...d.data() });
        }
      });
    }

    if (tags.length) {
      const q = query(
        collection(db, 'projects'),
        where('isPrivate', '==', false),
        where('tags', 'array-contains-any', tags.slice(0, 10)),
        firestoreLimit(maxLimit)
      );
      const snap = await getDocs(q);
      snap.docs.forEach(d => {
        if (!seen.has(d.id)) {
          seen.add(d.id);
          results.push({ id: d.id, ...d.data() });
        }
      });
    }

    return results.slice(0, maxLimit);
  } catch (err) {
    console.error('searchProjects error:', err);
    throw new Error('Search failed.');
  }
}

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

/**
 * Upload a file to the project's storage folder.
 * @param {string} projectId
 * @param {string} uid
 * @param {File} file
 * @param {Function} [onProgress]
 * @returns {Promise<{name: string, url: string, size: number, type: string}>}
 */
export async function uploadProjectFile(projectId, uid, file, onProgress) {
  try {
    const db = getDB();
    await assertOwner(db, projectId, uid);

    const path = `projects/${projectId}/${Date.now()}_${file.name}`;
    const url = await uploadFile(path, file, onProgress);

    const fileEntry = {
      name:       file.name,
      url,
      size:       file.size,
      type:       file.type,
      uploadedAt: new Date().toISOString()
    };

    await updateDoc(doc(db, 'projects', projectId), {
      files: arrayUnion(fileEntry)
    });

    return fileEntry;
  } catch (err) {
    console.error('uploadProjectFile error:', err);
    throw new Error(err.message || 'Failed to upload file.');
  }
}

/**
 * Get the list of uploaded files for a project (respects access rules).
 * @param {string} projectId
 * @param {string} currentUid
 * @returns {Promise<Object[]>}
 */
export async function getProjectFiles(projectId, currentUid) {
  try {
    const project = await getProject(projectId, currentUid);
    if (!project) throw new Error('Project not found or access denied.');
    return project.files || [];
  } catch (err) {
    console.error('getProjectFiles error:', err);
    throw new Error(err.message || 'Failed to load project files.');
  }
}
