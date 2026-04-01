import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList, CourseParams } from '../App';
import {
  getMountainById,
  getCoursesByMountain,
  type MountainCourse,
} from '../data/mountains';

type MountainCoursesNavProp = NativeStackNavigationProp<RootStackParamList, 'MountainCourses'>;
type MountainCoursesRouteProp = RouteProp<RootStackParamList, 'MountainCourses'>;

const DIFFICULTY_COLOR: Record<MountainCourse['difficulty'], { bg: string; text: string }> = {
  하: { bg: '#dcfce7', text: '#15803d' },
  중: { bg: '#fef3c7', text: '#b45309' },
  상: { bg: '#fee2e2', text: '#b91c1c' },
};

export default function MountainCoursesScreen() {
  const navigation = useNavigation<MountainCoursesNavProp>();
  const route = useRoute<MountainCoursesRouteProp>();
  const { mountainId } = route.params;

  const mountain = getMountainById(mountainId);
  const courses = getCoursesByMountain(mountainId);

  function handleStartCourse(course: MountainCourse) {
    const params: CourseParams = {
      courseId: course.id,
      courseName: course.title,
      mountainName: mountain?.name ?? '',
      difficulty: course.difficulty,
      distance: course.distance,
      time: course.time,
      elevation: course.elevation,
    };
    // MainTabs → 내비게이션 탭으로 이동하며 코스 파라미터 전달
    navigation.navigate('MainTabs', { screen: '내비게이션', params });
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
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
          <Text style={styles.headerTitle}>{mountain?.name ?? '코스 목록'}</Text>
          <Text style={styles.headerSub}>
            {mountain?.region} · ▲{mountain?.altitude.toLocaleString()}m · {courses.length}개 코스
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {courses.map((course, idx) => {
          const diff = DIFFICULTY_COLOR[course.difficulty];
          return (
            <View
              key={course.id}
              style={[styles.card, idx === courses.length - 1 && { marginBottom: 0 }]}
            >
              {/* 이미지 */}
              <View style={styles.imageWrapper}>
                <Image source={{ uri: course.img }} style={styles.image} resizeMode="cover" />
                <View style={styles.imageOverlay} />

                {/* 난이도 배지 */}
                <View style={[styles.diffBadge, { backgroundColor: diff.bg }]}>
                  <Text style={[styles.diffText, { color: diff.text }]}>
                    난이도 {course.difficulty}
                  </Text>
                </View>

                {/* 태그 */}
                <View style={styles.tagsRow}>
                  {course.tags.map((tag) => (
                    <View key={tag} style={styles.tagBadge}>
                      <Text style={styles.tagText}>{tag}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* 내용 */}
              <View style={styles.info}>
                <Text style={styles.title}>{course.title}</Text>
                <Text style={styles.startPoint} numberOfLines={1}>📍 {course.startPoint}</Text>
                <Text style={styles.desc} numberOfLines={2}>{course.desc}</Text>

                {/* 하이라이트 */}
                <View style={styles.highlightsRow}>
                  {course.highlights.map((h, i) => (
                    <React.Fragment key={h}>
                      <Text style={styles.highlightItem}>{h}</Text>
                      {i < course.highlights.length - 1 && (
                        <Text style={styles.highlightArrow}>→</Text>
                      )}
                    </React.Fragment>
                  ))}
                </View>

                {/* 메타 정보 */}
                <View style={styles.metaRow}>
                  <View style={styles.metaItem}>
                    <Ionicons name="location-outline" size={14} color="#9ca3af" />
                    <Text style={styles.metaText}>{course.distance}</Text>
                  </View>
                  <View style={styles.metaDivider} />
                  <View style={styles.metaItem}>
                    <Ionicons name="time-outline" size={14} color="#9ca3af" />
                    <Text style={styles.metaText}>{course.time}</Text>
                  </View>
                  <View style={styles.metaDivider} />
                  <View style={styles.metaItem}>
                    <Ionicons name="trending-up-outline" size={14} color="#9ca3af" />
                    <Text style={styles.metaText}>{course.elevation}</Text>
                  </View>
                </View>

                {/* 시작 버튼 */}
                <TouchableOpacity
                  style={styles.startBtn}
                  onPress={() => handleStartCourse(course)}
                  activeOpacity={0.85}
                >
                  <Ionicons name="navigate" size={16} color="#ffffff" />
                  <Text style={styles.startBtnText}>이 코스로 시작하기</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f9fafb' },

  /* 헤더 */
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#f3f4f6',
    alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  headerSub: { fontSize: 11, color: '#9ca3af', marginTop: 2 },

  /* 스크롤 */
  scrollView: { flex: 1 },
  scrollContent: { padding: 20, gap: 20, paddingBottom: 40 },

  /* 카드 */
  card: {
    backgroundColor: '#ffffff', borderRadius: 24, overflow: 'hidden',
    elevation: 3, shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8,
    borderWidth: 1, borderColor: '#f3f4f6',
  },

  /* 이미지 */
  imageWrapper: { height: 180, position: 'relative' },
  image: { width: '100%', height: '100%' },
  imageOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.38)' },
  diffBadge: {
    position: 'absolute', top: 14, left: 14,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99,
  },
  diffText: { fontSize: 12, fontWeight: '700' },
  tagsRow: {
    position: 'absolute', bottom: 14, left: 14, right: 14,
    flexDirection: 'row', flexWrap: 'wrap', gap: 6,
  },
  tagBadge: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 9, paddingVertical: 4, borderRadius: 99,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)',
  },
  tagText: { fontSize: 11, color: '#ffffff', fontWeight: '500' },

  /* 내용 */
  info: { padding: 20 },
  title: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 2, letterSpacing: -0.3 },
  startPoint: { fontSize: 12, color: '#9ca3af', marginBottom: 6 },
  desc: { fontSize: 13, color: '#6b7280', lineHeight: 20, marginBottom: 12 },

  /* 하이라이트 */
  highlightsRow: {
    flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center',
    backgroundColor: '#f0fdf4', borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 8, marginBottom: 14,
    gap: 4,
  },
  highlightItem: { fontSize: 12, fontWeight: '600', color: '#15803d' },
  highlightArrow: { fontSize: 11, color: '#86efac' },

  /* 메타 */
  metaRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f9fafb', borderRadius: 14,
    paddingVertical: 10, paddingHorizontal: 14,
    marginBottom: 16, borderWidth: 1, borderColor: '#f3f4f6',
  },
  metaItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4, justifyContent: 'center' },
  metaText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  metaDivider: { width: 1, height: 14, backgroundColor: '#e5e7eb' },

  /* 시작 버튼 */
  startBtn: {
    backgroundColor: '#16a34a', borderRadius: 14, paddingVertical: 13,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  startBtnText: { fontSize: 15, fontWeight: '700', color: '#ffffff' },
});
