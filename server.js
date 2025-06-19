import express from "express";
import fs from "fs";
import csv from "csv-parser";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5173;

app.use(express.json());
app.use(express.static("."));

let wordList = [];

// CSV読み込み時に意味を配列に変換
function loadCSV() {
  wordList = [];
  fs.createReadStream("wordlist.csv")
    .pipe(csv(["id", "word", "meaning"]))
    .on("data", (data) => {
      wordList.push({
        id: parseInt(data.id),
        word: data.word,
        // 読点、カンマ、セミコロン、全角半角対応で分割し配列化
        meaning: data.meaning.trim().split(/[、,;；]/).map(s => s.trim()),
      });
    })
    .on("end", () => {
      console.log("単語リストを読み込みました:", wordList.length, "件");
    });
}

loadCSV();

app.get("/get-questions", (req, res) => {
  const start = parseInt(req.query.rangeStart);
  const end = parseInt(req.query.rangeEnd);
  const count = parseInt(req.query.count);

  const candidates = wordList.filter((item) => item.id >= start && item.id <= end);

  if (candidates.length < count) {
    return res.status(400).json({ error: "指定された範囲に問題がありません" });
  }

  const shuffled = candidates.sort(() => Math.random() - 0.5).slice(0, count);
  res.json(shuffled);
});

app.post("/check", async (req, res) => {
  const { userAnswer, correctMeaning } = req.body;

  try {
    const response = await fetch(
      "https://api-inference.huggingface.co/models/sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.HF_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: {
            source_sentence: Array.isArray(correctMeaning) ? correctMeaning[0] : correctMeaning,
            sentences: [userAnswer],
          },
        }),
      }
    );

    if (!response.ok) {
      const text = await response.text();
      console.error("API error response:", text);
      return res.status(500).json({ error: "APIエラー: " + text });
    }

    const result = await response.json();
    console.log("Hugging Face APIの結果:", result);

    const score = result[0] || 0;
    const isCorrect = score >= 0.7;

    res.json({ correct: isCorrect, score, correctMeaning });
  } catch (error) {
    console.error("Error contacting Hugging Face API:", error);
    res.status(500).json({ error: "類似度判定エラー" });
  }
});

app.listen(PORT, () => {
  console.log(`✅ サーバー起動中: http://localhost:${PORT}`);
});
