import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import {
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RootStackParamList } from '../App';
import { getCourseById, getMountainById } from '../data/mountains';
import { RECENT_HIKING_RECORDS } from './RouteDetailScreen';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const USER = {
  name: '김하늘',
  email: 'haneul.kim@email.com',
  avatar:
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=300',
  level: '중급 등산러',
  joinDate: '2024.03',
  bio: '주말마다 산을 오르는 자연 애호가 🌿',
};

const STATS = [
  { icon: 'triangle-outline' as const, label: '누적 고도', value: '600m', color: '#16a34a', bg: '#f0fdf4' },
  { icon: 'footsteps-outline' as const, label: '총 산행 횟수', value: '24회', color: '#2563eb', bg: '#eff6ff' },
  { icon: 'time-outline' as const, label: '총 산행 시간', value: '86시간', color: '#9333ea', bg: '#faf5ff' },
  { icon: 'flame-outline' as const, label: '소모 칼로리', value: '18,400', color: '#ea580c', bg: '#fff7ed' },
];

const BADGES = [
  { emoji: '🏔️', name: '첫 정상 정복' },
  { emoji: '🌄', name: '일출 산행' },
  { emoji: '🔥', name: '연속 5주 산행' },
  { emoji: '⛰️', name: '고도 500m 돌파' },
];

const MENU_ITEMS = [
  { icon: 'notifications-outline' as const, label: '알림 설정' },
  { icon: 'shield-outline' as const, label: '안전 설정' },
  { icon: 'settings-outline' as const, label: '앱 설정' },
];

const DIFFICULTY_STYLE: Record<string, { bg: string; text: string }> = {
  하: { bg: '#dcfce7', text: '#15803d' },
  중: { bg: '#fef3c7', text: '#b45309' },
  상: { bg: '#fee2e2', text: '#b91c1c' },
};

