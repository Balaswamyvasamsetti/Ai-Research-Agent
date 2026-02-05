import React, { createContext, useContext, useState, useEffect } from 'react';

const AppContext = createContext();

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};

const loadFromStorage = (key, defaultValue) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
};

const saveToStorage = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage errors
  }
};

export const AppProvider = ({ children }) => {
  const [conversations, setConversations] = useState(() => 
    loadFromStorage('conversations', [])
  );
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState(() => 
    loadFromStorage('documents', [])
  );
  const [selectedDocuments, setSelectedDocuments] = useState(() => 
    loadFromStorage('selectedDocuments', [])
  );
  const [documentsLoaded, setDocumentsLoaded] = useState(false);
  
  // Resume Analyzer State
  const [resumeData, setResumeData] = useState(() => 
    loadFromStorage('resumeData', {
      resume: null,
      jobDescription: '',
      analysis: null,
      loading: false
    })
  );

  useEffect(() => {
    saveToStorage('conversations', conversations);
  }, [conversations]);

  useEffect(() => {
    saveToStorage('documents', documents);
  }, [documents]);

  useEffect(() => {
    saveToStorage('selectedDocuments', selectedDocuments);
  }, [selectedDocuments]);

  useEffect(() => {
    saveToStorage('resumeData', resumeData);
  }, [resumeData]);

  const value = {
    conversations,
    setConversations,
    loading,
    setLoading,
    documents,
    setDocuments,
    selectedDocuments,
    setSelectedDocuments,
    documentsLoaded,
    setDocumentsLoaded,
    resumeData,
    setResumeData,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};