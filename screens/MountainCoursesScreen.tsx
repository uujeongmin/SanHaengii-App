import { Ionicons } from "@expo/vector-icons";
import type { RouteProp } from "@react-navigation/native";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as SecureStore from "expo-secure-store";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { CourseParams, RootStackParamList } from "../App";
import { apiService, type Mountain, type MountainCourse } from "../data/api";

const SAVED_MAPS_KEY = "sanhaengii_saved_maps";

type MountainCoursesNavProp = NativeStackNavigationProp<
  RootStackParamList,
  "MountainCourses"
>;
type MountainCoursesRouteProp = RouteProp<
  RootStackParamList,
  "MountainCourses"
>;

const DIFFICULTY_COLOR: Record<
  MountainCourse["difficulty"],
  { bg: string; text: string }
> = {
  하: { bg: "#dcfce7", text: "#15803d" },
  중: { bg: "#fef3c7", text: "#b45309" },
  상: { bg: "#fee2e2", text: "#b91c1c" },
};

export default function MountainCoursesScreen() {
  const navigation = useNavigation<MountainCoursesNavProp>();
  const route = useRoute<MountainCoursesRouteProp>();
  const { mountainId } = route.params;

  const [mountain, setMountain] = useState<Mountain | null>(null);
  const [courses, setCourses] = useState<MountainCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [savedCourseIds, setSavedCourseIds] = useState<Set<string>>(new Set());
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [mountainId]);

  useFocusEffect(
    useCallback(() => {
      loadSavedIds();
    }, []),
  );

  async function loadSavedIds() {
    try {
      const savedStr = await SecureStore.getItemAsync(SAVED_MAPS_KEY);
      if (savedStr) {
        const savedCourses: MountainCourse[] = JSON.parse(savedStr);
        setSavedCourseIds(new Set(savedCourses.map((c) => c.id)));
      } else {
        setSavedCourseIds(new Set());
      }
    } catch {
      // ignore
    }
  }

  async function handleToggleSave(course: MountainCourse) {
    if (savingId !== null) return;
    setSavingId(course.id);
    try {
      const savedStr = await SecureStore.getItemAsync(SAVED_MAPS_KEY);
      const savedCourses: MountainCourse[] = savedStr ? JSON.parse(savedStr) : [];
      const isAlreadySaved = savedCourses.some((c) => c.id === course.id);

      const updated = isAlreadySaved
        ? savedCourses.filter((c) => c.id !== course.id)
        : [...savedCourses, course];

      await SecureStore.setItemAsync(SAVED_MAPS_KEY, JSON.stringify(updated));
      setSavedCourseIds(new Set(updated.map((c) => c.id)));
    } catch {
      // ignore
    } finally {
      setSavingId(null);
    }
  }

  async function fetchData() {
    try {
      setLoading(true);
      const [mtData, courseData] = await Promise.all([
        apiService.getMountain(mountainId),
        apiService.getCourses(mountainId),
      ]);
      setMountain(mtData);
      setCourses(courseData);
    } catch (error) {
      console.error("Failed to fetch mountain courses:", error);
    } finally {
      setLoading(false);
    }
  }

  const filteredCourses = courses.filter((course) => {
    const query = searchQuery.toLowerCase();
    return (
      course.title.toLowerCase().includes(query) ||
      course.tags.some((tag: string) => tag.toLowerCase().includes(query)) ||
      course.startPoint.toLowerCase().includes(query)
    );
  });

  function handleStartCourse(course: MountainCourse) {
    const params: CourseParams = {
      courseId: course.id,
      courseName: course.title,
      mountainName: mountain?.name ?? "",
      difficulty: course.difficulty,
      distance: course.distance,
      time: course.time,
      elevation: course.elevation,
      img: course.img,
    };
    navigation.navigate("MainTabs", { screen: "내비게이션", params });
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      {/* ── 헤더 ── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={22} color="#111827" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>
            {mountain?.name ?? "코스 목록"}
          </Text>
          <Text style={styles.headerSub}>
            {mountain?.region} · ▲{mountain?.altitude.toLocaleString()}m
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* ── 검색바 ── */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#9ca3af" />
          <TextInput
            style={styles.searchInput}
            placeholder="코스명, 태그, 주요 지점 검색"
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9ca3af"
            clearButtonMode="while-editing"
          />
          {searchQuery !== "" && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={18} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {loading ? (
          <View style={{ padding: 40, alignItems: "center" }}>
            <ActivityIndicator size="large" color="#16a34a" />
          </View>
        ) : filteredCourses.length > 0 ? (
          filteredCourses.map((course, idx) => {
            const diff =
              DIFFICULTY_COLOR[course.difficulty] || DIFFICULTY_COLOR["중"];
            const safeTags = Array.isArray(course.tags) ? course.tags : [];
            return (
              <View
                key={course.id}
                style={[
                  styles.card,
                  idx === filteredCourses.length - 1 && { marginBottom: 0 },
                ]}
              >
                {/* 이미지 */}
                <View style={styles.imageWrapper}>
                  <Image
                    source={{
                      uri:
                        course.img ||
                        "https://images.unsplash.com/photo-1685330186861-278ae211fd65?auto=format&fit=crop&q=80&w=800",
                    }}
                    style={styles.image}
                    resizeMode="cover"
                  />
                  <View style={styles.imageOverlay} />

                  {/* 난이도 배지 */}
                  <View
                    style={[styles.diffBadge, { backgroundColor: diff.bg }]}
                  >
                    <Text style={[styles.diffText, { color: diff.text }]}>
                      난이도 {course.difficulty || "중"}
                    </Text>
                  </View>

                  {/* 태그 */}
                  <View style={styles.tagsRow}>
                    {safeTags.map((tag: string) => (
                      <View key={tag} style={styles.tagBadge}>
                        <Text style={styles.tagText}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* 내용 */}
                <View style={styles.info}>
                  <Text style={styles.title}>{course.title || "탐방로"}</Text>
                  <Text style={styles.startPoint} numberOfLines={1}>
                    📍 {course.startPoint || "산 초입"}
                  </Text>

                  {/* 메타 정보 */}
                  <View style={styles.metaRow}>
                    <View style={styles.metaItem}>
                      <Ionicons
                        name="location-outline"
                        size={14}
                        color="#9ca3af"
                      />
                      <Text style={styles.metaText}>
                        {course.distance || "0km"}
                      </Text>
                    </View>
                    <View style={styles.metaDivider} />
                    <View style={styles.metaItem}>
                      <Ionicons name="time-outline" size={14} color="#9ca3af" />
                      <Text style={styles.metaText}>
                        {course.time || "0분"}
                      </Text>
                    </View>
                    <View style={styles.metaDivider} />
                    <View style={styles.metaItem}>
                      <Ionicons
                        name="trending-up-outline"
                        size={14}
                        color="#9ca3af"
                      />
                      <Text style={styles.metaText}>
                        {course.elevation || "+0m"}
                      </Text>
                    </View>
                  </View>

                  {/* 버튼 행 */}
                  <View style={styles.btnRow}>
                    <TouchableOpacity
                      style={[styles.startBtn, { flex: 1 }]}
                      onPress={() => handleStartCourse(course)}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="navigate" size={16} color="#ffffff" />
                      <Text style={styles.startBtnText}>이 코스로 시작하기</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.saveBtn,
                        savedCourseIds.has(course.id) && styles.saveBtnSaved,
                      ]}
                      onPress={() => handleToggleSave(course)}
                      activeOpacity={0.8}
                      disabled={savingId === course.id}
                    >
                      {savingId === course.id ? (
                        <ActivityIndicator size="small" color="#16a34a" />
                      ) : (
                        <Ionicons
                          name={
                            savedCourseIds.has(course.id)
                              ? "bookmark"
                              : "bookmark-outline"
                          }
                          size={20}
                          color={
                            savedCourseIds.has(course.id) ? "#16a34a" : "#6b7280"
                          }
                        />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={48} color="#e5e7eb" />
            <Text style={styles.emptyText}>검색 결과가 없습니다.</Text>
            <Text style={styles.emptySub}>다른 키워드로 검색해보세요.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f9fafb" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: "#ffffff",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: { alignItems: "center" },
  headerTitle: { fontSize: 17, fontWeight: "700", color: "#111827" },
  headerSub: { fontSize: 11, color: "#9ca3af", marginTop: 2 },

  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f3f4f6",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 40,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: "#111827",
    padding: 0,
  },

  scrollView: { flex: 1 },
  scrollContent: { padding: 20, gap: 20, paddingBottom: 40 },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    overflow: "hidden",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: "#f3f4f6",
  },
  imageWrapper: { height: 180, position: "relative" },
  image: { width: "100%", height: "100%" },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.38)",
  },
  diffBadge: {
    position: "absolute",
    top: 14,
    left: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
  },
  diffText: { fontSize: 12, fontWeight: "700" },
  tagsRow: {
    position: "absolute",
    bottom: 14,
    left: 14,
    right: 14,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  tagBadge: {
    backgroundColor: "rgba(255,255,255,0.22)",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
  },
  tagText: { fontSize: 11, color: "#ffffff", fontWeight: "500" },
  info: { padding: 20 },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 2,
    letterSpacing: -0.3,
  },
  startPoint: { fontSize: 12, color: "#9ca3af", marginBottom: 6 },

  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9fafb",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#f3f4f6",
  },
  metaItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    justifyContent: "center",
  },
  metaText: { fontSize: 13, fontWeight: "600", color: "#374151" },
  metaDivider: { width: 1, height: 14, backgroundColor: "#e5e7eb" },
  btnRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  startBtn: {
    backgroundColor: "#16a34a",
    borderRadius: 14,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  startBtnText: { fontSize: 15, fontWeight: "700", color: "#ffffff" },
  saveBtn: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
  },
  saveBtnSaved: {
    backgroundColor: "#dcfce7",
    borderColor: "#86efac",
  },

  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginTop: 16,
  },
  emptySub: {
    fontSize: 14,
    color: "#9ca3af",
    marginTop: 4,
  },
});
