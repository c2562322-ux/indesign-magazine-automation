# 실제 Adobe batch 공통 readback 수정 — 2026-10-01

- 실제25페이지 결과: 통과3 / Fidelity실패6 / 미지원16, 역할확인15(중복). baseline155차이는 path120 / paragraph origin enum21 / 특수문자12 / 색상공간2. 전체페이지 표와 공통 원인: docs/REGISTERED_BATCH_ANALYSIS.md.
- 공통 snapshot path를 page-relative로 정규화(Bezier 포함), shading/border top/bottom native enum 비교, Character SpecialCharacters→Unicode, HSB→동등RGB 비교 지원. unknown/실제 차이 차단, tolerance/Auto Fix/생성 디자인 불변.
- 색상2건은 HSB 추론이며 실제 raw space 없으므로 확정/통과 주장 금지. enum read 실패 뒤 숨겨진 추가 mismatch 가능. 미지원16페이지 제한 유지.
- Node273/Python16 통과. 기존 u335e 실제 사용자 제작 성공과 별개로 이번 수정은 Adobe 재검증 필요. 원본/개인 파일 변경 없음.
- NEXT STEP: UDT Reload → 기존 DOCX/25페이지 Library → 전체 등록 디자인 일괄 검증 → 전체 페이지 검증 결과 저장. JSON 하나로 전체 재검증, 개별페이지 반복 불필요.

---

# 등록 Library 일괄 원본 검증 — 2026-10-01

- 개발자 버튼 전체 등록 디자인 일괄 검증: 로드한 Library 전체를 순차 검사. 기존 selectForProof/generate/createRegistered proof 경로 재사용, 페이지별 하드코딩 없음. 원고 교체/Auto Fix/PDF 실행 없음.
- capability fidelityReasons가 있는 페이지는 UNSUPPORTED+전체 사유 저장, Host 생성을 강행하지 않음. ROLE_MAPPING_REQUIRED라도 정적 Fidelity 지원이면 proof 실행. 한 페이지의 thrown DOM 오류나 Studio에서 null 반환된 실패 모두 기록하고 다음 페이지 진행.
- 전체 재실행은 이전 성공/실패 캐시를 건너뛰지 않고 새 run. 중지는 현재 작업 완료 후 적용, 나머지 NOT_RUN. 새 Library import는 이전 batch를 분리/초기화. 결과는 기존 전체 페이지 검증 결과 저장에서 JSON 하나로 저장(기존 write/readback 검증 사용).
- JSON: run 시간/host/중지여부, 전체/Adobe통과/Mock통과/역할확인/미지원/실패/미실행 수, sourceHash+pageIds별 상태, structured host failure 원문(operation/object/sourceId/property/Adobe message/code/Page/Spread), 모든 report/diagnostic/differences, 오류유형별 pageCount 및 source/page 목록. 역할확인 수는 실행 결과와 겹칠 수 있음.
- u3d6 Group u7e7e fillColor 혼합값 오류는 historicalIssues 첫 항목 USER_REPORTED_PREVIOUS_RUN_NOT_CURRENT_RESULT로 포함. 수정 전 사용자 실기 이력이며 현재 실패 개수에 더하지 않음. 이번 재현 여부는 current reports/groups만으로 판단.
- 생성된 검증 문서는 자동 저장/닫기하지 않음. 기존 실패 cleanup은 기존 새문서 처리 정책 유지. batch 전에 다른 원고 작업을 마치고 실행, 완료 후 필요한 문서를 확인. batch는 Production Ready를 부여하거나 육안 비교를 승인하지 않음.
- Node268/Python16 통과. 25개 synthetic UI batch에서 throw/null 실패2건 후 계속, unsupported skip, 역할미확정 proof 실행, 동일 오류2페이지 그룹화, 전체 재실행, cancellation partial JSON 및 Mock의 Adobe통과 집계 금지 검증. 실제 Adobe25페이지 batch 미실행.
- NEXT STEP: UDT Reload → DOCX/25페이지 Library 한 번 로드 → 개발자 전체 등록 디자인 일괄 검증 → 완료 후 전체 페이지 검증 결과 저장. 저장대화상자에서 registered-page-verification.private.json 저장 후 그 파일 하나 전달. 실패페이지별 수동 반복 불필요. 저장 전 Reload 금지(세션 결과 초기화).

---

# u3d6 Group 혼합 paint snapshot 수정 — 2026-10-01

- 실제 사용자 오류: Group u7e7e / Page u3d6 / Spread u3ce / registered.snapshot.read.fillColor / 여러 그래픽 값. 이미지 개수 제한과 무관.
- 원본 effective paint 확인: 자식 Rectangle u7de9 FillColor=Color/C=10 M=0 Y=0 K=0, TextFrame u7e2f FillColor=Swatch/None. 양쪽 Stroke=None/weight0. 그룹 자체 단일 fill read를 요구한 것이 원인. Adobe Group 및 PageItems DOM 근거: https://developer.adobe.com/indesign/uxp/dom/api/g/group/ ; https://developer.adobe.com/indesign/uxp/dom/api/p/page-items/ .
- 공통 Group snapshot 분기: aggregate fill/stroke/tint/overprint/fitting/paths/allGraphics scalar 읽기 대신 CHILD_OBJECTS 관계로 자식 source IDs를 보관. 실제 paint/fitting/path/graphics는 자식의 기존 엄격 snapshot 및 Original→Generated 비교로 검사. NOT_APPLICABLE 일괄 치환/예외 무시 없음.
- Group 자신의 bounds/rotation/shear/visible/locked/layer/objectStyle/parent/textWrap/blending 효과는 계속 읽음. 자식 ID 없는 경우, 누락 snapshot, 부모 연결 불일치는 차단. 자식 순서는 before/after 비교. 이미지 배치/placeholder 숨김 때 자식 변화가 Group aggregate에 중복 기록되어 오판하지 않도록 관계만 저장.
- source Group의 직접 자식 구성과 parent, 명시적 visible/locked를 원본 대조. Group 자체 미지원 source effects가 있으면 명시적 UNSUPPORTED mismatch. 기존 페이지 귀속/공유/중첩 관련 지원 제한을 임의로 해제하지 않음.
- Mock은 이전에 실제 Group mixed getter를 구현하지 않았고 일부 그림 fixture는 부모 Group 자체를 누락했다. fixture에 실제 parent Group 구조를 추가하고 mixed aggregate getters를 모두 throw하도록 회귀 추가. 자식 tint/overprint/stroke drift, Group opacity/order drift, 자식 누락 및 자식 필수 getter 실패를 검출함. 기존 IMAGE1..N/placeholder/u335e 테스트 유지.
- 전체 Node266/Python16 통과. Adobe u3d6 Fidelity 통과는 미확인, 실기 검증 필요. 원본/개인 파일 변경 없음.
- NEXT STEP: Reload → 기존3사진 DOCX → 동일 Library → original/u3d6 선택 → 검증용 문서 생성. beforeCleanup.success → cleanup.success → fidelity.start/결과까지 확인. 원본 자동/육안 비교 통과 후에만 제작. 실패 시 새 진단JSON과 operation/object/property 전달.

