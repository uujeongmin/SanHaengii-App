import { Ionicons } from "@expo/vector-icons";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { CompositeNavigationProp } from "@react-navigation/native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type {
  CourseParams,
  RootStackParamList,
  RootTabParamList,
} from "../App";
import {
  getUserDisplayName,
  getUserInitial,
  useAuth,
} from "../contexts/AuthContext";
import {
  useWatchHealth,
  type WatchHealthStatus,
} from "../contexts/WatchHealthContext";
import {
  apiService,
  DEFAULT_MOUNTAIN_IMAGE,
  type Mountain,
  type MountainCourse,
} from "../data/api";

type HomeNavProp = CompositeNavigationProp<
  BottomTabNavigationProp<RootTabParamList, "홈">,
  NativeStackNavigationProp<RootStackParamList>
>;

const SCREEN_WIDTH = Dimensions.get("window").width;
const MOUNTAIN_CARD_W = 148;
const COURSE_CARD_W = SCREEN_WIDTH - 64;

const DIFFICULTY_COLOR: Record<
  MountainCourse["difficulty"],
  { bg: string; text: string }
> = {
  하: { bg: "#dcfce7", text: "#15803d" },
  중: { bg: "#fef3c7", text: "#b45309" },
  상: { bg: "#fee2e2", text: "#b91c1c" },
};

const MOUNTAIN_GRADIENT_COLORS = [
  "#10b981", // emerald
  "#0ea5e9", // sky
  "#8b5cf6", // violet
  "#f59e0b", // amber
];

function formatKoreanTime(value: string | null | undefined) {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const formatter = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  return formatter.format(date);
}

function formatWatchNumber(value: number | null | undefined, suffix: string) {
  return Number.isFinite(value)
    ? `${Math.round(Number(value))}${suffix}`
    : "--";
}

function formatWatchMeasuredAt(value: string | null | undefined) {
  if (!value) return "아직 수신된 데이터가 없습니다.";

  const time = formatKoreanTime(value);
  if (!time) return "최근 데이터 수신됨";
  return `최근 수신 ${time} KST`;
}

function getWatchStatusText(
  status: WatchHealthStatus,
  isEnabled: boolean,
  isGuest: boolean,
  error: string | null,
) {
  if (!isEnabled) return "동기화를 켜면 최신 생체 데이터를 불러옵니다.";
  if (isGuest) return "로그인 후 스마트워치 동기화를 사용할 수 있어요.";
  if (status === "syncing") return "스마트워치 데이터를 연결하는 중입니다.";
  if (status === "live") return "스마트워치 데이터가 실시간 반영 중입니다.";
  if (status === "empty") return "워치에서 전송된 데이터가 아직 없습니다.";
  if (status === "error")
    return error ?? "스마트워치 데이터를 불러오지 못했습니다.";
  return "스마트워치 연결을 준비하고 있습니다.";
}

function getWatchPulseColor(status: WatchHealthStatus, isEnabled: boolean) {
  if (!isEnabled) return "#cbd5e1";
  if (status === "live") return "#22c55e";
  if (status === "error") return "#ef4444";
  if (status === "syncing") return "#f59e0b";
  return "#94a3b8";
}

