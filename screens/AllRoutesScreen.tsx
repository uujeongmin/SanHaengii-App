import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useEffect, useState } from "react";
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
import type { RootStackParamList } from "../App";
import { apiService, Mountain } from "../data/api";

type AllRoutesNavProp = NativeStackNavigationProp<
  RootStackParamList,
  "AllRoutes"
>;

const MOUNTAIN_GRADIENT_COLORS = ["#10b981", "#0ea5e9", "#8b5cf6", "#f59e0b"];

export default function AllRoutesScreen() {
  const navigation = useNavigation<AllRoutesNavProp>();
  const [mountains, setMountains] = useState<Mountain[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchMountains();
  }, []);

  async function fetchMountains() {
    try {
      setLoading(true);
      const data = await apiService.getMountains();
      setMountains(data);
    } catch (error) {
      console.error("Failed to fetch mountains:", error);
    } finally {
      setLoading(false);
    }
  }

  const filteredMountains = mountains.filter(
    (m) =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.region.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.description.toLowerCase().includes(searchQuery.toLowerCase()),
  );

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
          <Text style={styles.headerTitle}>산 선택</Text>
          <Text style={styles.headerSub}>
            {mountains.length}개 산 · 전체 코스 보기
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* ── 검색바 ── */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#9ca3af" />
          <TextInput
            style={styles.searchInput}
            placeholder="산 이름, 지역, 설명 검색"
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
        ) : filteredMountains.length > 0 ? (
          filteredMountains.map((mountain, idx) => (
            <TouchableOpacity
              key={mountain.id}
              style={styles.card}
              onPress={() =>
                navigation.navigate("MountainCourses", {
                  mountainId: mountain.id,
                })
              }
              activeOpacity={0.88}
            >
              {/* 이미지 */}
              <View style={styles.imageWrapper}>
                <Image
                  source={{ uri: mountain.img }}
                  style={styles.image}
                  resizeMode="cover"
                />
                <View style={styles.imageOverlay} />

                {/* 고도 배지 */}
                <View
                  style={[
                    styles.altBadge,
                    {
                      backgroundColor:
                        MOUNTAIN_GRADIENT_COLORS[
                          idx % MOUNTAIN_GRADIENT_COLORS.length
                        ],
                    },
                  ]}
                >
                  <Text style={styles.altBadgeText}>
                    ▲ {mountain.altitude.toLocaleString()}m
                  </Text>
                </View>

                {/* 코스 수 배지 */}
                <View style={styles.courseCountBadge}>
                  <Ionicons
                    name="git-branch-outline"
                    size={12}
                    color="#ffffff"
                  />
                  <Text style={styles.courseCountText}>
                    코스 {mountain.courseCount}개
                  </Text>
                </View>
              </View>

              {/* 내용 */}
              <View style={styles.info}>
                <View style={styles.infoRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.mountainName}>{mountain.name}</Text>
                    <Text style={styles.mountainRegion}>{mountain.region}</Text>
                    <Text style={styles.mountainDesc} numberOfLines={2}>
                      {mountain.description}
                    </Text>
                  </View>
                  <View style={styles.arrowWrap}>
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color="#16a34a"
                    />
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))
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
  headerSub: { fontSize: 12, color: "#9ca3af", marginTop: 2 },

  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
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
    height: 44,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15,
    color: "#111827",
    padding: 0,
  },

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

  imageWrapper: { height: 140, position: "relative" },
  image: { width: "100%", height: "100%" },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.32)",
  },

  altBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
  },
  altBadgeText: { fontSize: 11, fontWeight: "700", color: "#ffffff" },

  courseCountBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  courseCountText: { fontSize: 11, fontWeight: "600", color: "#ffffff" },

  info: { padding: 16 },
  infoRow: { flexDirection: "row", alignItems: "center" },
  mountainName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 2,
  },
  mountainRegion: { fontSize: 12, color: "#9ca3af", marginBottom: 4 },
  mountainDesc: { fontSize: 10, color: "#9ca3af" },

  arrowWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f0fdf4",
    alignItems: "center",
    justifyContent: "center",
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
