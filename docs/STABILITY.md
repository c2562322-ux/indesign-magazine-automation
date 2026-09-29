# 1.1 안정화 검토 — stability-01

2026-09-29. 시작 HEAD: 606e39ca9b71e9bf06ee25cbda7ffa7ef50d0b8c. 이 문서는 STUDIO_AUDIT.md의 최신 보충이며 폰트 UI/lifecycle에 관해서는 본 문서를 우선한다.

## 안전 기준점과 비교

네 SHA 모두 Git commit 객체로 확인했다. 작업 시작 시 tracked 파일은 clean, sample/magazine-design.indd 한 개가 untracked였다. 해당 결과물을 읽거나 변경·stage하지 않았다. reset/revert/clean/checkout/force push를 하지 않았다.

| 비교 | 확인한 변화와 현재 판단 |
|---|---|
| b7ad9ac40003fc527e92a06f0e89afd2012b8085 → 시작 HEAD | 기본 UI/즉시 mount 구조는 동일. 이후 제작 대상/오류 진단/검사 차단/폰트 기능 추가. 중복 mount/해제/선택 UI 누락 방어는 최초부터 없었음 |
| 03aaa20125e36218a475c0efd9746535dab6d096 → 시작 HEAD | create/check/save/export 상태 및 latest 보호 유지. 렌더 공통화와 폰트/문단 속성 초기화 추가. typography/stroke/단위 수정은 이번에도 보존 |
| 3249470a4bbcc29ee83f73703549052dd9843fcb → 시작 HEAD | 폰트/스타일 순차 적용, catalog UI, 프로젝트 폰트 확인 추가. fontSearch가 buttons()의 필수 의존이 되어 선택 UI 누락 시 전체 초기화 실패 경로가 늘어남. buttons()마다 목록 검색/문자열 변환도 추가됨 |
| 606e39ca9b71e9bf06ee25cbda7ffa7ef50d0b8c → 시작 HEAD | 차이 없음. 이번 안정화 수정은 이 위에 추가 |

실제 사용자 PC의 Reload 무반응이 아래 코드 결함 때문에 발생했다고 확정하지 않았다. UXP 패널/Host를 직접 조작할 수 없어 index.html과 실제 controller를 실행하는 DOM fixture 및 Host Mock을 검사했다. 최종 판정은 PC Smoke Test다.

## 입증한 문제와 수정

1. mount를 같은 DOM에 두 번 호출하면 별도 state/listener가 누적됐다. 같은 root는 기존 controller 반환; 명시적 destroy/remount 또는 새 DOM은 이전 정적 listener 해제 후 새 state를 만든다.
2. 기존 `$`는 호출 시점의 전역 document를 읽어 늦게 끝난 이전 작업이 새 DOM을 건드릴 수 있었다. mount 시 DOM을 고정하고 dispose된 작업 결과는 무시한다.
3. fontSearch 등 선택 UI 누락/선택적 listener 실패가 전체 binding/버튼 상태 계산을 중단시켰다. 선택 기능만 비활성화하고 원고/시안/제작 등 나머지를 유지한다. 핵심 UI 누락은 명확히 초기화 실패로 보고하고 이미 붙인 listener를 해제한다.
4. Host 모듈/세션 초기화 실패는 전체 패널 대신 Host 전용 버튼만 막는다. 입력/시안 및 가능한 파일 작업은 유지한다. 핵심 UXP 런타임/소스 모듈 자체 손상까지 복구하는 기능은 아니다.
5. 폰트 열기마다 전체 조회·정렬, 일반 buttons마다 catalog 검색이 반복됐다. Host catalog는 세션 cache, 열기/닫기는 cache, 명시 새로고침은 강제 재조회. alias/family resolution도 catalog 재사용 후 선택 face의 현재 상태만 재검사한다.
6. preview 텍스트마다 catalog 선형 탐색, 페이지마다 전체 본문 demand 재계산이 있었다. 이름 Map 조회와 render당 demand 1회로 변경했다. 정밀 조판을 새로 구현하지 않았다.
7. Host 장시간 동기 호출 전에 상태 표시가 갱신될 기회가 없었다. 제작/폰트 조회 시작 메시지 후 이벤트 루프에 한 번 양보한다. 작업 timeout으로 Host 쓰기를 임의 취소하거나 중복 실행하지 않는다.
8. 원고 변경 후 문자열을 원래대로 돌리면 이전 문서 연결이 살아날 수 있었다. 원고/설정 변경 시 UI와 Host의 출력 대상 연결을 해제한다. 기존 문서 파일/창은 닫거나 수정하지 않는다.
9. 이전 패널에서 열었던 저장 picker가 새 세션에 반환하면 새 latest에 쓸 위험이 있었다. 세션 토큰 검사로 쓰기를 차단한다. 세션 교체 후 늦게 끝난 생성도 새 latest로 등록하지 않는다.

