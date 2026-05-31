import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as SecureStore from "expo-secure-store";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { RootStackParamList } from "../App";
import {
  getUserDisplayName,
  getUserInitial,
  useAuth,
} from "../contexts/AuthContext";
import {
  apiService,
  type Badge,
  type HikingRecord,
  type UserBadge,
} from "../data/api";
import {
  createBadgeStats,
  getBadgeProgress,
  getEarnedBadgeIds,
} from "../data/badges";

type Nav = NativeStackNavigationProp<RootStackParamList>;
type MenuItemKey = "notifications" | "safety" | "account";

const MENU_ITEMS = [
  {
    key: "notifications",
    icon: "notifications-outline" as const,
    label: "알림 설정",
    desc: "산행, 안전, 배지 알림 관리",
  },
  {
    key: "safety",
    icon: "shield-outline" as const,
    label: "안전 설정",
    desc: "보호자 연락처와 신고 설정",
  },
  {
    key: "account",
    icon: "person-circle-outline" as const,
    label: "계정 설정",
    desc: "닉네임과 보호자 연락처 수정",
  },
] satisfies Array<{
  key: MenuItemKey;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  desc: string;
}>;

const PROFILE_NOTIFICATION_SETTINGS_KEY =
  "sanhaengii.profileNotificationSettings";

const DEFAULT_NOTIFICATION_SETTINGS = {
  hikeReminder: true,
  safetyAlert: true,
  badgeAlert: true,
};

type NotificationSettingKey = keyof typeof DEFAULT_NOTIFICATION_SETTINGS;

const NOTIFICATION_OPTIONS: Array<{
  key: NotificationSettingKey;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  desc: string;
}> = [
  {
    key: "hikeReminder",
    icon: "calendar-outline",
    title: "산행 리마인더",
    desc: "산행 전 준비 알림을 받을게요.",
  },
  {
    key: "safetyAlert",
    icon: "warning-outline",
    title: "안전 알림",
    desc: "이상 징후와 긴급 신고 상태를 알려줘요.",
  },
  {
    key: "badgeAlert",
    icon: "ribbon-outline",
    title: "배지 알림",
    desc: "새 배지와 성취 알림을 받을게요.",
  },
];

const GENDER_OPTIONS = [
  { label: "남성", value: "male" },
  { label: "여성", value: "female" },
  { label: "선택 안 함", value: "none" },
];

function safeNumber(value: number | null | undefined) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function cleanProfileText(value: string) {
  const text = value.trim();
  return text.length > 0 ? text : null;
}

function estimateCalories(record: HikingRecord) {
  const distance = safeNumber(record.distanceKm);
  const duration = safeNumber(record.durationMinutes);
  const elevation = safeNumber(record.elevationGainM);
  const heartRate = safeNumber(record.avgHeartRate);
  return Math.round(
    distance * 55 +
      duration * 4.5 +
      elevation * 0.35 +
      Math.max(0, heartRate - 100) * 1.2,
  );
}

function estimateSteps(record: HikingRecord) {
  const savedSteps = safeNumber(record.steps);
  if (savedSteps > 0) return Math.round(savedSteps);

  const distance = safeNumber(record.distanceKm);
  return Math.round(distance * 1400);
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
  if (!value) return "날짜 없음";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "날짜 없음";
  return date.toLocaleDateString("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "short",
    day: "numeric",
  });
}