---

# 이미지 전역 개수 제한 제거 — 2026-10-01

- DOCX 추출32장, 공통 article/parseArticle/별도사진 추가2장 제한 제거. 등록 이미지 역할 편집도 현재 페이지 프레임/기존 IMAGE ordinals에 맞춰 동적 구성. registered-native와 binding의 imageN 숫자 인덱스/배열은 기존 공통 구현 유지.
- parseArticle DOCX도 docx-media 경유: 모든 지원되는 사용 이미지와 dimensions/order/occurrences 보존. 별도 사진은 뒤에 추가. Browser preview 의존성 순서 조정.
- 이미지 개수에 따른 truncate 없음. 파일/총 추출 byte 용량32MB 및 ZIP 보안 검사는 유지하고 초과 시 전체 실패(부분 성공 금지). 지원 범위는 본문 DrawingML PNG/JPEG. 장식/배경·외부링크·미지원 포맷은 기존 경고 유지, 동일 미디어 중복 사용은 occurrences에 전부 기록하고 이미지 asset은 한 번 추출. 모든 포맷/헤더푸터 지원을 의미하지 않는다.
- 디자인별 IMAGE 슬롯 수와 required/optional 정책은 그대로. 사진을 버리거나 슬롯을 신설하지 않음. 기존 JSON 디자인의 슬롯 max는 전역 상한이 아닌 개별 디자인 제약으로 유지. 기존 무료 시안의 DOCX3장 이상 등록추천 안내도 데이터 개수 제한이 아님.
- 사진1/2/3/4/40장 synthetic DOCX를 각각 추출→Article Profile→충분한 슬롯의 추천→selection→native mock production→검사까지 검증. 모든 imageN path 순서/마지막 ordinal 확인. 슬롯 하나 부족할 때 EXTRA_IMAGES 및 선택 차단 확인. Native Mock용 PNG metadata fixture이며 Adobe 실행 결과 아님.
- 실제 Library: 사진1장 u335e 제작 성공은 기존 사용자 실기. 2슬롯 original/uad7은 역할/공유지면 확인 필요; 3슬롯 original/u3d6은 실기 검증 필요;4+ 확정 슬롯0. 사진4장 이상의 실제 제작 성공은 아직 없음.
- 데이터는 article.images 배열, 순서/문단위치, pageIds, Story binding 및 IMAGE ordinals 사용. 이후 여러 페이지 조합에 특정 사진 개수 상한을 추가하지 않음. 여러 페이지 디자인 자동 조합 자체는 이번 범위 밖이며 구현/검증했다고 주장하지 않음.
- Node265/Python16 전체 통과. 기존2장 제한 테스트는 사용자 요구에 맞춰3장 보존+잘못된 배열 거부로 변경했으며 geometry/원본 Fidelity/placeholder 테스트 유지.
- NEXT STEP: Reload → 사진1/2/3/4+ DOCX 각각 불러오기 → 추출 수 확인 → 등록 디자인 추천 → 슬롯부족 이유 확인. u335e는1사진으로 기존 제작 회귀; u3d6은3사진으로 원본 검증 후 제작.4+는 실제 확정슬롯이 충분한 디자인이 생기기 전까지 불일치가 정상.

---

# IMAGE placeholder 제작 시 숨김 — 2026-09-30

- 사용자 실제 Adobe: u335e DOCX 제목/부제/본문/내부 이미지 삽입 성공. 이 결과는 사용자 실기이며 이번 placeholder 수정은 아직 Adobe 미검증.
- 원본 모델 확인: u7dba / Story u7dbd 안내 텍스트는 IMAGE1 u7c78 안에 완전히 포함된 단독 프레임. 다른 확정 역할/캡션 없음. 페이지 ID별 삭제 규칙 없음.
- 공통 imagePlaceholders 관계 추론: 명확한 이미지 안내 라벨 + 미지정 보존 객체 + 단독 Story + 동일 페이지의 유일한 확정 빈 IMAGE 프레임 내부 + 작은 안내 영역. 명시적 role/캡션, 공유 Story, 모호한 다중 containment, 슬롯 밖 텍스트는 유지.
- proof와 원본은 유지. production에서 image place 후 그래픽1개/정확한 링크 확인 → 관계가 있는 안내 TextFrame.visible=false → readback. 객체 삭제/문구 제거/geometry/style 변경 없음. Adobe DOM 근거: https://developer.adobe.com/indesign/uxp/omv/t/TextFrame/ (Boolean visible).
- preservation는 해당 관계의 의도된 visible=false만 기대값에 반영. 실제 visible, 위치/스타일/Story/쌓임순서 등 나머지는 계속 검사. 숨김 실패/이미지 place 실패는 차단, 실패 무시 없음.
- Node263/Python16 통과. 새 회귀: proof 유지, 생산 후 안내 숨김/원문 유지, 이미지 실패 시 안내 유지, 캡션/슬롯밖 텍스트 제외, 숨김 취소/geometry 변경 차단.
- NEXT STEP: Reload → 기존 성공 DOCX/Library → u335e 선택 → 검증용 문서 생성(안내 유지) → 원본과 비교 완료 → 선택 디자인 제작(사진 위 안내 숨김) → 검사 → INDD/PDF 확인. 실패 시 registered.content.placeholder.hide 또는 preservation differences 포함 진단 JSON 저장.

---

# 등록 디자인 실제 제작 연결 보강 — 2026-09-30

- 원본 검증 문서는 proofOnly로 샘플 콘텐츠 유지, PDF 금지. 일반 제작 버튼은 mode=production으로 별도 IDML 문서를 열고 원본 자동 Fidelity 통과 후 TITLE/SUBTITLE/BODY/IMAGE를 교체한다. 이 기존 경로를 재사용했으며 추천 엔진/원본 모델/페이지 geometry는 변경하지 않았다.
- 새 제작 보고서 fidelity.contentApplied에 역할/객체ID/교체 글자수/이미지 배치 메타데이터를 포함하고 패널에 교체 역할을 표시한다. 실제 Story 내용/typography/direct override/KEEP/geometry/링크/fitting 비교가 계속 출력 gate다.
- 사진 비율 불일치 crop/여백 확인 및 배치 bounds 기준 추정150ppi 미만 경고 추가. 경고는 warnings에만 추가하며 기존 Fidelity 오류는 모두 유지한다. 실제 배치 geometry를 변경하거나 fit 정책을 새로 만들지 않는다.
- 원고에 caption이 없으면 확정 CAPTION도 원본 유지. caption이 있으면 기존 Story 교체/보존 검사 사용.
- Adobe Host에서 육안 승인 후 CONTENT_APPLIED, 오류0, outputReady=true를 확인한 템플릿만 같은 패널 세션의 다음 원고에서 수동 proof를 생략할 수 있다. 원본 모델 객체와 descriptor 동일성 확인, import/역할변경/실패 시 승인 폐기. Mock 또는 저장 JSON의 productionReady 필드는 승인 불가. 매 제작의 자동 원본 Fidelity 검사는 유지.
- 승인 영속 저장은 구현하지 않았다. Reload/재시작 시 다시 검증해야 한다. 세션 간 재사용은 향후 Host/폰트/원본/엔진 버전까지 검증하는 신뢰 저장이 필요하다.
- Desktop magazine-fidelity.private.json은 createdAt 2026-09-30T07:52:07.365Z, KerningMethod 766건이며 제작 후 preservation 오류 없음. 최신 고정객체 진단 경로 요청했으나 아직 미수신. 이 오류의 원인이나 해결을 추측/주장하지 않는다. 실제 End-to-End 완료는 새 Adobe 제작 검사 결과 대기.
- 테스트 Node262/Python16. 새3: Adobe 성공 후 다음 원고 바로 제작(반대로 Mock/import 재승인 차단), crop/저해상도 경고에도 geometry mismatch 차단 유지, 원고 caption 유무별 보존. 기존 다중BODY/IMAGE1..10/DOCX UXP 파일 쓰기/검사/INDD/PDF 테스트 유지.
- NEXT STEP: 아래 PC 순서로 검증 및 제작. 오류 시 제작 직후 Fidelity 진단 JSON 저장, 전체 오류와 contentApplied 확인. 제작 전 proof JSON으로는 제작 후 오류를 진단할 수 없다.

