import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as SecureStore from "expo-secure-store";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { RootStackParamList } from "../App";
import { useAuth } from "../contexts/AuthContext";
import { MountainCourse } from "../data/api";

type SavedMapsNavProp = NativeStackNavigationProp<
  RootStackParamList,
  "SavedMaps"
>;

const SAVED_MAPS_KEY_BASE = "sanhaengii_saved_maps";

export default function SavedMapsScreen() {
  const navigation = useNavigation<SavedMapsNavProp>();
  const { user } = useAuth();
  const [savedCourses, setSavedCourses] = useState<MountainCourse[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSavedMaps = useCallback(async () => {
    try {
      setLoading(true);
      const savedKey = `${SAVED_MAPS_KEY_BASE}_${user?.id ?? "guest"}`;
      const savedStr = await SecureStore.getItemAsync(savedKey);
      if (!savedStr) {
        setSavedCourses([]);
        return;
      }

      const savedData = JSON.parse(savedStr);
      setSavedCourses(savedData);
    } catch (error) {
      console.error("Failed to load saved maps:", error);
      Alert.alert("오류", "저장된 지도를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      loadSavedMaps();
    }, [loadSavedMaps]),
  );

  const removeSavedMap = async (courseId: string) => {
    Alert.alert("지도 삭제", "이 코스의 오프라인 지도를 삭제하시겠습니까?", [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: async () => {
          try {
            const updated = savedCourses.filter((c) => c.id !== courseId);
            const savedKey = `${SAVED_MAPS_KEY_BASE}_${user?.id ?? "guest"}`;
            await SecureStore.setItemAsync(savedKey, JSON.stringify(updated));
            setSavedCourses(updated);
          } catch (error) {
            Alert.alert("오류", "지도를 삭제하지 못했습니다.");
          }
        },
      },
    ]);
  };

  const handleViewDetail = (course: MountainCourse) => {
    navigation.navigate("OfflineMapDetail", {
      course: course as any,
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={22} color="#111827" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>저장된 지도</Text>
          <Text style={styles.headerSub}>
            오프라인에서 확인 가능한 {savedCourses.length}개의 코스
          </Text>
        </View>
        <View style={{ width: 40 }} />
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
        ) : savedCourses.length > 0 ? (
          savedCourses.map((course) => (
            <TouchableOpacity
              key={course.id}
              style={styles.card}
              activeOpacity={0.9}
              onPress={() => handleViewDetail(course)}
            >
              <View style={styles.imageWrapper}>
                <Image
                  source={{ uri: course.img }}
                  style={styles.image}
                  resizeMode="cover"
                />
                <View style={styles.imageOverlay} />
                <View style={styles.difficultyBadge}>
                  <Text style={styles.difficultyText}>
                    난이도 {course.difficulty}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={(e) => {
                    e.stopPropagation();
                    removeSavedMap(course.id);
                  }}
                >
                  <Ionicons name="trash-outline" size={18} color="#ffffff" />
                </TouchableOpacity>
              </View>

              <View style={styles.info}>
                <View style={styles.infoRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.courseTitle}>{course.title}</Text>
                    <Text style={styles.mountainName}>{course.mountainId}</Text>
                  </View>
                  <View style={styles.viewBtn}>
                    <Ionicons name="image-outline" size={16} color="#ffffff" />
                    <Text style={styles.viewBtnText}>지도 보기</Text>
                  </View>
                </View>

                <View style={styles.metaRow}>
                  <View style={styles.metaItem}>
                    <Ionicons
                      name="location-outline"
                      size={14}
                      color="#9ca3af"
                    />
                    <Text style={styles.metaText}>{course.distance}</Text>
                  </View>
                  <View style={styles.metaDivider} />
                  <View style={styles.metaItem}>
                    <Ionicons name="time-outline" size={14} color="#9ca3af" />
                    <Text style={styles.metaText}>{course.time}</Text>
                  </View>
                  <View style={styles.metaDivider} />
                  <View style={styles.metaItem}>
                    <Ionicons
                      name="trending-up-outline"
                      size={14}
                      color="#9ca3af"
                    />
                    <Text style={styles.metaText}>{course.elevation}</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <Ionicons
                name="cloud-offline-outline"
                size={48}
                color="#e5e7eb"
              />
            </View>
            <Text style={styles.emptyText}>저장된 지도가 없습니다.</Text>
            <Text style={styles.emptySub}>
              내비게이션 화면에서 지도를 다운로드 해보세요.
            </Text>
            <TouchableOpacity
              style={styles.goHomeBtn}
              onPress={() => navigation.navigate("MainTabs", { screen: "홈" })}
            >
              <Text style={styles.goHomeBtnText}>추천 산 보러가기</Text>
            </TouchableOpacity>
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
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
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
  headerSub: { fontSize: 12, color: "#9ca3af", marginTop: 2 },
  scrollView: { flex: 1 },
  scrollContent: { padding: 20, gap: 16, paddingBottom: 40 },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 22,
    overflow: "hidden",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: "#f3f4f6",
  },
  imageWrapper: { height: 120, position: "relative" },
  image: { width: "100%", height: "100%" },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  difficultyBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
  },
  difficultyText: { fontSize: 11, fontWeight: "600", color: "#ffffff" },
  deleteBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(239, 68, 68, 0.8)",
    alignItems: "center",
    justifyContent: "center",
  },
  info: { padding: 16 },
  infoRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  courseTitle: { fontSize: 16, fontWeight: "700", color: "#111827" },
  mountainName: { fontSize: 13, color: "#9ca3af", marginTop: 2 },
  viewBtn: {
    backgroundColor: "#3b82f6",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 4,
  },
  viewBtnText: { color: "#ffffff", fontSize: 13, fontWeight: "700" },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  metaItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  metaText: { fontSize: 12, fontWeight: "600", color: "#4b5563" },
  metaDivider: { width: 1, height: 12, backgroundColor: "#e5e7eb" },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
    gap: 12,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  emptyText: { fontSize: 18, fontWeight: "700", color: "#374151" },
  emptySub: {
    fontSize: 14,
    color: "#9ca3af",
    textAlign: "center",
    paddingHorizontal: 40,
  },
  goHomeBtn: {
    marginTop: 12,
    backgroundColor: "#16a34a",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
  },
  goHomeBtnText: { color: "#ffffff", fontSize: 14, fontWeight: "700" },
});
