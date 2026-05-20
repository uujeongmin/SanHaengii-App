import type { Badge, HikingRecord, UserBadge } from "./api";

export interface BadgeStats {
  recordCount: number;
  totalElevationM: number;
  totalDistanceKm: number;
  totalDurationMinutes: number;
  totalCalories: number;
  uniqueMountainCount: number;
  uniqueCourseCount: number;
}

function safeNumber(value: number | null | undefined) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
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

export function createBadgeStats(records: HikingRecord[]): BadgeStats {
  const mountainNames = new Set(
    records.map((record) => record.mountainName).filter(Boolean),
  );
  const courseIds = new Set(
    records
      .map((record) => record.courseId ?? record.courseName)
      .filter(Boolean),
  );

  return {
    recordCount: records.length,
    totalElevationM: records.reduce(
      (sum, record) => sum + safeNumber(record.elevationGainM),
      0,
    ),
    totalDistanceKm: records.reduce(
      (sum, record) => sum + safeNumber(record.distanceKm),
      0,
    ),
    totalDurationMinutes: records.reduce(
      (sum, record) => sum + safeNumber(record.durationMinutes),
      0,
    ),
    totalCalories: records.reduce(
      (sum, record) =>
        sum + safeNumber(record.calories ?? estimateCalories(record)),
      0,
    ),
    uniqueMountainCount: mountainNames.size,
    uniqueCourseCount: courseIds.size,
  };
}

export function getBadgeCurrentValue(badge: Badge, stats: BadgeStats) {
  switch (badge.category) {
    case "record_count":
      return stats.recordCount;
    case "distance_km":
      return stats.totalDistanceKm;
    case "elevation_m":
    case "elevation_gain_m":
      return stats.totalElevationM;
    case "calories":
      return stats.totalCalories;
    case "unique_mountains":
      return stats.uniqueMountainCount;
    case "unique_courses":
      return stats.uniqueCourseCount;
    case "duration_minutes":
      return stats.totalDurationMinutes;
    default:
      return 0;
  }
}

export function getBadgeProgress(badge: Badge, stats: BadgeStats) {
  const current = getBadgeCurrentValue(badge, stats);
  const target = safeNumber(badge.targetValue);
  const ratio = target > 0 ? Math.min(1, current / target) : 0;

  return {
    current,
    target,
    ratio,
    isEligible: target > 0 && current >= target,
  };
}

export function getEarnedBadgeIds(
  badges: Badge[],
  userBadges: UserBadge[],
  stats: BadgeStats,
) {
  const ids = new Set(userBadges.map((badge) => badge.badgeId));

  badges.forEach((badge) => {
    if (getBadgeProgress(badge, stats).isEligible) {
      ids.add(badge.id);
    }
  });

  return ids;
}

export function formatBadgeProgressValue(badge: Badge, value: number) {
  switch (badge.category) {
    case "distance_km":
      return `${value.toFixed(1)}km`;
    case "elevation_m":
    case "elevation_gain_m":
      return `${Math.round(value).toLocaleString()}m`;
    case "calories":
      return `${Math.round(value).toLocaleString()}kcal`;
    case "duration_minutes":
      return `${Math.round(value).toLocaleString()}분`;
    default:
      return Math.round(value).toLocaleString();
  }
}
