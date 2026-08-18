import { Routes, Route } from 'react-router-dom'

import { AuthProvider } from './contexts/AuthContext.jsx'
import Layout from './components/Layout.jsx'
import Home from './pages/Home.jsx'
import ComingSoon from './pages/ComingSoon.jsx'
import LoginPage from './pages/LoginPage.jsx'
import OIDCCallbackPage from './pages/OIDCCallbackPage.jsx'

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* OIDC 콜백은 레이아웃(네비게이션 등) 없이 단독으로 처리한다 */}
        <Route path="/oidc-callback" element={<OIDCCallbackPage />} />
        <Route path="/" element={<Layout><Home /></Layout>} />
        <Route path="/login" element={<Layout><LoginPage /></Layout>} />
        {/* 아직 준비 중인 도구들 */}
        <Route path="/tools/:toolId" element={<Layout><ComingSoon /></Layout>} />
        <Route path="*" element={<Layout><Home /></Layout>} />
      </Routes>
    </AuthProvider>
  )
}
