import React, { createContext, useContext, useEffect, useState } from 'react';

const StoreContext = createContext();

export const useStore = () => {
  return useContext(StoreContext);
};

// Hook for localStorage
function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(error);
    }
  }, [key, value]);

  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === key && e.newValue !== null) {
        try {
          setValue(JSON.parse(e.newValue));
        } catch (error) {
          console.error(error);
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key]);

  return [value, setValue];
}

export const StoreProvider = ({ children }) => {
  const [participants, setParticipants] = useLocalStorage('spin_participants', []);
  const [prizes, setPrizes] = useLocalStorage('spin_prizes', []);
  const [winners, setWinners] = useLocalStorage('spin_winners', []);
  const [settings, setSettings] = useLocalStorage('spin_settings', {
    activeSession: 'Sesi 1',
    spinDuration: 5,
    columns: 1,
    backgroundUrl: '',
    screenMode: 'landscape', // 'landscape' | 'portrait' (768x1024 videotron)
    title: 'UNDIAN DOORPRIZE',
    titleColor: '#ffffff',
    slotBg: 'rgba(30, 41, 59, 0.8)',
    slotBorder: 'rgba(255, 255, 255, 0.2)',
    slotText: '#ffffff',
    btnColor: '#10b981',
    overlayOpacity: 0.4,
    allowDuplicate: false,
    prizeTextColor: '#ffffff',
    spinShadowColor: '#000000',
  });

  // One-time migration: earlier versions defaulted title/prize text to amber (#fbbf24).
  // Admins who never touched those color pickers should now see the new white default.
  useEffect(() => {
    setSettings(prev => {
      const patch = {};
      if (prev.titleColor === '#fbbf24') patch.titleColor = '#ffffff';
      if (prev.prizeTextColor === '#fbbf24') patch.prizeTextColor = '#ffffff';
      return Object.keys(patch).length ? { ...prev, ...patch } : prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = {
    participants, setParticipants,
    prizes, setPrizes,
    winners, setWinners,
    settings, setSettings
  };

  return (
    <StoreContext.Provider value={value}>
      {children}
    </StoreContext.Provider>
  );
};
