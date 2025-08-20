import React, { createContext, useContext, useState, useEffect } from 'react';

const StoreContext = createContext();

export function StoreProvider({ children }) {
  const [selectedStore, setSelectedStore] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem('selectedStore');
    if (stored) setSelectedStore(JSON.parse(stored));
  }, []);

  const selectStore = (store) => {
    setSelectedStore(store);
    localStorage.setItem('selectedStore', JSON.stringify(store));
  };

  const clearStore = () => {
    setSelectedStore(null);
    localStorage.removeItem('selectedStore');
  };

  return (
    <StoreContext.Provider value={{ selectedStore, selectStore, clearStore }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  return useContext(StoreContext);
} 