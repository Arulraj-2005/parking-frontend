import { useCallback, useEffect, useRef, useState } from 'react';
import { mockApi } from '../mockApi.js';
import { BookingTimerRow, CountdownBadge, ExtendModal, SpotModal, Toast, fmtDateTime, getSpotColor } from '../components/shared.jsx';

function StatCard({ label, value, note }) {
  return (
    <div className="rounded-[26px] border border-slate-700/60 bg-slate-900 p-5 shadow-sm">
      <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-slate-100">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{note}</p>
    </div>
  );
}

function CompletedRow({ session }) {
  return (
    <tr className="border-b border-slate-700/60">
      <td className="px-4 py-3 text-sm font-semibold text-slate-300">{session.license_plate}</td>
      <td className="px-4 py-3 text-sm text-slate-400">{session.spot_number}</td>
      <td className="px-4 py-3 text-sm text-slate-500">Zone {session.zone_name}</td>
      <td className="px-4 py-3 text-sm text-slate-500">{session.duration_hours}h</td>
      <td className="px-4 py-3 text-sm text-slate-500">{fmtDateTime(session.entry_time)}</td>
      <td className="px-4 py-3 text-sm font-semibold text-cyan-400">${session.total_amount?.toFixed(2) || '0.00'}</td>
    </tr>
  );
}

function UserRow({ rowUser, currentUserId, onRoleChange, onDelete }) {
  return (
    <tr className="border-b border-slate-700/60">
      <td className="px-4 py-3 text-sm font-semibold text-slate-300">{rowUser.full_name}</td>
      <td className="px-4 py-3 text-sm text-slate-500">@{rowUser.username}</td>
      <td className="px-4 py-3 text-sm text-slate-500">{rowUser.email}</td>
      <td className="px-4 py-3 text-sm text-slate-500">{rowUser.phone || '—'}</td>
      <td className="px-4 py-3 text-sm capitalize text-slate-400">{rowUser.role}</td>
      <td className="px-4 py-3">
        {rowUser.id !== currentUserId ? (
          <div className="flex items-center gap-2">
            <select
              value={rowUser.role}
              onChange={(e) => onRoleChange(rowUser.id, e.target.value)}
              className="rounded-xl border border-slate-700/60 bg-slate-900 px-3 py-2 text-xs text-slate-400 outline-none"
            >
              <option value="customer">Customer</option>
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
            </select>
            <button onClick={() => onDelete(rowUser.id)} className="rounded-xl bg-slate-800/40 px-3 py-2 text-xs font-semibold text-red-400">
              Remove
            </button>
          </div>
        ) : (
          <span className="text-xs text-slate-600">Current user</span>
        )}
      </td>
    </tr>
  );
}

