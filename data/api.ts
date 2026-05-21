import { Platform } from "react-native";
import { Mountain, MountainCourse } from "./mountains";

const LOCAL_TRAIL_API_BASE_URL =
  Platform.OS === "android" ? "http://10.0.2.2:5001" : "http://localhost:5001";

/**
 * [중요] 백엔드 서버 주소 설정
 * - 인증/회원 API: Railway 서버
 * - 산/경로 API: 로컬 경로 서버
 * - 실기기 경로 서버 테스트: EXPO_PUBLIC_TRAIL_API_BASE_URL에 컴퓨터 로컬 IP 사용
 */
export const AUTH_API_BASE_URL =
  process.env.EXPO_PUBLIC_AUTH_API_BASE_URL ??
  "https://web-production-94f63.up.railway.app";

export const TRAIL_API_BASE_URL =
  process.env.EXPO_PUBLIC_TRAIL_API_BASE_URL ?? LOCAL_TRAIL_API_BASE_URL;

export const BASE_URL = TRAIL_API_BASE_URL;

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_FETCH_TIMEOUT_MS = 15000;

export interface Coordinate {
  lat: number;
  lng: number;
}

export interface RouteRequest {
  start: Coordinate;
  end: Coordinate;
}

export interface PathResult {
  route_id: string;
  path: Coordinate[];
  path_names: string[];
  summary: {
    distance_m: number;
    duration_sec: number;
    ascent_m: number;
    descent_m: number;
    total_distance_m?: number;
    total_hours?: number;
    total_minutes?: number;
    total_seconds?: number;
    eta?: string;
  };
  start_node: any;
  end_node: any;
  total_hours?: number;
  total_minutes?: number;
  total_seconds?: number;
  eta?: string;
}

export interface UnifiedMountainNode {
  id: number | string;
  lat: number;
  lng: number;
  elev?: number | null;
}

export interface UnifiedMountainCourse {
  course_id: string;
  node_ids: Array<number | string>;
  distance_km?: number | null;
  difficulty?: string | null;
  uptime?: number | null;
  downtime?: number | null;
}

export interface UnifiedMountainPath {
  id: number;
  mountain_name: string;
  region: string | null;
  height: number | null;
  description: string | null;
  nodes: UnifiedMountainNode[] | null;
  courses: UnifiedMountainCourse[] | null;
}

export interface AuthUser {
  id: number;
  socialType: string;
  socialId: string;
  nickname: string | null;
  email: string | null;
  name: string | null;
  age: string | null;
  gender: string | null;
  guardianNumber: string | null;
}

export interface UserProfileInput {
  nickname: string | null;
  name: string | null;
  age: string | null;
  gender: string | null;
  guardianNumber: string | null;
}

export interface HikingRecord {
  id: number;
  userId: number;
  mountainName: string | null;
  courseId: string | null;
  courseName: string | null;
  durationMinutes: number | null;
  distanceKm: number | null;
  calories: number | null;
  avgHeartRate: number | null;
  maxAltitude: number | null;
  elevationGainM: number | null;
  createdAt: string | null;
}

export interface CreateHikingRecordInput {
  userId: number;
  mountainName: string | null;
  courseId?: string | null;
  courseName?: string | null;
  durationMinutes: number | null;
  distanceKm: number | null;
  calories?: number | null;
  avgHeartRate: number | null;
  maxAltitude?: number | null;
  elevationGainM?: number | null;
}

export interface Badge {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  category: string | null;
  targetValue: number | null;
  createdAt: string | null;
}

export interface UserBadge {
  userId: number;
  badgeId: string;
  sourceRecordId: number | null;
  earnedAt: string | null;
}

export interface LoginResponse {
  success: boolean;
  token: string;
  user: AuthUser;
  isNewUser: boolean;
}

async function getErrorMessage(
  response: Response,
  fallbackMessage: string,
): Promise<string> {
  try {
    const data = await response.json();
    if (typeof data?.error === "string") return data.error;
    if (typeof data?.message === "string") return data.message;
    if (Array.isArray(data?.detail) && data.detail[0]?.msg) {
      return data.detail[0].msg;
    }
    if (typeof data?.detail === "string") return data.detail;
  } catch {
    // Fall back to the generic message below.
  }
  return fallbackMessage;
}

