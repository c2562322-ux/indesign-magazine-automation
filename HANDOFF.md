# HANDOFF.md

이 문서 하나만 읽어도 현재 프로젝트 상태를 파악할 수 있도록 작성한다. 구조와 용어는 프로젝트 루트의 인수인계서(원본 요청 문서) 및 [README.md](README.md)를 따른다.

마지막 업데이트: 2026-09-23

## 현재 프로젝트 단계

**"시작 페이지" Script Label 검증 실기 테스트 성공. 자동조판 MVP용 기사 JSON 데이터 계약 정의 완료. 그 외 Template Type(목차/본문 페이지/인터뷰 레이아웃)은 아직 미착수, JSON을 실제로 읽어 InDesign에 채우는 코드는 아직 없음.**

개선된 `Inspect Template`을 사용자가 실제 "시작 페이지" 템플릿(사진 있는 버전 page.name=2/index=3, 사진 없는 버전 page.name=3/index=4)에서 실행하고 로그를 전달했다(2026-09-23, 실기 테스트는 사용자가 직접 수행, Claude Code가 실행한 것은 아니다). 그 로그를 근거로 [docs/TEMPLATE_SPEC.md](docs/TEMPLATE_SPEC.md)의 "Frame 분석 워크시트"에 두 페이지의 모든 Text Frame/Rectangle을 역할과 대응시키고 Proposed Automation Name 후보(TITLE, POINT_TEXT, BODY, BODY_COLUMN_1/2, HERO_IMAGE)를 기록했다. 이 매핑은 아직 디자이너와 확정된 것이 아니라 초안이며, 여러 항목이 "확인 필요"로 남아 있다. 프레임 이름은 InDesign에서 실제로 변경하지 않았다(코드/템플릿 파일 모두 미변경). Template Type 4종(목차, 시작 페이지, 본문 페이지, 인터뷰 레이아웃)은 확정되었지만, "시작 페이지" 외 나머지 3종의 프레임 분석과 자동 조판 로직은 아직 시작하지 않았다.

`name`이 대부분 비어 있다는 문제 때문에 자동화 식별자로 `name` 대신 Script Label(`label`)을 검토했고, `Inspect Template`에 `label`을 읽기 전용으로 출력하도록 추가한 뒤 사용자가 실제 InDesign에서 실행해 Text Frame과 Rectangle 모두 `label`에 에러 없이 접근됨을 확인했다(2026-09-23). 이를 근거로 **자동화 대상 프레임 식별은 Script Label(`label`)을 1차 기준으로 사용하기로 결정**했다([DECISIONS.md](DECISIONS.md) D008).

이후 **사용자가 실제 working .indd의 "시작 페이지" 두 변형에 Script Label을 직접 부여했다**(2026-09-23, InDesign에서 사용자가 직접 수행): 사진 있는 버전(page.name=2)에는 `TITLE`/`POINT_TEXT`/`BODY`/`HERO_IMAGE`, 사진 없는 버전(page.name=3)에는 `TITLE`/`POINT_TEXT`/`BODY_COLUMN_1`/`BODY_COLUMN_2`. 코드가 Script Label만으로 필요한 프레임을 정확히 찾아내는지 검증하는 읽기 전용 기능을 [src/validation.js](src/validation.js)에 구현했고, **사용자가 실제 InDesign에서 `Inspect Template`을 실행해 두 페이지 모두 "결과: 모두 정상"(TITLE/POINT_TEXT/BODY/HERO_IMAGE, TITLE/POINT_TEXT/BODY_COLUMN_1/BODY_COLUMN_2 전부 `[OK]`)임을 확인했다**(2026-09-23).

이 성공을 근거로 자동조판 MVP에서 쓸 기사 JSON 데이터 계약을 정의했다 — [docs/ARTICLE_DATA_SPEC.md](docs/ARTICLE_DATA_SPEC.md). 사진 있음/없음 구분은 `heroImage` 존재 여부로 암묵적으로 추측하지 않고 `variant` 필드(`"WITH_PHOTO"`/`"WITHOUT_PHOTO"`)로 명시하도록 정했고, 본문 2단 구성도 자동 분배 대신 `bodyColumn1`/`bodyColumn2` 두 필드로 명시적으로 받기로 했다. `sample/opening-page-with-photo.json`, `sample/opening-page-without-photo.json` 샘플 파일도 만들었다. **이 JSON을 실제로 읽거나 InDesign에 채워 넣는 코드는 아직 없다** — 이번 작업은 데이터 구조 정의와 샘플 파일까지만 진행했다.