폰트 관련 create.styles 오류의 실제 family/style과 실패 속성은 아직 PC 확인 필요다. 앞선 순차 Font→실제 fontStyleName 적용을 유지하며 임의 Regular/Bold/fallback은 추가하지 않았다. 실패하면 role/속성/선택 face/소요시간을 표시하고 재시도 가능하다.

## Lifecycle와 진단

studio.js: document.readyState가 loading이면 DOMContentLoaded 1회 대기, 그 외 즉시 시작. HTML 끝 script 위치는 유지. panel hide/show는 새 mount를 요구하지 않는다. 같은 DOM의 mount는 state를 보존하고 listener를 중복 등록하지 않는다. DOM 교체/명시적 controller 해제 후에는 새 세션으로 시작한다.

진단: Studio init start → DOM ready → State ready → Host adapter ready(또는 unavailable) → Events binding start → Events binding complete(listener 수) → Studio ready [stability-01]. 실패 시 단계가 남는다. 작업 진단은 최근 35행, 제작 로그는 최근 40행으로 제한한다. 입력 원문/키/개인 경로는 기록하지 않는다.

작업 시작/종료 ms와 Host 단계 완료 ms를 표시한다. 첫 폰트 전체 열거와 InDesign 실제 조판/저장 자체는 여전히 느릴 수 있다. 실제 속도가 몇 초 개선됐다는 측정은 하지 않았다. 소스 버튼 상태 계산에서는 Host 폰트 호출이 원래도 없었으며, 이번에 제거한 것은 추가된 메모리 catalog 반복 검색이다.

## UI 전수 추적

실제 index.html을 읽어 만든 트리 fixture에서 38개 정적 조작 요소와 동적 시안/사진/폰트 선택을 검사했다. 아래는 실행 소스 경로이며 실제 UXP DOM을 도구로 수집했다는 뜻은 아니다. OS picker/실제 Adobe UI는 PC 확인 대상이다. 초기화 성공 시 실제 런타임 listener 수도 패널에 표시된다.

공통 R = run의 busy/잠금→try/catch status→finally 복구와 시간 진단. P = production의 전제검사→adapter→Host→hostReport/status/pdfReady. 입력 changed는 생성 문서 연결 해제/시안 유효성 재계산. 선택/열기처럼 자체가 결과인 UI에는 별도 성공 대화창을 띄우지 않는다.

