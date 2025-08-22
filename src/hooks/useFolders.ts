'use client';

import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Folder } from '@/types';
import { useAuth } from './useAuth';

export function useFolders() {
  const { user } = useAuth();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setFolders([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const foldersQuery = query(
        collection(db, 'users', user.uid, 'folders'),
        orderBy('updatedAt', 'desc')
      );

      const unsubscribe = onSnapshot(
        foldersQuery,
        (snapshot) => {
          const foldersData: Folder[] = [];
          snapshot.forEach((doc) => {
            foldersData.push({ id: doc.id, ...doc.data() } as Folder);
          });
          setFolders(foldersData);
          setLoading(false);
        },
        (err) => {
          console.error('Error fetching folders:', err);
          setError('Failed to load folders');
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.error('Error setting up folders listener:', err);
      setError('Failed to set up folders listener');
      setLoading(false);
    }
  }, [user]);

  return { folders, loading, error };
}
