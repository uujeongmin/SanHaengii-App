import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiService } from '../data/api';

export default function SafetyScreen() {
  /* ── 배경 글로우 펄스 ── */
  const bgPulse = useRef(new Animated.Value(1)).current;
  /* ── SOS 링 페이드 ── */
  const sosRingOpacity = useRef(new Animated.Value(0.5)).current;

  /* ── 이상 징후 상태 ── */
  const [isAnomaly, setIsAnomaly] = useState(false);
  const [anomalyMessage, setAnomalyMessage] = useState('정상 상태');

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

  /**
   * [Simulate] 워치에서 온 센서 데이터 수신 및 이상 징후 확인
   */
  const simulateWatchSignal = async (type: 'NORMAL' | 'FALL') => {
    console.log(`[Watch] Simulating sensor data: ${type}`);
    
    // 시뮬레이션용 데이터
    const sensorData = {
      accelerometer: type === 'FALL' ? { x: 35, y: 0, z: 0 } : { x: 0.1, y: 9.8, z: 0 },
      gyroscope: { x: 0, y: 0, z: 0 },
      heart_rate: 85
    };

    try {
      const result = await apiService.checkAnomaly(sensorData);
      setIsAnomaly(result.is_anomaly);
      setAnomalyMessage(result.message);

      if (result.is_anomaly) {
        Alert.alert(
          '⚠️ 이상 징후 감지',
          `${result.message}\n구조 요청을 보내시겠습니까? (30초 후 자동 신고)`,
          [
            { text: '상태 괜찮음', onPress: () => {
              setIsAnomaly(false);
              setAnomalyMessage('정상 상태');
            }, style: 'cancel' },
            { text: '구조 요청', onPress: () => Alert.alert('신고 완료', '119 및 보호자에게 위치가 전송되었습니다.') },
          ]
        );
      }
    } catch (error) {
      console.error('Failed to check anomaly:', error);
      Alert.alert('에러', '백엔드 서버와 통신할 수 없습니다.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ── 빨간 헤더 ── */}
        <View style={[styles.header, isAnomaly && { backgroundColor: '#7f1d1d' }]}>
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

          <View style={[styles.statusBanner, isAnomaly && styles.statusBannerAnomaly]}>
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, isAnomaly && { backgroundColor: '#ef4444' }]} />
              <Text style={styles.statusTitle}>
                {isAnomaly ? '이상 징후 발생!' : '이상 징후 모니터링 중'}
              </Text>
            </View>
            <Text style={styles.statusDesc}>
              {isAnomaly ? anomalyMessage : '가속도 및 자이로 센서를 통해 급격한 낙하 또는 장기 이동 정지를 실시간으로 탐지합니다.'}
            </Text>
          </View>
        </View>

        <View style={styles.content}>
          {/* ── SOS 버튼 ── */}
          <TouchableOpacity 
            style={styles.sosCard} 
            activeOpacity={0.88}
            onLongPress={() => Alert.alert('긴급 신고', '119에 신고를 접수합니다.')}
          >
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

          {/* ── 시뮬레이션 버튼 (개발용) ── */}
          <View style={styles.simContainer}>
            <TouchableOpacity 
              style={[styles.simBtn, { backgroundColor: '#f3f4f6' }]}
              onPress={() => simulateWatchSignal('NORMAL')}
            >
              <Text style={styles.simBtnText}>정상 신호 시뮬레이션</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.simBtn, { backgroundColor: '#fee2e2' }]}
              onPress={() => simulateWatchSignal('FALL')}
            >
              <Text style={[styles.simBtnText, { color: '#dc2626' }]}>낙하 신호 시뮬레이션</Text>
            </TouchableOpacity>
          </View>

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
  statusBannerAnomaly: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderColor: 'rgba(239, 68, 68, 0.5)',
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

  /* 시뮬레이션 컨테이너 */
  simContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  simBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  simBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4b5563',
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
