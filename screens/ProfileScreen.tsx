import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { RootStackParamList } from '../App';
import {
  getUserDisplayName,
  getUserInitial,
  useAuth,
} from '../contexts/AuthContext';
import {
  apiService,
  type Badge,
  type HikingRecord,
  type UserBadge,
} from '../data/api';
import {
  createBadgeStats,
  getBadgeProgress,
  getEarnedBadgeIds,
} from '../data/badges';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const MENU_ITEMS = [
  { icon: 'cloud-download-outline' as const, label: '저장된 지도', screen: 'SavedMaps' },
  { icon: 'notifications-outline' as const, label: '알림 설정' },
  { icon: 'shield-outline' as const, label: '안전 설정' },
  { icon: 'settings-outline' as const, label: '앱 설정' },
];

function safeNumber(value: number | null | undefined) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function estimateCalories(record: HikingRecord) {
  const distance = safeNumber(record.distanceKm);
  const duration = safeNumber(record.durationMinutes);
  const elevation = safeNumber(record.elevationGainM);
  const heartRate = safeNumber(record.avgHeartRate);
  return Math.round(
    distance * 55 + duration * 4.5 + elevation * 0.35 + Math.max(0, heartRate - 100) * 1.2,
  );
}

function formatDuration(minutes: number) {
  const rounded = Math.round(minutes);
  const hours = Math.floor(rounded / 60);
  const mins = rounded % 60;
  if (hours <= 0) return `${mins}분`;
  if (mins === 0) return `${hours}시간`;
  return `${hours}시간 ${mins}분`;
}

function formatShortDate(value: string | null) {
  if (!value) return '날짜 없음';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '날짜 없음';
  return date.toLocaleDateString('ko-KR', {
    month: 'short',
    day: 'numeric',
  });
}