export default function ProfileScreen() {
  const navigation = useNavigation<Nav>();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header */}
        <View style={styles.headerBg}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginBottom: 16 }}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerRow}>
            <View style={styles.avatarWrap}>
              <Image source={{ uri: USER.avatar }} style={styles.avatar} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.userName}>{USER.name}</Text>
              <View style={styles.levelBadge}>
                <Text style={styles.levelText}>{USER.level}</Text>
              </View>
              <Text style={styles.joinDate}>{USER.joinDate}부터 함께하는 중</Text>
            </View>
          </View>
        </View>

        {/* Bio */}
        <View style={styles.bioCard}>
          <Text style={{ fontSize: 14, color: '#4b5563' }}>{USER.bio}</Text>
          <Text style={{ fontSize: 12, color: '#9ca3af', marginTop: 6 }}>{USER.email}</Text>
        </View>

        {/* Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>나의 산행 기록</Text>
          <View style={styles.statsGrid}>
            {STATS.map((s) => (
              <View key={s.label} style={[styles.statCard, { backgroundColor: s.bg }]}>
                <Ionicons name={s.icon} size={20} color={s.color} />
                <Text style={styles.statValue}>{s.value}</Text>
                <Text style={[styles.statLabel, { color: s.color }]}>{s.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Recent Records */}
        <View style={styles.section}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>최근 산행 기록</Text>
            <Text style={{ fontSize: 12, color: '#9ca3af' }}>{RECENT_HIKING_RECORDS.length}개</Text>
          </View>
          {RECENT_HIKING_RECORDS.map((record) => {
            const course = getCourseById(record.courseId);
            const mountain = course ? getMountainById(course.mountainId) : undefined;
            if (!course || !mountain) return null;
            const diff = DIFFICULTY_STYLE[course.difficulty] ?? DIFFICULTY_STYLE['중'];
            return (
              <TouchableOpacity
                key={record.recordId}
                style={styles.recordCard}
                activeOpacity={0.8}
                onPress={() => navigation.navigate('RouteDetail', { recordId: record.recordId })}
              >
                <Image source={{ uri: course.img }} style={styles.recordImg} />
                <View style={styles.recordInfo}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <Text style={{ fontSize: 12, color: '#16a34a', fontWeight: '600' }}>{mountain.name}</Text>
                    <View style={[styles.diffBadge, { backgroundColor: diff.bg }]}>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: diff.text }}>{course.difficulty}</Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#111827' }} numberOfLines={1}>{course.title}</Text>
                  <Text style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{record.date}</Text>
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                    <View style={styles.metaItem}>
                      <Ionicons name="time-outline" size={12} color="#9ca3af" />
                      <Text style={styles.metaText}>{record.duration}</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Ionicons name="trending-up-outline" size={12} color="#9ca3af" />
                      <Text style={styles.metaText}>{course.elevation}</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Ionicons name="flame-outline" size={12} color="#fb923c" />
                      <Text style={styles.metaText}>{record.calories} kcal</Text>
                    </View>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#d1d5db" style={{ alignSelf: 'center' }} />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Badges */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>획득한 배지</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
            {BADGES.map((b) => (
              <View key={b.name} style={styles.badgeCard}>
                <Text style={{ fontSize: 28 }}>{b.emoji}</Text>
                <Text style={{ fontSize: 11, color: '#374151', fontWeight: '500', textAlign: 'center' }}>{b.name}</Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Menu */}
        <View style={styles.section}>
          <View style={styles.menuCard}>
            {MENU_ITEMS.map((item, i) => (
              <TouchableOpacity
                key={item.label}
                style={[styles.menuRow, i < MENU_ITEMS.length - 1 && { borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }]}
                activeOpacity={0.7}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Ionicons name={item.icon} size={20} color="#6b7280" />
                  <Text style={{ fontSize: 14, color: '#1f2937' }}>{item.label}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Logout */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.logoutBtn} activeOpacity={0.7}>
            <Ionicons name="log-out-outline" size={18} color="#ef4444" />
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#ef4444' }}>로그아웃</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fafb' },
  headerBg: {
    backgroundColor: '#16a34a',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 64,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatarWrap: {
    width: 72, height: 72, borderRadius: 36, overflow: 'hidden',
    borderWidth: 3, borderColor: '#fff',
  },
  avatar: { width: '100%', height: '100%' },
  userName: { fontSize: 22, fontWeight: '700', color: '#fff' },
  levelBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10, paddingVertical: 3, borderRadius: 99,
    alignSelf: 'flex-start', marginTop: 4,
  },
  levelText: { fontSize: 12, color: '#dcfce7' },
  joinDate: { fontSize: 11, color: '#bbf7d0', marginTop: 4 },

  bioCard: {
    backgroundColor: '#fff', marginHorizontal: 24, marginTop: -40,
    borderRadius: 20, padding: 20,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6,
    borderWidth: 1, borderColor: '#f3f4f6',
  },

  section: { paddingHorizontal: 24, marginTop: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: { width: '48%', borderRadius: 18, padding: 16 },
  statValue: { fontSize: 20, fontWeight: '700', color: '#111827', marginTop: 6 },
  statLabel: { fontSize: 11, fontWeight: '600', marginTop: 2 },

  recordCard: {
    backgroundColor: '#fff', borderRadius: 18, overflow: 'hidden',
    flexDirection: 'row', marginBottom: 10,
    borderWidth: 1, borderColor: '#f3f4f6',
    elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4,
  },
  recordImg: { width: 88, height: 88 },
  recordInfo: { flex: 1, padding: 10, justifyContent: 'center' },
  diffBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 99 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { fontSize: 11, color: '#6b7280' },

  badgeCard: {
    backgroundColor: '#fff', borderRadius: 18, padding: 16,
    alignItems: 'center', gap: 8, minWidth: 90,
    borderWidth: 1, borderColor: '#f3f4f6',
    elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4,
  },

  menuCard: {
    backgroundColor: '#fff', borderRadius: 18, overflow: 'hidden',
    borderWidth: 1, borderColor: '#f3f4f6',
  },
  menuRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16,
  },

  logoutBtn: {
    backgroundColor: '#fef2f2', borderRadius: 18,
    paddingVertical: 14, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 8,
  },
});
