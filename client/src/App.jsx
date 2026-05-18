import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth'
import Header from './components/Header'
import ProtectedRoute from './components/ProtectedRoute'
import Landing from './pages/Landing'
import About from './pages/About'
import Authenticate from './pages/Authenticate'
import Intake from './pages/Intake'
import Briefing from './pages/Briefing'
import OperationLog from './pages/OperationLog'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Header />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/about" element={<About />} />
          <Route path="/authenticate" element={<Authenticate />} />
          <Route path="/intake" element={
            <ProtectedRoute><Intake /></ProtectedRoute>
          } />
          <Route path="/briefing" element={<Briefing />} />
          <Route path="/oplog" element={<OperationLog />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
