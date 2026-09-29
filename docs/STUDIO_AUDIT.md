# Magazine Studio 1.1 새 디자인 모드 전수 감사

최신 lifecycle/폰트 UX/실기 순서는 [STABILITY.md](STABILITY.md)를 참고하세요. 아래는 해당 시점의 감사 기록입니다.

날짜: 2026-09-29. 기준 코드: 3249470 이후 이번 개발 브랜치 수정. 기존 시작페이지/Inspector/목차 생성 코드는 변경하지 않았다.

## 검증 수준

사용자는 이전 버전에서 새 문서 생성과 PDF 출력 성공을 보고했고, 이후 `[create.styles] 요청한 글꼴 스타일은 사용할 수 없습니다`를 보고했다. 이번 변경본의 Adobe 실기는 아직 미실시다. 자동 테스트는 Node/Mock/DOM이며 폰트 렌더링/UXP 화면/파일 권한/실제 API 호출 성공을 보증하지 않는다. 유료 AI 요청은 실행하지 않았다.

## 폰트 오류: 확정 사실과 미확정 원인

경로: btnCreateAuto → production → studio.js Host.create → installedFont(body/title) → app.doScript → createStyles → paragraphStyles.add. 앞선 코드에서는 add에 appliedFont(Font 객체)와 fontStyle(Font.fontStyleName)를 함께 넣었다. 이 fontStyle 지정은 3249470에서 추가됐다. Regular/Bold를 Host 스타일명으로 하드코딩하지는 않았지만, 두 속성의 적용 순서에 의존했다.

사용자 오류만으로는 body/title/subtitle/meta 중 어느 스타일인지, 선택한 실제 fontFamily/style이 무엇인지, add가 어떤 속성을 처리하다 거부했는지 확인할 수 없다. 따라서 **실제 PC의 정확한 폰트 조합과 실패 속성은 아직 미확정**이다. 공식 문서는 bulk 속성 적용 순서를 보장하지 않는다. 순서 문제는 재현 Mock에서 입증한 가능 경로이며 Adobe 내부 원인 확정이 아니다.

수정: paragraphStyles.add(비폰트 속성) → appliedFont=조회된 Font → fontStyle=그 Font의 실제 fontStyleName, 순서대로 적용한다. 각 단계에 role, family, style, name을 기록한다. 예: `create.styles.body.appliedFont (...)`, `create.styles.body.fontStyle (...)`. 이름만 기록하며 font.location, 개인 파일 경로, 키는 기록하지 않는다. Host가 doScript 경계에서 Error를 재포장해도 내부 단계 문자열은 남는다.

### 폰트 식별/대체 정책

- app.fonts에서 INSTALLED인 실제 face를 열거한다. UI에는 family와 style, 내부 선택값에는 Font.name을 사용한다. FontStatus는 UXP equals 비교다.
- 생성 시 다시 확인한다. name/fullName/PostScript name의 정확한 일치를 허용한다. family만 입력하면 사용 가능한 face가 하나일 때만 선택하며, 여러 style이면 명시적 선택을 요구한다.
- style 목록을 Regular/Bold/Medium으로 만들어내지 않는다. 실제 Book/Heavy/한글 스타일명도 그대로 전달한다.
- 없는 폰트/스타일을 자동 대체하지 않는다. 오류를 안내한 뒤 사용자가 실제 목록의 대체 face를 본문/제목에 적용하는 것이 안전한 fallback이다. 한글 글리프 지원과 폰트 라이선스/출력 가능 여부까지 자동 보증하는 기능은 없다.
- 프로젝트 불러오기 시 사용 불가능한 폰트를 경고하고 저장값은 보존한다. 문서 생성 직전에도 재검증하므로 조회 후 비활성화된 폰트가 조용히 통과하지 않는다.
- Freesentation 기본값은 샘플/초기 설정으로 남아 있다. 강제 설치/강제 적용/fallback이 아니며 없으면 사용자 선택으로 교체한다. 폰트 파일이 assets에 있다는 사실만으로 OS/InDesign에 설치되지는 않는다.
- CSS preview는 catalog의 family와 style을 사용한다. 일반 영문 weight/style은 CSS 값에 대응하지만 임의의 한글 스타일명/가변 폰트/Adobe 전용 활성화 글꼴은 CSS가 동일하게 렌더링한다고 보장할 수 없다. catalog 조회 전 저장 name의 TAB 분리 방식도 유지한다.

## UI 감사 표