| 기능 | 이벤트 연결 | 실행 함수 / 상태→adapter→Host→결과 | 비동기 작업 | Host 필요 | 오류 처리 | 자동 테스트 | 현재 문제 |
|---|---|---|---|---|---|---|---|
| 원고/작업 불러오기 | btnLoadAuto click | load→parse→fill/prepare/저장 plan→폰트 확인→status | picker/read | UXP 파일, 폰트 확인 | R,취소 | TXT/JSON adapter·core DOCX·복원·지연응답 | 실제 파일 검증 필요 |
| 예시 | btnSample click | fill SAMPLE→prepare→render | R | 아니오 | R | 반복/재초기화 | 코드 통과 |
| 비우기 | btnClear click | 입력/plan/문서연결/표시 해제 | R | 대상 연결만 해제 | R | clear→sample | 코드 통과 |
| 제목 | autoTitle input | changed→article.title→plan/contents | 아니오 | 생성 때 | 검증/status | 수정/복원·오래된 대상 | 수정 |
| 부제 | autoSubtitle input | changed→article.subtitle→plan/contents | 아니오 | 생성 때 | 검증/status | 값 전달 | 코드 통과 |
| 본문 | autoBody input | changed→article.body→demand/Story | 아니오 | 생성 때 | 검증/status | 값 전달/넘침 Mock | 조판 실기 |
| 분류 | autoKicker input | changed→header | 아니오 | 생성 때 | 검증/status | 값 전달 | 코드 통과 |
| 필자 | autoAuthor input | changed→footer | 아니오 | 생성 때 | 검증/status | 값 전달 | 코드 통과 |
| 사진 추가 | btnAddImage click | picker→images→목록/changed→status | picker | UXP 파일 | R,취소 | 추가/취소/실패/복구 | 사진 표시 실기 |
| 사진 삭제 | 동적 click | splice→changed→status | 아니오 | 연결 해제만 | disposed/busy | 삭제 | 코드 통과 |
| 설정 열기/닫기 | btnSettings click | display 토글 | 아니오 | 아니오 | on catch | 열기/닫기 | UXP 표시 실기 |
| 너비 | pageWidth input | settings.width→geometry/pageWidth | 아니오 | 생성 때 | 검증 | 전달/geometry | 코드 통과 |
| 높이 | pageHeight input | settings.height→geometry/pageHeight | 아니오 | 생성 때 | 검증 | 전달/geometry | 코드 통과 |
| 여백 | pageMargin input | settings.margin→bounds/margins | 아니오 | 생성 때 | 검증 | 전달/geometry | 코드 통과 |
| 재단 여백 | pageBleed input | settings.bleed→documentPreferences | 아니오 | 생성 때 | 검증 | 설정경로 | 실제 출력 실기 |
| 강조색 | accent input | settings.accent→rule fill | 아니오 | 생성 때 | 검증 | 값 전달 | 글자색 UI 아님 |
| 본문 크기 | bodySize input | bodySize→plan→typography | 아니오 | 생성 때 | 검증 | 값 전달 | 코드 통과 |
| 매거진명 | publication input | publication→header | 아니오 | 생성 때 | 검증 | 값 전달 | 코드 통과 |
| 본문 폰트 | bodyFont input | changed→face resolver | 아니오 | 생성 때 | 부재/모호함 | face 검증 | 실기 필요 |
| 제목 폰트 | titleFont input | changed→face resolver | 아니오 | 생성 때 | 부재/모호함 | face 검증 | 실기 필요 |
| 폰트 더보기/닫기 | btnFonts click | display→첫 조회 또는 cache | 첫 조회 | 최초 app.fonts | R,조회오류 | 열기/닫기/cache | 수정 |
| 설치 폰트 새로고침 | btnFontRefresh click | loadFonts(true)→catalog/Map/검색 | 조회 | app.fonts | R,재시도 | 강제 재조회 | 수정 |
| 폰트 검색 | fontSearch input | filterFonts→fontChoices | 아니오 | 아니오 | on catch | 검색 | 수정 |
| 목록 30개 추가 | btnFontMore click | limit+30→그룹 렌더 | 아니오 | 아니오 | 끝 비활성 | 30→60 | family가 다음 묶음에서 이어질 수 있음 |
| 스타일 선택 | 동적 click | selectedFont→선택 표시 | 아니오 | 아니오 | busy/disposed | group/style | 수정 |
| 본문에 적용 | btnFontBody click | applyFont→plan settings→preview/문서무효 | R | 생성 때 | R | preview/Host 전달 | 실기 필요 |
| 제목에 적용 | btnFontTitle click | applyFont→plan settings→preview/문서무효 | R | 생성 때 | R | preview/Host 전달 | 실기 필요 |
| 무료 3안 | btnPrepare click | L.candidates→plans/signature→render | R | 아니오 | R | 다양한 원고/반복 | 기존 규칙 유지 |
| 시안 선택 | 동적 click | fresh→selected/page→render | 아니오 | 아니오 | stale 표시 | 클릭/오래된 시안 | 코드 통과 |
| 이전 페이지 | prevPage click | page-1→render | 아니오 | 아니오 | 경계/stale | 경계/이동 | 코드 통과 |
| 다음 페이지 | nextPage click | page+1→render | 아니오 | 아니오 | 경계/stale | 경계/이동 | 코드 통과 |
| AI 설정 | btnAiSettings click | aiPanel display | 아니오 | 아니오 | 선택기능 격리 | 열기/닫기/누락 | 실기 필요 |
| API 키 | apiKey, AI 클릭 때 읽기 | generate 인자, 저장/로그 제외 | AI 실행 때 | 네트워크 | R | 전달/비공개 | 별도 listener 의도적으로 없음 |
| 모델 ID | aiModel, AI 클릭 때 읽기 | generate/cacheKey | AI 실행 때 | 네트워크 | R | 전달/cache | 별도 listener 의도적으로 없음 |
| AI 시안 | btnAI click | AI.generate→validate→plan 추가 | fetch | 실제 API | R/timeout/오류 | Mock만 | 실호출 미검증 |
| 새 문서 | btnCreateAuto click | P→create→새 doc/frame/style/Story→check/latest | doScript/이미지접근 | InDesign | 단계별 실패/복구 | 반복/세션교체/폰트오류 | 실제 생성 Smoke 필요 |
| 문서 검사 | btnCheckAuto click | P→check→overflows/fonts/links→pdfReady | R | InDesign | 재검사 가능 | 실패/복구 | 실제 검사 필요 |
| INDD 저장 | btnSaveIndd click | P→picker→save(latest)→check | picker | InDesign | 취소/실패/세션검사 | 취소/재저장/오래된 picker | 실제 저장 필요 |
| PDF | btnExportPdf click | P→picker→check→export/options/event | picker/options | InDesign | 오류면 재검사 후 재시도 | 실패/취소/복구 | 실제 출력 필요 |
| 작업 JSON 저장 | btnSaveProject click | R→picker→schema1 JSON write | picker/write | UXP 파일 | 취소/실패/세션검사 | adapter/취소/복구 | 실제 파일 필요 |
| 기존 모드 | modeLegacy click | panel display 전환 | 아니오 | 아니오 | busy/disposed | 전환 | 기존 생성 로직 미변경 |
| 새 모드 복귀 | modeStudio click(기존 패널) | panel display 전환 | 아니오 | 아니오 | on catch | 전환 | 같은 state 유지 |

