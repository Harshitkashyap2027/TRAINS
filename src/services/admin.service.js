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
  serverTimestamp,
  getCountFromServer,
  writeBatch,
  Timestamp
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getDB } from './firebase.js';
import { createNotification } from './notification.service.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Assert the caller has admin role. Throws if not.
 * @param {string} adminUid
 */
async function assertAdmin(adminUid) {
  const snap = await getDoc(doc(getDB(), 'users', adminUid));
  if (!snap.exists() || !['admin', 'superadmin'].includes(snap.data().role)) {
    throw new Error('Unauthorized: admin access required.');
  }
}

/**
 * Log an admin action to the 'auditLog' collection.
 * @param {string} adminUid
 * @param {string} action
 * @param {string} targetId
 * @param {Object} [details={}]
 * @returns {Promise<void>}
 */
export async function logAdminAction(adminUid, action, targetId, details = {}) {
  try {
    const db = getDB();
    await addDoc(collection(db, 'auditLog'), {
      adminUid,
      action,
      targetId,
      details,
      createdAt: serverTimestamp()
    });
  } catch (err) {
    console.error('logAdminAction error:', err);
  }
}

// ---------------------------------------------------------------------------
// Platform Stats
// ---------------------------------------------------------------------------

/**
 * Get high-level platform statistics.
 * @returns {Promise<Object>}
 */
export async function getAdminStats() {
  try {
    const db = getDB();
    const todayStart = Timestamp.fromDate(new Date(new Date().setHours(0, 0, 0, 0)));

    const [
      totalUsersSnap,
      totalPostsSnap,
      totalProjectsSnap,
      pendingReportsSnap,
      activeTodaySnap
    ] = await Promise.all([
      getCountFromServer(collection(db, 'users')),
      getCountFromServer(query(collection(db, 'posts'), where('isDeleted', '==', false))),
      getCountFromServer(collection(db, 'projects')),
      getCountFromServer(query(collection(db, 'reports'), where('status', '==', 'pending'))),
      getCountFromServer(query(collection(db, 'users'), where('lastSeen', '>=', todayStart)))
    ]);

    return {
      totalUsers:     totalUsersSnap.data().count,
      totalPosts:     totalPostsSnap.data().count,
      totalProjects:  totalProjectsSnap.data().count,
      pendingReports: pendingReportsSnap.data().count,
      activeToday:    activeTodaySnap.data().count
    };
  } catch (err) {
    console.error('getAdminStats error:', err);
    throw new Error('Failed to load admin stats.');
  }
}

// ---------------------------------------------------------------------------
// User management
// ---------------------------------------------------------------------------

/**
 * Get paginated list of users with optional filter.
 * @param {Object|null} lastDoc
 * @param {number} [pageLimit=20]
 * @param {'all'|'banned'|'verified'|'admin'} [filter='all']
 * @returns {Promise<{users: Object[], lastDoc: Object|null, hasMore: boolean}>}
 */
export async function getAllUsers(lastDoc, pageLimit = 20, filter = 'all') {
  try {
    const db = getDB();
    const constraints = [orderBy('createdAt', 'desc'), firestoreLimit(pageLimit)];

    if (filter === 'banned')   constraints.unshift(where('isBanned',   '==', true));
    if (filter === 'verified') constraints.unshift(where('isVerified', '==', true));
    if (filter === 'admin')    constraints.unshift(where('role',       'in', ['admin', 'superadmin']));

    let q = query(collection(db, 'users'), ...constraints);
    if (lastDoc) q = query(q, startAfter(lastDoc));

    const snap = await getDocs(q);
    const users = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const last = snap.docs[snap.docs.length - 1] || null;
    return { users, lastDoc: last, hasMore: snap.docs.length === pageLimit };
  } catch (err) {
    console.error('getAllUsers error:', err);
    throw new Error('Failed to load users.');
  }
}

/**
 * Ban a user.
 * @param {string} uid
 * @param {string} adminUid
 * @param {string} reason
 * @param {number|null} duration - Duration in hours, or null for permanent.
 * @returns {Promise<void>}
 */
