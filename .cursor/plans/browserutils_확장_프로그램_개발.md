---
name: BrowserUtils 확장 프로그램 개발
overview: 개발에 유용한 18가지 기능을 통합한 크롬 브라우저 확장 프로그램을 처음부터 구축합니다. 탭 기반 UI로 기능을 그룹화하고, 모듈화된 구조로 각 기능을 독립적으로 구현합니다.
todos:
  - id: setup-project
    content: "프로젝트 기본 구조 생성: manifest.json, popup.html, popup.css, popup.js, background.js, content.js 및 디렉토리 구조 설정"
    status: pending
  - id: implement-ui
    content: 4개 탭 기반 UI 구현 (미디어, 텍스트, 개발, 유틸) 및 탭 전환 기능
    status: pending
    dependencies:
      - setup-project
  - id: text-tools
    content: "텍스트 변환 도구 구현: URL 인코더/디코더, Base64 인코더/디코더, JSON 포맷터, 텍스트 변환, 해시 생성기, 코드 미니파이어"
    status: pending
    dependencies:
      - implement-ui
  - id: media-tools
    content: "미디어 도구 구현: 스크린샷 (보이는 영역/전체/선택), 컬러 피커, 이미지 최적화"
    status: pending
    dependencies:
      - implement-ui
  - id: dev-tools
    content: "개발자 도구 구현: 쿠키 관리, 스토리지 관리, 요소 선택기, 네트워크 모니터, 성능 메트릭, 접근성 검사기"
    status: pending
    dependencies:
      - implement-ui
  - id: utility-tools
    content: "유틸리티 도구 구현: QR 코드 생성기, 시간 변환기, 탭 관리자"
    status: pending
    dependencies:
      - implement-ui
  - id: integrate-modules
    content: 모든 모듈을 popup.js에 통합하고 이벤트 리스너 설정, content.js와 background.js 연동
    status: pending
    dependencies:
      - text-tools
      - media-tools
      - dev-tools
      - utility-tools
  - id: error-handling
    content: 에러 처리 추가, 사용자 피드백 개선, 로딩 상태 표시
    status: pending
    dependencies:
      - integrate-modules
  - id: ui-polish
    content: "UI/UX 개선: 스타일링 완성, 반응형 디자인, 시각적 피드백 추가"
    status: pending
    dependencies:
      - integrate-modules
  - id: external-libs
    content: "외부 라이브러리 통합: QRCode.js, html2canvas 다운로드 및 설정"
    status: pending
    dependencies:
      - media-tools
      - utility-tools
---

# BrowserUtils 크롬 확장 프로그램 개발 플랜

## 프로젝트 구조

```
BrowserUtils/
├── manifest.json                 # Manifest V3 설정
├── popup.html                    # 메인 팝업 UI
├── popup.css                     # 팝업 스타일
├── popup.js                      # 팝업 메인 로직 및 이벤트 처리
├── background.js                 # 서비스 워커 (백그라운드 작업)
├── content.js                    # 콘텐츠 스크립트 (페이지 상호작용)
├── icons/                        # 확장 프로그램 아이콘
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── libs/                         # 외부 라이브러리
│   ├── qrcode.min.js            # QR 코드 생성
│   └── html2canvas.min.js       # 전체 페이지 스크린샷
└── modules/                      # 기능별 모듈
    ├── screenshot.js
    ├── colorpicker.js
    ├── url-encoder.js
    ├── base64-encoder.js
    ├── json-formatter.js
    ├── text-transformer.js
    ├── hash-generator.js
    ├── cookie-manager.js
    ├── storage-manager.js
    ├── element-picker.js
    ├── network-monitor.js
    ├── qr-generator.js
    ├── time-converter.js
    ├── code-minifier.js
    ├── tab-manager.js
    ├── performance-metrics.js
    ├── accessibility-checker.js
    └── image-optimizer.js
```

## 구현 단계

### Phase 1: 프로젝트 기본 구조 설정

**1.1 Manifest 설정** ([manifest.json](manifest.json))

- Manifest V3 사용
- 필수 권한 설정: `activeTab`, `storage`, `tabs`, `cookies`, `scripting`, `webRequest`, `webNavigation`, `downloads`
- `host_permissions`: `<all_urls>`
- Service worker로 `background.js` 설정
- Content script로 `content.js` 설정
- Popup 액션 설정

**1.2 기본 UI 구조** ([popup.html](popup.html), [popup.css](popup.css))

- 4개 탭 구조: 미디어, 텍스트, 개발, 유틸
- 반응형 레이아웃 (최소 너비 400px, 최대 높이 600px)
- 탭 전환 기능
- 각 섹션별 도구 그룹화

**1.3 메인 로직 초기화** ([popup.js](popup.js))

