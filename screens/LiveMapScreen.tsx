import { Ionicons } from "@expo/vector-icons";
import {
  NaverMapMarkerOverlay,
  NaverMapMultiPathOverlay,
  NaverMapPathOverlay,
  NaverMapView,
  type MultiPathPart,
  type Region,
} from "@mj-studio/react-native-naver-map";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { RouteProp } from "@react-navigation/native";
import { useNavigation, useRoute } from "@react-navigation/native";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
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
import { useAuth } from "../contexts/AuthContext";
import { useWatchHealth } from "../contexts/WatchHealthContext";
import { apiService, type UnifiedMountainNode } from "../data/api";

// Android에서 LayoutAnimation 활성화
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type LiveMapNavProp = BottomTabNavigationProp<RootTabParamList, "내비게이션">;
type LiveMapRouteProp = RouteProp<RootTabParamList, "내비게이션">;
const UNIFIED_PATH_CHUNK_SIZE = 1200;
const UNIFIED_PATH_CHUNK_DELAY_MS = 120;

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

function parseDistanceKm(distanceStr: string | undefined): number {
  if (!distanceStr) return 0;
  const value = Number(distanceStr.replace(/[^\d.]/g, ""));
  return Number.isFinite(value) ? value : 0;
}

function parseElevationMeters(elevationStr: string | undefined): number {
  if (!elevationStr) return 0;
  const value = Number(elevationStr.replace(/[^\d.-]/g, ""));
  return Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
}

