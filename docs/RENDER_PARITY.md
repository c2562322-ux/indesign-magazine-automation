# 새 디자인 미리보기 / InDesign / PDF 정합성 검토

최신 lifecycle/폰트 UX/실기 순서는 [STABILITY.md](STABILITY.md)를 참고하세요. 아래는 해당 시점의 감사 기록입니다.

검토일: 2026-09-29. 기준: 03aaa20 이후 개발 브랜치 변경.

사용자 실기 보고: 새 디자인 문서 생성과 PDF 내보내기 성공. PDF의 영역별 사각형 선과 미리보기 차이 관찰. 이번 대화에서 스크린샷 첨부는 접근되지 않았다. sample/magazine-design.indd는 미추적 사용자 결과물이며 읽기 접근도 거부되어 내부 객체를 검사하지 않았다. 파일을 변경하거나 커밋에 포함하지 않았다.

## 데이터 경로

`L.candidates(article, settings)`의 무료 3안 → `state.plans[selected]` → `renderPage`와 `adapter.create(article, samePlan)` → studio.js의 `Host.create` → auto-indesign의 `addPage/textFrame/place` → 생성된 `latest.exportFile(PDF_TYPE, path, true)`.

PDF를 HTML에서 만드는 경로는 없다. 미리보기의 CSS 경계/그림자는 PDF에 전달되지 않는다. PDF는 생성 문서를 출력하므로 객체 속성과 실제 조판이 핵심이다. manifest의 파일 권한 및 studio.js의 파일 선택 경로에는 외관을 변환하는 코드가 없다.

기존부터 geometry는 공유했다. 이번에는 layout-engine의 `typography`, `furniture`, `RENDER`를 두 렌더러가 공통 소비한다. 저장된 plan v1 형식, 무료 3안 계산 전략, 기존 양식 모드는 유지한다. 모든 시각 속성이 JSON에 저장되는 완전한 렌더링 명세로 바뀐 것은 아니다. 공통 기본값은 여전히 코드에 있다.

## 확인된 원인과 수정 범위

- 기존 TextFrame/Rectangle은 strokeWeight=0만 지정하고 strokeColor를 지정하지 않았다. 따라서 기본 선 색상이 남는 경로가 있었다. Mock에서 기본 검정 stroke가 남음을 재현했다. None swatch를 명시하여 선을 제거한다. 두께 0만으로 실제 PDF의 선이 생겼다는 점까지 Mock이 입증하지는 않는다.
- 실제 PDF의 선 종류/원인은 수정 전 문서의 Stroke·문단 테두리 속성과 PDF 비교로 최종 확인해야 한다. PDF 출력 설정이 원인이라고 단정하거나 변경하지 않았다.
- 본문은 2mm 문단 뒤 간격이 Host에만 있었고, UI 제목은 강제 800 굵기와 -0.5px 자간, 고정 폰트를 사용했다. 설정 폰트 변경이 UI에 반영되지 않았다. 제목/본문/메타 색상도 달랐다.
- 헤더/푸터는 8pt지만 Host의 공용 함수가 메타 행간을 1.55배로 덮어썼다. UI는 일반 CSS 기본 행간이었다. 공통 1.4배로 통일했다.
- 문단 스타일 대입만으로는 기존 문자/로컬 override를 명시적으로 지우지 않았다. 새 문서에서만 `applyParagraphStyle(style, true)`와 기본 None 문자 스타일을 적용한다. 문단 테두리/음영, 들여쓰기, 기준선 격자 정렬도 명시적으로 끈다.
- 편집 프레임은 유지한다. 의도된 AUTO_RULE 색상 막대는 별도 role=rule / fill로 유지한다. 기존 파일의 선을 일괄 삭제하는 작업은 없다.

## 값 비교 (수정 후)

scale = 미리보기 지면 너비(px) / plan.settings.width(mm), PT = 72/25.4.

