import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

const LocationContext = createContext();

export function LocationProvider({ children }) {
  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);
  const [heading, setHeading] = useState(null);

  const fetchLocation = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setError("Geolocation is not supported in this browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setError(null);
      },
      (err) => {
        setError(err.message || "Unable to retrieve location.");
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 10000,
      }
    );
  }, []);

  useEffect(() => {
    fetchLocation();
    const interval = setInterval(fetchLocation, 10000);
    return () => clearInterval(interval);
  }, [fetchLocation]);

  // Track device orientation/heading
  useEffect(() => {
    if (!window.DeviceOrientationEvent) {
      // Fallback: try to get heading from geolocation if available
      if (navigator.geolocation && navigator.geolocation.watchPosition) {
        navigator.geolocation.watchPosition(
          (pos) => {
            if (pos.coords.heading !== null && pos.coords.heading !== undefined) {
              setHeading(pos.coords.heading);
            }
          },
          () => {},
          { enableHighAccuracy: true }
        );
      }
      return;
    }

    const handleOrientation = (event) => {
      if (event.alpha !== null && event.alpha !== undefined) {
        // alpha is the compass direction (0-360 degrees)
        setHeading(event.alpha);
      }
    };

    // Request permission for iOS 13+
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      DeviceOrientationEvent.requestPermission()
        .then((response) => {
          if (response === 'granted') {
            window.addEventListener('deviceorientation', handleOrientation);
          }
        })
        .catch(() => {
          // Permission denied or error
        });
    } else {
      window.addEventListener('deviceorientation', handleOrientation);
    }

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, []);

  const value = {
    location,
    locationError: error,
    heading,
    refreshLocation: fetchLocation,
  };

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocationContext() {
  const ctx = useContext(LocationContext);
  if (!ctx) {
    throw new Error("useLocationContext must be used within a LocationProvider");
  }
  return ctx;
}

