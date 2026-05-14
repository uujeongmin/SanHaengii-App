import { Platform } from "react-native";
import { Mountain, MountainCourse } from "./mountains";

/**
 * [중요] 백엔드 서버 주소 설정
 * - Android 에뮬레이터: http://10.0.2.2:5001
 * - iOS 에뮬레이터/웹: http://localhost:5001
 * - 실기기 테스트: 컴퓨터의 로컬 IP 주소 (예: http://192.168.0.10:5001)
 */
const BASE_URL =
  Platform.OS === "android" ? "http://10.0.2.2:5001" : "http://localhost:5001";

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

export const apiService = {
  /**
   * 모든 산 목록을 가져옵니다.
   */
  async getMountains(): Promise<Mountain[]> {
    const url = `${BASE_URL}/api/mountains`;
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
    const url = `${BASE_URL}/api/mountains/${mountainId}`;
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
    const url = `${BASE_URL}/api/mountains/${mountainId}/courses`;
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
    const url = `${BASE_URL}/api/courses/${courseId}/route`;
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
    const url = `${BASE_URL}/api/routes`;
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
    const url = `${BASE_URL}/api/routes/history`;
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
};
