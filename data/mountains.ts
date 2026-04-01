/**
 * 산·코스 데이터 (웹 앱 /src/app/data/mountains.ts 와 동기화)
 */

export interface MountainCourse {
  id: string;
  mountainId: string;
  title: string;
  desc: string;
  img: string;
  tags: string[];
  distance: string;
  time: string;
  difficulty: '하' | '중' | '상';
  elevation: string;
  startPoint: string;
  highlights: string[];
  elevationProfile: number[];
}

export interface Mountain {
  id: string;
  name: string;
  region: string;
  altitude: number;
  description: string;
  img: string;
  courseCount: number;
}

export const MOUNTAINS: Mountain[] = [
  {
    id: 'hallasan',
    name: '한라산',
    region: '제주특별자치도',
    altitude: 1950,
    description: '남한 최고봉, 제주도의 상징',
    img: 'https://images.unsplash.com/photo-1633437933765-67f9b9b7d244?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800',
    courseCount: 4,
  },
  {
    id: 'seoraksan',
    name: '설악산',
    region: '강원도 속초시',
    altitude: 1708,
    description: '기암괴석과 계곡의 절경',
    img: 'https://images.unsplash.com/photo-1700064160470-efe6b77333c8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800',
    courseCount: 4,
  },
  {
    id: 'jirisan',
    name: '지리산',
    region: '경남·전남·전북',
    altitude: 1915,
    description: '한반도 내륙 최고봉, 국립공원',
    img: 'https://images.unsplash.com/photo-1742452982419-abe71a14a203?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800',
    courseCount: 4,
  },
  {
    id: 'bukhansan',
    name: '북한산',
    region: '서울·경기도',
    altitude: 836,
    description: '서울 근교 도심 속 명산',
    img: 'https://images.unsplash.com/photo-1704961254037-bb105fe556bf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800',
    courseCount: 4,
  },
];

