import React from "react";
import "./style.css";

export const Desktop = () => {
  return (
    <div className="desktop">
      <img className="home" alt="Home" src="/img/home13-1.png" />

      <img
        className="text-on-a-path"
        alt="Text on a path"
        src="/img/text-on-a-path.png"
      />

      <div className="frame">
        <div className="text-wrapper">CPU対戦</div>
      </div>

      <div className="div-wrapper">
        <div className="div">フレンド対戦</div>
      </div>

      <div className="text-wrapper-2">５本のきゅうり</div>

      <div className="text-wrapper-3">
        習うより慣れろ！まずはCPUとやってみよう！
      </div>

      <div className="text-wrapper-4">いつでも！どこでも！友達と！</div>

      <div className="text-wrapper-5">📖ルール説明</div>

      <div className="text-wrapper-6">🌐言語切替</div>

      <div className="USERNAME">
        {"{"}USERNAME{"}"}
      </div>
    </div>
  );
};
