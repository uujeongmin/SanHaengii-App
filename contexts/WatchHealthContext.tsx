import React, {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { apiService, type HealthData } from "../data/api";
import { useAuth } from "./AuthContext";

export type WatchHealthStatus =
  | "off"
  | "syncing"
  | "live"
  | "empty"
  | "error"
  | "unavailable";

interface WatchHealthContextValue {
  isEnabled: boolean;
  latestData: HealthData | null;
  status: WatchHealthStatus;
  error: string | null;
  setEnabled: (enabled: boolean) => void;
  toggle: () => void;
}

const WatchHealthContext = createContext<WatchHealthContextValue | undefined>(
  undefined,
);

const WATCH_HEALTH_POLL_INTERVAL_MS = 3000;

export function WatchHealthProvider({ children }: { children: ReactNode }) {
  const { token, isGuest } = useAuth();
  const [isEnabled, setIsEnabled] = useState(false);
  const [latestData, setLatestData] = useState<HealthData | null>(null);
  const [status, setStatus] = useState<WatchHealthStatus>("off");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isEnabled) {
      setStatus("off");
      setLatestData(null);
      setError(null);
      return;
    }

    if (isGuest || !token) {
      setStatus("unavailable");
      setLatestData(null);
      setError(null);
      return;
    }

    let isActive = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const authToken = token;

    async function pollLatestHealthData() {
      setStatus((prev) => (prev === "live" ? "live" : "syncing"));

      try {
        const latest = await apiService.getLatestHealthData(authToken);
        if (!isActive) return;

        setLatestData(latest);
        setStatus(latest ? "live" : "empty");
        setError(null);
      } catch (pollError) {
        if (!isActive) return;

        const message =
          pollError instanceof Error
            ? pollError.message
            : "스마트워치 데이터를 불러오지 못했습니다.";
        setStatus("error");
        setError(message);
      } finally {
        if (isActive) {
          timer = setTimeout(
            pollLatestHealthData,
            WATCH_HEALTH_POLL_INTERVAL_MS,
          );
        }
      }
    }

    pollLatestHealthData();

    return () => {
      isActive = false;
      if (timer) clearTimeout(timer);
    };
  }, [isEnabled, isGuest, token]);

  const setEnabled = useCallback((enabled: boolean) => {
    setIsEnabled(enabled);
  }, []);

  const toggle = useCallback(() => {
    setIsEnabled((prev) => !prev);
  }, []);

  const value = useMemo(
    () => ({
      isEnabled,
      latestData,
      status,
      error,
      setEnabled,
      toggle,
    }),
    [error, isEnabled, latestData, setEnabled, status, toggle],
  );

  return (
    <WatchHealthContext.Provider value={value}>
      {children}
    </WatchHealthContext.Provider>
  );
}

export function useWatchHealth() {
  const context = useContext(WatchHealthContext);
  if (!context) {
    throw new Error("useWatchHealth must be used within WatchHealthProvider");
  }
  return context;
}
