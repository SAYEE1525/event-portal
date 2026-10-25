import { NavLink, Route, Routes, Link } from 'react-router-dom';
import { CalendarDays, LayoutDashboard } from 'lucide-react';
import Events from './pages/Events.jsx';
import EventDetails from './pages/EventDetails.jsx';
import Admin from './pages/Admin.jsx';

export default function App() {
  return (
    <>
      <header className="nav">
        <div className="container nav-inner">
          <Link to="/" className="brand">Portal<b>wiz</b> Events</Link>
          <nav>
            <NavLink to="/" end><CalendarDays size={18} /> <span>Events</span></NavLink>
            <NavLink to="/admin"><LayoutDashboard size={18} /> <span>Admin</span></NavLink>
          </nav>
        </div>
      </header>
      <main className="container">
        <Routes>
          <Route path="/" element={<Events />} />
          <Route path="/events/:id" element={<EventDetails />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="*" element={<div className="empty"><h3>Page not found</h3><Link className="btn" to="/">Back to events</Link></div>} />
        </Routes>
      </main>
    </>
  );
}
