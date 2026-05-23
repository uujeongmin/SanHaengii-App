import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Easing,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiService, DEV_TEST_TOKEN } from "../data/api";

export default function SafetyScreen() {
  /* ── 배경 글로우 펄스 ── */
  const bgPulse = useRef(new Animated.Value(1)).current;
  /* ── SOS 링 페이드 ── */
  const sosRingOpacity = useRef(new Animated.Value(0.5)).current;

  /* ── 상태 관리 ── */
  const [isAnomaly, setIsAnomaly] = useState(false);
  const [anomalyMessage, setAnomalyMessage] = useState("정상 상태");
  const [lastHealthData, setLastHealthData] = useState<any>(null);
  const [authToken, setAuthToken] = useState(DEV_TEST_TOKEN);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [isReporting, setIsReporting] = useState(false);

  /**
   * 로컬 이상 징후 감지 알고리즘
   */
  const detectAnomalyLocally = (data: any) => {
    if (!data) return null;

    if (data.heart_rate > 160) return "심박수가 너무 높습니다 (빈맥 감지)";
    if (data.heart_rate < 40 && data.heart_rate > 0)
      return "심박수가 너무 낮습니다 (서맥 감지)";
    if (data.spo2 < 90 && data.spo2 > 0)
      return "산소포화도가 낮습니다 (저산소증 위험)";
    if (data.body_temp > 39) return "체온이 너무 높습니다 (고열 감지)";
    if (data.body_temp < 35 && data.body_temp > 0)
      return "체온이 너무 낮습니다 (저체온증 위험)";

    // 가속도 기반 낙상 감지 (시뮬레이션 데이터 대응)
    if (
      data.accelerometer &&
      (Math.abs(data.accelerometer.x) > 30 ||
        Math.abs(data.accelerometer.y) > 30)
    ) {
      return "급격한 충격이 감지되었습니다 (낙상 의심)";
    }

    return null;
  };

  /**
   * 백엔드에 긴급 상황 보고 및 구조 요청
   */
  const handleReportEmergency = async (reason: string, data: any) => {
    if (isReporting) return;
    setIsReporting(true);

    try {
      const emergencyPayload = {
        userId: "user_12345", // 실제 사용자 ID 연동 필요
        eventType: reason === "수동 긴급 호출" ? "수동_신고" : "낙하_감지",
        timestamp: new Date().toISOString(),
        location: {
          lat: 37.557999,
          lng: 127.007993,
        }, // 실기기에서는 실제 GPS 좌표 전달 필요
      };

      const result = await apiService.reportEmergency(
        emergencyPayload,
        authToken,
      );

      Alert.alert(
        "신고 접수 완료",
        "백엔드 서버에 긴급 상황이 보고되었습니다.\n응급 프로토콜에 따라 구조대가 파견됩니다.",
        [{ text: "확인" }],
      );
    } catch (error: any) {
      console.error("Emergency report error:", error);
      Alert.alert(
        "신고 실패",
        "서버와의 연결이 원활하지 않습니다. 119에 직접 전화를 걸어주세요.",
      );
    } finally {
      setIsReporting(false);
    }
  };

  /**
   * 임의의 생체 데이터를 서버에 업로드 (워치 시뮬레이션)
   */
  const uploadDummyHealthData = async () => {
    const dummyData = {
      measured_at: new Date().toISOString(),
      heart_rate: Math.floor(Math.random() * (100 - 65 + 1)) + 65, // 65~100 bpm
      steps: Math.floor(Math.random() * 10000),
      calories: Math.random() * 500,
      spo2: 95 + Math.floor(Math.random() * 5), // 95~99%
      body_temp: 36.5 + Math.random() * 0.5, // 36.5~37.0°C
      blood_pressure_systolic: 120,
      blood_pressure_diastolic: 80,
      user_id: 1,
    };

    try {
      console.log("[Simulation] Uploading dummy health data...");
      await apiService.saveHealthData(dummyData, authToken);
    } catch (error) {
      console.error("[Simulation] Data upload failed:", error);
    }
  };

  /**
   * 저장된 생체 데이터 가져오기 및 이상 징후 체크
   */
  const fetchAndCheckHealthData = async () => {
    try {
      const result = await apiService.getHealthData(authToken);
      const dataArray = result.data || [];
      const latest =
        dataArray.length > 0 ? dataArray[dataArray.length - 1] : null;

      if (latest) {
        setLastHealthData(latest);

        // 로컬 알고리즘 수행
        const anomalyMsg = detectAnomalyLocally(latest);
        if (anomalyMsg) {
          setIsAnomaly(true);
          setAnomalyMessage(anomalyMsg);
          triggerAnomalyAlert(anomalyMsg, latest);
        } else {
          setIsAnomaly(false);
          setAnomalyMessage("정상 상태");
        }
      }
    } catch (error: any) {
      console.error("Fetch error:", error);
    }
  };

  const triggerAnomalyAlert = (message: string, data: any) => {
    Alert.alert(
      "⚠️ 이상 징후 감지",
      `${message}\n구조 요청을 보내시겠습니까? (30초 후 자동 신고)`,
      [
        {
          text: "상태 괜찮음",
          onPress: () => {
            setIsAnomaly(false);
            setAnomalyMessage("정상 상태");
          },
          style: "cancel",
        },
        {
          text: "구조 요청",
          onPress: () => handleReportEmergency(message, data),
        },
      ],
    );
  };

  useEffect(() => {
    let interval: any;
    if (isMonitoring) {
      // 5초마다 [업로드 -> 조회] 전체 프로세스 테스트
      interval = setInterval(async () => {
        await uploadDummyHealthData(); // 1. 임의 데이터 전송 (워치 역할)
        fetchAndCheckHealthData(); // 2. 전송된 데이터 수신 (앱 역할)
      }, 5000);

      Alert.alert(
        "모니터링 시작",
        "서버와 통신하여 실시간 데이터를 주고받습니다.",
      );
    }
    return () => clearInterval(interval);
  }, [isMonitoring, authToken]);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(bgPulse, {
          toValue: 1.1,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(bgPulse, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(sosRingOpacity, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(sosRingOpacity, {
          toValue: 0.5,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  /**
   * [Simulate] 워치에서 온 센서 데이터 수신 및 이상 징후 확인
   */
  const simulateWatchSignal = async () => {
    console.log(`[Watch] Simulating sensor data (Anomaly)`);

    // 시뮬레이션용 데이터 (단일 이상 징후: 낙상 감지)
    const sensorData = {
      accelerometer: { x: 35, y: 0, z: 0 },
      gyroscope: { x: 0, y: 0, z: 0 },
      heart_rate: 120,
      spo2: 98,
      body_temp: 36.5,
    };

    // 로컬 알고리즘 수행
    const anomalyMsg = detectAnomalyLocally(sensorData);
    if (anomalyMsg) {
      setIsAnomaly(true);
      setAnomalyMessage(anomalyMsg);
      triggerAnomalyAlert(anomalyMsg, sensorData);
    } else {
      setIsAnomaly(false);
      setAnomalyMessage("정상 상태");
      Alert.alert("알림", "정상 신호입니다.");
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ── 빨간 헤더 ── */}
        <View
          style={[styles.header, isAnomaly && { backgroundColor: "#7f1d1d" }]}
        >
          <Animated.View
            style={[styles.bgGlow, { transform: [{ scale: bgPulse }] }]}
          />

          <View style={styles.headerTop}>
            <Text style={styles.headerTitle}>안전 및 신고 설정</Text>
            <TouchableOpacity
              style={[
                styles.settingsBtn,
                isMonitoring && { backgroundColor: "#4ade80" },
              ]}
              activeOpacity={0.7}
              onPress={() => setIsMonitoring(!isMonitoring)}
            >
              <Ionicons
                name={
                  isMonitoring ? "stop-circle-outline" : "play-circle-outline"
                }
                size={24}
                color="#ffffff"
              />
            </TouchableOpacity>
          </View>

          <View
            style={[
              styles.statusBanner,
              isAnomaly && styles.statusBannerAnomaly,
            ]}
          >
            <View style={styles.statusRow}>
              <View
                style={[
                  styles.statusDot,
                  isAnomaly
                    ? { backgroundColor: "#ef4444" }
                    : isMonitoring
                      ? { backgroundColor: "#4ade80" }
                      : { backgroundColor: "#9ca3af" },
                ]}
              />
              <Text style={styles.statusTitle}>
                {isAnomaly
                  ? "이상 징후 발생!"
                  : isMonitoring
                    ? "실시간 모니터링 중"
                    : "모니터링 중지됨"}
              </Text>
            </View>
            <Text style={styles.statusDesc}>
              {isAnomaly
                ? anomalyMessage
                : "워치에서 수신되는 심박수, 산소포화도, 가속도 데이터를 기반으로 낙상 및 신체 이상을 실시간으로 탐지합니다."}
            </Text>
          </View>
        </View>

        <View style={styles.content}>
          {/* ── SOS 버튼 ── */}
          <TouchableOpacity
            style={styles.sosCard}
            activeOpacity={0.88}
            onLongPress={() =>
              handleReportEmergency("수동 긴급 호출", lastHealthData)
            }
          >
            <View style={styles.sosIconWrapper}>
              <Animated.View
                style={[styles.sosRing, { opacity: sosRingOpacity }]}
              />
              <Ionicons
                name="warning"
                size={48}
                color="#ef4444"
                style={{ zIndex: 1 }}
              />
            </View>
            <Text style={styles.sosTitle}>긴급 구조 요청</Text>
            <Text style={styles.sosDesc}>
              버튼을 길게 누르면 119 및 지정 보호자에게 위치가 전송됩니다.
            </Text>
          </TouchableOpacity>

          {/* ── 시뮬레이션 버튼 (개발용) ── */}
          <View style={styles.simContainer}>
            <TouchableOpacity
              style={[styles.simBtn, { backgroundColor: "#fee2e2" }]}
              onPress={simulateWatchSignal}
            >
              <Text style={[styles.simBtnText, { color: "#dc2626" }]}>
                이상 시뮬레이션
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.simBtn,
                isMonitoring
                  ? { backgroundColor: "#fee2e2" }
                  : { backgroundColor: "#eff6ff" },
              ]}
              onPress={() => setIsMonitoring(!isMonitoring)}
            >
              <Text
                style={[
                  styles.simBtnText,
                  { color: isMonitoring ? "#dc2626" : "#2563eb" },
                ]}
              >
                {isMonitoring ? "감시 중지" : "감시 시작"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.simBtn, { backgroundColor: "#f5f3ff" }]}
              onPress={fetchAndCheckHealthData}
            >
              <Text style={[styles.simBtnText, { color: "#7c3aed" }]}>
                수동 체크
              </Text>
            </TouchableOpacity>
          </View>

          {/* ── 최신 데이터 결과 표시 ── */}
          {lastHealthData && (
            <View
              style={[
                styles.card,
                { backgroundColor: "#fdf4ff", borderColor: "#f5d0fe" },
              ]}
            >
              <View style={styles.cardHeaderRow}>
                <Text style={[styles.cardTitle, { color: "#86198f" }]}>
                  실시간 워치 데이터
                </Text>
                <Ionicons name="watch-outline" size={20} color="#86198f" />
              </View>
              <View style={styles.dataGrid}>
                <View style={styles.dataItem}>
                  <Text style={styles.dataLabel}>심박수</Text>
                  <Text style={styles.dataValue}>
                    {lastHealthData.heart_rate ?? 0} bpm
                  </Text>
                </View>
                <View style={styles.dataItem}>
                  <Text style={styles.dataLabel}>걸음수</Text>
                  <Text style={styles.dataValue}>
                    {lastHealthData.steps ?? 0} 보
                  </Text>
                </View>
                <View style={styles.dataItem}>
                  <Text style={styles.dataLabel}>산소포화도</Text>
                  <Text style={styles.dataValue}>
                    {lastHealthData.spo2 ?? 0}%
                  </Text>
                </View>
                <View style={styles.dataItem}>
                  <Text style={styles.dataLabel}>체온</Text>
                  <Text style={styles.dataValue}>
                    {lastHealthData.body_temp ?? 0}°C
                  </Text>
                </View>
              </View>
              <Text style={styles.dataTime}>
                수신 시각:{" "}
                {lastHealthData.measured_at
                  ? new Date(lastHealthData.measured_at).toLocaleString()
                  : "N/A"}
              </Text>
            </View>
          )}

          {/* ── 자동 신고 프로토콜 ── */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>자동 신고 프로토콜</Text>

            <View style={styles.protocolItem}>
              <View
                style={[styles.protocolIcon, { backgroundColor: "#fff7ed" }]}
              >
                <Ionicons
                  name="phone-portrait-outline"
                  size={20}
                  color="#ea580c"
                />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.protocolTitleRow}>
                  <Text style={styles.protocolName}>낙상 감지</Text>
                  <Text style={styles.protocolOn}>ON</Text>
                </View>
                <Text style={styles.protocolDesc}>
                  비정상적인 가속도 변화가 감지된 후 30초 내 사용자 응답이
                  없으면 자동 신고됩니다.
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.protocolItem}>
              <View
                style={[styles.protocolIcon, { backgroundColor: "#eff6ff" }]}
              >
                <Ionicons name="person-outline" size={20} color="#2563eb" />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.protocolTitleRow}>
                  <Text style={styles.protocolName}>장기 미이동</Text>
                  <Text style={styles.protocolOn}>ON</Text>
                </View>
                <Text style={styles.protocolDesc}>
                  산행 중 20분 이상 이동이 감지되지 않으면 안부 확인 알림을
                  전송합니다.
                </Text>
              </View>
            </View>
          </View>

          {/* ── 비상 연락망 ── */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardTitle}>비상 연락망</Text>
              <TouchableOpacity style={styles.addBtn}>
                <Text style={styles.addBtnText}>+ 추가</Text>
              </TouchableOpacity>
            </View>

            <ContactRow
              iconName="shield-outline"
              iconBg="#fee2e2"
              iconColor="#dc2626"
              name="119 구조대"
              sub="위치정보 자동 포함"
            />

            <ContactRow
              iconName="person-outline"
              iconBg="#dbeafe"
              iconColor="#2563eb"
              name="어머니 (보호자)"
              sub="010-1234-5678"
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ────────────────────────────── */
function ContactRow({
  iconName,
  iconBg,
  iconColor,
  name,
  sub,
}: {
  iconName: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  iconColor: string;
  name: string;
  sub: string;
}) {
  return (
    <View style={cStyles.row}>
      <View style={[cStyles.avatar, { backgroundColor: iconBg }]}>
        <Ionicons name={iconName} size={18} color={iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={cStyles.name}>{name}</Text>
        <Text style={cStyles.sub}>{sub}</Text>
      </View>
      <TouchableOpacity style={cStyles.callBtn}>
        <Ionicons name="call-outline" size={18} color="#4b5563" />
      </TouchableOpacity>
    </View>
  );
}

const cStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#f3f4f6",
    marginTop: 8,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  name: { fontSize: 14, fontWeight: "700", color: "#111827" },
  sub: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  callBtn: {
    width: 40,
    height: 40,
    backgroundColor: "#ffffff",
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
});

/* ────────────────────────────── */
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f9fafb" },
  container: { flex: 1 },
  scrollContent: { paddingBottom: 48 },

  /* 빨간 헤더 */
  header: {
    backgroundColor: "#ef4444",
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 60,
    borderBottomLeftRadius: 48,
    borderBottomRightRadius: 48,
    overflow: "hidden",
  },
  bgGlow: {
    position: "absolute",
    top: -40,
    right: -40,
    width: 192,
    height: 192,
    borderRadius: 96,
    backgroundColor: "#f87171",
    opacity: 0.5,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#ffffff",
    letterSpacing: -0.5,
  },
  settingsBtn: {
    width: 40,
    height: 40,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  statusBanner: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    zIndex: 10,
  },
  statusBannerAnomaly: {
    backgroundColor: "rgba(239, 68, 68, 0.2)",
    borderColor: "rgba(239, 68, 68, 0.5)",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#4ade80",
  },
  statusTitle: { fontSize: 14, fontWeight: "700", color: "#ffffff" },
  statusDesc: {
    fontSize: 12,
    color: "#fca5a5",
    fontWeight: "500",
    lineHeight: 20,
  },

  /* 컨텐츠 영역 */
  content: {
    paddingHorizontal: 24,
    marginTop: -36,
    gap: 20,
    zIndex: 20,
  },

  /* SOS 버튼 카드 */
  sosCard: {
    backgroundColor: "#ffffff",
    borderRadius: 32,
    padding: 28,
    alignItems: "center",
    elevation: 8,
    shadowColor: "#ef4444",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    borderWidth: 2,
    borderColor: "#fee2e2",
  },
  sosIconWrapper: {
    width: 96,
    height: 96,
    backgroundColor: "#fef2f2",
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    position: "relative",
  },
  sosRing: {
    position: "absolute",
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#f87171",
  },
  sosTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 8,
  },
  sosDesc: {
    fontSize: 12,
    color: "#6b7280",
    textAlign: "center",
    maxWidth: 220,
    lineHeight: 20,
  },

  /* 시뮬레이션 컨테이너 */
  simContainer: {
    flexDirection: "row",
    gap: 12,
  },
  simBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  simBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4b5563",
  },

  /* 공통 카드 */
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 24,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    borderWidth: 1,
    borderColor: "#f3f4f6",
    gap: 16,
  },
  cardTitle: { fontSize: 18, fontWeight: "700", color: "#111827" },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  divider: { height: 1, backgroundColor: "#f3f4f6" },

  /* 데이터 그리드 스타일 */
  dataGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 8,
  },
  dataItem: {
    width: "45%",
    backgroundColor: "#ffffff",
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#f0abfc",
  },
  dataLabel: {
    fontSize: 11,
    color: "#a21caf",
    fontWeight: "600",
    marginBottom: 4,
  },
  dataValue: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
  },
  dataTime: {
    fontSize: 10,
    color: "#c026d3",
    marginTop: 12,
    textAlign: "right",
    fontStyle: "italic",
  },

  divider: { height: 1, backgroundColor: "#f3f4f6" },
  /* 프로토콜 */
  protocolItem: { flexDirection: "row", gap: 16, alignItems: "flex-start" },
  protocolIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  protocolTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  protocolName: { fontSize: 14, fontWeight: "700", color: "#111827" },
  protocolOn: { fontSize: 12, fontWeight: "700", color: "#16a34a" },
  protocolDesc: { fontSize: 11, color: "#6b7280", lineHeight: 18 },

  /* 추가 버튼 */
  addBtn: {
    backgroundColor: "#eff6ff",
    borderRadius: 99,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  addBtnText: { fontSize: 12, fontWeight: "700", color: "#2563eb" },
});
