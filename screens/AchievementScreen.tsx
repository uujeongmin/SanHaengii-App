import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  StyleSheet,
  Animated,
  Easing,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

/* ──────────────────────────────
   상수
────────────────────────────── */
const CHART_HEIGHT = 192;
const CURRENT_ALTITUDE = 600;

const LANDMARKS = [
  { name: '남산타워', height: 236 },
  { name: '롯데월드타워', height: 555 },
  { name: '한라산', height: 1947 },
  { name: '에베레스트', height: 8848 },
];

const LANDMARK_IMAGES: Record<string, string> = {
  남산타워:
    'https://images.unsplash.com/photo-1662075223793-8719d868c934?auto=format&fit=crop&q=80&w=400',
  롯데월드타워:
    'https://images.unsplash.com/photo-1567954970774-58d6aa6c50dc?auto=format&fit=crop&q=80&w=400',
  한라산:
    'https://images.unsplash.com/photo-1740329289241-3adf04a8e3ed?auto=format&fit=crop&q=80&w=400',
  에베레스트:
    'https://images.unsplash.com/photo-1575819719798-83d97dd6949c?auto=format&fit=crop&q=80&w=400',
};

/* 헤더 설명 문구 동적 생성 */
function getHeaderDesc(altitude: number) {
  const passed = [...LANDMARKS].reverse().find((m) => altitude >= m.height);
  if (!passed) return `${LANDMARKS[0].name}(${LANDMARKS[0].height}m)까지 ${LANDMARKS[0].height - altitude}m 남았어요!`;
  const next = LANDMARKS.find((m) => m.height > altitude);
  if (next) {
    return `${passed.name}(${passed.height}m)을 넘으셨네요! 다음 목표는 ${next.name}(${next.height.toLocaleString()}m)입니다.`;
  }
  return `${passed.name}(${passed.height.toLocaleString()}m)까지 완등하셨네요! 대단합니다! 🏔️`;
}

