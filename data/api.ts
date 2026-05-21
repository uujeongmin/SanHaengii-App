import { Mountain, MountainCourse } from "./mountains";

export const DEV_TEST_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwic29jaWFsVHlwZSI6InRlc3QiLCJzb2NpYWxJZCI6InRlc3RfdXNlciIsImV4cCI6MTc4MTg1OTgxNn0.Xlf6e7iU8nzHFoZ3Hw9d39vWndTXOsBAwKgmsIcBA6k";

/**
 * 생체 데이터 서버 주소 (Railway) - 현재 BASE_URL로 통합됨
 */
const WATCH_BASE_URL = "https://web-production-94f63.up.railway.app";

export interface Coordinate {
  lat: number;
  lng: number;
}

export interface HealthDataRequest {
  measured_at: string; // ISO 8601
  heart_rate: number;
  steps: number;
  calories: number;
  spo2: number;
  body_temp: number;
  blood_pressure_systolic: number;
  blood_pressure_diastolic: number;
  user_id?: string | number;
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
  userId: string;
  eventType: string;
  timestamp: string;
  location: Coordinate;
}

export const apiService = {
  /**
   * 모든 산 목록을 가져옵니다.
   */
  async getMountains(): Promise<Mountain[]> {
    const url = `${WATCH_BASE_URL}/data/seoul_mountain_info`;
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
    const url = `${WATCH_BASE_URL}/data/seoul_mountain_info/${mountainId}`;
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
    const url = `${WATCH_BASE_URL}/data/seoul_mountain_paths/${mountainId}/courses`;
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
    const url = `${WATCH_BASE_URL}/data/unified_mountain_paths/${courseId}/route`;
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
    const url = `${WATCH_BASE_URL}/data/{seoul_mountain_paths}`;
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
    const url = `${WATCH_BASE_URL}/data/{hiking_records}`;
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
   * 이상 징후를 확인합니다 (백엔드 알고리즘 호출).
   */
  async checkAnomaly(sensorData: any, token?: string): Promise<AnomalyResult> {
    const url = `${WATCH_BASE_URL}/health/data`;
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
    const url = `${WATCH_BASE_URL}/health/data`;
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
   * 생체 데이터를 서버에 저장합니다 (Supabase DB 연동).
   */
  async saveHealthData(data: HealthDataRequest, token?: string): Promise<any> {
    const url = `${WATCH_BASE_URL}/data/health_data_temp`;

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
   * 저장된 생체 데이터를 가져옵니다 (Supabase DB 연동).
   */
  async getHealthData(token?: string): Promise<any> {
    const url = `${WATCH_BASE_URL}/data/health_data_temp`;
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
