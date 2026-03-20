import { useState } from 'react';
import { mockApi } from '../mockApi.js';

function Field({ label, type, value, onChange, placeholder, required = true, minLength }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-[#9db4cc]">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-[#1a3a5c] bg-[#0f2337] px-4 py-3 text-[#e8edf2] outline-none transition placeholder:text-[#3d5f7a] focus:border-[#0057ff]"
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
    if (regForm.password !== regForm.confirm) {
      setError('Passwords do not match');
      return;
    }
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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(124,79,100,0.14),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(70,80,85,0.1),_transparent_28%),linear-gradient(180deg,#f7f2ec_0%,#efe6dc_100%)]">
      <div className="mx-auto grid min-h-screen max-w-7xl grid-cols-1 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="flex items-center px-7 py-12 sm:px-12 lg:px-16">
          <div className="max-w-xl">
            <div className="mb-10 flex items-center gap-4">
              <div className="grid h-16 w-16 place-items-center rounded-[24px] border border-white/60 bg-[#0f2337]/60 shadow-sm backdrop-blur">
                <span className="text-2xl font-bold text-[#7ab3d4]">P</span>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.25em] text-[#5a7a99]">AI-enhanced platform</p>
                <h1 className="text-3xl font-semibold tracking-tight text-[#e8edf2]">Smart Parking Slot Booking System</h1>
              </div>
            </div>

            <h2 className="max-w-lg text-5xl font-semibold leading-tight text-[#e8edf2]">
              Parking management with a calmer, smarter workflow.
            </h2>
            <p className="mt-6 max-w-lg text-lg leading-8 text-[#7a9ab8]">
              Book slots, track active sessions, extend time during delays, and manage parking operations through separate customer, staff, and admin views.
            </p>

            <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[
                'Timed slot booking',
                'Delay-based extensions',
                'Role-based dashboards',
                'Live parking visibility',
                'Session history and billing',
                'EV and zone-aware slots',
              ].map((item) => (
                <div key={item} className="rounded-2xl border border-white/70 bg-[#0f2337]/55 px-4 py-3 text-sm text-[#9db4cc] shadow-sm backdrop-blur">
                  {item}
                </div>
              ))}
            </div>

            <div className="mt-10 rounded-[28px] border border-white/70 bg-[#0d1b2a]/85 p-6 shadow-sm backdrop-blur">
              <p className="text-[11px] uppercase tracking-[0.24em] text-[#5a7a99]">Demo access</p>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between rounded-2xl bg-[#0a2540] px-4 py-3">
                  <span className="font-medium text-[#c8d4e0]">Admin</span>
                  <span className="font-mono text-[#5a7a99]">admin</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-[#0a2540] px-4 py-3">
                  <span className="font-medium text-[#c8d4e0]">Staff</span>
                  <span className="font-mono text-[#5a7a99]">staff1</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-[#0a2540] px-4 py-3">
                  <span className="font-medium text-[#c8d4e0]">Customer</span>
                  <span className="text-[#5a7a99]">Register new</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center px-6 py-10 sm:px-10 lg:px-12">
          <div className="w-full max-w-md rounded-[34px] border border-white/70 bg-[#0d1b2a]/92 p-8 shadow-[0_30px_80px_rgba(37,28,24,0.16)] backdrop-blur">
            <div className="mb-7 flex rounded-2xl bg-[#0a2540] p-1.5">
              <button
                onClick={() => {
                  setTab('login');
                  setError('');
                  setSuccess('');
                }}
                className={`flex-1 rounded-2xl px-4 py-3 text-sm font-semibold transition ${tab === 'login' ? 'bg-[#0f2337] text-[#e8edf2] shadow-sm' : 'text-[#5a7a99]'}`}
              >
                Sign in
              </button>
              <button
                onClick={() => {
                  setTab('register');
                  setError('');
                  setSuccess('');
                }}
                className={`flex-1 rounded-2xl px-4 py-3 text-sm font-semibold transition ${tab === 'register' ? 'bg-[#0f2337] text-[#e8edf2] shadow-sm' : 'text-[#5a7a99]'}`}
              >
                Create account
              </button>
            </div>

            {tab === 'login' ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="mb-2">
                  <h3 className="text-2xl font-semibold text-[#e8edf2]">Welcome back</h3>
                  <p className="mt-1 text-sm text-[#5a7a99]">Use your account to continue.</p>
                </div>
                <Field
                  label="Username or email"
                  type="text"
                  value={loginForm.username}
                  onChange={(v) => setLoginForm((f) => ({ ...f, username: v }))}
                  placeholder="admin / staff1 / your email"
                />
                <Field
                  label="Password"
                  type="password"
                  value={loginForm.password}
                  onChange={(v) => setLoginForm((f) => ({ ...f, password: v }))}
                  placeholder="Enter password"
                  minLength={1}
                />

                {error && <div className="rounded-2xl border border-[#1a2d4a] bg-[#0a1f35] px-4 py-3 text-sm text-[#ff4d6d]">{error}</div>}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-2xl bg-[#1a3a5c] py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#394246] disabled:opacity-60"
                >
                  {loading ? 'Signing in...' : 'Sign in'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="mb-2">
                  <h3 className="text-2xl font-semibold text-[#e8edf2]">Create account</h3>
                  <p className="mt-1 text-sm text-[#5a7a99]">Register as a customer to start booking slots.</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Field
                    label="Username"
                    type="text"
                    value={regForm.username}
                    onChange={(v) => setRegForm((f) => ({ ...f, username: v }))}
                    placeholder="johndoe"
                    minLength={3}
                  />
                  <Field
                    label="Phone"
                    type="tel"
                    value={regForm.phone}
                    onChange={(v) => setRegForm((f) => ({ ...f, phone: v }))}
                    placeholder="Optional"
                    required={false}
                  />
                </div>

                <Field
                  label="Full name"
                  type="text"
                  value={regForm.full_name}
                  onChange={(v) => setRegForm((f) => ({ ...f, full_name: v }))}
                  placeholder="Your name"
                />
                <Field
                  label="Email"
                  type="email"
                  value={regForm.email}
                  onChange={(v) => setRegForm((f) => ({ ...f, email: v }))}
                  placeholder="you@example.com"
                />

                <div className="grid grid-cols-2 gap-3">
                  <Field
                    label="Password"
                    type="password"
                    value={regForm.password}
                    onChange={(v) => setRegForm((f) => ({ ...f, password: v }))}
                    placeholder="Min 6 chars"
                    minLength={6}
                  />
                  <Field
                    label="Confirm"
                    type="password"
                    value={regForm.confirm}
                    onChange={(v) => setRegForm((f) => ({ ...f, confirm: v }))}
                    placeholder="Repeat"
                    minLength={6}
                  />
                </div>

                {error && <div className="rounded-2xl border border-[#1a2d4a] bg-[#0a1f35] px-4 py-3 text-sm text-[#ff4d6d]">{error}</div>}
                {success && <div className="rounded-2xl border border-[#0a4a6e] bg-[#0a2a1a] px-4 py-3 text-sm text-[#3dd6f5]">{success}</div>}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-2xl bg-[#0057ff] py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0046cc] disabled:opacity-60"
                >
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
