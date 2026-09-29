# 새 디자인 제작·저장·출력 실기 확인 — 2026-09-29

## 확인된 범위

사용자가 PC InDesign에서 패널 표시, 원고 입력, 무료 3안, 미리보기 글자 크기, 패널 스크롤이 정상임을 보고했다. 앱/UDT 정확한 버전은 아직 전달받지 않았다. 제작·검사·저장·PDF는 이번 코드 수정 이후 실제 InDesign에서 재검증해야 한다. Node의 Host/DOM 모의 테스트 통과를 실기 성공으로 취급하지 않는다.

## 버튼 호출 흐름과 조건

모든 버튼은 index.html의 기존 ID에 studio-ui.js가 click을 연결한다. 작업 중에는 busy=true로 중복 실행을 막고 finally에서 해제한다. 브라우저 체험판(native=false)은 제작 버튼을 활성화하지 않는다.

| 버튼 | 호출 순서 | 활성화 조건 |
|---|---|---|
| 새 문서 생성 | production → fresh → studio adapter.create → Host.create → 기사/설계 검증 → 폰트/이미지 접근 → app.doScript → 새 문서/프레임/Story → 검사 → latest 저장 | native, 유효한 현재 시안, 작업 중 아님 |
| 문서 검사 | production → 현재 원고·시안/문서 일치 검사 → Host.check → latest → recompose/넘침/폰트/링크 | 생성 성공, 현재 원고·시안 일치, 작업 중 아님 |
| INDD 저장 | production → 현재 문서 일치 검사 → UXP getFileForSaving → nativePath → Host.save → latest.save → 반환 문서 추적 → 재검사 | 위와 같음. 검사 오류가 있어도 수정용 저장 허용 |
| PDF 내보내기 | production → 현재 문서 일치 검사 → UXP getFileForSaving → nativePath → Host.exportPdf → latest 재검사 → exportFile(PDF_TYPE, path, true) | 위 조건에 더해 마지막 검사 통과. 실제 출력 직전에도 재검사 |

생성 성공 시 자동 검사가 포함되므로 별도 검사 버튼을 누르기 전에도 오류가 없으면 PDF가 활성화된다. 검사 예외/오류 후에는 PDF를 막고, 검사·수정용 저장·재생성은 가능하다. 수정 후 검사 통과 시 PDF를 다시 활성화한다. INDD 저장 시 수행하는 검사도 통과하면 PDF를 활성화할 수 있다.

원고·설정·시안이 달라지면 이전 문서용 버튼은 비활성화된다. 이전 값/시안으로 정확히 돌아오면 해당 문서와 다시 일치할 수 있다. 새 문서 생성 시도는 UI와 Host의 이전 대상 연결을 먼저 해제한다. 실패해도 예전 문서는 닫지 않으며, 그 문서로 몰래 저장하지 않는다. 생성 중 생긴 미완성 새 문서만 정리한다. latest는 메모리에만 있어 UDT Reload 뒤에는 새로 생성해야 한다.

## 공식 문서 대조 및 실기 한계