## PC 최소 순서

1. UDT Reload → registered-smoke.docx(사진1장) → 기존25페이지 Library 불러오기 → 등록 디자인에서 추천 → 시작 메인 · 사진1장 선택. 사진4장 원고는1슬롯 지면에 사용 불가; 사진을 몰래 누락하지 않는다.
2. 첫 세션: 개발자 검증용 문서 생성 → 자동 Fidelity/원본 육안 비교 → 원본과 비교 완료. 이 문서에 원본 샘플이 보이는 것은 정상.
3. 일반 제작 영역의 선택한 등록 디자인으로 제작. 새 문서의 제목/부제/본문이 DOCX 원문이고 이미지 프레임에 실제 사진이 들어갔는지 확인. 패널 CONTENT_APPLIED 및 교체 역할 확인.
4. 문서 검사 → 오류0 확인 → INDD 저장 → PDF 내보내기. 넘침이면 CONTENT_OVERFLOW로 처리하고 글자/프레임 자동 변경 없이 중단. 고정객체 오류가 있으면 PDF 차단 유지, Fidelity 진단 JSON 저장.
5. 제작 검사까지 통과한 동일 템플릿의 다음 원고: DOCX → 추천 → 선택 → 제작. 같은 세션에서는 별도 수동 proof 불필요. 자동 원본 검사와 새 원고 검사는 계속 수행.

Adobe에서 새 이미지/고정객체 보존/overflow/INDD/PDF 성공은 아직 미확인이다. 이번 자동 테스트 성공은 실제 출력 성공 증거가 아니다.

---

# 25페이지 추천·역할 재검토 — 2026-09-30

- 기존 미커밋3파일 보존 후 진행. 역할완료9→10 / 확인16→15. 신규 private Library: assets/templates/working/registered-pages-25-reviewed.private.json. 원본 모델/INDD/IDML 수정 없음.
- 상세25페이지 표/원인/수용량 정책/PC 순서: docs/REGISTERED_RECOMMENDATION_REVIEW.md. IMAGE0/1/2/3/4+ = 19/3/1/2/0. 확정4사진 지면 없음. 공유 프레임/장식/설명그림을 억지 교체 슬롯으로 지정하지 않음.
- 수용량 원본 Story 관측값 추가, 추정 상한보다 원문이 긴 단독 프레임은 추정 미보정 검토로 분류. 상한/원본 디자인/Fidelity 판정 불변. UI 추천3/검토3 이하, 나머지 접힘; 내부25전체 평가 유지.
- 실제 테스트원고.docx는 Desktop/Downloads 모두 미발견(Downloads 샌드박스 밖에서도 확인). 실제 문단/이미지 크기 미측정. 보고된 문자수 기반 합성 조건 결과0/14/11은 실제 DOCX 결과 아님.
- Node259/Python16 통과. actual Adobe Fidelity1은 기존 사용자 u335e 보고, 새 실기 성공 주장 없음. Production Ready0.
- NEXT STEP: UDT Reload → 실제 DOCX → reviewed private Library → 추천/접힌 이유 확인. DOCX가 현재 작업 환경에 제공되면 실제 문단/이미지 프로필로 재평가. 파일 미확보가 남아 있어 실제 원고 재평가는 미완료.

---

# 기존 25페이지 공통 등록/추천/검증 연결 — 2026-09-30

- 재개 HEAD 6f71f8dc8572ba3bafa6b3989123d40e0a848cb9. 미커밋 design-matching/design-registration/registered-native 변경 보존 후 완성. 새 원본/샘플 디자인 생성 없음.
- 개인 결과 파일: assets/templates/working/registered-pages-25.private.json (약15MB, source models2 + descriptors25). 한 번 불러오면25페이지 전체 DOCX 평가. 원본 모델/INDD/IDML/기존 reference.review는 읽기만 수행. 새 산출물은 ignored, Git 미포함.
- 표: docs/REGISTERED_PAGE_STATUS.md. 총25 / 역할확인16 / 매핑9 / Fidelity 정적검증가능9(빈지면1 포함) / 매핑+검증준비8 / Unsupported16. 역할확인과Unsupported 중복. 실제 Fidelity 완료1은 사용자 보고 original/u335e; 나머지24 실기 미검증. Production Ready0 (u335e 이미지/제작 후 고정객체 오류 미확정).
- 공통 autoDraft: 제목/본문/부제/명시적 이미지 자리표시/캡션 규칙과 confidence, 나머지 원본 유지. 별도 source/page 하드코딩 없음. 기존 u335e 확정 descriptor 유지. Capability에는 공유 페이지객체, 고정graphic/effects readback 및 혼합Typography 제한 기록.
- 다중 BODY: 명시적 bodyFlow 유효성 확인, 원본 글분량 비율로 연속 분배. CRLF/Unicode 문자 보존, 누락/중복 방지. 프레임/Story/스타일 변경 없음. IMAGE1..N은 전체 숫자 인덱스로 바인딩/배치. 실제 IMAGE10까지 Mock 회귀. Group 귀속은 모든 직접 자식이 한 선택페이지에 확실히 속할 때만 유지 허용; 공유 지면은 여전히 차단.
- 검증용 proof는 역할 미완료 페이지도 원본 검사 가능하되 제작은 역할/Fidelity/육안확인 gate 유지. 개발자 전체 페이지 선택/다음 미검증 디자인 검증/전체 검증 결과 저장 추가. 다음 버튼은 미시도+정적지원 페이지1개씩 실행, 반복 import 불필요. 실패는 목록에서 재시도. 상태는 source/page ID별 세션에만 보관; 파일이 스스로 Production Ready 승인하지 못함. 실제 Host CONTENT_APPLIED+오류0+outputReady일 때만 Production Ready.
- 전체 실패는 property/path + expected/actual + object type + cause로 그룹화. 원본/recheck 중복 제거, 전체 원문 보고서 보존. 새 batch JSON은 UTF8 write→readback 일치 및 Reload guard 후 저장완료.
- u335e 고정 객체 오류: 실제 최신 JSON 미수신. 메시지 slash가 경로 redaction으로 가려지는 표시 문제만 고침, preservation differences/operation을 구조화. 실제 mismatch 무시/Auto Fix 없음. DOCX 이미지 place/링크/수/geometry/fitting 검사 유지, 실제 배치 성공 미확정.
- 검증: Node255/Python16 전체 통과. 실제25파일 unpack 오류0, 전체25 추천평가, 지원9페이지 IDML 패키지 생성/검증 성공(Adobe open 아님), 역할준비8 콘텐츠 binding 성공. Adobe 미검증을 성공으로 보고하지 않음.
- NEXT STEP: Reload → DOCX → registered-pages-25.private.json 한 번 불러오기 → 추천 또는 개발자 다음 미검증 디자인 검증. 각 성공본 육안비교 후 제작/검사. Reload 전 전체 페이지 검증 결과 저장. u335e는 제작 직후 Fidelity 진단 JSON과 이미지 슬롯 화면 전달 필요.

