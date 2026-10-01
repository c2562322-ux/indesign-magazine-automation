# 사용자 흐름 성능/진행 표시 — 2026-10-01

- 로컬 Node 측정(Adobe 시간이 아님): active Library 약29.7MB/55버전. 변경 전 읽기35ms+JSON340ms, unpack2226ms, capability+재등록1969ms, 추천44ms. 변경 후 읽기+파싱295ms, unpack491ms, capability+재등록349ms, 추천20ms. 단일 실행 비교라 환경 편차가 있으며 UXP 시간으로 일반화하지 않는다.
- 병목: 페이지별 profile freeze가 이미 완전히 동결한 같은 source 전체를 반복 순회. 동결 source 재순회 제거. 동일 immutable 모델의 정적 PI evidence 확인을 capability 단계에서1회로 캐시. 제작 packagePlan의 원본/직렬화/Host Fidelity 검사는 매번 그대로 수행한다.
- 기존 세션 Library/profile 재사용 유지; 4디자인씩 yield하여 n/전체 표시. 새 파일 import는 새 immutable 모델 identity로 분석하고 실패도 표시. 원고 추천은 매번 새 입력/폰트 상태로 계산, DOCX 결과 캐시 안함. Library 파일이 디스크에서 변경되면 Reload 또는 명시 재불러오기 필요. 저장된 productionReady로 검사 생략 안함.
- DOCX document.xml 중복 압축해제/Word 텍스트 파싱 제거, 기존 parser 공통 함수 재사용. 개인 실제 테스트원고 경로는 현재 읽을 수 없어 실측 없음. 기존 synthetic registered-smoke.docx(2369bytes): 읽기11.1ms, 추출7회 중앙값0.666→0.297ms. 큰 실제 DOCX/UXP 이미지 파일 쓰기 시간은 Adobe 로그로 확인해야 한다.
- UI: 선택 대기→DOCX읽기→압축해제/텍스트·사진추출→사진작업파일 n/N→원고분석→추천조건계산→완료. Library 읽기/파싱/분석도 표시. elapsed를 개발자 진단에 기록. 파싱/추출은 여전히 동기 구간이므로 매우 큰 파일은 해당 단계 동안 잠시 갱신되지 않을 수 있다.
- 추천에서 app.open/Fidelity/Host문서생성은 호출하지 않음. 설치폰트 조회만 기존 Host목록캐시 사용. 스타일/geometry기반 수용량은 원고 문단/문자구성에 의존하여 계속 재계산(약20ms). 변경 원고를 이전 추천으로 재사용하지 않음.
- 전체 Node302/Python18 통과. 회귀: 진행 yield/세션내1회Library분석/실패전파, 기존 stale-load/폰트경고/이미지처리 유지. 실제Adobe 개선 성공 미확인.
- NEXT: UDT Reload → 기존DOCX 불러오기 → 추천. 진행문구/완료 혹은 실패 확인. 느린 경우 상세진단의 단계별ms 전달. main/개인Library/원본파일 미변경.

---

