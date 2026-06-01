import { Ionicons } from "@expo/vector-icons";
import {
  NaverMapMarkerOverlay,
  NaverMapPathOverlay,
  NaverMapView,
  type NaverMapViewRef,
} from "@mj-studio/react-native-naver-map";
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { RootStackParamList } from "../App";
import { apiService } from "../data/api";

type OfflineMapDetailRouteProp = RouteProp<
  RootStackParamList,
  "OfflineMapDetail"
>;
type NavProp = NativeStackNavigationProp<
  RootStackParamList,
  "OfflineMapDetail"
>;

interface MapCoord {
  latitude: number;
  longitude: number;
}

const { width } = Dimensions.get("window");

export default function OfflineMapDetailScreen() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<OfflineMapDetailRouteProp>();
  const course = route.params?.course;
  const mapRef = useRef<NaverMapViewRef>(null);

  const [path, setPath] = useState<MapCoord[]>([]);
  const [loading, setLoading] = useState(true);
  const [center, setCenter] = useState<MapCoord>({
    latitude: 37.5665,
    longitude: 126.978,
  });
  const [zoom, setZoom] = useState(14.0);
  const mapCamera = useRef<MapCoord | null>(null);

  useEffect(() => {
    if (!course?.id) return;

    async function fetchPath() {
      try {
        setLoading(true);
        const result = await apiService.getCourseRoute(course!.id);
        if (result.path && result.path.length > 0) {
          const mappedPath = result.path.map((p: any) => ({
            latitude: p.lat,
            longitude: p.lng,
          }));
          setPath(mappedPath);

          const lats = mappedPath.map((p) => p.latitude);
          const lngs = mappedPath.map((p) => p.longitude);
          const newCenter = {
            latitude: (Math.min(...lats) + Math.max(...lats)) / 2,
            longitude: (Math.min(...lngs) + Math.max(...lngs)) / 2,
          };
          setCenter(newCenter);
          mapCamera.current = newCenter;
        }
      } catch (error) {
        console.error("[OfflineDetail] Failed to fetch path:", error);
        Alert.alert("오류", "경로 데이터를 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    }

    fetchPath();
  }, [course?.id]);

  const handleZoomIn = () => {
    setZoom((z) => {
      const newZoom = Math.min(z + 1, 21);
      const target = mapCamera.current || center;
      mapRef.current?.animateCameraTo({
        latitude: target.latitude,
        longitude: target.longitude,
        zoom: newZoom,
      });
      return newZoom;
    });
  };

  const handleZoomOut = () => {
    setZoom((z) => {
      const newZoom = Math.max(z - 1, 5);
      const target = mapCamera.current || center;
      mapRef.current?.animateCameraTo({
        latitude: target.latitude,
        longitude: target.longitude,
        zoom: newZoom,
      });
      return newZoom;
    });
  };

  if (!course) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Text style={styles.errorText}>코스 정보를 찾을 수 없습니다.</Text>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backBtnText}>뒤로가기</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      {/* 지도 영역 (전체 화면) */}
      <NaverMapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        camera={{
          ...(mapCamera.current || center),
          zoom: zoom,
        }}
        isShowScaleBar={true}
        isShowZoomControls={false}
        isShowLocationButton={false}
        isScrollGesturesEnabled={true}
        isZoomGesturesEnabled={true}
        isTiltGesturesEnabled={false}
        isRotateGesturesEnabled={false}
        layerGroups={{
          BUILDING: true,
          TRAFFIC: false,
          TRANSIT: false,
          BICYCLE: false,
          MOUNTAIN: true,
          CADASTRAL: false,
        }}
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
        {path.length > 0 && (
          <>
            <NaverMapPathOverlay
              coords={path}
              width={6}
              color="#3b82f6"
              outlineWidth={2}
              outlineColor="#ffffff"
            />
            <NaverMapMarkerOverlay
              latitude={path[0].latitude}
              longitude={path[0].longitude}
              width={30}
              height={30}
              image={{ symbol: "green" }}
              caption={{ text: "출발" }}
            />
            <NaverMapMarkerOverlay
              latitude={path[path.length - 1].latitude}
              longitude={path[path.length - 1].longitude}
              width={30}
              height={30}
              image={{ symbol: "red" }}
              caption={{ text: "도착" }}
            />
          </>
        )}
      </NaverMapView>

      {/* 상단 오버레이 헤더 */}
      <SafeAreaView style={styles.headerOverlay} edges={["top"]}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backBtnCircle}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Ionicons name="chevron-back" size={24} color="#111827" />
          </TouchableOpacity>
          <View style={styles.titleBox}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {course.mountainId} - {course.title}
            </Text>
          </View>
          <View style={{ width: 44 }} />
        </View>
      </SafeAreaView>

      {/* 우측 중앙 줌 컨트롤 */}
      <View style={styles.zoomControl}>
        <TouchableOpacity
          style={styles.zoomBtn}
          onPress={handleZoomIn}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={24} color="#374151" />
        </TouchableOpacity>
        <View style={styles.zoomDivider} />
        <TouchableOpacity
          style={styles.zoomBtn}
          onPress={handleZoomOut}
          activeOpacity={0.8}
        >
          <Ionicons name="remove" size={24} color="#374151" />
        </TouchableOpacity>
      </View>

      {/* 로딩 인디케이터 */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>경로를 불러오는 중...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f1f5f9" },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ffffff",
  },
  errorText: { fontSize: 16, color: "#6b7280", marginBottom: 20 },
  backBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "#f3f4f6",
    borderRadius: 10,
  },
  backBtnText: { color: "#111827", fontWeight: "600" },
  headerOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtnCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.9)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  titleBox: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.9)",
    marginHorizontal: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
  },
  headerSub: { fontSize: 10, color: "#64748b", marginTop: 1 },
  zoomControl: {
    position: "absolute",
    right: 16,
    top: "90%",
    transform: [{ translateY: -50 }],
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 10,
  },
  zoomBtn: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  zoomDivider: {
    height: 1,
    backgroundColor: "#f1f5f9",
    marginHorizontal: 8,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.7)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 20,
  },
  loadingText: { marginTop: 12, color: "#3b82f6", fontWeight: "600" },
  bottomBar: {
    position: "absolute",
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: "center",
    paddingHorizontal: 20,
  },
  infoBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.95)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  infoText: { fontSize: 13, fontWeight: "600", color: "#334155" },
});
