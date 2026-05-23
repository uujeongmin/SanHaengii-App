import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../contexts/AuthContext';
import {
  apiService,
  type Badge,
  type HikingRecord,
  type UserBadge,
} from '../data/api';
import {
  createBadgeStats,
  formatBadgeProgressValue,
  getBadgeProgress,
  getEarnedBadgeIds,
} from '../data/badges';

const CHART_HEIGHT = 192;

const LANDMARKS = [
  { name: '남산타워', height: 236 },
  { name: '롯데월드타워', height: 555 },
  { name: '한라산', height: 1947 },
  { name: '후지산', height: 3776 },
  { name: '에베레스트', height: 8848 },
];

const LANDMARK_IMAGES: Record<string, string> = {
  남산타워:
    'https://images.unsplash.com/photo-1662075223793-8719d868c934?auto=format&fit=crop&q=80&w=400',
  롯데월드타워:
    'https://images.unsplash.com/photo-1567954970774-58d6aa6c50dc?auto=format&fit=crop&q=80&w=400',
  한라산:
    'https://images.unsplash.com/photo-1740329289241-3adf04a8e3ed?auto=format&fit=crop&q=80&w=400',
  후지산:
    'https://images.unsplash.com/photo-1578637387939-43c525550085?auto=format&fit=crop&q=80&w=400',
  에베레스트:
    'https://images.unsplash.com/photo-1575819719798-83d97dd6949c?auto=format&fit=crop&q=80&w=400',
};

