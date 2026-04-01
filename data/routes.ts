export interface Route {
  id: string;
  title: string;
  desc: string;
  img: string;
  tags: string[];
  distance: string;
  time: string;
  difficulty: '하' | '중' | '상';
  elevation: string;
}

export const ALL_ROUTES: Route[] = [
  {
    id: 'gentle',
    title: '관절 보호 완만 코스',
    desc: '경사도 15% 미만의 부드러운 산책로',
    img: 'https://images.unsplash.com/photo-1685330186861-278ae211fd65?auto=format&fit=crop&q=80&w=800',
    tags: ['#중장년추천', '#무릎보호', '#흙길'],
    distance: '3.2km',
    time: '1시간 20분',
    difficulty: '하',
    elevation: '+180m',
  },
  {
    id: 'scenic',
    title: '탁 트인 인생샷 스팟',
    desc: '인터벌 구간 + 정상 뷰 포인트 제공',
    img: 'https://images.unsplash.com/photo-1692685820422-61b43dff3fca?auto=format&fit=crop&q=80&w=800',
    tags: ['#MZ추천', '#고강도', '#사진스팟'],
    distance: '4.5km',
    time: '2시간 10분',
    difficulty: '상',
    elevation: '+520m',
  },
  {
    id: 'easy',
    title: '등린이 환영 정비 노선',
    desc: "네이버맵 기준 난이도 '하' 정비된 산길",
    img: 'https://images.unsplash.com/photo-1698302111883-3b20f11c6f34?auto=format&fit=crop&q=80&w=800',
    tags: ['#초보자', '#평탄길', '#편안함'],
    distance: '2.1km',
    time: '45분',
    difficulty: '하',
    elevation: '+95m',
  },
  {
    id: 'summit',
    title: '정상 도전 풀코스',
    desc: '능선을 따라 정상까지 이어지는 본격 등산로',
    img: 'https://images.unsplash.com/photo-1762814130010-91d6d6f634a8?auto=format&fit=crop&q=80&w=800',
    tags: ['#정상정복', '#챌린지', '#고도감'],
    distance: '7.8km',
    time: '3시간 30분',
    difficulty: '상',
    elevation: '+830m',
  },
  {
    id: 'family',
    title: '가족 나들이 숲길',
    desc: '어린이와 함께하는 편안한 단풍 숲길',
    img: 'https://images.unsplash.com/photo-1633512424789-9ad3655bec31?auto=format&fit=crop&q=80&w=800',
    tags: ['#가족추천', '#단풍', '#어린이동반'],
    distance: '2.8km',
    time: '1시간',
    difficulty: '하',
    elevation: '+110m',
  },
  {
    id: 'sunrise',
    title: '일출 트레킹 능선길',
    desc: '이른 아침 능선에서 만나는 황홀한 일출 뷰',
    img: 'https://images.unsplash.com/photo-1768449414649-f70b2b7fac0a?auto=format&fit=crop&q=80&w=800',
    tags: ['#일출', '#능선', '#새벽산행'],
    distance: '5.4km',
    time: '2시간 30분',
    difficulty: '중',
    elevation: '+390m',
  },
  {
    id: 'night',
    title: '별빛 야간 캠핑 코스',
    desc: '정상 산장에서 하룻밤, 밤하늘 별을 감상하는 코스',
    img: 'https://images.unsplash.com/photo-1583853168794-485e809166d7?auto=format&fit=crop&q=80&w=800',
    tags: ['#야간산행', '#캠핑', '#별보기'],
    distance: '6.1km',
    time: '2시간 50분',
    difficulty: '중',
    elevation: '+460m',
  },
];
