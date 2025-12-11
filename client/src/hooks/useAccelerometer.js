import { useEffect, useRef, useState } from "react";

const G_VALUE = 9.80665;
const FREEFALL_THRESHOLD_G = 0.5; // Magnitude near 0g
const IMPACT_THRESHOLD_G = 6; // Spike after freefall
const FREEFALL_WINDOW_MS = 2000;

// Lightweight fall detection using DeviceMotion (broadest browser support).
// Calls onFallDetected once per detected fall sequence.
export default function useAccelerometerFallDetection({ enabled, onFallDetected }) {
  const [supported, setSupported] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState(null);

  const fallTimerRef = useRef(null);
  const isFallingRef = useRef(false);

  useEffect(() => {
    const hasSensor = typeof window !== "undefined" && ("DeviceMotionEvent" in window || "Accelerometer" in window);
    setSupported(hasSensor);
  }, []);

  useEffect(() => {
    if (!enabled || !supported) {
      setIsActive(false);
      return undefined;
    }

    let cancelled = false;

    const clearFallTimer = () => {
      if (fallTimerRef.current) {
        clearTimeout(fallTimerRef.current);
        fallTimerRef.current = null;
      }
    };

    const resetState = () => {
      isFallingRef.current = false;
      clearFallTimer();
    };

    const handleMotion = (event) => {
      const acc = event.accelerationIncludingGravity || event.acceleration;
      if (!acc) return;

      const { x = 0, y = 0, z = 0 } = acc;
      const magnitude = Math.sqrt(x * x + y * y + z * z);
      const totalG = magnitude / G_VALUE;

      if (totalG < FREEFALL_THRESHOLD_G) {
        if (!isFallingRef.current) {
          isFallingRef.current = true;
          fallTimerRef.current = setTimeout(() => {
            isFallingRef.current = false;
          }, FREEFALL_WINDOW_MS);
        }
        return;
      }

      if (isFallingRef.current && totalG > IMPACT_THRESHOLD_G) {
        resetState();
        onFallDetected?.();
        return;
      }

      if (isFallingRef.current && totalG >= 0.8 && totalG <= 1.2) {
        resetState();
      }
    };

    const requestPermissionIfNeeded = async () => {
      if (typeof DeviceMotionEvent === "undefined") return;
      // iOS requires explicit permission.
      if (typeof DeviceMotionEvent.requestPermission === "function") {
        const state = await DeviceMotionEvent.requestPermission();
        if (state !== "granted") {
          throw new Error("Motion permission denied");
        }
      }
    };

    const start = async () => {
      try {
        await requestPermissionIfNeeded();
        if (cancelled) return;
        window.addEventListener("devicemotion", handleMotion, { passive: true });
        setIsActive(true);
      } catch (err) {
        setError(err?.message || "Unable to start accelerometer");
        setIsActive(false);
      }
    };

    start();

    return () => {
      cancelled = true;
      window.removeEventListener("devicemotion", handleMotion);
      resetState();
      setIsActive(false);
    };
  }, [enabled, supported, onFallDetected]);

  return { supported, isActive, error };
}