export default function ProfileScreen() {
  const navigation = useNavigation<Nav>();
  const { completeProfile, isGuest, signOut, token, user } = useAuth();
  const [records, setRecords] = useState<HikingRecord[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [userBadges, setUserBadges] = useState<UserBadge[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notificationModalVisible, setNotificationModalVisible] =
    useState(false);
  const [accountSettingsModalVisible, setAccountSettingsModalVisible] =
    useState(false);
  const [notificationSettings, setNotificationSettings] = useState(
    DEFAULT_NOTIFICATION_SETTINGS,
  );
  const [accountNickname, setAccountNickname] = useState(user?.nickname ?? "");
  const [accountName, setAccountName] = useState(user?.name ?? "");
  const [accountAge, setAccountAge] = useState(user?.age ?? "");
  const [accountGender, setAccountGender] = useState(user?.gender ?? "");
  const [accountGuardianNumber, setAccountGuardianNumber] = useState(
    user?.guardianNumber ?? "",
  );
  const [isSavingAccount, setIsSavingAccount] = useState(false);
  const [accountErrorMessage, setAccountErrorMessage] = useState<string | null>(
    null,
  );

  const displayName = getUserDisplayName(user);
  const userInitial = getUserInitial(user);
  const email = isGuest
    ? "게스트 모드로 이용 중"
    : (user?.email ?? "카카오 계정으로 로그인됨");
  const guardianNumber =
    user?.guardianNumber ?? "등록된 보호자 번호가 없습니다.";

  useEffect(() => {
    let isMounted = true;

    async function hydrateNotificationSettings() {
      try {
        const raw = await SecureStore.getItemAsync(
          PROFILE_NOTIFICATION_SETTINGS_KEY,
        );
        if (!raw || !isMounted) return;

        setNotificationSettings({
          ...DEFAULT_NOTIFICATION_SETTINGS,
          ...JSON.parse(raw),
        });
      } catch (error) {
        console.warn("[Profile] Failed to load notification settings:", error);
      }
    }

    hydrateNotificationSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    setAccountNickname(user?.nickname ?? "");
    setAccountName(user?.name ?? "");
    setAccountAge(user?.age ?? "");
    setAccountGender(user?.gender ?? "");
    setAccountGuardianNumber(user?.guardianNumber ?? "");
    setAccountErrorMessage(null);
  }, [user]);

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
            .filter((result) => result.status === "fulfilled")
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
            : "산행 기록을 불러오지 못했습니다.";
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
      icon: "triangle-outline" as const,
      label: "누적 고도",
      value: `${Math.round(stats.totalElevationM).toLocaleString()}m`,
      color: "#16a34a",
      bg: "#f0fdf4",
    },
    {
      icon: "footsteps-outline" as const,
      label: "총 산행 횟수",
      value: `${stats.recordCount}회`,
      color: "#2563eb",
      bg: "#eff6ff",
    },
    {
      icon: "time-outline" as const,
      label: "총 산행 시간",
      value: formatDuration(stats.totalDurationMinutes),
      color: "#9333ea",
      bg: "#faf5ff",
    },
    {
      icon: "flame-outline" as const,
      label: "소모 칼로리",
      value: Math.round(stats.totalCalories).toLocaleString(),
      color: "#ea580c",
      bg: "#fff7ed",
    },
  ];

  function handleSignOut() {
    Alert.alert("로그아웃", "현재 계정에서 로그아웃할까요?", [
      { text: "취소", style: "cancel" },
      { text: "로그아웃", style: "destructive", onPress: signOut },
    ]);
  }

  function updateNotificationSetting(
    key: NotificationSettingKey,
    value: boolean,
  ) {
    setNotificationSettings((prev) => {
      const next = { ...prev, [key]: value };
      SecureStore.setItemAsync(
        PROFILE_NOTIFICATION_SETTINGS_KEY,
        JSON.stringify(next),
      ).catch((error) => {
        console.warn("[Profile] Failed to save notification settings:", error);
      });
      return next;
    });
  }

  function handleMenuPress(key: MenuItemKey) {
    if (key === "notifications") {
      setNotificationModalVisible(true);
      return;
    }

    if (key === "safety") {
      navigation.navigate("MainTabs", { screen: "안전설정" });
      return;
    }

    setAccountSettingsModalVisible(true);
  }

  async function handleSaveAccountSettings() {
    setAccountErrorMessage(null);

    if (
      !cleanProfileText(accountNickname) ||
      !cleanProfileText(accountName) ||
      !cleanProfileText(accountAge)
    ) {
      setAccountErrorMessage("닉네임, 이름, 나이를 입력해주세요.");
      return;
    }

    if (!accountGender) {
      setAccountErrorMessage("성별을 선택해주세요.");
      return;
    }

    setIsSavingAccount(true);
    try {
      await completeProfile({
        nickname: cleanProfileText(accountNickname),
        name: cleanProfileText(accountName),
        age: cleanProfileText(accountAge),
        gender: cleanProfileText(accountGender),
        guardianNumber: cleanProfileText(accountGuardianNumber),
      });
      setAccountSettingsModalVisible(false);
      Alert.alert("저장 완료", "계정 정보가 업데이트되었습니다.");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "계정 정보를 저장하지 못했습니다.";
      setAccountErrorMessage(message);
      Alert.alert("저장 실패", message);
    } finally {
      setIsSavingAccount(false);
    }
  }

  function renderRecord(record: HikingRecord) {
    const calories = safeNumber(record.calories ?? estimateCalories(record));
    const elevation = safeNumber(record.elevationGainM);
    const steps = estimateSteps(record);

    return (
      <View key={record.id} style={styles.recordCard}>
        <View style={styles.recordDateBox}>
          <Text style={styles.recordDate}>
            {formatShortDate(record.createdAt)}
          </Text>
        </View>
        <View style={styles.recordInfo}>
          <Text style={styles.recordMountain} numberOfLines={1}>
            {record.mountainName || "이름 없는 산행"}
          </Text>
          <Text style={styles.recordCourse} numberOfLines={1}>
            {record.courseName || "코스 정보 없음"}
          </Text>
          <View style={styles.recordMetaRow}>
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={12} color="#9ca3af" />
              <Text style={styles.metaText}>
                {formatDuration(safeNumber(record.durationMinutes))}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="location-outline" size={12} color="#9ca3af" />
              <Text style={styles.metaText}>
                {safeNumber(record.distanceKm).toFixed(1)}km
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="footsteps-outline" size={12} color="#2563eb" />
              <Text style={styles.metaText}>{steps.toLocaleString()}걸음</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="flame-outline" size={12} color="#fb923c" />
              <Text style={styles.metaText}>{calories.toLocaleString()}</Text>
            </View>
          </View>
        </View>
        <Text style={styles.recordElevation}>
          +{Math.round(elevation).toLocaleString()}m
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
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
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{ marginBottom: 16 }}
          >
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
                  {isGuest
                    ? "게스트 모드"
                    : `Lv.${Math.max(1, earnedBadges.length + 1)} 산행러`}
                </Text>
              </View>
              <Text style={styles.joinDate}>
                {stats.recordCount > 0
                  ? `${stats.uniqueMountainCount}개 산에서 ${stats.recordCount}번 산행`
                  : "산행이와 함께하는 중"}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.bioCard}>
          <Text style={styles.bioTitle}>
            오늘도 안전한 산행을 준비하고 있어요.
          </Text>
          <Text style={styles.bioText}>{email}</Text>
          <Text style={styles.bioText}>이름: {user?.name ?? "미입력"}</Text>
          <Text style={styles.bioText}>
            나이: {user?.age ?? "미입력"} · 성별: {user?.gender ?? "미입력"}
          </Text>
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
              <View
                key={stat.label}
                style={[styles.statCard, { backgroundColor: stat.bg }]}
              >
                <Ionicons name={stat.icon} size={20} color={stat.color} />
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={[styles.statLabel, { color: stat.color }]}>
                  {stat.label}
                </Text>
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
                {isGuest
                  ? "게스트 기록은 저장되지 않아요"
                  : "아직 저장된 산행 기록이 없어요"}
              </Text>
              <Text style={styles.emptyText}>
                내비게이션 화면에서 산행 기록을 저장해보세요.
              </Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>획득한 배지</Text>
            <Text style={styles.sectionCount}>
              {earnedBadges.length}/{badges.length}
            </Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 10 }}
          >
            {[...earnedBadges, ...lockedBadges].map((badge) => {
              const isEarned = earnedBadges.some(
                (earned) => earned.id === badge.id,
              );
              return (
                <View
                  key={badge.id}
                  style={[
                    styles.badgeCard,
                    !isEarned && styles.badgeCardLocked,
                  ]}
                >
                  <Text
                    style={[
                      styles.badgeEmoji,
                      !isEarned && styles.badgeLockedEmoji,
                    ]}
                  >
                    {badge.icon || "🏅"}
                  </Text>
                  <Text
                    style={[
                      styles.badgeName,
                      !isEarned && styles.badgeNameLocked,
                    ]}
                  >
                    {badge.name}
                  </Text>
                  <Text style={styles.badgeDesc}>
                    {badge.description || "달성 조건을 확인해보세요"}
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
                  if ("screen" in item && item.screen) {
                    navigation.navigate(item.screen as any);
                  }
                }}
              >
                <View style={styles.menuLeft}>
                  <Ionicons name={item.icon} size={20} color="#6b7280" />
                  <View style={styles.menuTextBlock}>
                    <Text style={styles.menuLabel}>{item.label}</Text>
                    <Text style={styles.menuDesc}>{item.desc}</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <TouchableOpacity
            style={styles.logoutBtn}
            activeOpacity={0.7}
            onPress={handleSignOut}
          >
            <Ionicons name="log-out-outline" size={18} color="#ef4444" />
            <Text style={styles.logoutText}>로그아웃</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal
        visible={notificationModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setNotificationModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.settingsModal}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalTitle}>알림 설정</Text>
                <Text style={styles.modalDesc}>
                  앱에서 받을 알림 항목을 선택하세요.
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setNotificationModalVisible(false)}
                activeOpacity={0.75}
              >
                <Ionicons name="close" size={20} color="#111827" />
              </TouchableOpacity>
            </View>

            {NOTIFICATION_OPTIONS.map((option) => (
              <View key={option.key} style={styles.settingRow}>
                <View style={styles.settingLeft}>
                  <View style={styles.settingIcon}>
                    <Ionicons name={option.icon} size={18} color="#16a34a" />
                  </View>
                  <View style={styles.settingTextBlock}>
                    <Text style={styles.settingTitle}>{option.title}</Text>
                    <Text style={styles.settingDesc}>{option.desc}</Text>
                  </View>
                </View>
                <Switch
                  value={notificationSettings[option.key]}
                  onValueChange={(value) =>
                    updateNotificationSetting(option.key, value)
                  }
                  trackColor={{ false: "#e5e7eb", true: "#bbf7d0" }}
                  thumbColor={
                    notificationSettings[option.key] ? "#16a34a" : "#f9fafb"
                  }
                />
              </View>
            ))}

            <TouchableOpacity
              style={styles.modalPrimaryButton}
              onPress={() => setNotificationModalVisible(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.modalPrimaryButtonText}>완료</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={accountSettingsModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAccountSettingsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.accountKeyboardView}
          >
            <View style={[styles.settingsModal, styles.accountModal]}>
              <View style={styles.modalHeaderRow}>
                <View>
                  <Text style={styles.modalTitle}>계정 설정</Text>
                  <Text style={styles.modalDesc}>
                    산행 기록과 안전 기능에 사용할 정보를 수정합니다.
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={() => setAccountSettingsModalVisible(false)}
                  activeOpacity={0.75}
                >
                  <Ionicons name="close" size={20} color="#111827" />
                </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.accountForm}
              >
                <View style={styles.accountStatusCard}>
                  <Ionicons
                    name={isGuest ? "person-outline" : "person-circle-outline"}
                    size={18}
                    color="#166534"
                  />
                  <Text style={styles.accountStatusText}>
                    {isGuest
                      ? "게스트 모드로 이용 중"
                      : "카카오 계정으로 로그인 중"}
                  </Text>
                </View>

                <AccountInput
                  label="닉네임"
                  value={accountNickname}
                  onChangeText={setAccountNickname}
                  placeholder="앱에서 사용할 이름"
                />
                <AccountInput
                  label="이름"
                  value={accountName}
                  onChangeText={setAccountName}
                  placeholder="실명 또는 표시 이름"
                />
                <AccountInput
                  label="나이"
                  value={accountAge}
                  onChangeText={setAccountAge}
                  placeholder="예: 29"
                  keyboardType="number-pad"
                  maxLength={3}
                />

                <View style={styles.accountField}>
                  <Text style={styles.accountLabel}>성별</Text>
                  <View style={styles.genderRow}>
                    {GENDER_OPTIONS.map((option) => {
                      const selected = accountGender === option.value;
                      return (
                        <TouchableOpacity
                          key={option.value}
                          style={[
                            styles.genderButton,
                            selected && styles.genderButtonSelected,
                          ]}
                          onPress={() => setAccountGender(option.value)}
                          activeOpacity={0.78}
                        >
                          <Text
                            style={[
                              styles.genderText,
                              selected && styles.genderTextSelected,
                            ]}
                          >
                            {option.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                <AccountInput
                  label="보호자 연락처"
                  value={accountGuardianNumber}
                  onChangeText={setAccountGuardianNumber}
                  placeholder="예: 보호자 010-1234-5678"
                  keyboardType="phone-pad"
                  helperText="긴급 상황 시 구조 요청과 안전 알림에 사용할 번호입니다."
                />

                {accountErrorMessage ? (
                  <Text style={styles.accountErrorText}>
                    {accountErrorMessage}
                  </Text>
                ) : null}

                <TouchableOpacity
                  style={[
                    styles.modalPrimaryButton,
                    isSavingAccount && styles.modalPrimaryButtonDisabled,
                  ]}
                  onPress={handleSaveAccountSettings}
                  disabled={isSavingAccount}
                  activeOpacity={0.82}
                >
                  {isSavingAccount ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.modalPrimaryButtonText}>
                      계정 정보 저장
                    </Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.settingActionButton,
                    styles.settingDangerButton,
                  ]}
                  onPress={handleSignOut}
                  activeOpacity={0.78}
                >
                  <Ionicons name="log-out-outline" size={18} color="#ef4444" />
                  <Text style={styles.settingDangerText}>로그아웃</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function AccountInput({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  maxLength,
  helperText,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: "default" | "number-pad" | "phone-pad";
  maxLength?: number;
  helperText?: string;
}) {
  return (
    <View style={styles.accountField}>
      <Text style={styles.accountLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9ca3af"
        keyboardType={keyboardType}
        maxLength={maxLength}
        style={styles.accountInput}
      />
      {helperText ? (
        <Text style={styles.accountHelperText}>{helperText}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f9fafb" },
  headerBg: {
    backgroundColor: "#16a34a",
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 64,
  },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  avatarWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    overflow: "hidden",
    borderWidth: 3,
    borderColor: "#fff",
  },
  avatarInitial: {
    flex: 1,
    backgroundColor: "#dcfce7",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitialText: {
    fontSize: 26,
    fontWeight: "900",
    color: "#15803d",
  },
  userName: { fontSize: 22, fontWeight: "700", color: "#fff" },
  levelBadge: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 99,
    alignSelf: "flex-start",
    marginTop: 4,
  },
  levelText: { fontSize: 12, color: "#dcfce7", fontWeight: "700" },
  joinDate: { fontSize: 11, color: "#bbf7d0", marginTop: 4 },
  bioCard: {
    backgroundColor: "#fff",
    marginHorizontal: 24,
    marginTop: -40,
    borderRadius: 20,
    padding: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    borderWidth: 1,
    borderColor: "#f3f4f6",
    gap: 5,
  },
  bioTitle: {
    fontSize: 14,
    color: "#4b5563",
    fontWeight: "700",
    marginBottom: 3,
  },
  bioText: { fontSize: 12, color: "#9ca3af" },
  section: { paddingHorizontal: 24, marginTop: 20 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12,
  },
  sectionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionCount: { fontSize: 12, color: "#9ca3af", fontWeight: "600" },
  loadingCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  loadingText: { color: "#6b7280", fontSize: 12, fontWeight: "600" },
  errorCard: {
    backgroundColor: "#fef2f2",
    borderColor: "#fecaca",
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  errorText: { flex: 1, color: "#b91c1c", fontSize: 12, lineHeight: 18 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statCard: { width: "48%", borderRadius: 18, padding: 16 },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginTop: 6,
  },
  statLabel: { fontSize: 11, fontWeight: "600", marginTop: 2 },
  recordCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#f3f4f6",
    elevation: 1,
    shadowColor: "#000",
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
    backgroundColor: "#f0fdf4",
    alignItems: "center",
    justifyContent: "center",
  },
  recordDate: { fontSize: 11, color: "#15803d", fontWeight: "800" },
  recordInfo: { flex: 1, minWidth: 0 },
  recordMountain: { fontSize: 14, color: "#111827", fontWeight: "800" },
  recordCourse: {
    fontSize: 12,
    color: "#16a34a",
    fontWeight: "600",
    marginTop: 2,
  },
  recordMetaRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 6,
    flexWrap: "wrap",
  },
  recordElevation: { fontSize: 13, color: "#111827", fontWeight: "800" },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 3 },
  metaText: { fontSize: 11, color: "#6b7280" },
  emptyCard: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 22,
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#f3f4f6",
  },
  emptyTitle: { color: "#374151", fontSize: 14, fontWeight: "800" },
  emptyText: { color: "#9ca3af", fontSize: 12 },
  badgeCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 14,
    alignItems: "center",
    gap: 6,
    width: 104,
    minHeight: 128,
    borderWidth: 1,
    borderColor: "#f3f4f6",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  badgeCardLocked: { opacity: 0.48 },
  badgeEmoji: { fontSize: 28 },
  badgeLockedEmoji: { opacity: 0.55 },
  badgeName: {
    fontSize: 12,
    color: "#374151",
    fontWeight: "800",
    textAlign: "center",
  },
  badgeNameLocked: { color: "#6b7280" },
  badgeDesc: {
    fontSize: 10,
    color: "#9ca3af",
    textAlign: "center",
    lineHeight: 14,
  },
  menuCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#f3f4f6",
  },
  menuRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  menuRowBorder: { borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  menuLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  menuTextBlock: { flex: 1, minWidth: 0 },
  menuLabel: { fontSize: 14, color: "#1f2937", fontWeight: "700" },
  menuDesc: { fontSize: 11, color: "#9ca3af", marginTop: 2 },
  logoutBtn: {
    backgroundColor: "#fef2f2",
    borderRadius: 18,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  logoutText: { fontSize: 14, fontWeight: "600", color: "#ef4444" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.42)",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  settingsModal: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 20,
    gap: 14,
  },
  accountKeyboardView: { width: "100%" },
  accountModal: {
    maxHeight: "88%",
  },
  accountForm: {
    gap: 14,
    paddingBottom: 2,
  },
  accountStatusCard: {
    backgroundColor: "#f0fdf4",
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#bbf7d0",
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  accountStatusText: {
    flex: 1,
    color: "#166534",
    fontSize: 12,
    fontWeight: "800",
  },
  accountField: {
    gap: 8,
  },
  accountLabel: {
    fontSize: 12,
    color: "#374151",
    fontWeight: "800",
  },
  accountInput: {
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#f9fafb",
    paddingHorizontal: 14,
    fontSize: 14,
    color: "#111827",
  },
  accountHelperText: {
    fontSize: 11,
    color: "#6b7280",
    lineHeight: 16,
  },
  genderRow: {
    flexDirection: "row",
    gap: 8,
  },
  genderButton: {
    flex: 1,
    height: 42,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#f9fafb",
    alignItems: "center",
    justifyContent: "center",
  },
  genderButtonSelected: {
    backgroundColor: "#dcfce7",
    borderColor: "#86efac",
  },
  genderText: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "800",
  },
  genderTextSelected: {
    color: "#166534",
  },
  accountErrorText: {
    color: "#dc2626",
    fontSize: 12,
    lineHeight: 18,
  },
  modalHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  modalTitle: { fontSize: 20, color: "#111827", fontWeight: "900" },
  modalDesc: { fontSize: 12, color: "#6b7280", marginTop: 4 },
  modalCloseButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f3f4f6",
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 4,
  },
  settingLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#f0fdf4",
    alignItems: "center",
    justifyContent: "center",
  },
  settingTextBlock: { flex: 1, minWidth: 0 },
  settingTitle: { fontSize: 14, color: "#111827", fontWeight: "800" },
  settingDesc: { fontSize: 11, color: "#6b7280", lineHeight: 16, marginTop: 2 },
  modalPrimaryButton: {
    height: 46,
    borderRadius: 14,
    backgroundColor: "#16a34a",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  modalPrimaryButtonDisabled: {
    opacity: 0.72,
  },
  modalPrimaryButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "900",
  },
  appInfoCard: {
    backgroundColor: "#f9fafb",
    borderRadius: 16,
    padding: 14,
    gap: 10,
  },
  appInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  appInfoLabel: { fontSize: 12, color: "#6b7280", fontWeight: "700" },
  appInfoValue: { fontSize: 12, color: "#111827", fontWeight: "900" },
  settingActionButton: {
    height: 48,
    borderRadius: 15,
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  settingActionText: { fontSize: 13, color: "#166534", fontWeight: "900" },
  settingDangerButton: {
    backgroundColor: "#fef2f2",
    borderColor: "#fecaca",
  },
  settingDangerText: { fontSize: 13, color: "#ef4444", fontWeight: "900" },
});
