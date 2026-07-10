import { Routes, Route } from 'react-router-dom'

import Layout from './components/Layout.jsx'
import Home from './pages/Home.jsx'
import LoanCalculator from './pages/LoanCalculator.jsx'
import Budget from './pages/Budget.jsx'
import ComingSoon from './pages/ComingSoon.jsx'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/tools/loan" element={<LoanCalculator />} />
        <Route path="/tools/budget" element={<Budget />} />
        {/* 아직 준비 중인 도구들 */}
        <Route path="/tools/:toolId" element={<ComingSoon />} />
        <Route path="*" element={<Home />} />
      </Routes>
    </Layout>
  )
}
