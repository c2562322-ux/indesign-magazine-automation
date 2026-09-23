# HANDOFF.md

이 문서 하나만 읽어도 현재 프로젝트 상태를 파악할 수 있도록 작성한다. 구조와 용어는 프로젝트 루트의 인수인계서(원본 요청 문서) 및 [README.md](README.md)를 따른다.

마지막 업데이트: 2026-09-23

## 현재 프로젝트 단계

**자동화 식별자 방식 결정 완료(Script Label 사용). "시작 페이지" 템플릿 1차 프레임 매핑 초안 작성 완료. 그 외 Template Type(목차/본문 페이지/인터뷰 레이아웃)은 아직 미착수.**

개선된 `Inspect Template`을 사용자가 실제 "시작 페이지" 템플릿(사진 있는 버전 page.name=2/index=3, 사진 없는 버전 page.name=3/index=4)에서 실행하고 로그를 전달했다(2026-09-23, 실기 테스트는 사용자가 직접 수행, Claude Code가 실행한 것은 아니다). 그 로그를 근거로 [docs/TEMPLATE_SPEC.md](docs/TEMPLATE_SPEC.md)의 "Frame 분석 워크시트"에 두 페이지의 모든 Text Frame/Rectangle을 역할과 대응시키고 Proposed Automation Name 후보(TITLE, POINT_TEXT, BODY, BODY_COLUMN_1/2, HERO_IMAGE)를 기록했다. 이 매핑은 아직 디자이너와 확정된 것이 아니라 초안이며, 여러 항목이 "확인 필요"로 남아 있다. 프레임 이름은 InDesign에서 실제로 변경하지 않았다(코드/템플릿 파일 모두 미변경). Template Type 4종(목차, 시작 페이지, 본문 페이지, 인터뷰 레이아웃)은 확정되었지만, "시작 페이지" 외 나머지 3종의 프레임 분석과 자동 조판 로직은 아직 시작하지 않았다.

`name`이 대부분 비어 있다는 문제 때문에 자동화 식별자로 `name` 대신 Script Label(`label`)을 검토했고, `Inspect Template`에 `label`을 읽기 전용으로 출력하도록 추가한 뒤 사용자가 실제 InDesign에서 실행해 Text Frame과 Rectangle 모두 `label`에 에러 없이 접근됨을 확인했다(2026-09-23). 이를 근거로 **자동화 대상 프레임 식별은 Script Label(`label`)을 1차 기준으로 사용하기로 결정**했다([DECISIONS.md](DECISIONS.md) D008). 단, 이 결정은 "어떤 속성을 읽을지"만 정한 것이고, working .indd의 실제 프레임에 TITLE/POINT_TEXT/BODY/HERO_IMAGE 같은 Script Label 값을 실제로 써넣는 작업은 아직 하지 않았다(아래 "다음 추천 작업" 참고, 실행에는 사용자 승인 필요).

## 완료된 기능

- 프로젝트 기본 폴더 구조 ([manifest.json](manifest.json), [index.html](index.html), [styles.css](styles.css), [index.js](index.js), `src/`, `sample/`)
- `Magazine Automation` UXP 패널 UI: `Load Article` 버튼, `Generate` 버튼, Status 표시 영역 ([index.html](index.html))
- `Generate` 버튼 클릭 시 InDesign 문서 첫 페이지에 "Hello Magazine" 텍스트 프레임을 생성하는 코드 ([src/indesign.js](src/indesign.js)의 `addHelloText`)
- UI 로직([index.js](index.js))과 InDesign 제어 로직([src/indesign.js](src/indesign.js)) 분리
- 개발용 샘플 데이터 [sample/article.json](sample/article.json)
- 디자인 리소스 보관용 폴더 구조 생성 및 디자이너 원본 InDesign 템플릿(.indd/.idml)·폰트 파일 수령 완료 (`assets/templates/original/`, `assets/templates/working/`, `assets/fonts/`, 실제 파일은 Git에는 올리지 않음 — [.gitignore](.gitignore) 참고)
- `Inspect Template` 버튼 및 읽기 전용 문서 구조 분석 기능 추가/개선 ([src/inspector.js](src/inspector.js)의 `inspectDocument`/`formatReport`): 전체 페이지 수, 페이지별 Page Item 수, Text Frame 목록(name, label, 텍스트 미리보기 50자, geometricBounds), Rectangle 목록(name, label, geometricBounds, 이미지 배치 여부), 페이지의 내부 index와 page.name, 사용 가능한 Paragraph/Object Style 목록을 패널의 `Inspection Log` 영역과 콘솔에 출력. 문서를 수정하는 코드는 없음.

