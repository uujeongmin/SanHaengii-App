import { Platform } from "react-native";
import {
  Mountain,
  MOUNTAIN_COURSES,
  MountainCourse,
  MOUNTAINS,
} from "./mountains";

export type { MountainCourse } from "./mountains";

// 산 메타 폴백(이름→지역/고도/설명/이미지). 주 소스는 unified_mountain_paths이며,
// 그 조회 실패 시에만 참조하는 보조 맵(비어 있어도 기본값으로 폴백됨).
const SEOUL_MOUNTAIN_META: Record<
  string,
  { region?: string; altitude?: number; description?: string; img?: string }
> = {};

export const DEV_TEST_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwic29jaWFsVHlwZSI6InRlc3QiLCJzb2NpYWxJZCI6InRlc3RfdXNlciIsImV4cCI6MTc4MTg1OTgxNn0.Xlf6e7iU8nzHFoZ3Hw9d39vWndTXOsBAwKgmsIcBA6k";

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

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const LEGACY_TRAIL_API_BASE_URL =
  process.env.EXPO_PUBLIC_TRAIL_API_BASE_URL ?? LOCAL_TRAIL_API_BASE_URL;

// 워치 credentials 동기화 relay 주소.
// watch-credentials 엔드포인트가 Railway 백엔드에 배포돼 있어, 실기기에서도
// 닿는 공개 HTTPS(AUTH_API_BASE_URL)를 사용한다. (기존 localhost:5001은 에뮬레이터 전용)
export const FLASK_RELAY_BASE_URL = AUTH_API_BASE_URL;

export const TRAIL_API_BASE_URL = DATA_API_BASE_URL;
export const BASE_URL = DATA_API_BASE_URL;

const RAILWAY_TABLE_PAGE_SIZE = 1000;
const COURSE_DISPLAY_LIMIT = 200;
export const DEFAULT_MOUNTAIN_IMAGE =
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
  image_url?: string | null;
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

/** recommended_courses 테이블 행 타입 */
interface RecommendedCourseRow {
  id: number;
  mountain_name: string;
  course_name: string;
  total_distance_km: number | string | null;
  path_coords?: unknown;
  created_at?: string | null;
}

/** seoul_mountain_info 테이블 행 타입 (산 목록 소스, 철자 주의: mountain) */
interface SeoulMountainInfoRow {
  id?: number;
  mountain_name: string;
  address?: string | null;
  height?: number | string | null;
  description?: string | null;
  short_description?: string | null;
  image_url?: string | null;
  weather_mountain_num?: number | string | null;
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
  status: string | null;
  durationMinutes: number | null;
  distanceKm: number | null;
  calories: number | null;
  steps: number | null;
  avgHeartRate: number | null;
  maxAltitude: number | null;
  elevationGainM: number | null;
  createdAt: string | null;
  startedAt: string | null;
  endedAt: string | null;
}

export interface CreateHikingRecordInput {
  userId: number;
  mountainName: string | null;
  courseId?: string | null;
  courseName?: string | null;
  durationMinutes: number | null;
  distanceKm: number | null;
  calories?: number | null;
  steps?: number | null;
  avgHeartRate: number | null;
  maxAltitude?: number | null;
  elevationGainM?: number | null;
}

export interface StartHikingRecordInput {
  userId: number;
  mountainName: string | null;
  courseId?: string | null;
  courseName?: string | null;
}

export interface FinishHikingRecordInput {
  durationMinutes: number | null;
  distanceKm: number | null;
  calories?: number | null;
  steps?: number | null;
  avgHeartRate: number | null;
  maxAltitude?: number | null;
  elevationGainM?: number | null;
}

export interface HealthData {
  id: number;
  userId: number;
  measuredAt: string | null;
  heartRate: number | null;
  steps: number | null;
  calories: number | null;
  spo2: number | null;
  bodyTemp: number | null;
  bloodPressureSystolic: number | null;
  bloodPressureDiastolic: number | null;
}

export interface HealthAnomaly {
  type: string;
  message: string;
}

/**
 * 생체 데이터(HealthData)에서 이상 징후를 로컬 판정합니다.
 * 임계값: 심박수 >160/<40, 산소포화도 <90%, 체온 >39°C/<35°C
 * (SafetyScreen.detectAnomalyLocally와 동일 기준, camelCase 대응)
 */
