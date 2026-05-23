import { Platform } from "react-native";
import {
  Mountain,
  MountainCourse,
  MOUNTAINS,
  MOUNTAIN_COURSES,
} from "./mountains";

const LOCAL_TRAIL_API_BASE_URL =
  Platform.OS === "android" ? "http://10.0.2.2:5001" : "http://localhost:5001";

/**
 * [중요] 백엔드 서버 주소 설정
 * - 인증/회원 API: Railway 서버
 * - 산/경로 데이터 API: Railway 서버의 /data/{table} 엔드포인트
 * - 직접 좌표 경로 생성 API: 아직 Railway에 없어 로컬 레거시 서버를 유지
 */
export const AUTH_API_BASE_URL =
  process.env.EXPO_PUBLIC_AUTH_API_BASE_URL ??
  "https://web-production-94f63.up.railway.app";

export const DATA_API_BASE_URL =
  process.env.EXPO_PUBLIC_DATA_API_BASE_URL ?? AUTH_API_BASE_URL;

const LEGACY_TRAIL_API_BASE_URL =
  process.env.EXPO_PUBLIC_TRAIL_API_BASE_URL ?? LOCAL_TRAIL_API_BASE_URL;

export const TRAIL_API_BASE_URL = DATA_API_BASE_URL;
export const BASE_URL = DATA_API_BASE_URL;

const RAILWAY_TABLE_PAGE_SIZE = 1000;
const COURSE_DISPLAY_LIMIT = 200;
const DEFAULT_MOUNTAIN_IMAGE =
  MOUNTAINS[0]?.img ??
  "https://images.unsplash.com/photo-1685330186861-278ae211fd65?auto=format&fit=crop&q=80&w=800";
const DEFAULT_COURSE_IMAGE =
  MOUNTAIN_COURSES[0]?.img ??
  "https://images.unsplash.com/photo-1685330186861-278ae211fd65?auto=format&fit=crop&q=80&w=800";

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

export interface AnomalyResult {
  is_anomaly: boolean;
  message: string;
  anomaly_type: string | null;
  timestamp: string;
}

export interface EmergencyRequest {
  userId: string | number;
  eventType: string;
  timestamp: string;
  location: Coordinate;
}

export interface HealthDataRequest {
  measured_at: string; // ISO 8601
  heart_rate: number;
  steps?: number;
  calories?: number;
  spo2?: number;
  body_temp?: number;
  blood_pressure_systolic?: number;
  blood_pressure_diastolic?: number;
  user_id?: string | number;
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

interface RailwayResponse<T> {
  success?: boolean;
  count?: number;
  data?: T;
  rows?: T;
  row?: T;
  record?: T;
}

interface SeoulMountainPathRow {
  id: number;
  mountain_name: string | null;
  difficulty?: string | null;
  uptime?: number | null;
  downtime?: number | null;
  length_km?: number | null;
  path_coords?: unknown;
  elevations?: unknown;
  slopes?: unknown;
  avg_slope?: number | null;
  info_id?: number | null;
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

let cachedMountains: Mountain[] | null = null;
let cachedCourseSummaries: SeoulMountainPathRow[] | null = null;
const courseCache = new Map<string, MountainCourse[]>();
const unifiedMountainPathCache = new Map<string, UnifiedMountainPath | null>();
const courseRouteCache = new Map<string, PathResult>();

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

function unwrapRows<T>(payload: RailwayResponse<T[]> | T[] | any): T[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.rows)) return payload.rows;
  return [];
}

function unwrapRow<T>(payload: RailwayResponse<T> | T | any): T | null {
  if (!payload) return null;
  if (payload.data && !Array.isArray(payload.data)) return payload.data;
  if (payload.row && !Array.isArray(payload.row)) return payload.row;
  if (payload.record && !Array.isArray(payload.record)) return payload.record;
  return payload;
}

async function fetchDataRows<T>(
  table: string,
  params: Record<string, string>,
): Promise<T[]> {
  const query = new URLSearchParams(params);
  const url = `${DATA_API_BASE_URL}/data/${table}?${query.toString()}`;
  const response = await fetch(url);

  if (!response.ok) {
    const message = await getErrorMessage(
      response,
      `Failed to fetch ${table} (Status: ${response.status})`,
    );
    throw new Error(message);
  }

  return unwrapRows<T>(await response.json());
}

