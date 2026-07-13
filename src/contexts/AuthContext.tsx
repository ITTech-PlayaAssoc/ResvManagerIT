import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, getRedirectResult } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: 'owner' | 'admin' | 'supervisor';
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    // Process redirect result if any, to avoid redirect loops on some environments
    const redirectPromise = getRedirectResult(auth).catch((error) => {
      console.error("Error in getRedirectResult", error);
    });

    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      await redirectPromise; // Ensure redirect is processed before completing state update
      
      if (!isMounted) return;

      setUser(currentUser);
      if (currentUser) {
        try {
          // Fetch or create user profile in Firestore
          const userRef = doc(db, 'users', currentUser.uid);
          const userSnap = await getDoc(userRef);
          
          if (!isMounted) return;

          if (userSnap.exists()) {
            let userProfile = userSnap.data() as UserProfile;
            
            // Forzar rol de propietario para el email principal
            if (currentUser.email === 'sjimenez@playaassoc.com' && userProfile.role !== 'owner') {
              userProfile.role = 'owner';
              try {
                await setDoc(userRef, userProfile);
              } catch (e) {
                console.error("Error actualizando rol a owner", e);
              }
            }
            
            setProfile(userProfile);
          } else {
            const isOwner = currentUser.email === 'sjimenez@playaassoc.com';
            const newProfile: UserProfile = {
              uid: currentUser.uid,
              email: currentUser.email,
              displayName: currentUser.displayName,
              photoURL: currentUser.photoURL,
              role: isOwner ? 'owner' : 'supervisor' // Default role
            };
            
            try {
              await setDoc(userRef, newProfile);
              if (isMounted) setProfile(newProfile);
            } catch (e) {
              console.error("Error creating user profile", e);
              // Fallback profile if rules reject write
              if (isMounted) setProfile(newProfile);
            }
          }
        } catch (err) {
          console.error("Error fetching user profile", err);
          const isOwner = currentUser.email === 'sjimenez@playaassoc.com';
          // Fallback if offline or network error
          if (isMounted) setProfile({
            uid: currentUser.uid,
            email: currentUser.email,
            displayName: currentUser.displayName,
            photoURL: currentUser.photoURL,
            role: isOwner ? 'owner' : 'supervisor' // Default role
          });
        }
      } else {
        setProfile(null);
      }
      if (isMounted) setLoading(false);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
