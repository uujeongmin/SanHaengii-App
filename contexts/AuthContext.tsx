import { initializeKakaoSDK } from "@react-native-kakao/core";
import {
  login as kakaoLogin,
  logout as kakaoLogout,
} from "@react-native-kakao/user";
import * as SecureStore from "expo-secure-store";
import React, {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { apiService, type AuthUser, type UserProfileInput } from "../data/api";

const AUTH_TOKEN_KEY = "sanhaengii.authToken";
const AUTH_MODE_KEY = "sanhaengii.authMode";
const KAKAO_NATIVE_APP_KEY = process.env.EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY;

let kakaoSdkInitialized = false;

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isGuest: boolean;
  isLoading: boolean;
  isSigningIn: boolean;
  signInWithKakao: () => Promise<void>;
  signInAsGuest: () => Promise<void>;
  completeProfile: (profile: UserProfileInput) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const GUEST_USER: AuthUser = {
  id: 0,
  socialType: "guest",
  socialId: "guest",
  nickname: "게스트",
  email: null,
  name: null,
  age: null,
  gender: null,
  guardianNumber: null,
};

function isAuthUser(value: unknown): value is AuthUser {
  return (
    !!value &&
    typeof value === "object" &&
    "id" in value &&
    "socialId" in value &&
    "socialType" in value
  );
}

async function ensureKakaoSdkInitialized() {
  if (kakaoSdkInitialized) return;

  if (!KAKAO_NATIVE_APP_KEY) {
    throw new Error(
      "EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY가 .env에 설정되어 있지 않습니다.",
    );
  }

  await initializeKakaoSDK(KAKAO_NATIVE_APP_KEY);
  kakaoSdkInitialized = true;
}

export function getUserDisplayName(user: AuthUser | null | undefined) {
  return user?.nickname || user?.name || user?.email || "산행러";
}

export function getUserInitial(user: AuthUser | null | undefined) {
  return getUserDisplayName(user).trim().charAt(0) || "산";
}

export function needsProfileSetup(user: AuthUser | null | undefined) {
  if (!user || user.socialType === "guest") return false;

  return !user.nickname || !user.name || !user.age || !user.gender;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function hydrateAuth() {
      try {
        await ensureKakaoSdkInitialized();
      } catch (error) {
        console.warn("[Auth] Kakao SDK initialization skipped:", error);
      }

      try {
        const storedMode = await SecureStore.getItemAsync(AUTH_MODE_KEY);
        if (storedMode === "guest") {
          if (isMounted) {
            setToken(null);
            setUser(GUEST_USER);
          }
          return;
        }

        const storedToken = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
        if (!storedToken) return;

        const currentUser = await apiService.getMe(storedToken);
        if (!isAuthUser(currentUser)) {
          throw new Error("저장된 토큰으로 사용자 정보를 확인하지 못했습니다.");
        }

        if (isMounted) {
          setToken(storedToken);
          setUser(currentUser);
        }
      } catch (error) {
        console.warn("[Auth] Stored session is invalid:", error);
        await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    hydrateAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  const signInWithKakao = useCallback(async () => {
    setIsSigningIn(true);
    try {
      await ensureKakaoSdkInitialized();

      const kakaoToken = await kakaoLogin({
        useKakaoAccountLogin: true,
      });


      if (!kakaoToken.accessToken) {
        throw new Error("카카오 accessToken을 받지 못했습니다.");
      }

      const loginResponse = await apiService.loginWithKakao(
        kakaoToken.accessToken,
      );


      if (!loginResponse.success || !loginResponse.token) {
        throw new Error("백엔드 로그인 응답이 올바르지 않습니다.");
      }

      await SecureStore.setItemAsync(AUTH_MODE_KEY, "user");
      await SecureStore.setItemAsync(AUTH_TOKEN_KEY, loginResponse.token);
      setToken(loginResponse.token);
      setUser(loginResponse.user);
    } finally {
      setIsSigningIn(false);
    }
  }, []);

  const signInAsGuest = useCallback(async () => {
    await SecureStore.setItemAsync(AUTH_MODE_KEY, "guest");
    await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
    setToken(null);
    setUser(GUEST_USER);
  }, []);

  const completeProfile = useCallback(
    async (profile: UserProfileInput) => {
      if (!user) {
        throw new Error("로그인 정보가 없습니다.");
      }

      if (user.socialType === "guest") {
        setUser({
          ...GUEST_USER,
          ...profile,
          socialType: "guest",
          socialId: "guest",
        });
        return;
      }

      const updatedUser = await apiService.updateUserProfile(
        user.id,
        profile,
        token,
      );
      setUser(updatedUser);
    },
    [token, user],
  );

  const signOut = useCallback(async () => {
    await SecureStore.deleteItemAsync(AUTH_MODE_KEY);
    await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
    setToken(null);
    setUser(null);

    try {
      await kakaoLogout();
    } catch (error) {
      console.warn("[Auth] Kakao logout skipped:", error);
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      isGuest: user?.socialType === "guest",
      isLoading,
      isSigningIn,
      signInWithKakao,
      signInAsGuest,
      completeProfile,
      signOut,
    }),
    [
      completeProfile,
      isLoading,
      isSigningIn,
      signInAsGuest,
      signInWithKakao,
      signOut,
      token,
      user,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
