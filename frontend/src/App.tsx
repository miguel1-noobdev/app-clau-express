import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LoginFinal from './pages/LoginFinal.tsx'
import DashboardFinal from './pages/DashboardFinal.tsx'
import './App.css'

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginFinal />} />
        <Route path="/dashboard" element={<DashboardFinal />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App