| 항목 | plan / 공통 값 | UI preview 적용 | InDesign 적용 / 남은 한계 |
|---|---|---|---|
| 페이지 크기 | settings.width/height, 기본 210×297mm | 값×scale | pageWidth/Height에 mm 문자열; 기존부터 일치 |
| 여백 | settings.margin, 기본 18mm | 블록 좌표에 반영 | 블록 좌표 + 실제 page.marginPreferences도 명시 |
| x/y, 폭/높이 | 각 element 값(mm) | ×scale 절대 배치 | [y,x,y+h,x+w]mm; 기존부터 일치 |
| 제목 크기 | 각 title.fontSize (무료 기본 선호 36/32/48pt; 긴 제목 조정) | size/PT×scale px | pointSize=size |
| 부제 크기 | 각 subtitle.fontSize (12.5/15pt) | 같은 변환 | pointSize=size |
| 본문 크기 | body.fontSize=settings.bodySize (기본 10.5pt) | 같은 변환 | 연결 Story의 AUTO Body에 적용 |
| 폰트 | settings.titleFont/bodyFont | 지정 이름을 CSS fontFamily로 사용 | installedFont 결과 사용; CSS가 같은 글꼴을 찾는지는 실기 필요 |
| 굵기/스타일 | 선택 폰트 자체 | 고정 800 제거; Family TAB Style 형식의 Bold/Italic 기본 매핑 | 실제 Font.fontStyleName 적용; 임의 스타일/가변 폰트는 정확한 CSS 매핑 보장 안 함 |
| 행간 | typography: 제목×1.3, 부제×1.5, 본문×1.55, meta×1.4 | pt→px 변환 | 같은 pt 값; 첫 baseline 위치는 CSS line box와 다를 수 있음 |
| 자간 | tracking=0 | letterSpacing=0px | tracking=0; 커닝/조판은 서로 다름 |
| 문단 간격 | 본문 뒤 2mm, 나머지 0 | 개행별 요소에 2×scale px | spaceAfter=2mm; 빈 문단/프레임 끝 처리 차이 가능 |
| 정렬 | 왼쪽, 들여쓰기 0 | textAlign=left | LEFT_ALIGN, 들여쓰기/spaceBefore=0 |
| 본문 단 수 | body.columns | 해당 수의 열 요소 | textColumnCount; 고정 단폭 해제 |
| 단 간격 | RENDER.gutter=5mm | 열 폭/좌표 계산 | textColumnGutter=5mm |
| 제목/부제/본문 프레임 높이 | element.height | 같은 높이, 넘치는 내용 숨김 | 같은 높이, 자동크기 OFF; 넘침은 검사 오류 |
| 이미지 위치/크기 | image element 값 | 같은 값, 사진 있으면 투명 배경 | 같은 rectangle bounds, fill=None |
| 이미지 fitting | cover / center | object-fit:cover, object-position:center | FILL_PROPORTIONALLY → CENTER_CONTENT; 실제 사진 방향/크롭 실기 필요 |
| header/footer | furniture 공통 geometry/내용, 8pt | 공통 함수 소비 | 공통 함수 소비; footer 공백도 통일 |
| stroke/fill | 편집 프레임 선/채움 없음; rule만 accent fill | 텍스트 border 없음; rule 별도 | strokeColor=None + weight=0, fill=None; rule fill 유지 |
| 텍스트 색 | ink #1D2126, muted #5F6367 | 공통 hex | 공통 RGB swatch; PDF 색상 변환 차이 가능 |
| 줄바꿈/페이지 | 원문과 예상 capacity | 예상 페이지별 글자 수 및 단별 균등 분할 | 실제 연결 Story 조판/넘침으로 페이지 증감; 아직 정확히 같지 않음 |

이미지 fitting과 pt/mm 변환은 원래 의도가 일치했다. 문제라고 가정하여 다른 방식으로 바꾸지 않았다. 미리보기 본문을 InDesign과 동일하게 흐르게 만드는 조판 엔진은 이번 최소 수정에 포함하지 않았다. 이미지 placeholder는 최종 출력 디자인이 아니며, 실제 사진이 로드된 경우로 비교해야 한다.

