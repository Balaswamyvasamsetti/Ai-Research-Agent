import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box, useMediaQuery } from '@mui/material';
import { ThemeModeProvider, useThemeMode } from './contexts/ThemeContext';
import { AppProvider } from './contexts/AppContext';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import QueryInterface from './pages/QueryInterface';
import SystemMetrics from './pages/SystemMetrics';
import DocumentUpload from './pages/DocumentUpload';
import ResumeAnalyzer from './pages/ResumeAnalyzer';
import LoadingScreen from './components/LoadingScreen';
import './App.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,
      cacheTime: 300000,
      refetchOnWindowFocus: false,
    },
  },
});

function AppContent() {
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { theme } = useThemeMode();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
      document.body.classList.add('app-loaded');
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [isMobile]);

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Box sx={{ display: 'flex', minHeight: '100vh' }}>
          <Sidebar 
            open={sidebarOpen} 
            onToggle={() => setSidebarOpen(!sidebarOpen)}
            isMobile={isMobile}
          />
          
          <Box
            component="main"
            sx={{
              flexGrow: 1,
              minHeight: '100vh',
              backgroundColor: 'background.default',
              ml: 0,
            }}
          >
            <TopBar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
            
            <Box sx={{ p: { xs: 2, sm: 3 } }}>
              <Routes>
                <Route path="/" element={<Navigate to="/query" replace />} />
                <Route path="/query" element={<QueryInterface />} />
                <Route path="/resume" element={<ResumeAnalyzer />} />
                <Route path="/metrics" element={<SystemMetrics />} />
                <Route path="/upload" element={<DocumentUpload />} />
              </Routes>
            </Box>
          </Box>
        </Box>
      </Router>
    </ThemeProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeModeProvider>
        <AppProvider>
          <AppContent />
        </AppProvider>
      </ThemeModeProvider>
    </QueryClientProvider>
  );
}

export default App;