## 완료된 기능

- 프로젝트 기본 폴더 구조 ([manifest.json](manifest.json), [index.html](index.html), [styles.css](styles.css), [index.js](index.js), `src/`, `sample/`)
- `Magazine Automation` UXP 패널 UI: `Load Article` 버튼, `Generate` 버튼, Status 표시 영역 ([index.html](index.html))
- `Generate` 버튼 클릭 시 InDesign 문서 첫 페이지에 "Hello Magazine" 텍스트 프레임을 생성하는 코드 ([src/indesign.js](src/indesign.js)의 `addHelloText`)
- UI 로직([index.js](index.js))과 InDesign 제어 로직([src/indesign.js](src/indesign.js)) 분리
- 개발용 샘플 데이터 [sample/article.json](sample/article.json)
- 디자인 리소스 보관용 폴더 구조 생성 및 디자이너 원본 InDesign 템플릿(.indd/.idml)·폰트 파일 수령 완료 (`assets/templates/original/`, `assets/templates/working/`, `assets/fonts/`, 실제 파일은 Git에는 올리지 않음 — [.gitignore](.gitignore) 참고)
- `Inspect Template` 버튼 및 읽기 전용 문서 구조 분석 기능 추가/개선 ([src/inspector.js](src/inspector.js)의 `inspectDocument`/`formatReport`): 전체 페이지 수, 페이지별 Page Item 수, Text Frame 목록(name, label, 텍스트 미리보기 50자, geometricBounds), Rectangle 목록(name, label, geometricBounds, 이미지 배치 여부), 페이지의 내부 index와 page.name, 사용 가능한 Paragraph/Object Style 목록을 패널의 `Inspection Log` 영역과 콘솔에 출력. 문서를 수정하는 코드는 없음.
- Script Label 기반 프레임 검증 기능 추가 ([src/validation.js](src/validation.js)의 `validateFrameLabels`/`formatValidationReport`, `index.js`에서 `Inspect Template` 버튼 클릭 시 자동 실행): "시작 페이지" 사진 있음/없음 두 변형 각각에 필요한 Label(TITLE/POINT_TEXT/BODY/HERO_IMAGE 또는 TITLE/POINT_TEXT/BODY_COLUMN_1/BODY_COLUMN_2)이 정확히 1개씩 있는지, 예상 타입(TextFrame/Rectangle)과 일치하는지 검사해 같은 `Inspection Log`/콘솔에 출력. InDesign API를 직접 호출하지 않고 `inspector.js`의 report만 입력으로 사용 (D009). 문서를 수정하지 않음.
- 자동조판 MVP용 기사 JSON 데이터 계약 정의 ([docs/ARTICLE_DATA_SPEC.md](docs/ARTICLE_DATA_SPEC.md)): "시작 페이지" 2개 variant(`WITH_PHOTO`/`WITHOUT_PHOTO`)의 필드, Required/Optional, Script Label 매핑을 정리하고 샘플 파일([sample/opening-page-with-photo.json](sample/opening-page-with-photo.json), [sample/opening-page-without-photo.json](sample/opening-page-without-photo.json))을 작성. JSON을 실제로 읽거나 InDesign에 적용하는 코드는 아직 없음.

## 실제 테스트 완료된 기능

사용자가 실제 InDesign + UXP Developer Tool에서 직접 확인한 내용 (Claude Code가 아닌 사용자가 실행):

