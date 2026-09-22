// UI 이벤트 바인딩과 프로그램 시작점. InDesign 제어 로직은 src/indesign.js에 위임한다.

const { addHelloText } = require("./src/indesign.js");

const statusText = document.getElementById("statusText");

function setStatus(message) {
    statusText.textContent = message;
}

document.getElementById("btnLoadArticle").addEventListener("click", () => {
    // TODO: sample/article.json 로드 기능은 다음 단계에서 구현 (src/data.js)
    setStatus("Load Article: 아직 구현되지 않음");
});

document.getElementById("btnGenerate").addEventListener("click", async () => {
    try {
        setStatus("Generating...");
        await addHelloText();
        setStatus("완료: \"Hello Magazine\" 텍스트 생성됨");
    } catch (err) {
        console.error(err);
        setStatus(`오류: ${err.message}`);
    }
});
