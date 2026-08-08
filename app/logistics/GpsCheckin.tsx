"use client";

import { useState } from "react";

type CheckinStatus = "idle" | "locating" | "success" | "error" | "unavailable";

interface Props {
  eventId: string;
  eventLocation?: string | null;
}

export default function GpsCheckin({ eventId, eventLocation }: Props) {
  const [status, setStatus] = useState<CheckinStatus>("idle");
  const [withinGeofence, setWithinGeofence] = useState<boolean | null>(null);

  function handleCheckin() {
    if (!navigator.geolocation) {
      setStatus("unavailable");
      return;
    }
    setStatus("locating");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch("/api/gps-checkin", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              event_id: eventId,
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
            }),
          });
          if (!res.ok) throw new Error("Server error");
          const data = await res.json();
          setWithinGeofence(data.within_geofence ?? false);
          setStatus("success");
        } catch {
          setStatus("error");
        }
      },
      () => setStatus("error"),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  return (
    <div className="mt-3">
      {status === "idle" && (
        <button
          type="button"
          onClick={handleCheckin}
          className="rounded-lg border border-slate-gray/30 px-3 py-1.5 text-xs text-slate-gray hover:border-navy-blue/50 hover:text-navy-blue"
        >
          📍 Verify arrival (opt-in)
        </button>
      )}
      {status === "locating" && (
        <p className="text-xs text-slate-gray">Locating…</p>
      )}
      {status === "success" && (
        <p className="text-xs font-medium text-navy-blue">
          {withinGeofence
            ? "✅ Arrival verified within 500 ft"
            : "⚠️ Location recorded — outside 500 ft geofence"}
        </p>
      )}
      {status === "error" && (
        <p className="text-xs text-red-600">
          Could not verify location. Please try again.
        </p>
      )}
      {status === "unavailable" && (
        <p className="text-xs text-slate-gray">
          GPS is not available on this device.
        </p>
      )}
      {eventLocation && status === "idle" && (
        <p className="mt-1 text-xs text-slate-gray">📌 {eventLocation}</p>
      )}
    </div>
  );
}
