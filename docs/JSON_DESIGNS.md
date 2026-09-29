# 외부 JSON 디자인 — json-design-01

기준: stability-01 (21797534db02a2da8c7a1e95721e1a4abfe9e882) 위에 추가. 기존 무료/AI 디자인과 별도로 선택한다. 원본 INDD/IDML을 읽는 기능은 아니다. 전달된 ZIP의 네 JSON을 designs/에 그대로 보관하고 실행 시 읽는다. JSON의 source/notes는 출처 자료이며 실행 지시로 사용하지 않는다.

## 제공 자료 분석

| 항목 | Layout 01 | Layout 02 | Layout 03 |
|---|---|---|---|
| 페이지 mm | 216 × 303 | 216 × 303 | 216 × 303 |
| 요소 수 | 8 | 8 | 9 |
| 사진 프레임 mm | 176.5 × 79, x18.25/y91.75 | 78.275 × 79, x118/y32.778 | 176.5 × 79, x18.25/y91.75 |
| 본문 | 독립 프레임 2개 | 독립 프레임 2개 | 독립 프레임 3개 |
| 본문 프레임 mm | 각각 84.16 × 96.697 | 각각 84.16 × 96.697 | 각각 51.262 × 86.447 |
| 프레임 사이 거리 mm | 8.18 | 8.18 | 4.982 |
| 제목 크기/행간 pt | 51/60 | 45/54 | 51/60 |
| 부제 크기/행간 pt | 16/16 | 16/24 | 16/16 |
| 본문 크기/행간 pt | 13/19 | 13/19 | 13/19 |
| 본문 tracking | 20 | 20 | 20 |
| 페이지 번호 정렬 | LeftJustified | RightAlign | LeftJustified |

모두 사진 min/max=1, family=프리젠테이션, 제목=6 SemiBold, 본문/번호=4 Regular, 부제/헤더=5 Medium이다. 장식선은 RGB 48/53/88, 1.5pt, RoundEndCap. 이미지 fill은 CMYK 10/0/0/0, 반경 5mm, cover. 원본 pageName 4/5/6은 출처 정보이며 새 문서 번호는 1부터다.

**원본 정보의 한계:** 헤더 fontSizePt와 페이지 번호 leadingPt는 null이다. 헤더 문구, 글자색, baseline, 문단 간격, inset, bleed, color profile, 원본 이미지 crop offset도 없다. 원본 IDML 자체와 대조한 것은 아니므로 JSON을 넘어선 원본 복원 완료로 해석하면 안 된다.

## 연결 구조

designs/manifest.json → src/json-design.js load/validate/normalize → layout-engine.fromDesign → origin=json 공통 plan → 기존 Studio Preview / auto-indesign JSON 페이지 생성 경로.

JSON 해석은 정규화 단계에서만 한다. 두 renderer는 평탄화한 mm frame, typography, fill/stroke, fit, inset, columnGap을 소비한다. plan 안에 원본 design과 명시적인 fontOverrides를 함께 저장한다. 작업 JSON 복원 및 생성 전에 원본에서 plan을 재구성하여 좌표/스타일 변조를 검사한다. 설정 패널의 판형/본문 크기/강조색 기본값으로 JSON 수치를 덮지 않는다.

일반 무료 3안은 기존 규칙을 유지한다. 원고 수정 후 JSON 선택 시 가능한 경우 무료 3안도 다시 계산한다. 무료 규칙으로 구성 불가능한 긴 제목이라도 JSON은 독립 선택할 수 있다. 이후 무료 버튼으로 원래 경로를 다시 사용할 수 있다.

## 스키마 계약

실제 파일은 숫자 schemaVersion 대신 `$schema: "magazine-studio-layout-template/v1-draft"`를 사용한다. 이 식별자를 필수로 검증하고, schemaVersion을 별도로 쓰면 1만 허용한다. 임의의 필드/종류를 조용히 무시하지 않고 해당 디자인을 오류로 표시한다. source/notes 메타데이터는 renderer가 해석하지 않는다.

| 필드 | 요구사항/단위 |
|---|---|
| id, name | 필수. id는 영문 소문자/숫자/하이픈, 이름은 표시 문자열 |
| page.widthMm/heightMm/units | 필수. 유한한 양수 크기, units=mm |
| contentSlots.required | title/subtitle/body 프레임 역할 목록. 제목/본문 내용은 기존 기사 검증 필수, 빈 부제는 빈 프레임 유지 |
| contentSlots.images.min/max | 0~2 정수. 실제 image1/image2 수와 max 일치 |
| elements | 1~50개, 페이지 안의 유한한 frame.x/y/width/height. text/image 높이는 양수, 수평 line 높이는 0 |
| type/role | text: title/subtitle/body/header, image: image1/image2, pageNumber: pageNumber, line: headerRule |
| typography | text/pageNumber 필수. fontFamily/fontStyle, fontSizePt, leadingPt, tracking, alignment |
| alignment | LeftJustified/LeftAlign/RightAlign/CenterAlign. LeftJustified는 마지막 줄 왼쪽인 양끝 정렬 |
| flowGroup/flowOrder | body 필수. group=body, order=1부터 연속 정수. 본문 전체에 동일 typography 필요 |
| image.fit | cover 또는 contain. 중심 배치 |
| image.fillColorRef/cornerRadiusMm | 선택. 색상/반경 검사. 없으면 흰색/0mm |
| line.stroke | 필수. weightPt, colorRef, cap. RoundEndCap/ButtEndCap/ProjectingEndCap |
| colors | #RRGGBB, Color/r48g53b88 형태 RGB, Color/C=10 M=0 Y=0 K=0 형태 CMYK. 숫자 범위 검사 |
| source, notes | 선택 출처/설명. 코드 실행이나 파일 탐색에 사용하지 않음 |

