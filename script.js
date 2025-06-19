const startBtn = document.getElementById("startBtn");
const submitBtn = document.getElementById("submitBtn");
const nextBtn = document.getElementById("nextBtn");

const questionArea = document.querySelector(".question-area");
const resultArea = document.querySelector(".result-area");

const qNumber = document.getElementById("qNumber");
const wordEl = document.getElementById("word");
const answerInput = document.getElementById("answerInput");
const resultEl = document.getElementById("result");

let questions = [];
let currentIndex = 0;
let currentQ = null;

startBtn.onclick = async () => {
  const startNum = parseInt(document.getElementById("startNum").value);
  const endNum = parseInt(document.getElementById("endNum").value);
  const count = parseInt(document.getElementById("count").value);

  try {
    // ここはRenderのURLや同じドメインならパスだけでOK
    const res = await fetch(
      `/get-questions?rangeStart=${startNum}&rangeEnd=${endNum}&count=${count}`
    );
    questions = await res.json();

    currentIndex = 0;
    showQuestion();
  } catch (err) {
    alert("問題の取得に失敗しました");
    console.error(err);
  }
};

function showQuestion() {
  if (currentIndex >= questions.length) {
    alert("テスト終了！お疲れ様でした");
    questionArea.style.display = "none";
    resultArea.style.display = "none";
    return;
  }

  currentQ = questions[currentIndex];
  qNumber.textContent = `問題 ${currentIndex + 1} / ${questions.length}`;
  wordEl.textContent = currentQ.word;
  answerInput.value = "";
  resultEl.textContent = "";

  questionArea.style.display = "block";
  resultArea.style.display = "none";
}

submitBtn.onclick = async () => {
  const userAnswer = answerInput.value.trim();

  if (!userAnswer) return alert("答えを入力してください");

  try {
    const res = await fetch("/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userAnswer,
        correctMeaning: currentQ.meaning,
      }),
    });

    const data = await res.json();

    if (data.correct) {
      resultEl.textContent = `⭕ 正解！ 類似度: ${data.score.toFixed(2)}`;
    } else {
      resultEl.textContent = `❌ 不正解（正解: ${data.correctMeaning.join(", ")}） 類似度: ${data.score.toFixed(2)}`;
    }

    questionArea.style.display = "none";
    resultArea.style.display = "block";
  } catch (err) {
    resultEl.textContent = "エラーが発生しました";
    console.error(err);
  }
};

nextBtn.onclick = () => {
  currentIndex++;
  showQuestion();
};
