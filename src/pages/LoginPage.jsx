import { useState } from 'react';
import { mockApi } from '../mockApi.js';

function Field({ label, type, value, onChange, placeholder, required = true, minLength }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium uppercase tracking-widest text-slate-400">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-3 text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40"
        placeholder={placeholder}
        required={required}
        minLength={minLength}
        autoComplete="off"
      />
    </div>
  );
}

export default function LoginPage({ onLogin }) {
  const [tab, setTab] = useState('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [regForm, setRegForm] = useState({ username: '', email: '', full_name: '', phone: '', password: '', confirm: '' });

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const r = await mockApi.login(loginForm.username, loginForm.password);
      localStorage.setItem('token', r.data.token);
      localStorage.setItem('user', JSON.stringify(r.data.user));
      onLogin(r.data.user, r.data.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    if (regForm.password !== regForm.confirm) { setError('Passwords do not match'); return; }
    setLoading(true);
    try {
      const r = await mockApi.register(regForm);
      localStorage.setItem('token', r.data.token);
      localStorage.setItem('user', JSON.stringify(r.data.user));
      setSuccess('Account created. Redirecting...');
      setTimeout(() => onLogin(r.data.user, r.data.token), 700);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b1120]">
      {/* subtle grid background */}
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(59,130,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.03)_1px,transparent_1px)] bg-[size:64px_64px]" />
      {/* glow */}
      <div className="pointer-events-none fixed left-1/4 top-0 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-blue-600/10 blur-[120px]" />

      <div className="relative mx-auto grid min-h-screen max-w-7xl grid-cols-1 lg:grid-cols-2">

        {/* LEFT — hero */}
        <section className="flex items-center px-8 py-16 sm:px-14">
          <div className="max-w-lg">
            <div className="mb-10 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 shadow-lg shadow-blue-600/30">
                <span className="text-lg font-bold text-white">P</span>
              </div>
              <span className="text-sm font-semibold tracking-widest text-blue-400 uppercase">Smart Parking</span>
            </div>

            <h2 className="text-5xl font-bold leading-tight tracking-tight text-white">
              Parking control,<br />
              <span className="text-blue-400">reimagined.</span>
            </h2>
            <p className="mt-5 text-base leading-7 text-slate-400">
              Book slots, track active sessions, extend time during delays, and manage parking operations through role-based dashboards.
            </p>

            <div className="mt-10 grid grid-cols-2 gap-2">
              {['Timed slot booking','Delay-based extensions','Role-based dashboards','Live parking visibility','Session history','EV and zone-aware slots'].map((item) => (
                <div key={item} className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2.5 text-sm text-slate-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                  {item}
                </div>
              ))}
            </div>

            <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Demo credentials</p>
              <div className="mt-3 space-y-2">
                {[['Admin','admin','admin123'],['Staff','staff1','staff123'],['Customer','register','new account']].map(([role,user,pass]) => (
                  <div key={role} className="flex items-center justify-between rounded-lg bg-slate-800/70 px-4 py-2.5 text-sm">
                    <span className="font-medium text-slate-300">{role}</span>
                    <span className="font-mono text-blue-400">{user}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* RIGHT — form */}
        <section className="flex items-center justify-center px-6 py-12 sm:px-10">
          <div className="w-full max-w-md rounded-2xl border border-slate-700/60 bg-slate-900 p-8 shadow-2xl shadow-black/40">
            {/* tabs */}
            <div className="mb-6 flex rounded-xl bg-slate-800 p-1">
              {['login','register'].map((t) => (
                <button
                  key={t}
                  onClick={() => { setTab(t); setError(''); setSuccess(''); }}
                  className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition ${tab === t ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  {t === 'login' ? 'Sign in' : 'Create account'}
                </button>
              ))}
            </div>

            {tab === 'login' ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="mb-4">
                  <h3 className="text-xl font-bold text-white">Welcome back</h3>
                  <p className="mt-1 text-sm text-slate-500">Sign in to your account to continue.</p>
                </div>
                <Field label="Username or email" type="text" value={loginForm.username} onChange={(v) => setLoginForm(f => ({ ...f, username: v }))} placeholder="admin / staff1 / your email" />
                <Field label="Password" type="password" value={loginForm.password} onChange={(v) => setLoginForm(f => ({ ...f, password: v }))} placeholder="Enter password" minLength={1} />
                {error && <div className="rounded-lg border border-red-900/50 bg-red-950/40 px-4 py-2.5 text-sm text-red-400">{error}</div>}
                <button type="submit" disabled={loading} className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white shadow shadow-blue-600/25 transition hover:bg-blue-500 disabled:opacity-50">
                  {loading ? 'Signing in...' : 'Sign in'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="mb-4">
                  <h3 className="text-xl font-bold text-white">Create account</h3>
                  <p className="mt-1 text-sm text-slate-500">Register as a customer to start booking.</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Username" type="text" value={regForm.username} onChange={(v) => setRegForm(f => ({ ...f, username: v }))} placeholder="johndoe" minLength={3} />
                  <Field label="Phone" type="tel" value={regForm.phone} onChange={(v) => setRegForm(f => ({ ...f, phone: v }))} placeholder="Optional" required={false} />
                </div>
                <Field label="Full name" type="text" value={regForm.full_name} onChange={(v) => setRegForm(f => ({ ...f, full_name: v }))} placeholder="Your name" />
                <Field label="Email" type="email" value={regForm.email} onChange={(v) => setRegForm(f => ({ ...f, email: v }))} placeholder="you@example.com" />
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Password" type="password" value={regForm.password} onChange={(v) => setRegForm(f => ({ ...f, password: v }))} placeholder="Min 6 chars" minLength={6} />
                  <Field label="Confirm" type="password" value={regForm.confirm} onChange={(v) => setRegForm(f => ({ ...f, confirm: v }))} placeholder="Repeat" minLength={6} />
                </div>
                {error && <div className="rounded-lg border border-red-900/50 bg-red-950/40 px-4 py-2.5 text-sm text-red-400">{error}</div>}
                {success && <div className="rounded-lg border border-blue-900/50 bg-blue-950/40 px-4 py-2.5 text-sm text-blue-400">{success}</div>}
                <button type="submit" disabled={loading} className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white shadow shadow-blue-600/25 transition hover:bg-blue-500 disabled:opacity-50">
                  {loading ? 'Creating account...' : 'Create account'}
                </button>
              </form>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
