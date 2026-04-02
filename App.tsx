/**
 * React Native 앱 진입점 (Expo 기준)
 *
 * 필요한 패키지 설치:
 *   npx expo install @react-navigation/native @react-navigation/bottom-tabs @react-navigation/native-stack
 *   npx expo install react-native-screens react-native-safe-area-context
 *   npx expo install @expo/vector-icons
 */

import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { Platform, StatusBar } from 'react-native';

import AchievementScreen from './screens/AchievementScreen';
import AllRoutesScreen from './screens/AllRoutesScreen';
import HomeScreen from './screens/HomeScreen';
import LiveMapScreen from './screens/LiveMapScreen';
import MountainCoursesScreen from './screens/MountainCoursesScreen';
import ProfileScreen from './screens/ProfileScreen';
import RouteDetailScreen from './screens/RouteDetailScreen';
import SafetyScreen from './screens/SafetyScreen';

/* ── 코스 파라미터 타입 (홈 → 내비게이션으로 전달) ── */
export interface CourseParams {
  courseId: string;
  courseName: string;
  mountainName: string;
  difficulty: string;
  distance: string;
  time: string;
  elevation: string;
}

/* ── 네비게이션 타입 ── */
export type RootStackParamList = {
  MainTabs: { screen?: keyof RootTabParamList; params?: CourseParams } | undefined;
  AllRoutes: undefined;
  MountainCourses: { mountainId: string };
  Profile: undefined;
  RouteDetail: { recordId: string }; 
};

export type RootTabParamList = {
  홈: undefined;
  내비게이션: CourseParams | undefined;
  성취도: undefined;
  안전설정: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<RootTabParamList>();

/* ── 탭 네비게이터 ── */
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: '#e5e7eb',
          borderTopWidth: 1,
          paddingBottom: Platform.OS === 'ios' ? 20 : 8,
          paddingTop: 8,
          height: Platform.OS === 'ios' ? 84 : 68,
          elevation: 20,
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.05,
          shadowRadius: 8,
        },
        tabBarActiveTintColor: '#16a34a',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarLabelStyle: { fontSize: 10, marginTop: 2 },
        tabBarIcon: ({ color, size, focused }) => {
          const icons: Record<
            string,
            {
              outline: keyof typeof Ionicons.glyphMap;
              filled: keyof typeof Ionicons.glyphMap;
            }
          > = {
            홈: { outline: 'home-outline', filled: 'home' },
            내비게이션: { outline: 'map-outline', filled: 'map' },
            성취도: { outline: 'trophy-outline', filled: 'trophy' },
            안전설정: { outline: 'shield-outline', filled: 'shield' },
          };
          const icon = icons[route.name];
          return (
            <Ionicons
              name={focused ? icon.filled : icon.outline}
              size={size}
              color={color}
            />
          );
        },
      })}
    >
      <Tab.Screen name="홈" component={HomeScreen} />
      <Tab.Screen name="내비게이션" component={LiveMapScreen} />
      <Tab.Screen name="성취도" component={AchievementScreen} />
      <Tab.Screen name="안전설정" component={SafetyScreen} />
    </Tab.Navigator>
  );
}

/* ── 루트 스택 네비게이터 ── */
export default function App() {
  return (
    <NavigationContainer>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="MainTabs" component={MainTabs} />
        <Stack.Screen
          name="AllRoutes"
          component={AllRoutesScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="MountainCourses"
          component={MountainCoursesScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="Profile"
          component={ProfileScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="RouteDetail"
          component={RouteDetailScreen}
          options={{ animation: 'slide_from_right' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
