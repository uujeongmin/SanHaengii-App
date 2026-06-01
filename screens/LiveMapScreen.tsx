import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import {
  NaverMapMarkerOverlay,
  NaverMapMultiPathOverlay,
  NaverMapPathOverlay,
  NaverMapView,
  type MultiPathPart,
  type NaverMapViewRef,
  type Region,
} from "@mj-studio/react-native-naver-map";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { RouteProp } from "@react-navigation/native";
import { useNavigation, useRoute } from "@react-navigation/native";
import * as Location from "expo-location";
import * as SecureStore from "expo-secure-store";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  LayoutAnimation,
  PanResponder,
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
import {
  apiService,
  type HealthData,
  type PhotoSpot,
  type UnifiedMountainNode,
} from "../data/api";

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
const SAVED_MAPS_KEY_BASE = "sanhaengii_saved_maps";

const markerBubbleStyle = {
  width: 36,
  height: 36,
  borderRadius: 18,
  alignItems: "center" as const,
  justifyContent: "center" as const,
  borderWidth: 2,
  borderColor: "#ffffff",
};

const MARKER_ICON_SETS = {
  ionicons: Ionicons,
  material: MaterialCommunityIcons,
} as const;

/* ── 지도 마커 아이콘 (원형 버블) ── */
function MapMarkerIcon({
  name,
  color,
  set = "ionicons",
}: {
  name: string;
  color: string;
  set?: keyof typeof MARKER_ICON_SETS;
}) {
  const IconSet = MARKER_ICON_SETS[set];
  return (
    <View
      key={`${set}/${name}/${color}`}
      collapsable={false}
      style={[markerBubbleStyle, { backgroundColor: color }]}
    >
      <IconSet name={name as any} size={18} color="#ffffff" />
    </View>
  );
}

/* ── 포토스팟 정보창 (마커 위 말풍선) ── */
function PhotoSpotInfoWindow({ spot }: { spot: PhotoSpot }) {
  return (
    <View
      key={`info/${spot.spot}/${spot.address}`}
      collapsable={false}
      style={styles.infoWindowWrapper}
    >
      <View style={styles.infoWindowCard}>
        <View style={styles.infoWindowHeader}>
          <Ionicons name="camera" size={14} color="#8b5cf6" />
          <Text style={styles.infoWindowTitle} numberOfLines={1}>
            {spot.spot ?? "포토스팟"}
          </Text>
          <Ionicons name="close" size={14} color="#9ca3af" />
        </View>
        <Text style={styles.infoWindowAddress} numberOfLines={2}>
          {spot.address ?? "주소 정보가 없습니다."}
        </Text>
      </View>
      {/* 아래를 가리키는 말풍선 꼬리 */}
      <View style={styles.infoWindowArrow} />
      {/* 마커 아이콘 높이만큼 띄우는 투명 공간 */}
      <View style={styles.infoWindowSpacer} />
    </View>
  );
}

/**
 * 문자열을 분 단위 숫자로 변환합니다.
 */