## 실제 테스트 완료된 기능

사용자가 실제 InDesign + UXP Developer Tool에서 직접 확인한 내용 (Claude Code가 아닌 사용자가 실행):

- UXP Developer Tool에서 [manifest.json](manifest.json) 로드 및 `Magazine Automation` 패널 표시 (2026-09-22)
- `Inspect Template` 버튼 클릭 시 에러 없이 실행됨 (2026-09-22, 2026-09-23 두 차례)
- `assets/templates/working/`의 실제 디자이너 템플릿 사본에서, "시작 페이지" 템플릿의 두 페이지 변형(page.name=2/index=3, page.name=3/index=4)에 대해 `Inspect Template`의 개선된 출력(Text Frame의 name/텍스트 미리보기/geometricBounds, Rectangle의 name/geometricBounds/이미지 배치 여부, 페이지 index와 page.name)이 실제로 정상 표시됨을 확인 (2026-09-23) — `src/inspector.js`에서 추가한 `textFrame.contents`, `item.geometricBounds`, `rectangle.images` 기반 출력이 실사용에서 동작한 것으로 확인됨
- `item.label`(Script Label) 읽기: Text Frame과 Rectangle 모두에서 에러 없이 값을 읽을 수 있음을 확인 (2026-09-23). 이 결과를 근거로 D008(자동화 식별자로 `label` 사용) 결정

**아직 확인되지 않은 부분**: `doc.paragraphStyles`/`doc.objectStyles`(스타일 목록) 출력이 올바른지, "시작 페이지" 외 나머지 페이지(목차/본문 페이지/인터뷰 레이아웃)에서도 동일하게 동작하는지는 아직 보고되지 않았다. 아래 "아직 테스트하지 못한 기능"에 남겨둔다.

## 아직 테스트하지 못한 기능

- `Generate` 버튼 클릭 시 `src/indesign.js`의 `app.doScript(...)` 호출이 실제 InDesign UXP API와 시그니처가 맞는지, 에러 없이 텍스트 프레임이 생성되는지 (이번 테스트에서 별도로 재확인되지 않음)
- `Load Article` 버튼 (현재 클릭해도 "아직 구현되지 않음" 상태 메시지만 표시, 실제 동작 없음)
- `doc.paragraphStyles`/`doc.objectStyles`(스타일 목록)가 실제로 올바른 값을 보여주는지는 아직 구체적으로 보고되지 않았다
- Script Label에 실제로 값을 쓰는 동작(`label = "TITLE"` 등)은 아직 코드로 작성한 적도, 테스트한 적도 없다. 지금까지 확인된 것은 "읽기"만이다.
- `Inspect Template`을 "시작 페이지" 외 나머지 Template Type(목차, 본문 페이지, 인터뷰 레이아웃)에서 실행했을 때도 동일하게 정상 동작하는지
- Group으로 묶인 개체나 스타일 그룹 내부 스타일이 실제 템플릿에 얼마나 있는지, 그로 인해 워크시트 작성 시 어떤 항목이 누락되는지 (현재 버전은 이런 항목을 집계하지 않음 — 알려진 문제 참고)

## 진행 중인 작업

- "시작 페이지" 프레임 매핑 초안은 작성했지만, "확인 필요"로 남은 항목(POINT_TEXT가 `subtitle`과 같은 필드인지, 2단 본문을 하나의 `body` 필드로 자동 분배할지 등)이 많아 디자이너 확인 전까지는 확정판(Frame Name/Data Field Mapping 등)으로 옮기지 않는다.
- 자동화 식별자 방식은 Script Label(`label`)로 결정됐다(D008). 다음 단계로 working .indd의 "시작 페이지" 프레임에 실제 Script Label 값을 부여하는 작업을 제안한다(아래 "다음 추천 작업" 1번). 아직 실행하지 않았고, InDesign 파일을 수정하는 작업이므로 실행 전 사용자 승인이 필요하다.