function estimateCalories(
  distanceKm: number,
  durationMinutes: number,
  elevationGainM: number,
  avgHeartRate: number,
): number {
  const distanceCalories = distanceKm * 55;
  const timeCalories = durationMinutes * 4.5;
  const climbCalories = elevationGainM * 0.35;
  const heartRateBonus = Math.max(0, avgHeartRate - 100) * 1.2;
  return Math.max(
    1,
    Math.round(distanceCalories + timeCalories + climbCalories + heartRateBonus),
  );
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

// 라이브러리 인터페이스에 맞게 변환
interface MapCoord {
  latitude: number;
  longitude: number;
}

export default function LiveMapScreen() {
  const navigation = useNavigation<LiveMapNavProp>();
  const route = useRoute<LiveMapRouteProp>();
  const { isGuest, token, user } = useAuth();
  const {
    isEnabled: watchSyncEnabled,
    latestData: watchHealthData,
    status: watchHealthStatus,
  } = useWatchHealth();

  /* 코스 파라미터 (홈에서 전달, 없으면 기본값) */
  const params = route.params as CourseParams | undefined;
  const courseId = params?.courseId;
  const courseName = params?.courseName ?? "관절 보호 완만 코스";
  const mountainName = params?.mountainName ?? "";
  const initialDist = params?.distance ?? "3.2km";
  const elevation = params?.elevation ?? "+180m";
  const initialDistanceKm = parseDistanceKm(initialDist) || 3.2;
  const elevationGainM = parseElevationMeters(elevation);

  /* ── 실시간 데이터 상태 (알고리즘 연동) ── */
  const [loading, setLoading] = useState(false);
  const [savingRecord, setSavingRecord] = useState(false);
  const [remainingDist, setRemainingDist] = useState(initialDistanceKm);
  const [totalRouteDistanceKm, setTotalRouteDistanceKm] =
    useState(initialDistanceKm);

  // 지도 관련 상태
  const [routePath, setRoutePath] = useState<MapCoord[]>([]);
  const [unifiedPathPartChunks, setUnifiedPathPartChunks] = useState<
    MultiPathPart[][]
  >([]);
  const [mapRegion, setMapRegion] = useState<Region | undefined>(undefined);
  const [startPoint, setStartPoint] = useState<MapCoord | null>(null);
  const [endPoint, setEndPoint] = useState<MapCoord | null>(null);
  const [currentLocation, setCurrentLocation] = useState<MapCoord>({
    latitude: 37.5665,
    longitude: 126.978,
  });

  // 정적 기준 시간 및 동적 실시간 시간
  const initialMinutes = parseTimeToMinutes(params?.time);
  const [staticEta, setStaticEta] = useState(initialMinutes);
  const [dynamicEta, setDynamicEta] = useState(initialMinutes);
  const [timeSaved, setTimeSaved] = useState(0);

  /* 센서 시뮬레이션 데이터 */
  const [currentPace, setCurrentPace] = useState(3.2); // km/h
  const [currentSlope, setCurrentSlope] = useState(12); // %
  const [heartRate, setHeartRate] = useState(170); // bpm
  const [unifiedLoading, setUnifiedLoading] = useState(false);

  /* ── 토글 상태 ── */
  const [dynamicAnalysis, setDynamicAnalysis] = useState(true);

  /* ── 애니메이션 참조 ── */
  const dashboardTransY = useRef(new Animated.Value(120)).current;
  const analysisOpacity = useRef(new Animated.Value(1)).current;
  const unifiedChunkTimeouts = useRef<ReturnType<typeof setTimeout>[]>([]);
  const hikeStartedAt = useRef(Date.now());
  const hasLiveHealthDataRef = useRef(false);

  /* ── 실제 알고리즘 데이터 로드 ── */
  useEffect(() => {
    setRemainingDist(initialDistanceKm);
    setTotalRouteDistanceKm(initialDistanceKm);
    setStaticEta(initialMinutes);
    setDynamicEta(initialMinutes);
    setTimeSaved(0);
    hikeStartedAt.current = Date.now();
  }, [courseId, initialDistanceKm, initialMinutes]);

  useEffect(() => {
    if (courseId) {
      fetchRealAlgorithmData(courseId);
    }
  }, [courseId]);

  useEffect(() => {
    const normalizedMountainName = mountainName.trim();
    if (normalizedMountainName) {
      fetchUnifiedMountainPath(normalizedMountainName);
    } else {
      clearUnifiedPathTimers();
      setUnifiedPathPartChunks([]);
      setMapRegion(undefined);
    }

    return clearUnifiedPathTimers;
  }, [mountainName]);

  async function fetchRealAlgorithmData(id: string) {
    try {
      setLoading(true);
      const result = await apiService.getCourseRoute(id);

      const realDistKm = (result.summary.distance_m || 0) / 1000;
      const realEtaMin = Math.round((result.summary.duration_sec || 0) / 60);

      setTotalRouteDistanceKm(realDistKm || initialDistanceKm);
      setRemainingDist(realDistKm);
      setDynamicEta(realEtaMin);
      setTimeSaved(Math.max(0, staticEta - realEtaMin));

      // 경로 데이터 설정
      if (result.path && result.path.length > 0) {
        const mappedPath = result.path.map((p: any) => ({
          latitude: p.lat,
          longitude: p.lng,
        }));
        setRoutePath(mappedPath);
        setStartPoint(mappedPath[0]);
        setEndPoint(mappedPath[mappedPath.length - 1]);
        setCurrentLocation(mappedPath[0]); // 시뮬레이션 시작 위치
      }
    } catch (error) {
      console.error("[LiveMap] Failed to fetch real route data:", error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchUnifiedMountainPath(name: string) {
    try {
      clearUnifiedPathTimers();
      setUnifiedLoading(true);
      setUnifiedPathPartChunks([]);
      const result = await apiService.getUnifiedMountainPath(name);

      if (!result?.nodes?.length || !result?.courses?.length) {
        setUnifiedPathPartChunks([]);
        return;
      }

      const nodeMap = new Map<string, MapCoord>();
      result.nodes.forEach((node) => {
        if (isValidUnifiedNode(node)) {
          nodeMap.set(String(node.id), {
            latitude: node.lat,
            longitude: node.lng,
          });
        }
      });

      const seenEdges = new Set<string>();
      const pathParts: MultiPathPart[] = [];

      result.courses.forEach((course) => {
        const nodeIds = Array.isArray(course.node_ids) ? course.node_ids : [];
        if (nodeIds.length < 2) return;

        for (let index = 0; index < nodeIds.length - 1; index++) {
          const fromId = String(nodeIds[index]);
          const toId = String(nodeIds[index + 1]);
          const fromCoord = nodeMap.get(fromId);
          const toCoord = nodeMap.get(toId);

          if (!fromCoord || !toCoord) continue;

          const edgeKey =
            fromId.localeCompare(toId, undefined, { numeric: true }) <= 0
              ? `${fromId}-${toId}`
              : `${toId}-${fromId}`;
          if (seenEdges.has(edgeKey)) continue;
          seenEdges.add(edgeKey);

          pathParts.push({
            coords: [fromCoord, toCoord],
            color: "#ef4444",
            passedColor: "#ef4444",
            outlineColor: "#0ea5e9",
            passedOutlineColor: "#0ea5e9",
          });
        }
      });

      const boundsRegion = createRegionFromNodes(result.nodes);
      if (boundsRegion) {
        setMapRegion(boundsRegion);
      }

      if (pathParts.length > 0 && routePath.length === 0) {
        const firstCoord = pathParts[0].coords[0];
        setCurrentLocation(firstCoord);
      }

      setUnifiedLoading(false);
      revealUnifiedPathChunks(pathParts);
    } catch (error) {
      console.error("[LiveMap] Failed to fetch unified mountain path:", error);
      setUnifiedPathPartChunks([]);
    } finally {
      setUnifiedLoading(false);
    }
  }

  function clearUnifiedPathTimers() {
    unifiedChunkTimeouts.current.forEach(clearTimeout);
    unifiedChunkTimeouts.current = [];
  }

  function revealUnifiedPathChunks(pathParts: MultiPathPart[]) {
    clearUnifiedPathTimers();

    const chunks: MultiPathPart[][] = [];
    for (
      let index = 0;
      index < pathParts.length;
      index += UNIFIED_PATH_CHUNK_SIZE
    ) {
      chunks.push(pathParts.slice(index, index + UNIFIED_PATH_CHUNK_SIZE));
    }

    chunks.forEach((chunk, index) => {
      const timeout = setTimeout(() => {
        setUnifiedPathPartChunks((prev) => [...prev, chunk]);
      }, index * UNIFIED_PATH_CHUNK_DELAY_MS);
      unifiedChunkTimeouts.current.push(timeout);
    });
  }

  function isValidUnifiedNode(node: UnifiedMountainNode): boolean {
    return (
      Number.isFinite(node.lat) &&
      Number.isFinite(node.lng) &&
      Math.abs(node.lat) <= 90 &&
      Math.abs(node.lng) <= 180
    );
  }

  function createRegionFromNodes(nodes: UnifiedMountainNode[]): Region | null {
    const validNodes = nodes.filter(isValidUnifiedNode);
    if (validNodes.length === 0) return null;

    const lats = validNodes.map((node) => node.lat);
    const lngs = validNodes.map((node) => node.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const latDelta = Math.max((maxLat - minLat) * 1.18, 0.01);
    const lngDelta = Math.max((maxLng - minLng) * 1.18, 0.01);

    return {
      latitude: minLat - (latDelta - (maxLat - minLat)) / 2,
      longitude: minLng - (lngDelta - (maxLng - minLng)) / 2,
      latitudeDelta: latDelta,
      longitudeDelta: lngDelta,
    };
  }

  useEffect(() => {
    Animated.timing(dashboardTransY, {
      toValue: 0,
      duration: 500,
      easing: Easing.out(Easing.back(1.1)),
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    const liveHeartRate = watchHealthData?.heartRate;
    const hasLiveHeartRate =
      watchSyncEnabled &&
      watchHealthStatus === "live" &&
      liveHeartRate !== null &&
      liveHeartRate !== undefined;

    hasLiveHealthDataRef.current = hasLiveHeartRate;

    if (hasLiveHeartRate) {
      setHeartRate(liveHeartRate);
    }
  }, [watchHealthData?.heartRate, watchHealthStatus, watchSyncEnabled]);

  /* ── 센서 데이터 및 실시간 동적 ETA 시뮬레이션 ── */
  useEffect(() => {
    if (!dynamicAnalysis || routePath.length === 0) return;

    let pathIndex = 0;
    const interval = setInterval(() => {
      // 1. 센서 데이터 변동 시뮬레이션
      if (!hasLiveHealthDataRef.current) {
        setHeartRate((prev) => {
          const next = prev + (Math.random() - 0.5) * 4;
          return Math.min(160, Math.max(60, next));
        });
      }

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
        const travelDist = (currentPace / 3600) * 10;
        const nextDist = Math.max(0, prevDist - travelDist);

        const slopeAdjustment = 1 + (Math.abs(currentSlope) / 10) * 0.5;
        const calculatedEta = Math.round(
          (nextDist / (currentPace / slopeAdjustment)) * 60,
        );

        setDynamicEta(nextDist > 0 ? Math.max(1, calculatedEta) : 0);

        // 지도 상의 현재 위치 업데이트 (시뮬레이션)
        if (pathIndex < routePath.length - 1) {
          pathIndex++;
          setCurrentLocation(routePath[pathIndex]);
        }

        return nextDist;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [dynamicAnalysis, routePath, currentPace, currentSlope]);

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
  const isLoading = loading || unifiedLoading;
  const estimatedDurationMinutes = Math.max(
    1,
    Math.round((Date.now() - hikeStartedAt.current) / 60000),
    totalRouteDistanceKm > 0 && remainingDist <= 0.05 ? initialMinutes : 0,
  );
  const estimatedCalories = estimateCalories(
    totalRouteDistanceKm,
    estimatedDurationMinutes,
    elevationGainM,
    Math.round(heartRate),
  );
  const isUsingWatchHeartRate =
    watchSyncEnabled &&
    watchHealthStatus === "live" &&
    watchHealthData?.heartRate !== null &&
    watchHealthData?.heartRate !== undefined;
  const analysisSourceLabel = isUsingWatchHeartRate
    ? "워치 심박 반영"
    : "현위치 기반";

  async function handleSaveHikingRecord() {
    if (!user || isGuest) {
      Alert.alert(
        "로그인이 필요해요",
        "산행 기록은 카카오 로그인 후 계정에 저장할 수 있어요.",
      );
      return;
    }

    if (savingRecord) return;

    try {
      setSavingRecord(true);
      await apiService.createHikingRecord(
        {
          userId: user.id,
          mountainName: mountainName || "선택한 산",
          courseId: courseId ?? null,
          courseName,
          durationMinutes: estimatedDurationMinutes,
          distanceKm: totalRouteDistanceKm,
          calories: estimatedCalories,
          avgHeartRate: Math.round(heartRate),
          maxAltitude: elevationGainM,
          elevationGainM,
        },
        token,
      );

      Alert.alert("산행 기록 저장", "이번 산행이 성취도에 반영됐어요.", [
        { text: "확인", onPress: () => navigation.navigate("성취도") },
      ]);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "산행 기록을 저장하지 못했습니다.";
      Alert.alert("저장 실패", message);
    } finally {
      setSavingRecord(false);
    }
  }

  return (
    <View style={styles.container}>
      {/* ── 네이버 지도 ── */}
      <NaverMapView
        style={StyleSheet.absoluteFillObject}
        camera={mapRegion ? undefined : { ...currentLocation, zoom: 15 }}
        region={mapRegion}
        animationDuration={500}
        mapPadding={{ top: 130, right: 20, bottom: 300, left: 20 }}
        layerGroups={{
          BUILDING: true,
          TRAFFIC: false,
          TRANSIT: false,
          BICYCLE: false,
          MOUNTAIN: true,
          CADASTRAL: false,
        }}
        isShowScaleBar={true}
        isShowLocationButton={false}
      >
        {/* 통합 경로 네트워크 표시 */}
        {unifiedPathPartChunks.map((pathParts, index) => (
          <NaverMapMultiPathOverlay
            key={`unified-path-${index}`}
            pathParts={pathParts}
            width={3}
            outlineWidth={2}
            zIndex={1}
            isHideCollidedSymbols={false}
          />
        ))}

        {/* 경로 표시 */}
        {routePath.length > 1 && (
          <NaverMapPathOverlay
            coords={routePath}
            width={6}
            color="#3b82f6"
            outlineWidth={2}
            outlineColor="#ffffff"
            passedColor="#94a3b8"
            zIndex={5}
          />
        )}

        {/* 현재 위치 마커 */}
        <NaverMapMarkerOverlay
          latitude={currentLocation.latitude}
          longitude={currentLocation.longitude}
          width={24}
          height={24}
          image={require("../assets/images/favicon.png")} // 임시 아이콘
          caption={{ text: "현위치" }}
          subCaption={{ text: `${currentPace.toFixed(1)}km/h` }}
        />

        {/* 출발/도착 마커 */}
        {startPoint && (
          <NaverMapMarkerOverlay
            latitude={startPoint.latitude}
            longitude={startPoint.longitude}
            width={30}
            height={30}
            image={{ symbol: "green" }}
            caption={{ text: "출발" }}
          />
        )}
        {endPoint && (
          <NaverMapMarkerOverlay
            latitude={endPoint.latitude}
            longitude={endPoint.longitude}
            width={30}
            height={30}
            image={{ symbol: "red" }}
            caption={{ text: "도착" }}
          />
        )}
      </NaverMapView>

      <View style={styles.overlay} pointerEvents="none" />

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
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#ffffff" />
          <Text style={styles.loadingText}>
            {unifiedLoading
              ? `${mountainName || "산"} 통합 경로 불러오는 중...`
              : "현위치 기반 경로 분석 중..."}
          </Text>
        </View>
      )}

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

      {/* ── 하단 대시보드 ── */}
      <Animated.View
        style={[
          styles.dashboard,
          { transform: [{ translateY: dashboardTransY }] },
        ]}
      >
        <View style={styles.analysisControl}>
          <View
            style={[
              styles.analysisControlIcon,
              { backgroundColor: dynamicAnalysis ? "#ecfdf5" : "#f3f4f6" },
            ]}
          >
            <Ionicons
              name="pulse"
              size={17}
              color={dynamicAnalysis ? "#16a34a" : "#9ca3af"}
            />
          </View>
          <View style={styles.analysisControlTextBlock}>
            <Text style={styles.analysisControlTitle}>동적 분석</Text>
            <Text style={styles.analysisControlSub}>{analysisSourceLabel}</Text>
          </View>
          <ToggleSwitch
            enabled={dynamicAnalysis}
            onChange={setDynamicAnalysis}
            activeColor="#22c55e"
          />
        </View>

        <View style={styles.divider} />

        {dynamicAnalysis ? (
          <Animated.View style={{ opacity: analysisOpacity }}>
            <View style={styles.dashboardTop}>
              <View>
                <View style={styles.liveRow}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveText}>실시간 경로 분석 중</Text>
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

            <TouchableOpacity
              style={[
                styles.saveRecordButton,
                savingRecord && styles.saveRecordButtonDisabled,
              ]}
              activeOpacity={0.86}
              onPress={handleSaveHikingRecord}
              disabled={savingRecord}
            >
              {savingRecord ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Ionicons name="checkmark-circle" size={18} color="#ffffff" />
              )}
              <Text style={styles.saveRecordButtonText}>
                {savingRecord ? "기록 저장 중" : "산행 기록 저장"}
              </Text>
            </TouchableOpacity>
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
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(10,15,30,0.15)",
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
    backgroundColor: "rgba(255,255,255,0.85)",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
    gap: 8,
  },
  routeLabelSub: {
    fontSize: 10,
    color: "#6b7280",
    fontWeight: "500",
    marginBottom: 1,
  },
  routeLabelText: { fontSize: 13, color: "#111827", fontWeight: "700" },
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
  metaBadgeGroup: {
    position: "absolute",
    right: 16,
    bottom: 300,
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
  analysisControl: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 10,
  },
  analysisControlIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  analysisControlTextBlock: { flex: 1, minWidth: 0 },
  analysisControlTitle: { fontSize: 13, color: "#111827", fontWeight: "800" },
  analysisControlSub: {
    fontSize: 11,
    color: "#64748b",
    fontWeight: "600",
    marginTop: 1,
  },
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
  saveRecordButton: {
    marginHorizontal: 16,
    marginBottom: 16,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#16a34a",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  saveRecordButtonDisabled: {
    opacity: 0.72,
  },
  saveRecordButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
  },
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