---

# 최신 766 differences 전체 분석/공통 정규화 — 2026-09-30

- 입력: 개인 진단 createdAt 2026-09-30T07:52:07.365Z. 전체 comparison differences 766, recheck 중복 별도 합산하지 않음. 모두 $.runs.*.KerningMethod / Metrics → 메트릭. 객체별 TITLE u7c7e=13, KEEP u7dba=5, BODY u7c96=721, SUBTITLE u7caf=27. 공통 원인1(locale canonicalization), 다른 geometry/typography/생성기 mismatch 없음. 이전 언어45건 해소.
- 기존 최초/recheck는 동일 diagnostics를 사용했다. 경로 누락으로 단정할 수 없음. 이전 canonicalPair는 translateKeyString('$ID/Metrics')가 정확히 localized string을 반환할 때만 변환하므로 Host에서 그 조건이 성립하지 않으면 그대로 차단. JSON에는 native 번역 함수 반환값이 없으므로 실제 반환 타입/문자열은 미확정.
- registered-fidelity 공통 compare 경계 도입: 속성명이 KerningMethod/kerningMethod인 경우에만 정확한 Adobe 의미 키로 변환. Adobe 공식 한국어 문서와 실제 Host로 확인된 Metrics/메트릭, Optical/광학 대응. 다른 locale은 findKeyStrings의 유일한 알려진 키 또는 translateKeyString의 유일한 정확한 대응 사용. 모호/미상/로마자 전용/수동/숫자값은 합치지 않음. 언어 untranslatedName 유지. 임의 font/style/text 이름 번역 없음.
- 원본 대조/재검사 records, direct overrides, 콘텐츠 교체 후 typography/override 비교가 공통 계층 사용. Snapshot은 같은 Host의 geometry/paint/reference 등이며 커닝 값을 수집하지 않음; 기존 엄격 비교 유지. raw original/generated 값은 보존, 비교 피연산자만 정규화. 원본/허용오차/Fidelity gate/Auto Fix 변경 없음.
- 실제 개인 JSON 전체 OFFLINE_REPLAY: 766 → 0 differences, 객체4 모두 잔여0. Adobe 재실행 결과가 아니며 실기 재검증 필요. 원본/개인 파일 수정·커밋 없음.
- Node244/Python16 통과. 신규3: 766건 전체 패턴 재현 및 실제 font/size/leading/tracking/geometry 구분, 번역 미해결 Host의 proof/recheck/post-content 일관성, 다른 locale 키 및 모호/로마자 전용 구분. 기존 번역 부재 테스트는 공식 대응값 정규화 기대값으로 갱신, 미상값/Host 예외 차단은 유지.
- NEXT STEP: UDT Reload → registered-smoke.docx → e2e-reference.review.json → 추천 → 시작 메인 · 사진 1장 선택 → 검증용 문서 생성. Fidelity 결과 확인; 실패하면 새 JSON 전달. 통과 후 육안 비교/원본과 비교 완료 → 선택 디자인 제작 → 검사. 실제 제작/출력 성공을 이번 오프라인 재비교로 확정하지 않음.
- 근거: https://helpx.adobe.com/kr/indesign/desktop/format-and-style-text/tabs-indents-and-spacing/about-kerning-and-tracking.html 및 https://developer.adobe.com/indesign/uxp/dom/api/a/application/.

---

# Locale false positive 수정 — 실기 재검증 필요 (2026-09-30)

- 사용자 실제 Host 보고: 811 differences 중 Metrics/메트릭 및 Korean/한국어 반복. 최신811 전체 JSON 미수신으로 다른 종류/잔여 개수는 확정하지 않음.
- 원인: resolved KerningMethod와 direct override가 $ID/ 제거 후 raw string 비교, AppliedLanguage는 localized name 비교. 문자별 검사에서 반복 증폭.
- 등록 Fidelity 경로에 한정한 canonicalPair: KerningMethod는 Adobe app.translateKeyString('$ID/'+원본키)와 실제 Host 값의 정확한 대응이 확인될 때만 원본키로 정규화. 언어는 Language/LanguageWithVendors.untranslatedName 사용. 임의 폰트명/스타일명/다른 문자열 번역 금지. 번역 불명은 불일치 유지, Host 예외는 기존 차단.
- Model.compare 허용오차/제작 gate/Auto Fix 정책/원본 디자인 변경 없음. 현재 locale에서 동일하게 읽은 콘텐츠 교체 전후 snapshot 비교도 유지.
- 진단 JSON differenceSummary에 문자 인덱스를 묶은 분류/속성별 잔여 차이 개수 추가. comparisons 및 모든 differences 보존. 811을 자동으로 해결됐다고 선언하지 않음.
- Node241/Python16 통과. 신규3: 커닝/언어 canonical 및 실제 차이 차단, localized resolved+direct 제작 경로, 잔여차이 집계와 원본 evidence 보존.
- NEXT STEP: UDT Reload → 기존 Smoke DOCX/등록파일 → 추천/기준 선택 → 검증용 문서 생성 → 결과 확인. 실패하면 새 진단 JSON 전달(잔여차이 분석용). 통과 후 육안 비교/비교 완료 → 제작 → 검사. Adobe 통과 자동 처리 없음.
- API 근거: https://developer.adobe.com/indesign/uxp/dom/api/a/application/ (translateKeyString), https://developer.adobe.com/indesign/uxp/dom/api/l/language/ 및 language-with-vendors/ (untranslatedName).

---

# 실제 Host JSON 기반 Fidelity readback 수정 — 2026-09-30

