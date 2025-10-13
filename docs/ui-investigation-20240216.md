# UI/UX調査レポート（Home UI・CPU動線・フレンドルーム作成）

## 1. 調査サマリ
- Next.js 側のホーム画面実装が `homeUI` プロトタイプで想定している装飾・レイアウトをいくつか取り込めておらず、ビジュアルが大きく乖離している。
- ホーム画面からの「CPU対戦」導線が旧URL（`/play/cpu`）のままになっており、設定画面を経由できない。また、CPU設定ページ自体もTailwind依存のユーティリティクラスを使用しているためスタイルが適用されていない。
- フレンド対戦ルーム作成画面は新しいUIレイアウトに差し替えたが、Tailwind未導入の状態でTailwindクラスを多用しており、想定した段組みやボタンスタイルが崩れている。

## 2. 詳細調査

### 2.1 ホーム画面が `homeUI` フォルダのデザインと一致しない
- プロトタイプ（`homeUI`）では、背景アセット `home13-1.png` と曲線テキスト `text-on-a-path.png`、さらにCTAの装飾フレームなどが定義されている。【F:homeUI/src/screens/Desktop/Desktop.tsx†L6-L37】
- Next.js 実装（`DesktopHero`）は背景画像とテキスト・CTAボタンのみで、上記装飾群が未実装。サイドナビやユーザーネームバッジなどの配置も簡略化されている。【F:apps/hub/app/home/_components/DesktopHero.tsx†L10-L33】
- この差異により、背景上にアクセントを置いたヒーロービジュアルや、アニメーションで生成されたリッチなCTAレイアウトが反映されていない。

**原因**
- `homeUI` の最新エクスポートから装飾用DOM・アセットを移植する際、`DesktopHero` へ反映し切れていない。CSSモジュールもhomeUI準拠になっておらず、デザイン差分が発生している。

**改善提案**
- `homeUI` の `Desktop.tsx` に合わせて `DesktopHero` のDOM構造を拡張し、背景装飾用の `<img>` やCTAフレームを移植する。
- `DesktopHero.module.css` をhomeUIの `style.css` ベースに再定義し、フォントサイズ・配置・色を揃える。
- 画像パス（`/img/...` → Next.js の `/assets` もしくは `/images`）の差分を吸収するユーティリティを用意する。

**Cursor向け改善プロンプト案**
```
You are editing apps/hub/app/home/_components/DesktopHero.tsx and DesktopHero.module.css.
Port the missing decorative elements from homeUI/src/screens/Desktop/Desktop.tsx: add the curved text image, CPU/Friend CTA frames, and the username badge styling so the DOM structure matches the prototype.
Update DesktopHero.module.css so the layout and colors mirror homeUI/src/screens/Desktop/style.css (including typography, positioning, gradients, and button states).
Ensure asset paths use the existing Next.js public assets (apps/hub/public/assets or /images) and remove unused selectors left from the old layout.
```

### 2.2 CPU対戦ページへの動線不備
- ホームCTAが `/play/cpu` に遷移する実装のまま。【F:apps/hub/app/home/_components/DesktopHero.tsx†L18-L21】
- 一方でCPU対戦の設定ページは `/cpu/settings` で、そこから `/play/cpu` に遷移する想定になっている。【F:apps/hub/app/cpu/settings/page.tsx†L26-L29】
- `/play/cpu` はプレースホルダー画面であり、設定をすっ飛ばして遷移する動線はUX的に誤り。さらに、このページもTailwindクラスに依存しているため、スタイルが当たらず読みづらい。【F:apps/hub/app/play/cpu/page.tsx†L24-L47】

**原因**
- UI刷新時にCTAのリンク先を更新しておらず、旧プレースホルダーページへ直接飛ぶ状態になっている。
- Tailwind CSS を導入していないにもかかわらず、Tailwindユーティリティクラス（`min-h-screen`, `mx-auto`, `grid`, `bg-white` など）を大量に使っているため、期待する見た目にならない。【F:apps/hub/app/play/cpu/page.tsx†L24-L47】【F:apps/hub/package.json†L7-L38】

**改善提案**
- ホームCTA・CPU設定の遷移先を `/cpu/settings`（設定）→ `/play/cpu`（対戦画面）という順序に揃える。
- Tailwindに依存したスタイルを、既存のグローバルCSSもしくはCSS Moduleへ書き換えるか、Tailwindを正式に導入する。

**Cursor向け改善プロンプト案**
```
Update the CPU battle flow.
1. In apps/hub/app/home/_components/DesktopHero.tsx change the CPU CTA link to /cpu/settings.
2. In apps/hub/app/cpu/settings/page.tsx ensure handleStartGame navigates to /play/cpu only after validating settings, and adjust any copy to reflect the two-step flow.
3. Replace Tailwind-only classNames in apps/hub/app/play/cpu/page.tsx and apps/hub/app/cpu/settings/page.tsx with styles defined either in globals.css or new CSS modules so the pages render correctly without Tailwind.
```

### 2.3 フレンド対戦ルーム作成画面の崩れ
- 画面本体（`FriendRoomLayout` / `RoomSettingsForm`）内で `grid`, `flex`, `gap-3`, `inline-flex` などTailwindのユーティリティクラスを使っている。【F:apps/hub/app/friend/create/page.tsx†L120-L153】【F:apps/hub/components/ui/RoomSettingsForm.tsx†L20-L55】
- プロジェクトにはTailwind設定・依存がなく、クラスは効かない（`package.json` にもtailwind系依存が存在しない）。【F:apps/hub/package.json†L7-L38】
- その結果、期待した段組み・スペーシング・ボタン装飾が適用されず、UIが崩れて見える。

**原因**
- UI刷新時にTailwind導入を前提にコーディングしたが、Next.jsアプリにはTailwindが組み込まれていない。

**改善提案**
- Tailwindを導入する（設定ファイル、PostCSS、`globals.css` での`@tailwind` ディレクティブなどを追加）か、`globals.css`／CSS Module に同等のスタイルを実装する。
- 既存の`friend-room`系クラスを活用し、フォームセクションとボタンのレイアウトをCSSで整える。

**Cursor向け改善プロンプト案**
```
The friend room creation page cannot rely on Tailwind.
Refactor apps/hub/app/friend/create/page.tsx, apps/hub/components/ui/RoomSettingsForm.tsx, and related CSS so that all layout (grid/flex/gaps/buttons) uses the existing friend-room styles in apps/hub/app/globals.css or new CSS modules.
Remove unused Tailwind utility classNames after migrating the styling.
Optionally extract shared button styles into globals.css to keep FriendRoomLayout footer buttons consistent.
```

## 3. 今後のフォローアップ
- Tailwindを導入するか否かの方針を早急に決め、UI実装のベースラインを統一する。
- ホーム画面のアセット管理（`/assets` vs `/images` vs `/img`）を整理し、プロトタイプからの移植時に迷いが生じないようドキュメント化する。
- QA観点では、ホーム → CPU設定 → 対戦、ホーム → フレンド対戦 → ルーム作成 の一連の動線をE2Eテスト化し、再発防止を図る。

