import { Ionicons } from '@expo/vector-icons';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { CompositeNavigationProp } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import {
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { CourseParams, RootStackParamList, RootTabParamList } from '../App';
import { MOUNTAINS, getCoursesByMountain, type MountainCourse } from '../data/mountains';

type HomeNavProp = CompositeNavigationProp<
  BottomTabNavigationProp<RootTabParamList, '홈'>,
  NativeStackNavigationProp<RootStackParamList>
>;

const SCREEN_WIDTH = Dimensions.get('window').width;
const MOUNTAIN_CARD_W = 148;
const COURSE_CARD_W = SCREEN_WIDTH - 64;

const DIFFICULTY_COLOR: Record<MountainCourse['difficulty'], { bg: string; text: string }> = {
  하: { bg: '#dcfce7', text: '#15803d' },
  중: { bg: '#fef3c7', text: '#b45309' },
  상: { bg: '#fee2e2', text: '#b91c1c' },
};

const MOUNTAIN_GRADIENT_COLORS = [
  '#10b981', // emerald
  '#0ea5e9', // sky
  '#8b5cf6', // violet
  '#f59e0b', // amber
];

export default function HomeScreen() {
  const navigation = useNavigation<HomeNavProp>();
  const [selectedMountainId, setSelectedMountainId] = useState<string | null>(null);

  const selectedMountain = MOUNTAINS.find((m) => m.id === selectedMountainId) ?? null;
  const courses = selectedMountainId ? getCoursesByMountain(selectedMountainId) : [];

  function handleStartCourse(course: MountainCourse) {
    const params: CourseParams = {
      courseId: course.id,
      courseName: course.title,
      mountainName: selectedMountain?.name ?? '',
      difficulty: course.difficulty,
      distance: course.distance,
      time: course.time,
      elevation: course.elevation,
    };
    navigation.navigate('내비게이션', params);
  }

  function handleToggleMountain(mountainId: string) {
    setSelectedMountainId((prev) => (prev === mountainId ? null : mountainId));
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ── 헤더 ── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>좋은 아침입니다!</Text>
            <Text style={styles.subGreeting}>김하늘님의 산행을 계획해 볼까요?</Text>
          </View>
          <TouchableOpacity
            style={styles.profileWrapper}
            onPress={() => navigation.navigate('Profile')}
            activeOpacity={0.8}
          >
            <Image
              source={{
                uri: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=150',
              }}
              style={styles.profileImage}
            />
          </TouchableOpacity>
        </View>

        {/* ── 스마트워치 동기화 ── */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.row}>
              <Ionicons name="watch-outline" size={20} color="#22c55e" />
              <Text style={styles.cardHeaderTitle}>스마트워치 동기화 중</Text>
            </View>
            <View style={styles.pingDot} />
          </View>

          <View style={styles.metricsRow}>
            <View style={[styles.metricChip, { backgroundColor: '#fff1f2' }]}>
              <Ionicons name="heart" size={22} color="#f43f5e" />
              <Text style={styles.metricValue}>
                72<Text style={styles.metricUnit}> bpm</Text>
              </Text>
              <Text style={[styles.metricLabel, { color: '#e11d48' }]}>안정적인 심박수</Text>
            </View>
            <View style={[styles.metricChip, { backgroundColor: '#eff6ff' }]}>
              <Ionicons name="pulse" size={22} color="#3b82f6" />
              <Text style={styles.metricValue}>
                98<Text style={styles.metricUnit}> %</Text>
              </Text>
              <Text style={[styles.metricLabel, { color: '#2563eb' }]}>산소포화도 정상</Text>
            </View>
          </View>

          <View style={styles.cardFooter}>
            <Text style={styles.cardFooterText}>
              이 신체 데이터를 반영하여 맞춤 경로를 추천합니다.
            </Text>
          </View>
        </View>

        {/* ──────────────────────────────────────────
            산 선택 섹션
        ────────────────────────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>산 선택</Text>
          <TouchableOpacity
            style={styles.row}
            onPress={() => navigation.navigate('AllRoutes')}
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
          {MOUNTAINS.map((mountain, idx) => {
            const isSelected = selectedMountainId === mountain.id;
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
                {/* 배경 이미지 */}
                <Image
                  source={{ uri: mountain.img }}
                  style={styles.mountainCardImage}
                  resizeMode="cover"
                />
                <View style={styles.mountainCardOverlay} />

                {/* 선택 체크 */}
                {isSelected && (
                  <View style={styles.mountainCheckBadge}>
                    <Ionicons name="checkmark" size={13} color="#ffffff" />
                  </View>
                )}

                {/* 고도 배지 */}
                <View style={[styles.altBadge, { backgroundColor: MOUNTAIN_GRADIENT_COLORS[idx] }]}>
                  <Text style={styles.altBadgeText}>▲ {mountain.altitude.toLocaleString()}m</Text>
                </View>

                {/* 하단 정보 */}
                <View style={styles.mountainCardBottom}>
                  <Text style={styles.mountainCardName}>{mountain.name}</Text>
                  <View style={styles.row}>
                    <Ionicons name="git-branch-outline" size={10} color="rgba(255,255,255,0.7)" />
                    <Text style={styles.mountainCardSub}>코스 {mountain.courseCount}개</Text>
                    <Ionicons
                      name={isSelected ? 'chevron-up' : 'chevron-down'}
                      size={10}
                      color="rgba(255,255,255,0.7)"
                      style={{ marginLeft: 'auto' }}
                    />
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ── 선택된 산의 코스 목록 ── */}
        {selectedMountain && courses.length > 0 && (
          <View style={styles.coursesSection}>
            {/* 소제목 */}
            <View style={styles.coursesSectionHeader}>
              <View style={styles.sectionAccent} />
              <Text style={styles.coursesSectionTitle}>{selectedMountain.name} 등산 코스</Text>
              <View style={styles.coursesCountBadge}>
                <Text style={styles.coursesCountText}>{courses.length}개</Text>
              </View>
            </View>

            {/* 코스 카드 수평 스크롤 */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.courseList}
              snapToInterval={COURSE_CARD_W + 16}
              decelerationRate="fast"
            >
              {courses.map((course) => {
                const diff = DIFFICULTY_COLOR[course.difficulty];
                return (
                  <View key={course.id} style={styles.courseCard}>
                    {/* 이미지 */}
                    <View style={styles.courseImageWrapper}>
                      <Image
                        source={{ uri: course.img }}
                        style={styles.courseImage}
                        resizeMode="cover"
                      />
                      <View style={styles.courseImageOverlay} />

                      {/* 난이도 */}
                      <View style={[styles.diffBadge, { backgroundColor: diff.bg }]}>
                        <Text style={[styles.diffText, { color: diff.text }]}>
                          난이도 {course.difficulty}
                        </Text>
                      </View>

                      {/* 태그 */}
                      <View style={styles.tagsRow}>
                        {course.tags.slice(0, 2).map((tag) => (
                          <View key={tag} style={styles.tagBadge}>
                            <Text style={styles.tagText}>{tag}</Text>
                          </View>
                        ))}
                      </View>
                    </View>

                    {/* 내용 */}
                    <View style={styles.courseInfo}>
                      <Text style={styles.courseTitle} numberOfLines={1}>{course.title}</Text>
                      <Text style={styles.courseStart} numberOfLines={1}>
                        📍 {course.startPoint}
                      </Text>

                      {/* 메타 */}
                      <View style={styles.courseMetaRow}>
                        <View style={styles.courseMetaItem}>
                          <Ionicons name="location-outline" size={13} color="#9ca3af" />
                          <Text style={styles.courseMetaText}>{course.distance}</Text>
                        </View>
                        <View style={styles.courseMetaDivider} />
                        <View style={styles.courseMetaItem}>
                          <Ionicons name="time-outline" size={13} color="#9ca3af" />
                          <Text style={styles.courseMetaText}>{course.time}</Text>
                        </View>
                        <View style={styles.courseMetaDivider} />
                        <View style={styles.courseMetaItem}>
                          <Ionicons name="trending-up-outline" size={13} color="#9ca3af" />
                          <Text style={styles.courseMetaText}>{course.elevation}</Text>
                        </View>
                      </View>

                      {/* 시작 버튼 */}
                      <TouchableOpacity
                        style={styles.startBtn}
                        onPress={() => handleStartCourse(course)}
                        activeOpacity={0.85}
                      >
                        <Ionicons name="navigate" size={15} color="#ffffff" />
                        <Text style={styles.startBtnText}>이 코스로 시작하기</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* 선택 안내 (기본 상태) */}
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
  safeArea: { flex: 1, backgroundColor: '#f9fafb' },
  container: { flex: 1 },
  scrollContent: { paddingBottom: 48 },

  /* 헤더 */
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  greeting: { fontSize: 24, fontWeight: '700', color: '#111827', letterSpacing: -0.5 },
  subGreeting: { fontSize: 14, color: '#6b7280', marginTop: 4 },
  profileWrapper: {
    width: 48, height: 48, borderRadius: 24, overflow: 'hidden',
    borderWidth: 2, borderColor: '#ffffff',
    elevation: 3, shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3,
  },
  profileImage: { width: 48, height: 48 },

  /* 스마트워치 카드 */
  card: {
    backgroundColor: '#ffffff', borderRadius: 24, padding: 20,
    marginHorizontal: 24, marginTop: 16,
    elevation: 2, shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8,
    borderWidth: 1, borderColor: '#f3f4f6',
  },
  cardHeaderRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 16,
  },
  cardHeaderTitle: { fontSize: 14, fontWeight: '600', color: '#1f2937', marginLeft: 8 },
  pingDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#22c55e' },
  cardFooter: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  cardFooterText: { fontSize: 12, color: '#6b7280' },
  metricsRow: { flexDirection: 'row', gap: 12 },
  metricChip: { flex: 1, borderRadius: 16, padding: 16 },
  metricValue: { fontSize: 24, fontWeight: '700', color: '#111827', marginTop: 8 },
  metricUnit: { fontSize: 14, fontWeight: '500', color: '#6b7280' },
  metricLabel: { fontSize: 12, fontWeight: '500', marginTop: 2 },

  /* 섹션 헤더 */
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24, marginTop: 28, marginBottom: 14,
  },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
  seeAllText: { fontSize: 14, color: '#16a34a', fontWeight: '500' },

  /* 산 카드 */
  mountainList: { paddingHorizontal: 24, paddingBottom: 4, gap: 12 },
  mountainCard: {
    width: MOUNTAIN_CARD_W,
    height: 110,
    borderRadius: 18,
    overflow: 'hidden',
    position: 'relative',
  },
  mountainCardSelected: {
    borderWidth: 2.5,
    borderColor: '#16a34a',
  },
  mountainCardImage: { ...StyleSheet.absoluteFillObject as any },
  mountainCardOverlay: {
    ...StyleSheet.absoluteFillObject as any,
    backgroundColor: 'rgba(0,0,0,0.38)',
  },
  mountainCheckBadge: {
    position: 'absolute', top: 8, right: 8,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: '#16a34a',
    alignItems: 'center', justifyContent: 'center',
    zIndex: 10,
  },
  altBadge: {
    position: 'absolute', top: 8, left: 8,
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 99,
  },
  altBadgeText: { fontSize: 10, fontWeight: '700', color: '#ffffff' },
  mountainCardBottom: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 10,
  },
  mountainCardName: {
    fontSize: 14, fontWeight: '800', color: '#ffffff',
    textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2,
  },
  mountainCardSub: { fontSize: 10, color: 'rgba(255,255,255,0.7)', marginLeft: 3 },

  /* 코스 섹션 */
  coursesSection: { marginTop: 20 },
  coursesSectionHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 24, marginBottom: 14, gap: 8,
  },
  sectionAccent: { width: 4, height: 20, backgroundColor: '#16a34a', borderRadius: 2 },
  coursesSectionTitle: { fontSize: 15, fontWeight: '700', color: '#1f2937' },
  coursesCountBadge: {
    backgroundColor: '#f3f4f6', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99,
  },
  coursesCountText: { fontSize: 11, color: '#6b7280', fontWeight: '600' },

  /* 코스 카드 */
  courseList: { paddingHorizontal: 24, paddingBottom: 4, gap: 16 },
  courseCard: {
    width: COURSE_CARD_W,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8,
    borderWidth: 1, borderColor: '#f3f4f6',
  },
  courseImageWrapper: { height: 148, position: 'relative' },
  courseImage: { width: '100%', height: '100%' },
  courseImageOverlay: {
    ...StyleSheet.absoluteFillObject as any,
    backgroundColor: 'rgba(0,0,0,0.42)',
  },
  diffBadge: {
    position: 'absolute', top: 12, left: 12,
    paddingHorizontal: 10, paddingVertical: 3, borderRadius: 99,
  },
  diffText: { fontSize: 11, fontWeight: '700' },
  tagsRow: {
    position: 'absolute', bottom: 12, left: 12, right: 12,
    flexDirection: 'row', flexWrap: 'wrap', gap: 5,
  },
  tagBadge: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  tagText: { fontSize: 10, color: '#ffffff', fontWeight: '500' },

  courseInfo: { padding: 16 },
  courseTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 3 },
  courseStart: { fontSize: 12, color: '#9ca3af', marginBottom: 10 },
  courseMetaRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f9fafb', borderRadius: 12,
    paddingVertical: 8, paddingHorizontal: 12,
    marginBottom: 12, borderWidth: 1, borderColor: '#f3f4f6',
  },
  courseMetaItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  courseMetaText: { fontSize: 12, fontWeight: '600', color: '#374151' },
  courseMetaDivider: { width: 1, height: 12, backgroundColor: '#e5e7eb' },

  startBtn: {
    backgroundColor: '#16a34a', borderRadius: 14,
    paddingVertical: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  startBtnText: { fontSize: 14, fontWeight: '700', color: '#ffffff' },

  /* 빈 상태 */
  emptyState: {
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 32, gap: 6,
  },
  emptyIconWrap: {
    width: 56, height: 56, borderRadius: 16,
    backgroundColor: '#f0fdf4',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
  },
  emptyText: { fontSize: 14, color: '#9ca3af' },

  /* 공통 */
  row: { flexDirection: 'row', alignItems: 'center' },
});