async function fetchFilteredDataRows<T>(
  table: string,
  filters: Record<string, unknown>,
  params: Record<string, string>,
): Promise<T[]> {
  const query = new URLSearchParams(params);
  const url = `${DATA_API_BASE_URL}/data/${table}/filter?${query.toString()}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(filters),
  });

  if (!response.ok) {
    const message = await getErrorMessage(
      response,
      `Failed to filter ${table} (Status: ${response.status})`,
    );
    throw new Error(message);
  }

  return unwrapRows<T>(await response.json());
}

async function fetchDataRow<T>(
  table: string,
  rowId: number | string,
): Promise<T | null> {
  const url = `${DATA_API_BASE_URL}/data/${table}/${encodeURIComponent(
    String(rowId),
  )}`;
  const response = await fetch(url);

  if (!response.ok) {
    const message = await getErrorMessage(
      response,
      `Failed to fetch ${table} row (Status: ${response.status})`,
    );
    throw new Error(message);
  }

  return unwrapRow<T>(await response.json());
}

async function fetchPagedDataRows<T>(
  table: string,
  select: string,
): Promise<T[]> {
  const rows: T[] = [];
  let offset = 0;

  while (true) {
    const page = await fetchDataRows<T>(table, {
      select,
      limit: String(RAILWAY_TABLE_PAGE_SIZE),
      offset: String(offset),
    });
    rows.push(...page);

    if (page.length < RAILWAY_TABLE_PAGE_SIZE) break;
    offset += RAILWAY_TABLE_PAGE_SIZE;
  }

  return rows;
}

function normalizeMountainKey(value: unknown): string {
  return String(value ?? "").trim();
}

function cleanText(value: unknown, fallback = ""): string {
  const text = String(value ?? "").trim();
  return text.length > 0 ? text : fallback;
}

function toDisplayAltitude(value: unknown): number {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue) || numberValue < 0) return 0;
  return Math.floor(numberValue);
}

function toDisplayCourseCount(value: number | undefined): number {
  if (!value || value < 0) return 0;
  return Math.min(value, COURSE_DISPLAY_LIMIT);
}

function formatDistanceKm(value: unknown): string {
  const distance = Number(value);
  if (!Number.isFinite(distance) || distance <= 0) return "0km";
  return `${distance.toFixed(distance < 1 ? 2 : 1)}km`;
}

function formatMinutes(value: unknown): string {
  const minutes = Math.max(1, Math.round(Number(value) || 0));
  const hours = Math.floor(minutes / 60);
  const restMinutes = minutes % 60;

  if (hours > 0 && restMinutes > 0) return `${hours}시간 ${restMinutes}분`;
  if (hours > 0) return `${hours}시간`;
  return `${minutes}분`;
}

function getCourseDurationMinutes(row: SeoulMountainPathRow): number {
  const total = Number(row.uptime ?? 0) + Number(row.downtime ?? 0);
  if (Number.isFinite(total) && total > 0) return Math.round(total);

  const distanceKm = Number(row.length_km);
  if (Number.isFinite(distanceKm) && distanceKm > 0) {
    return Math.max(1, Math.round((distanceKm / 3) * 60));
  }

  return 1;
}

function getFiniteNumberArray(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => Number(item))
    .filter((item) => Number.isFinite(item));
}

function getElevationGain(elevations: number[]): number {
  if (elevations.length < 2) return 0;

  let gain = 0;
  for (let index = 1; index < elevations.length; index++) {
    const diff = elevations[index] - elevations[index - 1];
    if (diff > 0) gain += diff;
  }

  return Math.round(gain);
}

function getElevationLoss(elevations: number[]): number {
  if (elevations.length < 2) return 0;

  let loss = 0;
  for (let index = 1; index < elevations.length; index++) {
    const diff = elevations[index - 1] - elevations[index];
    if (diff > 0) loss += diff;
  }

  return Math.round(loss);
}

function flattenPathCoords(pathCoords: unknown): Coordinate[] {
  if (!Array.isArray(pathCoords)) return [];

  const coords: Coordinate[] = [];

  function visit(value: unknown) {
    if (!Array.isArray(value)) return;

    if (
      value.length >= 2 &&
      typeof value[0] === "number" &&
      typeof value[1] === "number"
    ) {
      const lng = Number(value[0]);
      const lat = Number(value[1]);
      if (
        Number.isFinite(lat) &&
        Number.isFinite(lng) &&
        Math.abs(lat) <= 90 &&
        Math.abs(lng) <= 180
      ) {
        const last = coords[coords.length - 1];
        if (!last || last.lat !== lat || last.lng !== lng) {
          coords.push({ lat, lng });
        }
      }
      return;
    }

    value.forEach(visit);
  }

  visit(pathCoords);
  return coords;
}

function formatEta(durationSec: number): string {
  const eta = new Date(Date.now() + durationSec * 1000);
  const hours = eta.getHours().toString().padStart(2, "0");
  const minutes = eta.getMinutes().toString().padStart(2, "0");
  return `${hours}시 ${minutes}분`;
}

function getMountainNameFromId(mountainId: string): string {
  const staticMountain = MOUNTAINS.find((mountain) => mountain.id === mountainId);
  return staticMountain?.name ?? mountainId;
}

function normalizeRailwayCourse(
  row: SeoulMountainPathRow,
  mountainId: string,
): MountainCourse {
  const id = String(row.id);
  const mountainName = cleanText(row.mountain_name, getMountainNameFromId(mountainId));
  const elevations = getFiniteNumberArray(row.elevations);
  const elevationGain = getElevationGain(elevations);
  const difficulty = cleanText(row.difficulty, "중") as MountainCourse["difficulty"];
  const distance = formatDistanceKm(row.length_km);
  const durationMinutes = getCourseDurationMinutes(row);
  const avgSlope = Number(row.avg_slope);
  const tags = [
    `#${difficulty}`,
    distance !== "0km" ? `#${distance}` : null,
    Number.isFinite(avgSlope) ? `#평균경사${avgSlope.toFixed(1)}%` : null,
  ].filter(Boolean) as string[];

  return {
    id,
    mountainId,
    title: `경로 ${id}`,
    desc: `${mountainName}의 등산 경로입니다.`,
    img: DEFAULT_COURSE_IMAGE,
    tags,
    distance,
    time: formatMinutes(durationMinutes),
    difficulty,
    elevation: elevationGain > 0 ? `+${elevationGain}m` : "+0m",
    startPoint: mountainName,
    highlights: [mountainName, `경로 ${id}`],
    elevationProfile: elevations,
  };
}