function normalizeAuthUser(row: any): AuthUser {
  return {
    id: Number(row.id),
    socialType: row.socialType ?? row.social_type ?? "kakao",
    socialId: String(row.socialId ?? row.social_id ?? ""),
    nickname: row.nickname ?? null,
    email: row.email ?? null,
    name: row.name ?? null,
    age: row.age ?? null,
    gender: row.gender ?? null,
    guardianNumber: row.guardianNumber ?? row.guardian_number ?? null,
  };
}

function toNullableNumber(value: unknown): number | null {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function normalizeHikingRecord(row: any): HikingRecord {
  const maxAltitude = toNullableNumber(row.maxAltitude ?? row.max_altitude);
  return {
    id: Number(row.id),
    userId: Number(row.userId ?? row.user_id),
    mountainName: row.mountainName ?? row.mountain_name ?? null,
    courseId: row.courseId ?? row.course_id ?? null,
    courseName: row.courseName ?? row.course_name ?? null,
    durationMinutes: toNullableNumber(
      row.durationMinutes ?? row.duration_minutes,
    ),
    distanceKm: toNullableNumber(row.distanceKm ?? row.distance_km),
    calories: toNullableNumber(row.calories),
    avgHeartRate: toNullableNumber(row.avgHeartRate ?? row.avg_heart_rate),
    maxAltitude,
    elevationGainM: toNullableNumber(
      row.elevationGainM ?? row.elevation_gain_m ?? maxAltitude,
    ),
    createdAt: row.createdAt ?? row.created_at ?? null,
  };
}

function normalizeBadge(row: any): Badge {
  return {
    id: String(row.id),
    name: row.name ?? "",
    description: row.description ?? null,
    icon: row.icon ?? null,
    category: row.category ?? null,
    targetValue: toNullableNumber(row.targetValue ?? row.target_value),
    createdAt: row.createdAt ?? row.created_at ?? null,
  };
}

function normalizeUserBadge(row: any): UserBadge {
  return {
    userId: Number(row.userId ?? row.user_id),
    badgeId: String(row.badgeId ?? row.badge_id),
    sourceRecordId: toNullableNumber(
      row.sourceRecordId ?? row.source_record_id,
    ),
    earnedAt: row.earnedAt ?? row.earned_at ?? null,
  };
}

function normalizeLoginResponse(data: any): LoginResponse {
  const token = data.token ?? data.access_token ?? data.accessToken ?? data.jwt;
  const user = data.user ?? data.data?.user ?? data.data ?? data;

  return {
    success: data.success ?? Boolean(token),
    token,
    user: normalizeAuthUser(user),
    isNewUser: data.isNewUser ?? data.is_new_user ?? false,
  };
}

function requireSupabaseConfig() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("Supabase environment variables are not configured.");
  }
  return { url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY };
}

