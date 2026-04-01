import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SafetyScreen() {
  /* ── 배경 글로우 펄스 ── */
  const bgPulse = useRef(new Animated.Value(1)).current;
  /* ── SOS 링 페이드 ── */
  const sosRingOpacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(bgPulse, {
          toValue: 1.1,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(bgPulse, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(sosRingOpacity, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(sosRingOpacity, {
          toValue: 0.5,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ── 빨간 헤더 ── */}
        <View style={styles.header}>
          {/* 배경 글로우 */}
          <Animated.View
            style={[styles.bgGlow, { transform: [{ scale: bgPulse }] }]}
          />

          <View style={styles.headerTop}>
            <Text style={styles.headerTitle}>안전 및 신고 설정</Text>
            <TouchableOpacity style={styles.settingsBtn} activeOpacity={0.7}>
              <Ionicons name="settings-outline" size={20} color="#ffffff" />
            </TouchableOpacity>
          </View>

          <View style={styles.statusBanner}>
            <View style={styles.statusRow}>
              <View style={styles.statusDot} />
              <Text style={styles.statusTitle}>이상 징후 모니터링 중</Text>
            </View>
            <Text style={styles.statusDesc}>
              가속도 및 자이로 센서를 통해 급격한 낙하 또는 장기 이동 정지를
              실시간으로 탐지합니다.
            </Text>
          </View>
        </View>

        <View style={styles.content}>
          {/* ── SOS 버튼 ── */}
          <TouchableOpacity style={styles.sosCard} activeOpacity={0.88}>
            <View style={styles.sosIconWrapper}>
              <Animated.View
                style={[styles.sosRing, { opacity: sosRingOpacity }]}
              />
              <Ionicons
                name="warning"
                size={48}
                color="#ef4444"
                style={{ zIndex: 1 }}
              />
            </View>
            <Text style={styles.sosTitle}>긴급 구조 요청</Text>
            <Text style={styles.sosDesc}>
              버튼을 길게 누르면 119 및 지정 보호자에게 위치가 전송됩니다.
            </Text>
          </TouchableOpacity>

          {/* ── 자동 신고 프로토콜 ── */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>자동 신고 프로토콜</Text>

            <View style={styles.protocolItem}>
              <View style={[styles.protocolIcon, { backgroundColor: '#fff7ed' }]}>
                <Ionicons name="phone-portrait-outline" size={20} color="#ea580c" />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.protocolTitleRow}>
                  <Text style={styles.protocolName}>낙하 감지</Text>
                  <Text style={styles.protocolOn}>ON</Text>
                </View>
                <Text style={styles.protocolDesc}>
                  비정상적인 가속도 변화가 감지된 후 30초 내 사용자 응답이 없으면
                  자동 신고됩니다.
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.protocolItem}>
              <View style={[styles.protocolIcon, { backgroundColor: '#eff6ff' }]}>
                <Ionicons name="person-outline" size={20} color="#2563eb" />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.protocolTitleRow}>
                  <Text style={styles.protocolName}>장기 미이동</Text>
                  <Text style={styles.protocolOn}>ON</Text>
                </View>
                <Text style={styles.protocolDesc}>
                  산행 중 20분 이상 이동이 감지되지 않으면 안부 확인 알림을 전송합니다.
                </Text>
              </View>
            </View>
          </View>

          {/* ── 비상 연락망 ── */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardTitle}>비상 연락망</Text>
              <TouchableOpacity style={styles.addBtn}>
                <Text style={styles.addBtnText}>+ 추가</Text>
              </TouchableOpacity>
            </View>

            <ContactRow
              iconName="shield-outline"
              iconBg="#fee2e2"
              iconColor="#dc2626"
              name="119 구조대"
              sub="위치정보 자동 포함"
            />

            <ContactRow
              iconName="person-outline"
              iconBg="#dbeafe"
              iconColor="#2563eb"
              name="어머니 (보호자)"
              sub="010-1234-5678"
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ────────────────────────────── */
function ContactRow({
  iconName,
  iconBg,
  iconColor,
  name,
  sub,
}: {
  iconName: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  iconColor: string;
  name: string;
  sub: string;
}) {
  return (
    <View style={cStyles.row}>
      <View style={[cStyles.avatar, { backgroundColor: iconBg }]}>
        <Ionicons name={iconName} size={18} color={iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={cStyles.name}>{name}</Text>
        <Text style={cStyles.sub}>{sub}</Text>
      </View>
      <TouchableOpacity style={cStyles.callBtn}>
        <Ionicons name="call-outline" size={18} color="#4b5563" />
      </TouchableOpacity>
    </View>
  );
}

const cStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    marginTop: 8,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { fontSize: 14, fontWeight: '700', color: '#111827' },
  sub: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  callBtn: {
    width: 40,
    height: 40,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
});

/* ────────────────────────────── */
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f9fafb' },
  container: { flex: 1 },
  scrollContent: { paddingBottom: 48 },

  /* 빨간 헤더 */
  header: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 60,
    borderBottomLeftRadius: 48,
    borderBottomRightRadius: 48,
    overflow: 'hidden',
  },
  bgGlow: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 192,
    height: 192,
    borderRadius: 96,
    backgroundColor: '#f87171',
    opacity: 0.5,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  settingsBtn: {
    width: 40,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBanner: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    zIndex: 10,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4ade80',
  },
  statusTitle: { fontSize: 14, fontWeight: '700', color: '#ffffff' },
  statusDesc: {
    fontSize: 12,
    color: '#fca5a5',
    fontWeight: '500',
    lineHeight: 20,
  },

  /* 컨텐츠 영역 */
  content: {
    paddingHorizontal: 24,
    marginTop: -36,
    gap: 20,
    zIndex: 20,
  },

  /* SOS 버튼 카드 */
  sosCard: {
    backgroundColor: '#ffffff',
    borderRadius: 32,
    padding: 28,
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    borderWidth: 2,
    borderColor: '#fee2e2',
  },
  sosIconWrapper: {
    width: 96,
    height: 96,
    backgroundColor: '#fef2f2',
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  sosRing: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#f87171',
  },
  sosTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
  },
  sosDesc: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    maxWidth: 220,
    lineHeight: 20,
  },

  /* 공통 카드 */
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
    gap: 16,
  },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  divider: { height: 1, backgroundColor: '#f3f4f6' },

  /* 프로토콜 */
  protocolItem: { flexDirection: 'row', gap: 16, alignItems: 'flex-start' },
  protocolIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  protocolTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  protocolName: { fontSize: 14, fontWeight: '700', color: '#111827' },
  protocolOn: { fontSize: 12, fontWeight: '700', color: '#16a34a' },
  protocolDesc: { fontSize: 11, color: '#6b7280', lineHeight: 18 },

  /* 추가 버튼 */
  addBtn: {
    backgroundColor: '#eff6ff',
    borderRadius: 99,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  addBtnText: { fontSize: 12, fontWeight: '700', color: '#2563eb' },
});
