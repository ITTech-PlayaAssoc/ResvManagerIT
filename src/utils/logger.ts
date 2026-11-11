import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { generateUUID } from './uuid';

export interface ActivityLog {
  id: string;
  timestamp: string; // ISO string
  createdAt?: any;
  userId: string;
  userName: string;
  userEmail: string;
  userRole?: string;
  userPhoto?: string | null;
  action: string;
  category: 'list' | 'reservation' | 'user' | 'settings' | 'auth';
  details?: string;
}

export async function logActivity({
  action,
  category = 'list',
  details = '',
  userOverride
}: {
  action: string;
  category?: 'list' | 'reservation' | 'user' | 'settings' | 'auth';
  details?: string;
  userOverride?: {
    uid?: string;
    displayName?: string | null;
    email?: string | null;
    role?: string;
    photoURL?: string | null;
  };
}) {
  try {
    const currentUser = auth.currentUser;
    const userId = userOverride?.uid || currentUser?.uid || 'anonymous';
    const userName = userOverride?.displayName || currentUser?.displayName || userOverride?.email || currentUser?.email || 'Usuario';
    const userEmail = userOverride?.email || currentUser?.email || '';
    const userRole = userOverride?.role || '';
    const userPhoto = userOverride?.photoURL || currentUser?.photoURL || null;

    const logId = generateUUID();
    const newLog: ActivityLog = {
      id: logId,
      timestamp: new Date().toISOString(),
      createdAt: serverTimestamp(),
      userId,
      userName,
      userEmail,
      userRole,
      userPhoto,
      action,
      category,
      details
    };

    const logsCol = collection(db, 'logs');
    await addDoc(logsCol, newLog);
  } catch (error) {
    console.warn('Could not record activity log:', error);
  }
}
