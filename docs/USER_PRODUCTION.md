# DOCX에서 등록 디자인으로 직접 제작

## 일반 사용자

1. UDT Reload 후 DOCX 불러오기.
2. 자동 추천 카드에서 «이 디자인으로 제작».
3. 생성 결과의 검사 영역 확인 → INDD 저장 → PDF 출력.

디자인 선택은 사용자가 한다. 내부적으로 원본 IDML 생성/검사 → 페이지 정리 보존 대조 → 원본 Fidelity → 콘텐츠 매핑 → 이미지 place/fitting → Recompose → 문서 검사를 수행한다. 실패하면 원고를 쓰거나 PDF 성공으로 처리하지 않는다. CONTENT_OVERFLOW와 원본 SOURCE_OVERFLOW/GENERATOR_MISMATCH는 기존 분리를 유지한다. Auto Fix로 원본 차이를 숨기지 않는다.

템플릿 등록/역할/시각 검증/일괄 검증/JSON은 «개발자 도구 펼치기»에 유지한다. 기존 수동 버튼도 유지한다. 내장 개인 active Library가 없으면 개발자가 한 번 불러온 Library를 UXP data folder에서 복원한다. 두 위치 모두 없으면 등록 안내가 필요하다. 개인 Library나 원본을 Git에 포함하지 않는다.

## 최신 수정본과 보존 정책

기존26버전 Library와 원본 hash/역할/marker restoration을 그대로 복사한 `assets/templates/working/active-library.private.json`을 이 PC에 준비했다. 이전 버전은 일반 추천에서만 revisionOf 관계로 제외하며 개발자 Library에서 삭제하지 않는다. 기존25페이지 증거를 새 버전으로 이전하지 않는다.

- 자동 페이지 번호: 기존 A/B Parent 프레임 및 ACE18 유지. 고정 숫자 없음.
- 이미지: 원본 fitting 정책 우선. FillProportionally 결과는 프레임을 채우는지와 비율을 유지하는지 검사. 원본 geometry 변경 없음.
- POINT_TEXT: subtitle 역할로 치환하며 최신 크기/행간/색상 그대로. Recompose 뒤 넘침은 콘텐츠 오류.
- 혼합 BODY: 원본 스타일/언어 외 속성이 균일하고 문자 종류별 언어 대응이 명확한 경우 지원. 문단별 다른 디자인/강조 스타일을 임의 반복하거나 전체를 평탄화하지 않음. 현재 수정본은 한글/공백/문장부호가 확인됨; 새 영문/숫자 등에 대응 증거가 없으면 unsupported가 나올 수 있음.
- 기존 PNG: parent transform 및 원본 GraphicBounds에서 계산한 bounds, 링크 상태/경로, clipping, 색공간과 색관리, visible/type 검사. 활성 clipping/효과/graphic paint 등 미지원 구조는 차단.

## 현재 실기 제한

수정본 PNG의 원래 UXP 임시 링크 파일이 현재 없다. 외부 파일이 필요한 검증은 EXTERNAL_ASSET_UNAVAILABLE/UNVERIFIED로 명시하며, DOCX 내부 이미지 place와 분리한다. 일반 사용자에게 PNG 경로 입력을 요구하지 않는다. 임의 사진으로 교체하거나 링크 검사를 제외하지 않았다. 따라서 수정본의 End-to-End Adobe 성공을 아직 주장하지 않는다. Source IDML/INDD/DOCX는 변경하지 않았다.

Node291/Python18은 자동/Mock 결과다. 실제 Adobe에서 새 UXP auto-load, 문자 range 언어 적용, PNG transform/readback, page number, 실제 crop, 저장 후 검사와 PDF를 재검증해야 한다. 실패하면 검사 및 출력의 Fidelity 진단 JSON 저장으로 전달한다.

공식 API 근거: [Image](https://developer.adobe.com/indesign/uxp/dom/api/i/image/), [CoordinateSpaces](https://developer.adobe.com/indesign/uxp/dom/api/c/coordinate-spaces/), [EmptyFrameFittingOptions](https://developer.adobe.com/indesign/uxp/dom/api/e/empty-frame-fitting-options/), [Profile](https://developer.adobe.com/indesign/uxp/dom/api/p/profile/). 이 API 확인은 Adobe 실행 검증을 대신하지 않는다.
