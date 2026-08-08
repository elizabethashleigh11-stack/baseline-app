import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

type CheckinPayload = {
  event_id: unknown;
  latitude: unknown;
  longitude: unknown;
};

// 500 feet in metres
const GEOFENCE_RADIUS_M = 152.4;

/**
 * Haversine distance between two lat/lon pairs, in metres.
 */
function haversineMetres(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6_371_000; // Earth radius in metres
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function POST(req: Request) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as CheckinPayload;
    const { event_id, latitude, longitude } = body;

    if (
      typeof event_id !== "string" ||
      typeof latitude !== "number" ||
      typeof longitude !== "number" ||
      !isFinite(latitude) ||
      !isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      return NextResponse.json(
        { error: "Invalid payload." },
        { status: 400 },
      );
    }

    // Fetch the event to get its location (if geocoded coordinates are stored)
    const { data: event, error: eventError } = await supabase
      .from("logistics_events")
      .select("id, location")
      .eq("id", event_id)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: "Event not found." }, { status: 404 });
    }

    // within_geofence requires geocoded coordinates stored on the event.
    // logistics_events does not yet store lat/lon (free-text location only),
    // so we record the check-in as unverified until those columns are added.
    // When event_lat/event_lon are available, replace with:
    //   const within_geofence = haversineMetres(latitude, longitude, event.event_lat, event.event_lon) <= GEOFENCE_RADIUS_M;
    const within_geofence = false; // pending geocoded event coordinates

    const { error } = await supabase.from("gps_checkins").insert({
      event_id,
      user_id: user.id,
      latitude,
      longitude,
      within_geofence,
    });

    if (error) throw error;

    return NextResponse.json({ success: true, within_geofence });
  } catch (error) {
    console.error("GPS check-in error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

// Export helper for tests / future server-side use
export { haversineMetres, GEOFENCE_RADIUS_M };