export async function banUser(uid, adminUid, reason, duration = null) {
  try {
    await assertAdmin(adminUid);
    const db = getDB();
    const bannedUntil = duration
      ? Timestamp.fromMillis(Date.now() + duration * 60 * 60 * 1000)
      : null;

    await updateDoc(doc(db, 'users', uid), {
      isBanned:    true,
      bannedUntil,
      banReason:   reason,
      bannedAt:    serverTimestamp(),
      bannedBy:    adminUid
    });

    await logAdminAction(adminUid, 'ban_user', uid, { reason, duration });
  } catch (err) {
    console.error('banUser error:', err);
    throw new Error(err.message || 'Failed to ban user.');
  }
}

/**
 * Unban a user.
 * @param {string} uid
 * @param {string} adminUid
 * @returns {Promise<void>}
 */
export async function unbanUser(uid, adminUid) {
  try {
    await assertAdmin(adminUid);
    const db = getDB();
    await updateDoc(doc(db, 'users', uid), {
      isBanned:    false,
      bannedUntil: null,
      banReason:   null,
      unbannedAt:  serverTimestamp(),
      unbannedBy:  adminUid
    });
    await logAdminAction(adminUid, 'unban_user', uid, {});
  } catch (err) {
    console.error('unbanUser error:', err);
    throw new Error(err.message || 'Failed to unban user.');
  }
}

/**
 * Delete all posts and projects authored by a user.
 * @param {string} uid
 * @param {string} adminUid
 * @returns {Promise<{postsDeleted: number, projectsDeleted: number}>}
 */
export async function deleteUserContent(uid, adminUid) {
  try {
    await assertAdmin(adminUid);
    const db = getDB();

    const [postSnap, projectSnap] = await Promise.all([
      getDocs(query(collection(db, 'posts'),    where('authorId', '==', uid))),
      getDocs(query(collection(db, 'projects'), where('authorId', '==', uid)))
    ]);

    const batch = writeBatch(db);
    postSnap.docs.forEach(d => batch.update(d.ref, { isDeleted: true, deletedBy: adminUid }));
    projectSnap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();

    await logAdminAction(adminUid, 'delete_user_content', uid, {
      postsDeleted:    postSnap.size,
      projectsDeleted: projectSnap.size
    });

    return { postsDeleted: postSnap.size, projectsDeleted: projectSnap.size };
  } catch (err) {
    console.error('deleteUserContent error:', err);
    throw new Error(err.message || 'Failed to delete user content.');
  }
}

// ---------------------------------------------------------------------------
// Reports / Moderation
// ---------------------------------------------------------------------------

/**
 * Get paginated moderation reports.
 * @param {'pending'|'resolved'|'dismissed'} [status='pending']
 * @param {Object|null} lastDoc
 * @param {number} [pageLimit=20]
 * @returns {Promise<{reports: Object[], lastDoc: Object|null, hasMore: boolean}>}
 */
export async function getReports(status = 'pending', lastDoc, pageLimit = 20) {
  try {
    const db = getDB();
    let q = query(
      collection(db, 'reports'),
      where('status', '==', status),
      orderBy('createdAt', 'desc'),
      firestoreLimit(pageLimit)
    );
    if (lastDoc) q = query(q, startAfter(lastDoc));

    const snap = await getDocs(q);
    const reports = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const last = snap.docs[snap.docs.length - 1] || null;
    return { reports, lastDoc: last, hasMore: snap.docs.length === pageLimit };
  } catch (err) {
    console.error('getReports error:', err);
    throw new Error('Failed to load reports.');
  }
}

/**
 * Resolve a report with an action taken.
 * @param {string} reportId
 * @param {string} adminUid
 * @param {string} action - e.g. 'warned', 'banned', 'content_removed'
 * @param {string} [note]
 * @returns {Promise<void>}
 */
export async function resolveReport(reportId, adminUid, action, note = '') {
  try {
    await assertAdmin(adminUid);
    const db = getDB();
    await updateDoc(doc(db, 'reports', reportId), {
      status:      'resolved',
      action,
      note,
      resolvedBy:  adminUid,
      resolvedAt:  serverTimestamp()
    });
    await logAdminAction(adminUid, 'resolve_report', reportId, { action, note });
  } catch (err) {
    console.error('resolveReport error:', err);
    throw new Error(err.message || 'Failed to resolve report.');
  }
}

