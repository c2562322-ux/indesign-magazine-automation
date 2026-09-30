# 매거진 스튜디오 1.1 — InDesign 자동 디자인

기사에서 새로운 지면을 만드는 InDesign UXP 플러그인입니다. 기존 템플릿 자동 입력 기능도 `기존 양식 모드`에서 사용할 수 있습니다.

**상태: 개발 검증판. Node 자동 테스트 143개 통과 (기존 132개 유지, 신규 진입점 하나에서 Python 12개 검사 실행).** 사용자 PC에서 패널·원고 입력·무료 3안·미리보기 글자 크기·스크롤은 확인했습니다. 이후 사용자 PC에서 새 문서 생성·PDF 출력 성공도 보고됐습니다. 이후 폰트 스타일 생성 오류가 보고되어 순차 적용과 실제 설치 폰트 선택을 보완했습니다. 이번 안정화는 초기화/세션/폰트 캐시를 보강했으며 실제 InDesign 검증은 남아 있습니다. 먼저 [5~10분 Smoke Test](docs/STABILITY.md)를 진행해주세요. [전체 UI/폰트/템플릿 감사](docs/STUDIO_AUDIT.md)를 보세요. [렌더링 비교/실기 절차](docs/RENDER_PARITY.md)를 보세요. 버튼별 절차와 진단 안내는 [PRODUCTION_TESTS.md](docs/PRODUCTION_TESTS.md), 기존 실기 기록은 HANDOFF.md를 보세요.

외부 JSON 디자인 3종을 별도 **IDML 기반 디자인** 목록에서 선택할 수 있습니다. 원본 수치/누락값 정책과 새 파일 추가 방법: [JSON 디자인 안내](docs/JSON_DESIGNS.md). 최신 표시: `Studio ready [stability-01] [json-design-01]`. 실제 Adobe 재현 검증은 남아 있습니다.

## 바로 시작

1. ZIP을 폴더에 완전히 풀어주세요.
2. 먼저 `preview.html`을 브라우저에서 열면 원고 입력과 무료 시안 선택을 체험할 수 있습니다. 이 체험판에는 INDD/PDF 생성과 실제 AI 호출이 없습니다. 사진이 연결된 프로젝트를 불러오면 브라우저에서는 사진 파일을 다시 추가해야 합니다.
3. PC에 InDesign 18.5 이상과 UXP Developer Tool을 준비합니다. 18.5는 Adobe의 플러그인 지원 시작 버전이며, 이 플러그인의 모든 기능이 해당 버전에서 검증됐다는 뜻은 아닙니다.
4. `assets/fonts/Freesentation-4Regular.ttf`, `Freesentation-7Bold.ttf`를 설치하거나 패널의 폰트 설정 → 폰트 더보기에서 설치된 실제 스타일을 본문/제목에 적용합니다. 없는 폰트는 자동 대체하지 않습니다. 폰트 설치 후 InDesign 재시작이 필요할 수 있습니다. 제공된 폰트·템플릿은 원래 전달받은 자료입니다.
5. UXP Developer Tool에서 **Add Plugin → manifest.json → Load**를 선택합니다. 이전 버전을 로드했다면 Unload한 뒤 새 폴더의 manifest로 다시 등록하세요.
6. 패널에서 기사 제목·본문을 붙여넣거나 **원고 / 작업 불러오기**를 누릅니다. 사진은 0~2장 선택할 수 있습니다.
7. **무료 디자인 3안 만들기 → 시안 선택 → 선택한 디자인으로 새 문서 만들기**를 실행합니다.
8. InDesign에서 줄바꿈, 사진 크롭, 페이지를 확인하고 **INDD 저장** 또는 **PDF 내보내기**를 누릅니다. PDF는 InDesign의 출력 옵션 창에서 인쇄소 요구에 맞게 설정합니다.

## 제공 기능

