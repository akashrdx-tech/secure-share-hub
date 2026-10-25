import { useEffect, useRef } from "react";

type MapView = {
  latitude: number | null;
  longitude: number | null;
  ip_address: string | null;
  city: string | null;
  country: string | null;
};

/** Client-only Leaflet map with one orange marker per opener. */
export default function ViewerMap({ views }: { views: MapView[] }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    let instance: import("leaflet").Map | null = null;

    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current) return;
      instance = L.map(containerRef.current, { scrollWheelZoom: false });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(instance);

      const points = views.filter(
        (v) => v.latitude != null && v.longitude != null,
      ) as (MapView & { latitude: number; longitude: number })[];

      const icon = L.divIcon({
        className: "rdx-pin",
        html: '<span></span>',
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });

      if (points.length === 0) {
        instance.setView([20, 0], 1);
        return;
      }
      const bounds: [number, number][] = [];
      for (const p of points) {
        const label = [p.ip_address ?? "Unknown IP", [p.city, p.country].filter(Boolean).join(", ")]
          .filter(Boolean)
          .join(" — ");
        L.marker([p.latitude, p.longitude], { icon })
          .addTo(instance)
          .bindPopup(label);
        bounds.push([p.latitude, p.longitude]);
      }
      instance.fitBounds(bounds, { maxZoom: 10, padding: [30, 30] });
    })();

    return () => {
      cancelled = true;
      instance?.remove();
    };
  }, [views]);

  return (
    <div
      ref={containerRef}
      className="h-64 w-full overflow-hidden rounded-lg border"
      style={{ borderColor: "var(--color-border)" }}
    />
  );
}
