import * as Location from "expo-location";
import React, {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Platform } from "react-native";

import {
  apiService,
  detectHealthAnomaly,
  type HealthAnomaly,
  type HealthData,
} from "../data/api";
import { useAuth } from "./AuthContext";

export type WatchHealthStatus =
  | "off"
  | "syncing"
  | "live"
  | "empty"
  | "error"
  | "unavailable";

export type SosStatus = "idle" | "sending" | "sent" | "failed";

export interface AnomalyAlert {
  anomaly: HealthAnomaly;
  data: HealthData;
  detectedAt: number;
}

interface WatchHealthContextValue {
  isEnabled: boolean;
  latestData: HealthData | null;
  status: WatchHealthStatus;
  error: string | null;
  setEnabled: (enabled: boolean) => void;
  toggle: () => void;
  /* ── 이상 징후 / SOS ── */
  anomalyAlert: AnomalyAlert | null;
  sosStatus: SosStatus;
  sendSos: (reason?: string) => Promise<boolean>;
  dismissAnomaly: () => void;
  /** 워치에 이상징후 신호를 전송했는지 여부 (응답 대기 중) */
  watchAnomalyNotified: boolean;
  /** LiveMapScreen이 DB에 "anomaly" 신호를 PUT한 뒤 호출 */
  markWatchNotified: () => void;
  /** [DEV] 특정 임계값을 가진 가짜 이상징후를 즉시 트리거 */
  triggerTestAnomaly: (
    type: "hr_high" | "hr_low" | "spo2" | "temp_high",
  ) => void;
}

const WatchHealthContext = createContext<WatchHealthContextValue | undefined>(
  undefined,
);

const WATCH_HEALTH_POLL_INTERVAL_MS = 3000;
// 같은 이상 상황이 지속될 때 반복 알림을 막는 쿨다운
const ANOMALY_COOLDOWN_MS = 60000;
// GPS 실패 시 기본 좌표 (백엔드 /api/emergency는 location 필수)
const FALLBACK_LOCATION = { lat: 37.557999, lng: 127.007993 };