export const MOUNTAIN_COURSES: MountainCourse[] = [
  // ── 한라산 ──
  {
    id: 'hallasan-seongpanak',
    mountainId: 'hallasan',
    title: '성판악 코스',
    desc: '한라산 정상(백록담)에 오를 수 있는 대표 코스. 완만한 경사로 백록담까지 이어진다.',
    img: 'https://images.unsplash.com/photo-1685330186861-278ae211fd65?auto=format&fit=crop&q=80&w=800',
    tags: ['#정상정복', '#백록담', '#대표코스'],
    distance: '9.6km', time: '4시간 30분', difficulty: '상', elevation: '+1,200m',
    startPoint: '성판악 탐방안내소',
    highlights: ['사라오름', '속밭대피소', '백록담 정상'],
    elevationProfile: [200, 350, 500, 700, 900, 1100, 1300, 1500, 1700, 1950],
  },
  {
    id: 'hallasan-gwaneumsaji',
    mountainId: 'hallasan',
    title: '관음사 코스',
    desc: '가장 험난하지만 웅장한 절경을 자랑하는 코스. 탐라계곡과 용진각 대피소를 지난다.',
    img: 'https://images.unsplash.com/photo-1692685820422-61b43dff3fca?auto=format&fit=crop&q=80&w=800',
    tags: ['#험난코스', '#계곡', '#고급자'],
    distance: '8.7km', time: '5시간', difficulty: '상', elevation: '+1,550m',
    startPoint: '관음사 탐방안내소',
    highlights: ['탐라계곡', '용진각 대피소', '백록담 북벽'],
    elevationProfile: [400, 600, 750, 950, 1200, 1450, 1650, 1800, 1950],
  },
  {
    id: 'hallasan-yeongsil',
    mountainId: 'hallasan',
    title: '영실 코스',
    desc: '병풍바위와 오백나한 기암군이 펼쳐지는 한라산 최고의 경관 코스.',
    img: 'https://images.unsplash.com/photo-1698302111883-3b20f11c6f34?auto=format&fit=crop&q=80&w=800',
    tags: ['#기암절경', '#병풍바위', '#중급'],
    distance: '3.7km', time: '1시간 30분', difficulty: '중', elevation: '+550m',
    startPoint: '영실 탐방안내소',
    highlights: ['오백나한', '병풍바위', '윗세오름'],
    elevationProfile: [1000, 1150, 1300, 1400, 1550],
  },
  {
    id: 'hallasan-eorimok',
    mountainId: 'hallasan',
    title: '어리목 코스',
    desc: '완만한 경사와 울창한 숲이 어우러진 가족 친화 코스.',
    img: 'https://images.unsplash.com/photo-1633512424789-9ad3655bec31?auto=format&fit=crop&q=80&w=800',
    tags: ['#가족추천', '#숲길', '#완만'],
    distance: '4.7km', time: '2시간 30분', difficulty: '중', elevation: '+690m',
    startPoint: '어리목 탐방안내소',
    highlights: ['만세동산', '어승생악', '윗세오름'],
    elevationProfile: [950, 1050, 1200, 1350, 1450, 1640],
  },

  // ── 설악산 ──
  {
    id: 'seoraksan-daecheongbong',
    mountainId: 'seoraksan',
    title: '대청봉 코스 (오색)',
    desc: '남설악 오색에서 출발하는 대청봉 정상 직등 코스. 짧지만 급경사가 연속된다.',
    img: 'https://images.unsplash.com/photo-1762814130010-91d6d6f634a8?auto=format&fit=crop&q=80&w=800',
    tags: ['#정상정복', '#대청봉', '#급경사'],
    distance: '6.1km', time: '3시간 30분', difficulty: '상', elevation: '+1,100m',
    startPoint: '오색 탐방지원센터',
    highlights: ['설악폭포', '끝청 대피소', '대청봉 정상'],
    elevationProfile: [600, 800, 1000, 1200, 1400, 1500, 1708],
  },
  {
    id: 'seoraksan-cheonbuldong',
    mountainId: 'seoraksan',
    title: '천불동 계곡 코스',
    desc: '수십 개의 폭포와 기암을 따라 걷는 설악산 최고의 계곡 트레킹.',
    img: 'https://images.unsplash.com/photo-1768449414649-f70b2b7fac0a?auto=format&fit=crop&q=80&w=800',
    tags: ['#계곡', '#폭포', '#절경'],
    distance: '9.3km', time: '5시간', difficulty: '상', elevation: '+1,300m',
    startPoint: '소공원 탐방안내소',
    highlights: ['비선대', '와선대', '양폭 대피소', '대청봉'],
    elevationProfile: [100, 250, 450, 700, 950, 1200, 1500, 1708],
  },
  {
    id: 'seoraksan-bisundae',
    mountainId: 'seoraksan',
    title: '비선대 코스',
    desc: '계곡물 소리를 들으며 비선대까지 이어지는 초보자 친화 코스.',
    img: 'https://images.unsplash.com/photo-1583853168794-485e809166d7?auto=format&fit=crop&q=80&w=800',
    tags: ['#초보자', '#계곡산책', '#가족'],
    distance: '3.2km', time: '1시간 30분', difficulty: '하', elevation: '+260m',
    startPoint: '소공원 탐방안내소',
    highlights: ['금강굴', '비선대'],
    elevationProfile: [100, 180, 260, 320, 360],
  },
  {
    id: 'seoraksan-ulsanbawi',
    mountainId: 'seoraksan',
    title: '울산바위 코스',
    desc: '설악산의 상징 울산바위에 오르는 코스. 정상에서 동해와 속초 시내가 보인다.',
    img: 'https://images.unsplash.com/photo-1625855191300-7df3075f07f3?auto=format&fit=crop&q=80&w=800',
    tags: ['#조망', '#기암', '#중급'],
    distance: '4.2km', time: '2시간 30분', difficulty: '중', elevation: '+510m',
    startPoint: '신흥사 탐방안내소',
    highlights: ['신흥사', '흔들바위', '울산바위 정상'],
    elevationProfile: [100, 200, 300, 420, 540],
  },

  // ── 지리산 ──
  {
    id: 'jirisan-cheonwangbong',
    mountainId: 'jirisan',
    title: '천왕봉 코스 (중산리)',
    desc: '중산리에서 지리산 최고봉 천왕봉까지 이어지는 본격 종주 입문 코스.',
    img: 'https://images.unsplash.com/photo-1685330186861-278ae211fd65?auto=format&fit=crop&q=80&w=800',
    tags: ['#정상정복', '#천왕봉', '#챌린지'],
    distance: '9.2km', time: '5시간', difficulty: '상', elevation: '+1,400m',
    startPoint: '중산리 탐방안내소',
    highlights: ['칼바위', '법계사', '천왕봉 정상'],
    elevationProfile: [500, 700, 950, 1200, 1450, 1650, 1800, 1915],
  },
  {
    id: 'jirisan-nogodan',
    mountainId: 'jirisan',
    title: '노고단 코스',
    desc: '구름 위의 초원, 노고단 고원을 걷는 지리산 서부의 대표 코스.',
    img: 'https://images.unsplash.com/photo-1692685820422-61b43dff3fca?auto=format&fit=crop&q=80&w=800',
    tags: ['#고원', '#능선', '#중급'],
    distance: '4.5km', time: '2시간', difficulty: '중', elevation: '+520m',
    startPoint: '성삼재 휴게소',
    highlights: ['노고단 대피소', '노고단 정상'],
    elevationProfile: [1100, 1250, 1350, 1450, 1507],
  },
  {
    id: 'jirisan-baemsakol',
    mountainId: 'jirisan',
    title: '뱀사골 계곡 코스',
    desc: '지리산 북부 뱀사골을 따라 걷는 계곡 트레킹. 맑은 물과 단풍이 아름답다.',
    img: 'https://images.unsplash.com/photo-1698302111883-3b20f11c6f34?auto=format&fit=crop&q=80&w=800',
    tags: ['#계곡', '#단풍', '#트레킹'],
    distance: '5.8km', time: '3시간', difficulty: '중', elevation: '+580m',
    startPoint: '뱀사골 탐방안내소',
    highlights: ['제승대', '뱀사골 대피소', '반선'],
    elevationProfile: [350, 500, 650, 780, 900, 930],
  },
  {
    id: 'jirisan-hwaeomsa',
    mountainId: 'jirisan',
    title: '화엄사 코스',
    desc: '천년 고찰 화엄사에서 출발하는 문화와 자연을 함께 즐기는 코스.',
    img: 'https://images.unsplash.com/photo-1633512424789-9ad3655bec31?auto=format&fit=crop&q=80&w=800',
    tags: ['#문화유산', '#초보자', '#가족'],
    distance: '3.8km', time: '2시간', difficulty: '하', elevation: '+420m',
    startPoint: '화엄사 탐방안내소',
    highlights: ['화엄사', '구층암', '연기암'],
    elevationProfile: [200, 350, 500, 580, 620],
  },

  // ── 북한산 ──
  {
    id: 'bukhansan-baegundae',
    mountainId: 'bukhansan',
    title: '백운대 코스 (북한산성)',
    desc: '북한산 최고봉 백운대를 정복하는 가장 인기 있는 정상 코스.',
    img: 'https://images.unsplash.com/photo-1762814130010-91d6d6f634a8?auto=format&fit=crop&q=80&w=800',
    tags: ['#정상정복', '#백운대', '#인기코스'],
    distance: '4.7km', time: '2시간 30분', difficulty: '상', elevation: '+670m',
    startPoint: '북한산성 탐방안내소',
    highlights: ['북한산성', '위문', '백운대 정상'],
    elevationProfile: [160, 280, 400, 550, 680, 836],
  },
  {
    id: 'bukhansan-insubong',
    mountainId: 'bukhansan',
    title: '인수봉 전망 코스',
    desc: '화강암 암벽 인수봉을 조망하는 코스. 등반가들의 성지를 눈앞에서 볼 수 있다.',
    img: 'https://images.unsplash.com/photo-1768449414649-f70b2b7fac0a?auto=format&fit=crop&q=80&w=800',
    tags: ['#암벽', '#조망', '#중급'],
    distance: '3.9km', time: '2시간', difficulty: '중', elevation: '+490m',
    startPoint: '우이동 탐방안내소',
    highlights: ['인수대피소', '인수봉 전망대'],
    elevationProfile: [160, 270, 390, 500, 660],
  },
  {
    id: 'bukhansan-dulegil',
    mountainId: 'bukhansan',
    title: '북한산 둘레길 코스',
    desc: '산 능선을 따라 서울 시내를 조망하며 걷는 편안한 순환 산책로.',
    img: 'https://images.unsplash.com/photo-1583853168794-485e809166d7?auto=format&fit=crop&q=80&w=800',
    tags: ['#둘레길', '#산책', '#초보자'],
    distance: '5.5km', time: '2시간 30분', difficulty: '하', elevation: '+220m',
    startPoint: '진관사 탐방안내소',
    highlights: ['진관사', '기자촌 전망대', '솔밭근린공원'],
    elevationProfile: [80, 150, 220, 280, 300, 280, 220],
  },
  {
    id: 'bukhansan-uisang',
    mountainId: 'bukhansan',
    title: '의상능선 코스',
    desc: '북한산 서쪽 의상능선을 따라 펼쳐지는 파노라마 조망과 암릉 산행.',
    img: 'https://images.unsplash.com/photo-1625855191300-7df3075f07f3?auto=format&fit=crop&q=80&w=800',
    tags: ['#능선종주', '#암릉', '#중급'],
    distance: '6.2km', time: '3시간', difficulty: '중', elevation: '+580m',
    startPoint: '효자동 탐방안내소',
    highlights: ['문수봉', '나한봉', '의상봉'],
    elevationProfile: [100, 220, 380, 500, 620, 700, 580],
  },
];

export function getCoursesByMountain(mountainId: string): MountainCourse[] {
  return MOUNTAIN_COURSES.filter((c) => c.mountainId === mountainId);
}

export function getCourseById(courseId: string): MountainCourse | undefined {
  return MOUNTAIN_COURSES.find((c) => c.id === courseId);
}

export function getMountainById(mountainId: string): Mountain | undefined {
  return MOUNTAINS.find((m) => m.id === mountainId);
}