- 탭 전환 핸들러
- 모듈 초기화 및 이벤트 리스너 설정
- 공통 유틸리티 함수

### Phase 2: 텍스트 변환 도구 구현

**2.1 URL 인코더/디코더** ([modules/url-encoder.js](modules/url-encoder.js))

- `encodeURIComponent` / `decodeURIComponent` 사용
- 에러 처리 (잘못된 URL 형식)
- 양방향 변환 UI

**2.2 Base64 인코더/디코더** ([modules/base64-encoder.js](modules/base64-encoder.js))

- `btoa` / `atob` 사용
- UTF-8 인코딩 처리 (`encodeURIComponent` / `decodeURIComponent` 조합)
- 에러 처리

**2.3 JSON 포맷터** ([modules/json-formatter.js](modules/json-formatter.js))

- 포맷팅: `JSON.stringify(obj, null, 2)`
- 미니파이: `JSON.stringify(obj)`
- 검증: `JSON.parse` try-catch
- 결과 표시 (성공/실패)

**2.4 텍스트 변환 도구** ([modules/text-transformer.js](modules/text-transformer.js))

- 대문자/소문자 변환
- CamelCase 변환 (첫 단어 소문자, 이후 단어 첫 글자 대문자)
- snake_case 변환
- kebab-case 변환
- 정규식 기반 변환 로직

**2.5 해시 생성기** ([modules/hash-generator.js](modules/hash-generator.js))

- Web Crypto API 사용 (`crypto.subtle.digest`)
- SHA-256, SHA-512 지원
- MD5는 Web Crypto에서 미지원이므로 background.js에서 처리하거나 crypto-js 라이브러리 사용 고려
- 비동기 처리

**2.6 코드 미니파이어** ([modules/code-minifier.js](modules/code-minifier.js))

- CSS 미니파이: 주석 제거, 공백 제거, 줄바꿈 제거
- JavaScript 미니파이: 주석 제거, 공백 제거 (기본적인 처리)
- 정규식 기반 또는 간단한 파서 사용

### Phase 3: 미디어 도구 구현

**3.1 스크린샷 기능** ([modules/screenshot.js](modules/screenshot.js))

- 보이는 영역: `chrome.tabs.captureVisibleTab` API 사용
- 전체 페이지: html2canvas 라이브러리 사용
  - Content script에서 페이지 스크롤 및 캡처
  - Canvas를 이미지로 변환
- 영역 선택: 사용자 드래그 영역 캡처
- 다운로드: `chrome.downloads.download` API

**3.2 컬러 피커** ([modules/colorpicker.js](modules/colorpicker.js))

- Content script에서 마우스 이벤트 리스너 등록
- 클릭 위치의 픽셀 색상 추출 (Canvas API 사용)
- RGB, HEX, HSL 변환
- 색상 정보 표시 및 클립보드 복사

**3.3 이미지 최적화** ([modules/image-optimizer.js](modules/image-optimizer.js))

- FileReader로 이미지 로드
- Canvas로 리사이즈 및 품질 조정
- JPEG 품질 설정 (0.1 ~ 1.0)
- 최대 너비 설정 (기본 1920px)
- 최적화된 이미지 다운로드

### Phase 4: 개발자 도구 구현

**4.1 쿠키 관리자** ([modules/cookie-manager.js](modules/cookie-manager.js))

- `chrome.cookies.getAll`로 현재 도메인 쿠키 조회
- 쿠키 목록 표시 (이름, 값, 도메인, 만료일)
- 쿠키 편집/삭제 기능
- `chrome.cookies.set` / `chrome.cookies.remove` API 사용

**4.2 스토리지 관리자** ([modules/storage-manager.js](modules/storage-manager.js))

- Content script에서 localStorage/sessionStorage 접근
- `chrome.scripting.executeScript`로 스토리지 데이터 읽기
- 키-값 쌍 표시 및 편집
- 스토리지 클리어 기능

**4.3 요소 선택기** ([modules/element-picker.js](modules/element-picker.js))

- Content script에서 마우스 오버 시 요소 하이라이트
- 클릭 시 요소 정보 수집:
  - 태그명, ID, 클래스
  - Computed styles
  - 위치 및 크기 (getBoundingClientRect)
  - 부모/자식 요소 정보
- 정보를 popup에 전달하여 표시

**4.4 네트워크 모니터** ([modules/network-monitor.js](modules/network-monitor.js))

- `chrome.webRequest` API 사용
- `onBeforeRequest`, `onCompleted` 이벤트 리스너
- 요청 URL, 메서드, 상태 코드, 응답 시간 기록
- 요청 목록 표시 및 필터링
- 모니터 시작/중지 기능

**4.5 성능 메트릭** ([modules/performance-metrics.js](modules/performance-metrics.js))