/**
 * Dismiss a report as a false positive.
 * @param {string} reportId
 * @param {string} adminUid
 * @param {string} [note]
 * @returns {Promise<void>}
 */
export async function dismissReport(reportId, adminUid, note = '') {
  try {
    await assertAdmin(adminUid);
    const db = getDB();
    await updateDoc(doc(db, 'reports', reportId), {
      status:      'dismissed',
      note,
      resolvedBy:  adminUid,
      resolvedAt:  serverTimestamp()
    });
    await logAdminAction(adminUid, 'dismiss_report', reportId, { note });
  } catch (err) {
    console.error('dismissReport error:', err);
    throw new Error(err.message || 'Failed to dismiss report.');
  }
}

/**
 * Delete the content referenced by a report.
 * @param {string} reportId
 * @param {string} adminUid
 * @returns {Promise<void>}
 */
export async function deleteReportedContent(reportId, adminUid) {
  try {
    await assertAdmin(adminUid);
    const db = getDB();
    const snap = await getDoc(doc(db, 'reports', reportId));
    if (!snap.exists()) throw new Error('Report not found.');
    const report = snap.data();

    if (report.type === 'post' && report.postId) {
      await updateDoc(doc(db, 'posts', report.postId), {
        isDeleted: true,
        deletedBy: adminUid,
        deletedAt: serverTimestamp()
      });
    } else if (report.type === 'project' && report.projectId) {
      await deleteDoc(doc(db, 'projects', report.projectId));
    } else if (report.type === 'user' && report.targetUid) {
      await updateDoc(doc(db, 'users', report.targetUid), {
        isBanned:  true,
        banReason: `Report #${reportId}`,
        bannedBy:  adminUid,
        bannedAt:  serverTimestamp()
      });
    }

    await updateDoc(doc(db, 'reports', reportId), {
      status:     'resolved',
      action:     'content_deleted',
      resolvedBy: adminUid,
      resolvedAt: serverTimestamp()
    });

    await logAdminAction(adminUid, 'delete_reported_content', reportId, { type: report.type });
  } catch (err) {
    console.error('deleteReportedContent error:', err);
    throw new Error(err.message || 'Failed to delete reported content.');
  }
}

// ---------------------------------------------------------------------------
// Analytics / Charts
// ---------------------------------------------------------------------------

/**
 * Get post and project counts per day for the last N days.
 * @param {number} [days=7]
 * @returns {Promise<{date: string, posts: number, projects: number}[]>}
 */
export async function getContentStats(days = 7) {
  try {
    const db = getDB();
    const results = [];
    const now = Date.now();

    for (let i = days - 1; i >= 0; i--) {
      const dayStart  = new Date(now - i * 86400000);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart.getTime() + 86400000);

      const startTs = Timestamp.fromDate(dayStart);
      const endTs   = Timestamp.fromDate(dayEnd);

      const [postsSnap, projectsSnap] = await Promise.all([
        getCountFromServer(query(collection(db, 'posts'),    where('createdAt', '>=', startTs), where('createdAt', '<', endTs))),
        getCountFromServer(query(collection(db, 'projects'), where('createdAt', '>=', startTs), where('createdAt', '<', endTs)))
      ]);

      results.push({
        date:     dayStart.toISOString().slice(0, 10),
        posts:    postsSnap.data().count,
        projects: projectsSnap.data().count
      });
    }

    return results;
  } catch (err) {
    console.error('getContentStats error:', err);
    throw new Error('Failed to load content stats.');
  }
}

/**
 * Get user registration counts per day for the last N days.
 * @param {number} [days=7]
 * @returns {Promise<{date: string, newUsers: number}[]>}
 */
