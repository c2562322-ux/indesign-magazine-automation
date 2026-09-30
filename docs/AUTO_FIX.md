# 생성 문서 자동 진단 / 안전 수정 (2026-09-30)

## 실행 경로
studio-ui.production → studio adapter → auto-indesign.create / check → recompose → 실제 stories.overflows / fonts / links 검사 → 원인·안전 조건 분류 → auto-fit → recompose → check(repair=false).
INDD 저장 후 검사와 PDF 직전 검사는 읽기 전용이다. 검사 버튼/생성 직후에만 자동 수정한다. 최종 errors가 하나라도 남으면 PDF를 허용하지 않는다. 오류를 필터링하여 통과시키지 않는다.

## 오류와 범주
| 조건 | 원인 | 분류 / 처리 |
|---|---|---|
| 생성 명세와 일치하고 잠금/회전/연결/충돌이 없는 제목·부제 넘침 | CONTENT_OVERFLOW (안전 수정 후보) | AUTO_FIXABLE → 실제 조판 성공 시 resolved |
| 정상 연결된 본문 넘침 | CONTENT_OVERFLOW | AUTO_FIXABLE → 기존 continuation 재사용 |
| 제목/부제 안전 한도 미해결 | SAFE_LIMIT_REACHED | USER_ACTION_REQUIRED, 원복, PDF 차단 |
| 최초 생성 값과 명세 불일치 | GENERATOR_MISMATCH | BLOCKING, 축소로 감추지 않음 |
| 사용자가 생성 후 프레임/폰트/크기/행간/자간/문단 간격 변경 | DOCUMENT_CHANGED | USER_ACTION_REQUIRED, 덮어쓰지 않음 |
| 누락 폰트 | MISSING_FONT | BLOCKING, 폰트 먼저 복구 |
| 깨진 이미지 링크 | MISSING_LINK | BLOCKING, 링크 복구 |
| 생성된 본문 연결 변경/단절 | BROKEN_THREAD | BLOCKING, 자동 재연결 안 함 |
| 기존 충돌 또는 지면 밖 | FRAME_COLLISION | USER_ACTION_REQUIRED, 이동/축소 안 함 |
| header/footer/pageNumber/알 수 없는 라벨 또는 측정 실패 | UNKNOWN | USER_ACTION_REQUIRED, 임의 축소 안 함 |
| Host 예외 / 원복 실패 | HOST_FAILURE / UNKNOWN | 실제 오류 유지. 원복 실패한 문서는 이후 넘침이 없어도 BLOCKING |

등급과 출력 허용은 별개이다. **USER_ACTION_REQUIRED를 포함해 모든 미해결 errors는 출력 차단**이다. 저해상도는 기존 경고. 선택적 빈 사진 프레임은 기존 경고 정책 그대로이며 누락 링크와 다르다. 설치 불가 폰트/스타일, 사진 접근 실패, 40페이지를 초과하는 최초 원고는 생성 단계 오류로 별도 보고한다.

## 제목·부제 정책
- 원본 JSON/normalized plan은 수정하지 않음. 생성 문서의 단일 텍스트 Story에만 적용.
- frame.label/원본 bounds/pointSize/leading/실제 font+style/tracking/paragraph spacing/inset/단수/수직 정렬 확인. 불일치/혼합값/알 수 없는 단위는 조정하지 않음.
- 페이지의 실제 allPageItems.visibleBounds로 보수적인 bounding box 충돌 검사. 페이지 경계와 아래 객체까지 0.5mm 여유. 잠금·회전·연결 프레임은 제외.
- 먼저 아래 방향 높이를 0.5mm씩 확장. 제목 최대 3mm, 부제 최대 2mm. x/y/폭 고정.
- 해결되지 않으면 제목 0.5pt씩 최대 10% 축소(24pt 하한), 부제 0.25pt씩 최대 8% 축소(10pt 하한). 원래 하한보다 작은 디자인은 확대하거나 더 축소하지 않음. step으로 도달 가능한 하한 이상 값까지만 시도.
- 행간은 원래 leading/fontSize 비율 유지. 내용은 삭제/축약/재작성하지 않음.
- 각 단계 recompose 및 실제 Story/TextFrame.overflows 확인, 충돌 재확인. 성공 후 전체 문서 재검사.
- 실패 시 제목/부제의 bounds/pointSize/leading 원복 후 recompose·속성 확인. 원복 실패는 문서 사용 중단/새 문서 안내.
- 이것은 제한된 조정 정책이지 미학적 동일성 보장이 아니다. 실제 결과의 시각적 승인은 실기가 필요.

## 본문
최초 생성의 기존 연결/후속 페이지 정책 유지. 생성 후 직접 원고가 늘어났을 때 문서 검사에서도 기존 Story와 전체 frame 순서가 유지됐는지 확인한 뒤 같은 continuation 생성기를 사용한다. 본문 축소와 원본 첫 페이지 변형은 하지 않는다. 전체 40페이지 상한. 추가된 후속 페이지는 보존되며 상한 미해결은 원고 분할/수동 확인 안내와 출력 차단. 본문 확장은 제목·부제처럼 페이지 삭제로 원복하지 않는다. 중간 Host 실패 시 실제 추가된 페이지 수를 기록하고 출력은 재검사 전 차단한다.