export function detectHealthAnomaly(
  data: Pick<HealthData, "heartRate" | "spo2" | "bodyTemp"> | null | undefined,
): HealthAnomaly | null {
  if (!data) return null;

  const hr = data.heartRate;
  const spo2 = data.spo2;
  const temp = data.bodyTemp;

  if (hr != null && hr > 160)
    return { type: "빈맥", message: "심박수가 너무 높습니다 (빈맥 감지)" };
  if (hr != null && hr < 40 && hr > 0)
    return { type: "서맥", message: "심박수가 너무 낮습니다 (서맥 감지)" };
  if (spo2 != null && spo2 < 90 && spo2 > 0)
    return {
      type: "저산소증",
      message: "산소포화도가 낮습니다 (저산소증 위험)",
    };
  if (temp != null && temp > 39)
    return { type: "고열", message: "체온이 너무 높습니다 (고열 감지)" };
  if (temp != null && temp < 35 && temp > 0)
    return { type: "저체온", message: "체온이 너무 낮습니다 (저체온증 위험)" };

  return null;
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

export interface PhotoSpot {
  spot: string;
  address: string;
  latitude: number;
  longitude: number;
}

export interface LoginResponse {
  success: boolean;
  token: string;
  user: AuthUser;
  isNewUser: boolean;
}

/** mountain_weather 테이블 행 타입 (기상청 시간대별 예보) */
interface MountainWeatherRow {
  id?: number;
  mountain_num: number | string;
  base_date?: string | null;
  base_time?: string | null;
  fcst_date: string;
  fcst_time: string;
  category: string;
  fcst_value: string;
}

/** 한 예보 시각(fcst_date+fcst_time)에 대한 통합 날씨 */
export interface WeatherForecastHour {
  /** YYYYMMDD */
  date: string;
  /** HHmm (예: "1500") */
  time: string;
  /** 기온(℃) */
  tmp: number | null;
  /** 강수확률(%) */
  pop: number | null;
  /** 강수량(문자열, 예: "강수없음", "1.0mm 미만") */
  pcp: string | null;
  /** 습도(%) */
  reh: number | null;
  /** 풍속(m/s) */
  wsd: number | null;
  /** 하늘상태 1=맑음 3=구름많음 4=흐림 */
  sky: number | null;
}

export interface MountainWeather {
  /** weather_mountain_num이 있고 예보 데이터를 받았는지 */
  available: boolean;
  mountainNum: number | null;
  /** 현재(가장 가까운 미래) 시각 예보 */
  current: WeatherForecastHour | null;
  /** 시간순 정렬된 예보(현재 이후) */
  hourly: WeatherForecastHour[];
  /** 안전 경고 문구 목록 */
  warnings: string[];
}

let cachedCourseSummaries: SeoulMountainPathRow[] | null = null;
const courseCache = new Map<string, MountainCourse[]>();
let cachedRecommendedMountains: Mountain[] | null = null;
let cachedRecommendedRows: RecommendedCourseRow[] | null = null;
const unifiedMountainPathCache = new Map<string, UnifiedMountainPath | null>();
const courseRouteCache = new Map<string, PathResult>();
// 산 이름(정규화) → weather_mountain_num. seoul_mountain_info에서 1회 로드.
let cachedWeatherNumByName: Map<string, number> | null = null;
// weather_mountain_num → 파싱된 날씨. 세션 캐시(짧은 데모이므로 갱신 불필요).
const mountainWeatherCache = new Map<number, MountainWeather>();

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
    status: row.status ?? null,
    durationMinutes: toNullableNumber(
      row.durationMinutes ?? row.duration_minutes,
    ),
    distanceKm: toNullableNumber(row.distanceKm ?? row.distance_km),
    calories: toNullableNumber(row.calories),
    steps: toNullableNumber(row.steps ?? row.total_steps),
    avgHeartRate: toNullableNumber(row.avgHeartRate ?? row.avg_heart_rate),
    maxAltitude,
    elevationGainM: toNullableNumber(
      row.elevationGainM ??
        row.elevation_gain_m ??
        row.elevation_gain ??
        maxAltitude,
    ),
    createdAt: row.createdAt ?? row.created_at ?? null,
    startedAt: row.startedAt ?? row.started_at ?? null,
    endedAt: row.endedAt ?? row.ended_at ?? null,
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

function normalizeHealthData(row: any): HealthData {
  return {
    id: Number(row.id),
    userId: Number(row.userId ?? row.user_id),
    measuredAt: row.measuredAt ?? row.measured_at ?? null,
    heartRate: toNullableNumber(row.heartRate ?? row.heart_rate),
    steps: toNullableNumber(row.steps),
    calories: toNullableNumber(row.calories),
    spo2: toNullableNumber(row.spo2),
    bodyTemp: toNullableNumber(row.bodyTemp ?? row.body_temp),
    bloodPressureSystolic: toNullableNumber(
      row.bloodPressureSystolic ?? row.blood_pressure_systolic,
    ),
    bloodPressureDiastolic: toNullableNumber(
      row.bloodPressureDiastolic ?? row.blood_pressure_diastolic,
    ),
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

function toKoreanISOString(date = new Date()): string {
  const kstTime = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return `${kstTime.toISOString().slice(0, 19)}+09:00`;
}

function cleanText(value: unknown, fallback = ""): string {
  const text = String(value ?? "").trim();
  return text.length > 0 ? text : fallback;
}

function cleanImageUrl(value: unknown, fallback: string): string {
  const url = String(value ?? "").trim();
  if (/^https?:\/\//i.test(url)) return url;
  return fallback;
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
  const staticMountain = MOUNTAINS.find(
    (mountain) => mountain.id === mountainId,
  );
  return staticMountain?.name ?? mountainId;
}

// ── seoul_mountain_info 테이블 유틸 (산 목록 소스) ───────────────────────

// 산 정보 테이블. 올바른 철자 우선, 백엔드 화이트리스트의 타이포(mountian) 폴백.
// join 키 = mountain_name
const SEOUL_MOUNTAIN_INFO_TABLES = ["seoul_mountain_info"];

const SEOUL_MOUNTAIN_INFO_SELECT =
  "id,mountain_name,address,height,description,short_description,image_url,weather_mountain_num";
let cachedMountainInfoRows: SeoulMountainInfoRow[] | null = null;

/**
 * 산 정보 테이블에서 메타데이터를 가져옵니다(철자 후보 순차 시도).
 * 모든 후보 실패 시 빈 배열을 반환해 호출부가 recommended_courses로 폴백하도록 합니다.
 */
async function getSeoulMountainInfoRows(): Promise<SeoulMountainInfoRow[]> {
  if (cachedMountainInfoRows) return cachedMountainInfoRows;

  for (const table of SEOUL_MOUNTAIN_INFO_TABLES) {
    try {
      const rows = await fetchPagedDataRows<SeoulMountainInfoRow>(
        table,
        SEOUL_MOUNTAIN_INFO_SELECT,
      );
      if (rows.length > 0) {
        console.log(`[API] 산 목록 소스: ${table} (${rows.length}개)`);
        cachedMountainInfoRows = rows;
        return cachedMountainInfoRows;
      }
    } catch (error) {
      console.warn(`[API] ${table} 조회 실패, 다음 후보 시도:`, error);
    }
  }

  console.warn("[API] 모든 산 정보 테이블 실패 → recommended_courses로 폴백");
  cachedMountainInfoRows = [];
  return cachedMountainInfoRows;
}

/**
 * seoul_mountain_info 행들로 Mountain[]을 만듭니다.
 * mountain_name을 키로 recommended_courses의 코스 수(countByName)와 엮습니다.
 * 코스가 1개 이상인 산만 포함합니다(내비게이션 가능 대상).
 */
function buildMountainsFromInfo(
  infoRows: SeoulMountainInfoRow[],
  countByName: Map<string, number>,
): Mountain[] {
  const mountains: Mountain[] = [];
  const seen = new Set<string>();

  infoRows.forEach((info) => {
    const name = cleanText(info.mountain_name);
    if (!name || seen.has(name)) return;
    const courseCount = countByName.get(name) ?? 0;
    if (courseCount <= 0) return; // 코스 없는 산은 제외
    seen.add(name);

    const meta = SEOUL_MOUNTAIN_META[name];
    mountains.push({
      id: mountainNameToId(name),
      name,
      region: cleanText(info.address, meta?.region ?? "서울"),
      altitude: toDisplayAltitude(info.height ?? meta?.altitude),
      description: cleanText(
        info.description ?? info.short_description,
        meta?.description ?? `${name} 등산 코스`,
      ),
      img: cleanImageUrl(info.image_url, meta?.img ?? DEFAULT_MOUNTAIN_IMAGE),
      courseCount,
    });
  });

  return mountains;
}

// ── recommended_courses_v2 테이블 유틸 (개선된 코스 데이터 소스) ──────────

const RECOMMENDED_COURSES_TABLE = "recommended_courses_v2";

function courseDifficultyToLevel(
  difficulty: string | null | undefined,
): MountainCourse["difficulty"] {
  if (!difficulty) return "하";
  if (difficulty.includes("상") || difficulty.includes("어려")) return "상";
  if (difficulty.includes("중") || difficulty.includes("보통")) return "중";
  return "하";
}

function mountainNameToId(mountainName: string): string {
  return mountainName
    .toLowerCase()
    .replace(/[_\s]+/g, "-")
    .replace(/[^\w-가-힣]/g, "");
}

function getRecommendedCourseId(row: RecommendedCourseRow): string {
  return String(row.id);
}

function getRecommendedMountainName(row: RecommendedCourseRow): string {
  return cleanText(row.mountain_name, "추천 산");
}

function getRecommendedMountainId(row: RecommendedCourseRow): string {
  return mountainNameToId(getRecommendedMountainName(row));
}

function getRecommendedDistanceKm(row: RecommendedCourseRow): number {
  const distance = Number(row.total_distance_km);
  return Number.isFinite(distance) && distance > 0 ? distance : 0;
}

function getRecommendedDurationMinutes(row: RecommendedCourseRow): number {
  const distanceKm = getRecommendedDistanceKm(row);
  if (distanceKm > 0) return Math.max(1, Math.round((distanceKm / 3) * 60));

  return 1;
}

function getRecommendedPath(row: RecommendedCourseRow): Coordinate[] {
  return flattenPathCoords(row.path_coords);
}

async function fetchRecommendedRowsFromSupabase(): Promise<
  RecommendedCourseRow[]
> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("Supabase 환경 변수가 설정되지 않았습니다.");
  }

  const query = new URLSearchParams({
    select:
      "id,mountain_name,course_name,total_distance_km,path_coords,created_at",
    order: "id.asc",
    limit: String(RAILWAY_TABLE_PAGE_SIZE),
  });
  const url = `${SUPABASE_URL}/rest/v1/${RECOMMENDED_COURSES_TABLE}?${query.toString()}`;
  const response = await fetch(url, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });

  if (!response.ok) {
    const message = await getErrorMessage(
      response,
      `Failed to fetch ${RECOMMENDED_COURSES_TABLE} from Supabase (Status: ${response.status})`,
    );
    throw new Error(message);
  }

  return unwrapRows<RecommendedCourseRow>(await response.json());
}

async function getRecommendedCourseRows(): Promise<RecommendedCourseRow[]> {
  if (cachedRecommendedRows) return cachedRecommendedRows;

  try {
    cachedRecommendedRows = await fetchPagedDataRows<RecommendedCourseRow>(
      RECOMMENDED_COURSES_TABLE,
      "id,mountain_name,course_name,total_distance_km,path_coords,created_at",
    );
  } catch (error) {
    console.warn("[API] Falling back to Supabase recommended_courses:", error);
    cachedRecommendedRows = await fetchRecommendedRowsFromSupabase();
  }

  return cachedRecommendedRows;
}

// 산 이름 → {image_url, height(정상 고도)} 메타 캐시 (unified_mountain_paths에서 1회 로드)
interface UnifiedMeta {
  img: string;
  height: number;
  region: string;
  description: string;
}
let cachedUnifiedMeta: Map<string, UnifiedMeta> | null = null;

async function getUnifiedMetaMap(): Promise<Map<string, UnifiedMeta>> {
  if (cachedUnifiedMeta) return cachedUnifiedMeta;
  const map = new Map<string, UnifiedMeta>();
  try {
    const rows = await fetchDataRows<UnifiedMountainPath>(
      "unified_mountain_paths",
      {
        select: "mountain_name,height,image_url,region,description",
        limit: "1000",
      },
    );
    rows.forEach((row) => {
      const name = normalizeMountainKey(row.mountain_name);
      if (!name) return;
      map.set(name, {
        img: cleanImageUrl(row.image_url, DEFAULT_COURSE_IMAGE),
        height: toDisplayAltitude(row.height),
        region: cleanText(row.region, ""),
        description: cleanText(row.description, ""),
      });
    });
  } catch (error) {
    console.warn("[API] unified_mountain_paths 메타 로드 실패:", error);
  }
  cachedUnifiedMeta = map;
  return cachedUnifiedMeta;
}

/**
 * 코스 경로의 정상(끝점)에 가장 가까운 노드의 고도를 반환합니다.
 * recommended_courses_v2는 entrance→peak 순으로 저장되어 path의 마지막 점이 정상.
 * nodes(고도 포함)가 없으면 산 정상고도(fallbackHeight)로 폴백.
 */
function getPeakElevation(
  path: Coordinate[],
  nodes: UnifiedMountainNode[] | null | undefined,
  fallbackHeight: number,
): number {
  const peak = path[path.length - 1];
  if (!peak || !nodes || nodes.length === 0) return fallbackHeight;

  let bestElev = fallbackHeight;
  let bestDist = Infinity;
  for (const node of nodes) {
    if (node.lat == null || node.lng == null) continue;
    const dLat = node.lat - peak.lat;
    const dLng = node.lng - peak.lng;
    const d = dLat * dLat + dLng * dLng; // 근사(최근접 비교용이라 제곱거리로 충분)
    if (d < bestDist) {
      bestDist = d;
      const elev = Number(node.elev);
      bestElev = Number.isFinite(elev) ? Math.round(elev) : fallbackHeight;
    }
  }
  return bestElev;
}

function normalizeRecommendedCourse(
  row: RecommendedCourseRow,
  meta?: UnifiedMeta,
  nodes?: UnifiedMountainNode[] | null,
): MountainCourse {
  const mountainId = getRecommendedMountainId(row);
  const mountainName = getRecommendedMountainName(row);
  const courseName = cleanText(
    row.course_name,
    `코스 ${getRecommendedCourseId(row)}`,
  );
  const distKm = getRecommendedDistanceKm(row);
  const totalMin = getRecommendedDurationMinutes(row);
  const difficulty = courseDifficultyToLevel(null);
  const path = getRecommendedPath(row);
  // 정상 노드 고도 = 코스 끝점(정상)에 가장 가까운 노드의 고도 (없으면 산 정상고도)
  const peakElev = getPeakElevation(path, nodes, meta?.height ?? 0);

  return {
    id: getRecommendedCourseId(row),
    mountainId,
    title: courseName,
    // 설명 = unified_mountain_paths.description (없으면 기본 문구)
    desc:
      meta?.description ||
      `${mountainName} ${courseName}. 거리 ${distKm.toFixed(1)}km.`,
    img: meta?.img || DEFAULT_COURSE_IMAGE,
    tags: [
      `#${difficulty === "하" ? "쉬움" : difficulty === "중" ? "보통" : "어려움"}`,
      distKm > 0 ? `#${distKm.toFixed(1)}km` : null,
      totalMin > 0 ? `#${formatMinutes(totalMin)}` : null,
    ].filter(Boolean) as string[],
    distance: formatDistanceKm(distKm),
    time: formatMinutes(totalMin),
    difficulty,
    elevation: peakElev > 0 ? `${peakElev}m` : "정보 없음",
    // 위치 = unified_mountain_paths.region (없으면 산 입구)
    startPoint: meta?.region || `${mountainName} 입구`,
    highlights: [mountainName, courseName],
    elevationProfile: path.length > 0 ? path.slice(0, 10).map(() => 0) : [],
    ...(path.length > 0 ? { path } : {}),
  } as MountainCourse;
}

function buildMountainsFromRecommendedCourses(
  rows: RecommendedCourseRow[],
): Mountain[] {
  const seen = new Map<string, Mountain>();
  rows.forEach((row) => {
    const name = getRecommendedMountainName(row);
    const id = getRecommendedMountainId(row);
    if (!name || seen.has(id)) return;
    const meta = SEOUL_MOUNTAIN_META[name];
    seen.set(id, {
      id,
      name,
      region: meta?.region ?? "서울",
      altitude: toDisplayAltitude(meta?.altitude),
      description: meta?.description ?? `${name} 등산 코스`,
      img: meta?.img ?? DEFAULT_MOUNTAIN_IMAGE,
      courseCount: 0,
    });
  });
  return Array.from(seen.values());
}

function normalizeRailwayCourse(
  row: SeoulMountainPathRow,
  mountainId: string,
): MountainCourse {
  const id = String(row.id);
  const mountainName = cleanText(
    row.mountain_name,
    getMountainNameFromId(mountainId),
  );
  const elevations = getFiniteNumberArray(row.elevations);
  const elevationGain = getElevationGain(elevations);
  const difficulty = cleanText(
    row.difficulty,
    "중",
  ) as MountainCourse["difficulty"];
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
    img: cleanImageUrl(row.image_url, DEFAULT_MOUNTAIN_IMAGE),
    courseCount: toDisplayCourseCount(courseCount),
  };
}