새 디자인 패널 수정 후 정적 조작 요소는 35개다. 추가로 동적 시안 카드, 사진 삭제, 폰트별 적용 버튼, 기존 모드의 복귀 버튼을 검사했다. 체크박스/드롭다운/링크형 컨트롤/HTML file input은 없다. 파일 선택은 아래 버튼이 UXP picker를 호출한다.

표의 자동 검증은 모두 Mock/DOM 또는 순수 로직이며, ‘실제 InDesign 필요’는 API 실행 또는 UXP 화면 확인을 뜻한다. `changed`는 원고 길이/유효성/버튼 상태/오래된 시안 안내를 갱신하며 직접 Host를 호출하지 않는다. `run`은 중복 실행 방지→컨트롤 잠금→예외 status→finally 해제/조건 재계산이다. production은 여기에 단계별 hostReport를 더한다.

| UI 기능 | 이벤트 연결 | 실제 구현 | 자동 테스트 | 실제 InDesign 필요 | 문제 |
|---|---|---|---|---|---|
| 기존 양식 모드 modeLegacy | click | studio 숨김/legacy 표시 | 상태 확인 | UXP 화면 | 연결됨, 기존 생성 코드 미변경 |
| 원고/작업 불러오기 btnLoadAuto | click→run→adapter.load | UXP getFileForOpening→DOCX/TXT/JSON parse→fill/prepare→저장 plan 선택→폰트 검사→status | 파일 adapter/취소·실패·복구·plan 복원 | 파일 접근/Word 실제 원고 | 다른 PC 폰트 경고 추가 |
| 예시 btnSample | click→run | SAMPLE+DEFAULTS→prepare→status | 상태 확인 | 화면 | 연결됨 |
| 비우기 btnClear | click→run | 입력/시안/문서 연결/표시 초기화→status | 상태 확인 | 화면 | 남은 이전 제목/보고 표시도 초기화 |
| 분류 autoKicker | input→changed | article.kicker→header | 값 전달 | 화면/조판 | 연결됨 |
| 필자 autoAuthor | input→changed | article.author→footer | 값 전달 | 화면/조판 | 연결됨 |
| 제목 autoTitle | input→changed | article.title→plan/Host contents | 값 전달/오래된 시안 | 화면/조판 | 연결됨 |
| 부제 autoSubtitle | input→changed | article.subtitle→조건부 프레임 | 값 전달 | 화면/조판 | 연결됨 |
| 본문 autoBody | input→changed | article.body→capacity/Story | 값 전달/연결·넘침 | 실제 페이지 분할 | 연결됨 |
| 사진 추가 btnAddImage | click→run→adapter.image | PNG/JPEG picker→images push→changed→status; 최대 2장 | native adapter/취소·실패·복구 | 파일/이미지 표시 | 취소 메시지 누락 수정 |
| 사진 삭제 (동적) | click | images splice→목록/changed→status | 실제 동적 버튼 | 화면 | 제거 안내 및 busy 방어 추가 |
| 설정 btnSettings | click | settingsPanel display 전환 | 열기/닫기 | UXP 표시 | 연결됨 |
| 너비 pageWidth | input→changed | settings.width→geometry→pageWidth | 값 전달/geometry | Host 판형 | 연결됨 |
| 높이 pageHeight | input→changed | settings.height→geometry→pageHeight | 값 전달/geometry | Host 판형 | 연결됨 |
| 여백 pageMargin | input→changed | margin→geometry/page.marginPreferences | 값 전달/geometry | Host | 연결됨 |
| 본문 크기 bodySize | input→changed | bodySize→plan/typography | 값 전달/typography | Host 글자 | 연결됨 |
| 재단 여백 pageBleed | input→changed | bleed→documentBleedTopOffset | 이벤트/설정 경로 | 재단/출력 옵션 | preview에는 재단 바깥 미표시 |
| 강조색 accent | input→changed | accent→AUTO_RULE fill | 값 전달/rule 유지 | 색상 관리 | 본문 글자색 편집 기능 아님 |
| 매거진 이름 publication | input→changed | publication→header | 값 전달/furniture | 조판 | 연결됨 |
| 본문 폰트 bodyFont | input→changed | 이름→Font resolver→body/subtitle/meta | 값 전달/존재·부재 | 실제 설치 face | 수동 입력은 시안 재생성 필요 |
| 제목 폰트 titleFont | input→changed | 이름→Font resolver→title | 값 전달/존재·부재 | 실제 설치 face | 수동 입력은 시안 재생성 필요 |
| 폰트 더보기 btnFonts | click→run→adapter.fonts | fontBrowser 먼저 표시→app.fonts→검색/선택 목록→status | 열기/오류·재시도/빈 목록 | 실제 열거와 UXP 표시 | 종전에는 이름 복사 textarea뿐; 선택 기능 구현 |
| 폰트 검색 fontSearch | input→fontChoices | name/family/style/PS 검색→표시 30개 | 필터 확인 | 화면 | 신규 최소 기능 |
| 목록 더 표시 btnFontMore | click→fontChoices | 30개씩 증가/끝이면 비활성화 | 30→60 확인 | 화면 | 신규 최소 기능 |
| 본문/제목에 적용 (동적) | click→run | 정확한 face name→plan settings/signature→preview→이전 출력 차단→status | preview/생성 인자 확인 | 글꼴 매칭 | 신규; 유효 시안 geometry/선택 유지 |
| 무료 3안 btnPrepare | click→run→prepare | L.candidates→plans/signature→render/status | 3안/다양한 입력 | 화면 | 연결됨 |
| 무료/AI 시안 카드 (동적) | click | fresh 확인→selected/page→render | 선택/생성 전달/오래된 시안 | 화면 | stale 시안 클릭 예외 UI 표시 수정 |
| AI 설정 btnAiSettings | click | aiPanel display 전환 | 열기/닫기 | 화면 | 연결됨 |
| API 키 apiKey | 개별 change 없음(의도적) | btnAI 시점 value 읽음; password; 파일/로그 제외 | 실제 전달/저장 제외 | UXP/실제 API | 빈 listener 아님; 명시적 호출 시만 사용 |
| 모델 aiModel | 개별 change 없음(의도적) | btnAI 시점 value 읽음→요청/cacheKey | 전달/cache/실패·복구 | 모델 접근권한/API | 비용 호출은 이번에 미실시 |
| AI 시안 btnAI | click→run→AI.generate | request→schema 검증→AI plan 추가/선택→status/cache | HTTP/schema 및 UI Mock | 네트워크/실제 모델 | 브라우저 체험판 버튼 비활성화 |
| 이전 prevPage | click→fresh→render | page-1, 첫 페이지 비활성화 | 경계/이동 | 화면 | 경계 비활성화 추가 |
| 다음 nextPage | click→fresh→render | page+1, 마지막 비활성화 | 경계/이동 | 화면 | 경계 비활성화 추가 |
| 새 문서 btnCreateAuto | click→production→adapter.create | 최신 plan→fonts/images 사전 확인→새 문서/frames/story→check→latest/UI 대상 | 성공/실패/복구/내용/geometry | 실제 API/폰트/조판 | 폰트 적용 순서/진단 보완 |
| 원고·시안 저장 btnSaveProject | click→run→adapter.saveProject | picker→schemaVersion1/article/settings/plan JSON write→status | adapter/취소·실패·복구 | 파일 권한 | 이미지 본체/키는 저장 안 함 |
| INDD 저장 btnSaveIndd | click→production→adapter.saveIndd | picker→Host.save(latest)→반환 문서 추적→check | 취소/실패/저장 대상 | 실제 save API | 기존 경로 유지 |
| 문서 검사 btnCheckAuto | click→production→adapter.check | latest→recompose/overflows/fonts/links/ppi→report/pdfReady | 오류/PDF 차단/복구 | 실제 문서 상태 | 기본 검사이지 인쇄 종합 검수 아님 |
| PDF btnExportPdf | click→production→adapter.exportPdf | picker→latest 재검사→exportFile/options→afterExport | 취소/실패/대상/검사 차단 | 실제 옵션/완료 이벤트 | 이벤트 미관찰은 완료 미확인 |
| 새 디자인 복귀 modeStudio | click | legacy 숨김/studio 표시 | 상태 확인 | UXP 화면 | 기존 기능 코드는 미변경 |