export default function AchievementScreen() {
  /* 통과한 랜드마크 중 가장 높은 것을 기본 선택 */
  const passedList = LANDMARKS.filter((m) => CURRENT_ALTITUDE >= m.height);
  const defaultSelected =
    passedList.length > 0 ? passedList[passedList.length - 1] : LANDMARKS[0];

  const [selected, setSelected] = useState(defaultSelected);

  /* 차트 계산 */
  const chartMax = Math.max(CURRENT_ALTITUDE, selected.height) * 1.25;
  const myBarTarget = (CURRENT_ALTITUDE / chartMax) * CHART_HEIGHT;
  const lmBarTarget = (selected.height / chartMax) * CHART_HEIGHT;

  /* ── 애니메이션 refs ── */
  const myBarAnim = useRef(new Animated.Value(0)).current;
  const lmBarAnim = useRef(new Animated.Value(0)).current;

  /* 선택된 랜드마크가 바뀔 때마다 막대 재애니메이션 */
  useEffect(() => {
    myBarAnim.setValue(0);
    lmBarAnim.setValue(0);

    Animated.parallel([
      Animated.timing(myBarAnim, {
        toValue: myBarTarget,
        duration: 900,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }),
      Animated.timing(lmBarAnim, {
        toValue: lmBarTarget,
        duration: 900,
        delay: 120,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }),
    ]).start();
  }, [selected]);

  const headerDesc = getHeaderDesc(CURRENT_ALTITUDE);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ── 헤더 ── */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.trophyBadge}>
              <Ionicons name="trophy" size={24} color="#ca8a04" />
            </View>
            <View>
              <Text style={styles.headerTitle}>나의 성취도</Text>
              <Text style={styles.headerSub}>누적 고도</Text>
            </View>
          </View>

          <View style={styles.bigNumRow}>
            <Text style={styles.bigNum}>
              {CURRENT_ALTITUDE.toLocaleString()}
              <Text style={styles.bigNumUnit}>m</Text>
            </Text>
            <View style={styles.rankBadge}>
              <Text style={styles.rankBadgeText}>상위 12%</Text>
            </View>
          </View>
          <Text style={styles.headerDesc}>{headerDesc}</Text>
        </View>

        <View style={styles.content}>
          {/* ── 랜드마크 챌린지 카드 ── */}
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <Text style={styles.cardTitle}>랜드마크 챌린지</Text>
              <Ionicons name="medal-outline" size={20} color="#9ca3af" />
            </View>

            {/* 안내 텍스트 */}
            <Text style={styles.chartHint}>랜드마크를 탭하면 비교할 수 있어요</Text>

            {/* ── 높이 레이블: 차트 위 고정 행 ── */}
            <View style={styles.chartLabelRow}>
              <View style={styles.barCol}>
                <Text style={[styles.barTopLabel, { color: '#16a34a' }]}>
                  {CURRENT_ALTITUDE.toLocaleString()}m
                </Text>
              </View>
              <View style={styles.barCol}>
                <Text style={[styles.barTopLabel, { color: '#374151' }]}>
                  {selected.height.toLocaleString()}m
                </Text>
              </View>
            </View>

            {/* ── 막대 그래프 ── */}
            <View style={styles.chartArea}>
              {/* 나의 누적 */}
              <View style={styles.barCol}>
                <View style={[styles.barTrack, { height: CHART_HEIGHT }]}>
                  <Animated.View style={[styles.myBar, { height: myBarAnim }]} />
                </View>
              </View>

              {/* 선택된 랜드마크 */}
              <View style={styles.barCol}>
                <View style={[styles.barTrack, { height: CHART_HEIGHT }]}>
                  <Animated.View
                    style={[styles.lmBar, { height: lmBarAnim, overflow: 'hidden' }]}
                  >
                    <Image
                      source={{ uri: LANDMARK_IMAGES[selected.name] }}
                      style={styles.lmBarImage}
                      resizeMode="cover"
                    />
                  </Animated.View>
                </View>
              </View>
            </View>

            {/* ── 하단 이름 레이블 ── */}
            <View style={styles.chartNameRow}>
              <Text style={[styles.barBottomLabel, { color: '#1f2937' }]}>나의 누적</Text>
              <Text style={[styles.barBottomLabel, { color: '#15803d' }]}>{selected.name}</Text>
            </View>

            {/* ── 랜드마크 리스트 (클릭 가능) ── */}
            <View style={styles.lmList}>
              {LANDMARKS.map((mark) => {
                const isPassed = CURRENT_ALTITUDE >= mark.height;
                const isSelected = selected.name === mark.name;

                return (
                  <TouchableOpacity
                    key={mark.name}
                    style={[styles.lmItem, isSelected && styles.lmItemSelected]}
                    onPress={() => setSelected(mark)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.lmItemLeft}>
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
                          styles.lmName,
                          isSelected
                            ? styles.lmNameSelected
                            : isPassed
                            ? styles.lmNameOn
                            : styles.lmNameOff,
                        ]}
                      >
                        {mark.name}
                      </Text>
                      {isPassed && (
                        <View style={styles.passedBadge}>
                          <Text style={styles.passedBadgeText}>달성</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.lmItemRight}>
                      <Text
                        style={[
                          styles.lmHeight,
                          isSelected
                            ? styles.lmHeightSelected
                            : isPassed
                            ? styles.lmHeightOn
                            : styles.lmHeightOff,
                        ]}
                      >
                        {mark.height.toLocaleString()}m
                      </Text>
                      {isSelected && (
                        <Ionicons name="bar-chart" size={14} color="#16a34a" style={{ marginLeft: 4 }} />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* ── 통계 그리드 ── */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Ionicons name="compass-outline" size={24} color="#3b82f6" />
              <Text style={styles.statLabel}>총 이동 거리</Text>
              <Text style={styles.statValue}>42.5km</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="trending-up-outline" size={24} color="#f97316" />
              <Text style={styles.statLabel}>소모 칼로리</Text>
              <Text style={styles.statValue}>12,400kcal</Text>
            </View>
          </View>

          {/* ── 최근 산행 ── */}
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <Text style={styles.cardTitle}>최근 산행 기록</Text>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </View>

            <View style={styles.hikeItem}>
              <View style={styles.hikeDateBadge}>
                <Text style={styles.hikeDateText}>10/24</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.hikeName}>관악산 초보 루트</Text>
                <Text style={styles.hikeDetail}>2시간 40분 · 5.2km</Text>
              </View>
              <Text style={styles.hikeAlt}>+390m</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.hikeItem}>
              <View style={styles.hikeDateBadge}>
                <Text style={styles.hikeDateText}>10/18</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.hikeName}>북한산 둘레길</Text>
                <Text style={styles.hikeDetail}>1시간 15분 · 3.8km</Text>
              </View>
              <Text style={styles.hikeAlt}>+210m</Text>
            </View>
          </View>
        </View>
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
    backgroundColor: '#ffffff',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 28,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    elevation: 4,
    shadowColor: '#000',
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
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#111827', letterSpacing: -0.5 },
  headerSub: { fontSize: 14, color: '#6b7280', marginTop: 2 },
  bigNumRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginBottom: 8,
  },
  bigNum: { fontSize: 48, fontWeight: '800', color: '#111827', letterSpacing: -1 },
  bigNumUnit: { fontSize: 24, fontWeight: '700', color: '#6b7280' },
  rankBadge: {
    backgroundColor: '#dcfce7',
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 4,
  },
  rankBadgeText: { fontSize: 12, fontWeight: '700', color: '#15803d' },
  headerDesc: { fontSize: 13, color: '#6b7280', lineHeight: 20 },

  /* 공통 */
  content: { paddingHorizontal: 24, paddingTop: 24, gap: 20 },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    elevation: 2,
    shadowColor: '#000',
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
  divider: { height: 1, backgroundColor: '#f3f4f6', marginVertical: 4 },

  /* 차트 힌트 */
  chartHint: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 4,
  },

  /* 막대 그래프 */
  chartArea: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    gap: 40,
    marginTop: 24,
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
  lmBar: {
    width: '100%',
    backgroundColor: '#f3f4f6',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  lmBarImage: { width: '100%', height: '100%' },
  barBottomLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1f2937',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 16,
  },

  /* 높이 레이블: 차트 위 고정 행 */
  chartLabelRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    gap: 40,
    marginBottom: 8,
  },

  /* 하단 이름 레이블 */
  chartNameRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    gap: 40,
    marginTop: 8,
  },

  /* 랜드마크 리스트 */
  lmList: { gap: 6, marginTop: 4 },
  lmItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
  },
  lmItemSelected: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  lmItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  lmItemRight: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5 },
  lmName: { fontSize: 14 },
  lmNameOn: { color: '#374151', fontWeight: '600' },
  lmNameOff: { color: '#9ca3af' },
  lmNameSelected: { color: '#15803d', fontWeight: '700' },
  passedBadge: {
    backgroundColor: '#dcfce7',
    borderRadius: 99,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  passedBadgeText: { fontSize: 10, fontWeight: '700', color: '#15803d' },
  lmHeight: { fontSize: 14, fontWeight: '500' },
  lmHeightOn: { color: '#4b5563' },
  lmHeightOff: { color: '#d1d5db' },
  lmHeightSelected: { color: '#15803d', fontWeight: '700' },

  /* 통계 그리드 */
  statsRow: { flexDirection: 'row', gap: 16 },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    gap: 6,
  },
  statLabel: { fontSize: 12, color: '#6b7280', fontWeight: '500', marginTop: 6 },
  statValue: { fontSize: 18, fontWeight: '700', color: '#111827' },

  /* 최근 산행 */
  hikeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 8,
  },
  hikeDateBadge: {
    width: 48,
    height: 48,
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hikeDateText: { fontSize: 12, fontWeight: '700', color: '#15803d' },
  hikeName: { fontSize: 14, fontWeight: '700', color: '#111827' },
  hikeDetail: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  hikeAlt: { fontSize: 14, fontWeight: '700', color: '#111827' },
});