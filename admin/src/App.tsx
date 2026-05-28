import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { Spin } from 'antd'
import api from './api/client'
import Install from './pages/Install'
import Login from './pages/Login'
import AdminLayout from './layout/AdminLayout'
import Dashboard from './pages/Dashboard'
import Users from './pages/Users'
import Messages from './pages/Messages'
import Conversations from './pages/Conversations'

function isAuthed() {
  return !!localStorage.getItem('yy_admin_token')
}

function Protected({ children }: { children: JSX.Element }) {
  return isAuthed() ? children : <Navigate to="/login" replace />
}

function Bootstrap() {
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    api
      .get('/install/status')
      .then((resp) => {
        const installed = resp.data?.data?.installed
        if (!installed && location.pathname !== '/install') {
          navigate('/install', { replace: true })
        }
      })
      .catch(() => undefined)
      .finally(() => setLoading(false))
  }, [navigate])

  if (loading) {
    return (
      <div className="centered-page">
        <Spin size="large" />
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/install" element={<Install />} />
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <Protected>
            <AdminLayout />
          </Protected>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="users" element={<Users />} />
        <Route path="messages" element={<Messages />} />
        <Route path="conversations" element={<Conversations />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Bootstrap />
    </BrowserRouter>
  )
}