현재 패널에 dropdown/checkbox/link형 조작이나 빈 handler는 없다. src/template.js의 빈 export는 여전히 미사용 placeholder이고 새 모드 버튼에 연결되지 않는다. UI/타이밍 진단은 기능이지 실제 Host 성공의 증거가 아니다.

## 제작 상태 계약

- 원고 유효+최신 시안+native+idle → 생성 가능. 생성 성공 → 검사/INDD 가능, 기본검사 오류 없으면 PDF 가능.
- 생성 실패 → 이전 대상 해제, 버튼 잠금 해제, 생성 재시도 가능. 문서는 실패한 신규 문서만 정리한다.
- 검사 실패 → PDF 차단, 검사 재시도 및 수정용 INDD 저장 유지.
- 파일 picker 취소 → 기존 생성 대상 보존, 다시 저장/출력 가능.
- PDF 실패 → 검사 후 재시도. 완료 이벤트가 없으면 성공으로 단정하지 않음.
- 원고/설정 편집 → 이전 출력 대상 무효화. 단순 화면 페이지 이동/폰트 창 열기·검색은 무효화하지 않는다.
- Reload/새 controller → 폰트 cache/latest 초기화. 열려 있는 생성 문서는 닫지 않으며 새 패널이 임의로 재연결하지 않는다.

