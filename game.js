const values = {
  player: null,
  card: null,
  think: null
};

// ログイン処理（仮動作 → 後で削除予定！）
document.getElementById("login-btn").addEventListener("click", () => {
  alert("ログイン成功！（仮動作）"); // TODO: 後で削除！
  document.getElementById("login-screen").style.display = "none";
  document.getElementById("start-screen").style.display = "block";
});

document.getElementById("create-account-btn").addEventListener("click", () => {
  alert("アカウント新規作成（仮動作）"); // TODO: 後で削除！
  document.getElementById("login-screen").style.display = "none";
  document.getElementById("start-screen").style.display = "block";
});

// スタート画面
document.getElementById("cpu-btn").addEventListener("click", () => {
  document.getElementById("start-screen").style.display = "none";
  document.getElementById("rule-screen").style.display = "block";
});

document.getElementById("online-btn").addEventListener("click", () => {
  alert("オンライン対戦は今後実装予定"); // TODO: 後で削除！
});

document.getElementById("settings-btn").addEventListener("click", () => {
  document.getElementById("start-screen").style.display = "none";
  document.getElementById("settings-screen").style.display = "block";
});

// 設定戻る
document.getElementById("settings-back").addEventListener("click", () => {
  document.getElementById("settings-screen").style.display = "none";
  document.getElementById("start-screen").style.display = "block";
});

// ゲーム設定選択処理
document.querySelectorAll("#player-options .option-btn").forEach(btn => {
  btn.addEventListener("click", () => selectOption("player", btn, "#player-options"));
});

document.querySelectorAll("#card-options .option-btn").forEach(btn => {
  btn.addEventListener("click", () => selectOption("card", btn, "#card-options"));
});

document.querySelectorAll("#think-options .option-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    values.think = btn.dataset.value;
    setActive(btn, "#think-options");
    if (values.think === "custom") {
      document.getElementById("custom-think-container").style.display = "block";
    } else {
      document.getElementById("custom-think-container").style.display = "none";
    }
    checkReady();
  });
});

document.getElementById("custom-think-input").addEventListener("input", checkReady);

function selectOption(type, btn, container) {
  values[type] = btn.dataset.value;
  setActive(btn, container);
  checkReady();
}

function setActive(selectedBtn, container) {
  document.querySelectorAll(`${container} .option-btn`).forEach(btn => {
    btn.classList.remove("active");
  });
  selectedBtn.classList.add("active");
}

function checkReady() {
  const customVal = document.getElementById("custom-think-input").value;
  const thinkValid = values.think !== "custom" || (customVal && customVal >= 1 && customVal <= 999);
  const ready = values.player && values.card && thinkValid;
  document.getElementById("start-match").disabled = !ready;
}

document.getElementById("start-match").addEventListener("click", () => {
  const think = values.think === "custom" ? `${document.getElementById("custom-think-input").value}秒`
                : (values.think === "0" ? "無制限" : `${values.think}秒`);

  alert(`設定完了！
対戦人数: ${values.player}
カード枚数: ${values.card}
思考時間: ${think}`); // TODO: 後で削除！ → 実際の対戦画面へ切り替えにする
});