function safeNumber(value: number | null | undefined) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function estimateCalories(record: HikingRecord) {
  const distance = safeNumber(record.distanceKm);
  const duration = safeNumber(record.durationMinutes);
  const elevation = safeNumber(record.elevationGainM);
  const heartRate = safeNumber(record.avgHeartRate);
  return Math.round(distance * 55 + duration * 4.5 + elevation * 0.35 + Math.max(0, heartRate - 100) * 1.2);
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
  if (!value) return '--/--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--/--';
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function formatFullDate(value: string | null) {
  if (!value) return '날짜 없음';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '날짜 없음';
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function getLandmarkMessage(totalElevationM: number) {
  const passed = [...LANDMARKS].reverse().find((mark) => totalElevationM >= mark.height);
  const next = LANDMARKS.find((mark) => totalElevationM < mark.height);

  if (!passed && next) {
    return `${next.name}까지 ${(next.height - totalElevationM).toLocaleString()}m 남았어요.`;
  }

  if (passed && next) {
    return `${passed.name} 높이를 넘었어요. 다음 목표는 ${next.name}입니다.`;
  }

  if (passed) {
    return `${passed.name}까지 넘어섰어요. 누적 고도가 정말 단단해졌습니다.`;
  }

  return '첫 산행 기록을 저장하면 누적 고도 챌린지가 시작돼요.';
}

export default function AchievementScreen() {
  const { isGuest, token, user } = useAuth();
  const [records, setRecords] = useState<HikingRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [badgeModalVisible, setBadgeModalVisible] = useState(false);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [userBadges, setUserBadges] = useState<UserBadge[]>([]);
  const [selectedLandmarkName, setSelectedLandmarkName] = useState(LANDMARKS[0].name);

  const myBarAnim = useRef(new Animated.Value(0)).current;
  const landmarkBarAnim = useRef(new Animated.Value(0)).current;

  const loadDashboard = useCallback(
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
      loadDashboard();
    }, [loadDashboard]),
  );

  const badgeStats = useMemo(() => createBadgeStats(records), [records]);

  const stats = useMemo(() => {
    const heartRates = records
      .map((record) => safeNumber(record.avgHeartRate))
      .filter((value) => value > 0);

    return {
      ...badgeStats,
      count: badgeStats.recordCount,
      averageHeartRate:
        heartRates.length > 0
          ? Math.round(heartRates.reduce((sum, value) => sum + value, 0) / heartRates.length)
          : 0,
    };
  }, [badgeStats, records]);

  const earnedBadgeIds = useMemo(
    () => getEarnedBadgeIds(badges, userBadges, badgeStats),
    [badgeStats, badges, userBadges],
  );
  const earnedBadges = badges.filter((badge) => earnedBadgeIds.has(badge.id));

  const recommendedLandmark = useMemo(() => {
    const passed = LANDMARKS.filter((mark) => stats.totalElevationM >= mark.height);
    return passed[passed.length - 1] ?? LANDMARKS.find((mark) => stats.totalElevationM < mark.height) ?? LANDMARKS[0];
  }, [stats.totalElevationM]);

  useEffect(() => {
    setSelectedLandmarkName(recommendedLandmark.name);
  }, [recommendedLandmark.name]);

  const selectedLandmark =
    LANDMARKS.find((mark) => mark.name === selectedLandmarkName) ?? recommendedLandmark;
  const chartMax = Math.max(stats.totalElevationM, selectedLandmark.height, 1) * 1.25;
  const myBarTarget = Math.max(2, (stats.totalElevationM / chartMax) * CHART_HEIGHT);
  const landmarkBarTarget = Math.max(2, (selectedLandmark.height / chartMax) * CHART_HEIGHT);
  const recentRecords = records.slice(0, 3);

  useEffect(() => {
    myBarAnim.setValue(0);
    landmarkBarAnim.setValue(0);

    Animated.parallel([
      Animated.timing(myBarAnim, {
        toValue: myBarTarget,
        duration: 900,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }),
      Animated.timing(landmarkBarAnim, {
        toValue: landmarkBarTarget,
        duration: 900,
        delay: 120,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }),
    ]).start();
  }, [landmarkBarAnim, landmarkBarTarget, myBarAnim, myBarTarget]);

  function renderRecord(record: HikingRecord, dense = false) {
    const elevation = safeNumber(record.elevationGainM);
    const calories = safeNumber(record.calories ?? estimateCalories(record));

    return (
      <View key={record.id} style={[styles.hikeItem, dense && styles.hikeItemDense]}>
        <View style={styles.hikeDateBadge}>
          <Text style={styles.hikeDateText}>{formatShortDate(record.createdAt)}</Text>
        </View>
        <View style={styles.hikeContent}>
          <Text style={styles.hikeName} numberOfLines={1}>
            {record.mountainName || '이름 없는 산행'}
          </Text>
          <Text style={styles.hikeCourse} numberOfLines={1}>
            {record.courseName || '코스 정보 없음'}
          </Text>
          <Text style={styles.hikeDetail} numberOfLines={1}>
            {formatDuration(safeNumber(record.durationMinutes))} · {safeNumber(record.distanceKm).toFixed(1)}km · {calories.toLocaleString()}kcal
          </Text>
        </View>
        <View style={styles.hikeRight}>
          <Text style={styles.hikeAlt}>+{elevation.toLocaleString()}m</Text>
          <Text style={styles.hikeFullDate}>{formatFullDate(record.createdAt)}</Text>
        </View>
      </View>
    );
  }

  function renderBadgeCard(badge: Badge, dense = false) {
    const isEarned = earnedBadgeIds.has(badge.id);
    const progress = getBadgeProgress(badge, badgeStats);

    return (
      <View
        key={badge.id}
        style={[
          dense ? styles.badgeListItem : styles.badgeCard,
          !isEarned && styles.badgeLocked,
        ]}
      >
        <View style={dense ? styles.badgeListIcon : styles.badgeIcon}>
          <Text style={styles.badgeEmoji}>{badge.icon || '🏅'}</Text>
        </View>
        <View style={dense ? styles.badgeListContent : undefined}>
          <Text
            style={[
              dense ? styles.badgeListName : styles.badgeName,
              !isEarned && styles.badgeNameLocked,
            ]}
            numberOfLines={dense ? 1 : 2}
          >
            {badge.name}
          </Text>
          <Text
            style={dense ? styles.badgeListDesc : styles.badgeDesc}
            numberOfLines={dense ? 2 : 2}
          >
            {badge.description || '달성 조건을 확인해보세요'}
          </Text>
          {dense ? (
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.round(progress.ratio * 100)}%` },
                ]}
              />
            </View>
          ) : null}
          <Text style={dense ? styles.badgeListProgress : styles.badgeProgress}>
            {isEarned
              ? '획득 완료'
              : `${formatBadgeProgressValue(
                  badge,
                  progress.current,
                )} / ${formatBadgeProgressValue(badge, progress.target)}`}
          </Text>
        </View>
        {dense ? (
          <View style={[styles.badgeStatePill, isEarned && styles.badgeStatePillOn]}>
            <Text
              style={[
                styles.badgeStateText,
                isEarned && styles.badgeStateTextOn,
              ]}
            >
              {isEarned ? '획득' : '진행'}
            </Text>
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadDashboard(true)}
            tintColor="#16a34a"
          />
        }
      >
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.trophyBadge}>
              <Ionicons name="trophy" size={24} color="#ca8a04" />
            </View>
            <View>
              <Text style={styles.headerTitle}>나의 성취도</Text>
              <Text style={styles.headerSub}>로그인 계정 기준 누적 기록</Text>
            </View>
          </View>

          <View style={styles.bigNumRow}>
            <Text style={styles.bigNum}>
              {Math.round(stats.totalElevationM).toLocaleString()}
              <Text style={styles.bigNumUnit}>m</Text>
            </Text>
            <View style={styles.rankBadge}>
              <Text style={styles.rankBadgeText}>{stats.count}회 산행</Text>
            </View>
          </View>
          <Text style={styles.headerDesc}>{getLandmarkMessage(stats.totalElevationM)}</Text>
        </View>

        <View style={styles.content}>
          {loading ? (
            <View style={styles.loadingCard}>
              <ActivityIndicator color="#16a34a" />
              <Text style={styles.loadingText}>산행 기록을 불러오는 중입니다</Text>
            </View>
          ) : null}

          {errorMessage ? (
            <View style={styles.errorCard}>
              <Ionicons name="alert-circle-outline" size={20} color="#dc2626" />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <Text style={styles.cardTitle}>랜드마크 챌린지</Text>
              <Ionicons name="medal-outline" size={20} color="#9ca3af" />
            </View>

            <View style={styles.chartLabelRow}>
              <View style={styles.barCol}>
                <Text style={[styles.barTopLabel, { color: '#16a34a' }]}>
                  {Math.round(stats.totalElevationM).toLocaleString()}m
                </Text>
              </View>
              <View style={styles.barCol}>
                <Text style={[styles.barTopLabel, { color: '#374151' }]}>
                  {selectedLandmark.height.toLocaleString()}m
                </Text>
              </View>
            </View>

            <View style={styles.chartArea}>
              <View style={styles.barCol}>
                <View style={[styles.barTrack, { height: CHART_HEIGHT }]}>
                  <Animated.View style={[styles.myBar, { height: myBarAnim }]} />
                </View>
              </View>

              <View style={styles.barCol}>
                <View style={[styles.barTrack, { height: CHART_HEIGHT }]}>
                  <Animated.View style={[styles.landmarkBar, { height: landmarkBarAnim }]}>
                    <Image
                      source={{ uri: LANDMARK_IMAGES[selectedLandmark.name] }}
                      style={styles.landmarkImage}
                      resizeMode="cover"
                    />
                  </Animated.View>
                </View>
              </View>
            </View>

            <View style={styles.chartNameRow}>
              <Text style={[styles.barBottomLabel, { color: '#1f2937' }]}>나의 누적</Text>
              <Text style={[styles.barBottomLabel, { color: '#15803d' }]}>
                {selectedLandmark.name}
              </Text>
            </View>

            <View style={styles.landmarkList}>
              {LANDMARKS.map((mark) => {
                const isPassed = stats.totalElevationM >= mark.height;
                const isSelected = selectedLandmark.name === mark.name;

                return (
                  <TouchableOpacity
                    key={mark.name}
                    style={[styles.landmarkItem, isSelected && styles.landmarkItemSelected]}
                    onPress={() => setSelectedLandmarkName(mark.name)}
                    activeOpacity={0.76}
                  >
                    <View style={styles.landmarkItemLeft}>
                      <View
                        style={[
                          styles.dot,
                          {
                            backgroundColor: isSelected
                              ? '#16a34a'
                              : isPassed
                                ? '#22c55e'
                                : '#d1d5db',
                          },
                        ]}
                      />
                      <Text
                        style={[
                          styles.landmarkName,
                          isSelected
                            ? styles.landmarkNameSelected
                            : isPassed
                              ? styles.landmarkNameOn
                              : styles.landmarkNameOff,
                        ]}
                      >
                        {mark.name}
                      </Text>
                      {isPassed ? (
                        <View style={styles.passedBadge}>
                          <Text style={styles.passedBadgeText}>달성</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text
                      style={[
                        styles.landmarkHeight,
                        isSelected
                          ? styles.landmarkHeightSelected
                          : isPassed
                            ? styles.landmarkHeightOn
                            : styles.landmarkHeightOff,
                      ]}
                    >
                      {mark.height.toLocaleString()}m
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Ionicons name="compass-outline" size={23} color="#2563eb" />
              <Text style={styles.statLabel}>총 이동 거리</Text>
              <Text style={styles.statValue}>{stats.totalDistanceKm.toFixed(1)}km</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="flame-outline" size={23} color="#f97316" />
              <Text style={styles.statLabel}>소모 칼로리</Text>
              <Text style={styles.statValue}>{Math.round(stats.totalCalories).toLocaleString()}</Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Ionicons name="time-outline" size={23} color="#7c3aed" />
              <Text style={styles.statLabel}>총 산행 시간</Text>
              <Text style={styles.statValue}>{formatDuration(stats.totalDurationMinutes)}</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="trail-sign-outline" size={23} color="#059669" />
              <Text style={styles.statLabel}>다녀온 산</Text>
              <Text style={styles.statValue}>{stats.uniqueMountainCount}곳</Text>
            </View>
          </View>

          {stats.averageHeartRate > 0 ? (
            <View style={styles.heartCard}>
              <View style={styles.heartIcon}>
                <Ionicons name="heart" size={20} color="#e11d48" />
              </View>
              <View>
                <Text style={styles.heartLabel}>평균 심박수</Text>
                <Text style={styles.heartValue}>{stats.averageHeartRate} bpm</Text>
              </View>
            </View>
          ) : null}

          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <View>
                <Text style={styles.cardTitle}>내가 획득한 배지</Text>
                <Text style={styles.cardSub}>
                  {earnedBadges.length}/{badges.length}개 달성
                </Text>
              </View>
              <TouchableOpacity
                style={styles.viewAllButton}
                onPress={() => setBadgeModalVisible(true)}
                activeOpacity={0.75}
              >
                <Text style={styles.viewAllText}>전체보기</Text>
                <Ionicons name="chevron-forward" size={16} color="#16a34a" />
              </TouchableOpacity>
            </View>

            {earnedBadges.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.badgeRow}
              >
                {earnedBadges.slice(0, 8).map((badge) => renderBadgeCard(badge))}
              </ScrollView>
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="ribbon-outline" size={30} color="#9ca3af" />
                <Text style={styles.emptyTitle}>아직 획득한 배지가 없어요</Text>
                <Text style={styles.emptyText}>
                  산행 기록을 저장하면 조건에 맞는 배지가 열립니다.
                </Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={styles.card}
            activeOpacity={records.length > 0 ? 0.86 : 1}
            onPress={() => records.length > 0 && setHistoryVisible(true)}
          >
            <View style={styles.cardTitleRow}>
              <View>
                <Text style={styles.cardTitle}>최근 산행 기록</Text>
                <Text style={styles.cardSub}>{records.length}개의 기록</Text>
              </View>
              {records.length > 0 ? (
                <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
              ) : null}
            </View>

            {recentRecords.length > 0 ? (
              <View style={styles.recordList}>
                {recentRecords.map((record, index) => (
                  <React.Fragment key={record.id}>
                    {renderRecord(record)}
                    {index < recentRecords.length - 1 ? <View style={styles.divider} /> : null}
                  </React.Fragment>
                ))}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="footsteps-outline" size={30} color="#9ca3af" />
                <Text style={styles.emptyTitle}>
                  {isGuest ? '게스트 기록은 저장되지 않아요' : '아직 저장된 산행 기록이 없어요'}
                </Text>
                <Text style={styles.emptyText}>
                  내비게이션 화면에서 산행 기록을 저장하면 이곳에 누적됩니다.
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal
        visible={badgeModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setBadgeModalVisible(false)}
      >
        <SafeAreaView style={styles.modalSafe} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>전체 배지</Text>
              <Text style={styles.modalSub}>
                {earnedBadges.length}/{badges.length}개 획득
              </Text>
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setBadgeModalVisible(false)}
              activeOpacity={0.75}
            >
              <Ionicons name="close" size={22} color="#111827" />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalContent}>
            {badges.length > 0 ? (
              badges.map((badge) => renderBadgeCard(badge, true))
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="ribbon-outline" size={30} color="#9ca3af" />
                <Text style={styles.emptyTitle}>등록된 배지가 없어요</Text>
                <Text style={styles.emptyText}>
                  badges 테이블에 배지를 추가하면 이곳에 표시됩니다.
                </Text>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <Modal
        visible={historyVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setHistoryVisible(false)}
      >
        <SafeAreaView style={styles.modalSafe} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>전체 산행 기록</Text>
              <Text style={styles.modalSub}>{records.length}개의 산행</Text>
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setHistoryVisible(false)}
              activeOpacity={0.75}
            >
              <Ionicons name="close" size={22} color="#111827" />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalContent}>
            {records.map((record, index) => (
              <React.Fragment key={record.id}>
                {renderRecord(record, true)}
                {index < records.length - 1 ? <View style={styles.divider} /> : null}
              </React.Fragment>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f9fafb' },
  container: { flex: 1 },
  scrollContent: { paddingBottom: 48 },
  header: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 28,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    elevation: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  trophyBadge: {
    width: 48,
    height: 48,
    backgroundColor: '#fef3c7',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#111827' },
  headerSub: { fontSize: 14, color: '#6b7280', marginTop: 2 },
  bigNumRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginBottom: 8,
  },
  bigNum: { fontSize: 48, fontWeight: '800', color: '#111827' },
  bigNumUnit: { fontSize: 24, fontWeight: '700', color: '#6b7280' },
  rankBadge: {
    backgroundColor: '#dcfce7',
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 5,
  },
  rankBadgeText: { fontSize: 12, fontWeight: '700', color: '#15803d' },
  headerDesc: { fontSize: 13, color: '#6b7280', lineHeight: 20 },
  content: { paddingHorizontal: 24, paddingTop: 24, gap: 18 },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 22,
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  cardTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  cardSub: { fontSize: 12, color: '#9ca3af', marginTop: 3 },
  loadingCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 18,
    alignItems: 'center',
    gap: 10,
  },
  loadingText: { color: '#6b7280', fontSize: 13, fontWeight: '600' },
  errorCard: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  errorText: { flex: 1, color: '#b91c1c', fontSize: 12, lineHeight: 18 },
  chartLabelRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    gap: 40,
    marginTop: 18,
    marginBottom: 8,
  },
  chartArea: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    gap: 40,
    borderBottomWidth: 2,
    borderBottomColor: '#f3f4f6',
  },
  barCol: { alignItems: 'center', width: 80 },
  barTopLabel: { fontSize: 13, fontWeight: '700', marginBottom: 6 },
  barTrack: { width: 80, justifyContent: 'flex-end', alignItems: 'stretch' },
  myBar: {
    width: '100%',
    backgroundColor: '#22c55e',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  landmarkBar: {
    width: '100%',
    backgroundColor: '#f3f4f6',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    overflow: 'hidden',
  },
  landmarkImage: { width: '100%', height: '100%' },
  chartNameRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    gap: 40,
    marginTop: 8,
  },
  barBottomLabel: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 14,
    width: 80,
  },
  landmarkList: { gap: 6, marginTop: 4 },
  landmarkItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
  },
  landmarkItemSelected: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  landmarkItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  landmarkName: { fontSize: 14 },
  landmarkNameOn: { color: '#374151', fontWeight: '600' },
  landmarkNameOff: { color: '#9ca3af' },
  landmarkNameSelected: { color: '#15803d', fontWeight: '700' },
  landmarkHeight: { fontSize: 14, fontWeight: '600' },
  landmarkHeightOn: { color: '#4b5563' },
  landmarkHeightOff: { color: '#d1d5db' },
  landmarkHeightSelected: { color: '#15803d', fontWeight: '700' },
  passedBadge: {
    backgroundColor: '#dcfce7',
    borderRadius: 99,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  passedBadgeText: { fontSize: 10, fontWeight: '700', color: '#15803d' },
  statsRow: { flexDirection: 'row', gap: 14 },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 22,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    gap: 6,
  },
  statLabel: { fontSize: 12, color: '#6b7280', fontWeight: '500', marginTop: 4 },
  statValue: { fontSize: 18, fontWeight: '800', color: '#111827' },
  heartCard: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  heartIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffe4e6',
  },
  heartLabel: { fontSize: 12, color: '#6b7280', fontWeight: '600' },
  heartValue: { fontSize: 18, color: '#111827', fontWeight: '800', marginTop: 2 },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingVertical: 6,
    paddingLeft: 10,
  },
  viewAllText: { fontSize: 12, color: '#16a34a', fontWeight: '800' },
  badgeRow: { gap: 10, paddingTop: 16, paddingRight: 4 },
  badgeCard: {
    width: 112,
    minHeight: 132,
    borderRadius: 18,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#f3f4f6',
    padding: 12,
    alignItems: 'center',
    gap: 6,
  },
  badgeLocked: { opacity: 0.5 },
  badgeIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#fef3c7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeEmoji: { fontSize: 24 },
  badgeName: {
    fontSize: 12,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
  },
  badgeNameLocked: { color: '#6b7280' },
  badgeDesc: {
    fontSize: 10,
    color: '#9ca3af',
    lineHeight: 14,
    textAlign: 'center',
  },
  badgeProgress: {
    marginTop: 'auto',
    fontSize: 10,
    color: '#15803d',
    fontWeight: '800',
    textAlign: 'center',
  },
  badgeListItem: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  badgeListIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: '#fef3c7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeListContent: { flex: 1, minWidth: 0 },
  badgeListName: { fontSize: 14, fontWeight: '800', color: '#111827' },
  badgeListDesc: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
    lineHeight: 17,
  },
  badgeListProgress: {
    fontSize: 11,
    color: '#16a34a',
    fontWeight: '800',
    marginTop: 6,
  },
  progressTrack: {
    height: 5,
    borderRadius: 99,
    backgroundColor: '#e5e7eb',
    marginTop: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 99,
    backgroundColor: '#22c55e',
  },
  badgeStatePill: {
    borderRadius: 99,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#f3f4f6',
  },
  badgeStatePillOn: { backgroundColor: '#dcfce7' },
  badgeStateText: { fontSize: 10, color: '#6b7280', fontWeight: '800' },
  badgeStateTextOn: { color: '#15803d' },
  recordList: { marginTop: 14 },
  hikeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 8,
  },
  hikeItemDense: { paddingVertical: 12 },
  hikeDateBadge: {
    width: 48,
    height: 48,
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hikeDateText: { fontSize: 12, fontWeight: '700', color: '#15803d' },
  hikeContent: { flex: 1, minWidth: 0 },
  hikeName: { fontSize: 14, fontWeight: '800', color: '#111827' },
  hikeCourse: { fontSize: 12, color: '#16a34a', marginTop: 2, fontWeight: '600' },
  hikeDetail: { fontSize: 12, color: '#6b7280', marginTop: 3 },
  hikeRight: { alignItems: 'flex-end', maxWidth: 86 },
  hikeAlt: { fontSize: 14, fontWeight: '800', color: '#111827' },
  hikeFullDate: { fontSize: 10, color: '#9ca3af', marginTop: 4, textAlign: 'right' },
  divider: { height: 1, backgroundColor: '#f3f4f6', marginVertical: 4 },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 28,
    gap: 8,
  },
  emptyTitle: { color: '#374151', fontSize: 14, fontWeight: '800' },
  emptyText: { color: '#9ca3af', fontSize: 12, textAlign: 'center', lineHeight: 18 },
  modalSafe: { flex: 1, backgroundColor: '#f9fafb' },
  modalHeader: {
    paddingHorizontal: 22,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#111827' },
  modalSub: { fontSize: 12, color: '#9ca3af', marginTop: 3 },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
  },
  modalContent: {
    paddingHorizontal: 22,
    paddingVertical: 14,
    paddingBottom: 30,
  },
});