**연결되지 않은 정적 버튼/빈 호출 함수는 발견하지 않았다.** 종전 폰트 목록은 placeholder가 아니라 제한적인 실제 조회 기능이었다. ‘폰트 더보기’ 문구는 기준 index.html에는 없었으므로 사용자가 본 버튼과의 동일성은 확인 필요. 현재는 명확히 같은 문구로 제공한다. UI display 속성 변경은 Mock에서만 확인했다. `src/template.js`는 빈 export인 미래용 placeholder이나 현재 새 모드에서 호출되지 않는다.

## 무료 3안과 assets

분류 A: JavaScript 규칙 기반. L.candidates→make(kind=0,1,2)→finish/validate/continuation. 글자 수/제목 길이/부제/사진 수/판형/여백/본문 크기로 배치한다. 1안 에디토리얼(제목+균형 본문), 2안 사진 있으면 제목·사진 병치/없으면 좁은 제목과 여백, 3안 큰 제목과 가능한 3단 본문이다. 제목 선호 크기 36/32/48pt, 긴 제목은 추정 높이에 따라 축소한다. 원문을 AI로 다시 쓰지 않는다.

auto-indesign.create는 app.documents.add로 시작하며 assets/template 파일을 open/import하지 않는다. AUTO_ label은 새 프레임에 붙이는 식별자다. 기존 템플릿의 label을 분석해 배치를 가져오는 기능이 아니다.