- UXP Developer Tool에서 [manifest.json](manifest.json) 로드 및 `Magazine Automation` 패널 표시 (2026-09-22)
- `Inspect Template` 버튼 클릭 시 에러 없이 실행됨 (2026-09-22, 2026-09-23 두 차례)
- `assets/templates/working/`의 실제 디자이너 템플릿 사본에서, "시작 페이지" 템플릿의 두 페이지 변형(page.name=2/index=3, page.name=3/index=4)에 대해 `Inspect Template`의 개선된 출력(Text Frame의 name/텍스트 미리보기/geometricBounds, Rectangle의 name/geometricBounds/이미지 배치 여부, 페이지 index와 page.name)이 실제로 정상 표시됨을 확인 (2026-09-23) — `src/inspector.js`에서 추가한 `textFrame.contents`, `item.geometricBounds`, `rectangle.images` 기반 출력이 실사용에서 동작한 것으로 확인됨
- `item.label`(Script Label) 읽기: Text Frame과 Rectangle 모두에서 에러 없이 값을 읽을 수 있음을 확인 (2026-09-23). 이 결과를 근거로 D008(자동화 식별자로 `label` 사용) 결정
- Script Label 기반 프레임 검증 기능([src/validation.js](src/validation.js)): Script Label이 부여된 실제 working .indd에서 `Inspect Template`을 실행해 page.name=2("시작 페이지(사진 있음)")와 page.name=3("시작 페이지(사진 없음)") 모두 `TITLE`/`POINT_TEXT`/`BODY`/`HERO_IMAGE` 및 `TITLE`/`POINT_TEXT`/`BODY_COLUMN_1`/`BODY_COLUMN_2`가 전부 `[OK]`, "결과: 모두 정상"으로 나옴을 확인 (2026-09-23)

**아직 확인되지 않은 부분**: `doc.paragraphStyles`/`doc.objectStyles`(스타일 목록) 출력이 올바른지, "시작 페이지" 외 나머지 페이지(목차/본문 페이지/인터뷰 레이아웃)에서도 동일하게 동작하는지는 아직 보고되지 않았다. 아래 "아직 테스트하지 못한 기능"에 남겨둔다.

## 아직 테스트하지 못한 기능

- `Generate` 버튼 클릭 시 `src/indesign.js`의 `app.doScript(...)` 호출이 실제 InDesign UXP API와 시그니처가 맞는지, 에러 없이 텍스트 프레임이 생성되는지 (이번 테스트에서 별도로 재확인되지 않음)
- `Load Article` 버튼 (현재 클릭해도 "아직 구현되지 않음" 상태 메시지만 표시, 실제 동작 없음)
- `doc.paragraphStyles`/`doc.objectStyles`(스타일 목록)가 실제로 올바른 값을 보여주는지는 아직 구체적으로 보고되지 않았다
- `Inspect Template`을 "시작 페이지" 외 나머지 Template Type(목차, 본문 페이지, 인터뷰 레이아웃)에서 실행했을 때도 동일하게 정상 동작하는지
- Group으로 묶인 개체나 스타일 그룹 내부 스타일이 실제 템플릿에 얼마나 있는지, 그로 인해 워크시트 작성 시 어떤 항목이 누락되는지 (현재 버전은 이런 항목을 집계하지 않음 — 알려진 문제 참고)

## 진행 중인 작업

- "시작 페이지" 프레임 매핑 초안은 작성했지만, "확인 필요"로 남은 항목(pointText가 원래 handoff 문서의 subtitle 개념과 같은지, HERO_IMAGE의 템플릿 레벨 Optional 여부, "대표이미지" 안내 문구 프레임 처리 방식 등)이 많아 디자이너 확인 전까지는 확정판(Frame Name/Data Field Mapping 등)으로 옮기지 않는다.
- JSON 데이터 계약([docs/ARTICLE_DATA_SPEC.md](docs/ARTICLE_DATA_SPEC.md))은 정의했지만, 이를 실제로 읽어 InDesign에 적용하는 코드(`src/data.js`, `Load Article`/`Generate` 연동)는 아직 시작하지 않았다.

## Script Label 부여 및 검증 현황

"시작 페이지" 두 변형에 아래 Script Label이 **사용자가 InDesign에서 직접 부여했고, 읽기 전용 검증까지 실제 InDesign에서 "모두 정상"으로 확인 완료**되었다(2026-09-23):

| 페이지 | 부여된 Script Label | 검증 결과 |
|---|---|---|
| page.name=2 (사진 있음) | `TITLE`, `POINT_TEXT`, `BODY`, `HERO_IMAGE` | 모두 `[OK]`, 결과: 모두 정상 |
| page.name=3 (사진 없음) | `TITLE`, `POINT_TEXT`, `BODY_COLUMN_1`, `BODY_COLUMN_2` | 모두 `[OK]`, 결과: 모두 정상 |

