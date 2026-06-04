import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import type { MountainWeather } from "../data/api";

// ── 날씨 표시 헬퍼 ──────────────────────────────────────────────────────
const SKY_INFO: Record<
  number,
  { label: string; icon: keyof typeof Ionicons.glyphMap; color: string }
> = {
  1: { label: "맑음", icon: "sunny", color: "#f59e0b" },
  3: { label: "구름많음", icon: "partly-sunny", color: "#64748b" },
  4: { label: "흐림", icon: "cloudy", color: "#94a3b8" },
};

function isRainyHour(hour: { pcp: string | null; pop: number | null }): boolean {
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

function weatherIconFor(hour: {
  sky: number | null;
  pcp: string | null;
  pop: number | null;
}): { icon: keyof typeof Ionicons.glyphMap; color: string } {
  if (isRainyHour(hour)) return { icon: "rainy", color: "#3b82f6" };
  const sky = hour.sky != null ? SKY_INFO[hour.sky] : undefined;
  return sky
    ? { icon: sky.icon, color: sky.color }
    : { icon: "partly-sunny", color: "#64748b" };
}

function formatFcstHour(time: string): string {
  return `${time.slice(0, 2)}시`;
}

export default function WeatherCard({
  weather,
  loading,
}: {
  weather: MountainWeather | null;
  loading: boolean;
}) {
  if (loading) {
    return (
      <View style={styles.card}>
        <ActivityIndicator color="#3b82f6" />
        <Text style={styles.loadingText}>날씨 예보를 불러오는 중...</Text>
      </View>
    );
  }

  if (!weather || !weather.available || !weather.current) {
    return (
      <View style={styles.card}>
        <View style={styles.emptyRow}>
          <Ionicons name="cloud-offline-outline" size={22} color="#9ca3af" />
          <Text style={styles.emptyText}>이 산은 날씨 정보가 없습니다.</Text>
        </View>
      </View>
    );
  }

  const cur = weather.current;
  const main = weatherIconFor(cur);
  const skyLabel = isRainyHour(cur)
    ? "비"
    : (cur.sky != null ? SKY_INFO[cur.sky]?.label : undefined) ?? "-";
  const nextHours = weather.hourly.slice(0, 12);

  return (
    <View style={styles.card}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Ionicons name="partly-sunny-outline" size={16} color="#3b82f6" />
        <Text style={styles.headerTitle}>산악 날씨</Text>
        <Text style={styles.headerTime}>{formatFcstHour(cur.time)} 기준</Text>
      </View>

      {/* 현재 예보 */}
      <View style={styles.currentRow}>
        <Ionicons name={main.icon} size={44} color={main.color} />
        <View style={styles.tempBox}>
          <Text style={styles.temp}>
            {cur.tmp != null ? `${Math.round(cur.tmp)}°` : "-"}
          </Text>
          <Text style={styles.skyLabel}>{skyLabel}</Text>
        </View>
        <View style={styles.metrics}>
          <View style={styles.metricItem}>
            <Ionicons name="umbrella-outline" size={13} color="#3b82f6" />
            <Text style={styles.metricText}>
              강수 {cur.pop != null ? `${Math.round(cur.pop)}%` : "-"}
            </Text>
          </View>
          <View style={styles.metricItem}>
            <Ionicons name="water-outline" size={13} color="#0ea5e9" />
            <Text style={styles.metricText}>
              습도 {cur.reh != null ? `${Math.round(cur.reh)}%` : "-"}
            </Text>
          </View>
          <View style={styles.metricItem}>
            <Ionicons name="flag-outline" size={13} color="#64748b" />
            <Text style={styles.metricText}>
              바람 {cur.wsd != null ? `${cur.wsd.toFixed(1)}m/s` : "-"}
            </Text>
          </View>
        </View>
      </View>

      {/* 시간별 예보 */}
      {nextHours.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.hourlyRow}
        >
          {nextHours.map((h) => {
            const ic = weatherIconFor(h);
            const isNow = h.date === cur.date && h.time === cur.time;
            return (
              <View key={`${h.date}${h.time}`} style={styles.hourItem}>
                <Text style={[styles.hourTime, isNow && styles.hourTimeNow]}>
                  {isNow ? "지금" : formatFcstHour(h.time)}
                </Text>
                <Ionicons name={ic.icon} size={18} color={ic.color} />
                <Text style={styles.hourTemp}>
                  {h.tmp != null ? `${Math.round(h.tmp)}°` : "-"}
                </Text>
                <Text style={styles.hourPop}>
                  {h.pop != null ? `${Math.round(h.pop)}%` : ""}
                </Text>
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* 안전 경고 */}
      {weather.warnings.length > 0 && (
        <View style={styles.warnBox}>
          {weather.warnings.map((w, i) => (
            <View key={i} style={styles.warnItem}>
              <Ionicons name="warning" size={14} color="#d97706" />
              <Text style={styles.warnText}>{w}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#eef2ff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 12,
    color: "#9ca3af",
    textAlign: "center",
  },
  emptyRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  emptyText: { fontSize: 13, color: "#9ca3af", fontWeight: "500" },
  header: { flexDirection: "row", alignItems: "center", gap: 6 },
  headerTitle: { fontSize: 14, fontWeight: "700", color: "#111827" },
  headerTime: { marginLeft: "auto", fontSize: 11, color: "#9ca3af" },
  currentRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    gap: 12,
  },
  tempBox: { alignItems: "center" },
  temp: { fontSize: 30, fontWeight: "800", color: "#111827" },
  skyLabel: { fontSize: 12, color: "#6b7280", marginTop: -2 },
  metrics: { flex: 1, gap: 5, marginLeft: 4 },
  metricItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  metricText: { fontSize: 12, color: "#4b5563", fontWeight: "500" },
  hourlyRow: { gap: 14, paddingTop: 14, paddingHorizontal: 2 },
  hourItem: { alignItems: "center", gap: 4, minWidth: 38 },
  hourTime: { fontSize: 11, color: "#9ca3af", fontWeight: "500" },
  hourTimeNow: { color: "#2563eb", fontWeight: "700" },
  hourTemp: { fontSize: 12, color: "#111827", fontWeight: "700" },
  hourPop: { fontSize: 10, color: "#3b82f6" },
  warnBox: {
    marginTop: 14,
    backgroundColor: "#fffbeb",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#fde68a",
    padding: 10,
    gap: 6,
  },
  warnItem: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
  warnText: { flex: 1, fontSize: 12, color: "#92400e", lineHeight: 17 },
});