## 기록 / 반복 / 원복
문서별 메모리 context에 role, before, after, reason, result, steps 저장. 제목·부제 실패는 원복, 성공 값은 accepted snapshot으로 저장한다. 동일 프레임은 해당 문서 수명 동안 한 번의 조정만 시도한다. 반복 검사에서는 읽기/재검사만 하며 계속 작게 만들지 않는다. 이후 다시 넘치면 수동 확인을 요구한다.
새 문서는 새 context. 원고/디자인 변경은 기존 출력 대상과 UI 기록을 무효화. Reload는 Host 세션과 기록을 초기화하며 기존 문서를 자동으로 다시 대상으로 삼지 않는다. 기록은 현재 패널 세션용이며 INDD에 영구 저장하지 않는다. save-as로 Host가 다른 Document 인스턴스를 반환하면 안전을 위해 기존 context를 새 객체에 강제로 연결하지 않는다.
성공한 자동 수정의 별도 되돌리기 버튼은 이번에 추가하지 않았다. before 값을 상세 진단으로 확인해 수동 복원할 수 있다. 원본 JSON/plan은 그대로 남아 있다.

## JSON autoFit 확장
샘플 JSON은 변경하지 않았다. 정책은 src/auto-fit.js 한 곳에 있다. 향후 스키마 버전을 올려 autoFit.title/subtitle.enabled, minFontSize, maxHeightGrowth를 명시하는 구조를 권장한다. **현재 JSON에 autoFit을 추가하면 기존 strict validation이 거부한다.** 이번 버전에서 지원한다고 오해하지 말 것.

## 생성기 버그 여부 / 한계
이번 분석에서 작은 부제/페이지 번호 프레임을 임의 확대해야 할 명백한 생성기 속성 오류는 확인하지 못했다. 원본 JSON의 실제 높이, 폰트 metric, 기준선은 실기 확인 대상이다. 작은 프레임/UNKNOWN은 자동 축소하지 않는다. 지원 속성 불일치는 GENERATOR_MISMATCH로 차단하며 추측으로 CONTENT_OVERFLOW로 처리하지 않는다.
Preview는 원본 plan이다. 문서의 runtime auto-fit 값이 Preview나 저장된 작업 JSON을 바꾸지는 않는다. 자동 수정된 문서는 원본 Preview와 작은 차이가 생길 수 있고 변경값은 상세 진단에 표시한다.
공식 API 근거: [TextFrame](https://developer.adobe.com/indesign/uxp/dom/api/t/text-frame/), [Story](https://developer.adobe.com/indesign/uxp/dom/api/s/story/), [Page](https://developer.adobe.com/indesign/uxp/dom/api/p/page/). API 문서 확인은 Adobe 실기 검증과 다르다.

## 검증
- 기존 120개 + 신규 12개 = 132개 Node/Mock 테스트 통과.
- title/subtitle 해결·한도·원복·반복, 충돌/회전, 생성 불일치/누락 폰트, JSON 원본 보존, 작은 역할 보류, 본문 연결/40페이지 상한, Host 실패 및 원복 실패, 세션 초기화, UI/PDF 차단 검증.
- 브라우저 실제 Studio UI + 공유 auto-fit 모듈 + **모의 조판**으로 예시 → Layout 01 → 생성 → 자동 수정 → 재검사 → PDF 활성화와 한도 초과 → 원복 → 차단 직접 조작.
- 브라우저 예시는 제목 51pt/부제 16pt 유지, 높이 각각 +1mm로 모의 해결. 실제 InDesign 결과가 아님.

## PC 실기
1. 개발 브랜치 업데이트 후 UDT Reload, 예시 원고 → 동일 JSON Layout 선택.
2. 필요한 실제 설치 폰트를 지정한 뒤 새 문서 생성. 자동 수정됨 또는 사용자 확인 필요를 확인.
3. 상세 진단에서 role/before/after/reason/result를 기록. 원문/좌우 위치/폭이 그대로인지, 아래 프레임과 겹치지 않는지 확인.
4. 다시 검사를 두 번 실행. 글자 크기/높이가 더 변하지 않아야 함.
5. 미해결이면 PDF는 계속 비활성. 긴 제목 또는 긴 부제로 안전 한도 실패·원복을 확인.
6. 원고/디자인 변경 후 새 문서 생성 → 이전 수정값이 이월되지 않아야 함.
7. 최종 검사 오류 0일 때만 INDD 저장/PDF 내보내기. 실제 파일과 문서가 일치하는지 확인.
실패 시 원고·선택 디자인·폰트/스타일·상세 진단·문제 프레임 화면을 전달. Mock 성공은 실제 InDesign 해결 판정이 아님.
