import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import {
  collection,
  doc,
  getDocs,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDILrQ43fy3KGan_3kkY-eySGldyx_hHWo",
  authDomain: "ring-ktpei.firebaseapp.com",
  projectId: "ring-ktpei",
  storageBucket: "ring-ktpei.firebasestorage.app",
  messagingSenderId: "219027043132",
  appId: "1:219027043132:web:455073bbb2579a1428a439"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const wordsRef = collection(db, "wordcloud_words");

const wordForm = document.querySelector("#wordForm");
const wordInput = document.querySelector("#wordInput");
const wordCloud = document.querySelector("#wordCloud");
const rankList = document.querySelector("#rankList");
const formMessage = document.querySelector("#formMessage");
const statusDot = document.querySelector("#statusDot");
const connectionStatus = document.querySelector("#connectionStatus");
const refreshButton = document.querySelector("#refreshButton");

const palette = ["#0f766e", "#2563eb", "#be123c", "#b45309", "#15803d", "#6d28d9", "#0f4c81"];
let latestWords = [];

function normalizeWord(value) {
  return value.trim().replace(/\s+/g, " ").slice(0, 24);
}

function docIdFromWord(word) {
  return encodeURIComponent(word.toLowerCase()).replaceAll(".", "%2E");
}

function setStatus(state, text) {
  statusDot.className = `status-dot ${state}`;
  connectionStatus.textContent = text;
}

function showMessage(text, isError = false) {
  formMessage.textContent = text;
  formMessage.classList.toggle("error", isError);
}

function renderWords(words) {
  latestWords = words;

  if (words.length === 0) {
    wordCloud.innerHTML = '<p class="empty-state">目前還沒有關鍵字。</p>';
    rankList.innerHTML = "";
    return;
  }

  const maxCount = Math.max(...words.map((item) => item.count));
  wordCloud.innerHTML = "";

  words.forEach((item, index) => {
    const weight = maxCount === 0 ? 0 : item.count / maxCount;
    const fontSize = 1 + weight * 2.7;
    const chip = document.createElement("span");
    chip.className = "word-chip";
    chip.style.fontSize = `${fontSize}rem`;
    chip.style.setProperty("--chip-color", palette[index % palette.length]);
    chip.style.setProperty("--tilt", `${(index % 5) - 2}deg`);
    chip.innerHTML = `<span>${escapeHtml(item.word)}</span><small>${item.count}</small>`;
    wordCloud.appendChild(chip);
  });

  rankList.innerHTML = words
    .slice(0, 8)
    .map((item) => `<li><strong>${escapeHtml(item.word)}</strong> ${item.count} 次</li>`)
    .join("");
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

async function loadOnce() {
  const snapshot = await getDocs(query(wordsRef, orderBy("count", "desc")));
  const words = snapshot.docs.map((entry) => ({
    id: entry.id,
    word: entry.data().word,
    count: Number(entry.data().count || 0)
  }));
  renderWords(words);
}

wordForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const word = normalizeWord(wordInput.value);

  if (word.length < 2) {
    showMessage("請至少輸入 2 個字。", true);
    return;
  }

  wordInput.disabled = true;
  showMessage("送出中...");

  try {
    await setDoc(doc(wordsRef, docIdFromWord(word)), {
      word,
      count: increment(1),
      updatedAt: serverTimestamp()
    }, { merge: true });
    wordInput.value = "";
    showMessage("已送出。");
  } catch (error) {
    console.error(error);
    showMessage("送出失敗，請稍後再試。", true);
  } finally {
    wordInput.disabled = false;
    wordInput.focus();
  }
});

refreshButton.addEventListener("click", async () => {
  refreshButton.disabled = true;
  try {
    await loadOnce();
    showMessage("已重新整理。");
  } catch (error) {
    console.error(error);
    showMessage("重新整理失敗。", true);
  } finally {
    refreshButton.disabled = false;
  }
});

setStatus("", "連線中");

onSnapshot(query(wordsRef, orderBy("count", "desc")), (snapshot) => {
  const words = snapshot.docs.map((entry) => ({
    id: entry.id,
    word: entry.data().word,
    count: Number(entry.data().count || 0)
  }));
  renderWords(words);
  setStatus("online", "即時同步");
}, (error) => {
  console.error(error);
  renderWords(latestWords);
  setStatus("offline", "連線異常");
  showMessage("無法讀取文字雲，請確認 Firebase 規則或網路。", true);
});
