import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from 'firebase/auth';
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
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          // Fetch or create user profile in Firestore
          const userRef = doc(db, 'users', currentUser.uid);
          const userSnap = await getDoc(userRef);
          
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
              setProfile(newProfile);
            } catch (e) {
              console.error("Error creating user profile", e);
              // Fallback profile if rules reject write
              setProfile(newProfile);
            }
          }
        } catch (err) {
          console.error("Error fetching user profile", err);
          const isOwner = currentUser.email === 'sjimenez@playaassoc.com';
          // Fallback if offline or network error
          setProfile({
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
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
