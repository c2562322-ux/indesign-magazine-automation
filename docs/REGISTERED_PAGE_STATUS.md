> 최신 역할/추천 재검토(역할완료10, 확인15)는 [재검토 표](REGISTERED_RECOMMENDATION_REVIEW.md)를 참고하세요. 아래는 이전25페이지 연결 시점의 이력입니다.

# 기존 25페이지 등록/검증 상태 — 2026-09-30

새 원본 파일을 만들지 않고 기존 원본 14페이지 + central 11페이지를 등록했다. 개인 모델은 Git에 포함하지 않는다.

- original source SHA: a620c934df5347fb222124d3f26863e47aec8ca2e9665e6aa3332ae64d0bed4a
- central source SHA: 4013e55f3c14d8651f5737c375f75f24792877b6e4e542b7d4d43f6d844bf8d2
- 같은 page ID라도 source SHA가 다르면 별도 디자인이다.
- 실제 Adobe 검증 완료: original/u335e 1개(사용자 보고: Fidelity 통과/텍스트 교체/문서 생성). 나머지24 실기 미검증. 이미지 배치와 제작 후 고정 객체 오류는 최신 진단 대기.
- Production Ready: 0. 위 사용자 보고는 전체 검사/이미지/출력까지 통과했다는 의미가 아니며, 저장 Library에서 Host 승인을 위조하거나 재사용하지 않는다.
- 전체 추천 평가25 / 역할 확인16 / 자동 또는 기존 매핑9 / 정적 Fidelity 검증 가능9(빈 지면1 포함) / 역할+검증 준비8 / Unsupported16. 역할 확인과 Unsupported는 중복 집계다.
- 추천 적합 여부는 DOCX와 설치 폰트에 따라 달라진다. Smoke DOCX와 모델 필수 폰트를 모두 제공한 오프라인 평가: 후보1/확인필요16/조건불일치8. 실제 설치폰트 확인 결과 아님.

