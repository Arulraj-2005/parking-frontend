import { useCallback, useEffect, useRef, useState } from 'react';
import { mockApi } from '../mockApi.js';
import { CountdownBadge, ExtendModal, SpotModal, Toast, fmtDateTime, getSpotColor, useCountdown } from '../components/shared.jsx';

function MyBookingCard({ session, spot, onExtend, onCheckout }) {
  const { hours, minutes, seconds, expired, critical, warning } = useCountdown(session.end_time);
  const totalDuration = session.duration_hours * 3600 * 1000;
  const used = totalDuration - (new Date(session.end_time).getTime() - Date.now());
  const usedPct = Math.min(100, Math.max(0, (used / totalDuration) * 100));

  const tone = expired ? 'border-[#1a2d4a] bg-[#0a1f35]' : critical ? 'border-[#1a2d4a] bg-[#0a1f35]' : warning ? 'border-[#3a2a00] bg-[#0a2540]' : 'border-[#1a3a5c] bg-[#0f2337]';

  return (
    <div className={`rounded-[28px] border p-5 shadow-sm ${tone}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-2xl font-semibold text-[#e8edf2]">{session.spot_number}</h3>
            <span className="rounded-full bg-[#0a2540] px-2.5 py-1 text-xs text-[#7ab3d4]">Zone {session.zone_name}</span>
          </div>
          <p className="mt-1 font-mono text-sm text-[#5a7a99]">{session.license_plate}</p>
        </div>
        <div className="text-right text-sm text-[#5a7a99]">
          <p>Rate</p>
          <p className="font-semibold text-[#e8edf2]">${spot?.hourly_rate || 5}/hr</p>
        </div>
      </div>

      <div className="mt-5 rounded-[22px] border border-[#1a3a5c] bg-[#0d1b2a] p-4 text-center">
        <p className="text-[11px] uppercase tracking-[0.22em] text-[#5a7a99]">Time remaining</p>
        <p className={`mt-2 font-mono text-4xl font-bold ${critical ? 'text-[#ff4d6d]' : warning ? 'text-[#f0a500]' : 'text-[#c8d4e0]'}`}>
          {expired ? '00:00:00' : `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`}
        </p>
        <div className="mt-4">
          <div className="h-2 rounded-full bg-[#0a2540]">
            <div className="h-2 rounded-full bg-[#0057ff]" style={{ width: `${usedPct}%` }} />
          </div>
          <div className="mt-1 flex justify-between text-xs text-[#3d5f7a]">
            <span>{new Date(session.entry_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            <span>{new Date(session.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3 text-center text-sm">
        <div className="rounded-2xl bg-[#0a2540] p-3"><p className="font-semibold text-[#e8edf2]">{session.duration_hours}h</p><p className="text-xs text-[#5a7a99]">Booked</p></div>
        <div className="rounded-2xl bg-[#0a1a2a] p-3"><p className="font-semibold text-[#4d9fff]">{session.total_extended_hours || 0}h</p><p className="text-xs text-[#5a7a99]">Extended</p></div>
        <div className="rounded-2xl bg-[#0a2540] p-3"><p className="font-semibold text-[#3dd6f5]">${(spot?.hourly_rate || 5) * session.duration_hours}</p><p className="text-xs text-[#5a7a99]">Estimate</p></div>
      </div>

      <div className="mt-4 flex gap-3">
        <button onClick={onExtend} className="flex-1 rounded-2xl bg-[#0057ff] py-3 text-sm font-semibold text-white">Extend</button>
        <button onClick={onCheckout} className="flex-1 rounded-2xl border border-[#1a3a5c] bg-[#0f2337] py-3 text-sm font-semibold text-[#9db4cc]">Check out</button>
      </div>
    </div>
  );
}

function CheckoutModal({ session, spot, onConfirm, onCancel }) {
  const [busy, setBusy] = useState(false);
  const actualHours = Math.max(1, Math.ceil((Date.now() - new Date(session.entry_time).getTime()) / 3600000));
  const cost = actualHours * (spot?.hourly_rate || 5);

  const doConfirm = async () => {
    setBusy(true);
    await onConfirm();
    setBusy(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm overflow-hidden rounded-[28px] border border-white/40 bg-[#0d1b2a] shadow-[0_30px_80px_rgba(37,28,24,0.28)]">
        <div className="bg-[#0046cc] px-6 py-5 text-white">
          <p className="text-[11px] uppercase tracking-[0.22em] text-white/65">Checkout</p>
          <h3 className="mt-1 text-2xl font-semibold">Confirm exit</h3>
          <p className="mt-1 text-sm text-white/75">{session.spot_number} · {session.license_plate}</p>
        </div>
        <div className="space-y-4 p-6">
          <div className="rounded-[22px] border border-[#1a3a5c] bg-[#0f2337] p-4 text-sm text-[#7a9ab8] shadow-sm">
            <div className="flex justify-between"><span>Entry</span><span>{new Date(session.entry_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div>
            <div className="mt-2 flex justify-between"><span>Duration</span><span>{actualHours}h</span></div>
            <div className="mt-2 flex justify-between"><span>Rate</span><span>${spot?.hourly_rate || 5}/hr</span></div>
            <div className="mt-3 flex justify-between border-t border-[#1a3a5c] pt-3"><span className="font-semibold text-[#c8d4e0]">Total due</span><span className="text-xl font-semibold text-[#3dd6f5]">${cost}</span></div>
          </div>
          <div className="flex gap-3">
            <button onClick={onCancel} className="flex-1 rounded-2xl border border-[#1a3a5c] bg-[#0f2337] py-3 text-sm font-semibold text-[#9db4cc]">Cancel</button>
            <button onClick={doConfirm} disabled={busy} className="flex-1 rounded-2xl bg-[#0046cc] py-3 text-sm font-semibold text-white disabled:opacity-60">{busy ? 'Processing...' : `Pay $${cost}`}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function UserPage({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('map');
  const [spots, setSpots] = useState([]);
  const [zones, setZones] = useState([]);
  const [allSessions, setAllSessions] = useState([]);
  const [selectedSpot, setSelectedSpot] = useState(null);
  const [extendSpot, setExtendSpot] = useState(null);
  const [checkoutSession, setCheckoutSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notif, setNotif] = useState(null);
  const refreshRef = useRef(null);

  const showNotif = useCallback((type, message) => {
    setNotif({ type, message });
    setTimeout(() => setNotif(null), 3500);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const [sp, zo, us] = await Promise.all([mockApi.getSpotList(), mockApi.getZones(), mockApi.getUserSessions(user.id)]);
      setSpots(sp.data.spots);
      setZones(zo.data.zones);
      setAllSessions(us.data.sessions);
    } catch {
      showNotif('error', 'Unable to refresh your dashboard');
    } finally {
      setLoading(false);
    }
  }, [showNotif, user.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    refreshRef.current = setInterval(fetchData, 15000);
    return () => refreshRef.current && clearInterval(refreshRef.current);
  }, [fetchData]);

  const myActiveSessions = allSessions.filter((s) => s.duration_minutes === 0 && s.bookedByUserId === user.id);
  const myHistory = allSessions.filter((s) => s.duration_minutes > 0 && s.bookedByUserId === user.id);

  const handleEntry = async (licensePlate, durationHours) => {
    if (!selectedSpot) return;
    try {
      await mockApi.checkIn(licensePlate, selectedSpot.id, durationHours, user.id);
      await fetchData();
      setSelectedSpot(null);
      setActiveTab('mybookings');
      showNotif('success', `Slot ${selectedSpot.spot_number} booked`);
    } catch (err) {
      showNotif('error', err.message);
    }
  };

  const handleCheckout = async () => {
    if (!checkoutSession) return;
    try {
      const result = await mockApi.checkOut(checkoutSession.license_plate);
      await fetchData();
      setCheckoutSession(null);
      setActiveTab('history');
      showNotif('success', `Checkout complete. Paid $${result.data.total_amount}`);
    } catch (err) {
      showNotif('error', err.message);
    }
  };

  const handleExtend = async (extraHours) => {
    if (!extendSpot) return;
    try {
      await mockApi.extendBooking(extendSpot.id, extraHours);
      await fetchData();
      const updated = mockApi.getSpots().find((s) => s.id === extendSpot.id);
      if (updated) setExtendSpot(updated);
      showNotif('success', `Extended by ${extraHours}h`);
    } catch (err) {
      showNotif('error', err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0d1b2a]">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-[#0057ff]/20 border-t-[#7c4f64]" />
          <p className="mt-4 text-sm uppercase tracking-[0.22em] text-[#5a7a99]">Loading customer view</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d1b2a] text-[#e8edf2]">
      <Toast notif={notif} />

      <header className="sticky top-0 z-40 border-b border-[#1a3a5c] bg-[#0d1b2a]/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-[#5a7a99]">Customer portal</p>
            <h1 className="text-2xl font-semibold">Book your parking slot</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden rounded-2xl border border-[#1a3a5c] bg-[#0f2337] px-3 py-2 text-sm text-[#7a9ab8] sm:block">{user.full_name}</div>
            <button onClick={onLogout} className="rounded-2xl bg-[#1a3a5c] px-4 py-2.5 text-sm font-semibold text-white">Logout</button>
          </div>
        </div>
        <div className="mx-auto flex max-w-5xl gap-2 px-4 pb-4 sm:px-6">
          {[
            { id: 'map', label: 'Book a spot' },
            { id: 'mybookings', label: `My bookings (${myActiveSessions.length})` },
            { id: 'history', label: 'History' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-full px-4 py-2 text-sm font-medium ${activeTab === tab.id ? 'bg-[#0057ff] text-white' : 'border border-[#1a3a5c] bg-[#0f2337] text-[#7a9ab8]'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        {activeTab === 'map' && (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-[24px] border border-[#1a3a5c] bg-[#0f2337] p-4 shadow-sm text-center"><p className="text-xs uppercase tracking-[0.18em] text-[#5a7a99]">Available</p><p className="mt-2 text-3xl font-semibold">{spots.filter((s) => !s.is_occupied && !s.is_reserved).length}</p></div>
              <div className="rounded-[24px] border border-[#1a3a5c] bg-[#0f2337] p-4 shadow-sm text-center"><p className="text-xs uppercase tracking-[0.18em] text-[#5a7a99]">Occupied</p><p className="mt-2 text-3xl font-semibold">{spots.filter((s) => s.is_occupied).length}</p></div>
              <div className="rounded-[24px] border border-[#1a3a5c] bg-[#0f2337] p-4 shadow-sm text-center"><p className="text-xs uppercase tracking-[0.18em] text-[#5a7a99]">EV free</p><p className="mt-2 text-3xl font-semibold">{spots.filter((s) => s.spot_type === 'electric' && !s.is_occupied).length}</p></div>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {zones.map((zone) => (
                <div key={zone.id} className="rounded-[28px] border border-[#1a3a5c] bg-[#0f2337] p-5 shadow-sm">
                  <div className="mb-4 flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">Zone {zone.name}</h3>
                      <p className="text-sm text-[#5a7a99]">{zone.available_spots} of {zone.total_spots} free</p>
                    </div>
                    <span className="text-sm text-[#5a7a99]">{Math.round((zone.occupied_spots / zone.total_spots) * 100)}%</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {spots.filter((spot) => spot.zone_id === zone.id).map((spot) => (
                      <button
                        key={spot.id}
                        onClick={() => (!spot.is_occupied && !spot.is_reserved ? setSelectedSpot(spot) : null)}
                        disabled={spot.is_occupied || spot.is_reserved}
                        className={`relative aspect-square rounded-2xl ${getSpotColor(spot)} flex flex-col items-center justify-center shadow-sm transition ${!spot.is_occupied ? 'hover:scale-[1.03]' : 'opacity-80'}`}
                      >
                        <span className="text-[10px] font-semibold">{spot.spot_number}</span>
                        {spot.is_occupied && spot.booking && !spot.booking.expired && <CountdownBadge endTime={spot.booking.endTime} />}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'mybookings' && (
          <div className="space-y-4">
            {myActiveSessions.length > 0 ? (
              myActiveSessions.map((session) => {
                const spot = spots.find((s) => s.spot_number === session.spot_number);
                return (
                  <MyBookingCard
                    key={session.id}
                    session={session}
                    spot={spot}
                    onExtend={() => spot && setExtendSpot(spot)}
                    onCheckout={() => setCheckoutSession(session)}
                  />
                );
              })
            ) : (
              <div className="rounded-[28px] border border-[#1a3a5c] bg-[#0f2337] p-12 text-center shadow-sm">
                <h3 className="text-2xl font-semibold text-[#e8edf2]">No active bookings</h3>
                <p className="mt-2 text-[#5a7a99]">Choose a free slot from the map to get started.</p>
                <button onClick={() => setActiveTab('map')} className="mt-6 rounded-2xl bg-[#0057ff] px-6 py-3 text-sm font-semibold text-white">Find a spot</button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-3">
            {myHistory.length > 0 ? (
              myHistory
                .slice()
                .reverse()
                .map((session) => {
                  const spot = spots.find((s) => s.spot_number === session.spot_number);
                  return (
                    <div key={session.id} className="flex items-center gap-4 rounded-[24px] border border-[#1a3a5c] bg-[#0f2337] p-4 shadow-sm">
                      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#0a2540] text-[#3dd6f5]">✓</div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-[#e8edf2]">{session.spot_number} · Zone {session.zone_name}</p>
                        <p className="text-sm text-[#5a7a99]">{fmtDateTime(session.entry_time)} · {session.duration_hours}h</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-semibold text-[#3dd6f5]">${session.total_amount?.toFixed(2) || ((spot?.hourly_rate || 5) * session.duration_hours).toFixed(2)}</p>
                        <p className="text-xs text-[#3d5f7a]">Paid</p>
                      </div>
                    </div>
                  );
                })
            ) : (
              <div className="rounded-[28px] border border-[#1a3a5c] bg-[#0f2337] p-12 text-center shadow-sm">
                <h3 className="text-2xl font-semibold text-[#e8edf2]">No parking history yet</h3>
                <p className="mt-2 text-[#5a7a99]">Completed sessions will appear here.</p>
              </div>
            )}
          </div>
        )}
      </main>

      {selectedSpot && !selectedSpot.is_occupied && (
        <SpotModal
          spot={selectedSpot}
          sessions={[]}
          onClose={() => setSelectedSpot(null)}
          onEntry={handleEntry}
          onExit={async () => {}}
          onOpenExtend={() => {}}
          userView={true}
        />
      )}

      {extendSpot && extendSpot.booking && <ExtendModal spot={extendSpot} onClose={() => setExtendSpot(null)} onExtend={handleExtend} />}

      {checkoutSession && (
        <CheckoutModal
          session={checkoutSession}
          spot={spots.find((s) => s.spot_number === checkoutSession.spot_number)}
          onConfirm={handleCheckout}
          onCancel={() => setCheckoutSession(null)}
        />
      )}
    </div>
  );
}
