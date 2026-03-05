# Chiangrai Bandu Café 104 — Stamp Loyalty App

**손님 QR 스캔 → 이름 로그인 → 스탬프 요청 → 관리자 승인** 흐름의 카페 스탬프 적립 웹앱.

---

## 스택
- **Backend**: Node.js + Express + SQLite (`better-sqlite3`)
- **Frontend**: 순수 HTML/CSS/JS (빌드 불필요)
- **배포**: Railway (추천) / Render / 모든 Node.js 호스팅

---

## 로컬 실행 (테스트)

```bash
cd bandu-cafe
npm install
npm start
# → http://localhost:3000
```

---

## Railway 배포 (무료)

1. [railway.app](https://railway.app) 가입
2. GitHub에 이 폴더 push
3. Railway → **New Project → Deploy from GitHub** 선택
4. 배포 완료 후 자동 URL 생성 (예: `https://bandu-cafe.up.railway.app`)

### 환경변수 설정 (Railway Dashboard)

| 변수 | 설명 | 기본값 |
|------|------|--------|
| `OWNER_PASSWORD` | 관리자 비밀번호 | `104coffee` |
| `PORT` | 포트 (Railway 자동) | `3000` |

> ⚠️ 배포 후 반드시 `OWNER_PASSWORD`를 변경하세요!

---

## 사용 방법

### 손님 (사용자)
1. 카운터에 있는 QR 코드 스캔
2. 이름 입력 → 로그인
3. **"☕ ขอแสตมป์"** 버튼 클릭 → 스탬프 요청
4. 관리자가 승인하면 자동으로 스탬프 추가됨
5. 10개 완료 시 보상 사용 가능

### 관리자
1. 로그인 화면 하단 **"🔑 เจ้าของร้าน"** 클릭
2. 비밀번호 입력
3. 대기 중인 스탬프 요청 **승인 / 거절**
4. 📱 **QR 섹션** → QR 코드를 카운터 태블릿에 표시
   - **เต็มจอ ↗** 클릭 → `/qr` 전체화면 QR 페이지

---

## 파일 구조

```
bandu-cafe/
├── server.js        ← Express API 서버
├── package.json
├── .gitignore
├── public/
│   ├── index.html   ← 메인 앱 (로그인/사용자/관리자)
│   └── qr.html      ← 전체화면 QR 디스플레이
└── data/
    └── cafe.db      ← SQLite DB (자동 생성)
```

---

## API 엔드포인트

| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/api/login` | 사용자 로그인/등록 |
| GET | `/api/user/:name` | 현황 조회 (폴링) |
| POST | `/api/stamp-request` | 스탬프 요청 |
| POST | `/api/claim-reward` | 보상 사용 |
| POST | `/api/admin/login` | 관리자 로그인 |
| GET | `/api/admin/dashboard` | 전체 현황 |
| POST | `/api/admin/approve` | 스탬프 승인 |
| POST | `/api/admin/deny` | 요청 거절 |
| POST | `/api/admin/add-stamp` | 직접 추가 |
| POST | `/api/admin/reset` | 사용자 리셋 |
