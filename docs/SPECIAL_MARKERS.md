# IDML 특수 마커 보존 및 재검증

원본의 Processing Instruction은 `#pi / target / data / tail`로 보존한다. Content 내부 구조는 contentTree, XML 앞뒤는 beforeRoot/afterRoot로 유지한다. `metadata.sourceProcessingInstructions`는 원본 ZIP XML을 Expat로 별도 읽은 위치와 앞뒤 텍스트 증거이며 `sourceXml`에서 다시 만드는 값이 아니다. 추출 모델 버전2, 마커 보존 버전1을 요구한다.

검사 경로: 원본 증거 ↔ XML 모델 ↔ Story projection → 생성 XML의 PI 순서 → Adobe Parent/일반 페이지 Story의 실제 AUTO_PAGE_NUMBER. 원본 바이트가 없던 구형 모델은 재추출이 필요하다. 모든 PI를 보존하지만 알려지지 않은 Story PI의 Host 의미는 성공으로 간주하지 않는다. 문서 aid/XMP PI도 패키지에서 유지한다. 검사 실패는 기존 Fidelity 차단을 유지한다.

## 재등록 도구

1. `tools/extract_design.py SOURCE.idml NEW-model.json`으로 정확한 원본을 재추출한다(출력 덮어쓰기 금지).
2. `tools/reextract-library.js OLD-library NEW-library NEW-model...`로 원본 hash가 같은 모델만 교체한다. 역할/이미지/BODY 순서를 보존하고 새 design ID를 부여한다. 기존 파일과 증거는 유지한다.
3. 승인된 디자이너 수정본은 `tools/register-design-revision.js library model baseDesign page NEW-output --restore-current-page-numbers`로 추가한다. 원본 Parent 번호 Story와 고유 source label로 연결되는 빈 단일 스타일 Story만 복원한다. 프레임/좌표/크기/폰트/숫자를 새로 만들지 않는다.

## 이번 PC 파일과 확인

- 새 Library: `assets/templates/working/registered-pages-26-markers-v2.private.json`
- 번호만 직접 확인할 새 IDML: `assets/templates/working/designer-page-numbers-restored.private.idml`
- 기존25개 및 기존 개인 Library는 별도 보존. 새 디자이너 수정본은 배치 PNG/BODY 혼합 Typography 제한 때문에 전체 제작 미지원이며 번호 확인 파일은 이를 우회한 성공 판정이 아니다.
- UDT Reload → 새 Library 불러오기 → 전체 등록 디자인 일괄 검증 → 전체 페이지 검증 결과 저장. 새 검사에서 실패하면 JSON 하나를 전달한다.
- 별도 IDML을 InDesign에서 열고 일반 페이지와 A/B Parent 하단을 확인한다. 기존 위치/스타일로 자동 번호가 있어야 한다. Parent에서는 문자 표기가 될 수 있으며 고정 숫자가 아니다. 원본에는 저장하지 않는다.

## 범위와 다음 순서

기존25 중20페이지에 A/B Parent가 적용되어 있어 공통 영향을 받는다. 과거 실제8통과/1실패/16미지원 기록은 보존하지만 새 모델의 마커 검증 승인은 전혀 부여하지 않았다. u335e 기존 글/사진 제작 성공도 새 검사의 성공을 뜻하지 않는다.

후속: 배치 PNG의 Fidelity readback 지원 → 혼합 BODY 스타일/언어/override를 보존하는 공통 치환 정책 → 원본 fitting/FillProportionally 배치 및 POINT_TEXT Recompose 실기 검사. 현재 이미지 프레임 geometry 변경이나 글자 축소는 하지 않는다. 새 수정본은 아직 Production Ready가 아니다.