export const apiService = {
  /**
   * 카카오 accessToken을 백엔드에 전달해 자체 JWT를 발급받습니다.
   */
  async loginWithKakao(accessToken: string): Promise<LoginResponse> {
    const url = `${AUTH_API_BASE_URL}/auth/kakao`;
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ accessToken }),
      });

      if (!response.ok) {
        const message = await getErrorMessage(
          response,
          `Failed to login with Kakao (Status: ${response.status})`,
        );
        throw new Error(message);
      }

      const data = await response.json();
      return normalizeLoginResponse(data);
    } catch (error) {
      console.error("[API] Error in loginWithKakao:", error);
      throw error;
    }
  },

  /**
   * 저장된 JWT로 현재 로그인 사용자의 정보를 조회합니다.
   */
  async getMe(token: string): Promise<AuthUser> {
    const url = `${AUTH_API_BASE_URL}/auth/me`;
    try {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const message = await getErrorMessage(
          response,
          `Failed to fetch current user (Status: ${response.status})`,
        );
        throw new Error(message);
      }

      const data = await response.json();
      return normalizeAuthUser(data.user ?? data);
    } catch (error) {
      console.error("[API] Error in getMe:", error);
      throw error;
    }
  },

  /**
   * 로그인한 사용자의 추가 프로필 정보를 users 테이블에 저장합니다.
   */
  async updateUserProfile(
    userId: number,
    profile: UserProfileInput,
    token?: string | null,
  ): Promise<AuthUser> {
    const endpoint = `${AUTH_API_BASE_URL}/data/users/${userId}`;

    const payload = {
      nickname: profile.nickname,
      name: profile.name,
      age: profile.age,
      gender: profile.gender,
      guardian_number: profile.guardianNumber,
    };
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    try {
      const response = await fetch(endpoint, {
        method: "PUT",
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const message = await getErrorMessage(
          response,
          `Failed to update user profile (Status: ${response.status})`,
        );
        throw new Error(message);
      }

      const data = await response.json();
      const row = Array.isArray(data)
        ? data[0]
        : (data.user ?? data.data ?? data.row ?? data);

      if (!row || typeof row !== "object") {
        throw new Error("업데이트된 사용자 정보를 받지 못했습니다.");
      }

      return normalizeAuthUser(row);
    } catch (error) {
      console.error("[API] Error in updateUserProfile:", error);
      throw error;
    }
  },

  /**
   * 로그인한 사용자의 산행 기록 목록을 가져옵니다.
   */
  async getHikingRecords(
    userId: number,
    token?: string | null,
  ): Promise<HikingRecord[]> {
    const query = new URLSearchParams({
      select: "*",
      limit: "500",
    });
    const endpoint = `${AUTH_API_BASE_URL}/data/hiking_records/filter?${query.toString()}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({ user_id: userId }),
      });

      if (!response.ok) {
        const message = await getErrorMessage(
          response,
          `Failed to fetch hiking records (Status: ${response.status})`,
        );
        throw new Error(message);
      }

      const data = await response.json();
      const rows = Array.isArray(data) ? data : (data.rows ?? data.data ?? []);

      return rows
        .map(normalizeHikingRecord)
        .sort((a: HikingRecord, b: HikingRecord) => {
          const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return bTime - aTime;
        });
    } catch (error) {
      console.error("[API] Error in getHikingRecords:", error);
      throw error;
    }
  },

  /**
   * 산행 종료 시 hiking_records에 새 기록을 저장합니다.
   */
  async createHikingRecord(
    record: CreateHikingRecordInput,
    token?: string | null,
  ): Promise<HikingRecord> {
    const endpoint = `${AUTH_API_BASE_URL}/data/hiking_records`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const legacyPayload = {
      user_id: record.userId,
      mountain_name: record.mountainName,
      duration_minutes: record.durationMinutes,
      distance_km: record.distanceKm,
      avg_heart_rate: record.avgHeartRate,
      max_altitude: record.maxAltitude ?? record.elevationGainM ?? null,
    };

    const enrichedPayload = {
      ...legacyPayload,
      course_id: record.courseId ?? null,
      course_name: record.courseName ?? null,
      calories: record.calories ?? null,
      elevation_gain_m: record.elevationGainM ?? record.maxAltitude ?? null,
    };

    async function postRecord(payload: Record<string, unknown>) {
      const response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const message = await getErrorMessage(
          response,
          `Failed to create hiking record (Status: ${response.status})`,
        );
        throw new Error(message);
      }

      const data = await response.json();
      const row = Array.isArray(data)
        ? data[0]
        : (data.record ?? data.row ?? data.data ?? data);

      return normalizeHikingRecord(row);
    }

    try {
      try {
        return await postRecord(enrichedPayload);
      } catch (error) {
        console.warn(
          "[API] Retrying hiking record save with legacy schema:",
          error,
        );
        return await postRecord(legacyPayload);
      }
    } catch (error) {
      console.error("[API] Error in createHikingRecord:", error);
      throw error;
    }
  },

  /**
   * 배지 사전 목록을 가져옵니다.
   */
  async getBadges(token?: string | null): Promise<Badge[]> {
    const query = new URLSearchParams({
      select: "*",
      limit: "500",
    });
    const endpoint = `${AUTH_API_BASE_URL}/data/badges?${query.toString()}`;
    const headers: Record<string, string> = {};

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    try {
      const response = await fetch(endpoint, { headers });

      if (!response.ok) {
        const message = await getErrorMessage(
          response,
          `Failed to fetch badges (Status: ${response.status})`,
        );
        throw new Error(message);
      }

      const data = await response.json();
      const rows = Array.isArray(data) ? data : (data.rows ?? data.data ?? []);

      return rows.map(normalizeBadge).sort((a: Badge, b: Badge) => {
        const categoryOrder = (a.category ?? "").localeCompare(
          b.category ?? "",
        );
        if (categoryOrder !== 0) return categoryOrder;
        return (a.targetValue ?? 0) - (b.targetValue ?? 0);
      });
    } catch (error) {
      console.error("[API] Error in getBadges:", error);
      throw error;
    }
  },

  /**
   * 사용자가 획득한 배지 목록을 가져옵니다.
   */
  async getUserBadges(
    userId: number,
    token?: string | null,
  ): Promise<UserBadge[]> {
    const query = new URLSearchParams({
      select: "*",
      limit: "500",
    });
    const endpoint = `${AUTH_API_BASE_URL}/data/user_badges/filter?${query.toString()}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({ user_id: userId }),
      });

      if (!response.ok) {
        const message = await getErrorMessage(
          response,
          `Failed to fetch user badges (Status: ${response.status})`,
        );
        throw new Error(message);
      }

      const data = await response.json();
      const rows = Array.isArray(data) ? data : (data.rows ?? data.data ?? []);

      return rows.map(normalizeUserBadge).sort((a: UserBadge, b: UserBadge) => {
        const aTime = a.earnedAt ? new Date(a.earnedAt).getTime() : 0;
        const bTime = b.earnedAt ? new Date(b.earnedAt).getTime() : 0;
        return bTime - aTime;
      });
    } catch (error) {
      console.error("[API] Error in getUserBadges:", error);
      throw error;
    }
  },

  /**
   * 조건을 만족한 배지를 사용자 획득 목록에 저장합니다.
   */
  async createUserBadge(
    userId: number,
    badgeId: string,
    token?: string | null,
  ): Promise<UserBadge> {
    const endpoint = `${AUTH_API_BASE_URL}/data/user_badges`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({
          user_id: userId,
          badge_id: badgeId,
        }),
      });

      if (!response.ok) {
        const message = await getErrorMessage(
          response,
          `Failed to create user badge (Status: ${response.status})`,
        );
        throw new Error(message);
      }

      const data = await response.json();
      const row = Array.isArray(data)
        ? data[0]
        : (data.user_badge ?? data.row ?? data.data ?? data);

      return normalizeUserBadge(row);
    } catch (error) {
      console.error("[API] Error in createUserBadge:", error);
      throw error;
    }
  },

  /**
   * 모든 산 목록을 가져옵니다.
   */
  async getMountains(): Promise<Mountain[]> {
    const url = `${TRAIL_API_BASE_URL}/api/mountains`;
    console.log(`[API] Fetching mountains from: ${url}`);
    try {
      const response = await fetch(url);
      if (!response.ok) {
        console.error(
          `[API] Error fetching mountains: ${response.status} ${response.statusText}`,
        );
        throw new Error(
          `Failed to fetch mountains (Status: ${response.status})`,
        );
      }
      return await response.json();
    } catch (error) {
      console.error("[API] Error in getMountains:", error);
      throw error;
    }
  },

  /**
   * 특정 산의 정보를 가져옵니다.
   */
  async getMountain(mountainId: string): Promise<Mountain> {
    const url = `${TRAIL_API_BASE_URL}/api/mountains/${mountainId}`;
    console.log(`[API] Fetching mountain ${mountainId} from: ${url}`);
    try {
      const response = await fetch(url);
      if (!response.ok) {
        console.error(
          `[API] Error fetching mountain: ${response.status} ${response.statusText}`,
        );
        throw new Error(
          `Failed to fetch mountain (Status: ${response.status})`,
        );
      }
      return await response.json();
    } catch (error) {
      console.error("[API] Error in getMountain:", error);
      throw error;
    }
  },

  /**
   * 특정 산의 코스 목록을 가져옵니다.
   */
  async getCourses(mountainId: string): Promise<MountainCourse[]> {
    const url = `${TRAIL_API_BASE_URL}/api/mountains/${mountainId}/courses`;
    console.log(
      `[API] Fetching courses for mountain ${mountainId} from: ${url}`,
    );
    try {
      const response = await fetch(url);
      if (!response.ok) {
        console.error(
          `[API] Error fetching courses: ${response.status} ${response.statusText}`,
        );
        throw new Error(`Failed to fetch courses (Status: ${response.status})`);
      }
      return await response.json();
    } catch (error) {
      console.error("[API] Error in getCourses:", error);
      throw error;
    }
  },

  /**
   * 코스 ID를 기반으로 실제 경로와 ETA를 가져옵니다. (알고리즘 연동)
   */
  async getCourseRoute(courseId: string): Promise<PathResult> {
    const url = `${TRAIL_API_BASE_URL}/api/courses/${courseId}/route`;
    console.log(`[API] Fetching course route for ${courseId} from: ${url}`);
    try {
      const response = await fetch(url);
      if (!response.ok) {
        const errorData = await response.json();
        console.error(
          `[API] Error fetching course route: ${response.status}`,
          errorData,
        );
        throw new Error(
          errorData.error ||
            `Failed to fetch course route (Status: ${response.status})`,
        );
      }
      return await response.json();
    } catch (error) {
      console.error("[API] Error in getCourseRoute:", error);
      throw error;
    }
  },

  /**
   * 새로운 경로를 생성합니다 (직접 좌표 입력).
   */
  async createRoute(start: Coordinate, end: Coordinate): Promise<PathResult> {
    const url = `${TRAIL_API_BASE_URL}/api/routes`;
    console.log(`[API] Creating route at: ${url}`);
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ start, end }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error(
          `[API] Error creating route: ${response.status}`,
          errorData,
        );
        throw new Error(
          errorData.error ||
            `Failed to create route (Status: ${response.status})`,
        );
      }

      return await response.json();
    } catch (error) {
      console.error("[API] Error in createRoute:", error);
      throw error;
    }
  },

  /**
   * 경로 히스토리를 가져옵니다.
   */
  async getRouteHistory(): Promise<any[]> {
    const url = `${TRAIL_API_BASE_URL}/api/routes/history`;
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch history (Status: ${response.status})`);
      }
      return await response.json();
    } catch (error) {
      console.error("[API] Error in getRouteHistory:", error);
      throw error;
    }
  },

  /**
   * Supabase에 저장된 통합 산 경로 데이터를 가져옵니다.
   */
  async getUnifiedMountainPath(
    mountainName: string,
  ): Promise<UnifiedMountainPath | null> {
    const { url: supabaseUrl, anonKey } = requireSupabaseConfig();

    const query = new URLSearchParams({
      select: "id,mountain_name,region,height,description,nodes,courses",
      mountain_name: `eq.${mountainName}`,
      limit: "1",
    });
    const url = `${supabaseUrl}/rest/v1/unified_mountain_paths?${query.toString()}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      SUPABASE_FETCH_TIMEOUT_MS,
    );

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
        },
      });

      if (!response.ok) {
        const message = await response.text();
        console.error(
          `[API] Error fetching unified mountain path: ${response.status}`,
          message,
        );
        throw new Error(
          `Failed to fetch unified mountain path (Status: ${response.status})`,
        );
      }

      const rows = (await response.json()) as UnifiedMountainPath[];
      return rows[0] ?? null;
    } catch (error) {
      console.error("[API] Error in getUnifiedMountainPath:", error);
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  },
};