- 기존 `.indd` 양식 없이 새 텍스트·사진 프레임을 만들어 배치.
- 무료: 기사 길이, 제목 길이, 사진 유무에 따라 3가지 배치 전략 계산. AI 호출 없는 로컬 방식입니다.
- 선택형 AI: 사용자가 API 키를 입력하고 버튼을 누르면 기사 내용을 바탕으로 새로운 첫 페이지 좌표를 제안. 고정 3안 중 선택하는 방식이 아닙니다.
- 제목·부제·본문 원문 유지. AI는 문구를 다시 쓰지 않고 프레임 역할/좌표만 반환합니다.
- 본문 프레임 연결과 실제 `Story.overflows` 기반 이어지는 페이지 추가. 최대 40페이지.
- 원고·설정·선택 시안 JSON 저장/재개. 사진 자체는 저장 파일에 포함되지 않습니다.
- 새 문서만 생성. 기존 문서 참조를 입력 대상으로 사용하지 않습니다.
- 기본 출력 검사: 글 넘침, 폰트 설치 상태, 이미지 링크 상태. 낮은 유효 해상도 경고.
- 기존 모드의 Word 탭/줄바꿈 파서 보강, 중복 마커 거부, 공백 필수값 거부.

## 입력 형식

일반 DOCX는 첫 번째 내용 있는 문단을 제목, 나머지를 본문으로 읽습니다. TXT는 첫 번째 내용 있는 줄을 제목으로 읽습니다. 입력 후 패널에서 수정할 수 있습니다. Word에 포함된 사진은 자동 추출하지 않으므로 사진 추가 버튼으로 선택해주세요. 표·각주·텍스트상자·변경 추적·필드·수식이 포함된 DOCX는 원고 누락을 피하기 위해 오류로 안내합니다. 일반 문단으로 정리하거나 텍스트를 직접 붙여넣어주세요.

마커 원고도 지원합니다. 새 디자인 모드에서는 TITLE/BODY 필수, 나머지는 선택입니다.

```text
[TITLE]
기사 제목
[POINT_TEXT]
부제 또는 리드문
[BODY]
기사 본문
[HERO_IMAGE]
photo.jpg
```

기존 양식 모드의 Word 데이터 계약은 기존과 같이 WITH_PHOTO입니다. 새 디자인 입력과 혼동하지 마세요.

## 디자인 설정

기본 A4(210×297mm), 여백 18mm, 본문 10.5pt, 재단 여백 3mm. 너비 148~300mm, 높이 210~420mm인 세로 판형을 지원합니다. 여백 12~35mm, 본문 9~14pt 범위입니다. 제목/부제가 과도하게 길어 첫 지면을 구성할 수 없으면 오류를 표시합니다.

화면의 미리보기는 배치 확인용입니다. 브라우저의 글꼴·조판 방식과 InDesign은 다르므로 줄바꿈·페이지 수는 실제 생성 문서에서 확정합니다. 실제 제목/부제 넘침은 자동으로 글자를 축소하지 않고 검수 오류로 표시하며 PDF 내보내기를 막습니다.

## AI 기능과 비용

AI는 선택 기능입니다. 무료 시안은 키가 필요하지 않습니다.

- 기본 모델 입력값: `gpt-4.1-mini`. 계정에서 접근 가능한 Responses/Structured Outputs 지원 모델로 바꿀 수 있습니다.
- 명시적으로 AI 버튼을 누를 때만 `https://api.openai.com/v1/responses`에 1회 요청합니다. 자동 재시도하지 않습니다.
- 전송 내용: 제목, 부제, 분류, 본문 앞 12,000자, 본문 전체 글자 수, 사진 개수/알려진 크기, 지면 설정. 사진 파일·로컬 경로는 전송하지 않습니다.
- API 키는 비밀번호 입력칸과 실행 메모리에서만 사용합니다. 원고 저장 파일·로그·소스·브라우저 저장소에 기록하지 않습니다. 플러그인 재로드 시 초기화합니다.
- `store:false`, 출력 토큰 상한 2,400, 60초 요청 제한. 같은 원고·설정·모델의 결과는 패널 실행 중 재사용합니다.
- AI 제안의 요소 겹침, 영역 초과, 작은 글씨, 본문/사진 누락은 로컬에서 거부합니다. 무효 응답을 무료 시안으로 몰래 대체하거나 비용을 발생시키며 자동 재요청하지 않습니다.
- 실제 API 요청은 이번 개발에서 실행하지 않았습니다. 요금·계정 접근·UXP 네트워크 동작은 사용 환경에서 확인해야 합니다.

