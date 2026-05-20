import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "../contexts/AuthContext";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&q=80&w=1200";

export default function LoginScreen() {
  const { isSigningIn, signInAsGuest, signInWithKakao } = useAuth();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleKakaoLogin() {
    setErrorMessage(null);
    try {
      await signInWithKakao();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "카카오 로그인 중 문제가 발생했습니다.";
      setErrorMessage(message);
      Alert.alert("로그인 실패", message);
    }
  }

  async function handleGuestLogin() {
    setErrorMessage(null);
    await signInAsGuest();
  }

  return (
    <ImageBackground
      source={{ uri: HERO_IMAGE }}
      resizeMode="cover"
      style={styles.background}
    >
      <View style={styles.overlay} />
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <View style={styles.brandBlock}>
          <View style={styles.logoCircle}>
            <Ionicons name="trail-sign-outline" size={30} color="#14532d" />
          </View>
          <Text style={styles.brand}>산행이</Text>
          <Text style={styles.subtitle}>오늘의 산행을 안전하게 시작해요</Text>
        </View>

        <View style={styles.loginPanel}>
          <Text style={styles.panelTitle}>로그인</Text>
          <Text style={styles.panelDesc}>
            서버 준비 전에는 게스트로 먼저 둘러볼 수 있어요
          </Text>

          <Pressable
            style={({ pressed }) => [
              styles.kakaoButton,
              pressed && !isSigningIn && styles.kakaoButtonPressed,
              isSigningIn && styles.kakaoButtonDisabled,
            ]}
            onPress={handleKakaoLogin}
            disabled={isSigningIn}
          >
            {isSigningIn ? (
              <ActivityIndicator color="#191919" />
            ) : (
              <>
                <Ionicons
                  name="chatbubble"
                  size={18}
                  color="#191919"
                  style={styles.kakaoIcon}
                />
                <Text style={styles.kakaoButtonText}>카카오로 로그인</Text>
              </>
            )}
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.guestButton,
              pressed && styles.guestButtonPressed,
            ]}
            onPress={handleGuestLogin}
            disabled={isSigningIn}
          >
            <Ionicons
              name="person-outline"
              size={18}
              color="#166534"
              style={styles.guestIcon}
            />
            <Text style={styles.guestButtonText}>게스트로 둘러보기</Text>
          </Pressable>

          {errorMessage && (
            <Text style={styles.errorText} numberOfLines={3}>
              {errorMessage}
            </Text>
          )}
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(5, 18, 11, 0.48)",
  },
  safe: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 52,
    paddingBottom: 24,
  },
  brandBlock: {
    maxWidth: 280,
  },
  logoCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "rgba(240, 253, 244, 0.92)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  brand: {
    fontSize: 42,
    fontWeight: "900",
    color: "#ffffff",
  },
  subtitle: {
    marginTop: 8,
    fontSize: 16,
    lineHeight: 24,
    color: "#dcfce7",
    fontWeight: "600",
  },
  loginPanel: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 22,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 8,
  },
  panelTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
  },
  panelDesc: {
    marginTop: 4,
    marginBottom: 18,
    fontSize: 13,
    color: "#6b7280",
  },
  kakaoButton: {
    height: 52,
    borderRadius: 14,
    backgroundColor: "#FEE500",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  kakaoButtonPressed: {
    opacity: 0.85,
  },
  kakaoButtonDisabled: {
    opacity: 0.7,
  },
  kakaoIcon: {
    marginRight: 8,
  },
  kakaoButtonText: {
    color: "#191919",
    fontSize: 15,
    fontWeight: "800",
  },
  guestButton: {
    height: 50,
    borderRadius: 14,
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginTop: 10,
  },
  guestButtonPressed: {
    opacity: 0.82,
  },
  guestIcon: {
    marginRight: 8,
  },
  guestButtonText: {
    color: "#166534",
    fontSize: 15,
    fontWeight: "800",
  },
  errorText: {
    marginTop: 12,
    color: "#dc2626",
    fontSize: 12,
    lineHeight: 18,
  },
});
