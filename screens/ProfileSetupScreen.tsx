import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "../contexts/AuthContext";

const GENDER_OPTIONS = [
  { label: "남성", value: "male" },
  { label: "여성", value: "female" },
  { label: "선택 안 함", value: "none" },
];

function cleanText(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export default function ProfileSetupScreen() {
  const { completeProfile, signOut, user } = useAuth();
  const [nickname, setNickname] = useState(user?.nickname ?? "");
  const [name, setName] = useState(user?.name ?? "");
  const [age, setAge] = useState(user?.age ?? "");
  const [gender, setGender] = useState(user?.gender ?? "");
  const [guardianNumber, setGuardianNumber] = useState(
    user?.guardianNumber ?? "",
  );
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit() {
    setErrorMessage(null);

    if (!cleanText(nickname) || !cleanText(name) || !cleanText(age)) {
      setErrorMessage("닉네임, 이름, 나이를 입력해주세요.");
      return;
    }

    if (!gender) {
      setErrorMessage("성별을 선택해주세요.");
      return;
    }

    setIsSaving(true);
    try {
      await completeProfile({
        nickname: cleanText(nickname),
        name: cleanText(name),
        age: cleanText(age),
        gender,
        guardianNumber: cleanText(guardianNumber),
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "사용자 정보를 저장하지 못했습니다.";
      setErrorMessage(message);
      Alert.alert("저장 실패", message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Ionicons name="person-add-outline" size={26} color="#166534" />
            </View>
            <Text style={styles.title}>추가 정보를 입력해주세요</Text>
            <Text style={styles.subtitle}>
              산행 기록과 안전 기능에 사용할 기본 정보입니다.
            </Text>
          </View>

          <View style={styles.formCard}>
            <ProfileInput
              label="닉네임"
              value={nickname}
              onChangeText={setNickname}
              placeholder="앱에서 사용할 이름"
            />
            <ProfileInput
              label="이름"
              value={name}
              onChangeText={setName}
              placeholder="실명 또는 표시 이름"
            />
            <ProfileInput
              label="나이"
              value={age}
              onChangeText={setAge}
              placeholder="예: 29"
              keyboardType="number-pad"
              maxLength={3}
            />

            <View style={styles.field}>
              <Text style={styles.label}>성별</Text>
              <View style={styles.segmentRow}>
                {GENDER_OPTIONS.map((option) => {
                  const selected = gender === option.value;
                  return (
                    <Pressable
                      key={option.value}
                      style={[
                        styles.segmentButton,
                        selected && styles.segmentButtonSelected,
                      ]}
                      onPress={() => setGender(option.value)}
                    >
                      <Text
                        style={[
                          styles.segmentText,
                          selected && styles.segmentTextSelected,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <ProfileInput
              label="보호자 연락처"
              value={guardianNumber}
              onChangeText={setGuardianNumber}
              placeholder="예: 010-1234-5678"
              keyboardType="phone-pad"
            />

            {errorMessage && (
              <Text style={styles.errorText}>{errorMessage}</Text>
            )}

            <Pressable
              style={({ pressed }) => [
                styles.submitButton,
                pressed && !isSaving && styles.submitButtonPressed,
                isSaving && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.submitText}>저장하고 시작하기</Text>
              )}
            </Pressable>

            <Pressable
              style={styles.logoutButton}
              onPress={signOut}
              disabled={isSaving}
            >
              <Text style={styles.logoutText}>다른 계정으로 로그인</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ProfileInput({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  maxLength,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: "default" | "number-pad" | "phone-pad";
  maxLength?: number;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9ca3af"
        keyboardType={keyboardType}
        maxLength={maxLength}
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  keyboardView: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 20,
  },
  iconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#dcfce7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: "900",
    color: "#111827",
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    color: "#6b7280",
  },
  formCard: {
    backgroundColor: "#ffffff",
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: "#f3f4f6",
    elevation: 2,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: "800",
    color: "#374151",
    marginBottom: 8,
  },
  input: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#f9fafb",
    paddingHorizontal: 14,
    fontSize: 15,
    color: "#111827",
  },
  segmentRow: {
    flexDirection: "row",
    gap: 8,
  },
  segmentButton: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#f9fafb",
    alignItems: "center",
    justifyContent: "center",
  },
  segmentButtonSelected: {
    backgroundColor: "#dcfce7",
    borderColor: "#86efac",
  },
  segmentText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6b7280",
  },
  segmentTextSelected: {
    color: "#166534",
  },
  errorText: {
    color: "#dc2626",
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 12,
  },
  submitButton: {
    height: 52,
    borderRadius: 15,
    backgroundColor: "#16a34a",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  submitButtonPressed: {
    opacity: 0.86,
  },
  submitButtonDisabled: {
    opacity: 0.72,
  },
  submitText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "900",
  },
  logoutButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 16,
  },
  logoutText: {
    color: "#6b7280",
    fontSize: 13,
    fontWeight: "700",
  },
});
