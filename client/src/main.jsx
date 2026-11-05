import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from 'react-hot-toast'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
    {/* Global toast notifications */}
    <Toaster
      position="top-center"
      toastOptions={{
        duration: 3000,
        style: {
          background: '#1a1a1a',
          color: '#ffffff',
          border: '1px solid #2a2a2a',
          borderRadius: '12px',
          fontSize: '14px',
          fontFamily: 'Inter, sans-serif',
        },
        success: {
          iconTheme: {
            primary: '#f59e0b',
            secondary: '#111111',
          },
        },
        error: {
          iconTheme: {
            primary: '#ef4444',
            secondary: '#111111',
          },
        },
      }}
    />
  </StrictMode>,
)