`src/validation.js`의 검증 규칙(`OPENING_WITH_PHOTO`/`OPENING_WITHOUT_PHOTO`)이 실제 파일과 일치함이 확인되었다. "대표이미지" 안내 문구 Text Frame은 검증 대상 Label 목록에 없으므로(검증 로직이 별도로 취급하지 않음) 이번 테스트로 Label 부여 여부가 직접 확인되지는 않았다.

## 미구현 기능

- `src/data.js`: JSON 기사 데이터 읽기/파싱. 데이터 구조는 [docs/ARTICLE_DATA_SPEC.md](docs/ARTICLE_DATA_SPEC.md)에 정의했지만 이를 읽는 코드, `Load Article` 버튼과의 연결은 아직 없음
- `src/template.js`: `templateType`(`OPENING_PAGE` 등)별 템플릿 처리, `variant`에 따른 분기
- `src/text.js`: TITLE/POINT_TEXT/BODY/BODY_COLUMN_1/BODY_COLUMN_2 등 텍스트 프레임에 데이터(contents) 채워 넣기
- `src/image.js`: HERO_IMAGE 등 이미지 프레임 배치
- `src/validation.js`: "시작 페이지" Script Label 기준 프레임 존재/타입 검사는 구현됨(미검증). 필수 데이터 누락, 이미지 누락, Overset Text 검사, 다른 Template Type에 대한 검증은 아직 없음
- 여러 기사 지원, 여러 템플릿 지원
- 본문 길이에 따른 추가 페이지 처리 (Linked Text Frame)
- PDF 자동 출력

## 알려진 문제

- `src/indesign.js`의 `app.doScript()` 호출부(인자 순서, `ScriptLanguage`/`UndoModes` 접근 방식)는 Adobe에서 공개한 InDesign UXP 패턴을 참고해 작성했지만, 실제 InDesign에서 실행해 검증한 적이 없다. 버전/환경에 따라 시그니처가 다를 수 있으므로 UDT의 Inspect(콘솔)로 확인 후 필요시 수정해야 한다.
- `manifest.json`에 `icons` 항목이 없다. 아이콘 파일이 없는 상태에서 값을 채우면 로드 에러가 날 수 있어 의도적으로 생략했다. 아이콘 리소스가 준비되면 추가한다.
- `src/inspector.js`가 사용하는 `page.textFrames`, `page.rectangles`, `rectangle.images`, `item.geometricBounds`, `textFrame.contents`, `doc.paragraphStyles`, `doc.objectStyles`는 classic InDesign Scripting DOM 기준으로 작성했으며 InDesign UXP에서 실제 검증되지 않았다.
- `src/inspector.js`는 Group으로 묶인 pageItem(중첩 개체)과 Paragraph/Object Style Group 내부의 스타일을 집계하지 않는다. `page.pageItems`/`doc.paragraphStyles`/`doc.objectStyles`가 최상위 항목만 반환하기 때문이며, 디자이너 템플릿이 그룹을 많이 쓴다면 "Page Item 수"와 실제 나열된 Text Frame/Rectangle 개수 사이에 차이가 날 수 있다.
- `textFrame.contents`는 classic InDesign DOM 기준으로 그 프레임이 속한 스토리 전체 텍스트를 반환하는 것으로 알려져 있다. Linked Text Frame으로 여러 프레임이 이어져 있다면, 텍스트 미리보기가 "그 프레임에 보이는 내용"이 아니라 "연결된 스토리 전체의 앞부분"일 수 있다 (미검증, 실기 테스트로 확인 필요).
- `item.label`(Script Label) 읽기는 실기로 확인되었다(D008). 값을 쓰는 동작은 코드로 작성한 적이 없고, 사용자가 InDesign UI에서 직접 부여했다 — 코드로 쓰는 경우(`label = "..."`)의 동작은 아직 검증되지 않았다.
- `src/validation.js`의 페이지 유형 판별 로직(`pickProfile`)은 "BODY_COLUMN_1/2가 있으면 사진 없는 변형, HERO_IMAGE나 BODY가 있으면 사진 있는 변형"이라는 휴리스틱이다. "시작 페이지" 두 변형에서는 실제로 올바르게 동작함을 확인했지만(2026-09-23), 다른 페이지(목차 등)에 우연히 같은 Label이 쓰이면 오판할 수 있다. 다른 Template Type을 분석할 때 유의해야 한다.
- [docs/ARTICLE_DATA_SPEC.md](docs/ARTICLE_DATA_SPEC.md)의 Required/Optional 표시는 이번 MVP 설계를 위한 잠정 결정이며, 디자이너 공식 확인을 거친 것은 아니다. `variant` 값이 잘못되거나 누락됐을 때의 처리 방식도 아직 정의/구현하지 않았다.