## Script Label 부여 제안 (실행 전 승인 필요)

"시작 페이지" [docs/TEMPLATE_SPEC.md](docs/TEMPLATE_SPEC.md) 워크시트의 Proposed Automation Name(후보) 값을 그대로 Script Label로 부여하는 안을 제안한다.

| 페이지 | 프레임(텍스트 미리보기/bounds로 식별) | 제안하는 Script Label |
|---|---|---|
| page.name=2 (사진 있음) | "매거진 시작 메인 페이지" Text Frame | `TITLE` |
| page.name=2 (사진 있음) | "캡션 혹은 부제나…" Text Frame | `POINT_TEXT` |
| page.name=2 (사진 있음) | Lorem ipsum 본문 Text Frame | `BODY` |
| page.name=2 (사진 있음) | bounds `[22.07, 116, 287, 201]` Rectangle | `HERO_IMAGE` |
| page.name=2 (사진 있음) | "대표이미지" 안내 문구 Text Frame | 부여하지 않음 (데이터 필드 아님) |
| page.name=3 (사진 없음) | "매거진 시작 메인 페이지 (사진X)" Text Frame | `TITLE` |
| page.name=3 (사진 없음) | "캡션 혹은 부제나…" Text Frame | `POINT_TEXT` |
| page.name=3 (사진 없음) | 왼쪽 본문 Text Frame | `BODY_COLUMN_1` |
| page.name=3 (사진 없음) | 오른쪽 본문 Text Frame | `BODY_COLUMN_2` |

실행 방법 후보 (아직 결정 안 됨, 사용자 선택 필요):

- **(A) 사용자가 InDesign에서 직접**: `Window > Utilities > Script Label` 패널로 각 프레임을 선택해 수동으로 값을 입력. 가장 안전하지만 프레임 수가 늘어나면 반복 작업이 늘어난다.
- **(B) Claude Code가 1회성 스크립트로 자동 부여**: `src/`에 임시 스크립트(또는 UXP 패널의 임시 버튼)를 만들어 위 표의 값을 한 번에 써넣는다. 빠르지만 InDesign 파일을 코드가 직접 수정하는 첫 사례이므로, 실행 전 반드시 working 사본에서만 시도하고 결과를 InDesign에서 직접 확인해야 한다.

어느 방식으로 진행할지 결정되면 그에 맞춰 코드(옵션 B의 경우) 또는 안내(옵션 A의 경우)를 준비하겠다. **이 표는 제안일 뿐이며, 이번 작업에서는 실행하지 않았다.**

## 미구현 기능

- `src/data.js`: `sample/article.json` 읽기/파싱 (Load Article 버튼과 연결 예정)
- `src/template.js`: `templateType`(FEATURE, INTERVIEW, NEWS, PHOTO 등)별 템플릿 처리
- `src/text.js`: TITLE/SUBTITLE/AUTHOR/BODY 등 텍스트 프레임에 데이터 매핑
- `src/image.js`: HERO_IMAGE/IMAGE_01 등 이미지 프레임 배치
- `src/validation.js`: 필수 데이터 누락, 이미지 누락, Overset Text, 프레임 누락 등 오류 검사
- 여러 기사 지원, 여러 템플릿 지원
- 본문 길이에 따른 추가 페이지 처리 (Linked Text Frame)
- PDF 자동 출력

## 알려진 문제