assets/templates/original의 INDD/IDML, working의 INDD 및 복사본은 존재하지만 새 디자인 코드에서 참조하지 않는다. 기존 모드는 사용자가 InDesign에서 연 활성 문서의 Script Label을 읽고 입력한다. 그 모드도 assets 폴더를 자동으로 탐색/등록하지 않는다. 폰트 assets도 자동 설치하지 않는다.

## 직접 만든 INDD를 활용하는 범위

### 코드 수정 없이 가능

직접 디자인한 문서를 수동으로 열고, 기존 OPENING_PAGE의 정확한 label/type/데이터 계약을 맞추면 기존 모드 입력 대상이 될 수 있다. WITH_PHOTO의 TITLE/POINT_TEXT/BODY/HERO_IMAGE(+선택 GUIDE), WITHOUT_PHOTO의 TITLE/POINT_TEXT/BODY_COLUMN_1→BODY_COLUMN_2 연결 계약을 따른다. Inspector는 라벨/그룹/연결/좌표를 읽는 검토 도구다. 임의 문서를 새 모드 무료 시안으로 등록하는 기능은 아니다. 새 사용자 템플릿은 별도 실기 검증이 필요하며 기존 HERO_IMAGE 사진 교체 미해결 기록도 유효하다.

### 제한된 작은 확장

정해진 시작페이지 계약만 지원하는 수동 목록, 메타데이터 JSON, 디자이너가 제공한 정적 썸네일과 label 사전검사부터 시작할 수 있다. Inspector/validation의 읽기 및 기존 입력 원칙을 재사용한다. 단, 기존 모드는 활성 문서에 쓰므로 새 모드에 연결할 때 원본 복제·별도 대상 문서 지정은 반드시 추가해야 한다. 버튼만 연결하면 안전하게 작동하는 완성된 템플릿 엔진은 없다.

### 별도 개발 필요

템플릿 등록/버전/원본·링크 보존, 메타데이터(지원 사진 수/판형/필수 label/글꼴), 썸네일 생성, 제목/본문 수용량 검증, 자동 템플릿 추천, 다중 페이지/마스터/스타일 보존, 본문 연결·넘침 정책, 사진 교체와 fit/crop 규칙, IDML 분석은 미구현이다. 수용량은 글자 수만으로 보증하지 못하므로 실제 조판 검수가 필요하다. 일반 IDML 전체 해석은 큰 작업이다. 이번에는 구현하지 않았다.

## 공존 구조 제안 (설계만)

입력 → 규칙/등록 템플릿/AI 선택 → 공통 DesignPlan 봉투 → renderer 선택 → 공통 제작 결과/검사/저장/PDF.

현재 geometry plan은 직사각형 title/subtitle/body/image만 허용하므로 모든 INDD 디자인을 억지로 평탄화하면 스타일/마스터/장식/스레드가 손실된다. 권장 분기:

- `kind: geometry`: 현재 규칙·AI plan + Preview Renderer + 새 문서 Renderer.
- `kind: template`: templateId/version, label→원고 바인딩, 자원 참조, 검증 계약 + 등록 썸네일/실제 InDesign preview + 원본 복제/채우기 Renderer.

공통 사용자 상태와 결과 문서 추적·검사·저장은 재사용하되 원본을 직접 수정하는 legacy 함수에 무조건 연결하지 않는다. 자동 추천은 수동 템플릿 선택과 실기 검증 후 별도 단계다.

## 텍스트 디자인 제어 표

‘내부’는 코드 공통 기본값이며 plan JSON의 편집 가능한 독립 속성은 아니다.

