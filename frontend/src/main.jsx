import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App'
import './index.css'
import { registrarTrabajador } from './components/InstalarApp'

registrarTrabajador()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: '#FFFFFF',
            color: '#333333',
            border: '1px solid #DDDDDD',
            borderRadius: '4px',
            boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
            fontSize: '14px',
            fontFamily: "'Roboto', Arial, sans-serif",
          },
          success: { iconTheme: { primary: '#1E7F3E', secondary: '#FFFFFF' } },
          error:   { iconTheme: { primary: '#B52B27', secondary: '#FFFFFF' } },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>
)
