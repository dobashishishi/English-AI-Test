import express from "express";
import fs from "fs";
import csv from "csv-parser";
import fetch from "node-fetch";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5173;

app.use(cors()); // 外部からのアクセスを許可
app.use(express.json());

let wordList = [];

// CSV読み込み（意味を配列に変換）
function loadCSV() {
  wordList = [];
  fs.createReadStream("wordlist.csv")
    .pipe(csv(["id", "word", "meaning"]))
    .on("data", (data) => {
      wordList.push({
        id: parseInt(data.id),
        word: data.word,
        meaning: data.meaning
          .trim()
          .split(/[、,;；]/) // 全角/半角カンマやセミコロンで分割
          .map((s) => s.trim()),
      });
    })
    .on("end", () => {
      console.log("単語リストを読み込みました:", wordList.length, "件");
    });
}

loadCSV();

// 問題取得API
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

// 類似度チェックAPI
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
            source_sentence: Array.isArray(correctMeaning)
              ? correctMeaning[0]
              : correctMeaning,
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
    const score = result[0] || 0;
    const isCorrect = score >= 0.7;

    res.json({ correct: isCorrect, score, correctMeaning });
  } catch
