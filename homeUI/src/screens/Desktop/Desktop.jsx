import React from "react";
import "./style.css";

export const Desktop = ({ username = "GUEST" }) => {
  return (
    <section className="desktop">
      <img className="bg" alt="Home" src="/assets/home13.png" />
      <div className="inner">
        <nav className="sideLeft">
          <a className="linkMinor" href="#rules">ルール説明</a>
          <a className="linkMinor" href="#lang">言語切替</a>
        </nav>
        <div className="userBox">ユーザー:<span className="userName">{username}</span></div>
        <div className="hero">
          <h1 className="title">５本のきゅうり</h1>
          <p className="subtitle">習うより慣れろ！まずはCPUとやってみよう！</p>
          <p className="note">いつでも！どこでも！友達と！</p>
          <div className="cta">
            <a className="fcHero_btn" href="#cpu">CPU対戦</a>
            <a className="fcHero_btn secondary" href="#friend">フレンド対戦</a>
          </div>
        </div>
      </div>
    </section>
  );
};