| 속성 | 현재 layout plan | Preview | InDesign | 사용자 UI / 필요한 확장 |
|---|---|---|---|---|
| font family | settings.bodyFont/titleFont의 face 식별자 | catalog family/CSS | 실제 Font | 입력/검색·적용 가능; 부제 별도 선택 없음 |
| style/weight | face 식별자에 포함 | 일반 weight/style 근사 매핑 | 실제 fontStyleName | 실제 face 선택 가능; 없는 스타일 생성 안 함 |
| font size | element.fontSize/bodySize | pt→px | pointSize | 본문만 숫자 UI, 제목/부제는 내부 배치 |
| leading | 내부 typography 배수 | 적용 | 적용 | 상세 UI/plan 속성 없음 |
| tracking | 내부 0 | 0px | 0 | 상세 UI/plan 속성 없음 |
| kerning | 없음 | CSS 기본 | Host 기본 | 명시 제어 미구현 |
| paragraph spacing | 내부 본문 뒤 2mm | 적용 | 적용 | 상세 UI/plan 속성 없음 |
| alignment | 내부 left | 적용 | LEFT_ALIGN | 상세 UI/plan 속성 없음 |
| text color | 내부 ink/muted | 적용 | RGB swatch | 강조색 UI는 가로 막대용; 텍스트색 UI 없음 |
| columns | body.columns | 열별 추정 분할 | textColumnCount | 내부 선택; 단 수 UI 없음 |
| column gap | 내부 5mm | 적용 | 적용 | UI/plan 독립 속성 없음 |
| inset spacing | 내부 0 | padding 0 | insetSpacing 0 | UI 없음 |
| baseline | Host 내부 ascent/최소0/격자off/top | CSS line box, 정확히 같지 않음 | 적용 | UI/plan 없음 |
| 제목 자동 축소 | plan 생성 시 headingSize 추정 | 결과 size | 결과 size | 실제 넘침을 읽어 자동 축소하는 기능은 없음 |
| overflow | 추정 pages | 숨김/추정 분할 | 본문은 실제 overflows로 최대40p 증감, 제목/부제 넘침은 PDF 차단 | 자동 재조판/검사; 정밀 preview 일치 미구현 |

향후 role별 typography 설정을 버전 있는 plan에 저장하고 범위 검증→공통 preview/Host 적용→본문 재조판→이전 문서 무효화→저장/복원 회귀 검증을 추가하면 상세 설정 UI를 붙일 수 있다. 템플릿에서는 기존 스타일 보존과 사용자 override 허용 범위를 별도로 정해야 한다. 이번에는 상세 편집 UI를 만들지 않았다.

## 자동 테스트와 PC 순서

기존 56 + 추가 20 = 76 통과. 추가 Host 6개/UI 14개. 정확한 face/style, 누락/모호한 family, 명시적 대체/제거 후 실패, 순서 의존 Mock, 상세 오류, 전체 정적 이벤트 및 동적 행동, 파일 adapter, 설정 전달, 모드 전환, 취소/실패/재시도, AI 캐시 Mock을 확인했다. 출력 재검증은 기존 테스트도 함께 실행했다.

1. UDT Reload → 지면·색상·폰트 설정 → 폰트 더보기. 조회 실패면 fontSummary와 상태 메시지를 캡처한다.
2. 실제 설치 family/style 검색 → 본문에 적용 → 다른 실제 style을 제목에 적용. 입력값과 미리보기 갱신, 기존 출력 비활성화를 확인한다. 목록은 30개씩 추가 표시된다.
3. 같은 원고/사진/시안으로 새 문서 생성. 실패 시 `create.styles.<role>.<property> (family=...; style=...; name=...)` 전체 메시지를 전달한다. 오류 당시 폰트 입력값, InDesign/UDT 버전도 필요하다.
4. 검사 → INDD 저장 → PDF. 지난 테두리/위치/사진 크롭 비교도 계속한다. 새 순차 스타일 적용의 실제 성공은 이 단계에서 판정한다.
5. JSON 저장/불러오기와 TXT/DOCX 불러오기, 사진 추가/취소/삭제, 예시/비우기, 설정 열기/닫기, 세 시안/페이지 이동을 확인한다. 없는 폰트 프로젝트는 경고 후 실제 대체 face를 선택하여 재시도한다.
6. AI 실호출은 선택 사항이며 비용이 발생한다. 이번 Mock 테스트는 실제 계정/네트워크 성공 기록이 아니다.

## 공식 근거

- [Font: family/style/fullName/PostScript/name/status](https://developer.adobe.com/indesign/uxp/dom/api/f/font/)
- [Fonts: item/itemByName/length](https://developer.adobe.com/indesign/uxp/dom/api/f/fonts/)
- [ParagraphStyle: appliedFont는 Font 또는 family 문자열, fontStyle은 별도 속성](https://developer.adobe.com/indesign/uxp/dom/api/p/paragraph-style/)
- [UXP DOM enum 비교](https://developer.adobe.com/indesign/uxp/resources/migration-guides/extendscript/)