function normalizeRailwayRoute(row: SeoulMountainPathRow): PathResult {
  const path = flattenPathCoords(row.path_coords);
  const elevations = getFiniteNumberArray(row.elevations);
  const distanceM = Math.round((Number(row.length_km) || 0) * 1000);
  const durationSec = getCourseDurationMinutes(row) * 60;
  const ascentM = getElevationGain(elevations);
  const descentM = getElevationLoss(elevations);
  const routeId = String(row.id);

  return {
    route_id: routeId,
    path,
    path_names: path.map(
      (_coord, index) =>
        `${cleanText(row.mountain_name, "산행 경로")} ${index + 1}`,
    ),
    summary: {
      distance_m: distanceM,
      duration_sec: durationSec,
      ascent_m: ascentM,
      descent_m: descentM,
      total_distance_m: distanceM,
      total_hours: Math.floor(durationSec / 3600),
      total_minutes: Math.floor((durationSec % 3600) / 60),
      total_seconds: durationSec % 60,
      eta: formatEta(durationSec),
    },
    start_node: path[0] ?? null,
    end_node: path[path.length - 1] ?? null,
    total_hours: Math.floor(durationSec / 3600),
    total_minutes: Math.floor((durationSec % 3600) / 60),
    total_seconds: durationSec % 60,
    eta: formatEta(durationSec),
  };
}

async function getCourseSummaryRows(): Promise<SeoulMountainPathRow[]> {
  if (cachedCourseSummaries) return cachedCourseSummaries;

  cachedCourseSummaries = await fetchPagedDataRows<SeoulMountainPathRow>(
    "seoul_mountain_paths",
    "id,mountain_name",
  );
  return cachedCourseSummaries;
}

async function getCourseCountByMountain(): Promise<Map<string, number>> {
  const rows = await getCourseSummaryRows();
  const counts = new Map<string, number>();

  rows.forEach((row) => {
    const name = normalizeMountainKey(row.mountain_name);
    if (!name) return;
    counts.set(name, (counts.get(name) ?? 0) + 1);
  });

  return counts;
}

