# 산행이 (SanHaengii-App)

안전하고 스마트한 산행을 위한 React Native / Expo 기반 Android 앱입니다.

현재 앱에는 카카오 로그인, 네이버 지도 기반 경로 표시, 산행 기록 저장, 성취도/배지 화면이 포함되어 있습니다.

## 주요 기능

- 카카오 로그인 및 게스트 모드
- 네이버 지도 SDK 기반 지도/경로 표시
- 산, 코스, 경로 API 연동
- 산행 기록 저장 및 누적 성취도 표시
- 배지 목록 및 획득 상태 표시
- 프로필 화면에서 사용자 정보와 산행 기록 조회

## 기술 스택

| 분류 | 기술 |
| :--- | :--- |
| Framework | React Native, Expo |
| Language | TypeScript |
| Navigation | React Navigation |
| Map | Naver Map SDK |
| Auth | Kakao Login |
| Storage | Expo SecureStore |
| Backend | Railway API |

## 테스트 전 준비물

- Node.js
- Git
- Android Studio
- Android Emulator
- Java / Android SDK 환경

이 앱은 카카오 로그인과 네이버 지도 네이티브 모듈을 사용하므로 **Expo Go로는 테스트할 수 없습니다.**

반드시 아래 명령으로 Android 네이티브 빌드를 실행해야 합니다.

```powershell
npx expo run:android
```

## 설치 방법

```powershell
git clone https://github.com/uujeongmin/SanHaengii-App.git
cd SanHaengii-App
npm install
```

## 환경 변수 설정

프로젝트 루트에 `.env` 파일을 만들고 아래 값을 채워주세요.

```env
EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY=카카오_네이티브_앱_키
NAVER_MAP_CLIENT_ID=네이버_지도_CLIENT_ID

EXPO_PUBLIC_AUTH_API_BASE_URL=https://web-production-94f63.up.railway.app
EXPO_PUBLIC_DATA_API_BASE_URL=https://web-production-94f63.up.railway.app
```

### 서버 주소 설명

| 용도 | 기본 주소 | 설명 |
| :--- | :--- | :--- |
| 인증/회원/배지 API | `https://web-production-94f63.up.railway.app` | 카카오 로그인, 유저 정보, 산행 기록, 배지 |
| 산/코스/경로 데이터 API | `https://web-production-94f63.up.railway.app` | `/data/unified_mountain_paths`, `/data/seoul_mountain_paths` 기반 |

현재 산 목록, 코스 목록, 코스별 경로 표시는 Railway 서버에서 가져옵니다. 로컬 백엔드는 기본 테스트에 필요하지 않습니다.

Railway에 실제 코스가 없는 기존 목업 산은 목록에서 제외됩니다.

직접 좌표를 넣어 새 경로를 생성하는 레거시 기능을 테스트해야 할 때만 아래 값을 추가하고 로컬 백엔드를 실행하세요.

```env
EXPO_PUBLIC_TRAIL_API_BASE_URL=http://10.0.2.2:5001
```

백엔드 확인:

```powershell
curl.exe https://web-production-94f63.up.railway.app/health
```

## Android 에뮬레이터 설정

권장 설정:

- Pixel 7 또는 Pixel 8
- API 35 또는 API 36
- x86_64 이미지
- Internal Storage 16GB 이상
- Graphics: Hardware

여러 에뮬레이터가 켜져 있으면 Expo가 다른 디바이스에 설치할 수 있으니, 테스트할 에뮬레이터 하나만 켜는 것을 권장합니다.

연결 확인:

```powershell
adb devices
```

실행:

```powershell
npx expo run:android
```

## Kakao / Naver 설정 주의점

Android 패키지명:

```text
com.dohwi.sanhaengii
```

팀원 PC에서 새로 빌드하면 debug keystore가 달라질 수 있습니다. 카카오 로그인이나 네이버 지도가 동작하지 않으면 각 개발자 PC의 key hash / SHA-1을 등록해야 합니다.

SHA-1 확인:

```powershell
keytool -list -v -keystore android/app/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

카카오 key hash는 Kakao Developers에 Android 플랫폼 키 해시로 추가해야 합니다.

네이버 지도는 Naver Cloud Console의 Android 앱 설정에 패키지명과 SHA-1이 맞게 등록되어 있어야 합니다.

## DB / 백엔드 준비 사항

성취도와 배지를 정상 테스트하려면 백엔드의 `/data/{table}` allowlist에 아래 테이블이 포함되어야 합니다.

```text
unified_mountain_paths
seoul_mountain_paths
badges
user_badges
hiking_records
users
```

`badges`, `user_badges`가 allowlist에 없으면 앱 로그에 아래와 같은 에러가 발생합니다.

```text
'badges' 테이블 접근 불가
'user_badges' 테이블 접근 불가
```

`user_badges`는 중복 지급 방지를 위해 아래 unique 제약을 권장합니다.

```sql
alter table public.user_badges
add constraint user_badges_user_id_badge_id_key
unique (user_id, badge_id);
```

## 테스트 체크리스트

1. 앱 실행 후 카카오 로그인 또는 게스트 모드 진입
2. 홈 화면에서 산 목록이 보이는지 확인
3. 산 선택 후 코스 카드가 보이는지 확인
4. 코스 시작 후 네이버 지도와 경로가 표시되는지 확인
5. 내비게이션 화면에서 `산행 기록 저장` 버튼을 눌러 기록 저장
6. 성취도 화면에서 누적 거리/고도/칼로리/최근 기록 확인
7. 성취도 화면의 `내가 획득한 배지`와 `전체보기` 확인
8. 홈 우측 프로필 버튼을 눌러 프로필/산행 기록/배지 확인

## 자주 발생하는 문제

### APK 설치 중 저장공간 부족

에러:

```text
INSTALL_FAILED_INSUFFICIENT_STORAGE
```

해결:

```powershell
adb shell df -h /data
adb shell pm trim-caches 2G
adb uninstall com.dohwi.sanhaengii
npx expo run:android
```

그래도 부족하면 Android Studio Device Manager에서 에뮬레이터를 `Wipe Data` 하거나 Internal Storage 16GB 이상으로 새 에뮬레이터를 생성하세요.

### 네이버 로고만 보이고 지도가 안 보임

확인할 것:

- `.env`의 `NAVER_MAP_CLIENT_ID`
- AndroidManifest의 Naver Map metadata
- Naver Cloud Console의 패키지명 `com.dohwi.sanhaengii`
- Debug SHA-1 등록 여부

### 카카오 로그인 실패

확인할 것:

- `.env`의 `EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY`
- Kakao Developers의 Android 플랫폼 패키지명
- Kakao key hash 등록 여부
- 인증 서버 `/auth/kakao` 응답 상태

### 산 목록이 안 보임

Railway 서버와 데이터 테이블 접근 상태를 확인하세요.

```powershell
curl.exe https://web-production-94f63.up.railway.app/health
curl.exe "https://web-production-94f63.up.railway.app/data/unified_mountain_paths?select=id,mountain_name&limit=5"
curl.exe "https://web-production-94f63.up.railway.app/data/seoul_mountain_paths?select=id,mountain_name&limit=5"
```

`/api/mountains`는 Railway 서버에 없는 엔드포인트입니다. 앱은 `/data/{table}` 기반으로 산 데이터를 가져옵니다.

## 개발 검증 명령

```powershell
npx tsc --noEmit
npm run lint
```

## 협업 가이드

### 커밋 메시지

형식:

```text
태그: 작업 내용
```

예시:

```text
feat: add Kakao auth, Naver route map, hiking records, and badges
fix: resolve map client id configuration
docs: update Android testing guide
```

### 브랜치 / PR

- `main`: 최종 기준 브랜치
- `feature/기능명` 또는 `feat/기능명`: 기능 개발 브랜치
- 기능 작업 후 GitHub Pull Request로 병합 요청

PR 작성 예시:

```md
## Summary
- 카카오 로그인 및 게스트 로그인 추가
- 네이버 지도 경로 표시 연동
- 산행 기록 저장 및 성취도 화면 DB 연동
- 배지 목록/획득 상태 DB 연동

## Test
- npx tsc --noEmit
- npm run lint
- Android emulator에서 주요 화면 확인
```