## 파일 구성

- `manifest.json`, `index.html`, `studio.js`, `studio.css`: InDesign 플러그인 진입점/화면
- `src/layout-engine.js`: 배치 계산·좌표 검증·페이지 추정
- `src/auto-indesign.js`: 새 문서 생성·연결 조판·검수·저장/PDF
- `src/ai-layout.js`: 선택형 OpenAI 요청·응답 검증
- `src/studio-ui.js`: 패널 상태·시안·프로젝트 저장
- `src/article-input.js`, `src/word-text.js`, `src/docxZip.js`: 원고 입력
- `preview.html`, `preview.js`: 브라우저 체험판
- `index.js`, `src/text.js` 등: 기존 양식 모드
- `tests/`: 순수 로직·모의 Host·모의 DOM 테스트
- `docs/ACCEPTANCE_TESTS.md`: 실제 InDesign에서 확인할 순서

소스 그대로 실행하며 React·서버·빌드 도구가 필요하지 않습니다. 테스트는 Node.js 20 이상에서 `npm test`로 실행합니다. 의존성 설치가 필요하지 않습니다.

## 현재 범위

기사 1건씩 디자인하는 버전입니다. 여러 기사 일괄 조판·목차 자동 생성·인터뷰 내용 분석·표·각주·이미지 생성은 포함하지 않습니다. 기존 목차샘플1은 라벨 설정/분석까지이며 Generate는 여전히 미구현입니다. 무료 모드는 규칙 기반, AI 모드는 선택형 실제 API 연결입니다.

RGB 강조색은 배치 시안의 출발점입니다. 색상 프로파일·오버프린트·재단·이미지 크롭·최종 인쇄소 PDF 규격을 자동으로 보증하지 않습니다. INDD는 기본 오류가 있어도 수정용으로 저장할 수 있고, 패널의 PDF 출력은 기본 오류가 남으면 차단합니다.

## 공식 참고

- [InDesign UXP 플러그인 시작](https://developer.adobe.com/indesign/uxp/plugins/getting-started/)
- [Document API](https://developer.adobe.com/indesign/uxp/dom/api/d/document/)
- [TextFrame API](https://developer.adobe.com/indesign/uxp/dom/api/t/text-frame/)
- [FitOptions API](https://developer.adobe.com/indesign/uxp/dom/api/f/fit-options/)
- [OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs)

확인일: 2026-09-28.

#### UI/UX 브라우저 검증
`node tests/serve-ux.cjs` → `http://127.0.0.1:8766/ux-test.html`에서 실제 Studio UI와 모의 Host를 조작할 수 있습니다. 실제 InDesign 문서/파일은 생성하지 않습니다. 검증 범위와 PC 절차: [UI_UX_AUDIT](docs/UI_UX_AUDIT.md).

#### 안전한 자동 수정
문서 생성 직후와 문서 검사에서 제목·부제를 제한적으로 조정하고 다시 검사합니다. 미해결 오류는 PDF를 계속 차단합니다. 원본 JSON은 바뀌지 않습니다. 정책/한계/실기 순서: [AUTO_FIX](docs/AUTO_FIX.md). 자동 테스트는 132개이며 Adobe 실기 성공을 의미하지 않습니다.

## 원본 디자인 추출 (Phase 1)

별도 개발 도구로 IDML → Design Model v2 추출을 추가했습니다. [모델/지원표](docs/DESIGN_MODEL.md), [변환 방법](docs/DESIGN_EXTRACTION.md), [비교 기준](docs/DESIGN_FIDELITY.md). 패널 가져오기 버튼과 전체 지면 복제는 아직 없습니다. 기존 JSON 3종과 제작 경로는 그대로입니다. 오프라인 추출/신규 테스트에는 Python 3.10+가 필요합니다 (`PYTHON` 환경변수로 실행 파일 지정 가능). Python은 UXP 런타임 의존성이 아닙니다.