## 검증 결과와 한계

기존 76개를 유지·보강하고 lifecycle/session/cache 테스트 14개를 추가하여 90개 통과. fixture는 index.html을 파싱한 트리, 여러 listener/해제, 범위 제한 query, 동적 자식을 지원한다. 기존 fixture는 이벤트당 함수 하나만 저장하고 모든 요소를 query 결과로 돌려 lifecycle·잠금 범위를 제대로 검증하지 못했다.

같은-DOM 중복 mount, 선택 폰트 UI 누락, catalog 반복 열거의 3개 테스트를 수정 전 HEAD 소스로 메모리 실행했을 때 모두 실패했고 수정 후 통과했다. 작업 파일을 이전 버전으로 덮어쓰거나 reset하지 않았다. 캐시 테스트에서 2개 face는 초기조회 2 item 호출, reopen/alias 조회 추가 0, 명시 새로고침 때만 추가 2로 검증했다. 실제 성능 초 단위 개선이나 UXP CSS/조판/실제 Reload는 측정하지 않았다.

프레임 stroke=None, 실제 폰트/스타일 지정, tracking/leading/문단간격/색상/furniture/pt-mm 관련 기존 테스트를 계속 통과한다. layout-engine과 기존 index.js/text/image/inspector/validation 및 Script Label 처리 코드는 변경하지 않았다.

## 5~10분 Smoke Test (우선 이것만)

| 순서 | 동작 | 정상 기준 |
|---|---|---|
| 1 | InDesign 새로 실행 후 개발 폴더의 패널 열기 | 하단에 Studio ready [stability-01], 예시 원고/3안 표시 |
| 2 | 비우기 → 예시 원고 → 무료 디자인 3안 | 각각 즉시 화면 변화, 버튼이 계속 눌림 |
| 3 | 2안 → 3안 → 1안 선택 | 선택 표시/첫 페이지 미리보기 변경 |
| 4 | 설정 → 폰트 더보기 | Family 아래 설치된 Style, 개수/조회 종료 ms 표시 |
| 5 | Style 선택 → 본문 적용, Style 선택 → 제목 적용 | 선택 표시와 현재 본문/제목 폰트 및 preview 갱신 |
| 6 | 폰트 닫기 → 다시 열기, 검색 | 캐시 표시 안내, 새 Host 전체 조회 없이 목록 사용 |
| 7 | 사진 없이 짧은 예시로 새 문서 생성 | 문서 한 개 생성과 성공/검사 결과. 오류가 나오면 Smoke 미통과이며 단계 메시지와 잠금 복구 여부를 전달 |
| 8 | UDT Reload | 새 Studio ready [stability-01]; 기존 문서 창은 유지, 이전 출력 대상은 초기화 |
| 9 | 예시 → 무료 3안 → 설정 열기/닫기 → 폰트 열기 | 동일 조작이 계속 동작; Reload 뒤 첫 폰트 조회는 새 세션 조회 |
| 10 | 설치 폰트를 다시 선택하고 새 문서 생성 | 클릭 한 번에 문서 하나 생성, 이전과 동일한 결과 |

Smoke 통과 후에만 문서 검사→INDD 저장/취소→PDF, 사진0/1/2장, 긴 원고, 실제 DOCX/작업 JSON을 상세 검증한다. 폰트 때문에 실패하면 family/style과 create.styles.<role>.<property>, 무반응/지연이면 하단 초기화/작업 시간 로그와 앱/UDT 버전 및 화면을 전달한다. 초기화 표식이 없으면 다른 폴더의 manifest가 로드됐는지도 확인한다.

공식 API 확인: [Fonts](https://developer.adobe.com/indesign/uxp/dom/api/f/fonts/), [ParagraphStyle](https://developer.adobe.com/indesign/uxp/dom/api/p/paragraph-style/). 문서와 Mock은 실제 Host 성공을 대체하지 않는다.