- 실제 magazine-fidelity.private.json 분석: 오류6 = 집계 차단1 + 객체5. u7c78 FillColor.space expected CMYK / actual undefined, 채널 [10,0,0,0] 및 bounds/crop 동일. u7c7e(TITLE), u7dba(KEEP), u7c96(BODY), u7caf(SUBTITLE)는 모두 readback supported / UNSUPPORTED direct override 비교: FontStyle. 실제 폰트 불일치 값이 아니라 readback 차단이다. 해당6건에 NOT_APPLICABLE로 바꿀 항목 없음.
- ColorSpace는 native enum의 Object.keys 열거에 의존하지 않고 명시적 CMYK/RGB/LAB/MIXEDINK 상수와 비교. 알 수 없는 공간은 차단, 채널 수로 추정하지 않음.
- plural Characters.itemByRange 대신 모든 scalar Character.item(index)를 읽는다. 중간 문자와 CR도 전부 typography/direct override/color/text 비교. 원본/생성값 비교 및 허용오차 변경 없음. 이전 Mock은 plural도 scalar 값을 반환해 Host 차이를 검출하지 못했다.
- 원인 범위: JSON은 native FontStyle의 실제 타입/값을 보존하지 못한 readback 실패 기록이다. plural 반환/enum 열거 의존을 제거했지만 이것만으로 Adobe의 전체 Fidelity 통과를 확정하지 않는다. 다음 실제 검사에서 추가로 드러나는 차이는 그대로 차단한다.
- 기존 콘텐츠 경로 유지·회귀 확인: Fidelity 재검사 → TITLE/SUBTITLE/BODY 교체 및 원본 스타일/direct override 복원 → 내부 이미지 파일 IMAGE place/원본 fitting → recompose → 콘텐츠 검사 → 기존 INDD/PDF. KEEP/geometry/색상/원본 overflow 차단 및 콘텐츠 overflow 분리 유지. Auto Fix 없음.
- 기준 시작 메인 · 사진 1장 / u335e. 개인 원본과 DOCX/진단 파일 수정·커밋 없음. Node238/Python16 통과. Adobe 콘텐츠 제작/이미지 crop/출력은 아직 미검증.
- NEXT STEP: UDT Reload → registered-smoke.docx → e2e-reference.review.json → 등록 디자인에서 추천 → 시작 메인 · 사진 1장 분석 후보로 선택 → 검증용 문서 생성. Fidelity 통과 시 원본과 육안 비교 후 원본과 비교 완료 → 선택 디자인으로 제작 → 문서 검사 → INDD 저장 → PDF 내보내기. 실패 시 진단 JSON 전달, 강제 통과 금지.

---

# Fidelity 진단 JSON 저장 완료 — 2026-09-30

- 개발 브랜치 codex/magazine-studio-1.1, 재개 HEAD dd0c7eca1892b758e3cf8370e2c074325ea2e1a1. 기존 미커밋 UI/진단/4슬롯 회귀 작업 모두 보존하여 함께 검토.
- 사용자 PC에서 검증 문서 생성·Fidelity 진입 성공, 오류6/콘텐츠 overflow0 보고. 실제 6건 원인 수정은 하지 않음. 비교 기준/허용오차/Fidelity gate/Auto Fix 정책 그대로 유지.
- `05 검사 및 출력` → 검사 결과 아래, `상세 진단 펼치기` 옆 `Fidelity 진단 JSON 저장`. 등록 검증 결과 또는 등록 Host 실패가 있으면 활성화. 새 원고/선택 변경 시 이전 진단 비활성화.
- UXP getFileForSaving으로 사용자 위치 선택, 기본명 magazine-fidelity.private.json. UTF-8 텍스트 write 완료 후 readback 문자열 완전 일치 검증. 취소/실패 시 성공 표시하지 않고 진단 재시도 가능. 클립보드 기능은 추가하지 않음.
- schema magazine-fidelity-diagnostic/v1: fidelityErrorCount, reportedErrorCount, contentOverflowCount, errors 전부, comparisons 전부(original/generated/comparison.differences), rawReport 전체, Host 예외 및 trace. 각 오류에 sourceId/objectType/page/spread/role/operation/property/Adobe message/code 포함. 집계 오류처럼 특정 객체가 없거나 Host가 제공하지 않은 정보는 null, 원문 rawIssue도 보존. 없는 expected/actual은 __diagnosticType=undefined, 비유한 숫자도 tagged object로 보존. 화면의 redaction/truncation/dedup 결과를 저장하지 않음.
- 파일은 원문/경로를 포함하는 개인 진단 자료. 저장만 수행하며 자동 전송 없음. 실제 개인 샘플/원본 INDD/IDML 미수정, Git 미포함.
- 최종 Node236/Python16 통과. 신규 JSON 회귀5: 6건/차이/특수값 완전 보존, Host 예외 보존, UI 저장/취소/재시도/무효화, UXP await write/readback, 손상/취소/Reload 차단. UXP 실제 저장 대화상자는 PC에서 확인 필요.
- NEXT STEP: Reload → DOCX → 등록 파일 → 추천 → 시작 메인 · 사진 1장 선택 → 검증용 문서 생성 → Fidelity 실패 → JSON 저장. 사용자가 저장 JSON을 전달하면 실제6건 원인을 데이터로 분석. 이번 커밋은 오류6건 해결 또는 Adobe 콘텐츠 제작 성공을 의미하지 않음.

---

# 무채움 TextFrame snapshot 적용성 수정 — 2026-09-30

- 실제 첨부 화면 확인: registered.snapshot.read / TextFrame 2692 u7caf / Page 2537 u335e / Spread 2530 u3357 / overprintFill getter가 상태 오류 반환. open 문제 아님.
- 개인 모델 읽기 확인: u7caf는 Normal Text Frame object style에서 FillColor=Swatch/None, StrokeColor=Swatch/None, StrokeWeight=0 상속, 해당 direct override 없음. TextWrapMode=None.
- 원인: snapshot이 paint 유무와 무관하게 overprint/tint 등 모든 속성을 읽음. overprintFill은 프레임 채움색의 overprint이며 None은 채움 없음. Adobe API 문서는 의미를 정의하지만 모든 상태의 getter 예외를 열거하지 않는다. 이번 Host의 예외 발생은 첨부 실기로 확인한 사실.
- 명시적 적용성 정책: None fill → fillTint/overprintFill N/A; None stroke 또는 weight=0 → strokeTint/strokeType/overprintStroke N/A; TextFrame/EndnoteTextFrame의 graphic fitting N/A; native TextWrapModes.NONE → offset/inverse/side N/A. 조건 불명/활성 상태는 엄격하게 읽고 오류 차단. None 판정은 Host 문서 builtin swatch ID 기준(이름 fallback은 doc 미제공 호출에 한정).
- N/A는 null/false 대체값이 아니라 NOT_APPLICABLE + 이유로 snapshot에 보존하고 fidelity.notApplicable에 경로와 이유를 보고. dormant 설정 원문은 IDML에 그대로 있고 수정하지 않음. 활성화 상태 변화는 paint/mode 및 snapshot 비교에서 검출.
- fill/stroke 색상과 weight, geometry, 페이지/Story/Parent 참조, 스타일/텍스트, paths/graphics/effects 등 검증 유지. 원본과 생성본 모두 무채움일 때만 appearance tint 비교도 N/A. TextFrame.parentStory 읽기는 필수로 강화. 적용 중인 속성의 예외는 기존 상세 실패 UI로 전달.
- 회귀4 추가: 실제 None TextFrame의 여러 getter가 예외를 내도 beforeCleanup.success → cleanup.success → fidelity.start; 활성 overprint getter 오류 차단; 활성화/overprint 변경 검출; locale-independent builtin None ID 판정. 전체 Node226/Python16 통과(최종 실행 확인).
- **Adobe 수정 후 재실기 미실행.** Mock 진행 성공을 Adobe 성공이라 하지 않음. NEXT STEP: 기존 Reload/DOCX/등록 파일/추천/선택/검증용 문서 생성, fidelity.start 진입 확인.
- 원본/개인 파일 변경 없음. Auto Fix/프레임/글자/페이지 변경 정책 확장 없음.