|source/page ID|유형|TITLE|SUBTITLE|BODY 구조(프레임 ID)|IMAGE 수|역할 상태/confidence|추천 평가|Fidelity|Production Ready|확인/미지원 이유|
|---|---|---|---|---|---|---|---|---|---|---|
|original/u1ba|empty|—|—|없음|0|ROLE_MAPPING_REQUIRED / 미정|평가함|실기 검증 필요|아니오|제목 후보가 없거나 여러 개: 핵심 역할 확인; 본문 영역 확인 필요; 제목 역할 확인 필요; 본문 역할 확인 필요|
|original/u1ce|contents|u51a2|—|없음|0|ROLE_MAPPING_REQUIRED / 0.9–0.9|평가함|UNSUPPORTED|아니오|본문 영역 확인 필요; 본문 역할 확인 필요; graphic effect readback 미지원; title 혼합 Typography 교체 미지원|
|original/u1cf|contents|u1e4|—|없음|0|ROLE_MAPPING_REQUIRED / 0.9–0.9|평가함|UNSUPPORTED|아니오|본문 영역 확인 필요; 본문 역할 확인 필요; graphic effect readback 미지원; title 혼합 Typography 교체 미지원|
|original/u335e|article|u7c7e|u7caf|1 Story: u7c96|1|AUTO_MAPPED / 기존 확정|평가함|사용자 실기 통과|아니오|실기 검사 필요|
|original/u3356|multi-body|u7d02|u7d31|2 Story: u7d19, u7d4c|0|AUTO_MAPPED / 0.85–0.9|평가함|실기 검증 필요|아니오|실기 검사 필요|
|original/u3d5|article|u7d84|u7d9e|1 Story: u7d6c|1|AUTO_MAPPED / 0.85–0.95|평가함|실기 검증 필요|아니오|실기 검사 필요|
|original/u3d6|article|u7e01|u7e18|1 Story: u7dea|3|AUTO_MAPPED / 0.85–0.95|평가함|실기 검증 필요|아니오|실기 검사 필요|
|original/u735|article|—|—|1 Story: u7eca|0|ROLE_MAPPING_REQUIRED / 0.85–0.85|평가함|UNSUPPORTED|아니오|제목 후보가 없거나 여러 개: 핵심 역할 확인; 제목 역할 확인 필요; UNSUPPORTED 페이지 귀속/공유 객체: u7eac|
|original/uad7|article|—|—|1 Story: u7ee3|2|ROLE_MAPPING_REQUIRED / 0.85–0.95|평가함|UNSUPPORTED|아니오|제목 후보가 없거나 여러 개: 핵심 역할 확인; 제목 역할 확인 필요; UNSUPPORTED 페이지 귀속/공유 객체: u7eac|
|original/u576c|multi-body|u7fd5|—|2 Story: u8004, u8049|0|AUTO_MAPPED / 0.85–0.9|평가함|UNSUPPORTED|아니오|UNSUPPORTED 페이지 귀속/공유 객체: u7fad; body 혼합 Typography 교체 미지원|
|original/u5764|multi-body|—|—|2 Story: u801b, u8032|3|ROLE_MAPPING_REQUIRED / 0.85–0.95|평가함|UNSUPPORTED|아니오|제목 후보가 없거나 여러 개: 핵심 역할 확인; 제목 역할 확인 필요; UNSUPPORTED 페이지 귀속/공유 객체: u7fad|
|original/u577b|multi-body|u821b|u8277|3 Story: u8249, u82e2, u8260|1|AUTO_MAPPED / 0.85–0.95|평가함|실기 검증 필요|아니오|실기 검사 필요|
|original/u577c|multi-body|u8346|—|3 Story: u8368, u83fd, u83b6|0|AUTO_MAPPED / 0.85–0.9|평가함|실기 검증 필요|아니오|실기 검사 필요|
|original/u853e|multi-body|u8556|u853f|2 Story: u8593, u857c|0|AUTO_MAPPED / 0.85–0.9|평가함|실기 검증 필요|아니오|실기 검사 필요|
|central/u1ba|cover/review|—|—|없음|0|ROLE_MAPPING_REQUIRED / 미정|평가함|UNSUPPORTED|아니오|제목 후보가 없거나 여러 개: 핵심 역할 확인; 본문 영역 확인 필요; 배치 이미지 1개: 기사 사진/설명·배경 여부 확인 (현재 유지); 제목 역할 확인 필요; 본문 역할 확인 필요; 고정 graphic source transform/color readback 미지원|
|central/u1ce|contents|u51a2|—|없음|0|ROLE_MAPPING_REQUIRED / 0.9–0.9|평가함|UNSUPPORTED|아니오|본문 영역 확인 필요; 본문 역할 확인 필요; graphic effect readback 미지원; title 혼합 Typography 교체 미지원|
|central/u1cf|multi-body|u88f8|u890f|2 Story: u88b3, u88ca|0|AUTO_MAPPED / 0.85–0.9|평가함|실기 검증 필요|아니오|실기 검사 필요|
|central/u335e|multi-body|u33df|—|3 Story: u7a2b, u7a5c, u7ab2|0|ROLE_MAPPING_REQUIRED / 0.85–0.9|평가함|UNSUPPORTED|아니오|부제 후보 여러 개: 핵심 역할 확인; 배치 이미지 2개: 기사 사진/설명·배경 여부 확인 (현재 유지); 고정 graphic source transform/color readback 미지원; title 혼합 Typography 교체 미지원|
|central/u3356|multi-body|u8955|u896c|2 Story: u89a3, u89d2|0|ROLE_MAPPING_REQUIRED / 0.85–0.9|평가함|UNSUPPORTED|아니오|배치 이미지 1개: 기사 사진/설명·배경 여부 확인 (현재 유지); 고정 graphic source transform/color readback 미지원; title 혼합 Typography 교체 미지원|
|central/u3d5|multi-body|u7e63|u7e7a|3 Story: u7eb3, u7ef3, u7f0b|0|ROLE_MAPPING_REQUIRED / 0.85–0.9|평가함|UNSUPPORTED|아니오|배치 이미지 2개: 기사 사진/설명·배경 여부 확인 (현재 유지); 고정 graphic source transform/color readback 미지원; title 혼합 Typography 교체 미지원|
|central/u3d6|multi-body|u8a2b|u8a42|3 Story: u8a72, u8a89, u8aa0|0|ROLE_MAPPING_REQUIRED / 0.85–0.9|평가함|UNSUPPORTED|아니오|배치 이미지 2개: 기사 사진/설명·배경 여부 확인 (현재 유지); 고정 graphic source transform/color readback 미지원; graphic effect readback 미지원|
|central/u735|multi-body|u81e3|—|3 Story: u822a, u82ef, u8306|0|ROLE_MAPPING_REQUIRED / 0.85–0.9|평가함|UNSUPPORTED|아니오|부제 후보 여러 개: 핵심 역할 확인; 배치 이미지 2개: 기사 사진/설명·배경 여부 확인 (현재 유지); UNSUPPORTED 페이지 귀속/공유 객체: u83ad; 고정 graphic source transform/color readback 미지원; graphic effect readback 미지원|
|central/uad7|multi-body|u8b77|u8b8e|3 Story: u8bc2, u8c4d, u8c7b|0|ROLE_MAPPING_REQUIRED / 0.85–0.9|평가함|UNSUPPORTED|아니오|배치 이미지 2개: 기사 사진/설명·배경 여부 확인 (현재 유지); UNSUPPORTED 페이지 귀속/공유 객체: u83ad; 고정 graphic source transform/color readback 미지원; graphic effect readback 미지원|
|central/u576c|multi-body|u8531|u8565|2 Story: u857e, u8815|0|ROLE_MAPPING_REQUIRED / 0.85–0.9|평가함|UNSUPPORTED|아니오|배치 이미지 2개: 기사 사진/설명·배경 여부 확인 (현재 유지); UNSUPPORTED 페이지 귀속/공유 객체: u83b9; graphic effect readback 미지원; 고정 graphic source transform/color readback 미지원|
|central/u5764|multi-body|u8d24|—|4 Story: u8d6f, u8da1, u8dcf, u8de6|0|ROLE_MAPPING_REQUIRED / 0.85–0.9|평가함|UNSUPPORTED|아니오|부제 후보 여러 개: 핵심 역할 확인; UNSUPPORTED 페이지 귀속/공유 객체: u83b9; graphic effect readback 미지원|

