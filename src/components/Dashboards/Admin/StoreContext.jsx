import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../../../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

const StoreContext = createContext();

export function StoreProvider({ children }) {
  const [selectedStore, setSelectedStore] = useState(null);
  const [isEmployee, setIsEmployee] = useState(false);
  const [userStore, setUserStore] = useState(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          // Check if user is an employee
          const userQuery = query(collection(db, 'users'), where('email', '==', user.email));
          const userSnapshot = await getDocs(userQuery);
          
          if (!userSnapshot.empty) {
            const userData = userSnapshot.docs[0].data();
            
            if (userData.role === 'Employee' && userData.storeId) {
              // Employee - automatically set their store
              setIsEmployee(true);
              setUserStore({
                id: userData.storeId,
                name: userData.storeName || 'Store'
              });
              setSelectedStore({
                id: userData.storeId,
                name: userData.storeName || 'Store'
              });
            } else if (userData.role === 'Admin') {
              // Admin - can select stores
              setIsEmployee(false);
              const stored = localStorage.getItem('selectedStore');
              if (stored) {
                setSelectedStore(JSON.parse(stored));
              }
            }
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      } else {
        // User logged out
        setIsEmployee(false);
        setUserStore(null);
        setSelectedStore(null);
      }
    });

    return () => unsubscribe();
  }, []);

  const selectStore = (store) => {
    // Only allow store selection for admins
    if (!isEmployee) {
      setSelectedStore(store);
      localStorage.setItem('selectedStore', JSON.stringify(store));
    }
  };

  const clearStore = () => {
    // Only allow clearing store for admins
    if (!isEmployee) {
      setSelectedStore(null);
      localStorage.removeItem('selectedStore');
    }
  };

  return (
    <StoreContext.Provider value={{ 
      selectedStore, 
      selectStore, 
      clearStore, 
      isEmployee, 
      userStore 
    }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  return useContext(StoreContext);
} 