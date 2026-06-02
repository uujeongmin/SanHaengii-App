import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Easing,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../contexts/AuthContext";
import { apiService, DEV_TEST_TOKEN } from "../data/api";

export default function SafetyScreen() {
  const { token, user, completeProfile } = useAuth();

  /* ── 배경 글로우 펄스 ── */
  const bgPulse = useRef(new Animated.Value(1)).current;
  /* ── SOS 링 페이드 ── */
  const sosRingOpacity = useRef(new Animated.Value(0.5)).current;

  /* ── 상태 관리 ── */
  const [isAnomaly, setIsAnomaly] = useState(false);
  const [anomalyMessage, setAnomalyMessage] = useState("정상 상태");
  const [lastHealthData, setLastHealthData] = useState<any>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [isReporting, setIsReporting] = useState(false);

  /* ── 보호자 연락처 수정 모달 상태 ── */
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [tempGuardianNumber, setTempGuardianNumber] = useState("");

  /* ── 응급 프로토콜 카운트다운 ── */
  const [countdown, setCountdown] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const authToken = token ?? DEV_TEST_TOKEN;
  const emergencyUserId = user?.id && user.id > 0 ? user.id : 1;

  /**
   * 전화 걸기
   */
  const handleCall = (phoneNumber: string) => {
    const url = `tel:${phoneNumber}`;
    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          Linking.openURL(url);
        } else {
          Alert.alert("실패", "이 기기에서는 전화를 걸 수 없습니다.");
        }
      })
      .catch((err) => console.error("An error occurred", err));
  };

  /**
   * 보호자 연락처 업데이트 로직
   */
  const saveGuardianNumber = async (number: string) => {
    try {
      await completeProfile({
        nickname: user?.nickname ?? null,
        name: user?.name ?? null,
        age: user?.age ?? null,
        gender: user?.gender ?? null,
        guardianNumber: number,
      });
      setIsEditModalVisible(false);
      Alert.alert("성공", "보호자 연락처가 업데이트되었습니다.");
    } catch (error) {
      Alert.alert("오류", "연락처 업데이트에 실패했습니다.");
    }
  };

  /**
   * 보호자 연락처 수정 모달 열기
   */
  const handleEditGuardian = () => {
    setTempGuardianNumber(user?.guardianNumber ?? "");
    setIsEditModalVisible(true);
  };

  /**
   * 카운트다운 타이머 중지 및 초기화
   */
  const clearEmergencyTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setCountdown(null);
  };

  /**
   * 이상 징후 해제 (사용자 직접 확인)
   */
  const handleCancelAnomaly = () => {
    clearEmergencyTimer();
    setIsAnomaly(false);
    setAnomalyMessage("정상 상태");
    Alert.alert("상태 확인", "이상 징후가 해제되었습니다. 안전한 산행 되세요!");
  };

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
   * 백엔드에 긴급 상황 보고 및 구조 요청 (응급 프로토콜)
   */
  const handleReportEmergency = async (
    reason: string,
    data: any,
    options: { showSuccessAlert?: boolean } = {},
  ) => {
    if (isReporting) return false;
    setIsReporting(true);
    clearEmergencyTimer();
    const { showSuccessAlert = true } = options;

    // 1. 현위치 시도 (실패해도 기본 좌표로 진행)
    let location = { lat: 37.557999, lng: 127.007993 };
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
      console.log("[Safety] SOS 위치 취득 실패, 기본 좌표 사용:", locError);
    }

    const emergencyPayload = {
      userId: emergencyUserId,
      eventType: reason.includes("수동")
        ? "수동_긴급_호출"
        : reason.includes("낙상")
          ? "낙상_감지"
          : "이상_징후",
      timestamp: new Date().toISOString(),
      location,
    };

    try {
      console.log("[Protocol] Posting emergency request...");
      await apiService.reportEmergency(emergencyPayload, authToken);
      if (showSuccessAlert) {
        Alert.alert(
          "🆘 구조 요청 전송 완료",
          "백엔드 서버의 /api/emergency로 구조 요청을 전송했습니다.",
          [{ text: "확인" }],
        );
      }
      return true;
    } catch (error: any) {
      console.error("[Protocol] Emergency request error:", error);
      if (showSuccessAlert) {
        Alert.alert(
          "구조 요청 전송 실패",
          "/api/emergency 서버로 구조 요청을 전송하지 못했습니다. 즉시 119에 직접 전화를 걸어주세요.",
        );
      }
      return false;
    } finally {
      setIsReporting(false);
      setIsAnomaly(false);
      setAnomalyMessage("정상 상태");
    }
  };

  /**
   * 백엔드 이상징후탐지 알고리즘을 우선 사용하고, 실패 시 로컬 판정으로 보조합니다.
   */
  const analyzeAnomaly = async (data: any) => {
    try {
      const result = await apiService.checkAnomaly(data, authToken);
      if (result.is_anomaly) {
        return (
          result.message ||
          result.anomaly_type ||
          "백엔드 알고리즘에서 이상 징후가 감지되었습니다."
        );
      }
      return null;
    } catch (error) {
      console.error("[Safety] Backend anomaly check failed:", error);
      return detectAnomalyLocally(data);
    }
  };

  /**
   * 이상 징후 감지 시 카운트다운 시작
   */
  const triggerAnomalyProtocol = (message: string, data: any) => {
    if (countdown !== null) return;

    setIsAnomaly(true);
    setAnomalyMessage(message);
    setCountdown(30);

    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev !== null && prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          timerRef.current = null;
          handleReportEmergency(message, data);
          return 0;
        }
        return prev !== null ? prev - 1 : null;
      });
    }, 1000);
  };

  /**
   * 임의의 생체 데이터를 서버에 업로드 (워치 시뮬레이션)
   */
  const uploadDummyHealthData = async () => {
    const dummyData = {
      measured_at: new Date().toISOString(),
      heart_rate: Math.floor(Math.random() * (100 - 65 + 1)) + 65,
      steps: Math.floor(Math.random() * 10000),
      calories: Math.random() * 500,
      spo2: 95 + Math.floor(Math.random() * 5),
      body_temp: 36.5 + Math.random() * 0.5,
      blood_pressure_systolic: 120,
      blood_pressure_diastolic: 80,
      user_id: emergencyUserId,
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

        const anomalyMsg = await analyzeAnomaly(latest);
        if (anomalyMsg) {
          triggerAnomalyProtocol(anomalyMsg, latest);
        } else {
          if (countdown === null) {
            setIsAnomaly(false);
            setAnomalyMessage("정상 상태");
          }
        }
      }
    } catch (error: any) {
      console.error("Fetch error:", error);
    }
  };

  useEffect(() => {
    let interval: any;
    if (isMonitoring) {
      interval = setInterval(async () => {
        await uploadDummyHealthData();
        fetchAndCheckHealthData();
      }, 5000);

      Alert.alert(
        "실시간 모니터링 시작",
        "스마트워치로 실시간 데이터를 분석합니다.",
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

    return () => clearEmergencyTimer();
  }, []);

  const simulateWatchSignal = async () => {
    console.log(`[Watch] Simulating sensor data (Anomaly)`);

    const sensorData = {
      gyroscope: { x: 0, y: 0, z: 0 },
      heart_rate: 120,
      spo2: 98,
      body_temp: 36.5,
    };

    try {
      const result = await apiService.checkAnomaly(sensorData, authToken);
      if (result.is_anomaly) {
        triggerAnomalyProtocol(result.message, sensorData);
      } else {
        Alert.alert("알림", "서버 분석 결과 정상 상태입니다.");
      }
    } catch (error) {
      console.error("[Watch] Anomaly check failed:", error);
      const localMsg = detectAnomalyLocally(sensorData);
      if (localMsg) {
        triggerAnomalyProtocol(localMsg, sensorData);
      } else {
        Alert.alert("에러", "분석을 수행할 수 없습니다.");
      }
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View
          style={[
            styles.header,
            isAnomaly && { backgroundColor: "#7f1d1d" },
            countdown !== null && { backgroundColor: "#ef4444" },
          ]}
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

          {countdown !== null ? (
            <View style={styles.emergencyBanner}>
              <View style={styles.emergencyRow}>
                <Ionicons name="alert-circle" size={32} color="#ffffff" />
                <View>
                  <Text style={styles.emergencyTitle}>응급 상황 감지됨!</Text>
                  <Text style={styles.emergencyTime}>
                    {countdown}초 후 자동 신고됩니다
                  </Text>
                </View>
              </View>
              <View style={styles.emergencyActions}>
                <TouchableOpacity
                  style={styles.actionBtnReport}
                  onPress={() =>
                    handleReportEmergency(anomalyMessage, lastHealthData)
                  }
                >
                  <Text style={styles.actionBtnText}>즉시 신고</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionBtnCancel}
                  onPress={handleCancelAnomaly}
                >
                  <Text style={[styles.actionBtnText, { color: "#ffffff" }]}>
                    신고 취소
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
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
          )}
        </View>

        <View style={styles.content}>
          <TouchableOpacity
            style={styles.sosCard}
            activeOpacity={0.88}
            delayLongPress={5000}
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
              버튼을 5초 동안 누르면 119 및 지정 보호자에게 위치가 전송됩니다.
            </Text>
          </TouchableOpacity>

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

          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardTitle}>비상 연락망</Text>
            </View>

            <ContactRow
              iconName="shield-outline"
              iconBg="#fee2e2"
              iconColor="#dc2626"
              name="119 구조대"
              sub="위치정보 자동 포함"
              onPressCall={() => handleCall("119")}
            />

            <ContactRow
              iconName="person-outline"
              iconBg="#dbeafe"
              iconColor="#2563eb"
              name="보호자"
              sub={user?.guardianNumber || "등록된 번호 없음"}
              onPressEdit={handleEditGuardian}
              onPressCall={() => {
                if (user?.guardianNumber) {
                  handleCall(user.guardianNumber);
                } else {
                  Alert.alert("알림", "보호자 연락처가 등록되지 않았습니다.");
                }
              }}
            />
          </View>
        </View>
      </ScrollView>

      {/* ── 보호자 연락처 수정 모달 ── */}
      <Modal
        visible={isEditModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>보호자 연락처 수정</Text>
            <Text style={styles.modalDesc}>
              새로운 전화번호를 입력해주세요.
            </Text>
            <TextInput
              style={styles.modalInput}
              value={tempGuardianNumber}
              onChangeText={setTempGuardianNumber}
              placeholder="010-0000-0000"
              keyboardType="phone-pad"
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => setIsEditModalVisible(false)}
              >
                <Text style={styles.modalBtnTextCancel}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnSave]}
                onPress={() => saveGuardianNumber(tempGuardianNumber)}
              >
                <Text style={styles.modalBtnTextSave}>저장</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function ContactRow({
  iconName,
  iconBg,
  iconColor,
  name,
  sub,
  onPressCall,
  onPressEdit,
}: {
  iconName: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  iconColor: string;
  name: string;
  sub: string;
  onPressCall?: () => void;
  onPressEdit?: () => void;
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
      <View style={cStyles.actionButtons}>
        {onPressEdit && (
          <TouchableOpacity style={cStyles.actionBtn} onPress={onPressEdit}>
            <Ionicons name="create-outline" size={18} color="#4b5563" />
          </TouchableOpacity>
        )}
        <TouchableOpacity style={cStyles.actionBtn} onPress={onPressCall}>
          <Ionicons name="call-outline" size={18} color="#4b5563" />
        </TouchableOpacity>
      </View>
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
  actionButtons: {
    flexDirection: "row",
    gap: 8,
  },
  actionBtn: {
    width: 36,
    height: 36,
    backgroundColor: "#ffffff",
    borderRadius: 18,
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

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f9fafb" },
  container: { flex: 1 },
  scrollContent: { paddingBottom: 48 },

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

  emergencyBanner: {
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: 20,
    padding: 16,
    borderWidth: 2,
    borderColor: "#ffffff",
  },
  emergencyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  emergencyTitle: { fontSize: 18, fontWeight: "900", color: "#ffffff" },
  emergencyTime: { fontSize: 14, fontWeight: "700", color: "#fecaca" },
  emergencyActions: {
    flexDirection: "row",
    gap: 10,
  },
  actionBtnReport: {
    flex: 1,
    backgroundColor: "#ffffff",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  actionBtnCancel: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ffffff",
  },
  actionBtnText: { fontSize: 14, fontWeight: "800", color: "#ef4444" },

  content: {
    paddingHorizontal: 24,
    marginTop: -36,
    gap: 20,
    zIndex: 20,
  },

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

  simBtn: {
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

  addBtn: {
    backgroundColor: "#eff6ff",
    borderRadius: 99,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  addBtnText: { fontSize: 12, fontWeight: "700", color: "#2563eb" },

  /* ── 모달 스타일 ── */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContent: {
    width: "100%",
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 24,
    gap: 16,
  },
  modalTitle: { fontSize: 20, fontWeight: "800", color: "#111827" },
  modalDesc: { fontSize: 14, color: "#4b5563" },
  modalInput: {
    backgroundColor: "#f3f4f6",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#111827",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  modalActions: { flexDirection: "row", gap: 12, marginTop: 8 },
  modalBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  modalBtnCancel: { backgroundColor: "#f3f4f6" },
  modalBtnSave: { backgroundColor: "#2563eb" },
  modalBtnTextCancel: { fontSize: 15, fontWeight: "700", color: "#4b5563" },
  modalBtnTextSave: { fontSize: 15, fontWeight: "700", color: "#ffffff" },
});
