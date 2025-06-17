const values = { player: null, card: null, pickle: null, think: null };
let players = [], fieldCard = { number: 0, id: null }, roundCount = 1, matchCount = 1, firstPlayerIndex = 0;
let thinkTimer = null, turnOrder = [], graveyard = [];
let cardIdCounter = 1;

const show = id => document.getElementById(id).style.display = "block";
const hide = id => document.getElementById(id).style.display = "none";

// --- 画面切り替えイベント ---
document.getElementById("login-btn").addEventListener("click", () => { hide("login-screen"); show("start-screen"); });
document.getElementById("create-account-btn").addEventListener("click", () => { hide("login-screen"); show("start-screen"); });
document.getElementById("cpu-btn").addEventListener("click", () => { hide("start-screen"); show("rule-screen"); });
document.getElementById("settings-btn").addEventListener("click", () => { hide("start-screen"); show("settings-screen"); });
document.getElementById("settings-back").addEventListener("click", () => { hide("settings-screen"); show("start-screen"); });

// --- オプション選択・スタート準備 ---
["player", "card", "pickle", "think"].forEach(type => {
  document.querySelectorAll(`#${type}-options .option-btn`).forEach(btn => {
    btn.addEventListener("click", () => {
      values[type] = btn.dataset.value;
      document.querySelectorAll(`#${type}-options .option-btn`).forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      const container = document.getElementById(`custom-${type}-container`);
      if (container) container.style.display = values[type] === "custom" ? "block" : "none";
      checkReady();
    });
  });
});

document.getElementById("custom-pickle-input").addEventListener("input", checkReady);
document.getElementById("custom-think-input").addEventListener("input", checkReady);

function checkReady() {
  const ct = +document.getElementById("custom-think-input").value;
  const cp = +document.getElementById("custom-pickle-input").value;
  const thinkOK = values.think && (values.think !== "custom" || (ct >= 1 && ct <= 999));
  const pickleOK = values.pickle && (values.pickle !== "custom" || (cp >= 1 && cp <= 99));
  document.getElementById("start-match").disabled = !(values.player && values.card && thinkOK && pickleOK);
}

// --- ゲーム初期化 ---
document.getElementById("start-match").addEventListener("click", () => {
  hide("rule-screen"); show("game-screen");
  initGame();
});

function initGame() {
  players = [];
  graveyard = [];
  cardIdCounter = 1;
  const pCount = +values.player, cCount = +values.card;
  for (let i = 0; i < pCount; i++) {
    let hand = [];
    for (let j = 0; j < cCount; j++) {
      hand.push({ number: Math.floor(Math.random() * 15) + 1, id: cardIdCounter++ });
    }
    hand.sort((a, b) => a.number - b.number);
    players.push({
      name: i === 0 ? "あなた" : `CPU${i}`,
      hand,
      cucumbers: 0,
      thinkTimeOriginal: getThinkTime(),
      lastCard: null
    });
  }
  fieldCard = { number: 0, id: null };
  roundCount = 1;
  updateRound();
  renderPlayers();
  renderHand(false);  // 初期は無効化
  updateFieldDisplay(); // 場・墓地リセット表示
  setupTurnOrder();
  nextInOrder(0);
}

// --- 場・墓地の表示更新 ---
function updateFieldDisplay() {
  document.getElementById("field-card").innerText = fieldCard.number || "--";
  document.getElementById("graveyard").innerText = graveyard.map(c => c.number).join(", ") || "--";
}

function getThinkTime() {
  return values.think === "custom" ? +document.getElementById("custom-think-input").value : +values.think;
}

function updateRound() {
  const cCount = +values.card;
  const label = roundCount === cCount ? "最終ラウンド" : `ラウンド${roundCount}`;
  document.getElementById("round-title").innerText = `第${matchCount}回戦 ${label}`;
}

function renderPlayers() {
  const area = document.getElementById("players-area");
  area.innerHTML = "";
  players.forEach((p, i) => {
    // デバッグ用（削除予定）CPU手札表示
    const cpuHand = (p.name !== "あなた") ? `<div class="cpu-hand-debug">手札: ${p.hand.map(c => c.number).join(", ")}</div>` : "";
    area.innerHTML += `<div class="player-block">
      <div>${p.name} 🥒${p.cucumbers} <span id="think-${i}"></span></div>
      <div>出したカード:<span id="card-${i}">${p.lastCard ? p.lastCard.number : "--"}</span></div>
      ${cpuHand} 
    </div>`;
  });
}

