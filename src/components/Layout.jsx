import Navbar from './Navbar.jsx'
import Footer from './Footer.jsx'

export default function Layout({ children }) {
  return (
    <div className="app-shell">
      <Navbar />
      <main className="page">
        <div className="container">{children}</div>
      </main>
      <Footer />
    </div>
  )
}