- [Adobe UXP migration guide](https://developer.adobe.com/indesign/uxp/resources/migration-guides/extendscript/): DOM 값은 참조 비교가 아닌 equals()가 필요할 수 있다. 새 모드 폰트/링크 상태 비교를 수정했다. 기존 모드는 건드리지 않았다.
- [Document API](https://developer.adobe.com/indesign/uxp/dom/api/d/document/): save는 Document를 반환하며 저장된 문서의 다른 이름 저장에서 원본이 닫히고 새 복사본이 열릴 수 있다. 반환된 유효 문서를 latest로 추적한다. exportFile의 showingOptions=true는 옵션 창 표시이며 성공 반환값은 명시되지 않는다.
- [Application API](https://developer.adobe.com/indesign/uxp/dom/api/a/application/): doScript 호출 형식은 유지했다. 콜백·Undo·조판의 실동작은 PC에서 확인한다.
- [UXP 파일 작업](https://developer.adobe.com/indesign/uxp/resources/recipes/file-operation/): UXP 파일 선택 방식을 유지했다. manifest의 localFileSystem=fullAccess도 변경하지 않았다. 선택 파일의 nativePath를 DOM에 전달하는 현재 경로의 호환성은 실기 확인 대상이다. 임의의 File/토큰 변환은 도입하지 않았다.

PDF는 문서의 afterExport 이벤트를 관찰했을 때만 성공으로 표시한다. 옵션 창에서 조용히 취소되거나 이벤트 지원/전달을 확인하지 못하면 **완료 미확인**으로 표시한다. 이는 성공도 확정 취소도 아니다. Host가 예외를 반환하면 단계와 오류를 표시한다. 오류 번호만 보고 취소라고 추측하지 않는다. 실제 옵션 창 취소 시 전달되는 이벤트/오류 형식은 PC에서 기록해야 한다.

## PC 테스트 순서

개발 브랜치의 최신 커밋을 받은 뒤 현재 폴더의 manifest로 UDT Reload한다. 원고를 저장하지 않았다면 Reload 전에 저장한다. 기존 사용자 문서는 저장해 두고, 새 결과물은 별도 테스트 경로/이름으로 저장한다. 설치된 본문·제목 폰트를 선택한다.

| 순서 | 누를 버튼/동작 | 기대 결과 |
|---|---|---|
| 1 | 짧은 제목·본문 입력, 사진 없음 → 무료 디자인 3안 → 하나 선택 | 새 문서 생성 활성화. 검사/INDD/PDF는 생성 전 비활성화 |
| 2 | 선택한 디자인으로 새 문서 만들기 | 문서 생성 시작 → 진행 단계 → 문서 생성 성공. 새 문서만 생기고 검사/INDD 활성화. 검사 오류 없으면 PDF 활성화 |
| 3 | 문서 검사 | 문서 검사 성공, 페이지 수와 기본 검사 결과. 생성 메시지로 잘못 표시되지 않음 |
| 4 | INDD 저장 → 파일 선택창 취소 | INDD 저장 취소. 다시 저장/검사 가능 |
| 5 | INDD 저장 → 새 이름으로 저장 | INDD 저장 성공. 실제 INDD 파일 존재 및 열기 확인 |
| 6 | INDD 저장 → 또 다른 이름으로 저장 → 문서 검사 | 반환 문서를 계속 추적하고 검사 가능. PDF도 이 문서 대상 |
| 7 | 다른 문서로 포커스 이동 → 패널 문서 검사/INDD 저장 | 패널에서 생성한 문서 대상 유지. 다른 문서는 변경 없음 |
| 8 | PDF 내보내기 → 파일 선택창 취소 | PDF 내보내기 취소, 재시도 가능 |
| 9 | PDF 내보내기 → 새 파일명 → PDF 옵션 창에서 취소 | 성공으로 표시하지 않음. 완료 미확인 또는 Host 실패 메시지의 실제 내용을 기록 |
| 10 | PDF 내보내기 → 새 파일명 → 옵션 확정 | 완료 이벤트 수신 시 PDF 내보내기 성공. 실제 PDF를 열어 페이지·본문 확인. 완료 미확인이면 파일 생성 여부도 기록 |
| 11 | 원고 수정 또는 다른 시안 선택 | 이전 문서 검사/INDD/PDF 비활성화. 다시 생성하면 사용 가능 |
| 12 | 잘못된 설치 폰트명으로 새 시안 → 생성 실패 → 폰트 복원 → 다시 생성 | create.fonts 실패 단계, 생성 버튼 복구. 이전 문서 출력 불가. 올바른 폰트로 재시도 가능 |
| 13 | 테스트 문서의 제목을 넘치게 수정 → 문서 검사 | 넘침 오류, PDF 비활성화, 수정용 INDD 저장 가능. 넘침 해소 후 검사하면 PDF 재활성화 |
| 14 | 생성 문서를 닫고 검사/저장 시도 | latest 관련 오류 표시. 새 문서 생성으로 복구 가능 |

추가로 사진 1/2장·긴 본문·이미지 링크 오류는 ACCEPTANCE_TESTS.md를 따른다. 출력 성공과 인쇄 품질 보증은 구분한다.

## 실패 시 전달할 내용

- 실패한 버튼과 직전까지 성공한 단계
- 상태 영역 및 제작 결과 영역 전체 스크린샷(오류의 대괄호 단계 포함)
- InDesign/UDT 버전, 테스트한 Git 커밋 SHA
- 사진 수, 본문 대략 길이, 폰트 이름, 새 문서 생성 여부
- 저장창/PDF 옵션창 중 어디에서 취소했는지, 실제 파일 생성 여부

진단 예: [create.fonts], [create.app.doScript], [create.AUTO_TITLE.contentsAndStyle], [check.Document.recompose], [output.getFileForSaving], [save.Document.save], [save.completed.postCheck], [pdf.Document.exportFile]. 단계마다 원본 Error/스택을 콘솔에 덤프하지 않는다. 경로·키는 UI 메시지에서 가린다. 화면 캡처에도 원고·API 키·개인 경로가 포함되지 않도록 한다.
