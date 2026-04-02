# ⛰️ 산행이 (SanHaengii-App)
> **안전하고 스마트한 산행을 위한 리액트 네이티브(Expo) 가이드 앱**

---

## 📌 프로젝트 소개
**'산행이'**는 등산 초보자부터 전문가까지 모두가 안전하게 산행을 즐길 수 있도록 돕는 모바일 서비스입니다. 직관적인 등산로 정보 제공, 실시간 위치 확인, 그리고 체계적인 안전 가이드를 통해 최상의 산행 경험을 선사합니다.

## 🛠️ 기술 스택 (Tech Stack)
| 분류 | 기술 |
| :--- | :--- |
| **Framework** | ![React Native](https://img.shields.io/badge/React_Native-61DAFB?style=flat-square&logo=react&logoColor=black) ![Expo](https://img.shields.io/badge/Expo-000020?style=flat-square&logo=expo&logoColor=white) |
| **Language** | ![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white) |
| **Navigation** | React Navigation (Native Stack, Bottom Tabs) |
| **Graphics** | react-native-svg, Lucide React Native |

## 📂 폴더 구조 (Project Structure)
```text
src/
 ├── assets/      # 이미지, 폰트 등 정적 리소스
 ├── components/  # 재사용 가능한 공통 UI 컴포넌트
 ├── data/        # 산 정보 및 코스 데이터 (mountains.ts, routes.ts)
 ├── screens/     # 주요 화면 (Home, Map, Safety, Achievement 등)
 └── App.tsx      # 메인 네비게이션 및 앱 진입점
 ```
## 🚀 실행 방법 (How to Run)


이 프로젝트를 내 컴퓨터에서 실행하고 스마트폰으로 확인하는 방법입니다.



### 1. 준비물 (Prerequisites)

코드를 실행하기 전, 컴퓨터와 스마트폰에 아래 항목들이 준비되어 있어야 합니다.

- [Node.js](https://nodejs.org/) (설치 필수)

- [Git](https://git-scm.com/) (설치 필수)

- 📱 스마트폰에 **Expo Go** 앱 설치 (iOS App Store / Android Play Store)



### 2. 설치 및 실행 (Installation & Run)



저장소 클론





```text
git clone [https://github.com/uujeongmin/SanHaengii-App.git](https://github.com/uujeongmin/SanHaengii-App.git)
```
```text
cd SanHaengii-App
```
의존성 패키지 설치




```text
npm install
```
Expo 실행




```text
npx expo start
```
컴퓨터와 스마트폰이같은 Wi-Fi가 아니라면 npx expo start --tunnel로 실행해보세요



터미널에 큰 QR 코드가 나타납니다.



아이폰(iOS): 기본 카메라 앱을 켜서 QR 코드를 스캔한 뒤, 상단에 뜨는 'Expo Go에서 열기' 알림을 누릅니다.



안드로이드(Android): 'Expo Go' 앱을 실행하고 화면의 'Scan QR Code' 버튼을 눌러 스캔합니다.



## 🤝 협업 가이드 (Contribution Guide)



팀의 일관된 코드 관리와 효율적인 협업을 위해 아래 규칙을 준수합니다.



### 1. 커밋 메시지 규칙 (Commit Convention)

커밋 메시지는 작업 내용을 한눈에 파악할 수 있도록 아래 형식을 따릅니다.

* **형식**: `태그: 요약 내용` (예: `Feat: 지도 화면 로딩 에러 수정`)



| 태그 | 의미 | 예시 |

| :--- | :--- | :--- |

| **Feat** | 새로운 기능 추가 | `Feat: 워치 심박수 수신 로직 구현` |

| **Fix** | 버그 수정 | `Fix: 지도 화면 로딩 에러 수정` |

| **Docs** | 문서 수정 (README 등) | `Docs: 설치 방법 섹션 업데이트` |

| **Style** | 코드 포맷팅 (로직 변경 없음) | `Style: 세미콜론 누락 수정 및 린트 적용` |

| **Refactor** | 코드 리팩토링 (구조 개선) | `Refactor: 경로

### 2. 브랜치 전략 (Git Flow)
안정적인 배포와 병렬 개발을 위해 브랜치를 나누어 관리합니다.

* **`main`**: 최종 배포용 브랜치 (직접적인 커밋 금지)
* **`develop`**: 개발의 중심이 되는 브랜치 (팀원들의 코드가 모이는 곳)
* **`feature/기능명`**: 각 기능을 개발하는 개별 브랜치
    * *예: `feature/watch-comm`, `feature/map-ui`*

### 3. 워크플로우 (Workflow)
1. 새로운 작업 시작 시 `develop` 브랜치에서 자신의 `feature/기능명` 브랜치를 생성합니다.
2. 기능 구현이 완료되면 `develop` 브랜치로 **Pull Request(PR)**를 보냅니다.
3. 팀원의 코드 리뷰를 거친 후, 승인이 완료되면 `develop` 브랜치에 병합(Merge)합니다.