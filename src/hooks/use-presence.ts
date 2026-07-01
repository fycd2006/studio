import { useState, useEffect, useCallback, useRef } from 'react';
import { useFirestore, useUser, setDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { doc, onSnapshot, deleteField } from 'firebase/firestore';

export interface FieldPresence {
  uid: string;
  name: string;
  timestamp: number;
}

export type PresenceData = Record<string, FieldPresence>;

const ADJECTIVES = ['熱情', '活力', '勇敢', '聰明', '溫暖', '開心', '熱血', '溫柔', '積極', '樂觀'];
const ANIMALS = ['企鵝', '棕熊', '松鼠', '小鹿', '海豚', '樹懶', '狐狸', '無尾熊', '小貓', '兔子'];

export function getRandomNickname(uid: string): string {
  if (!uid) return '神秘協協協協作員';
  let hash = 0;
  for (let i = 0; i < uid.length; i++) {
    hash = uid.charCodeAt(i) + ((hash << 5) - hash);
  }
  const adj = ADJECTIVES[Math.abs(hash) % ADJECTIVES.length];
  const anim = ANIMALS[Math.abs(hash * 31) % ANIMALS.length];
  return `${adj}的${anim}`;
}

export function usePresence(planId: string | null) {
  const { user } = useUser();
  const db = useFirestore();
  const [presenceData, setPresenceData] = useState<PresenceData>({});
  const [activeViewers, setActiveViewers] = useState<FieldPresence[]>([]);
  
  // Track fields locked by THIS user defensively so we can unlock them on unmount
  const lockedFieldsRef = useRef<Set<string>>(new Set());

  // Determine user display name or fallback to a deterministic random animal nickname
  const getMyName = useCallback(() => {
    if (!user) return '訪客';
    if (user.displayName) return user.displayName;
    if (typeof window !== 'undefined') {
      const localName = localStorage.getItem('camp-user-nickname');
      if (localName) return localName;
    }
    return getRandomNickname(user.uid);
  }, [user]);

  useEffect(() => {
    if (!db || !planId) {
      setPresenceData({});
      setActiveViewers([]);
      return;
    }
    
    let isUnmounted = false;
    const docRef = doc(db, 'planPresence', planId);
    
    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (isUnmounted) return;
      if (snapshot.exists()) {
        const data = snapshot.data();
        const now = Date.now();
        const activeData: PresenceData = {};
        const viewersList: FieldPresence[] = [];
        
        for (const [key, val] of Object.entries(data)) {
          const presence = val as FieldPresence | undefined;
          // Filter out entries older than 2 minutes
          if (presence && presence.uid && presence.timestamp && (now - presence.timestamp < 2 * 60 * 1000)) {
            if (key.startsWith('viewer_')) {
              if (!viewersList.some(v => v.uid === presence.uid)) {
                viewersList.push(presence);
              }
            } else {
              activeData[key] = presence;
            }
          }
        }
        setPresenceData(activeData);
        setActiveViewers(viewersList);
      } else {
        setPresenceData({});
        setActiveViewers([]);
      }
    });

    return () => {
      isUnmounted = true;
      unsubscribe();
      // On unmount or planId change, unlock everything THIS user had locked
      if (lockedFieldsRef.current.size > 0 && db && user) {
        const updates: Record<string, any> = {};
        lockedFieldsRef.current.forEach(field => {
          updates[field] = deleteField();
        });
        setDocumentNonBlocking(doc(db, 'planPresence', planId), updates, { merge: true });
        lockedFieldsRef.current.clear();
      }
    };
  }, [db, planId, user]);

  // Handle active viewer registration & heartbeat (every 30 seconds)
  useEffect(() => {
    if (!db || !user || !planId) return;

    const docRef = doc(db, 'planPresence', planId);
    const myName = getMyName();
    
    const registerViewer = () => {
      setDocumentNonBlocking(docRef, {
        [`viewer_${user.uid}`]: {
          uid: user.uid,
          name: myName,
          timestamp: Date.now(),
        }
      }, { merge: true });
    };

    registerViewer();
    const interval = setInterval(registerViewer, 30000);

    return () => {
      clearInterval(interval);
      // Clean up viewer on unmount
      setDocumentNonBlocking(docRef, {
        [`viewer_${user.uid}`]: deleteField()
      }, { merge: true });
    };
  }, [db, user, planId, getMyName]);

  const lockField = useCallback((fieldName: string) => {
    if (!db || !user || !planId) return;
    lockedFieldsRef.current.add(fieldName);
    const docRef = doc(db, 'planPresence', planId);
    const myName = getMyName();
    
    setDocumentNonBlocking(docRef, {
      [fieldName]: {
        uid: user.uid,
        name: myName,
        timestamp: Date.now(),
      }
    }, { merge: true });
  }, [db, user, planId, getMyName]);

  const unlockField = useCallback((fieldName: string) => {
    if (!db || !user || !planId) return;
    lockedFieldsRef.current.delete(fieldName);
    const docRef = doc(db, 'planPresence', planId);
    setDocumentNonBlocking(docRef, {
      [fieldName]: deleteField()
    }, { merge: true });
  }, [db, user, planId]);

  // Returns true if locked by SOMEONE ELSE
  const isLockedByOther = useCallback((fieldName: string) => {
    if (!user) return false;
    const presence = presenceData[fieldName];
    return !!(presence && presence.uid !== user.uid);
  }, [presenceData, user]);

  const getLockInfo = useCallback((fieldName: string) => {
    if (!user) return null;
    const presence = presenceData[fieldName];
    if (presence && presence.uid !== user.uid) {
      return presence;
    }
    return null;
  }, [presenceData, user]);

  return { lockField, unlockField, isLockedByOther, getLockInfo, presenceData, activeViewers };
}
