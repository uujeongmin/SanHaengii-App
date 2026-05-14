import { Ionicons } from "@expo/vector-icons";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { RouteProp } from "@react-navigation/native";
import { useNavigation, useRoute } from "@react-navigation/native";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  LayoutAnimation,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";
import type { CourseParams, RootTabParamList } from "../App";
import { apiService } from "../data/api";

// Android에서 LayoutAnimation 활성화
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type LiveMapNavProp = BottomTabNavigationProp<RootTabParamList, "내비게이션">;
type LiveMapRouteProp = RouteProp<RootTabParamList, "내비게이션">;

/**
 * 문자열을 분 단위 숫자로 변환합니다.
 */
function parseTimeToMinutes(timeStr: string | undefined): number {
  if (!timeStr) return 45;

  const hourMatch = timeStr.match(/(\d+)시간/);
  const minMatch = timeStr.match(/(\d+)분/);

  let totalMinutes = 0;
  if (hourMatch) {
    totalMinutes += parseInt(hourMatch[1], 10) * 60;
  }
  if (minMatch) {
    totalMinutes += parseInt(minMatch[1], 10);
  }

  // 만약 숫자만 들어있는 경우 (예: "45")
  if (!hourMatch && !minMatch) {
    const onlyNum = parseInt(timeStr.replace(/[^\d]/g, ""), 10);
    return isNaN(onlyNum) ? 45 : onlyNum;
  }

  return totalMinutes || 45;
}

