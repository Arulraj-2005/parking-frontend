import { useCallback, useEffect, useRef, useState } from 'react';
import { mockApi } from '../mockApi.js';
import { BookingTimerRow, CountdownBadge, ExtendModal, SpotModal, Toast, getSpotColor } from '../components/shared.jsx';

export default function StaffPage({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('parking');
  const [spots, setSpots] = useState([]);
  const [zones, setZones] = useState([]);
  const [sessions, setSessions] = useState([]);
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
      const [sp, zo, se] = await Promise.all([mockApi.getSpotList(), mockApi.getZones(), mockApi.getActiveSessions()]);
      setSpots(sp.data.spots);
      setZones(zo.data.zones);
      setSessions(se.data.sessions);
    } catch {
      showNotif('error', 'Unable to refresh data');
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
      showNotif('success', `Booked ${selectedSpot.spot_number}`);
    } catch (err) {
      showNotif('error', err.message);
    }
  };

  const handleExit = async () => {
    if (!selectedSpot) return;
    const session = sessions.find((s) => s.spot_number === selectedSpot.spot_number && s.duration_minutes === 0);
    if (!session) return showNotif('error', 'No active booking found');
    try {
      const result = await mockApi.checkOut(session.license_plate);
      await fetchData();
      setSelectedSpot(null);
      showNotif('success', `Checked out. $${result.data.total_amount}`);
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

  const activeSessions = sessions.filter((s) => s.duration_minutes === 0);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f2ec]">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-[#465055]/20 border-t-[#465055]" />
          <p className="mt-4 text-sm uppercase tracking-[0.22em] text-stone-500">Loading staff panel</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6f1ea] text-stone-900">
      <Toast notif={notif} />

      <header className="sticky top-0 z-40 border-b border-[#e6d9cc] bg-[#fbf8f3]/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-stone-500">Operations</p>
            <h1 className="text-2xl font-semibold">Staff workspace</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden rounded-2xl border border-[#eadfd4] bg-white px-3 py-2 text-sm text-stone-600 sm:block">{user.full_name}</div>
            <button onClick={onLogout} className="rounded-2xl bg-[#465055] px-4 py-2.5 text-sm font-semibold text-white">Logout</button>
          </div>
        </div>
        <div className="mx-auto flex max-w-6xl gap-2 px-4 pb-4 sm:px-6 lg:px-8">
          {[
            { id: 'parking', label: 'Parking map' },
            { id: 'bookings', label: `Active bookings (${activeSessions.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-full px-4 py-2 text-sm font-medium ${activeTab === tab.id ? 'bg-[#465055] text-white' : 'border border-[#e6d9cc] bg-white text-stone-600'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        {activeTab === 'parking' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <div className="rounded-[24px] border border-[#e7ddd3] bg-white p-4 shadow-sm"><p className="text-xs uppercase tracking-[0.18em] text-stone-500">Total</p><p className="mt-2 text-3xl font-semibold">{spots.length}</p></div>
              <div className="rounded-[24px] border border-[#e7ddd3] bg-white p-4 shadow-sm"><p className="text-xs uppercase tracking-[0.18em] text-stone-500">Free</p><p className="mt-2 text-3xl font-semibold">{spots.filter((s) => !s.is_occupied && !s.is_reserved).length}</p></div>
              <div className="rounded-[24px] border border-[#e7ddd3] bg-white p-4 shadow-sm"><p className="text-xs uppercase tracking-[0.18em] text-stone-500">Occupied</p><p className="mt-2 text-3xl font-semibold">{spots.filter((s) => s.is_occupied).length}</p></div>
              <div className="rounded-[24px] border border-[#e7ddd3] bg-white p-4 shadow-sm"><p className="text-xs uppercase tracking-[0.18em] text-stone-500">Sessions</p><p className="mt-2 text-3xl font-semibold">{activeSessions.length}</p></div>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {zones.map((zone) => (
                <div key={zone.id} className="rounded-[28px] border border-[#e7ddd3] bg-white p-5 shadow-sm">
                  <div className="mb-4 flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">Zone {zone.name}</h3>
                      <p className="text-sm text-stone-500">{zone.available_spots} free of {zone.total_spots}</p>
                    </div>
                    <span className="text-sm text-stone-500">{Math.round((zone.occupied_spots / zone.total_spots) * 100)}%</span>
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
          <div className="overflow-hidden rounded-[28px] border border-[#e7ddd3] bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-[#efe5db] px-6 py-4">
              <h2 className="text-xl font-semibold">Active bookings</h2>
              <span className="text-sm text-stone-500">Monitor and extend sessions</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead className="bg-[#faf6f1] text-left text-[11px] uppercase tracking-[0.18em] text-stone-500">
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