## 외부 대기 사항

- 디자이너와 프레임 Naming Convention, Paragraph/Object Style Naming Convention 등 확정 필요 (아래 "디자이너에게 확인해야 할 사항" 참고). 원본 템플릿 파일 자체는 수령했지만, 이 확정 작업은 아직 진행되지 않았다.

## 다음 추천 작업

1. `src/data.js`에 `sample/opening-page-with-photo.json`/`sample/opening-page-without-photo.json` 같은 JSON 파일을 읽어 [docs/ARTICLE_DATA_SPEC.md](docs/ARTICLE_DATA_SPEC.md) 구조로 파싱하는 최소 기능을 구현한다 (아직 `Load Article` 버튼의 실제 파일 선택 UI까지는 아니어도, 고정 경로를 읽는 정도부터 시작 가능).
2. `variant` 값에 따라 필요한 필드가 다 있는지 검사하는 최소 검증(예: `WITH_PHOTO`인데 `heroImage`가 없으면 오류)을 추가한다 — 이번 작업에서는 이 검증도 구현하지 않았다.
3. `Generate` 버튼 또는 새 버튼에서 읽은 JSON 데이터를 Script Label로 찾은 프레임의 `contents`에 채워 넣는 최소 자동조판(텍스트만, 이미지 배치 제외)을 시도한다. 문서를 실제로 수정하는 첫 단계이므로 작은 단위로 나눠 진행하고 실기 검증을 거친다.
4. 이미지 배치(`heroImage` → `HERO_IMAGE` Rectangle)는 텍스트 자동조판이 안정된 뒤 별도 단계로 진행한다.
5. "시작 페이지" 워크시트에서 "확인 필요"로 남긴 항목(pointText가 원래 subtitle 개념과 같은지, HERO_IMAGE의 템플릿 레벨 Optional 여부, "대표이미지" 안내 문구 프레임 처리 방식)을 디자이너와 확인한다.
6. 위 MVP가 "시작 페이지"에서 안정되면 "목차" 템플릿에서 `Inspect Template`을 실행하고 로그를 전달해 같은 방식으로 분석·검증·데이터 계약을 확장한다. 이어서 "본문 페이지", "인터뷰 레이아웃"도 순서대로 진행한다.

## 디자이너에게 확인해야 할 사항

인수인계서 5, 6, 7, 8, 19절 기준으로 정리:

- 반복 사용되는 대표 페이지 유형 (예: COVER, FEATURE_OPENING, FEATURE_BODY, INTERVIEW_OPENING, INTERVIEW_BODY, PHOTO_PAGE, NEWS, TOC, AD 등 실제로 몇 종류를 쓰는지)
- 각 페이지 영역(제목/부제/본문/작성자/대표 이미지/이미지/캡션)의 역할과 프레임 이름 규칙
- 텍스트/이미지 상태 변화에 따른 레이아웃 처리 방식 (제목이 너무 길 때, 본문이 길거나 짧을 때, 이미지가 없을 때, 부제/캡션이 없을 때)
- 구조는 같고 스타일만 다른 페이지인지, 구조 자체가 다른 별도 템플릿인지 여부
- Paragraph Style / Object Style 이름 규칙
- 실제 기사 데이터 제공 방식 (JSON/CSV/Excel/API 등)과 이미지 제공 방식
- 최종 PDF 출력 방식, 향후 CMS/API 연동 여부

확정되는 내용은 [docs/TEMPLATE_SPEC.md](docs/TEMPLATE_SPEC.md)에 기록한다.
