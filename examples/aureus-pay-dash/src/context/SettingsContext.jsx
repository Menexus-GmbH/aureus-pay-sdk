import React, { createContext, useContext, useState, useEffect } from 'react';

const SettingsContext = createContext();

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within SettingsProvider');
  }
  return context;
};

export const SettingsProvider = ({ children }) => {
  const [apiKey, setApiKey] = useState('');
  const [terminal, setTerminal] = useState(null);
  const [businessInfo, setBusinessInfo] = useState(null);
  const [selectedChains, setSelectedChains] = useState([]);
  const [isConfigured, setIsConfigured] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('aureus_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setApiKey(parsed.apiKey || '');
        setSelectedChains(parsed.selectedChains || []);
        setIsConfigured(parsed.isConfigured || false);
        setBusinessInfo(parsed.businessInfo || null);
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    }
  }, []);

  // Save to localStorage when settings change
  const saveSettings = (newApiKey, newChains, configured, newTerminal = null, newBusinessInfo = null) => {
    const settings = {
      apiKey: newApiKey,
      selectedChains: newChains,
      isConfigured: configured,
      businessInfo: newBusinessInfo
    };
    localStorage.setItem('aureus_settings', JSON.stringify(settings));
    setApiKey(newApiKey);
    setSelectedChains(newChains);
    setIsConfigured(configured);
    if (newTerminal) setTerminal(newTerminal);
    if (newBusinessInfo) setBusinessInfo(newBusinessInfo);
  };

  const clearSettings = () => {
    localStorage.removeItem('aureus_settings');
    setApiKey('');
    setTerminal(null);
    setBusinessInfo(null);
    setSelectedChains([]);
    setIsConfigured(false);
  };

  return (
    <SettingsContext.Provider
      value={{
        apiKey,
        terminal,
        businessInfo,
        selectedChains,
        isConfigured,
        setTerminal,
        setBusinessInfo,
        saveSettings,
        clearSettings
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};