export default function AdminPage({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [spots, setSpots] = useState([]);
  const [zones, setZones] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [allSessions, setAllSessions] = useState([]);
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [selectedSpot, setSelectedSpot] = useState(null);
  const [extendSpot, setExtendSpot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notif, setNotif] = useState(null);
  const refreshRef = useRef(null);

  const showNotif = useCallback((type, message) => {
    setNotif({ type, message });
    setTimeout(() => setNotif(null), 3500);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const [sp, zo, st, se, all] = await Promise.all([
        mockApi.getSpotList(),
        mockApi.getZones(),
        mockApi.getDashboard(),
        mockApi.getActiveSessions(),
        mockApi.getAllSessions(),
      ]);
      setSpots(sp.data.spots);
      setZones(zo.data.zones);
      setStats(st.data.stats);
      setSessions(se.data.sessions);
      setAllSessions(all.data.sessions);
      setUsers(mockApi.getUsers());
    } catch {
      showNotif('error', 'Unable to refresh dashboard');
    } finally {
      setLoading(false);
    }
  }, [showNotif]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    refreshRef.current = setInterval(fetchData, 15000);
    return () => refreshRef.current && clearInterval(refreshRef.current);
  }, [fetchData]);

  const handleEntry = async (licensePlate, durationHours) => {
    if (!selectedSpot) return;
    try {
      await mockApi.checkIn(licensePlate, selectedSpot.id, durationHours, user.id);
      await fetchData();
      setSelectedSpot(null);
      showNotif('success', `Booked ${selectedSpot.spot_number} for ${durationHours}h`);
    } catch (err) {
      showNotif('error', err.message);
    }
  };

  const handleExit = async () => {
    if (!selectedSpot) return;
    const session = sessions.find((s) => s.spot_number === selectedSpot.spot_number && s.duration_minutes === 0);
    if (!session) return showNotif('error', 'No active session found');
    try {
      const result = await mockApi.checkOut(session.license_plate);
      await fetchData();
      setSelectedSpot(null);
      showNotif('success', `Checked out. Total $${result.data.total_amount}`);
    } catch (err) {
      showNotif('error', err.message);
    }
  };

  const handleExtend = async (extraHours) => {
    const target = extendSpot || selectedSpot;
    if (!target) return;
    try {
      await mockApi.extendBooking(target.id, extraHours);
      await fetchData();
      const updated = mockApi.getSpots().find((s) => s.id === target.id);
      if (updated) {
        if (extendSpot) setExtendSpot(updated);
        if (selectedSpot) setSelectedSpot(updated);
      }
      showNotif('success', `Extended by ${extraHours}h`);
    } catch (err) {
      showNotif('error', err.message);
    }
  };

  const handleRoleChange = async (id, role) => {
    await mockApi.updateUserRole(id, role);
    setUsers(mockApi.getUsers());
    showNotif('success', 'User role updated');
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm('Delete this user?')) return;
    await mockApi.deleteUser(id);
    setUsers(mockApi.getUsers());
    showNotif('warn', 'User removed');
  };

  const activeSessions = sessions.filter((s) => s.duration_minutes === 0);
  const completedSessions = allSessions.filter((s) => s.duration_minutes > 0);
  const criticalCount = spots.filter((s) => s.booking && !s.booking.expired && new Date(s.booking.endTime).getTime() - Date.now() < 5 * 60 * 1000).length;
  const warningCount = spots.filter((s) => s.booking && !s.booking.expired && new Date(s.booking.endTime).getTime() - Date.now() < 15 * 60 * 1000).length;

  const tabs = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'parking', label: 'Parking map' },
    { id: 'bookings', label: `Bookings (${activeSessions.length})` },
    { id: 'history', label: 'History' },
    { id: 'users', label: `Users (${users.length})` },
    { id: 'analytics', label: 'Analytics' },
  ];

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-blue-500/20 border-t-[#7c4f64]" />
          <p className="mt-4 text-sm uppercase tracking-[0.22em] text-slate-500">Loading admin panel</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <Toast notif={notif} />

      <header className="sticky top-0 z-40 border-b border-slate-700/60 bg-slate-900/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Administration</p>
            <h1 className="text-2xl font-semibold">Smart Parking Control</h1>
          </div>
          <div className="flex items-center gap-3">
            {criticalCount > 0 && <span className="rounded-full bg-slate-800/40 px-3 py-1.5 text-xs font-semibold text-red-400">{criticalCount} critical</span>}
            {warningCount > criticalCount && <span className="rounded-full bg-slate-800/60 px-3 py-1.5 text-xs font-semibold text-amber-400">{warningCount} expiring</span>}
            <div className="hidden rounded-2xl border border-slate-700/60 bg-slate-900 px-3 py-2 text-sm text-slate-400 sm:block">{user.full_name}</div>
            <button onClick={onLogout} className="rounded-2xl bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white">Logout</button>
          </div>
        </div>
        <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 pb-4 sm:px-6 lg:px-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition ${
                activeTab === tab.id ? 'bg-blue-600 text-white' : 'bg-slate-900 text-slate-400 border border-slate-700/60'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {activeTab === 'dashboard' && stats && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatCard label="Total spots" value={stats.totalSpots} note="Across all zones" />
              <StatCard label="Available" value={stats.availableSpots} note="Ready for booking" />
              <StatCard label="Occupied" value={stats.occupiedSpots} note={`${stats.occupancyRate}% occupancy`} />
              <StatCard label="Revenue" value={`$${stats.todayRevenue.toFixed(2)}`} note={`${stats.todayVehicles} sessions`} />
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.05fr_0.95fr]">
              <div className="rounded-[28px] border border-slate-700/60 bg-slate-900 p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-semibold">Live occupancy</h2>
                  <span className="text-sm text-slate-500">{stats.occupancyRate}% used</span>
                </div>
                <div className="h-4 rounded-full bg-slate-800/60">
                  <div className="h-4 rounded-full bg-blue-600" style={{ width: `${stats.occupancyRate}%` }} />
                </div>
                <div className="mt-3 flex justify-between text-xs text-slate-500">
                  <span>{stats.availableSpots} free</span>
                  <span>{stats.occupiedSpots} occupied</span>
                  <span>{stats.reservedSpots} reserved</span>
                </div>
              </div>

              <div className="rounded-[28px] border border-slate-700/60 bg-slate-900 p-6 shadow-sm">
                <h2 className="text-xl font-semibold">Zone overview</h2>
                <div className="mt-4 space-y-4">
                  {zones.map((zone) => (
                    <div key={zone.id}>
                      <div className="mb-1 flex justify-between text-sm text-slate-400">
                        <span>Zone {zone.name}</span>
                        <span>{zone.occupied_spots}/{zone.total_spots}</span>
                      </div>
                      <div className="h-2.5 rounded-full bg-slate-800/60">
                        <div className="h-2.5 rounded-full bg-slate-800" style={{ width: `${(zone.occupied_spots / zone.total_spots) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-[28px] border border-slate-700/60 bg-slate-900 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-700/60 px-6 py-4">
                <h2 className="text-xl font-semibold">Active bookings</h2>
                <span className="text-sm text-slate-500">{activeSessions.length} active</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px]">
                  <thead className="bg-slate-900 text-left text-[11px] uppercase tracking-[0.18em] text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Plate</th>
                      <th className="px-4 py-3">Spot</th>
                      <th className="px-4 py-3">Zone</th>
                      <th className="px-4 py-3">Duration</th>
                      <th className="px-4 py-3">Entry</th>
                      <th className="px-4 py-3">Time left</th>
                      <th className="px-4 py-3">Cost</th>
                      <th className="px-4 py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeSessions.map((session) => (
                      <BookingTimerRow key={session.id} session={session} spots={spots} onExtend={(spot) => setExtendSpot(spot)} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'parking' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Parking map</p>
                <h2 className="text-2xl font-semibold">Zone-wise slot layout</h2>
              </div>
              <button onClick={fetchData} className="rounded-2xl border border-slate-700/60 bg-slate-900 px-4 py-2.5 text-sm font-medium text-slate-400">Refresh</button>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {zones.map((zone) => (
                <div key={zone.id} className="rounded-[28px] border border-slate-700/60 bg-slate-900 p-5 shadow-sm">
                  <div className="mb-4 flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">Zone {zone.name}</h3>
                      <p className="text-sm text-slate-500">{zone.available_spots} free of {zone.total_spots}</p>
                    </div>
                    <span className="text-sm text-slate-500">{Math.round((zone.occupied_spots / zone.total_spots) * 100)}%</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {spots.filter((spot) => spot.zone_id === zone.id).map((spot) => (
                      <button
                        key={spot.id}
                        onClick={() => setSelectedSpot(spot)}
                        className={`relative aspect-square rounded-2xl ${getSpotColor(spot)} flex flex-col items-center justify-center shadow-sm transition hover:scale-[1.03]`}
                      >
                        <span className="text-[11px] font-semibold">{spot.spot_number}</span>
                        {spot.is_occupied && spot.booking && !spot.booking.expired && <CountdownBadge endTime={spot.booking.endTime} />}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'bookings' && (
          <div className="overflow-hidden rounded-[28px] border border-slate-700/60 bg-slate-900 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-700/60 px-6 py-4">
              <h2 className="text-xl font-semibold">All active bookings</h2>
              <span className="text-sm text-slate-500">Live session table</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead className="bg-slate-900 text-left text-[11px] uppercase tracking-[0.18em] text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Plate</th>
                    <th className="px-4 py-3">Spot</th>
                    <th className="px-4 py-3">Zone</th>
                    <th className="px-4 py-3">Duration</th>
                    <th className="px-4 py-3">Entry</th>
                    <th className="px-4 py-3">Time left</th>
                    <th className="px-4 py-3">Cost</th>
                    <th className="px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {activeSessions.map((session) => (
                    <BookingTimerRow key={session.id} session={session} spots={spots} onExtend={(spot) => setExtendSpot(spot)} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="overflow-hidden rounded-[28px] border border-slate-700/60 bg-slate-900 shadow-sm">
            <div className="border-b border-slate-700/60 px-6 py-4">
              <h2 className="text-xl font-semibold">Completed sessions</h2>
              <p className="mt-1 text-sm text-slate-500">{completedSessions.length} records</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px]">
                <thead className="bg-slate-900 text-left text-[11px] uppercase tracking-[0.18em] text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Plate</th>
                    <th className="px-4 py-3">Spot</th>
                    <th className="px-4 py-3">Zone</th>
                    <th className="px-4 py-3">Duration</th>
                    <th className="px-4 py-3">Entry</th>
                    <th className="px-4 py-3">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {completedSessions.slice().reverse().map((session) => (
                    <CompletedRow key={session.id} session={session} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="overflow-hidden rounded-[28px] border border-slate-700/60 bg-slate-900 shadow-sm">
            <div className="border-b border-slate-700/60 px-6 py-4">
              <h2 className="text-xl font-semibold">User management</h2>
              <p className="mt-1 text-sm text-slate-500">Update roles or remove accounts</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[840px]">
                <thead className="bg-slate-900 text-left text-[11px] uppercase tracking-[0.18em] text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Username</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Phone</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((rowUser) => (
                    <UserRow key={rowUser.id} rowUser={rowUser} currentUserId={user.id} onRoleChange={handleRoleChange} onDelete={handleDeleteUser} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && stats && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-[28px] border border-slate-700/60 bg-slate-900 p-6 shadow-sm">
              <h2 className="text-xl font-semibold">Occupancy snapshot</h2>
              <div className="mt-6 flex items-center justify-center">
                <div className="grid h-52 w-52 place-items-center rounded-full border-[18px] border-slate-700/60 text-center" style={{ boxShadow: `inset 0 0 0 18px rgba(124,79,100,${stats.occupancyRate / 170})` }}>
                  <div>
                    <p className="text-4xl font-semibold">{stats.occupancyRate}%</p>
                    <p className="text-sm text-slate-500">Occupied</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-700/60 bg-slate-900 p-6 shadow-sm">
              <h2 className="text-xl font-semibold">Revenue summary</h2>
              <div className="mt-5 space-y-3 text-sm">
                <div className="flex justify-between rounded-2xl bg-slate-800/60 px-4 py-4"><span className="text-slate-400">Completed sessions</span><span className="font-semibold">${completedSessions.reduce((sum, s) => sum + (s.total_amount || 0), 0).toFixed(2)}</span></div>
                <div className="flex justify-between rounded-2xl bg-slate-800/60 px-4 py-4"><span className="text-slate-400">Active session estimate</span><span className="font-semibold">${activeSessions.reduce((sum, s) => sum + s.duration_hours * 5, 0).toFixed(2)}</span></div>
                <div className="flex justify-between rounded-2xl bg-slate-800/40 px-4 py-4"><span className="text-slate-400">Total</span><span className="font-semibold text-blue-400">${stats.todayRevenue.toFixed(2)}</span></div>
              </div>
            </div>
          </div>
        )}
      </main>

      {selectedSpot && (
        <SpotModal
          spot={selectedSpot}
          sessions={sessions}
          onClose={() => setSelectedSpot(null)}
          onEntry={handleEntry}
          onExit={handleExit}
          onOpenExtend={() => {
            setExtendSpot(selectedSpot);
            setSelectedSpot(null);
          }}
        />
      )}

      {extendSpot && extendSpot.booking && <ExtendModal spot={extendSpot} onClose={() => setExtendSpot(null)} onExtend={handleExtend} />}
    </div>
  );
}
