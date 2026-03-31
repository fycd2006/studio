import { useState, useEffect, useCallback, useRef } from 'react';
import { useFirestore, useUser, setDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { doc, onSnapshot, deleteField } from 'firebase/firestore';

export interface FieldPresence {
  uid: string;
  name: string;
  timestamp: number;
}

export type PresenceData = Record<string, FieldPresence>;

export function usePresence(planId: string | null) {
  const { user } = useUser();
  const db = useFirestore();
  const [presenceData, setPresenceData] = useState<PresenceData>({});
  
  // Track fields locked by THIS user defensively so we can unlock them on unmount
  const lockedFieldsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!db || !planId) {
      setPresenceData({});
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
        
        for (const [key, val] of Object.entries(data)) {
          const presence = val as FieldPresence | undefined;
          if (presence && presence.uid && presence.timestamp && (now - presence.timestamp < 5 * 60 * 1000)) {
            activeData[key] = presence;
          }
        }
        setPresenceData(activeData);
      } else {
        setPresenceData({});
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
        // We use setDocumentNonBlocking to avoid errors if doc doesn't exist
        setDocumentNonBlocking(doc(db, 'planPresence', planId), updates, { merge: true });
        lockedFieldsRef.current.clear();
      }
    };
  }, [db, planId, user]);

  const lockField = useCallback((fieldName: string) => {
    if (!db || !user || !planId) return;
    lockedFieldsRef.current.add(fieldName);
    const docRef = doc(db, 'planPresence', planId);
    setDocumentNonBlocking(docRef, {
      [fieldName]: {
        uid: user.uid,
        name: user.displayName || '使用者',
        timestamp: Date.now(),
      }
    }, { merge: true });
  }, [db, user, planId]);

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

  return { lockField, unlockField, isLockedByOther, getLockInfo, presenceData };
}
