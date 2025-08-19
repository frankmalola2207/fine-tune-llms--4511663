import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import WelcomeScreen from './screens/WelcomeScreen';
import IDScanScreen from './screens/IDScanScreen';
import PersonalInfoScreen from './screens/PersonalInfoScreen';
import FacialBiometricsScreen from './screens/FacialBiometricsScreen';
import CompletionScreen from './screens/CompletionScreen';
import { AppProvider } from './context/AppContext';
import './App.css';

function App() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initialize app
    const initApp = async () => {
      try {
        console.log('🚀 Initializing Mobile-Technologies Web App...');
        
        // Check camera support
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          console.warn('⚠️ Camera not supported in this browser');
        } else {
          console.log('✅ Camera API available');
        }
        
        // Initialize app state
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate initialization
        
        console.log('✅ App initialized successfully');
      } catch (error) {
        console.error('❌ App initialization error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initApp();
  }, []);

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <h2>Mobile-Technologies</h2>
          <p>Initializing eKYC Platform...</p>
        </div>
      </div>
    );
  }

  return (
    <AppProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/" element={<WelcomeScreen />} />
            <Route path="/id-scan" element={<IDScanScreen />} />
            <Route path="/personal-info" element={<PersonalInfoScreen />} />
            <Route path="/facial-biometrics" element={<FacialBiometricsScreen />} />
            <Route path="/completion" element={<CompletionScreen />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </Router>
    </AppProvider>
  );
}

export default App;