export function WatchHealthProvider({ children }: { children: ReactNode }) {
  const { token, isGuest, user } = useAuth();
  const [isEnabled, setIsEnabled] = useState(false);
  const [latestData, setLatestData] = useState<HealthData | null>(null);
  const [status, setStatus] = useState<WatchHealthStatus>("off");
  const [error, setError] = useState<string | null>(null);

  const [anomalyAlert, setAnomalyAlert] = useState<AnomalyAlert | null>(null);
  const [sosStatus, setSosStatus] = useState<SosStatus>("idle");
  const [watchAnomalyNotified, setWatchAnomalyNotified] = useState(false);
  // 마지막 이상 알림 이후 쿨다운 만료 시각
  const anomalyCooldownUntilRef = useRef(0);

  useEffect(() => {
    if (!isEnabled) {
      setStatus("off");
      setLatestData(null);
      setError(null);
      setAnomalyAlert(null);
      return;
    }

    if (isGuest || !token) {
      setStatus("unavailable");
      setLatestData(null);
      setError(null);
      setAnomalyAlert(null);
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

        // 앱에 반영된 데이터에서 이상 징후 감지 → 쿨다운 통과 시 알림 트리거
        if (latest) {
          const anomaly = detectHealthAnomaly(latest);
          if (anomaly && Date.now() >= anomalyCooldownUntilRef.current) {
            anomalyCooldownUntilRef.current = Date.now() + ANOMALY_COOLDOWN_MS;
            setAnomalyAlert({
              anomaly,
              data: latest,
              detectedAt: Date.now(),
            });
          }
        }
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

  const dismissAnomaly = useCallback(() => {
    setAnomalyAlert(null);
    setSosStatus("idle");
    setWatchAnomalyNotified(false);
  }, []);

  const markWatchNotified = useCallback(() => {
    setWatchAnomalyNotified(true);
  }, []);

  // [DEV] 테스트용 가짜 이상징후 즉시 트리거 (쿨다운 우회)
  const triggerTestAnomaly = useCallback(
    (type: "hr_high" | "hr_low" | "spo2" | "temp_high") => {
      const fakeData: HealthData = {
        id: 0,
        userId: 0,
        heartRate: type === "hr_high" ? 170 : type === "hr_low" ? 35 : 75,
        spo2: type === "spo2" ? 85 : 98,
        bodyTemp: type === "temp_high" ? 40.5 : 36.7,
        steps: 0,
        calories: null,
        bloodPressureSystolic: null,
        bloodPressureDiastolic: null,
        measuredAt: new Date().toISOString(),
      };
      const anomaly = {
        type,
        message:
          type === "hr_high"
            ? "심박수 이상 (170 bpm) — 테스트"
            : type === "hr_low"
              ? "심박수 저하 (35 bpm) — 테스트"
              : type === "spo2"
                ? "산소포화도 저하 (85%) — 테스트"
                : "체온 이상 (40.5°C) — 테스트",
      };
      anomalyCooldownUntilRef.current = 0; // 쿨다운 우회
      setAnomalyAlert({ anomaly, data: fakeData, detectedAt: Date.now() });
      setSosStatus("idle");
    },
    [],
  );

  /**
   * 이상 징후 기반 구조 요청을 백엔드(/api/emergency)로 전송합니다.
   * 현위치를 시도하고 실패 시 기본 좌표를 사용합니다(location 필수).
   */
  const sendSos = useCallback(
    async (reason?: string): Promise<boolean> => {
      setSosStatus("sending");

      // 1. 현위치 시도 (실패해도 기본 좌표로 진행)
      let location = FALLBACK_LOCATION;
      try {
        const { status: permStatus } =
          await Location.requestForegroundPermissionsAsync();
        if (permStatus === "granted") {
          const pos =
            (await Location.getLastKnownPositionAsync({})) ??
            (await Location.getCurrentPositionAsync({
              accuracy:
                Platform.OS === "android"
                  ? Location.Accuracy.High
                  : Location.Accuracy.Highest,
            }));
          if (pos) {
            location = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          }
        }
      } catch (locError) {
        console.log(
          "[WatchHealth] SOS 위치 취득 실패, 기본 좌표 사용:",
          locError,
        );
      }

      // 2. 구조 요청 전송
      const emergencyUserId = user?.id && user.id > 0 ? user.id : 0;
      if (emergencyUserId === 0) {
        console.warn(
          "[WatchHealth] SOS: 로그인된 user.id 없음 — 게스트로 신고",
        );
      }
      const payload = {
        userId: emergencyUserId,
        eventType: reason ?? "이상_징후",
        timestamp: new Date().toISOString(),
        location,
      };

      try {
        await apiService.reportEmergency(payload, token ?? undefined);
        setSosStatus("sent");
        // 전송 성공 시 쿨다운 연장(연속 전송 방지)
        anomalyCooldownUntilRef.current = Date.now() + ANOMALY_COOLDOWN_MS;
        return true;
      } catch (sosError) {
        console.error("[WatchHealth] 구조 요청 전송 실패:", sosError);
        setSosStatus("failed");
        return false;
      }
    },
    [token, user?.id],
  );

  const value = useMemo(
    () => ({
      isEnabled,
      latestData,
      status,
      error,
      setEnabled,
      toggle,
      anomalyAlert,
      sosStatus,
      sendSos,
      dismissAnomaly,
      watchAnomalyNotified,
      markWatchNotified,
      triggerTestAnomaly,
    }),
    [
      anomalyAlert,
      dismissAnomaly,
      error,
      isEnabled,
      latestData,
      markWatchNotified,
      sendSos,
      setEnabled,
      sosStatus,
      status,
      toggle,
      triggerTestAnomaly,
      watchAnomalyNotified,
    ],
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