/* ── 토글 스위치 컴포넌트 ── */
interface ToggleSwitchProps {
  enabled: boolean;
  onChange: (v: boolean) => void;
  activeColor?: string;
}
function ToggleSwitch({
  enabled,
  onChange,
  activeColor = "#22c55e",
}: ToggleSwitchProps) {
  const translateX = useRef(new Animated.Value(enabled ? 20 : 0)).current;

  useEffect(() => {
    Animated.timing(translateX, {
      toValue: enabled ? 20 : 0,
      duration: 180,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [enabled]);

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => onChange(!enabled)}
      style={[
        styles.toggleTrack,
        { backgroundColor: enabled ? activeColor : "#d1d5db" },
      ]}
    >
      <Animated.View
        style={[styles.toggleThumb, { transform: [{ translateX }] }]}
      />
    </TouchableOpacity>
  );
}

export default function LiveMapScreen() {
  const navigation = useNavigation<LiveMapNavProp>();
  const route = useRoute<LiveMapRouteProp>();

  /* 코스 파라미터 (홈에서 전달, 없으면 기본값) */
  const params = route.params as CourseParams | undefined;
  const courseId = params?.courseId;
  const courseName = params?.courseName ?? "관절 보호 완만 코스";
  const mountainName = params?.mountainName ?? "";
  const initialDist = params?.distance ?? "3.2km";
  const elevation = params?.elevation ?? "+180m";

  /* ── 실시간 데이터 상태 (알고리즘 연동) ── */
  const [loading, setLoading] = useState(false);
  const [remainingDist, setRemainingDist] = useState(
    parseFloat(initialDist.replace(/[^\d.]/g, "")) || 3.2,
  );

  // 정적 기준 시간 및 동적 실시간 시간
  const initialMinutes = parseTimeToMinutes(params?.time);
  const [staticEta, setStaticEta] = useState(initialMinutes);
  const [dynamicEta, setDynamicEta] = useState(initialMinutes);
  const [timeSaved, setTimeSaved] = useState(0);

  /* 센서 시뮬레이션 데이터 */
  const [currentPace, setCurrentPace] = useState(3.2); // km/h
  const [currentSlope, setCurrentSlope] = useState(12); // %
  const [heartRate, setHeartRate] = useState(170); // bpm

  /* ── 토글 상태 ── */
  const [dynamicAnalysis, setDynamicAnalysis] = useState(true);
  const [snsSpot, setSnsSpot] = useState(true);

  /* ── 애니메이션 참조 ── */
  const notifOpacity = useRef(new Animated.Value(0)).current;
  const notifTranslateY = useRef(new Animated.Value(-20)).current;
  const dashboardTransY = useRef(new Animated.Value(120)).current;
  const markerScale = useRef(new Animated.Value(1)).current;
  const snsOpacity = useRef(new Animated.Value(1)).current;
  const analysisOpacity = useRef(new Animated.Value(1)).current;

  /* ── 실제 알고리즘 데이터 로드 ── */
  useEffect(() => {
    if (courseId) {
      fetchRealAlgorithmData(courseId);
    }
  }, [courseId]);

  async function fetchRealAlgorithmData(id: string) {
    try {
      setLoading(true);
      // 백엔드의 Tobler 알고리즘이 적용된 실제 경로와 ETA를 가져옵니다.
      // (현재 위치에서 해당 코스까지의 경로를 계산한다고 가정)
      const result = await apiService.getCourseRoute(id);

      const realDistKm = (result.summary.distance_m || 0) / 1000;
      const realEtaMin = Math.round((result.summary.duration_sec || 0) / 60);

      setRemainingDist(realDistKm);
      setDynamicEta(realEtaMin);

      // 기존 정적 데이터 대비 단축 시간 계산
      setTimeSaved(Math.max(0, staticEta - realEtaMin));
    } catch (error) {
      console.error("[LiveMap] Failed to fetch real route data:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    Animated.parallel([
      Animated.timing(notifOpacity, {
        toValue: 1,
        duration: 600,
        delay: 500,
        useNativeDriver: true,
      }),
      Animated.timing(notifTranslateY, {
        toValue: 0,
        duration: 600,
        delay: 500,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(dashboardTransY, {
        toValue: 0,
        duration: 500,
        easing: Easing.out(Easing.back(1.1)),
        useNativeDriver: true,
      }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(markerScale, {
          toValue: 1.25,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(markerScale, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  /* ── 센서 데이터 및 실시간 동적 ETA 시뮬레이션 ── */
  useEffect(() => {
    if (!dynamicAnalysis) return;

    const interval = setInterval(() => {
      // 1. 센서 데이터 변동 시뮬레이션
      setHeartRate((prev) => {
        const next = prev + (Math.random() - 0.5) * 4;
        return Math.min(160, Math.max(60, next));
      });

      setCurrentPace((prev) => {
        const next = prev + (Math.random() - 0.5) * 0.2;
        return Math.min(6.0, Math.max(1.0, next));
      });

      setCurrentSlope((prev) => {
        const next = prev + (Math.random() - 0.5) * 2;
        return Math.round(Math.min(30, Math.max(-10, next)));
      });

      // 2. 거리 및 ETA 실시간 계산 (현위치로부터의 이동 반영)
      setRemainingDist((prevDist) => {
        // 3초당 이동 거리 (km) = pace(km/h) * (3/3600)
        // 시뮬레이션을 위해 실제보다 약간 더 빠르게 줄어들게 설정
        const travelDist = (currentPace / 3600) * 10;
        const nextDist = Math.max(0, prevDist - travelDist);

        // 동적 ETA 계산: (남은 거리 / 현재 페이스) * 60분
        // Tobler 알고리즘 반영: 경사가 급할수록 실제 속도가 저하됨을 시뮬레이션
        const slopeAdjustment = 1 + (Math.abs(currentSlope) / 10) * 0.5;
        const calculatedEta = Math.round(
          (nextDist / (currentPace / slopeAdjustment)) * 60,
        );

        setDynamicEta(nextDist > 0 ? Math.max(1, calculatedEta) : 0);
        return nextDist;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [dynamicAnalysis, heartRate, currentPace, currentSlope]);

  /* SNS 조망점 토글 애니메이션 */
  useEffect(() => {
    Animated.timing(snsOpacity, {
      toValue: snsSpot ? 1 : 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [snsSpot]);

  /* 동적 분석 토글 애니메이션 */
  useEffect(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    Animated.timing(analysisOpacity, {
      toValue: dynamicAnalysis ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [dynamicAnalysis]);

  const statusBarHeight =
    Platform.OS === "android" ? (StatusBar.currentHeight ?? 24) : 44;

  return (
    <View style={styles.container}>
      {/* ── 지형도 배경 ── */}
      <Image
        source={{
          uri: "https://images.unsplash.com/photo-1732783384071-0cdb7bbbad94?auto=format&fit=crop&q=80&w=800",
        }}
        style={styles.mapImage}
        resizeMode="cover"
      />
      <View style={styles.overlay} />

      {/* ── 상단 네비 바 ── */}
      <View style={[styles.topBar, { top: statusBarHeight + 12 }]}>
        <View style={styles.routeLabel}>
          <Ionicons name="navigate" size={16} color="#ffffff" />
          <View style={{ flex: 1, minWidth: 0 }}>
            {mountainName ? (
              <Text style={styles.routeLabelSub} numberOfLines={1}>
                {mountainName}
              </Text>
            ) : null}
            <Text style={styles.routeLabelText} numberOfLines={1}>
              {courseName}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.sosButton}
          onPress={() => navigation.navigate("안전설정")}
          activeOpacity={0.85}
        >
          <Ionicons name="warning" size={22} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* ── 로딩 인디케이터 ── */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#ffffff" />
          <Text style={styles.loadingText}>현위치 기반 경로 분석 중...</Text>
        </View>
      )}

      {/* ── SNS 인기 조망점 알림 ── */}
      <Animated.View
        style={[
          styles.notifCard,
          { top: statusBarHeight + 82 },
          {
            opacity: Animated.multiply(notifOpacity, snsOpacity),
            transform: [{ translateY: notifTranslateY }],
          },
          !snsSpot && styles.notifCardHidden,
        ]}
        pointerEvents={snsSpot ? "auto" : "none"}
      >
        <View style={styles.notifIconWrap}>
          <Ionicons name="camera" size={22} color="#9333ea" />
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.notifTopRow}>
            <View style={styles.aiTag}>
              <Text style={styles.aiTagText}>AI 추천</Text>
            </View>
            <Text style={styles.notifDist}>전방 300m</Text>
          </View>
          <Text style={styles.notifTitle}>
            SNS 인기 조망점{mountainName ? ` (${mountainName})` : ""}
          </Text>
          <Text style={styles.notifDesc}>
            인생샷을 남기기 좋은 탁 트인 뷰입니다.
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => setSnsSpot(false)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="eye-off-outline" size={18} color="#9ca3af" />
        </TouchableOpacity>
      </Animated.View>

      {/* ── 코스 메타 뱃지 ── */}
      <View style={styles.metaBadgeGroup}>
        <View style={styles.metaBadge}>
          <Ionicons name="location-outline" size={12} color="#6b7280" />
          <Text style={styles.metaBadgeText}>{remainingDist.toFixed(2)}km</Text>
        </View>
        <View style={styles.metaBadge}>
          <Ionicons name="trending-up-outline" size={12} color="#3b82f6" />
          <Text style={[styles.metaBadgeText, { color: "#2563eb" }]}>
            {elevation}
          </Text>
        </View>
      </View>

      {/* ── 위치 마커 ── */}
      <View style={styles.centerMarker} pointerEvents="none">
        <Animated.View
          style={[styles.markerPulse, { transform: [{ scale: markerScale }] }]}
        />
        <View style={styles.markerDot} />
      </View>

      {/* ── 하단 대시보드 ── */}
      <Animated.View
        style={[
          styles.dashboard,
          { transform: [{ translateY: dashboardTransY }] },
        ]}
      >
        <View style={styles.toggleBar}>
          <View style={styles.toggleItem}>
            <View
              style={[
                styles.toggleIconWrap,
                { backgroundColor: dynamicAnalysis ? "#f0fdf4" : "#f3f4f6" },
              ]}
            >
              <Ionicons
                name="pulse"
                size={15}
                color={dynamicAnalysis ? "#16a34a" : "#9ca3af"}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.toggleLabel,
                  { color: dynamicAnalysis ? "#1f2937" : "#9ca3af" },
                ]}
              >
                동적 분석
              </Text>
            </View>
            <ToggleSwitch
              enabled={dynamicAnalysis}
              onChange={setDynamicAnalysis}
              activeColor="#22c55e"
            />
          </View>
          <View style={styles.toggleDivider} />
          <View style={styles.toggleItem}>
            <View
              style={[
                styles.toggleIconWrap,
                { backgroundColor: snsSpot ? "#faf5ff" : "#f3f4f6" },
              ]}
            >
              <Ionicons
                name="camera"
                size={15}
                color={snsSpot ? "#9333ea" : "#9ca3af"}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.toggleLabel,
                  { color: snsSpot ? "#1f2937" : "#9ca3af" },
                ]}
              >
                SNS 조망점
              </Text>
            </View>
            <ToggleSwitch
              enabled={snsSpot}
              onChange={setSnsSpot}
              activeColor="#9333ea"
            />
          </View>
        </View>

        <View style={styles.divider} />

        {dynamicAnalysis ? (
          <Animated.View style={{ opacity: analysisOpacity }}>
            <View style={styles.dashboardTop}>
              <View>
                <View style={styles.liveRow}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveText}>실시간 현위치 분석 중</Text>
                </View>
                <Text style={styles.etaNumber}>
                  {dynamicEta}
                  <Text style={styles.etaUnit}>분 남음</Text>
                </Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.distLabel}>잔여 거리</Text>
                <Text style={styles.distValue}>
                  {remainingDist.toFixed(2)}km
                </Text>
              </View>
            </View>

            <View style={styles.metricsRow}>
              <View style={[styles.metricBox, { backgroundColor: "#f9fafb" }]}>
                <Text style={[styles.metricBoxLabel, { color: "#6b7280" }]}>
                  현재 페이스
                </Text>
                <Text style={[styles.metricBoxValue, { color: "#111827" }]}>
                  {currentPace.toFixed(1)}
                  <Text style={styles.metricBoxUnit}> km/h</Text>
                </Text>
              </View>
              <View style={[styles.metricBox, { backgroundColor: "#fff7ed" }]}>
                <Text style={[styles.metricBoxLabel, { color: "#ea580c" }]}>
                  현재 경사도
                </Text>
                <Text style={[styles.metricBoxValue, { color: "#ea580c" }]}>
                  {currentSlope}
                  <Text style={styles.metricBoxUnit}> %</Text>
                </Text>
              </View>
              <View style={[styles.metricBox, { backgroundColor: "#eff6ff" }]}>
                <Text style={[styles.metricBoxLabel, { color: "#2563eb" }]}>
                  심박수
                </Text>
                <Text style={[styles.metricBoxValue, { color: "#2563eb" }]}>
                  {Math.round(heartRate)}
                  <Text style={styles.metricBoxUnit}> bpm</Text>
                </Text>
              </View>
            </View>

            <View style={styles.infoBox}>
              <Ionicons
                name="information-circle-outline"
                size={16}
                color="#9ca3af"
              />
              <Text style={styles.infoText}>
                회원님의 <Text style={styles.infoTextBold}>현위치</Text>에서
                심박수({Math.round(heartRate)}bpm)와 페이스(
                {currentPace.toFixed(1)}km/h)를 반영하여{" "}
                <Text style={styles.infoTextBold}>실제 알고리즘(Tobler) </Text>
                에 따른 도착 시간을 실시간으로 계산합니다.{" "}
                {timeSaved > 0 && (
                  <Text style={styles.infoTextBold}>
                    (기존 대비 {timeSaved}분 단축)
                  </Text>
                )}
              </Text>
            </View>
          </Animated.View>
        ) : (
          <View style={styles.analysisOffState}>
            <View style={styles.analysisOffIcon}>
              <Ionicons name="eye-off-outline" size={22} color="#9ca3af" />
            </View>
            <Text style={styles.analysisOffTitle}>
              동적 분석이 꺼져 있습니다
            </Text>
            <Text style={styles.analysisOffSub}>
              위 토글을 켜면 현위치 기반 페이스·경사도 분석이 시작됩니다.
            </Text>
          </View>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#111827" },
  mapImage: { ...StyleSheet.absoluteFillObject, opacity: 0.65 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(10,15,30,0.35)",
  },
  topBar: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    zIndex: 20,
    gap: 12,
  },
  routeLabel: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    gap: 8,
  },
  routeLabelSub: {
    fontSize: 10,
    color: "rgba(255,255,255,0.6)",
    fontWeight: "500",
    marginBottom: 1,
  },
  routeLabelText: { fontSize: 13, color: "#ffffff", fontWeight: "700" },
  sosButton: {
    width: 48,
    height: 48,
    backgroundColor: "#ef4444",
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#f87171",
    elevation: 8,
    shadowColor: "#ef4444",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    flexShrink: 0,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 30,
  },
  loadingText: { color: "#ffffff", marginTop: 12, fontWeight: "600" },
  notifCard: {
    position: "absolute",
    left: 20,
    right: 20,
    backgroundColor: "rgba(255,255,255,0.97)",
    borderRadius: 20,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    zIndex: 20,
    elevation: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  notifCardHidden: { pointerEvents: "none" },
  notifIconWrap: {
    width: 44,
    height: 44,
    backgroundColor: "#f3e8ff",
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  notifTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  aiTag: {
    backgroundColor: "#f3e8ff",
    borderRadius: 99,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  aiTagText: { fontSize: 11, fontWeight: "700", color: "#9333ea" },
  notifDist: { fontSize: 11, color: "#9ca3af", fontWeight: "500" },
  notifTitle: { fontSize: 13, fontWeight: "700", color: "#111827" },
  notifDesc: { fontSize: 11, color: "#6b7280", marginTop: 1 },
  metaBadgeGroup: {
    position: "absolute",
    right: 16,
    bottom: 320,
    flexDirection: "column",
    gap: 8,
    zIndex: 15,
  },
  metaBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  metaBadgeText: { fontSize: 12, fontWeight: "600", color: "#374151" },
  centerMarker: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  markerPulse: {
    position: "absolute",
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(59,130,246,0.22)",
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.4)",
  },
  markerDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#3b82f6",
    borderWidth: 2.5,
    borderColor: "#ffffff",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  dashboard: {
    position: "absolute",
    bottom: 16,
    left: 14,
    right: 14,
    backgroundColor: "#ffffff",
    borderRadius: 28,
    zIndex: 20,
    elevation: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    overflow: "hidden",
  },
  toggleBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    gap: 0,
  },
  toggleItem: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  toggleIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  toggleLabel: { fontSize: 12, fontWeight: "700" },
  toggleTrack: {
    width: 40,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  toggleThumb: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#ffffff",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
  },
  toggleDivider: {
    width: 1,
    height: 36,
    backgroundColor: "#f3f4f6",
    marginHorizontal: 8,
  },
  divider: { height: 1, backgroundColor: "#f3f4f6", marginHorizontal: 0 },
  dashboardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingHorizontal: 20,
    paddingTop: 16,
    marginBottom: 16,
  },
  liveRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#22c55e" },
  liveText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#16a34a",
    letterSpacing: 0.3,
  },
  etaNumber: { fontSize: 34, fontWeight: "800", color: "#111827" },
  etaUnit: { fontSize: 18, fontWeight: "500", color: "#6b7280" },
  distLabel: {
    fontSize: 12,
    color: "#9ca3af",
    fontWeight: "500",
    marginBottom: 4,
  },
  distValue: { fontSize: 22, fontWeight: "700", color: "#1f2937" },
  metricsRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  metricBox: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 11,
    paddingHorizontal: 6,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#f3f4f6",
  },
  metricBoxLabel: {
    fontSize: 10,
    fontWeight: "500",
    marginBottom: 4,
    textAlign: "center",
  },
  metricBoxValue: { fontSize: 14, fontWeight: "700", textAlign: "center" },
  metricBoxUnit: { fontSize: 10, fontWeight: "400" },
  infoBox: {
    backgroundColor: "#f9fafb",
    borderRadius: 14,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
    borderWidth: 1,
    borderColor: "#f3f4f6",
  },
  infoText: { flex: 1, fontSize: 11, color: "#6b7280", lineHeight: 18 },
  infoTextBold: { color: "#1f2937", fontWeight: "600" },
  analysisOffState: { alignItems: "center", paddingVertical: 24, gap: 6 },
  analysisOffIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  analysisOffTitle: { fontSize: 14, fontWeight: "600", color: "#6b7280" },
  analysisOffSub: {
    fontSize: 12,
    color: "#9ca3af",
    textAlign: "center",
    paddingHorizontal: 24,
  },
});