// ── mountain_weather 유틸 (기상청 시간대별 예보) ─────────────────────────

const MOUNTAIN_WEATHER_TABLE = "mountain_weather";

function toWeatherNumber(value: string | null | undefined): number | null {
  if (value == null) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

/** YYYYMMDDHHmm 정수 키 (시각 비교용) */
function weatherSortKey(date: string, time: string): number {
  return Number(`${date}${time.padStart(4, "0")}`);
}

/** seoul_mountain_info에서 산이름(정규화)→weather_mountain_num 맵을 1회 로드 */
async function getWeatherNumByName(): Promise<Map<string, number>> {
  if (cachedWeatherNumByName) return cachedWeatherNumByName;
  const map = new Map<string, number>();
  try {
    const rows = await getSeoulMountainInfoRows();
    rows.forEach((row) => {
      const key = normalizeMountainKey(row.mountain_name);
      const num =
        row.weather_mountain_num == null
          ? null
          : toWeatherNumber(String(row.weather_mountain_num));
      if (key && num != null) map.set(key, num);
    });
  } catch (error) {
    console.warn("[API] weather_mountain_num 로드 실패:", error);
  }
  cachedWeatherNumByName = map;
  return cachedWeatherNumByName;
}


/** 같은 fcst_date+fcst_time 행들을 묶어 시간별 예보로 변환(시간순 정렬) */
function groupWeatherRows(rows: MountainWeatherRow[]): WeatherForecastHour[] {
  const byHour = new Map<string, WeatherForecastHour>();
  rows.forEach((row) => {
    const date = String(row.fcst_date ?? "");
    const time = String(row.fcst_time ?? "").padStart(4, "0");
    if (!date || !time) return;
    const key = `${date}${time}`;
    let hour = byHour.get(key);
    if (!hour) {
      hour = {
        date,
        time,
        tmp: null,
        pop: null,
        pcp: null,
        reh: null,
        wsd: null,
        sky: null,
      };
      byHour.set(key, hour);
    }
    const value = String(row.fcst_value ?? "").trim();
    switch (row.category) {
      case "TMP":
        hour.tmp = toWeatherNumber(value);
        break;
      case "POP":
        hour.pop = toWeatherNumber(value);
        break;
      case "PCP":
        hour.pcp = value || null;
        break;
      case "REH":
        hour.reh = toWeatherNumber(value);
        break;
      case "WSD":
        hour.wsd = toWeatherNumber(value);
        break;
      case "SKY":
        hour.sky = toWeatherNumber(value);
        break;
      default:
        break;
    }
  });
  return Array.from(byHour.values()).sort(
    (a, b) => weatherSortKey(a.date, a.time) - weatherSortKey(b.date, b.time),
  );
}

/** 강수량/강수확률이 "비 옴"을 의미하는지 */
function hasPrecipitation(hour: WeatherForecastHour): boolean {
  const pcp = (hour.pcp ?? "").trim();
  const noRain =
    pcp === "" ||
    pcp === "강수없음" ||
    pcp === "없음" ||
    pcp === "0" ||
    pcp === "0.0";
  if (!noRain) return true;
  return (hour.pop ?? 0) >= 60;
}

/** 예보 구간(시간별 배열) 전체를 스캔해 안전 경고 문구를 집계 */
function buildWeatherWarnings(hours: WeatherForecastHour[]): string[] {
  if (hours.length === 0) return [];
  const flags = {
    rain: false,
    cold: false,
    heat: false,
    wind: false,
    cloudy: false,
  };
  hours.forEach((hour) => {
    if (hasPrecipitation(hour)) flags.rain = true;
    if (hour.tmp != null && hour.tmp <= 0) flags.cold = true;
    if (hour.tmp != null && hour.tmp >= 30) flags.heat = true;
    if (hour.wsd != null && hour.wsd >= 9) flags.wind = true;
    if (hour.sky === 4) flags.cloudy = true;
  });

  const warnings: string[] = [];
  if (flags.rain) {
    warnings.push("강수 예보 — 우의·방수 장비를 준비하세요.");
  }
  if (flags.cold) {
    warnings.push("영하의 추위 — 방한 장비와 빙판 미끄럼에 주의하세요.");
  }
  if (flags.heat) {
    warnings.push("폭염 예보 — 수분을 충분히 섭취하고 무리한 산행을 피하세요.");
  }
  if (flags.wind) {
    warnings.push("강풍 예보 — 능선·정상부에서 특히 주의하세요.");
  }
  if (flags.cloudy && warnings.length === 0) {
    warnings.push("흐린 날씨 — 시야 확보에 유의하세요.");
  }
  return warnings;
}

/** 현재(가장 가까운 미래) 예보 시각 선택. 미래가 없으면 마지막 예보 */
function pickCurrentHour(
  hours: WeatherForecastHour[],
): WeatherForecastHour | null {
  if (hours.length === 0) return null;
  const now = new Date(Date.now() + 9 * 60 * 60 * 1000); // KST 보정
  const stamp =
    `${now.getUTCFullYear()}` +
    `${String(now.getUTCMonth() + 1).padStart(2, "0")}` +
    `${String(now.getUTCDate()).padStart(2, "0")}` +
    `${String(now.getUTCHours()).padStart(2, "0")}` +
    `${String(now.getUTCMinutes()).padStart(2, "0")}`;
  const nowKey = Number(stamp);
  const future = hours.find((h) => weatherSortKey(h.date, h.time) >= nowKey);
  return future ?? hours[hours.length - 1];
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
        .filter(
          (record: HikingRecord) =>
            record.status !== "active" && record.status !== "cancelled",
        )
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
   * 산행 시작 시 active 상태의 hiking_records row를 먼저 생성합니다.
   * 백엔드는 이 active row를 기준으로 워치 생체 데이터를 연결할 수 있습니다.
   */
  async startHikingRecord(
    record: StartHikingRecordInput,
    token?: string | null,
  ): Promise<HikingRecord> {
    const endpoint = `${AUTH_API_BASE_URL}/data/hiking_records`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const now = toKoreanISOString();
    const basePayload: Record<string, unknown> = {
      user_id: record.userId,
      mountain_name: record.mountainName,
      status: "active",
      started_at: now,
      duration_minutes: null,
      distance_km: null,
      avg_heart_rate: null,
      max_altitude: null,
      calories: null,
      steps: null,
    };
    // 주의: hiking_records 테이블에 course_id/course_name 컬럼이 없어
    // 해당 필드를 보내면 백엔드가 500을 반환하므로 basePayload만 전송한다.

    async function postRecord(payload: Record<string, unknown>) {
      const response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const message = await getErrorMessage(
          response,
          `Failed to start hiking record (Status: ${response.status})`,
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
      return await postRecord(basePayload);
    } catch (error) {
      console.error("[API] Error in startHikingRecord:", error);
      throw error;
    }
  },

  /**
   * active hiking_records row를 산행 종료 결과로 업데이트합니다.
   */
  async finishHikingRecord(
    recordId: number,
    record: FinishHikingRecordInput,
    token?: string | null,
  ): Promise<HikingRecord> {
    const endpoint = `${AUTH_API_BASE_URL}/data/hiking_records/${recordId}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const payload: Record<string, unknown> = {
      status: "completed",
      ended_at: toKoreanISOString(),
      duration_minutes: record.durationMinutes,
      distance_km: record.distanceKm,
      avg_heart_rate: record.avgHeartRate,
      max_altitude: record.maxAltitude ?? record.elevationGainM ?? null,
      calories: record.calories ?? null,
      elevation_gain: record.elevationGainM ?? record.maxAltitude ?? null,
    };

    if (record.steps !== undefined && record.steps !== null) {
      payload.steps = record.steps;
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
          `Failed to finish hiking record (Status: ${response.status})`,
        );
        throw new Error(message);
      }

      const data = await response.json();
      const row = Array.isArray(data)
        ? data[0]
        : (data.record ?? data.row ?? data.data ?? data);

      return normalizeHikingRecord(row);
    } catch (error) {
      console.error("[API] Error in finishHikingRecord:", error);
      throw error;
    }
  },

  /**
   * 내비게이션 중 active hiking_records row의 '잔여 ETA/거리'를 갱신합니다.
   * duration_minutes=잔여분, distance_km=잔여km로 써두면, 워치가
   * /data/hiking_records/filter({user_id})로 읽어 워치 대시보드에 표시합니다.
   * 백그라운드 중계용이므로 실패해도 throw하지 않습니다(내비 흐름 보호).
   */
  async updateHikingProgress(
    recordId: number,
    remainingMinutes: number,
    remainingKm: number,
    token?: string | null,
  ): Promise<boolean> {
    const endpoint = `${AUTH_API_BASE_URL}/data/hiking_records/${recordId}`;
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
        body: JSON.stringify({
          duration_minutes: Math.max(0, Math.round(remainingMinutes)),
          distance_km: Math.max(0, Number(remainingKm.toFixed(2))),
        }),
      });
      if (!response.ok) {
        const message = await getErrorMessage(
          response,
          `Failed to update hiking progress (Status: ${response.status})`,
        );
        console.warn("[API] updateHikingProgress 실패:", message);
        return false;
      }
      return true;
    } catch (error) {
      console.warn("[API] updateHikingProgress 네트워크 오류:", error);
      return false;
    }
  },

  /**
   * 로그인 후 user_id + JWT를 Flask relay에 업데이트합니다(워치 동기화용).
   * 워치가 fetchWatchCredentials()로 폴링해 자동 반영되므로 호출측은 await 안 함.
   */
  async updateWatchCredentials(userId: number, token: string): Promise<void> {
    let baseUrl = FLASK_RELAY_BASE_URL.trim();
    if (baseUrl.endsWith("/")) baseUrl = baseUrl.slice(0, -1);
    if (!baseUrl) return; // Flask relay 미구성 시 무시

    try {
      await fetch(`${baseUrl}/api/watch-credentials`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, token }),
      });
      // 성공/실패 모두 무시 (백그라운드 동기화)
    } catch (error) {
      console.warn("[API] updateWatchCredentials 오류:", error);
    }
  },

  /**
   * 산행 상태(공유 신호)를 갱신합니다. active/paused/completed/cancelled.
   * 워치·모바일이 동일 레코드의 status를 폴링해 시작/일시정지/종료를 동기화합니다.
   * 백그라운드 동기화용이라 실패해도 throw하지 않습니다.
   */
  async updateHikingStatus(
    recordId: number,
    status: "active" | "paused" | "completed" | "cancelled" | "anomaly",
    token?: string | null,
  ): Promise<boolean> {
    const endpoint = `${AUTH_API_BASE_URL}/data/hiking_records/${recordId}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const body: Record<string, unknown> = { status };
    if (status === "completed" || status === "cancelled") {
      body.ended_at = toKoreanISOString();
    }

    try {
      const response = await fetch(endpoint, {
        method: "PUT",
        headers,
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const message = await getErrorMessage(
          response,
          `Failed to update hiking status (Status: ${response.status})`,
        );
        console.warn("[API] updateHikingStatus 실패:", message);
        return false;
      }
      return true;
    } catch (error) {
      console.warn("[API] updateHikingStatus 네트워크 오류:", error);
      return false;
    }
  },

  /**
   * 특정 hiking_records row의 현재 status를 조회합니다(외부 변경 감지용).
   * 조회 실패 시 null 반환(동기화 폴러가 안전하게 무시).
   */
  async getHikingRecordStatus(
    recordId: number,
    token?: string | null,
  ): Promise<string | null> {
    const endpoint = `${AUTH_API_BASE_URL}/data/hiking_records/${recordId}`;
    const headers: Record<string, string> = {
      Accept: "application/json",
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    try {
      const response = await fetch(endpoint, { method: "GET", headers });
      if (!response.ok) return null;
      const data = await response.json();
      const row = Array.isArray(data)
        ? data[0]
        : (data.record ?? data.row ?? data.data ?? data);
      const status = row?.status;
      return typeof status === "string" ? status : null;
    } catch (error) {
      console.warn("[API] getHikingRecordStatus 오류:", error);
      return null;
    }
  },

  /**
   * active hiking_records row를 중단 상태로 업데이트합니다.
   */
  async cancelHikingRecord(
    recordId: number,
    token?: string | null,
  ): Promise<HikingRecord> {
    const endpoint = `${AUTH_API_BASE_URL}/data/hiking_records/${recordId}`;
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
        body: JSON.stringify({
          status: "cancelled",
          ended_at: toKoreanISOString(),
        }),
      });

      if (!response.ok) {
        const message = await getErrorMessage(
          response,
          `Failed to cancel hiking record (Status: ${response.status})`,
        );
        throw new Error(message);
      }

      const data = await response.json();
      const row = Array.isArray(data)
        ? data[0]
        : (data.record ?? data.row ?? data.data ?? data);

      return normalizeHikingRecord(row);
    } catch (error) {
      console.error("[API] Error in cancelHikingRecord:", error);
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

    const enrichedPayload: Record<string, unknown> = {
      ...legacyPayload,
      status: "completed",
      ended_at: toKoreanISOString(),
      course_id: record.courseId ?? null,
      course_name: record.courseName ?? null,
      calories: record.calories ?? null,
      elevation_gain: record.elevationGainM ?? record.maxAltitude ?? null,
    };

    if (record.steps !== undefined && record.steps !== null) {
      enrichedPayload.steps = record.steps;
    }

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
   * 산 목록을 unified_mountain_paths 테이블에서 가져옵니다.
   * 코스 수는 recommended_courses_v2와 mountain_name(키)으로 엮어 계산하고,
   * 코스가 1개 이상인 산만 노출합니다.
   */
  async getMountains(): Promise<Mountain[]> {
    console.log("[API] Fetching mountains from unified_mountain_paths");
    try {
      if (cachedRecommendedMountains) return cachedRecommendedMountains;

      // 1. recommended_courses_v2 → 산 이름별 코스 수 (join 키 = mountain_name)
      const courseRows = (await getRecommendedCourseRows()).filter(
        (row) => getRecommendedCourseId(row) && getRecommendedMountainName(row),
      );
      const countByName = new Map<string, number>();
      courseRows.forEach((row) => {
        const name = getRecommendedMountainName(row);
        countByName.set(name, (countByName.get(name) ?? 0) + 1);
      });

      // 2. unified_mountain_paths → 산 목록/메타데이터 (nodes/courses 제외해 경량 조회)
      const unifiedRows = await fetchDataRows<UnifiedMountainPath>(
        "unified_mountain_paths",
        {
          select: "id,mountain_name,region,height,description,image_url",
          limit: "1000",
        },
      );

      // 3. mountain_name으로 엮어 Mountain[] 구성 (코스 ≥1개인 산만)
      const seen = new Set<string>();
      const mountains: Mountain[] = [];
      unifiedRows.forEach((row) => {
        const name = normalizeMountainKey(row.mountain_name);
        if (!name || seen.has(name)) return;
        const courseCount = countByName.get(name) ?? 0;
        if (courseCount <= 0) return; // 코스 없는 산은 제외
        seen.add(name);
        mountains.push(buildMountainFromRailwayRow(row, courseCount));
      });

      // 4. unified에 없지만 코스는 있는 산도 폴백으로 포함 (이름 키 누락 방지)
      if (mountains.length === 0) {
        console.warn(
          "[API] unified_mountain_paths 비어있음 → recommended_courses_v2 기반 폴백",
        );
        const countById = new Map<string, number>();
        courseRows.forEach((row) => {
          const id = getRecommendedMountainId(row);
          countById.set(id, (countById.get(id) ?? 0) + 1);
        });
        const fb = buildMountainsFromRecommendedCourses(courseRows);
        fb.forEach((m) => (m.courseCount = countById.get(m.id) ?? 0));
        mountains.push(...fb.filter((m) => m.courseCount > 0));
      }

      cachedRecommendedMountains = mountains.sort(
        (a, b) => b.courseCount - a.courseCount,
      );

      return cachedRecommendedMountains;
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
   * recommended_courses 테이블에서 특정 산의 코스 목록을 가져옵니다.
   */
  async getCourses(mountainId: string): Promise<MountainCourse[]> {
    console.log(
      `[API] Fetching courses for ${mountainId} from recommended_courses`,
    );
    try {
      const cached = courseCache.get(mountainId);
      if (cached) return cached;

      const [allRows, metaMap] = await Promise.all([
        getRecommendedCourseRows(),
        getUnifiedMetaMap(),
      ]);
      const rows = allRows.filter(
        (row) =>
          getRecommendedMountainId(row) === mountainId ||
          getRecommendedMountainName(row) === mountainId,
      );

      // 해당 산의 노드(고도 포함)를 가져와 코스별 정상 고도 산출에 사용
      const mountainName = rows[0]
        ? getRecommendedMountainName(rows[0])
        : mountainId;
      const unified = await this.getUnifiedMountainPath(mountainName);
      const nodes = unified?.nodes ?? null;

      const deduped = new Map<string, RecommendedCourseRow>();
      rows.forEach((row) => {
        const key = getRecommendedCourseId(row);
        const prev = deduped.get(key);
        if (
          !prev ||
          getRecommendedDistanceKm(row) > getRecommendedDistanceKm(prev)
        ) {
          deduped.set(key, row);
        }
      });

      const courses = Array.from(deduped.values())
        .sort(
          (a, b) => getRecommendedDistanceKm(b) - getRecommendedDistanceKm(a),
        )
        .slice(0, COURSE_DISPLAY_LIMIT)
        .map((row) =>
          normalizeRecommendedCourse(
            row,
            metaMap.get(getRecommendedMountainName(row)),
            nodes,
          ),
        );

      courseCache.set(mountainId, courses);
      return courses;
    } catch (error) {
      console.error("[API] Error in getCourses:", error);
      throw error;
    }
  },

  /**
   * 코스 ID를 기반으로 실제 경로와 ETA를 가져옵니다. (recommended_courses 기반)
   */
  async getCourseRoute(courseId: string): Promise<PathResult> {
    console.log(
      `[API] Fetching course route ${courseId} from recommended_courses`,
    );
    try {
      const cached = courseRouteCache.get(courseId);
      if (cached) return cached;

      const rows = await getRecommendedCourseRows();
      const row =
        rows.find((item) => getRecommendedCourseId(item) === courseId) ?? null;

      if (!row) {
        throw new Error(`코스 경로를 찾지 못했습니다: ${courseId}`);
      }

      const path = getRecommendedPath(row);
      const distKm = getRecommendedDistanceKm(row);
      const totalMin = getRecommendedDurationMinutes(row);
      const durationSec = totalMin * 60;
      const distanceM = Math.round(distKm * 1000);
      const mountainName = getRecommendedMountainName(row);
      const courseName = cleanText(row.course_name, `코스 ${courseId}`);

      const route: PathResult = {
        route_id: courseId,
        path,
        path_names: path.map((_, index) => `${mountainName} ${index + 1}`),
        summary: {
          distance_m: distanceM,
          duration_sec: durationSec,
          ascent_m: 0,
          descent_m: 0,
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
        course_name: courseName,
      } as PathResult;
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
   * 산의 기상청 시간대별 예보(mountain_weather)를 가져옵니다.
   * seoul_mountain_info.weather_mountain_num이 없는 산은 available=false 로 반환.
   */
  async getMountainWeather(mountainName: string): Promise<MountainWeather> {
    const empty: MountainWeather = {
      available: false,
      mountainNum: null,
      current: null,
      hourly: [],
      warnings: [],
    };
    try {
      const numByName = await getWeatherNumByName();
      const num = numByName.get(normalizeMountainKey(mountainName)) ?? null;
      if (num == null) return empty;

      const cached = mountainWeatherCache.get(num);
      if (cached) return cached;

      // filter body에 limit 키를 넣으면 기본 100행 상한이 풀려 전량 조회됨.
      const rows = await fetchFilteredDataRows<MountainWeatherRow>(
        MOUNTAIN_WEATHER_TABLE,
        { mountain_num: num, limit: 5000 },
        { select: "mountain_num,fcst_date,fcst_time,category,fcst_value" },
      );

      const allHours = groupWeatherRows(rows);
      if (allHours.length === 0) return empty;

      // current = 현재 시각에 가장 가까운(>= now, 없으면 마지막) 예보 슬롯
      const current = pickCurrentHour(allHours);
      const currentIdx = current ? allHours.indexOf(current) : -1;
      // strip = current부터 앞으로의 예보. 미래가 부족하면 current를 끝에 두는
      // 최근 구간(최대 12칸)으로 폴백해 항상 채워지도록 함.
      let hourly = currentIdx >= 0 ? allHours.slice(currentIdx) : allHours;
      if (hourly.length < 6 && currentIdx >= 0) {
        hourly = allHours.slice(Math.max(0, currentIdx - 11), currentIdx + 1);
      }

      const result: MountainWeather = {
        available: true,
        mountainNum: num,
        current,
        hourly,
        warnings: buildWeatherWarnings(hourly),
      };
      mountainWeatherCache.set(num, result);
      return result;
    } catch (error) {
      console.error("[API] Error in getMountainWeather:", error);
      return empty;
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
   * 긴급 상황 발생 시 emergency_logs 테이블에 데이터를 저장합니다.
   */
  async createEmergencyLog(
    data: EmergencyRequest,
    token?: string,
  ): Promise<any> {
    const url = `${AUTH_API_BASE_URL}/data/emergency_logs`;
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

      // DB 테이블 컬럼 규격에 맞춰 필드 매핑 (snake_case)
      const payload = {
        user_id: data.userId,
        event_type: data.eventType,
        lat: data.location.lat,
        lng: data.location.lng,
        occurred_at: data.timestamp,
      };

      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const message = await getErrorMessage(
          response,
          `Failed to create emergency log (Status: ${response.status})`,
        );
        console.warn("[API] Backend emergency log save failed:", message);

        if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
          throw new Error(message);
        }

        const fallbackResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/emergency_logs`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: SUPABASE_ANON_KEY,
              Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
              Prefer: "return=representation",
            },
            body: JSON.stringify(payload),
          },
        );

        if (!fallbackResponse.ok) {
          const fallbackMessage = await getErrorMessage(
            fallbackResponse,
            `Failed to create emergency log fallback (Status: ${fallbackResponse.status})`,
          );
          throw new Error(fallbackMessage);
        }

        return await fallbackResponse.json();
      }

      return await response.json();
    } catch (error) {
      console.error("[API] Error in createEmergencyLog:", error);
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
    const url = `${AUTH_API_BASE_URL}/api/emergency`;
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

  /**
   * 현재 로그인 사용자의 최신 생체 데이터 1개를 가져옵니다.
   */
  async getLatestHealthData(token: string): Promise<HealthData | null> {
    const endpoint = `${AUTH_API_BASE_URL}/health/data/latest`;

    try {
      const response = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const message = await getErrorMessage(
          response,
          `Failed to fetch latest health data (Status: ${response.status})`,
        );
        throw new Error(message);
      }

      const data = await response.json();
      const row = data?.data === null ? null : unwrapRow<any>(data);

      return row && typeof row === "object" && row.id !== undefined
        ? normalizeHealthData(row)
        : null;
    } catch (error) {
      console.error("[API] Error in getLatestHealthData:", error);
      throw error;
    }
  },

  /**
   * 현재 로그인 사용자의 최근 생체 데이터 목록을 가져옵니다. 그래프 표시용입니다.
   */
  async getRecentHealthData(token: string, limit = 60): Promise<HealthData[]> {
    const safeLimit = Math.max(1, Math.min(300, Math.round(limit)));
    const query = new URLSearchParams({
      limit: String(safeLimit),
    });
    const endpoint = `${AUTH_API_BASE_URL}/health/data/recent?${query.toString()}`;

    try {
      const response = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const message = await getErrorMessage(
          response,
          `Failed to fetch recent health data (Status: ${response.status})`,
        );
        throw new Error(message);
      }

      const data = await response.json();
      return unwrapRows<any>(data).map(normalizeHealthData);
    } catch (error) {
      console.error("[API] Error in getRecentHealthData:", error);
      throw error;
    }
  },

  async getPhotoSpots(): Promise<PhotoSpot[]> {
    try {
      const rows = await fetchDataRows<PhotoSpot>("Photo_Spots", {
        select: "spot,address,latitude,longitude",
        limit: "500",
      });
      return rows;
    } catch (error) {
      console.error("[API] Error in getPhotoSpots:", error);
      throw error;
    }
  },
};
