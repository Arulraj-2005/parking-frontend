import { useEffect, useState } from 'react';
import LoginPage from './pages/LoginPage.jsx';
import AdminPage from './pages/AdminPage.jsx';
import StaffPage from './pages/StaffPage.jsx';
import UserPage from './pages/UserPage.jsx';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const handleLogin = (loggedInUser) => {
    setUser(loggedInUser);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(127,90,240,0.08),_transparent_35%),linear-gradient(180deg,#f6f1ea_0%,#efe6dc_100%)] flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-14 w-14 animate-spin rounded-full border-4 border-stone-500/30 border-t-stone-700" />
          <p className="text-sm tracking-[0.18em] uppercase text-stone-500">Loading Smart Parking</p>
        </div>
      </div>
    );
  }

  if (!user) return <LoginPage onLogin={handleLogin} />;
  if (user.role === 'admin') return <AdminPage user={user} onLogout={handleLogout} />;
  if (user.role === 'staff') return <StaffPage user={user} onLogout={handleLogout} />;
  return <UserPage user={user} onLogout={handleLogout} />;
}