export async function getUserGrowthStats(days = 7) {
  try {
    const db = getDB();
    const results = [];
    const now = Date.now();

    for (let i = days - 1; i >= 0; i--) {
      const dayStart = new Date(now - i * 86400000);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart.getTime() + 86400000);

      const startTs = Timestamp.fromDate(dayStart);
      const endTs   = Timestamp.fromDate(dayEnd);

      const snap = await getCountFromServer(
        query(collection(db, 'users'),
          where('createdAt', '>=', startTs),
          where('createdAt', '<',  endTs))
      );

      results.push({
        date:     dayStart.toISOString().slice(0, 10),
        newUsers: snap.data().count
      });
    }

    return results;
  } catch (err) {
    console.error('getUserGrowthStats error:', err);
    throw new Error('Failed to load growth stats.');
  }
}

// ---------------------------------------------------------------------------
// Feature flags / Verification
// ---------------------------------------------------------------------------

/**
 * Toggle featured status on a project.
 * @param {string} projectId
 * @param {boolean} featured
 * @returns {Promise<void>}
 */
export async function featureProject(projectId, featured) {
  try {
    await updateDoc(doc(getDB(), 'projects', projectId), {
      isFeatured: featured,
      featuredAt: featured ? serverTimestamp() : null
    });
  } catch (err) {
    console.error('featureProject error:', err);
    throw new Error('Failed to update project feature status.');
  }
}

/**
 * Toggle verification badge on a user.
 * @param {string} uid
 * @param {boolean} verified
 * @returns {Promise<void>}
 */
export async function verifyUser(uid, verified) {
  try {
    await updateDoc(doc(getDB(), 'users', uid), {
      isVerified:  verified,
      verifiedAt:  verified ? serverTimestamp() : null
    });
  } catch (err) {
    console.error('verifyUser error:', err);
    throw new Error('Failed to update verification status.');
  }
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

/**
 * Send a system notification to a specific user.
 * @param {string} toUid
 * @param {string} message
 * @returns {Promise<void>}
 */
export async function sendSystemNotification(toUid, message) {
  try {
    const db = getDB();
    await addDoc(collection(db, 'notifications'), {
      toUid,
      fromUid:         'system',
      fromDisplayName: 'AETHER',
      fromPhotoURL:    '',
      fromUsername:    'system',
      type:            'system',
      data:            { message },
      isRead:          false,
      createdAt:       serverTimestamp()
    });
  } catch (err) {
    console.error('sendSystemNotification error:', err);
    throw new Error('Failed to send system notification.');
  }
}

/**
 * Broadcast a system notification to ALL users.
 * This uses batched writes in chunks of 500.
 * @param {string} message
 * @returns {Promise<number>} Count of notifications sent.
 */
export async function broadcastNotification(message) {
  try {
    const db = getDB();
    const usersSnap = await getDocs(collection(db, 'users'));
    const uids = usersSnap.docs.map(d => d.id);
    let sent = 0;

    // Process in chunks of 500 (Firestore batch limit)
    for (let i = 0; i < uids.length; i += 500) {
      const chunk = uids.slice(i, i + 500);
      const batch = writeBatch(db);
      chunk.forEach(uid => {
        const ref = doc(collection(db, 'notifications'));
        batch.set(ref, {
          toUid:           uid,
          fromUid:         'system',
          fromDisplayName: 'AETHER',
          fromPhotoURL:    '',
          fromUsername:    'system',
          type:            'system',
          data:            { message },
          isRead:          false,
          createdAt:       serverTimestamp()
        });
      });
      await batch.commit();
      sent += chunk.length;
    }

    return sent;
  } catch (err) {
    console.error('broadcastNotification error:', err);
    throw new Error('Failed to broadcast notification.');
  }
}

// ---------------------------------------------------------------------------
// Audit log
// ---------------------------------------------------------------------------

/**
 * Get the most recent admin audit log entries.
 * @param {number} [maxLimit=50]
 * @returns {Promise<Object[]>}
 */
export async function getAuditLog(maxLimit = 50) {
  try {
    const db = getDB();
    const q = query(
      collection(db, 'auditLog'),
      orderBy('createdAt', 'desc'),
      firestoreLimit(maxLimit)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error('getAuditLog error:', err);
    throw new Error('Failed to load audit log.');
  }
}