function parseTimeToMinutes(timeStr: string | undefined): number {
  if (!timeStr) return 0;

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
    return isNaN(onlyNum) ? 0 : onlyNum;
  }

  return totalMinutes || 0;
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
    Math.round(
      distanceCalories + timeCalories + climbCalories + heartRateBonus,
    ),
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
    latestData: latestWatchData,
    status: watchStatus,
    anomalyAlert,
    dismissAnomaly,
    markWatchNotified,
  } = useWatchHealth();
  // 워치 심박수가 실제로 수신되는지(라이브) 여부
  const isWatchHrLive =
    watchStatus === "live" && (latestWatchData?.heartRate ?? 0) > 0;

  /* 코스 파라미터 (홈에서 전달, 없으면 기본값) */
  const params = route.params as CourseParams | undefined;
  const courseId = params?.courseId;
  const courseName = params?.courseName ?? "코스를 선택하세요";
  const mountainName = params?.mountainName ?? "";
  const initialDist = params?.distance ?? "0km";
  const elevation = params?.elevation ?? "0m";
  const initialDistanceKm = parseDistanceKm(initialDist) || 0;
  const elevationGainM = parseElevationMeters(elevation);

  /* ── 실시간 데이터 상태 (알고리즘 연동) ── */
  const [loading, setLoading] = useState(false);
  const [savingRecord, setSavingRecord] = useState(false);
  const [activeHikingRecordId, setActiveHikingRecordId] = useState<
    number | null
  >(null);
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

  // SNS 인기 조망점(포토스팟) 상태
  const [photoSpots, setPhotoSpots] = useState<PhotoSpot[]>([]);
  const [selectedPhotoSpot, setSelectedPhotoSpot] = useState<PhotoSpot | null>(
    null,
  );

  // 오프라인 지도 저장 상태
  const [isOfflineDownloading, setIsOfflineDownloading] = useState(false);
  const [isMapSaved, setIsMapSaved] = useState(false);

  // 정적 기준 시간 및 동적 실시간 시간
  const initialMinutes = parseTimeToMinutes(params?.time);
  const [staticEta, setStaticEta] = useState(initialMinutes);
  const [dynamicEta, setDynamicEta] = useState(initialMinutes);
  const [timeSaved, setTimeSaved] = useState(0);

  /* 센서 시뮬레이션 데이터 */
  const [currentPace, setCurrentPace] = useState(0); // km/h
  const [currentSlope, setCurrentSlope] = useState(0); // %
  const [heartRate, setHeartRate] = useState(0); // bpm
  const [unifiedLoading, setUnifiedLoading] = useState(false);

  // 워치 걸음수로 페이스 추정 (이전 측정값 보관)
  const prevStepsRef = useRef<{ steps: number; time: number } | null>(null);
  // 워치 기반 페이스를 한 번이라도 산출했는지 (이후 시뮬레이션 페이스 중단)
  const hasWatchPaceRef = useRef(false);

  /* ── 토글 상태 ── */
  const [dynamicAnalysis, setDynamicAnalysis] = useState(true);
  const [snsSpot, setSnsSpot] = useState(true);
  const [isPaused, setIsPaused] = useState(false);

  /* ── 접기/펼치기 상태 ── */
  const [isNotifCollapsed, setIsNotifCollapsed] = useState(false);
  const [isDashboardCollapsed, setIsDashboardCollapsed] = useState(false);

  /* ── 지도 컨트롤 상태 ── */
  const mapRef = useRef<NaverMapViewRef>(null);
  // 사용자가 드래그한 지도 카메라 위치 기억 (줌/현위치 버튼 기준)
  const mapCamera = useRef<MapCoord | null>(null);

  const [zoom, setZoom] = useState(15);

  const handleZoomIn = () => {
    setZoom((z) => {
      const newZoom = Math.min(z + 1, 21);
      const target = mapCamera.current || currentLocation;
      if (target) {
        mapRef.current?.animateCameraTo({
          latitude: target.latitude,
          longitude: target.longitude,
          zoom: newZoom,
        });
      }
      return newZoom;
    });
  };
  const handleZoomOut = () => {
    setZoom((z) => {
      const newZoom = Math.max(z - 1, 5);
      const target = mapCamera.current || currentLocation;
      if (target) {
        mapRef.current?.animateCameraTo({
          latitude: target.latitude,
          longitude: target.longitude,
          zoom: newZoom,
        });
      }
      return newZoom;
    });
  };
  const handleRescanGPS = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("권한 필요", "위치 정보 접근 권한이 필요합니다.");
        return;
      }

      let location = await Location.getLastKnownPositionAsync({});
      if (!location) {
        location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
      }

      if (location) {
        const newLoc = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };
        setCurrentLocation(newLoc);

        if (mapRef.current) {
          mapRef.current.animateCameraTo({
            latitude: newLoc.latitude,
            longitude: newLoc.longitude,
            zoom: 16,
          });
        }
      }
    } catch (e) {
      console.error("[LiveMap] Error rescanning GPS:", e);
      Alert.alert(
        "위치 오류",
        "현재 위치를 가져올 수 없습니다. 에뮬레이터 설정(Location)을 확인해주세요.",
      );
    }
  };

  /**
   * 코스 주변 지도를 오프라인용으로 저장합니다.
   */
  const handleDownloadOfflineMap = async () => {
    if (routePath.length === 0) {
      Alert.alert("알림", "저장할 등산 코스 정보가 없습니다.");
      return;
    }

    try {
      setIsOfflineDownloading(true);

      // 1. 코스 전체가 보이도록 지도 영역 계산
      const lats = routePath.map((p) => p.latitude);
      const lngs = routePath.map((p) => p.longitude);
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      const minLng = Math.min(...lngs);
      const maxLng = Math.max(...lngs);

      const centerLat = (minLat + maxLat) / 2;
      const centerLng = (minLng + maxLng) / 2;

      // 2. 카메라 이동 및 타일 캐싱 유도
      if (mapRef.current) {
        mapRef.current.animateCameraTo({
          latitude: centerLat,
          longitude: centerLng,
          zoom: 14,
        });

        // 잠시 대기하여 타일이 로드되도록 함
        await new Promise((resolve) => setTimeout(resolve, 1500));

        // 3. 로컬 저장소에 저장 정보 기록 (사용자별 키)
        const savedKey = `${SAVED_MAPS_KEY_BASE}_${user?.id ?? "guest"}`;
        const savedStr = await SecureStore.getItemAsync(savedKey);
        let savedList = savedStr ? JSON.parse(savedStr) : [];

        // 중복 확인
        if (courseId && !savedList.find((c: any) => c.id === courseId)) {
          savedList.push({
            id: courseId,
            title: courseName,
            mountainId: mountainName,
            difficulty: params?.difficulty || "중",
            distance: params?.distance || "0km",
            time: params?.time || "0분",
            elevation: params?.elevation || "+0m",
            img: (params as any)?.img ?? null, // 전달받은 이미지 URL 저장
            path: routePath, // 오프라인 상세 화면에서 그리기 위해 경로 데이터 추가
          });
          await SecureStore.setItemAsync(savedKey, JSON.stringify(savedList));
        }

        // 4. 저장 완료 처리
        setIsMapSaved(true);
        Alert.alert(
          "오프라인 지도 저장",
          "코스 주변의 지도 데이터가 캐시에 저장되었습니다. [마이페이지 > 저장된 지도]에서 확인할 수 있습니다.",
        );
      }
    } catch (e) {
      console.error("[Offline] Download failed:", e);
      Alert.alert(
        "저장 실패",
        "지도 데이터를 저장하는 중 오류가 발생했습니다.",
      );
    } finally {
      setIsOfflineDownloading(false);
    }
  };

  // 코스가 바뀌면 저장 상태 초기화
  useEffect(() => {
    setIsMapSaved(false);
  }, [courseId]);

  // GPS 실시간 추적
  useEffect(() => {
    handleRescanGPS();

    let locationSubscription: Location.LocationSubscription | null = null;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") return;
        locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 5000,
            distanceInterval: 10,
          },
          (loc) => {
            setCurrentLocation({
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
            });
          },
        );
      } catch (err) {
        console.log("[LiveMap] watchPosition error:", err);
      }
    })();

    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, []);

  const isNotifCollapsedRef = useRef(isNotifCollapsed);
  useEffect(() => {
    isNotifCollapsedRef.current = isNotifCollapsed;
  }, [isNotifCollapsed]);

  const isDashboardCollapsedRef = useRef(isDashboardCollapsed);
  useEffect(() => {
    isDashboardCollapsedRef.current = isDashboardCollapsed;
  }, [isDashboardCollapsed]);

  const toggleNotifFold = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsNotifCollapsed(!isNotifCollapsed);
  };

  const toggleDashboardFold = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsDashboardCollapsed(!isDashboardCollapsed);
  };

  const handlePauseResume = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const next = !isPaused;
    setIsPaused(next);
    // 일시정지/재개 상태를 워치와 동기화 (status: paused/active)
    const recordId = activeHikingRecordIdRef.current;
    if (recordId) {
      apiService.updateHikingStatus(
        recordId,
        next ? "paused" : "active",
        token,
      );
    }
  };

  // 내비게이션 로컬 상태 초기화 (외부 종료 감지/중단 공통)
  const resetNavigationState = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    activeHikingRecordIdRef.current = null;
    activeHikingRecordKeyRef.current = null;
    setActiveHikingRecordId(null);
    setRoutePath([]);
    setStartPoint(null);
    setEndPoint(null);
    setRemainingDist(0);
    setDynamicEta(0);
    setUnifiedPathPartChunks([]);
    setIsPaused(false);
  };

  const handleStopNavigation = () => {
    Alert.alert("산행 중단", "현재 산행을 완전히 종료할까요? (기록 저장)", [
      { text: "취소", style: "cancel" },
      {
        text: "종료",
        style: "destructive",
        onPress: async () => {
          const recordId = activeHikingRecordIdRef.current;
          if (recordId) {
            // 중단 = 완전 종료(기록 저장). status: completed → 워치도 종료됨
            await apiService.updateHikingStatus(recordId, "completed", token);
          }
          resetNavigationState();
        },
      },
    ]);
  };

  /* ── 제스처 처리 (PanResponder) ── */
  const notifPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => isNotifCollapsedRef.current,
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dy) > 20,
      onPanResponderRelease: (_, gs) => {
        if (gs.dy < -20) {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setIsNotifCollapsed(true);
        } else if (Math.abs(gs.dx) < 5 && Math.abs(gs.dy) < 5) {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setIsNotifCollapsed((prev) => !prev);
        }
      },
    }),
  ).current;

  const dashboardPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => isDashboardCollapsedRef.current,
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dy) > 20,
      onPanResponderRelease: (_, gs) => {
        if (gs.dy > 20) {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setIsDashboardCollapsed(true);
        } else if (gs.dy < -20) {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setIsDashboardCollapsed(false);
        } else if (Math.abs(gs.dx) < 5 && Math.abs(gs.dy) < 5) {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setIsDashboardCollapsed((prev) => !prev);
        }
      },
    }),
  ).current;

  /* ── 애니메이션 참조 ── */
  const notifOpacity = useRef(new Animated.Value(0)).current;
  const notifTranslateY = useRef(new Animated.Value(-20)).current;
  const dashboardTransY = useRef(new Animated.Value(120)).current;
  const snsOpacity = useRef(new Animated.Value(1)).current;
  const analysisOpacity = useRef(new Animated.Value(1)).current;
  const unifiedChunkTimeouts = useRef<ReturnType<typeof setTimeout>[]>([]);
  const hikeStartedAt = useRef(Date.now());
  const activeHikingRecordIdRef = useRef<number | null>(null);
  const activeHikingRecordKeyRef = useRef<string | null>(null);

  useEffect(() => {
    activeHikingRecordIdRef.current = activeHikingRecordId;
  }, [activeHikingRecordId]);

  // 워치 중계용: 최신 잔여 ETA/거리를 ref로 보관 (인터벌 재생성 방지)
  const dynamicEtaRef = useRef(dynamicEta);
  const remainingDistRef = useRef(remainingDist);
  useEffect(() => {
    dynamicEtaRef.current = dynamicEta;
  }, [dynamicEta]);
  useEffect(() => {
    remainingDistRef.current = remainingDist;
  }, [remainingDist]);

  /* ── 내비게이션 중 잔여 ETA/거리를 워치로 중계 (10초 주기) ──
   * active hiking_record(사용자 계정 기준)의 duration_minutes/distance_km를
   * 갱신 → 워치 fetchRelayStatus가 user_id로 읽어 동일하게 표시. */
  useEffect(() => {
    if (activeHikingRecordId == null) return;

    const relay = () => {
      apiService.updateHikingProgress(
        activeHikingRecordId,
        dynamicEtaRef.current,
        remainingDistRef.current,
        token,
      );
    };

    relay(); // 시작 즉시 1회 전송
    const interval = setInterval(relay, 10000);
    return () => clearInterval(interval);
  }, [activeHikingRecordId, token]);

  /* ── 이상징후 감지 시 워치에 "anomaly" 신호 전송 ──
   * 활성 산행 기록이 있을 때만 작동. 워치 7초 폴러가 감지해 진동+알림 표시.
   * 응답(status→active) 감지 시 dismissAnomaly()로 모바일 긴급신고 취소.
   * 응답 없으면 HomeScreen 30초 카운트다운 만료 → sendSos() → /api/emergency. */
  const watchAnomalySignalledRef = useRef(false);

  useEffect(() => {
    if (
      anomalyAlert &&
      activeHikingRecordId &&
      !watchAnomalySignalledRef.current
    ) {
      // 이상징후 발생 + 산행 중 → 워치에 신호 전송
      watchAnomalySignalledRef.current = true;
      apiService.updateHikingStatus(activeHikingRecordId, "anomaly", token);
      markWatchNotified();
    }

    if (!anomalyAlert && watchAnomalySignalledRef.current) {
      // 이상징후 해제(모바일/워치 어디서든) → DB status 복구
      watchAnomalySignalledRef.current = false;
      if (activeHikingRecordId) {
        apiService.updateHikingStatus(activeHikingRecordId, "active", token);
      }
    }
  }, [anomalyAlert, activeHikingRecordId, token, markWatchNotified]);

  /* ── 산행 상태 동기화 폴러: 워치측 일시정지/중단을 감지해 반영 (5초) ── */
  const isPausedRef = useRef(isPaused);
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);
  const navEndedRef = useRef(false);

  useEffect(() => {
    if (activeHikingRecordId == null) return;
    navEndedRef.current = false;

    const poll = async () => {
      const status = await apiService.getHikingRecordStatus(
        activeHikingRecordId,
        token,
      );
      if (!status) return;

      // 워치가 "anomaly" → "active" 로 변경 = "괜찮아요" 응답 → 긴급신고 취소
      if (watchAnomalySignalledRef.current && status !== "anomaly") {
        watchAnomalySignalledRef.current = false;
        dismissAnomaly();
        // 폴백: status가 이미 바뀌었으므로 아래 로직도 계속 처리
      }

      if (status === "paused" && !isPausedRef.current) {
        setIsPaused(true);
      } else if (status === "active" && isPausedRef.current) {
        setIsPaused(false);
      } else if (
        (status === "completed" || status === "cancelled") &&
        !navEndedRef.current
      ) {
        // 워치(또는 외부)에서 산행을 종료함 → 모바일도 종료
        navEndedRef.current = true;
        resetNavigationState();
      }
    };

    const interval = setInterval(poll, 5000);
    return () => clearInterval(interval);
  }, [activeHikingRecordId, token]);

  /* ── 실제 알고리즘 데이터 로드 ── */
  useEffect(() => {
    setRemainingDist(initialDistanceKm);
    setTotalRouteDistanceKm(initialDistanceKm);
    setStaticEta(initialMinutes);
    setDynamicEta(initialMinutes);
    setTimeSaved(0);
    setIsPaused(false);
    hikeStartedAt.current = Date.now();
  }, [courseId, initialDistanceKm, initialMinutes]);

  useEffect(() => {
    if (!courseId || !user || isGuest) {
      activeHikingRecordKeyRef.current = null;
      setActiveHikingRecordId(null);
      return;
    }

    const currentUser = user;
    const nextKey = `${currentUser.id}:${courseId}`;
    if (activeHikingRecordKeyRef.current === nextKey) return;

    const previousRecordId = activeHikingRecordIdRef.current;
    activeHikingRecordKeyRef.current = nextKey;
    activeHikingRecordIdRef.current = null;
    setActiveHikingRecordId(null);

    let isMounted = true;

    async function startActiveHikingRecord() {
      try {
        if (previousRecordId) {
          apiService
            .cancelHikingRecord(previousRecordId, token)
            .catch((error) => {
              console.warn(
                "[LiveMap] Failed to cancel previous active record:",
                error,
              );
            });
        }

        const record = await apiService.startHikingRecord(
          {
            userId: currentUser.id,
            mountainName: mountainName || "선택한 산",
            courseId,
            courseName,
          },
          token,
        );

        if (!isMounted) return;
        activeHikingRecordIdRef.current = record.id;
        setActiveHikingRecordId(record.id);
      } catch (error) {
        if (!isMounted) return;
        activeHikingRecordKeyRef.current = null;
        const message =
          error instanceof Error
            ? error.message
            : "산행 시작 기록을 만들지 못했습니다.";
        console.error("[LiveMap] Failed to start active record:", error);
        Alert.alert(
          "산행 시작 기록 실패",
          `${message}\n\n워치 데이터와 이번 산행 기록이 자동 연결되지 않을 수 있어요.`,
        );
      }
    }

    startActiveHikingRecord();

    return () => {
      isMounted = false;
    };
  }, [courseId, courseName, isGuest, mountainName, token, user]);

  useEffect(() => {
    if (courseId) {
      fetchRealAlgorithmData(courseId);
    }
  }, [courseId]);

  // 사진(포토) 스팟 로드 (마운드 관계없이 전체 표시)
  useEffect(() => {
    let mounted = true;
    async function loadPhotoSpots() {
      try {
        const rows = await apiService.getPhotoSpots();

        if (!mounted) return;

        const spots = (rows || []).filter(
          (s: PhotoSpot) =>
            Number.isFinite(s.latitude) && Number.isFinite(s.longitude),
        );

        setPhotoSpots(spots);
      } catch (e) {
        console.error("[LiveMap] Failed to load photo spots:", e);
        setPhotoSpots([]);
      }
    }
    loadPhotoSpots();
    return () => {
      mounted = false;
    };
  }, []);

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
  }, []);

  /* ── 센서 데이터 및 실시간 동적 ETA 시뮬레이션 ── */
  useEffect(() => {
    if (!dynamicAnalysis || routePath.length === 0) return;

    let pathIndex = 0;
    const interval = setInterval(() => {
      if (isPaused) return;

      // 1. 센서 데이터 변동 시뮬레이션 (워치 데이터가 있으면 시뮬레이션 생략)
      if (!isWatchHrLive) {
        setHeartRate((prev) => {
          const next = prev + (Math.random() - 0.5) * 4;
          return Math.min(160, Math.max(60, next));
        });
      }

      if (!hasWatchPaceRef.current) {
        setCurrentPace((prev) => {
          const next = prev + (Math.random() - 0.5) * 0.2;
          return Math.min(6.0, Math.max(1.0, next));
        });
      }

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
  }, [
    dynamicAnalysis,
    routePath,
    currentPace,
    currentSlope,
    isPaused,
    isWatchHrLive,
  ]);

  /* ── 워치 생체데이터를 현재 페이스/심박수에 반영 ── */
  useEffect(() => {
    if (!latestWatchData) return;

    // 1. 심박수: 워치 값 직접 반영
    if (latestWatchData.heartRate != null && latestWatchData.heartRate > 0) {
      setHeartRate(latestWatchData.heartRate);
    }

    // 2. 페이스: 워치 걸음수 변화량(보폭 0.75m)으로 추정
    const steps = latestWatchData.steps;
    const measuredAt = latestWatchData.measuredAt
      ? new Date(latestWatchData.measuredAt).getTime()
      : null;

    if (steps != null && measuredAt) {
      const prev = prevStepsRef.current;
      if (prev && measuredAt > prev.time && steps >= prev.steps) {
        const deltaSteps = steps - prev.steps;
        const deltaHours = (measuredAt - prev.time) / 3600000;
        if (deltaHours > 0) {
          const STRIDE_KM = 0.00075; // 보폭 약 0.75m
          const pace = (deltaSteps * STRIDE_KM) / deltaHours;
          // 비정상값 제외(0~12km/h)
          if (pace >= 0 && pace < 12) {
            setCurrentPace(pace);
            hasWatchPaceRef.current = true;
          }
        }
      }
      prevStepsRef.current = { steps, time: measuredAt };
    }
  }, [latestWatchData]);

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

  async function getHealthSummaryForRecord() {
    let recentHealthData: HealthData[] = [];

    if (token) {
      try {
        recentHealthData = await apiService.getRecentHealthData(token, 60);
      } catch (error) {
        console.warn("[LiveMap] Failed to fetch recent health data:", error);
      }
    }

    const hikeStartTime = hikeStartedAt.current - 5000;
    const isCurrentHikeData = (item: HealthData | null) => {
      if (!item) return false;
      if (!item.measuredAt) return true;
      const measuredTime = new Date(item.measuredAt).getTime();
      return Number.isNaN(measuredTime) || measuredTime >= hikeStartTime;
    };
    const currentHikeHealthData = recentHealthData.filter(isCurrentHikeData);
    const latestHealthData = isCurrentHikeData(latestWatchData)
      ? latestWatchData
      : (currentHikeHealthData[0] ?? null);
    const heartRates = currentHikeHealthData
      .map((item) => item.heartRate)
      .filter((value): value is number => Number.isFinite(value));
    const averageHeartRate =
      heartRates.length > 0
        ? Math.round(
            heartRates.reduce((sum, value) => sum + value, 0) /
              heartRates.length,
          )
        : Math.round(latestHealthData?.heartRate ?? heartRate);
    const maxSteps = Math.max(
      0,
      ...currentHikeHealthData.map((item) => item.steps ?? 0),
      latestHealthData?.steps ?? 0,
    );
    const maxCalories = Math.max(
      0,
      ...currentHikeHealthData.map((item) => item.calories ?? 0),
      latestHealthData?.calories ?? 0,
    );

    return {
      avgHeartRate: averageHeartRate,
      steps: maxSteps > 0 ? Math.round(maxSteps) : null,
      calories: maxCalories > 0 ? Math.round(maxCalories) : estimatedCalories,
    };
  }

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
      const healthSummary = await getHealthSummaryForRecord();
      const recordPayload = {
        durationMinutes: estimatedDurationMinutes,
        distanceKm: totalRouteDistanceKm,
        calories: healthSummary.calories,
        steps: healthSummary.steps,
        avgHeartRate: healthSummary.avgHeartRate,
        maxAltitude: elevationGainM,
        elevationGainM,
      };
      const activeRecordId = activeHikingRecordIdRef.current;

      if (activeRecordId) {
        await apiService.finishHikingRecord(
          activeRecordId,
          recordPayload,
          token,
        );
        activeHikingRecordIdRef.current = null;
        activeHikingRecordKeyRef.current = null;
        setActiveHikingRecordId(null);
      } else {
        await apiService.createHikingRecord(
          {
            ...recordPayload,
            userId: user.id,
            mountainName: mountainName || "선택한 산",
            courseId: courseId ?? null,
            courseName,
          },
          token,
        );
      }

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
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        camera={
          mapRegion
            ? undefined
            : mapCamera.current
              ? { ...mapCamera.current, zoom }
              : { ...currentLocation, zoom }
        }
        region={mapRegion}
        animationDuration={500}
        mapPadding={{ top: 130, right: 20, bottom: 360, left: 20 }}
        layerGroups={{
          BUILDING: true,
          TRAFFIC: false,
          TRANSIT: false,
          BICYCLE: false,
          MOUNTAIN: true,
          CADASTRAL: false,
        }}
        isShowScaleBar={true}
        isShowZoomControls={false}
        isShowLocationButton={false}
        onCameraChanged={(e: any) => {
          mapCamera.current = {
            latitude: e.latitude,
            longitude: e.longitude,
          };
          if (e.reason !== 0) {
            setZoom(e.zoom);
          }
        }}
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
          width={36}
          height={36}
          caption={{ text: "현위치" }}
          subCaption={{ text: `${currentPace.toFixed(1)}km/h` }}
        >
          <MapMarkerIcon name="navigate" color="#2563eb" />
        </NaverMapMarkerOverlay>

        {/* 출발/도착 마커 */}
        {startPoint && (
          <NaverMapMarkerOverlay
            latitude={startPoint.latitude}
            longitude={startPoint.longitude}
            width={36}
            height={36}
            caption={{ text: "출발" }}
          >
            <MapMarkerIcon name="flag" color="#16a34a" />
          </NaverMapMarkerOverlay>
        )}
        {endPoint && (
          <NaverMapMarkerOverlay
            latitude={endPoint.latitude}
            longitude={endPoint.longitude}
            width={36}
            height={36}
            caption={{ text: "도착" }}
          >
            <MapMarkerIcon
              name="flag-checkered"
              color="#dc2626"
              set="material"
            />
          </NaverMapMarkerOverlay>
        )}

        {/* SNS 포토스팟 마커 (토글로 제어) */}
        {snsSpot &&
          photoSpots.length > 0 &&
          photoSpots.map((spot, index) => (
            <NaverMapMarkerOverlay
              key={`sns-spot-${spot.spot}-${index}`}
              latitude={spot.latitude}
              longitude={spot.longitude}
              width={36}
              height={36}
              caption={{ text: spot.spot ?? "포토스팟" }}
              zIndex={12}
              onTap={() => setSelectedPhotoSpot(spot)}
            >
              <MapMarkerIcon name="camera" color="#8b5cf6" />
            </NaverMapMarkerOverlay>
          ))}

        {/* 포토스팟 정보창 (탭한 마커 바로 위에 표시) */}
        {selectedPhotoSpot && (
          <NaverMapMarkerOverlay
            latitude={selectedPhotoSpot.latitude}
            longitude={selectedPhotoSpot.longitude}
            width={220}
            height={132}
            anchor={{ x: 0.5, y: 1 }}
            zIndex={40}
            onTap={() => setSelectedPhotoSpot(null)}
          >
            <PhotoSpotInfoWindow spot={selectedPhotoSpot} />
          </NaverMapMarkerOverlay>
        )}
      </NaverMapView>

      <View style={styles.overlay} pointerEvents="none" />

      {/* ── 상단 네비 바 ── */}
      <View style={[styles.topBar, { top: statusBarHeight + 12 }]}>
        <View style={styles.routeLabel}>
          <Ionicons name="navigate" size={16} color="#746e6e" />
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

          {/* 오프라인 다운로드 버튼 */}
          {courseId && (
            <TouchableOpacity
              style={styles.offlineBtn}
              onPress={handleDownloadOfflineMap}
              disabled={isOfflineDownloading}
            >
              {isOfflineDownloading ? (
                <ActivityIndicator size="small" color="#3b82f6" />
              ) : (
                <Ionicons
                  name={isMapSaved ? "cloud-done" : "cloud-download"}
                  size={20}
                  color={isMapSaved ? "#22c55e" : "#3b82f6"}
                />
              )}
            </TouchableOpacity>
          )}
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

      {/* ── 하단 맵 컨트롤 및 대시보드 묶음 ── */}
      <Animated.View
        style={[
          styles.dashboardWrapper,
          { transform: [{ translateY: dashboardTransY }] },
        ]}
        pointerEvents="box-none"
      >
        {/* ── 커스텀 지도 컨트롤 ── */}
        <View style={styles.mapControlContainer} pointerEvents="box-none">
          {isDashboardCollapsed && (
            <>
              <TouchableOpacity
                style={styles.mapControlCircle}
                onPress={handleZoomIn}
                activeOpacity={0.8}
              >
                <Ionicons name="add" size={24} color="#374151" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.mapControlCircle}
                onPress={handleZoomOut}
                activeOpacity={0.8}
              >
                <Ionicons name="remove" size={24} color="#374151" />
              </TouchableOpacity>
            </>
          )}
          <TouchableOpacity
            style={styles.mapControlCircle}
            onPress={handleRescanGPS}
            activeOpacity={0.8}
          >
            <Ionicons name="locate" size={20} color="#374151" />
          </TouchableOpacity>
        </View>

        {/* ── 대시보드 ── */}
        <View style={styles.dashboard} {...dashboardPanResponder.panHandlers}>
          {isDashboardCollapsed ? (
            <View style={styles.collapsedDashboardRow}>
              <Text style={styles.collapsedEtaText}>{dynamicEta}분 남음</Text>
              <View
                style={{ width: 1, height: 16, backgroundColor: "#f3f4f6" }}
              />
              <Text style={styles.collapsedDistText}>
                {remainingDist.toFixed(2)}km
              </Text>
              <Ionicons name="chevron-up" size={18} color="#9ca3af" />
            </View>
          ) : (
            <>
              <View style={styles.toggleBar}>
                <View style={styles.toggleItem}>
                  <View
                    style={[
                      styles.toggleIconWrap,
                      {
                        backgroundColor: dynamicAnalysis
                          ? "#f0fdf4"
                          : "#f3f4f6",
                      },
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
                    onChange={(v) => {
                      setSnsSpot(v);
                      if (!v) setSelectedPhotoSpot(null);
                    }}
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
                        <Text style={styles.liveText}>
                          실시간 현위치 분석 중
                        </Text>
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
                    <View
                      style={[styles.metricBox, { backgroundColor: "#f9fafb" }]}
                    >
                      <Text
                        style={[styles.metricBoxLabel, { color: "#6b7280" }]}
                      >
                        현재 페이스
                      </Text>
                      <Text
                        style={[styles.metricBoxValue, { color: "#111827" }]}
                      >
                        {currentPace.toFixed(1)}
                        <Text style={styles.metricBoxUnit}> km/h</Text>
                      </Text>
                    </View>
                    <View
                      style={[styles.metricBox, { backgroundColor: "#fff7ed" }]}
                    >
                      <Text
                        style={[styles.metricBoxLabel, { color: "#ea580c" }]}
                      >
                        현재 경사도
                      </Text>
                      <Text
                        style={[styles.metricBoxValue, { color: "#ea580c" }]}
                      >
                        {currentSlope}
                        <Text style={styles.metricBoxUnit}> %</Text>
                      </Text>
                    </View>
                    <View
                      style={[styles.metricBox, { backgroundColor: "#eff6ff" }]}
                    >
                      <Text
                        style={[styles.metricBoxLabel, { color: "#2563eb" }]}
                      >
                        심박수
                      </Text>
                      <Text
                        style={[styles.metricBoxValue, { color: "#2563eb" }]}
                      >
                        {heartRate === 0 ? "(-)" : Math.round(heartRate)}
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
                      회원님의 <Text style={styles.infoTextBold}>현위치</Text>
                      에서 심박수(
                      {heartRate === 0 ? "(-)" : Math.round(heartRate)}
                      bpm)와 페이스(
                      {currentPace.toFixed(1)}km/h)를 반영하여{" "}
                      <Text style={styles.infoTextBold}>
                        실제 알고리즘(Tobler){" "}
                      </Text>
                      에 따른 도착 시간을 실시간으로 계산합니다.{" "}
                      {timeSaved > 0 && (
                        <Text style={styles.infoTextBold}>
                          (기존 대비 {timeSaved}분 단축)
                        </Text>
                      )}
                    </Text>
                  </View>

                  {courseId && remainingDist > 0 && dynamicEta > 0 && (
                    <View style={styles.navButtonRow}>
                      <TouchableOpacity
                        style={[
                          styles.navButton,
                          { backgroundColor: "#f97316" },
                        ]}
                        onPress={handlePauseResume}
                        activeOpacity={0.8}
                      >
                        <Ionicons
                          name={isPaused ? "play" : "pause"}
                          size={18}
                          color="#ffffff"
                        />
                        <Text style={styles.navButtonText}>
                          {isPaused ? "재개하기" : "일시정지"}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.navButton,
                          { backgroundColor: "#ef4444" },
                        ]}
                        onPress={handleStopNavigation}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="stop" size={18} color="#ffffff" />
                        <Text style={styles.navButtonText}>중단하기</Text>
                      </TouchableOpacity>
                    </View>
                  )}

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
                      <Ionicons
                        name="checkmark-circle"
                        size={18}
                        color="#ffffff"
                      />
                    )}
                    <Text style={styles.saveRecordButtonText}>
                      {savingRecord ? "기록 저장 중" : "산행 기록 저장"}
                    </Text>
                  </TouchableOpacity>
                </Animated.View>
              ) : (
                <View style={styles.analysisOffState}>
                  <View style={styles.analysisOffIcon}>
                    <Ionicons
                      name="eye-off-outline"
                      size={22}
                      color="#9ca3af"
                    />
                  </View>
                  <Text style={styles.analysisOffTitle}>
                    동적 분석이 꺼져 있습니다
                  </Text>
                  <Text style={styles.analysisOffSub}>
                    위 토글을 켜면 현위치 기반 페이스·경사도 분석이 시작됩니다.
                  </Text>
                </View>
              )}
            </>
          )}
        </View>
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
  routeLabelText: { fontSize: 13, color: "#606267", fontWeight: "500" },
  offlineBtn: {
    padding: 4,
    marginLeft: 4,
  },
  infoWindowWrapper: {
    width: 220,
    height: 132,
    alignItems: "center",
    justifyContent: "flex-start",
  },
  infoWindowCard: {
    width: "100%",
    backgroundColor: "#ffffff",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,
  },
  infoWindowHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  infoWindowTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  infoWindowAddress: {
    fontSize: 12,
    color: "#6b7280",
    lineHeight: 17,
  },
  infoWindowArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderTopWidth: 9,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#ffffff",
    marginTop: -1,
  },
  infoWindowSpacer: {
    height: 42,
  },
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
    bottom: 200,
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
  dashboardWrapper: {
    position: "absolute",
    bottom: 16,
    left: 14,
    right: 14,
    zIndex: 20,
    elevation: 16,
  },
  mapControlContainer: {
    alignSelf: "flex-end",
    marginBottom: 16,
    marginRight: 2,
    gap: 8,
  },
  mapControlCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  dashboard: {
    backgroundColor: "#ffffff",
    borderRadius: 28,
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
  notifTouchable: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  collapsedDashboardRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    gap: 12,
  },
  collapsedEtaText: { fontSize: 16, fontWeight: "700", color: "#111827" },
  collapsedDistText: { fontSize: 16, fontWeight: "700", color: "#1f2937" },
  navButtonRow: {
    flexDirection: "row",
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  navButton: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  navButtonText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },
});
