import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './core/context/AuthContext';
import { SocketProvider } from './core/context/SocketContext';
import { HardwareProvider } from './core/context/HardwareContext';
import { ThemeProvider } from './core/context/ThemeContext';
import AppRoutes from './core/routes/AppRoutes';
import ErrorBoundary from './components/common/ErrorBoundary/ErrorBoundary';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SocketProvider>
          <HardwareProvider>
            <BrowserRouter>
              <ErrorBoundary>
                <AppRoutes />
              </ErrorBoundary>
            </BrowserRouter>
          </HardwareProvider>
        </SocketProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
