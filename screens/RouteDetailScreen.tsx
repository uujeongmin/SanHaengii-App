import { Ionicons } from '@expo/vector-icons';
import type { RouteProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
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
import Svg, { Circle, Defs, LinearGradient, Polygon, Polyline, Stop } from 'react-native-svg';
import type { RootStackParamList } from '../App';
import { getCourseById, getMountainById } from '../data/mountains';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'RouteDetail'>;

// ── 최근 산행 기록 Mock 데이터 (ProfileScreen에서도 사용) ──
export const RECENT_HIKING_RECORDS = [
  {
    recordId: 'rec-1',
    courseId: 'bukhansan-baegundae',
    date: '2026.03.29',
    duration: '2시간 41분',
    calories: 820,
    heartRateAvg: 132,
    photos: [
      'https://images.unsplash.com/photo-1704961254037-bb105fe556bf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
      'https://images.unsplash.com/photo-1625855191300-7df3075f07f3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
    ],
    memo: '날씨가 맑아서 백운대 정상에서 서울 시내가 한눈에 보였다. 체력도 좋았고 컨디션 최고!',
    achievedBadge: '첫 정상 정복',
  },
  {
    recordId: 'rec-2',
    courseId: 'bukhansan-dulegil',
    date: '2026.03.22',
    duration: '2시간 15분',
    calories: 560,
    heartRateAvg: 105,
    photos: [
      'https://images.unsplash.com/photo-1583853168794-485e809166d7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
    ],
    memo: '봄 햇살을 맞으며 가볍게 걷기 좋은 코스. 벚꽃이 피기 시작했다.',
    achievedBadge: null,
  },
  {
    recordId: 'rec-3',
    courseId: 'hallasan-yeongsil',
    date: '2026.03.08',
    duration: '1시간 48분',
    calories: 710,
    heartRateAvg: 128,
    photos: [
      'https://images.unsplash.com/photo-1633437933765-67f9b9b7d244?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
      'https://images.unsplash.com/photo-1698302111883-3b20f11c6f34?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
    ],
    memo: '제주 여행 중 한라산 영실 코스 도전. 병풍바위가 압도적이었다!',
    achievedBadge: '고도 500m 돌파',
  },
];

const SCREEN_W = Dimensions.get('window').width;

/* ── 고도 프로파일 차트 ── */
function ElevationChart({ data }: { data: number[] }) {
  const W = SCREEN_W - 80;
  const H = 70;
  const padX = 10;
  const padY = 10;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const pts = data.map((v, i) => {
    const x = padX + (i / (data.length - 1)) * (W - padX * 2);
    const y = H - padY - ((v - min) / range) * (H - padY * 2);
    return `${x},${y}`;
  });

  const firstX = padX;
  const lastX = W - padX;
  const fillPts = `${firstX},${H - padY} ${pts.join(' ')} ${lastX},${H - padY}`;

  return (
    <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <Defs>
        <LinearGradient id="eg" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#22c55e" stopOpacity={0.4} />
          <Stop offset="100%" stopColor="#22c55e" stopOpacity={0.05} />
        </LinearGradient>
      </Defs>
      <Polygon points={fillPts} fill="url(#eg)" />
      <Polyline points={pts.join(' ')} fill="none" stroke="#22c55e" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      {[0, data.length - 1].map((i) => {
        const x = padX + (i / (data.length - 1)) * (W - padX * 2);
        const y = H - padY - ((data[i] - min) / range) * (H - padY * 2);
        return <Circle key={i} cx={x} cy={y} r={4} fill="#22c55e" />;
      })}
    </Svg>
  );
}

export default function RouteDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { recordId } = route.params;

  const record = RECENT_HIKING_RECORDS.find((r) => r.recordId === recordId);
  const course = record ? getCourseById(record.courseId) : undefined;
  const mountain = course ? getMountainById(course.mountainId) : undefined;

  if (!record || !course || !mountain) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 16, color: '#9ca3af' }}>기록을 찾을 수 없습니다.</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 16 }}>
            <Text style={{ fontSize: 14, color: '#16a34a', fontWeight: '600' }}>돌아가기</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const statCards = [
    { icon: 'time-outline' as const, value: record.duration, label: '산행 시간', color: '#3b82f6' },
    { icon: 'flame-outline' as const, value: `${record.calories.toLocaleString()} kcal`, label: '소모 칼로리', color: '#f97316' },
    { icon: 'heart-outline' as const, value: `${record.heartRateAvg} bpm`, label: '평균 심박수', color: '#f43f5e' },
    { icon: 'trending-up-outline' as const, value: course.elevation, label: '누적 고도', color: '#22c55e' },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color="#1f2937" />
          </TouchableOpacity>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontWeight: '700', color: '#111827' }}>산행 기록 상세</Text>
            <Text style={{ fontSize: 11, color: '#9ca3af' }}>{record.date}</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* Banner */}
        <View style={styles.banner}>
          <Image source={{ uri: course.img }} style={StyleSheet.absoluteFillObject} />
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.45)' }]} />
          <View style={styles.bannerContent}>
            <View style={styles.mountainBadge}>
              <Text style={{ fontSize: 12, color: '#fff' }}>{mountain.name}</Text>
            </View>
            <Text style={styles.bannerTitle}>{course.title}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
              <Ionicons name="calendar-outline" size={12} color="rgba(255,255,255,0.7)" />
              <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>{record.date} 완주</Text>
            </View>
          </View>
        </View>

        {/* Badge */}
        {record.achievedBadge && (
          <View style={styles.achieveBadge}>
            <Text style={{ fontSize: 24 }}>🏆</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, color: '#d97706', fontWeight: '500' }}>이 산행에서 배지 획득!</Text>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#92400e' }}>{record.achievedBadge}</Text>
            </View>
          </View>
        )}

        {/* Stats */}
        <View style={styles.statsGrid}>
          {statCards.map((s) => (
            <View key={s.label} style={styles.statCard}>
              <Ionicons name={s.icon} size={18} color={s.color} />
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={[styles.statLabel, { color: s.color }]}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Course Info */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>코스 정보</Text>
          <View style={{ flexDirection: 'row', gap: 16, marginBottom: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="location-outline" size={15} color="#9ca3af" />
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#4b5563' }}>{course.distance}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="time-outline" size={15} color="#9ca3af" />
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#4b5563' }}>예상 {course.time}</Text>
            </View>
          </View>
          <Text style={{ fontSize: 12, color: '#16a34a', fontWeight: '500', marginBottom: 10 }}>📍 출발: {course.startPoint}</Text>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
            {course.highlights.map((h) => (
              <View key={h} style={styles.highlightBadge}>
                <Text style={{ fontSize: 11, color: '#15803d' }}>✓ {h}</Text>
              </View>
            ))}
          </View>

          {/* Elevation chart */}
          <View style={styles.chartBox}>
            <Text style={{ fontSize: 11, color: '#6b7280', fontWeight: '500', marginBottom: 6 }}>고도 프로파일</Text>
            <ElevationChart data={course.elevationProfile} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
              <Text style={{ fontSize: 10, color: '#9ca3af' }}>출발 ({course.elevationProfile[0]}m)</Text>
              <Text style={{ fontSize: 10, color: '#9ca3af' }}>최고 ({Math.max(...course.elevationProfile)}m)</Text>
            </View>
          </View>
        </View>

        {/* Memo */}
        {record.memo ? (
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>산행 메모</Text>
            <Text style={{ fontSize: 14, color: '#4b5563', lineHeight: 22 }}>"{record.memo}"</Text>
          </View>
        ) : null}

        {/* Photos */}
        {record.photos.length > 0 && (
          <View style={styles.infoCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
              <Ionicons name="camera-outline" size={16} color="#22c55e" />
              <Text style={styles.infoTitle}>포토 기록</Text>
              <Text style={{ fontSize: 11, color: '#9ca3af', marginLeft: 'auto' }}>{record.photos.length}장</Text>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {record.photos.map((photo, i) => (
                <Image
                  key={i}
                  source={{ uri: photo }}
                  style={{ width: (SCREEN_W - 80) / 2, height: (SCREEN_W - 80) / 2, borderRadius: 14 }}
                />
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fafb' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center',
  },

  banner: { height: 200, position: 'relative', justifyContent: 'flex-end' },
  bannerContent: { padding: 20 },
  mountainBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10, paddingVertical: 3, borderRadius: 99,
    alignSelf: 'flex-start', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  bannerTitle: { fontSize: 20, fontWeight: '800', color: '#fff', marginTop: 6 },

  achieveBadge: {
    marginHorizontal: 16, marginTop: 16,
    backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fde68a',
    borderRadius: 18, padding: 16,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },

  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10,
    marginHorizontal: 16, marginTop: 16,
  },
  statCard: {
    width: '48%', backgroundColor: '#fff', borderRadius: 18, padding: 16,
    borderWidth: 1, borderColor: '#f3f4f6',
  },
  statValue: { fontSize: 18, fontWeight: '700', color: '#111827', marginTop: 6 },
  statLabel: { fontSize: 11, fontWeight: '600', marginTop: 2 },

  infoCard: {
    marginHorizontal: 16, marginTop: 16,
    backgroundColor: '#fff', borderRadius: 18, padding: 20,
    borderWidth: 1, borderColor: '#f3f4f6',
  },
  infoTitle: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 12 },

  highlightBadge: {
    backgroundColor: '#f0fdf4', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 99, borderWidth: 1, borderColor: '#dcfce7',
  },

  chartBox: {
    backgroundColor: '#f9fafb', borderRadius: 14, padding: 12,
    borderWidth: 1, borderColor: '#f3f4f6',
  },
});