## 자동 검증

기존 50개 + 새 6개 = 56개 통과. 추가 Host 3개 / DOM 3개: 기본 stroke 제거와 의도된 rule 유지, 3안·사진 2장·비기본 판형의 Host geometry, typography와 override 제거, 실제 선택 plan 전달 및 preview geometry/pt 변환, meta/문단 간격, preview 사진 fitting. 수정 전 렌더러를 메모리에서 읽어 새 회귀 테스트 실패를 확인했으며 checkout/reset으로 파일을 되돌리지 않았다.

Node/Mock/DOM 값 전달 검증이다. 실제 Adobe 렌더링, UXP CSS 지원, 설치 폰트 매칭, PDF 픽셀 비교를 검증한 것은 아니다.

## 다음 실기 비교

1. 이전 원고·설정·사진·선택 무료 시안을 기록하거나 원고·시안 JSON으로 저장한다. 이전 PDF는 비교용으로 유지한다.
2. UDT Reload 후 같은 원고/설정/사진을 불러와 같은 무료 시안 번호를 선택한다. 미리보기 전체 첫 페이지를 캡처한다.
3. **새 문서 만들기**를 누른다. 기존 생성 문서를 다시 출력하는 것만으로는 수정이 적용되지 않는다.
4. InDesign 첫 페이지에서 제목·부제·본문·사진 프레임의 위치/폭/높이, 글자 크기/폰트/행간, 단 수/5mm 간격을 확인한다. 편집용 프레임 가장자리는 보일 수 있다. 선택 해제 후 Preview 화면 모드에서도 사각형 선이 남는지 비교한다.
5. **문서 검사 → INDD 저장(새 이름) → PDF 내보내기(새 이름)**. 우선 재단선/페이지 정보 등 인쇄 마크를 끄고 동일한 출력 프리셋으로 비교한다.
6. PDF를 별도 뷰어에서 열어 100%와 확대 상태 모두 확인한다. 영역별 사각형은 없어야 하고, 헤더 아래 의도된 강조색 가로 막대는 남아야 한다.
7. 미리보기/InDesign/PDF 첫 페이지를 같은 지면 너비로 나란히 비교한다. 페이지 외곽 대비 프레임 위치와 크기, 제목·부제 글자 크기, 사진 크롭 중심을 본다. InDesign과 PDF가 다르면 폰트 포함/색상 프로파일/출력 옵션도 기록한다.
8. 세 무료 시안과 사진 0장/1장/2장으로 반복한다. 특히 긴 본문은 줄바꿈·열 마지막 문장·페이지 수의 차이를 기록한다. 이런 조판 차이는 이번 수정만으로 해결 완료 처리하지 않는다.

실패 시: 시안 번호, 판형/여백/폰트 이름/본문 크기, 앱·UDT 버전, 미리보기+InDesign 첫 페이지+PDF 캡처, 패널 단계별 오류를 전달한다. 선이 남으면 문제 TextFrame 선택 후 Stroke 색상/두께 및 Paragraph Border 상태 캡처도 도움이 된다. 키·개인 경로·비공개 원고는 가린다.

## 공식 API 근거

- [TextFrame: strokeColor와 strokeWeight는 별도 속성](https://developer.adobe.com/indesign/uxp/dom/api/t/text-frame/)
- [Text: applyParagraphStyle의 clearingOverrides](https://developer.adobe.com/indesign/uxp/dom/api/t/text/)
- [ParagraphStyle: fontStyle, tracking, paragraphBorderOn](https://developer.adobe.com/indesign/uxp/dom/api/p/paragraph-style/)
- [TextFramePreference: baseline, columns, vertical alignment](https://developer.adobe.com/indesign/uxp/dom/api/t/text-frame-preference/)
- [FitOptions](https://developer.adobe.com/indesign/uxp/dom/api/f/fit-options/)