confidence는 규칙의 신뢰도 표식이며 통계적으로 검증된 확률이 아니다. 부제/이미지 후보가 모호하면 기존 콘텐츠 유지와 검토 사유를 기록한다. Image 0은 원본 그림이 없다는 뜻이 아니라 교체 확정 슬롯0이라는 뜻이다. 원본의 나머지 장식/그림은 그대로 유지한다.

## 실제 PC 실행

1. UDT Reload, DOCX 불러오기.
2. 등록 파일을 한 번만 불러오기: assets/templates/working/registered-pages-25.private.json.
3. 등록 디자인에서 추천: 모든25 항목 평가, 적합/확인필요 카드 및 제외 이유 확인.
4. 개발자 영역 전체 페이지 목록에서 선택 페이지 검증 준비 또는 다음 미검증 디자인 검증. 다음 버튼은 이미 시도한 페이지와 알려진 Unsupported를 건너뛰고 다음1개를 실행한다. 실패 페이지는 목록에서 재선택 가능. 문서는 자동으로 닫지 않는다.
5. 검증 성공 시 원본 육안 비교 후 원본과 비교 완료 → 선택한 등록 디자인으로 제작 → 문서 검사 → INDD/PDF. 역할 확인/Capability 문제가 있으면 제작은 계속 차단된다.
6. 필요한 페이지는 선택 페이지 핵심 역할 확인에서 TITLE/BODY/사진 슬롯 등 핵심만 검토하고 핵심 역할 검토 완료 → 이 페이지 등록. 나머지 객체는 원본 유지.
7. 전체 페이지 검증 결과 저장: registered-page-verification.private.json. 상태, 모든 페이지 원문 보고서, 동일 속성 차이 그룹을 함께 저장한다. Reload 전 저장 권장; 저장 결과는 승인 토큰이 아니다.
8. u335e의 이미지/고정 객체 오류는 제작 직후 검사 결과에서 Fidelity 진단 JSON 저장. 내부 이미지1장 인식, IMAGE 슬롯의 실제 화면, 상세 오류와 저장 JSON을 전달한다. 이미지 링크/배치 수/geometry/fitting 검사는 유지하며 실패를 무시하지 않는다.

## 구현/검증 범위

- 공통 autoDraft와 Capability Profile, source/page 복합 식별. u335e의 기존 역할/원본 모델 재사용.
- 다중 BODY는 명시된 읽기 순서와 원본 글 분량 비율로 새 원고를 연속 분배한다. 문자 누락/중복 없이 원본 Story/프레임/스타일 유지, 넘침은 콘텐츠 검사로 처리한다. 각 Story의 혼합 Typography는 계속 미지원이다.
- IMAGE1..N은 숫자 전체를 인덱스로 사용한다. 10번째 슬롯까지 별도 이미지 배치 회귀 검증. 장식 이미지는 자동 교체하지 않는다.
- 빈 parent Group의 자식이 모두 한 선택 페이지에 확실히 속할 때만 유지 가능 판정. 양쪽 페이지를 걸친 객체는 여전히 차단.
- Host 검증 결과/실패 그룹은 동일 property/path + expected/actual + object type + 원인으로 모은다. 최초/재검사 중복은 제거하되 원문 보고서는 보존한다.
- 고정 객체 오류 메시지에서 slash 때문에 비공개 경로로 가려지던 문구를 점 구분으로 수정하고 differences/operation을 구조화했다. 실제 고정 객체 변경 원인은 최신 JSON 없이 수정하지 않았다.
- 검증은 Node/Mock 및 IDML 패키지 정적 검증이다. 24페이지 실제 Adobe 통과를 주장하지 않는다.

전체 자동 테스트: Node255/Python16 통과. 검증 준비9개 패키지 유효성 및 역할준비8개 바인딩 확인. 실제 Adobe 재검증은 사용자 PC에서 필요하다.