export default function ProfileScreen() {
  const navigation = useNavigation<Nav>();
  const { isGuest, signOut, token, user } = useAuth();
  const [records, setRecords] = useState<HikingRecord[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [userBadges, setUserBadges] = useState<UserBadge[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const displayName = getUserDisplayName(user);
  const userInitial = getUserInitial(user);
  const email = isGuest
    ? '게스트 모드로 이용 중'
    : user?.email ?? '카카오 계정으로 로그인됨';
  const guardianNumber = user?.guardianNumber ?? '등록된 보호자 번호가 없습니다.';

  const loadProfile = useCallback(
    async (asRefresh = false) => {
      try {
        if (asRefresh) setRefreshing(true);
        else setLoading(true);
        setErrorMessage(null);

        if (!user || isGuest) {
          const nextBadges = await apiService.getBadges(token);
          setRecords([]);
          setBadges(nextBadges);
          setUserBadges([]);
          return;
        }

        const [nextRecords, nextBadges, nextUserBadges] = await Promise.all([
          apiService.getHikingRecords(user.id, token),
          apiService.getBadges(token),
          apiService.getUserBadges(user.id, token),
        ]);
        const nextStats = createBadgeStats(nextRecords);
        const existingBadgeIds = new Set(
          nextUserBadges.map((badge) => badge.badgeId),
        );
        const missingBadgeIds = nextBadges
          .filter((badge) => getBadgeProgress(badge, nextStats).isEligible)
          .map((badge) => badge.id)
          .filter((badgeId) => !existingBadgeIds.has(badgeId));
        const createdUserBadges = await Promise.allSettled(
          missingBadgeIds.map((badgeId) =>
            apiService.createUserBadge(user.id, badgeId, token),
          ),
        );
        const syncedUserBadges = [
          ...createdUserBadges
            .filter((result) => result.status === 'fulfilled')
            .map((result) => result.value),
          ...nextUserBadges,
        ];

        setRecords(nextRecords);
        setBadges(nextBadges);
        setUserBadges(syncedUserBadges);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : '산행 기록을 불러오지 못했습니다.';
        setErrorMessage(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [isGuest, token, user],
  );

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile]),
  );

  const stats = useMemo(() => createBadgeStats(records), [records]);
  const earnedBadgeIds = useMemo(
    () => getEarnedBadgeIds(badges, userBadges, stats),
    [badges, stats, userBadges],
  );
  const earnedBadges = badges.filter((badge) => earnedBadgeIds.has(badge.id));
  const lockedBadges = badges.filter((badge) => !earnedBadgeIds.has(badge.id));

  const statCards = [
    {
      icon: 'triangle-outline' as const,
      label: '누적 고도',
      value: `${Math.round(stats.totalElevationM).toLocaleString()}m`,
      color: '#16a34a',
      bg: '#f0fdf4',
    },
    {
      icon: 'footsteps-outline' as const,
      label: '총 산행 횟수',
      value: `${stats.recordCount}회`,
      color: '#2563eb',
      bg: '#eff6ff',
    },
    {
      icon: 'time-outline' as const,
      label: '총 산행 시간',
      value: formatDuration(stats.totalDurationMinutes),
      color: '#9333ea',
      bg: '#faf5ff',
    },
    {
      icon: 'flame-outline' as const,
      label: '소모 칼로리',
      value: Math.round(stats.totalCalories).toLocaleString(),
      color: '#ea580c',
      bg: '#fff7ed',
    },
  ];

  function handleSignOut() {
    Alert.alert('로그아웃', '현재 계정에서 로그아웃할까요?', [
      { text: '취소', style: 'cancel' },
      { text: '로그아웃', style: 'destructive', onPress: signOut },
    ]);
  }

  function renderRecord(record: HikingRecord) {
    const calories = safeNumber(record.calories ?? estimateCalories(record));
    const elevation = safeNumber(record.elevationGainM);

    return (
      <View key={record.id} style={styles.recordCard}>
        <View style={styles.recordDateBox}>
          <Text style={styles.recordDate}>{formatShortDate(record.createdAt)}</Text>
        </View>
        <View style={styles.recordInfo}>
          <Text style={styles.recordMountain} numberOfLines={1}>
            {record.mountainName || '이름 없는 산행'}
          </Text>
          <Text style={styles.recordCourse} numberOfLines={1}>
            {record.courseName || '코스 정보 없음'}
          </Text>
          <View style={styles.recordMetaRow}>
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={12} color="#9ca3af" />
              <Text style={styles.metaText}>{formatDuration(safeNumber(record.durationMinutes))}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="location-outline" size={12} color="#9ca3af" />
              <Text style={styles.metaText}>{safeNumber(record.distanceKm).toFixed(1)}km</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="flame-outline" size={12} color="#fb923c" />
              <Text style={styles.metaText}>{calories.toLocaleString()}</Text>
            </View>
          </View>
        </View>
        <Text style={styles.recordElevation}>+{Math.round(elevation).toLocaleString()}m</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadProfile(true)}
            tintColor="#16a34a"
          />
        }
      >
        <View style={styles.headerBg}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginBottom: 16 }}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerRow}>
            <View style={styles.avatarWrap}>
              <View style={styles.avatarInitial}>
                <Text style={styles.avatarInitialText}>{userInitial}</Text>
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.userName}>{displayName}</Text>
              <View style={styles.levelBadge}>
                <Text style={styles.levelText}>
                  {isGuest ? '게스트 모드' : `Lv.${Math.max(1, earnedBadges.length + 1)} 산행러`}
                </Text>
              </View>
              <Text style={styles.joinDate}>
                {stats.recordCount > 0
                  ? `${stats.uniqueMountainCount}개 산에서 ${stats.recordCount}번 산행`
                  : '산행이와 함께하는 중'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.bioCard}>
          <Text style={styles.bioTitle}>오늘도 안전한 산행을 준비하고 있어요.</Text>
          <Text style={styles.bioText}>{email}</Text>
          <Text style={styles.bioText}>이름: {user?.name ?? '미입력'}</Text>
          <Text style={styles.bioText}>나이: {user?.age ?? '미입력'} · 성별: {user?.gender ?? '미입력'}</Text>
          <Text style={styles.bioText}>보호자 연락처: {guardianNumber}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>나의 산행 기록</Text>
          {loading ? (
            <View style={styles.loadingCard}>
              <ActivityIndicator color="#16a34a" />
              <Text style={styles.loadingText}>기록을 불러오는 중입니다</Text>
            </View>
          ) : null}
          {errorMessage ? (
            <View style={styles.errorCard}>
              <Ionicons name="alert-circle-outline" size={18} color="#dc2626" />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}
          <View style={styles.statsGrid}>
            {statCards.map((stat) => (
              <View key={stat.label} style={[styles.statCard, { backgroundColor: stat.bg }]}>
                <Ionicons name={stat.icon} size={20} color={stat.color} />
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={[styles.statLabel, { color: stat.color }]}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>최근 산행 기록</Text>
            <Text style={styles.sectionCount}>{records.length}개</Text>
          </View>
          {records.length > 0 ? (
            records.slice(0, 5).map(renderRecord)
          ) : (
            <View style={styles.emptyCard}>
              <Ionicons name="trail-sign-outline" size={28} color="#9ca3af" />
              <Text style={styles.emptyTitle}>
                {isGuest ? '게스트 기록은 저장되지 않아요' : '아직 저장된 산행 기록이 없어요'}
              </Text>
              <Text style={styles.emptyText}>내비게이션 화면에서 산행 기록을 저장해보세요.</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>획득한 배지</Text>
            <Text style={styles.sectionCount}>{earnedBadges.length}/{badges.length}</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
            {[...earnedBadges, ...lockedBadges].map((badge) => {
              const isEarned = earnedBadges.some((earned) => earned.id === badge.id);
              return (
                <View
                  key={badge.id}
                  style={[styles.badgeCard, !isEarned && styles.badgeCardLocked]}
                >
                  <Text style={[styles.badgeEmoji, !isEarned && styles.badgeLockedEmoji]}>
                    {badge.icon || '🏅'}
                  </Text>
                  <Text style={[styles.badgeName, !isEarned && styles.badgeNameLocked]}>
                    {badge.name}
                  </Text>
                  <Text style={styles.badgeDesc}>
                    {badge.description || '달성 조건을 확인해보세요'}
                  </Text>
                </View>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.section}>
          <View style={styles.menuCard}>
            {MENU_ITEMS.map((item, index) => (
              <TouchableOpacity
                key={item.label}
                style={[
                  styles.menuRow,
                  index < MENU_ITEMS.length - 1 && styles.menuRowBorder,
                ]}
                activeOpacity={0.7}
                onPress={() => {
                  if ('screen' in item && item.screen) {
                    navigation.navigate(item.screen as any);
                  }
                }}
              >
                <View style={styles.menuLeft}>
                  <Ionicons name={item.icon} size={20} color="#6b7280" />
                  <Text style={styles.menuLabel}>{item.label}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <TouchableOpacity style={styles.logoutBtn} activeOpacity={0.7} onPress={handleSignOut}>
            <Ionicons name="log-out-outline" size={18} color="#ef4444" />
            <Text style={styles.logoutText}>로그아웃</Text>
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
    width: 72,
    height: 72,
    borderRadius: 36,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: '#fff',
  },
  avatarInitial: {
    flex: 1,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitialText: {
    fontSize: 26,
    fontWeight: '900',
    color: '#15803d',
  },
  userName: { fontSize: 22, fontWeight: '700', color: '#fff' },
  levelBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 99,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  levelText: { fontSize: 12, color: '#dcfce7', fontWeight: '700' },
  joinDate: { fontSize: 11, color: '#bbf7d0', marginTop: 4 },
  bioCard: {
    backgroundColor: '#fff',
    marginHorizontal: 24,
    marginTop: -40,
    borderRadius: 20,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    gap: 5,
  },
  bioTitle: { fontSize: 14, color: '#4b5563', fontWeight: '700', marginBottom: 3 },
  bioText: { fontSize: 12, color: '#9ca3af' },
  section: { paddingHorizontal: 24, marginTop: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionCount: { fontSize: 12, color: '#9ca3af', fontWeight: '600' },
  loadingCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  loadingText: { color: '#6b7280', fontSize: 12, fontWeight: '600' },
  errorCard: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  errorText: { flex: 1, color: '#b91c1c', fontSize: 12, lineHeight: 18 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: { width: '48%', borderRadius: 18, padding: 16 },
  statValue: { fontSize: 20, fontWeight: '700', color: '#111827', marginTop: 6 },
  statLabel: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  recordCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    padding: 12,
    gap: 12,
  },
  recordDateBox: {
    width: 54,
    height: 54,
    borderRadius: 15,
    backgroundColor: '#f0fdf4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordDate: { fontSize: 11, color: '#15803d', fontWeight: '800' },
  recordInfo: { flex: 1, minWidth: 0 },
  recordMountain: { fontSize: 14, color: '#111827', fontWeight: '800' },
  recordCourse: { fontSize: 12, color: '#16a34a', fontWeight: '600', marginTop: 2 },
  recordMetaRow: { flexDirection: 'row', gap: 8, marginTop: 6, flexWrap: 'wrap' },
  recordElevation: { fontSize: 13, color: '#111827', fontWeight: '800' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { fontSize: 11, color: '#6b7280' },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 22,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  emptyTitle: { color: '#374151', fontSize: 14, fontWeight: '800' },
  emptyText: { color: '#9ca3af', fontSize: 12 },
  badgeCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 14,
    alignItems: 'center',
    gap: 6,
    width: 104,
    minHeight: 128,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  badgeCardLocked: { opacity: 0.48 },
  badgeEmoji: { fontSize: 28 },
  badgeLockedEmoji: { opacity: 0.55 },
  badgeName: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '800',
    textAlign: 'center',
  },
  badgeNameLocked: { color: '#6b7280' },
  badgeDesc: {
    fontSize: 10,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 14,
  },
  menuCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  menuRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  menuRowBorder: { borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuLabel: { fontSize: 14, color: '#1f2937' },
  logoutBtn: {
    backgroundColor: '#fef2f2',
    borderRadius: 18,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  logoutText: { fontSize: 14, fontWeight: '600', color: '#ef4444' },
});
