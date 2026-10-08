import { useState, useEffect } from "react";

export function useGeolocation(defaultLat = 12.9352, defaultLng = 77.6245) {
  const [lat, setLat] = useState(defaultLat);
  const [lng, setLng] = useState(defaultLng);
  const [locating, setLocating] = useState(true);

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLat(pos.coords.latitude);
          setLng(pos.coords.longitude);
          setLocating(false);
        },
        () => setLocating(false),
        { timeout: 5000, maximumAge: 60000 }
      );
    } else {
      setLocating(false);
    }
  }, []);

  return { lat, lng, locating, setLat, setLng, setLocating };
}