참고: [Adobe TextFrame overprintFill](https://developer.adobe.com/indesign/uxp/omv/t/TextFrame/), [Adobe TextWrapPreference](https://developer.adobe.com/indesign/uxp/dom/api/t/text-wrap-preference/), [Adobe InDesign reference: None swatch](https://helpx.adobe.com/pdf/cs6/indesign_reference.pdf).

---

# 최종 실패 표시 — 2026-09-30

- 사용자 전사 로그의 마지막 확정 성공: `registered.pageReferences.acquire.success`. 이번 메시지에는 새 이미지 파일이 전달되지 않아 이전 이미지를 새 증거로 사용하지 않았다. 실제 최종 오류 행은 아직 확보되지 않음.
- acquire 직후 각 Page.extractLabel(KEY), ID 집합 검증, beforeCleanup snapshot 순서. 현재 정보만으로 정확한 실제 Host failure operation/객체/속성/거부 이유는 미확정. package.open은 변경하지 않음.
- Trace 오류에 registeredFailure 구조화 정보 저장: operation/object/owner/page/spread/property/attemptedValue/Adobe message/code. 중첩 snapshot wrapper가 가장 안쪽 getter 실패를 덮지 않음.
- 페이지 ID 검증, cleanup spread 취득/페이지 label, snapshot reference/객체 name 읽기 진단 보강. 원래 읽기·삭제 대상·Fidelity 판정 기준은 유지, 실패 무시 없음.
- 생성 영역 productionStatus에 줄별 최종 실패 요약을 항상 표시. 상세 Host 로그 끝 및 Studio 진단 끝에도 동일 요약 기록. 일반 제작 상태의 내부 stage 비노출 기존 회귀도 유지.
- 전체 Node222/Python16 통과. 신규3: acquire 이후 Page.extractLabel 실패, 중첩 getter/페이지·spread 정보 보존, UI 스크롤 없이 상세 실패 표시/로그 끝/출력 차단. Adobe 재실기 및 fidelity.start 진입 성공은 아직 미확정.
- NEXT STEP: Reload → 기존 Smoke DOCX/등록 파일 → 추천 → 시작 메인 · 사진 1장 선택 → 검증용 문서 생성. 실패 시 생성 영역의 실패 operation부터 Adobe code까지 요약 전체를 전달. 이 요약 확보 후 실제 거부 속성의 수정 여부 결정.

---

# Adobe open 이후 DOM 실패 추적 — 2026-09-30

- 사용자 첨부 실제 화면: 409ms nativeImport → 424ms validate → 601ms write → 605ms readback → 796ms open → 3800ms pageReferences.beforeCleanup → 현재 상태에서 이 속성을 적용할 수 없습니다.
- 두 번째 화면은 Studio ready 및 Reload/파일 불러오기 이벤트이며 실패 속성을 추가로 식별하지 않는다.
- **open은 반환했고 Document.pages 원본 수/ID 검사도 통과했다.** beforeCleanup 로그 이전에 measurementUnit=POINTS도 통과. 기존 catch가 실패한 새 문서를 닫으므로 화면에 문서가 남지 않아도 open 실패를 뜻하지 않는다.
- 이전 beforeCleanup 표시는 capture(read-only) 시작, 이후 spread.allowPageShuffle=false, Page.remove(), recompose까지 포함한다. 따라서 기존 증거만으로 정확한 객체/속성/읽기 대 쓰기를 확정할 수 없음. Adobe 메시지 표현만으로 setter 오류라 단정하지 않음.
- 수정: open.start/success와 반환 DOM identity; snapshot start/success; 실패 getter의 property/owner/page identity; cleanup의 shuffle read/set, page remove, recompose start/success; fidelity.start/completed 로그. snapshot 읽기 실패도 fatal. property assignment 전에 attemptedValue 기록.
- 이미 false인 spread.shuffle 재대입 방지(기준 모델 선택 spread u3357도 false). true를 false로 바꾸는 기존 정책, 삭제 대상 및 Fidelity 비교 기준은 변경하지 않음. 이것이 실제 사용자 오류 원인이었다는 증거는 아직 없음.
- measurementUnit 복원 오류가 최초 오류를 덮어쓰지 않게 두 오류 보존. 원본 자료/geometry/typography/content/Auto Fix 변경 없음.
- Mock은 평범한 JS 객체로 getter/setter의 Adobe 상태 오류가 없었다. 신규5개 회귀: snapshot getter, shuffle setter, redundant setter, Page.remove 실패, 단위 복원 이중 실패. 기존 open 테스트에 성공 경계 검증 추가.
- **전체 Node219/Python16 통과. Adobe 재실기 미실행, 정확한 실제 실패 속성 및 Fidelity 진입 성공은 미확정.** 진단 보강을 실기 해결 완료로 해석하지 말 것.
- NEXT STEP: Reload → 기존 Smoke DOCX/등록 파일 → 추천 → 시작 메인 · 사진 1장 선택 → 검증용 문서 생성. 새 REGISTERED_DOM_FAILED 전체와 직전 start/success를 확보. 실제 원인 속성을 보고 다음 수정 범위를 확정한다.

---

# Adobe IDML open 실패 후 수정 감사 — 2026-09-30

## 확인한 원인과 한계
- 사용자가 실제 Host open 오류를 보고. 모델 추출기 `ET.fromstring()`은 processing instruction을 버리고, package serializer는 XML 선언+Document만 출력: `designmap.xml`의 Adobe `aid` 문서 식별 선언 누락을 확인했다.
- ZIP은 실제 STORE ZIP이었다. 확장자만 IDML인 텍스트 파일이 아니며 mimetype 첫 항목/비압축, CRC는 이전에도 정상. 원본 IDML 파일을 직접 복사하는 경로가 아니라 모델의 sourceXml을 재조립하는 경로다.
- 기존 UXP write는 이미 awaited binary ArrayBuffer였다. 실제 디스크 바이트 검사는 없었고 Mock은 `mimetype=idml` 한 항목도 open 성공 처리했다. 이제 불완전한 패키지/손상 저장은 Host 호출 전 거절한다.
- 원래 nativePath 전달 유지: 보고된 오류는 파일 이름을 식별한 Host 형식 오류. 경로 변환을 원인으로 단정하지 않았다. 실제 UXP 경로/버전 호환은 재실기 대상.
- **확인된 코드 결함을 수정한 상태이지 Adobe 최소 성공 기준 달성 보고가 아니다.** full IDML schema/렌더링 인증은 하지 않는다.

## 수정
- 신규 추출 metadata.aidProcessingInstruction에 원본 선언 보존. 이전 개인 모델에는 표준 `style=50 type=document readerVersion=6.0 featureSet=257` 선언을 보충하고 packagingNotes에 이유 기록. 원본 product 값을 추측하지 않으며 DOMVersion은 변경하지 않는다.
- packaging namespace는 Adobe 통상 `idPkg` prefix 사용. XML namespace 동등성만으로 Host 인식을 인증하지 않음.
- 모델 inventory의 metadata.xml 누락을 더 이상 예외로 통과시키지 않음. 원본 unknown binary는 계속 차단.
- open 전 STORE ZIP 헤더/길이/CRC, 첫 mimetype, container rootfile, aid/Document/DOMVersion, Resources/Spreads/Stories, XML src 대상 존재 검사. Preferences 등 원본 designmap 참조 리소스도 검사. 전체 XML schema validator는 아니다.
- await write → read(binary) → 완전 바이트 일치 → 패키지 재검증 → app.open(nativePath,true). open 거부는 원본 Adobe 오류 + 임시 경로 + 크기/CRC와 함께 fatal 보고. 임시파일을 남겨 재현 가능.
- 새 문서/콘텐츠/Auto Fix/PDF 우회 없음. 이 패치는 열기 경로에 한정.

## 검증
- Node **214**, Python **16** 테스트(기존206/15 유지 + 새8/1). 최종 전체 실행 통과.
- 신규: aid 누락, 원본 PI 보존, CRC/잘림/참조 누락, 저장 손상, 비동기 쓰기 완료 순서, sliced buffer, 한글 nativePath, Reload 중단, Adobe reject 진단, 누락 metadata 차단.
- 실제 개인 모델을 메모리에서 생성 후 독립 Python zipfile/ElementTree 검증: **160항목, XML159, 1,658,609 bytes, CRC f25a74a2**, source inventory 이름 집합 동일. 개인 파일은 쓰지 않음.
- 실제 Adobe 재실기/원본 Fidelity 비교는 아직 미검증.

참고: [Adobe IDML Cookbook](https://community.adobe.com/havfw69955/attachments/havfw69955/indesign/632677/1/IDML_cookbook_9627253.pdf)의 IDML 식별·패키징 설명, [Adobe Application.open](https://developer.adobe.com/indesign/uxp/dom/api/a/application/), [UXP File operations](https://developer.adobe.com/indesign/uxp/resources/recipes/file-operation/). Cookbook 링크 원문 재접근은 404였으며 검색에 노출된 Adobe 문서 발췌만 확인했다.

---

# 등록 디자인 1건 PC 실기 준비 감사 — 2026-09-30

상태: **첫 Adobe UXP Smoke Test를 실행할 코드/UI 준비 완료. Adobe 실기 성공 및 전체 Fidelity 인증 아님.**
기준 HEAD `e7a236b97fdbfab3598e983fcc5a8c1ce2be039f`, 브랜치 `codex/magazine-studio-1.1`.
중단된 미커밋 변경을 그대로 이어서 마무리했다. 신규 AI/다중 디자인 일반화는 추가하지 않았다.

## 기준 디자인 / 로컬 입력

- 기존 `assets/templates/working/e2e-reference.review.json`의 **시작 메인 · 사진 1장**.
- 등록 ID `a620c934df5347fb-u335e`, 페이지 `u335e`, 원본 표시 **2쪽**, 216 × 303 mm.
- TITLE `u7c7e` / SUBTITLE `u7caf` / BODY `u7c96` / IMAGE1 `u7c78`.
- 유지 텍스트 `u7dba` 및 Parent/기타 객체는 교체 대상이 아니다. IMAGE1은 원본의 빈 이미지 프레임이다.
- 필요한 선택 페이지 폰트: **프리젠테이션 6 SemiBold / 4 Regular**. 문서 검사에서 Parent/리소스의 추가 누락 폰트도 보고될 수 있다.
- 역할 파일은 기존 개발 검토용 매핑이다. 실제 역할/시각 비교는 사용자 확인이 필요하다. 다른 등록 디자인은 변경/삭제하지 않았다.
- 기존 `sample/article-eye-clinic-with-photo.docx`의 내부 이미지는 실제 추출 결과 0장이다.
- 신규 로컬 합성 입력 `assets/templates/working/registered-smoke.docx`: 제목 5자, 부제 15자, 본문 입력 151자(Article Profile은 줄바꿈 제외 150자), 1200×800 PNG 1장, 순서 1, 문단 인덱스 5, 비율 1.5/landscape.
- 합성 그림은 파랑/노랑 테스트 패턴이며 인쇄 품질용 사진이 아니다. 재생성 도구 `tools/create-registered-smoke-docx.py`는 기존 파일을 덮어쓰지 않는다.

## 실제 코드 흐름

`DOCX → 기존 Article/UI → 추천/사용자 선택 → proof mode → 원본 비교/사용자 시각 확인 → production mode → 새 native import와 원본 재검사 → 콘텐츠 교체 → recompose → 검사 → INDD/PDF`

- `registered-native.create(..., {mode:'proof'})`는 원본만 생성하고 CONTENT 교체를 하지 않는다.
- 검증 문서 상태는 `FIDELITY_PASSED` 또는 `FIDELITY_FAILED`. 검증 문서는 INDD 보존이 가능하지만 제작 PDF는 Host와 UI 양쪽에서 차단한다.
- 제작 버튼은 proof 자동 비교 통과와 사용자 시각 확인 뒤 활성화된다. 제작은 별도의 새 문서에서 원본 검사를 다시 수행한다.
- 원본 단계 오류가 있으면 콘텐츠는 그대로다. 오류 문서는 확인 가능하며, 실행 예외 시 이번에 연 새 문서만 정리한다.
- 최초/재검사 모두 원본 오류와 콘텐츠 overflow를 분리한다. 등록 디자인 Auto Fix는 계속 **전체 비활성**이다. 기존 무료/JSON Auto Fix는 유지한다.

## Fidelity 검사 범위와 한계

| 항목 | 코드의 확인 범위 | 남은 실기/한계 |
|---|---|---|
| 페이지 | import 직후 일반 페이지 수/ID, 선택 후 페이지 수·크기·ID | native label 유지, 실제 importer 호환성 |
| 객체·프레임 | 선택 지면 객체 존재, 페이지 상대 bounds, TextFrame/Story/이전·다음 frame 참조 | 곡선/회전·시각 외곽 전체 보장 아님 |
| 조판 | family/style/size/leading/tracking/alignment/문단 spacing, keep/rule 및 단어·문자·글리프 간격 일부 | 모든 InDesign 조판 속성을 일반화한 엔진 아님 |
| 텍스트 프레임 | inset/columns/gutter의 Object Style 상속 + direct 값 대조 | 실제 상속과 Host enum/단위 readback 확인 필요 |
| fill/stroke | 활성 Object Style 값 + direct override, 객체/텍스트의 solid fill/stroke 색상 및 객체 stroke weight/tint | gradient/미해결 색상은 UNSUPPORTED 차단 |
| 페이지 삭제 | 삭제 전후 선택 객체/Story/Parent 참조/레이어/그룹/쌓임 순서/geometry 스냅샷 비교 | 원본 IDML과 native 절대 z-order/Parent 외관 일치는 시각 확인 필요 |
| 유지 객체 | 교체 후 및 출력 전 스냅샷/원본 속성 재검사 | 선택 외 공유/귀속 불명 객체와 Story 연결은 보수적 거부 |
| graphics | XML 원본 보존, 프레임/원본 crop, 변경 전후 graphics geometry/링크 스냅샷 | 고정 배치 graphic의 원본 transform/color, clipping/transparency readback은 UNSUPPORTED 차단. 기준 페이지는 빈 IMAGE1 슬롯 |
| 이미지 교체 | 원본 Host fitting 설정을 place/fit 전후 유지, 실제 링크/개수/geometry/crop 후속 검사 | 새 이미지의 시각적 크롭/인쇄 품질은 사용자가 확인 |

검사 범위 밖 속성을 전체 재현 성공으로 선언하지 않는다. 선택 페이지의 지원 불가 그래픽 효과, 읽을 수 없는 direct override, 미해결 필수 조판 값은 Fidelity 오류로 기록/차단한다. Native 스냅샷의 비적용 속성 null은 측정값이나 기본값을 뜻하지 않는다.

## Style / Override

- raw XML의 Object/Paragraph/Character Style 정의와 BasedOn 연결을 native importer에 전달한다. 원본 모델/스타일 XML을 평탄화하거나 수정하지 않는다.
- 원본 제목에는 size/leading/tracking 외 문단 rule/spacing, 문자 stroke 등 direct 값이 있었다. 이전의 제한된 재적용은 이를 잃을 수 있었다.
- 모든 교체 목적지를 먼저 읽고, uniform Paragraph/Character Style과 **direct override 집합**을 확인한다. 빈/Br-only run도 검사하며 혼합 스타일은 거부한다.
- 원고 교체 후 원래 Paragraph/Character Style을 적용하고 **원본 Host에서 읽은 direct 값**을 다시 적용한다. 폰트 family를 style보다 먼저 적용한다.
- 원본 numeric/boolean/direct 값과 Host 값을 대조하며, 모르는 enum/복합 override는 조용히 생략하지 않는다.
- leading에 `pointSize × 1.2` 같은 fallback을 적용하지 않는다. AutoLeading 미해결도 차단한다. 현재 `fallbacks: []`는 fallback을 사용하지 않았다는 뜻이다.
- `$ID/Metrics`와 `Metrics`의 식별 접두사 정규화는 값 추정/fallback이 아니다.

## DOCX / UI / 출력

- self-closing 빈 문단 인덱스 보정 포함. relationship의 실제 embed 순서/중복 occurrence/치수/방향 정보가 Article Profile과 IMAGE1 bind에 유지된다.
- UXP data folder에 이미지 bytes를 기록한 뒤 nativePath를 전달한다. 별도 사진 선택은 기존 보조 기능으로 유지한다.
- 3장 이상 원고 입력 때 이전 무료 시안/미리보기 잔존을 제거했다.
- 등록 영역에 선택 디자인/페이지, 제목·부제·본문 글자 수, 내부 이미지 수, Fidelity 상태/불일치 항목/오류 종류를 표시한다.
- 원고 변경·Reload는 이전 검증/출력을 무효화한다. 등록 선택 중 일반 생성 버튼이 남은 무료 시안을 잘못 만들지 못하도록 차단했다. 무료 시안 재선택 시 정상 복구된다.
- Host 검사/저장/PDF 경로를 재사용한다. 저장 후 frame rebind, 원본 검증 문서 PDF 차단, 실제 제작 PDF 사전검사를 유지한다.

## 검증 결과

- **Node 206/206, Python 15/15 통과**, 기존 테스트 삭제/완화 없음. `git diff --check` 통과(LF/CRLF 안내만 있음).
- 합성 fixture의 Host double을 실제 native adapter/check/save/export 경로에 연결해 proof PDF 차단과 production 흐름을 검사했다.
- 신규 회귀: direct keep/rule/행간, 미해결 leading, 빈 run 혼합 override, fill/stroke, KEEP/장식, 페이지 삭제 후 순서/Parent, Story identity, unsupported effects, Word 이미지 bytes/slot/place, overflow 단계 분리, UI 단계/일반 생성 오동작 방지.
- 개인 기준 모델의 패키지를 메모리에서 재직렬화해 **XML 158개 일치**, ZIP CRC 정상, 중복 entry 없음 확인. private 식별 라벨/빈 wrapper/container 정규화 제외. 개인 원문은 로그/테스트 fixture로 커밋하지 않았다.
- 브라우저 직접 확인: 기본 UI의 등록 버튼/상태 표시. 기본 파일 chooser 자동화는 응답하지 않아 직접 파일 선택 완료로 기록하지 않는다.
- 별도 로컬 **Browser Mock**에서 실제 제품 UI 모듈 + 실제 합성 DOCX 파서 + 실제 등록 추천을 실행했다. Host 결과는 의도적으로 모의 응답이며 실제 문서/INDD/PDF를 쓰지 않았다.
- Browser Mock에서 DOCX→추천→선택→proof→확인→production→검사→저장→PDF 버튼 완료, proof 중 제작/PDF/일반 생성 차단, 원고 수정 후 출력/제작 무효화를 확인했다. UI의 Mock 성공은 Adobe 성공이 아니다.
- 로컬 증거 `assets/templates/working/registered-ui-smoke.png`, Mock HTML/JS/Smoke DOCX는 ignored. 임시 브라우저/HTTP 서버 종료.

## 보호 / 다음 작업

원본 INDD/IDML·개인 모델·검토 파일은 수정하거나 stage하지 않았다. 기존 파일 크기와 마지막 수정 시간이 유지됐고, Git 변경 목록에도 없다. 신규 로컬 합성 테스트 자료만 별도로 생성했다. 시작부터의 `sample/magazine-design.indd` 미추적 상태 유지.

다음은 [PC Smoke Test](REGISTERED_PC_SMOKE.md) 실행이다. app.open, native label, Parent/페이지 축소, 실제 폰트 조판, style override setter, fitting/crop, 실제 INDD/PDF를 **Adobe UXP에서 아직 실행하지 않았다**. 해당 단계가 실패하면 재현 증거를 받아 수정하며 Auto Fix로 숨기지 않는다.

참고한 Adobe DOM 계약: [Story labels](https://developer.adobe.com/indesign/uxp/dom/api/s/story/), [FrameFittingOption](https://developer.adobe.com/indesign/uxp/omv/f/FrameFittingOption/). 문서 확인은 실기 증거가 아니다.
