import { useEffect, useState } from 'react';

export function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function fmtDateTime(iso) {
  return new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function useCountdown(endTime) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (!endTime) return;
    const tick = () => setRemaining(Math.max(0, new Date(endTime).getTime() - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endTime]);

  const totalSeconds = Math.floor(remaining / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const expired = remaining === 0 && endTime !== null;
  const critical = remaining > 0 && remaining < 5 * 60 * 1000;
  const warning = remaining > 0 && remaining < 15 * 60 * 1000;

  return { hours, minutes, seconds, expired, critical, warning, totalMs: remaining };
}

export function CountdownBadge({ endTime }) {
  const { hours, minutes, seconds, expired, critical, warning } = useCountdown(endTime);
  if (expired) {
    return <span className="rounded-full bg-red-900 px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-red-400">EXP</span>;
  }

  return (
    <span
      className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold tracking-wide ${
        critical
          ? 'bg-red-800 text-red-300 animate-pulse'
          : warning
          ? 'bg-amber-900/70 text-amber-500'
          : 'bg-black/20 text-white/90'
      }`}
    >
      {String(hours).padStart(2, '0')}:{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
    </span>
  );
}

export function getSpotColor(spot) {
  if (spot.is_occupied) {
    if (spot.booking) {
      const remaining = new Date(spot.booking.endTime).getTime() - Date.now();
      if (remaining <= 0) return 'bg-red-900/80 ring-1 ring-red-500/60';
      if (remaining < 5 * 60 * 1000) return 'bg-red-800/80 ring-1 ring-red-400/60 animate-pulse';
      if (remaining < 15 * 60 * 1000) return 'bg-amber-800/80 ring-1 ring-amber-400/60';
    }
    return 'bg-slate-700/80 ring-1 ring-slate-500/40';
  }
  if (spot.is_reserved) return 'bg-amber-900/60 ring-1 ring-amber-600/40 cursor-pointer hover:bg-amber-800/60';
  if (spot.spot_type === 'electric') return 'bg-cyan-900/60 ring-1 ring-cyan-600/40 cursor-pointer hover:bg-cyan-800/60 text-cyan-300';
  if (spot.spot_type === 'motorcycle') return 'bg-violet-900/60 ring-1 ring-violet-600/40 cursor-pointer hover:bg-violet-800/60 text-violet-300';
  if (spot.spot_type === 'handicapped') return 'bg-blue-900/60 ring-1 ring-blue-600/40 cursor-pointer hover:bg-blue-800/60 text-blue-300';
  return 'bg-blue-900/50 ring-1 ring-blue-700/30 cursor-pointer hover:bg-blue-800/60 text-blue-200';
}

export function Toast({ notif }) {
  if (!notif) return null;

  const tone =
    notif.type === 'success'
      ? 'bg-blue-600'
      : notif.type === 'warn'
      ? 'bg-amber-900/70'
      : 'bg-blue-700';

  return (
    <div className={`fixed right-5 top-5 z-[100] flex max-w-sm items-center gap-3 rounded-[22px] px-5 py-3 text-white shadow-xl shadow-black/50 ${tone}`}>
      <span className="text-lg">{notif.type === 'success' ? '✓' : notif.type === 'warn' ? '!' : '×'}</span>
      <span className="text-sm font-medium">{notif.message}</span>
    </div>
  );
}

export function ExtendModal({ spot, onClose, onExtend }) {
  const [extra, setExtra] = useState(1);
  const [busy, setBusy] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const booking = spot.booking;
  const { hours, minutes, seconds, expired, critical, warning } = useCountdown(booking.endTime);
  const newEndTime = new Date(new Date(booking.endTime).getTime() + extra * 3600 * 1000);
  const additionalCost = extra * spot.hourly_rate;
  const totalExtended = (booking.totalExtendedHours || 0) + extra;
  const extensions = booking.extensions || [];
  const totalDuration = booking.durationHours * 3600 * 1000;
  const used = totalDuration - (new Date(booking.endTime).getTime() - Date.now());
  const usedPct = Math.min(100, Math.max(0, (used / totalDuration) * 100));

  const band = expired
    ? 'from-red-950 to-red-950'
    : critical
    ? 'from-red-900 to-red-900'
    : warning
    ? 'from-amber-900 to-amber-900'
    : 'from-slate-800 to-slate-900';

  const doExtend = async () => {
    setBusy(true);
    await onExtend(extra);
    setBusy(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-[28px] border border-white/40 bg-slate-900 shadow-2xl shadow-black/40">
        <div className={`bg-gradient-to-r ${band} px-6 py-5 text-white`}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-white/70">Extend booking</p>
              <h2 className="mt-1 text-2xl font-semibold">Spot {spot.spot_number}</h2>
              <p className="mt-1 text-sm text-white/75">Zone {spot.zone_name} · {booking.licensePlate} · ${spot.hourly_rate}/hr</p>
            </div>
            <button onClick={onClose} className="rounded-full px-2 py-1 text-white/70 transition hover:bg-slate-900/10 hover:text-white">✕</button>
          </div>
        </div>

        <div className="max-h-[74vh] space-y-5 overflow-y-auto p-6">
          <div className="rounded-[22px] border border-slate-700/60 bg-slate-900 p-5 text-center shadow-sm">
            <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Time remaining</p>
            <p className={`mt-2 font-mono text-4xl font-bold ${expired ? 'text-red-400' : critical ? 'text-red-400' : warning ? 'text-amber-400' : 'text-slate-300'}`}>
              {expired ? '00:00:00' : `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`}
            </p>
            <div className="mt-4">
              <div className="mb-1 flex justify-between text-[11px] text-slate-500">
                <span>{fmtTime(booking.startTime)}</span>
                <span>{fmtTime(booking.endTime)}</span>
              </div>
              <div className="h-2 rounded-full bg-slate-800/60">
                <div className="h-2 rounded-full bg-blue-600" style={{ width: `${usedPct}%` }} />
              </div>
            </div>
          </div>

          <div>
            <p className="mb-3 text-sm font-semibold text-slate-400">Quick add</p>
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4, 6, 8, 12, 24].map((h) => (
                <button
                  key={h}
                  onClick={() => setExtra(h)}
                  className={`rounded-2xl border px-3 py-2 text-sm font-semibold transition ${
                    extra === h
                      ? 'border-blue-500 bg-blue-600 text-white'
                      : 'border-slate-700/60 bg-slate-900 text-slate-400 hover:border-slate-700/60'
                  }`}
                >
                  +{h}h
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-[22px] border border-slate-700/60 bg-slate-800/60 p-4">
            <p className="mb-3 text-center text-sm font-medium text-slate-400">Custom duration</p>
            <div className="flex items-center justify-center gap-4">
              <button onClick={() => setExtra(Math.max(1, extra - 1))} className="h-11 w-11 rounded-full border border-slate-700/60 bg-slate-900 text-2xl text-slate-400">−</button>
              <div className="text-center">
                <span className="text-4xl font-semibold text-slate-100">{extra}</span>
                <span className="ml-1 text-lg text-slate-500">hr</span>
              </div>
              <button onClick={() => setExtra(Math.min(24, extra + 1))} className="h-11 w-11 rounded-full border border-slate-700/60 bg-slate-900 text-2xl text-slate-400">+</button>
            </div>
            <input type="range" min={1} max={24} value={extra} onChange={(e) => setExtra(Number(e.target.value))} className="mt-4 w-full accent-[#7c4f64]" />
          </div>

          <div className="rounded-[22px] border border-slate-700/60 bg-slate-900 p-5 shadow-sm">
            <h4 className="mb-3 text-sm font-semibold text-slate-300">Cost summary</h4>
            <div className="space-y-2 text-sm text-slate-400">
              <div className="flex justify-between"><span>Added time</span><span className="font-medium text-slate-300">{extra}h</span></div>
              <div className="flex justify-between"><span>Current end</span><span>{fmtDateTime(booking.endTime)}</span></div>
              <div className="flex justify-between"><span>New end</span><span className="font-semibold text-cyan-400">{fmtDateTime(newEndTime.toISOString())}</span></div>
              <div className="flex justify-between border-t border-slate-700/60 pt-3"><span className="font-semibold text-slate-300">Additional cost</span><span className="text-xl font-semibold text-blue-400">${additionalCost}</span></div>
              <div className="text-xs text-slate-600">Total extended after this action: {totalExtended}h</div>
            </div>
          </div>

          {extensions.length > 0 && (
            <div className="overflow-hidden rounded-[22px] border border-slate-700/60 bg-slate-900">
              <button onClick={() => setShowHistory((v) => !v)} className="flex w-full items-center justify-between bg-slate-900 px-4 py-3 text-sm font-semibold text-slate-400">
                <span>Extension history ({extensions.length})</span>
                <span>{showHistory ? '−' : '+'}</span>
              </button>
              {showHistory && (
                <div className="divide-y divide-[#f0e8df]">
                  {extensions.map((ext, idx) => (
                    <div key={idx} className="flex justify-between px-4 py-3 text-sm">
                      <div>
                        <p className="font-medium text-slate-300">+{ext.addedHours}h</p>
                        <p className="text-xs text-slate-600">{fmtDateTime(ext.extendedAt)}</p>
                      </div>
                      <p className="text-xs font-medium text-cyan-400">{fmtDateTime(ext.newEndTime)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 rounded-2xl border border-slate-700/60 bg-slate-900 py-3 text-sm font-semibold text-slate-400">Cancel</button>
            <button onClick={doExtend} disabled={busy} className="flex-[1.4] rounded-2xl bg-blue-600 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-600 disabled:opacity-60">
              {busy ? 'Updating...' : `Extend ${extra}h · $${additionalCost}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SpotModal({ spot, sessions, onClose, onEntry, onExit, onOpenExtend, userView = false }) {
  const [plate, setPlate] = useState('');
  const [duration, setDuration] = useState(1);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState('checkout');
  const session = sessions.find((s) => s.spot_number === spot.spot_number && s.duration_minutes === 0);
  const booking = spot.booking;
  const { hours, minutes, seconds, expired, critical, warning } = useCountdown(booking?.endTime ?? null);
  const estimatedCost = duration * spot.hourly_rate;
  const actualCost = session ? Math.ceil((Date.now() - new Date(session.entry_time).getTime()) / 3600000) * spot.hourly_rate : 0;

  const doEntry = async () => {
    if (!plate) return;
    setBusy(true);
    await onEntry(plate.toUpperCase(), duration);
    setBusy(false);
  };

  const doExit = async () => {
    setBusy(true);
    await onExit();
    setBusy(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-[28px] border border-white/40 bg-slate-900 shadow-2xl shadow-black/40">
        <div className={`px-6 py-5 ${spot.is_occupied ? 'bg-blue-600' : 'bg-slate-800'} text-white`}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-white/60">Parking slot</p>
              <h3 className="mt-1 text-2xl font-semibold">{spot.spot_number}</h3>
              <p className="mt-1 text-sm text-white/75">Zone {spot.zone_name} · {spot.spot_type} · ${spot.hourly_rate}/hr</p>
            </div>
            <button onClick={onClose} className="rounded-full px-2 py-1 text-white/70 hover:bg-slate-900/10 hover:text-white">✕</button>
          </div>
        </div>

        <div className="space-y-4 p-6">
          {spot.is_occupied && booking ? (
            <>
              <div className="rounded-[22px] border border-slate-700/60 bg-slate-900 p-4 text-center shadow-sm">
                <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Current booking</p>
                <p className={`mt-2 font-mono text-3xl font-bold ${critical ? 'text-red-400' : warning ? 'text-amber-400' : 'text-slate-300'}`}>
                  {expired ? 'EXPIRED' : `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`}
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-500">
                  <div className="rounded-2xl bg-slate-900 p-2">Plate: <span className="font-semibold text-slate-300">{booking.licensePlate}</span></div>
                  <div className="rounded-2xl bg-slate-900 p-2">Booked: <span className="font-semibold text-slate-300">{booking.durationHours}h</span></div>
                </div>
              </div>

              <div className="flex overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-900">
                {!userView && (
                  <button onClick={() => setTab('checkout')} className={`flex-1 py-3 text-sm font-semibold ${tab === 'checkout' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>
                    Check out
                  </button>
                )}
                <button
                  onClick={() => {
                    setTab('extend');
                    onOpenExtend();
                  }}
                  className={`flex-1 py-3 text-sm font-semibold ${tab === 'extend' ? 'bg-slate-800 text-white' : 'text-slate-400'}`}
                >
                  Extend time
                </button>
              </div>

              {tab === 'checkout' && !userView && (
                <div className="rounded-[22px] border border-slate-700/60 bg-slate-900 p-4 shadow-sm">
                  <div className="space-y-2 text-sm text-slate-400">
                    <div className="flex justify-between"><span>Entry</span><span>{fmtTime(session?.entry_time || booking.startTime)}</span></div>
                    <div className="flex justify-between"><span>Payable</span><span className="text-lg font-semibold text-cyan-400">${actualCost}</span></div>
                  </div>
                  <button onClick={doExit} disabled={busy} className="mt-4 w-full rounded-2xl bg-blue-700 py-3 text-sm font-semibold text-white disabled:opacity-60">
                    {busy ? 'Processing...' : 'Confirm checkout'}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-400">License plate</label>
                <input
                  type="text"
                  value={plate}
                  onChange={(e) => setPlate(e.target.value.toUpperCase())}
                  placeholder="ABC-1234"
                  className="w-full rounded-2xl border border-slate-700/60 bg-slate-900 px-4 py-3 text-center font-mono text-lg tracking-[0.18em] text-slate-300 outline-none focus:border-blue-500"
                />
              </div>

              <div className="rounded-[22px] border border-slate-700/60 bg-slate-900 p-4 shadow-sm">
                <p className="mb-3 text-sm font-semibold text-slate-300">Select duration</p>
                <div className="mb-3 grid grid-cols-4 gap-2">
                  {[1, 2, 3, 4].map((h) => (
                    <button
                      key={h}
                      onClick={() => setDuration(h)}
                      className={`rounded-2xl border px-3 py-2 text-sm font-semibold ${duration === h ? 'border-slate-700/60 bg-slate-800 text-white' : 'border-slate-700/60 text-slate-400'}`}
                    >
                      {h}h
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-3 rounded-2xl bg-slate-900 p-3">
                  <button onClick={() => setDuration(Math.max(1, duration - 1))} className="h-10 w-10 rounded-full border border-slate-700/60 bg-slate-900 text-xl text-slate-400">−</button>
                  <div className="flex-1 text-center text-3xl font-semibold text-slate-100">{duration}<span className="ml-1 text-lg text-slate-500">hr</span></div>
                  <button onClick={() => setDuration(Math.min(24, duration + 1))} className="h-10 w-10 rounded-full border border-slate-700/60 bg-slate-900 text-xl text-slate-400">+</button>
                </div>
                <input type="range" min={1} max={24} value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="mt-3 w-full accent-[#465055]" />
              </div>

              <div className="rounded-[22px] border border-slate-700/60 bg-slate-900 p-4 text-sm text-slate-400">
                <div className="flex justify-between"><span>Rate</span><span>${spot.hourly_rate}/hr</span></div>
                <div className="mt-2 flex justify-between"><span>End time</span><span>{new Date(Date.now() + duration * 3600 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div>
                <div className="mt-3 flex justify-between border-t border-slate-700/60 pt-3"><span className="font-semibold text-slate-300">Estimated total</span><span className="text-xl font-semibold text-blue-400">${estimatedCost}</span></div>
              </div>

              <button onClick={doEntry} disabled={!plate || busy} className="w-full rounded-2xl bg-slate-800 py-3 text-sm font-semibold text-white shadow-sm disabled:opacity-60">
                {busy ? 'Booking...' : `Book slot · $${estimatedCost}`}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function BookingTimerRow({ session, spots, onExtend, showExtend = true }) {
  const spot = spots.find((s) => s.spot_number === session.spot_number);
  const { hours, minutes, seconds, expired, critical, warning } = useCountdown(session.end_time);

  return (
    <tr className={`${critical && !expired ? 'bg-violet-950' : warning && !expired ? 'bg-amber-950' : 'bg-transparent'} border-b border-slate-700/60`}>
      <td className="px-4 py-3 text-sm font-semibold text-slate-300">{session.license_plate}</td>
      <td className="px-4 py-3 text-sm text-slate-400">{session.spot_number}</td>
      <td className="px-4 py-3 text-sm text-slate-500">Zone {session.zone_name}</td>
      <td className="px-4 py-3 text-sm text-slate-500">
        <div className="flex flex-col gap-1">
          <span className="w-fit rounded-full bg-slate-800/60 px-2 py-1 text-xs text-slate-500">{session.duration_hours}h booked</span>
          {(session.total_extended_hours || 0) > 0 && <span className="w-fit rounded-full bg-slate-800/40 px-2 py-1 text-xs text-blue-400">+{session.total_extended_hours}h</span>}
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-slate-500">{new Date(session.entry_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
      <td className="px-4 py-3 text-sm font-medium">
        {expired ? (
          <span className="rounded-full bg-slate-800/40 px-2 py-1 text-xs font-semibold text-red-400">Expired</span>
        ) : (
          <span className={`font-mono font-semibold ${critical ? 'text-red-400' : warning ? 'text-amber-400' : 'text-slate-400'}`}>
            {String(hours).padStart(2, '0')}:{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-slate-400">${(spot?.hourly_rate || 5) * session.duration_hours}</td>
      {showExtend && (
        <td className="px-4 py-3">
          <button
            onClick={() => spot && onExtend(spot)}
            disabled={!spot || !spot.booking}
            className="rounded-xl bg-slate-800 px-3 py-2 text-xs font-semibold text-white disabled:opacity-40"
          >
            Extend
          </button>
        </td>
      )}
    </tr>
  );
}