선택 확장: body의 columns(1~6 정수)/columnGap(mm), text/pageNumber의 inset([위,왼쪽,아래,오른쪽] mm), typography.fillColorRef, body typography.spaceBeforeMm/spaceAfterMm, header.text. 원본 3개에는 이 확장 필드가 없으므로 필수로 요구하지 않는다. 제목 등 비본문 다단/비영 문단 간격은 현재 거부한다. INDD 등록/IDML 파서는 구현하지 않는다.

누락값 정책(원본 값으로 주장하지 않음): 헤더 크기=8pt, null/누락 행간=크기×1.2, 글자색=#000000, inset/문단 간격=0, 각 독립 프레임 columns=1/gap=0, bleed=0. Host 첫 baseline은 기존 ASCENT_OFFSET, 위 정렬, 자동 크기 변경 없음, baseline grid 비활성, hyphenation 비활성. 누락 크기/행간은 화면·생성 결과에 경고한다. 원본과 더 정확히 비교하려면 다음 JSON 추출에 이 정보를 포함해야 한다.

## 단위와 색상

공통 PT=72/25.4, mmToPt/ptToMm을 사용한다. Preview px=ptToMm(pt)×화면배율, Host 좌표/inset/gutter에는 mm 문자열, 타입 크기/행간에는 pt 숫자, 장식선 굵기에는 명시적 pt 문자열을 전달한다. 높이 0인 수평선은 중심선 좌표와 cap 확장으로 표시한다. 편집 텍스트/이미지 프레임에는 stroke=None/0을 유지한다.

Host는 JSON CMYK를 CMYK swatch로 보존한다. Preview는 화면용 RGB 근사값을 사용한다. ICC 프로파일/잉크/출력 환경이 없으므로 인쇄 색상 일치를 보장하지 않는다. 라운드 모서리, fitting, 선의 cap은 실제 UXP에서 추가 확인 필요다.

## 폰트

원본 family + 실제 style을 조합해 찾고 현재 설치 상태를 재검사한다. 이름으로 바로 찾지 못하면 기존 세션 캐시의 family/style도 확인한다. 없는 스타일을 합성하거나 임의로 대체하지 않는다. 선택 시 필요한 폰트와 누락 상태를 표시하며 실패해도 원고/무료 디자인은 유지된다.

설정 → 폰트 더보기 → 설치된 Style 선택 → 제목에 적용 / 본문에 적용으로 **선택 중인 JSON plan**의 대체 폰트를 기록한다. 제목 대체는 제목만, 본문 대체는 본문·부제·헤더·페이지 번호를 함께 바꾼다. 개별 5개 역할 편집 UI는 이번 범위가 아니다. 좌표/글자 크기/행간은 그대로다. JSON 디자인 카드를 다시 선택하면 원본 디자인으로 돌아가므로 대체 폰트도 초기화된다. 작업 JSON 저장은 대체 선택을 보존한다.

설정의 직접 폰트 이름 입력은 무료 디자인용이다. JSON에는 목록의 적용 버튼을 사용한다. 다른 PC에서 작업 JSON을 열면 누락을 안내한다. Preview의 CSS family/style 대응은 근사이며 브라우저가 해당 폰트를 사용할 수 없으면 sans-serif로 표시된다. Host 폰트가 설치됐다고 CSS 렌더러에서도 같은 글꼴을 쓴다고 보장하지 않는다.

## 기사/사진/본문 정책