export default function HomeScreen() {
  const navigation = useNavigation<HomeNavProp>();
  const { user, isGuest } = useAuth();
  const {
    isEnabled: watchSyncEnabled,
    latestData: watchData,
    status: watchStatus,
    error: watchError,
    setEnabled: setWatchSyncEnabled,
  } = useWatchHealth();
  const [selectedMountainId, setSelectedMountainId] = useState<string | null>(
    null,
  );
  const [mountains, setMountains] = useState<Mountain[]>([]);
  const [courses, setCourses] = useState<MountainCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [failedMountainImageIds, setFailedMountainImageIds] = useState<
    Set<string>
  >(() => new Set());

  useEffect(() => {
    fetchMountains();
  }, []);

  useEffect(() => {
    if (selectedMountainId) {
      fetchCourses(selectedMountainId);
    } else {
      setCourses([]);
    }
  }, [selectedMountainId]);

  async function fetchMountains() {
    try {
      setLoading(true);
      setError(null);
      const data = await apiService.getMountains();
      setMountains(data);
      setFailedMountainImageIds(new Set());
    } catch (error: any) {
      console.error("Failed to fetch mountains:", error);
      setError("산 목록을 불러오지 못했습니다. 서버 연결을 확인해주세요.");
    } finally {
      setLoading(false);
    }
  }

  async function fetchCourses(mountainId: string) {
    try {
      setCoursesLoading(true);
      const data = await apiService.getCourses(mountainId);
      setCourses(data);
    } catch (error: any) {
      console.error("Failed to fetch courses:", error);
      Alert.alert("오류", "코스 정보를 불러오지 못했습니다.");
    } finally {
      setCoursesLoading(false);
    }
  }

  const selectedMountain =
    mountains.find((m) => m.id === selectedMountainId) ?? null;
  const displayName = getUserDisplayName(user);
  const userInitial = getUserInitial(user);
  const watchStatusText = getWatchStatusText(
    watchStatus,
    watchSyncEnabled,
    isGuest,
    watchError,
  );
  const watchPulseColor = getWatchPulseColor(watchStatus, watchSyncEnabled);
  const heartRateText = formatWatchNumber(watchData?.heartRate, " bpm");
  const spo2Text = formatWatchNumber(watchData?.spo2, " %");
  const measuredAtText = formatWatchMeasuredAt(watchData?.measuredAt);

  function handleStartCourse(course: MountainCourse) {
    const params: CourseParams = {
      courseId: course.id,
      courseName: course.title,
      mountainName: selectedMountain?.name ?? "",
      difficulty: course.difficulty,
      distance: course.distance,
      time: course.time,
      elevation: course.elevation,
      img: course.img,
    };
    navigation.navigate("내비게이션", params);
  }

  function handleToggleMountain(mountainId: string) {
    setSelectedMountainId((prev) => (prev === mountainId ? null : mountainId));
  }

  function handleToggleWatchSync() {
    if (!watchSyncEnabled && isGuest) {
      Alert.alert(
        "로그인이 필요해요",
        "스마트워치 생체 데이터는 로그인 후 계정 기준으로 불러올 수 있어요.",
      );
      return;
    }

    setWatchSyncEnabled(!watchSyncEnabled);
  }

  function getMountainImageUri(mountain: Mountain) {
    if (failedMountainImageIds.has(mountain.id)) return DEFAULT_MOUNTAIN_IMAGE;
    return mountain.img || DEFAULT_MOUNTAIN_IMAGE;
  }

  function handleMountainImageError(mountain: Mountain) {
    setFailedMountainImageIds((prev) => {
      if (prev.has(mountain.id)) return prev;
      const next = new Set(prev);
      next.add(mountain.id);
      return next;
    });
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ── 헤더 ── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>좋은 아침입니다!</Text>
            <Text style={styles.subGreeting}>
              {displayName}님의 산행을 계획해 볼까요?
            </Text>
          </View>
          <TouchableOpacity
            style={styles.profileWrapper}
            onPress={() => navigation.navigate("Profile")}
            activeOpacity={0.8}
          >
            <Text style={styles.profileInitial}>{userInitial}</Text>
          </TouchableOpacity>
        </View>

        {/* ── 스마트워치 동기화 ── */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={[styles.row, styles.watchHeaderLeft]}>
              <Ionicons name="watch-outline" size={20} color="#22c55e" />
              <View style={styles.cardHeaderTextBlock}>
                <Text style={styles.cardHeaderTitle}>스마트워치 동기화</Text>
                <Text style={styles.watchStatusText} numberOfLines={2}>
                  {watchStatusText}
                </Text>
              </View>
            </View>
            <View style={styles.watchControlRow}>
              <View
                style={[styles.pingDot, { backgroundColor: watchPulseColor }]}
              />
              <TouchableOpacity
                style={[
                  styles.watchToggleButton,
                  watchSyncEnabled && styles.watchToggleButtonActive,
                ]}
                onPress={handleToggleWatchSync}
                activeOpacity={0.85}
              >
                <Text
                  style={[
                    styles.watchToggleText,
                    watchSyncEnabled && styles.watchToggleTextActive,
                  ]}
                >
                  {watchSyncEnabled ? "ON" : "OFF"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.metricsRow}>
            <View style={[styles.metricChip, { backgroundColor: "#fff1f2" }]}>
              <Ionicons name="heart" size={22} color="#f43f5e" />
              <Text style={styles.metricValue}>
                {heartRateText.replace(" bpm", "")}
                <Text style={styles.metricUnit}> bpm</Text>
              </Text>
              <Text style={[styles.metricLabel, { color: "#e11d48" }]}>
                {watchSyncEnabled ? "실시간 심박수" : "심박수 대기"}
              </Text>
            </View>
            <View style={[styles.metricChip, { backgroundColor: "#eff6ff" }]}>
              <Ionicons name="pulse" size={22} color="#3b82f6" />
              <Text style={styles.metricValue}>
                {spo2Text.replace(" %", "")}
                <Text style={styles.metricUnit}> %</Text>
              </Text>
              <Text style={[styles.metricLabel, { color: "#2563eb" }]}>
                {watchSyncEnabled ? "실시간 산소포화도" : "산소포화도 대기"}
              </Text>
            </View>
          </View>

          <View style={styles.cardFooter}>
            <View style={styles.watchFooterRow}>
              <Ionicons name="time-outline" size={14} color="#94a3b8" />
              <Text style={styles.cardFooterText}>{measuredAtText}</Text>
            </View>
          </View>
        </View>

        {/* ── 산 선택 섹션 ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>산 선택</Text>
          <TouchableOpacity
            style={styles.row}
            onPress={() => navigation.navigate("AllRoutes")}
            activeOpacity={0.7}
          >
            <Text style={styles.seeAllText}>전체보기</Text>
            <Ionicons name="chevron-forward" size={16} color="#16a34a" />
          </TouchableOpacity>
        </View>

        {/* 산 카드 수평 스크롤 */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.mountainList}
          snapToInterval={MOUNTAIN_CARD_W + 12}
          decelerationRate="fast"
        >
          {loading ? (
            <View
              style={[
                styles.mountainCard,
                {
                  justifyContent: "center",
                  alignItems: "center",
                  backgroundColor: "#f3f4f6",
                },
              ]}
            >
              <ActivityIndicator color="#16a34a" />
            </View>
          ) : error ? (
            <View
              style={[
                styles.mountainCard,
                {
                  width: SCREEN_WIDTH - 48,
                  padding: 20,
                  justifyContent: "center",
                  alignItems: "center",
                  backgroundColor: "#fee2e2",
                },
              ]}
            >
              <Text
                style={{
                  color: "#b91c1c",
                  fontSize: 12,
                  textAlign: "center",
                  marginBottom: 8,
                }}
              >
                {error}
              </Text>
              <TouchableOpacity
                onPress={fetchMountains}
                style={{
                  backgroundColor: "#b91c1c",
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 8,
                }}
              >
                <Text
                  style={{ color: "#ffffff", fontSize: 12, fontWeight: "700" }}
                >
                  다시 시도
                </Text>
              </TouchableOpacity>
            </View>
          ) : mountains.length === 0 ? (
            <View
              style={[
                styles.mountainCard,
                {
                  width: SCREEN_WIDTH - 48,
                  justifyContent: "center",
                  alignItems: "center",
                  backgroundColor: "#f3f4f6",
                },
              ]}
            >
              <Text style={{ color: "#9ca3af" }}>
                등록된 산 정보가 없습니다.
              </Text>
            </View>
          ) : (
            mountains.map((mountain, idx) => {
              const isSelected = selectedMountainId === mountain.id;
              const bgColor =
                MOUNTAIN_GRADIENT_COLORS[idx % MOUNTAIN_GRADIENT_COLORS.length];
              return (
                <TouchableOpacity
                  key={mountain.id}
                  style={[
                    styles.mountainCard,
                    isSelected && styles.mountainCardSelected,
                  ]}
                  onPress={() => handleToggleMountain(mountain.id)}
                  activeOpacity={0.85}
                >
                  <Image
                    source={{ uri: getMountainImageUri(mountain) }}
                    style={styles.mountainCardImage}
                    resizeMode="cover"
                    onError={() => handleMountainImageError(mountain)}
                  />
                  <View style={styles.mountainCardOverlay} />
                  {isSelected && (
                    <View style={styles.mountainCheckBadge}>
                      <Ionicons name="checkmark" size={13} color="#ffffff" />
                    </View>
                  )}
                  <View style={[styles.altBadge, { backgroundColor: bgColor }]}>
                    <Text style={styles.altBadgeText}>
                      ▲ {mountain.altitude.toLocaleString()}m
                    </Text>
                  </View>
                  <View style={styles.mountainCardBottom}>
                    <Text style={styles.mountainCardName}>{mountain.name}</Text>
                    <View style={styles.row}>
                      <Ionicons
                        name="git-branch-outline"
                        size={10}
                        color="rgba(255,255,255,0.7)"
                      />
                      <Text style={styles.mountainCardSub}>
                        코스 {mountain.courseCount}개
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>

        {/* ── 선택된 산의 코스 목록 ── */}
        {selectedMountain && (
          <View style={styles.coursesSection}>
            <View style={styles.coursesSectionHeader}>
              <View style={styles.sectionAccent} />
              <Text style={styles.coursesSectionTitle}>
                {selectedMountain.name} 등산 코스
              </Text>
              <View style={styles.coursesCountBadge}>
                <Text style={styles.coursesCountText}>{courses.length}개</Text>
              </View>
            </View>

            {coursesLoading ? (
              <View style={{ padding: 24, alignItems: "center" }}>
                <ActivityIndicator color="#16a34a" />
              </View>
            ) : courses.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.courseList}
                snapToInterval={COURSE_CARD_W + 16}
                decelerationRate="fast"
              >
                {courses.map((course) => {
                  const diff =
                    DIFFICULTY_COLOR[course.difficulty] ||
                    DIFFICULTY_COLOR["중"];
                  const safeTags = Array.isArray(course.tags)
                    ? course.tags
                    : [];
                  return (
                    <View key={course.id} style={styles.courseCard}>
                      <View style={styles.courseImageWrapper}>
                        <Image
                          source={{
                            uri:
                              course.img ||
                              "https://images.unsplash.com/photo-1685330186861-278ae211fd65?auto=format&fit=crop&q=80&w=800",
                          }}
                          style={styles.courseImage}
                          resizeMode="cover"
                        />
                        <View style={styles.courseImageOverlay} />
                        <View
                          style={[
                            styles.diffBadge,
                            { backgroundColor: diff.bg },
                          ]}
                        >
                          <Text style={[styles.diffText, { color: diff.text }]}>
                            난이도 {course.difficulty || "중"}
                          </Text>
                        </View>
                        <View style={styles.tagsRow}>
                          {safeTags.slice(0, 2).map((tag: string) => (
                            <View key={tag} style={styles.tagBadge}>
                              <Text style={styles.tagText}>{tag}</Text>
                            </View>
                          ))}
                        </View>
                      </View>

                      <View style={styles.courseInfo}>
                        <Text style={styles.courseTitle} numberOfLines={1}>
                          {course.title || "탐방로"}
                        </Text>
                        <Text style={styles.courseStart} numberOfLines={1}>
                          📍 {course.startPoint || "산 초입"}
                        </Text>
                        <View style={styles.courseMetaRow}>
                          <View style={styles.courseMetaItem}>
                            <Ionicons
                              name="location-outline"
                              size={13}
                              color="#9ca3af"
                            />
                            <Text style={styles.courseMetaText}>
                              {course.distance || "0km"}
                            </Text>
                          </View>
                          <View style={styles.courseMetaDivider} />
                          <View style={styles.courseMetaItem}>
                            <Ionicons
                              name="time-outline"
                              size={13}
                              color="#9ca3af"
                            />
                            <Text style={styles.courseMetaText}>
                              {course.time || "0분"}
                            </Text>
                          </View>
                          <View style={styles.courseMetaDivider} />
                          <View style={styles.courseMetaItem}>
                            <Ionicons
                              name="trending-up-outline"
                              size={13}
                              color="#9ca3af"
                            />
                            <Text style={styles.courseMetaText}>
                              {course.elevation || "+0m"}
                            </Text>
                          </View>
                        </View>
                        <TouchableOpacity
                          style={styles.startBtn}
                          onPress={() => handleStartCourse(course)}
                          activeOpacity={0.85}
                        >
                          <Ionicons name="navigate" size={15} color="#ffffff" />
                          <Text style={styles.startBtnText}>
                            이 코스로 시작하기
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            ) : (
              <View style={{ padding: 24, alignItems: "center" }}>
                <Text style={{ color: "#9ca3af" }}>
                  등록된 코스가 없습니다.
                </Text>
              </View>
            )}
          </View>
        )}

        {!selectedMountain && (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="triangle-outline" size={28} color="#86efac" />
            </View>
            <Text style={styles.emptyText}>위에서 산을 선택하면</Text>
            <Text style={styles.emptyText}>해당 산의 코스가 표시됩니다.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f9fafb" },
  container: { flex: 1 },
  scrollContent: { paddingBottom: 48 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  greeting: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    letterSpacing: -0.5,
  },
  subGreeting: { fontSize: 14, color: "#6b7280", marginTop: 4 },
  profileWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: "#ffffff",
    backgroundColor: "#dcfce7",
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  profileInitial: {
    color: "#15803d",
    fontSize: 18,
    fontWeight: "900",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 20,
    marginHorizontal: 24,
    marginTop: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: "#f3f4f6",
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 16,
    gap: 12,
  },
  cardHeaderTextBlock: {
    flex: 1,
    minWidth: 0,
    marginLeft: 8,
  },
  cardHeaderTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f2937",
  },
  watchStatusText: {
    fontSize: 11,
    color: "#64748b",
    lineHeight: 16,
    marginTop: 2,
  },
  watchControlRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 0,
  },
  watchHeaderLeft: {
    flex: 1,
    minWidth: 0,
  },
  pingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#22c55e",
  },
  watchToggleButton: {
    minWidth: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#e5e7eb",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  watchToggleButtonActive: {
    backgroundColor: "#16a34a",
  },
  watchToggleText: {
    fontSize: 11,
    color: "#475569",
    fontWeight: "900",
  },
  watchToggleTextActive: {
    color: "#ffffff",
  },
  cardFooter: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  watchFooterRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  cardFooterText: { fontSize: 12, color: "#6b7280" },
  metricsRow: { flexDirection: "row", gap: 12 },
  metricChip: { flex: 1, borderRadius: 16, padding: 16 },
  metricValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    marginTop: 8,
  },
  metricUnit: { fontSize: 14, fontWeight: "500", color: "#6b7280" },
  metricLabel: { fontSize: 12, fontWeight: "500", marginTop: 2 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    marginTop: 28,
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 20, fontWeight: "700", color: "#111827" },
  seeAllText: { fontSize: 14, color: "#16a34a", fontWeight: "500" },
  mountainList: { paddingHorizontal: 24, paddingBottom: 4, gap: 12 },
  mountainCard: {
    width: MOUNTAIN_CARD_W,
    height: 110,
    borderRadius: 18,
    overflow: "hidden",
    position: "relative",
  },
  mountainCardSelected: { borderWidth: 2.5, borderColor: "#16a34a" },
  mountainCardImage: { ...StyleSheet.absoluteFillObject },
  mountainCardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.38)",
  },
  mountainCheckBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#16a34a",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  altBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
  },
  altBadgeText: { fontSize: 10, fontWeight: "700", color: "#ffffff" },
  mountainCardBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 10,
  },
  mountainCardName: {
    fontSize: 14,
    fontWeight: "800",
    color: "#ffffff",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  mountainCardSub: {
    fontSize: 10,
    color: "rgba(255,255,255,0.7)",
    marginLeft: 3,
  },
  coursesSection: { marginTop: 20 },
  coursesSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    marginBottom: 14,
    gap: 8,
  },
  sectionAccent: {
    width: 4,
    height: 20,
    backgroundColor: "#16a34a",
    borderRadius: 2,
  },
  coursesSectionTitle: { fontSize: 15, fontWeight: "700", color: "#1f2937" },
  coursesCountBadge: {
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 99,
  },
  coursesCountText: { fontSize: 11, color: "#6b7280", fontWeight: "600" },
  courseList: { paddingHorizontal: 24, paddingBottom: 4, gap: 16 },
  courseCard: {
    width: COURSE_CARD_W,
    backgroundColor: "#ffffff",
    borderRadius: 24,
    overflow: "hidden",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: "#f3f4f6",
  },
  courseImageWrapper: { height: 148, position: "relative" },
  courseImage: { width: "100%", height: "100%" },
  courseImageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.42)",
  },
  diffBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 99,
  },
  diffText: { fontSize: 11, fontWeight: "700" },
  tagsRow: {
    position: "absolute",
    bottom: 12,
    left: 12,
    right: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
  },
  tagBadge: {
    backgroundColor: "rgba(255,255,255,0.22)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  tagText: { fontSize: 10, color: "#ffffff", fontWeight: "500" },
  courseInfo: { padding: 16 },
  courseTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 3,
  },
  courseStart: { fontSize: 12, color: "#9ca3af", marginBottom: 10 },
  courseMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#f3f4f6",
  },
  courseMetaItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  courseMetaText: { fontSize: 12, fontWeight: "600", color: "#374151" },
  courseMetaDivider: { width: 1, height: 12, backgroundColor: "#e5e7eb" },
  startBtn: {
    backgroundColor: "#16a34a",
    borderRadius: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  startBtnText: { fontSize: 14, fontWeight: "700", color: "#ffffff" },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
    gap: 6,
  },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "#f0fdf4",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  emptyText: { fontSize: 14, color: "#9ca3af" },
  row: { flexDirection: "row", alignItems: "center" },
});