function buildMountainFromRailwayRow(
  row: UnifiedMountainPath,
  courseCount: number,
): Mountain {
  const name = normalizeMountainKey(row.mountain_name);

  return {
    id: name,
    name,
    region: cleanText(row.region, "지역 정보 없음"),
    altitude: toDisplayAltitude(row.height),
    description: cleanText(row.description, `${name} 등산로 정보`),
    img: DEFAULT_MOUNTAIN_IMAGE,
    courseCount: toDisplayCourseCount(courseCount),
  };
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
    const url = `${DATA_API_BASE_URL}/data/unified_mountain_paths`;
    console.log(`[API] Fetching mountains from Railway: ${url}`);
    try {
      if (cachedMountains) return cachedMountains;

      const [rows, courseCounts] = await Promise.all([
        fetchDataRows<UnifiedMountainPath>("unified_mountain_paths", {
          select: "id,mountain_name,region,height,description",
          limit: "1000",
        }),
        getCourseCountByMountain(),
      ]);

      const mountainsByName = new Map<string, Mountain>();

      MOUNTAINS.forEach((mountain) => {
        const railwayCourseCount = courseCounts.get(mountain.name);
        if (railwayCourseCount === undefined) return;

        mountainsByName.set(mountain.name, {
          ...mountain,
          courseCount: toDisplayCourseCount(railwayCourseCount),
        });
      });

      rows.forEach((row) => {
        const name = normalizeMountainKey(row.mountain_name);
        if (!name || mountainsByName.has(name)) return;

        const courseCount = courseCounts.get(name) ?? 0;
        if (courseCount <= 0) return;

        mountainsByName.set(
          name,
          buildMountainFromRailwayRow(row, courseCount),
        );
      });

      cachedMountains = Array.from(mountainsByName.values());

      if (cachedMountains.length === 0) {
        throw new Error("Railway에서 표시 가능한 산 데이터를 찾지 못했습니다.");
      }

      return cachedMountains;
    } catch (error) {
      console.error("[API] Error in getMountains:", error);
      throw error;
    }
  },

  /**
   * 특정 산의 정보를 가져옵니다.
   */
  async getMountain(mountainId: string): Promise<Mountain> {
    console.log(`[API] Fetching mountain ${mountainId} from Railway data`);
    try {
      const mountains = await this.getMountains();
      const mountain =
        mountains.find((item) => item.id === mountainId) ??
        mountains.find((item) => item.name === mountainId);

      if (!mountain) {
        throw new Error(`산 정보를 찾지 못했습니다: ${mountainId}`);
      }

      return mountain;
    } catch (error) {
      console.error("[API] Error in getMountain:", error);
      throw error;
    }
  },

  /**
   * 특정 산의 코스 목록을 가져옵니다.
   */
  async getCourses(mountainId: string): Promise<MountainCourse[]> {
    console.log(
      `[API] Fetching courses for mountain ${mountainId} from Railway data`,
    );
    try {
      const cached = courseCache.get(mountainId);
      if (cached) return cached;

      const mountainName = getMountainNameFromId(mountainId);
      const rows = await fetchFilteredDataRows<SeoulMountainPathRow>(
        "seoul_mountain_paths",
        { mountain_name: mountainName },
        {
          select:
            "id,mountain_name,difficulty,uptime,downtime,length_km,path_coords,elevations,slopes,avg_slope,info_id",
          limit: String(COURSE_DISPLAY_LIMIT),
        },
      );

      const railwayCourses = rows.map((row) =>
        normalizeRailwayCourse(row, mountainId),
      );

      if (railwayCourses.length > 0) {
        courseCache.set(mountainId, railwayCourses);
        return railwayCourses;
      }

      courseCache.set(mountainId, []);
      return [];
    } catch (error) {
      console.error("[API] Error in getCourses:", error);
      throw error;
    }
  },

  /**
   * 코스 ID를 기반으로 실제 경로와 ETA를 가져옵니다. (알고리즘 연동)
   */
  async getCourseRoute(courseId: string): Promise<PathResult> {
    console.log(`[API] Fetching course route ${courseId} from Railway data`);
    try {
      const cached = courseRouteCache.get(courseId);
      if (cached) return cached;

      const row = await fetchDataRow<SeoulMountainPathRow>(
        "seoul_mountain_paths",
        courseId,
      );

      if (!row) {
        throw new Error(`코스 경로를 찾지 못했습니다: ${courseId}`);
      }

      const route = normalizeRailwayRoute(row);
      courseRouteCache.set(courseId, route);
      return route;
    } catch (error) {
      console.error("[API] Error in getCourseRoute:", error);
      throw error;
    }
  },

  /**
   * 새로운 경로를 생성합니다 (직접 좌표 입력).
   */
  async createRoute(start: Coordinate, end: Coordinate): Promise<PathResult> {
    const url = `${LEGACY_TRAIL_API_BASE_URL}/api/routes`;
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
    const url = `${LEGACY_TRAIL_API_BASE_URL}/api/routes/history`;
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
   * Railway에 저장된 통합 산 경로 데이터를 가져옵니다.
   */
  async getUnifiedMountainPath(
    mountainName: string,
  ): Promise<UnifiedMountainPath | null> {
    try {
      const cacheKey = normalizeMountainKey(mountainName);
      if (unifiedMountainPathCache.has(cacheKey)) {
        return unifiedMountainPathCache.get(cacheKey) ?? null;
      }

      const rows = await fetchFilteredDataRows<UnifiedMountainPath>(
        "unified_mountain_paths",
        { mountain_name: cacheKey },
        {
          select: "id,mountain_name,region,height,description,nodes,courses",
          limit: "10",
        },
      );
      const bestRow =
        rows
          .filter((row) => row.nodes?.length && row.courses?.length)
          .sort(
            (a, b) =>
              (b.nodes?.length ?? 0) +
              (b.courses?.length ?? 0) -
              ((a.nodes?.length ?? 0) + (a.courses?.length ?? 0)),
          )[0] ?? null;

      unifiedMountainPathCache.set(cacheKey, bestRow);
      return bestRow;
    } catch (error) {
      console.error("[API] Error in getUnifiedMountainPath:", error);
      throw error;
    }
  },

  /**
   * 이상 징후를 확인합니다 (백엔드 알고리즘 호출).
   */
  async checkAnomaly(sensorData: any, token?: string): Promise<AnomalyResult> {
    const url = `${AUTH_API_BASE_URL}/health/data`;
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (token) {
        const cleanToken = token.trim();
        const authHeader = cleanToken.startsWith("Bearer ")
          ? cleanToken
          : `Bearer ${cleanToken}`;
        headers["Authorization"] = authHeader;
      }

      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({ sensor_data: sensorData }),
      });

      if (!response.ok) {
        throw new Error(`Failed to check anomaly (Status: ${response.status})`);
      }

      return await response.json();
    } catch (error) {
      console.error("[API] Error in checkAnomaly:", error);
      throw error;
    }
  },

  /**
   * 긴급 상황을 백엔드에 보고하여 응급 프로토콜을 시작합니다.
   */
  async reportEmergency(
    emergencyData: EmergencyRequest,
    token?: string,
  ): Promise<any> {
    const url = `${AUTH_API_BASE_URL}/health/data`;
    console.log(`[API] Reporting emergency to: ${url}`, emergencyData);
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (token) {
        const cleanToken = token.trim();
        const authHeader = cleanToken.startsWith("Bearer ")
          ? cleanToken
          : `Bearer ${cleanToken}`;
        headers["Authorization"] = authHeader;
      }

      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(emergencyData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(
          `[API] Error reporting emergency: ${response.status}`,
          errorData,
        );
        throw new Error(
          `Failed to report emergency (Status: ${response.status})`,
        );
      }

      return await response.json();
    } catch (error) {
      console.error("[API] Error in reportEmergency:", error);
      throw error;
    }
  },

  /**
   * 생체 데이터를 서버에 저장합니다 (Railway DB 연동).
   */
  async saveHealthData(data: HealthDataRequest, token?: string): Promise<any> {
    const url = `${AUTH_API_BASE_URL}/data/health_data_temp`;

    console.log(`[API] Saving health data to: ${url}`, data);
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "application/json",
      };

      if (token) {
        const cleanToken = token.trim();
        const authHeader = cleanToken.startsWith("Bearer ")
          ? cleanToken
          : `Bearer ${cleanToken}`;
        headers["Authorization"] = authHeader;
      }

      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(
          `[API] Error saving health data: ${response.status}`,
          errorData,
        );
        throw new Error(
          `Failed to save health data (Status: ${response.status})`,
        );
      }

      return await response.json();
    } catch (error) {
      console.error("[API] Error in saveHealthData:", error);
      throw error;
    }
  },

  /**
   * 저장된 생체 데이터를 가져옵니다 (Railway DB 연동).
   */
  async getHealthData(token?: string): Promise<any> {
    const url = `${AUTH_API_BASE_URL}/data/health_data_temp`;
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "application/json",
      };

      if (token) {
        const cleanToken = token.trim();
        const authHeader = cleanToken.startsWith("Bearer ")
          ? cleanToken
          : `Bearer ${cleanToken}`;
        headers["Authorization"] = authHeader;
      }

      const response = await fetch(url, { headers });
      if (!response.ok) {
        throw new Error(
          `Failed to fetch health data (Status: ${response.status})`,
        );
      }
      return await response.json();
    } catch (error) {
      console.error("[API] Error in getHealthData:", error);
      throw error;
    }
  },
};