- `performance.getEntriesByType('navigation')` 사용
- 로드 시간, DOMContentLoaded 시간 측정
- 리소스 개수 및 크기 집계
- Performance API 데이터 시각화

**4.6 접근성 검사기** ([modules/accessibility-checker.js](modules/accessibility-checker.js))

- Content script에서 접근성 이슈 검사:
  - 이미지 alt 속성 누락
  - 헤딩 구조 검증
  - 폼 레이블 검증
  - ARIA 속성 검증
  - 컬러 대비 기본 검사 (선택적)
- 이슈 목록 표시 및 페이지 내 하이라이트

### Phase 5: 유틸리티 도구 구현

**5.1 QR 코드 생성기** ([modules/qr-generator.js](modules/qr-generator.js))

- QRCode.js 라이브러리 사용
- 텍스트/URL 입력 받아 QR 코드 생성
- Canvas에 렌더링
- QR 코드 이미지 다운로드 기능

**5.2 시간 변환기** ([modules/time-converter.js](modules/time-converter.js))

- 타임스탬프 ↔ 날짜 변환
- 밀리초/초 단위 자동 감지
- 다양한 날짜 형식 지원 (ISO 8601, 로컬 형식)
- 양방향 변환 UI

**5.3 탭 관리자** ([modules/tab-manager.js](modules/tab-manager.js))

- `chrome.tabs.query`로 현재 창의 모든 탭 조회
- 탭 목록 저장: `chrome.storage.local`에 URL 및 제목 저장
- 탭 복원: 저장된 URL로 새 탭 생성
- 중복 탭 닫기: 동일 URL 탭 감지 및 제거
- 탭 그룹 관리 (선택적)

### Phase 6: 통합 및 최적화

**6.1 Content Script 통합** ([content.js](content.js))

- 컬러 피커 이벤트 핸들러
- 요소 선택기 이벤트 핸들러
- 메시지 패싱 (`chrome.runtime.sendMessage`)
- 페이지와의 상호작용 관리

**6.2 Background Service Worker** ([background.js](background.js))

- 네트워크 모니터 리스너 등록
- 해시 생성 (MD5 등 Web Crypto 미지원 알고리즘)
- 전역 상태 관리
- 메시지 라우팅

**6.3 Popup 통합 로직** ([popup.js](popup.js))

- 모든 모듈 import 및 초기화
- 이벤트 리스너 통합
- 결과 표시 및 에러 처리
- 상태 관리 (현재 활성 탭, 모니터 상태 등)

**6.4 에러 처리 및 사용자 피드백**

- 모든 비동기 작업에 try-catch
- 사용자 친화적 에러 메시지
- 로딩 상태 표시
- 성공/실패 토스트 알림 (선택적)

**6.5 UI/UX 개선**

- 반응형 디자인 최적화
- 다크 모드 지원 (선택적)
- 아이콘 및 시각적 피드백
- 접근성 개선 (키보드 네비게이션 등)

## 외부 라이브러리

1. **QRCode.js**: QR 코드 생성

   - CDN 또는 로컬 파일로 포함
   - Canvas 기반 렌더링

2. **html2canvas**: 전체 페이지 스크린샷

   - CDN 또는 로컬 파일로 포함
   - 스크롤 영역 포함 캡처

## 주요 기술 스택

- **Manifest V3**: 최신 크롬 확장 프로그램 API
- **Vanilla JavaScript**: 프레임워크 없이 순수 JS 사용
- **Web APIs**:
  - Chrome Extension APIs
  - Web Crypto API
  - Canvas API
  - Performance API
  - FileReader API

## 파일별 상세 구현

### manifest.json 핵심 설정

- `manifest_version: 3`
- Service worker 기반 백그라운드
- Content script injection
- 필요한 모든 권한 선언

### popup.html 구조

- 4개 탭: 미디어, 텍스트, 개발, 유틸
- 각 탭 내 섹션별 도구 그룹
- 입력/출력 영역 분리
- 버튼 및 컨트롤 요소

### 모듈 공통 패턴

- 각 모듈은 클래스 기반 구조
- 정적 메서드 또는 인스턴스 메서드 제공
- 에러 처리 포함
- 결과를 표준 형식으로 반환

## 테스트 계획

1. 각 모듈 단위 테스트
2. 크로스 브라우저 호환성 (Chrome, Edge)
3. 다양한 웹사이트에서 테스트
4. 권한 및 보안 테스트
5. 성능 테스트 (대용량 데이터 처리)

## 배포 준비

1. 아이콘 파일 생성 (16x16, 48x48, 128x128)
2. README.md 작성
3. 사용 가이드 작성
4. Chrome Web Store 제출 준비 (선택적)