- `src/indesign.js`의 `app.doScript()` 호출부(인자 순서, `ScriptLanguage`/`UndoModes` 접근 방식)는 Adobe에서 공개한 InDesign UXP 패턴을 참고해 작성했지만, 실제 InDesign에서 실행해 검증한 적이 없다. 버전/환경에 따라 시그니처가 다를 수 있으므로 UDT의 Inspect(콘솔)로 확인 후 필요시 수정해야 한다.
- `manifest.json`에 `icons` 항목이 없다. 아이콘 파일이 없는 상태에서 값을 채우면 로드 에러가 날 수 있어 의도적으로 생략했다. 아이콘 리소스가 준비되면 추가한다.
- `src/inspector.js`가 사용하는 `page.textFrames`, `page.rectangles`, `rectangle.images`, `item.geometricBounds`, `textFrame.contents`, `doc.paragraphStyles`, `doc.objectStyles`는 classic InDesign Scripting DOM 기준으로 작성했으며 InDesign UXP에서 실제 검증되지 않았다.
- `src/inspector.js`는 Group으로 묶인 pageItem(중첩 개체)과 Paragraph/Object Style Group 내부의 스타일을 집계하지 않는다. `page.pageItems`/`doc.paragraphStyles`/`doc.objectStyles`가 최상위 항목만 반환하기 때문이며, 디자이너 템플릿이 그룹을 많이 쓴다면 "Page Item 수"와 실제 나열된 Text Frame/Rectangle 개수 사이에 차이가 날 수 있다.
- `textFrame.contents`는 classic InDesign DOM 기준으로 그 프레임이 속한 스토리 전체 텍스트를 반환하는 것으로 알려져 있다. Linked Text Frame으로 여러 프레임이 이어져 있다면, 텍스트 미리보기가 "그 프레임에 보이는 내용"이 아니라 "연결된 스토리 전체의 앞부분"일 수 있다 (미검증, 실기 테스트로 확인 필요).
- `item.label`(Script Label) 읽기는 실기로 확인되었지만(D008), **쓰기는 아직 검증되지 않았다.** `label = "TITLE"`처럼 값을 실제로 저장하는 동작, 저장한 값이 파일 저장/재오픈 후에도 유지되는지는 다음 단계에서 확인이 필요하다.

## 외부 대기 사항

- 디자이너와 프레임 Naming Convention, Paragraph/Object Style Naming Convention 등 확정 필요 (아래 "디자이너에게 확인해야 할 사항" 참고). 원본 템플릿 파일 자체는 수령했지만, 이 확정 작업은 아직 진행되지 않았다.

## 다음 추천 작업

1. 위 "Script Label 부여 제안" 표를 검토하고, 실행 방식(A: 사용자가 직접 InDesign에서 입력 / B: Claude Code가 1회성 스크립트로 부여)을 정한다. 결정되면 working .indd의 "시작 페이지" 프레임에 실제로 Script Label을 부여하고, 부여한 값이 `Inspect Template`으로 다시 읽히는지 확인한다 — 이 작업은 InDesign 파일을 수정하므로 실행 전 사용자 승인이 필요하다.
2. "목차" 템플릿에서 `Inspect Template`을 실행하고 로그를 전달해, "시작 페이지"와 같은 방식으로 [docs/TEMPLATE_SPEC.md](docs/TEMPLATE_SPEC.md) 워크시트에 행을 추가한다. 이어서 "본문 페이지", "인터뷰 레이아웃"도 같은 방식으로 분석한다.
3. "시작 페이지" 워크시트에서 "확인 필요"로 남긴 항목(POINT_TEXT ↔ `subtitle` 필드 동일 여부, BODY_COLUMN_1/2를 `body` 하나로 자동 분배할지 여부, HERO_IMAGE의 Required/Optional, "대표이미지" 안내 문구 프레임 처리 방식)을 디자이너와 확인한다.
4. `doc.paragraphStyles`/`doc.objectStyles` 출력이 실제로 올바른지, "시작 페이지" 외 다른 템플릿에서도 `Inspect Template`이 에러 없이 동작하는지 확인하고 결과를 이 문서에 반영한다.
5. 모든 Template Type의 워크시트 분석과 디자이너 확인이 끝나면 [docs/TEMPLATE_SPEC.md](docs/TEMPLATE_SPEC.md)의 "Frame Name"/"Data Field Mapping"/"Required / Optional"/"Paragraph Style"/"Object Style" 표(확정판)를 채우고, 이후 `src/data.js`(JSON 로드)부터 자동 조판 구현을 시작한다.

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