- title/subtitle/body는 원고 원문, header는 JSON text가 있으면 그 값, 없으면 기사 분류(kicker), pageNumber는 새 문서의 페이지 순서.
- 사진 0장: 이미지 프레임/원본 fill/모서리 유지, 사진 없음 안내. Preview에 PHOTO라는 가짜 인쇄 문구를 넣지 않음. 1장: image1에 중심 cover. 2장: 제공 디자인의 max=1을 초과하므로 선택/생성 거부. 조용히 두 번째 사진을 버리지 않음.
- 원본 첫 페이지는 이동/축소/열 수 변경하지 않는다. flowOrder 순으로 body 프레임을 하나의 Story로 연결, 원문 한 번 입력. 원본의 별도 storyId는 참고 정보이고 이번 자동입력에서는 연결한다.
- 후속 페이지는 기존 continuation의 본문 영역/단 수 규칙을 재사용하고 원본 body typography를 유지한다. 이 첫 버전의 JSON 후속 페이지는 **본문만** 배치하며 기존 무료 모드의 헤더/장식/푸터를 섞지 않는다. 216×303에서는 여백 가이드 18mm, 후속 본문 3단, gutter 5mm. 첫 페이지에는 여백 가이드가 프레임을 이동시키지 않는다.
- Preview는 분량 추정으로 페이지/프레임에 원문을 나눈다. Host는 실제 Story.overflows로 페이지 추가/빈 후속 페이지 제거, 최대40장. 첫 페이지의 비어 있는 원본 본문 프레임은 제거하지 않는다.
- **제목/부제 자동 축소 없음.** Layout01/03 부제 높이 4.013mm에 16pt이며 예시 원고처럼 여러 줄이면 잘릴 수 있다. 제목도 51pt/60pt 두 줄이 원본 높이보다 클 수 있다. 검사 오류가 있으면 PDF 차단, INDD 수정용 저장 가능. 이는 원본 좌표를 보존한 결과이며, 자동으로 더 큰 프레임을 만드는 것으로 숨기지 않는다.

## 새 JSON 하나 추가하기

1. 플러그인 폴더의 designs/에 새 JSON을 넣는다. 예: layout-04-new.json (영문 소문자/숫자/하이픈).
2. 파일 안 id를 layout-04-new, name을 화면 표시 이름으로 작성한다. 위 스키마의 필수값과 실제 수치를 사용한다.
3. **designs/manifest.json**의 templates 배열 끝에 쉼표를 넣고 아래 항목을 추가한다. 프로젝트 루트의 UXP manifest.json은 편집하지 않는다.

```json
{"id":"layout-04-new","file":"layout-04-new.json"}
```

4. Studio에서 디자인 JSON 다시 읽기를 누른다. 이는 목록을 새로 읽는 동작이며 현재 선택한 plan을 덮지 않는다. 수정된 디자인을 적용하려면 카드를 다시 선택한다. UDT Reload도 가능하다. 정상 파일은 목록에, 잘못된 파일은 해당 카드에 오류로 표시한다. manifest 자체가 잘못되면 라이브러리 오류만 표시하고 원고/무료 디자인은 계속 동작한다.
5. 선택 → 필요한 폰트 확인/대체 → Preview → 새 문서 → 검사 순으로 검증한다. 지원 역할/색상/조판 범위를 넘어선 새 스키마는 해당 renderer 지원이 추가돼야 하며 자동 무시하지 않는다.

UXP는 localFileSystem.getPluginFolder()의 designs/만 읽는다. 파일마다 검증하며 경로 이동(..)/절대 경로는 거부한다. 브라우저는 fetch로 같은 폴더를 읽으므로 로컬 HTTP 서버로 preview.html을 열어야 한다. 파일 더블클릭(file://)에서는 무료 모드는 유지되지만 브라우저 보안 정책상 JSON 로딩이 차단될 수 있다. UDT에는 웹 서버가 필요 없다.

## 검증과 실기

기존90+추가25=115 Node 테스트 통과. JSON 원본별 좌표/스타일, 동일 plan Preview/Host 전달, 로더, 손상 격리, mm/pt, 명시 폰트 대체, 빈 이미지, 본문 스레드, 작업 저장/복원, 초기화 중복/이전 비동기 결과 차단 검증. Host Mock은 실제 Adobe 조판을 흉내 내지 않는다. 브라우저에서는 JSON 목록/키보드 선택/렌더링을 확인했고 예시 원고 제목/부제가 고정 프레임에서 잘리는 모습도 확인했다. 실제 UXP/INDD/PDF 재현은 미검증이다.

Smoke: UDT Reload → Studio ready [stability-01] [json-design-01] → 예시 원고 → IDML 기반 3개 정상 → Layout01 → 폰트 확인/필요시 대체 → Preview → 새 문서 → 첫 페이지 좌표/글자/선/빈 사진 비교 → Layout02/03도 동일. 장식선 하나는 인쇄되는 것이 의도이며, 텍스트/이미지 사각 테두리는 없어야 한다. 제목/부제 넘침은 검사 메시지와 화면을 기록한다. 첫 비교 이후에만 사진 1장, 긴 본문, 검사/INDD/PDF를 추가 검증한다.

실패 시 전달: 선택 디자인 id, 대체 Family/Style, create.fonts/create.styles/create.json 단계 오류, 문서 검사 결과, Preview와 InDesign 첫 페이지 캡처. API 키/개인 경로는 진단에 넣지 않는다.

공식 API 확인: [GraphicLine](https://developer.adobe.com/indesign/uxp/dom/api/g/graphic-line/), [Rectangle](https://developer.adobe.com/indesign/uxp/dom/api/r/rectangle/), [Path](https://developer.adobe.com/indesign/uxp/dom/api/p/path/), [Justification](https://developer.adobe.com/indesign/uxp/dom/api/j/justification/), [EndCap](https://developer.adobe.com/indesign/uxp/dom/api/e/end-cap/). 문서 확인은 실제 Host 성공의 증거가 아니다.