function renderHand(isMyTurn) {
  const area = document.getElementById("hand-cards");
  area.innerHTML = "";
  const minNumber = Math.min(...players[0].hand.map(c => c.number));
  players[0].hand.forEach(card => {
    const btn = document.createElement("button");
    btn.innerText = card.number;

    if (isMyTurn) {
      if (card.number > fieldCard.number) {
        btn.className = "card-playable";
        btn.disabled = false;
      } else if (card.number === minNumber) {
        btn.className = "card-discard";
        btn.disabled = false;
      } else {
        btn.className = "card-unplayable";
        btn.disabled = true;
      }
    } else {
      btn.className = "card-unplayable";
      btn.disabled = true;
    }

    btn.onclick = () => {
      if (!btn.disabled) {
        clearInterval(thinkTimer);
        disableAllHandButtons();
        play(0, card);
        nextInOrder(turnOrder.indexOf(0) + 1);
      }
    };
    area.appendChild(btn);
  });
}

function disableAllHandButtons() {
  document.querySelectorAll("#hand-cards button").forEach(btn => {
    btn.disabled = true;
    btn.className = "card-unplayable";
  });
}

function setupTurnOrder() {
  turnOrder = [];
  for (let i = 0; i < players.length; i++) {
    turnOrder.push((firstPlayerIndex + i) % players.length);
  }
}

function nextInOrder(pos) {
  if (pos >= turnOrder.length) {
    setTimeout(() => processEndOfRound(), 1000);
    return;
  }
  handleTurn(turnOrder[pos], () => nextInOrder(pos + 1));
}

function handleTurn(index, callback) {
  const p = players[index];
  if (p.hand.length === 0) {
    callback();
    return;
  }

  if (p.name === "あなた") {
    renderHand(true);
    if (p.thinkTimeOriginal === 0) return;
    let t = p.thinkTimeOriginal;
    thinkTimer = setInterval(() => {
      document.getElementById(`think-${index}`).innerText = `思考:${t}s`;
      if (--t < 0) {
        clearInterval(thinkTimer);
        autoPlay(index);
        callback();
      }
    }, 1000);
  } else {
    renderHand(false);
    let t = (p.thinkTimeOriginal === 0) ? 5 : p.thinkTimeOriginal;
    const timer = setInterval(() => {
      if (p.thinkTimeOriginal !== 0) {
        document.getElementById(`think-${index}`).innerText = `思考:${t}s`;
      }
      if (--t < 0) {
        clearInterval(timer);
        autoPlay(index);
        callback();
      }
    }, 1000);
  }
}

function autoPlay(index) {
  const p = players[index];
  const playable = p.hand.filter(c => c.number > fieldCard.number);
  let card;
  if (playable.length) {
    card = playable.reduce((a, b) => a.number < b.number ? a : b);  // 最小の出せるカード
  } else {
    card = p.hand.reduce((a, b) => a.number < b.number ? a : b);  // 出せないなら最小
  }
  play(index, card);
}

function play(index, card) {
  if (card.number > fieldCard.number) {
    fieldCard = { number: card.number, id: card.id };
  }
  graveyard.push(card);
  players[index].lastCard = card;
  players[index].hand = players[index].hand.filter(c => c.id !== card.id);
  document.getElementById(`card-${index}`).innerText = card.number;
  updateFieldDisplay();
  if (index === 0) renderHand(false);
}

function processEndOfRound() {
  const max = Math.max(...players.map(p => p.lastCard ? p.lastCard.number : 0));
  const maxIndices = [];
  players.forEach((p, idx) => {
    if (p.lastCard && p.lastCard.number === max) maxIndices.push(idx);
  });
  firstPlayerIndex = maxIndices[maxIndices.length - 1];

  if (players.every(p => p.hand.length === 0)) {
    const loser = players[firstPlayerIndex];
    let c = getCuc(loser.lastCard.number);
    if (loser.lastCard.number === 1) c *= 2;
    loser.cucumbers += c;
    alert(`${loser.name} 🥒${c}本獲得！`);
    const pickled = players.find(p => p.cucumbers >= getPickleLimit());
    if (pickled) {
      alert(`${pickled.name} お漬物！！ゲーム終了`);
      location.reload();
    } else {
      matchCount++;
      alert(`第${matchCount - 1}回戦終了！次の回戦へ`);
      initGame();
    }
  } else {
    players.forEach(p => p.lastCard = null);
    fieldCard = { number: 0, id: null };
    graveyard = [];
    roundCount++;
    updateRound();
    updateFieldDisplay();
    renderPlayers();
    setupTurnOrder();
    nextInOrder(0);
  }
}

function getPickleLimit() {
  return values.pickle === "custom" ? +document.getElementById("custom-pickle-input").value : +values.pickle;
}

function getCuc(card) {
  if (card >= 2 && card <= 5) return 1;
  if (card >= 6 && card <= 8) return 2;
  if (card >= 9 && card <= 11) return 3;
  if (card >= 12 && card <= 14) return 4;
  if (card === 15) return 5;
  return 0;
}