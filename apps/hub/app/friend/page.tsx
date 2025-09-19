'use client';

import Link from "next/link";
import { useEffect } from "react";

export default function FriendPage() {
  useEffect(() => {
    document.title = 'フレンド対戦 | Five Cucumber';
  }, []);

  return (
    <main className="friend-page">
      <div className="friend-page__background" aria-hidden="true" />
      <div className="friend-page__container" style={{paddingBottom: '88px'}}>
        <header className="friend-page__header">
          <div className="friend-page__title-group">
            <p className="friend-page__eyebrow">ONLINE FRIEND MATCH</p>
            <h1 className="friend-page__title">フレンド対戦</h1>
            <p className="friend-page__lead">
              あなたがホストとなってルームを作成するか、招待されたルームコードからすぐに合流できます。
            </p>
          </div>
          <Link href="/rules" className="friend-page__rules">
            ルールを見る
          </Link>
        </header>

        <section className="friend-actions" aria-labelledby="friend-actions-heading">
          <h2 id="friend-actions-heading" className="sr-only">
            フレンド対戦の操作
          </h2>

          <article className="friend-action-card">
            <div className="friend-action-card__body">
              <h3 className="friend-action-card__title">ホストとしてルーム作成</h3>
              <p className="friend-action-card__text">
                プレイヤー人数・制限時間・きゅうり数を決めてフレンドを招待しましょう。
              </p>
            </div>
            <Link href="/friend/create" className="friend-action-card__button friend-action-card__button--primary">
              ルームを作成
            </Link>
          </article>

          <article className="friend-action-card">
            <div className="friend-action-card__body">
              <h3 className="friend-action-card__title">ルームコードで参加</h3>
              <p className="friend-action-card__text">
                6桁のルーム番号を入力して、進行中の友達のルームに合流しましょう。
              </p>
            </div>
            <Link href="/friend/join" className="friend-action-card__button friend-action-card__button--secondary">
              ルームに参加
            </Link>
          </article>
        </section>
      </div>

      {/* 下部固定アクションバー */}
      <div className="friend-sticky-bar">
        <div className="friend-sticky-inner">
          <Link href="/friend/create" className="friend-sticky-primary">ルームを作成</Link>
          <Link href="/friend/join" className="friend-sticky-secondary">ルームに参加</Link>
        </div>
      </div>
    </main>
  );
}
