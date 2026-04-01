# React Native 설정 가이드

## 폴더 구조

```
src/rn/
├── App.tsx                        ← 앱 진입점 (기존 index.js에서 import)
├── screens/
│   ├── HomeScreen.tsx             ← 홈 탭
│   ├── LiveMapScreen.tsx          ← 내비게이션 탭
│   ├── AchievementScreen.tsx      ← 성취도 탭
│   └── SafetyScreen.tsx           ← 안전설정 탭
└── SETUP.md
```

## 1. 필수 패키지 설치

### Expo 프로젝트인 경우

```bash
npx expo install \
  @react-navigation/native \
  @react-navigation/bottom-tabs \
  react-native-screens \
  react-native-safe-area-context \
  @expo/vector-icons
```

### React Native CLI 프로젝트인 경우

```bash
npm install \
  @react-navigation/native \
  @react-navigation/bottom-tabs \
  react-native-screens \
  react-native-safe-area-context \
  @expo/vector-icons

# iOS 전용 (CocoaPods)
cd ios && pod install
```

## 2. index.js (또는 App.js) 수정

```js
import { AppRegistry } from 'react-native';
import App from './src/rn/App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);
```

## 3. SafeAreaProvider 설정

`src/rn/App.tsx`의 `NavigationContainer`를 `SafeAreaProvider`로 감싸야 합니다:

```tsx
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        {/* ... */}
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
```

## 4. 롯데월드타워 이미지 교체

`AchievementScreen.tsx`에서 롯데월드타워 이미지를 로컬 에셋으로 교체:

```tsx
// LANDMARK_IMAGES 객체에서:
롯데월드타워: require('../assets/lotte_world_tower.png'),
// 또는 Image source를 { uri: '...' }에서 require()로 변경
```

## 5. Android 권한 (선택)

위치 추적, 가속도 센서 등 실제 기능 구현 시 `AndroidManifest.xml`에 추가:

```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.BODY_SENSORS" />
```

## 6. 실제 지도 연동 (권장)

현재 LiveMapScreen은 정적 이미지로 구현되어 있습니다.
실제 지도 기능을 위해 다음 패키지 중 하나를 사용하세요:

- **Expo**: `npx expo install react-native-maps`
- **네이버 지도**: `@mj-studio/react-native-naver-map`
- **카카오 지도**: `react-native-kakao-maps`
