# Step 2: Page Object Model の実装方法

Step 1 で学んだロケータを、テストから直接使うのではなく **Page Object Model（POM）** パターンで構造化します。POM は E2E テストの保守性を飛躍的に高める設計パターンです。

---

## POM とは何か

Page Object Model は、画面の UI 要素と操作を **1 つのクラスにカプセル化** するパターンです。

**POM を使わない場合:**

```typescript
// テストから直接ロケータを操作 → 変更に弱い
test('ログイン', async ({ page }) => {
    await page.locator("#email").fill("user@example.com");
    await page.locator("#password").fill("password");
    await page.locator("#login-button").click();
});
```

**POM を使う場合:**

```typescript
// ページオブジェクト経由で操作 → 変更はPOM内で完結
test('ログイン', async ({ loginFacade }) => {
    await loginFacade.login("user@example.com", "password");
});
```

UI が変更されても、**修正するのはページオブジェクトだけ** でテストコードは変わりません。

---

## このリポジトリのアーキテクチャ

このプロジェクトは 5 層構造で設計されています:

```
┌──────────────────────────────────────────────────┐
│  Spec（テストファイル）                              │
│    login.spec.ts, reservation.spec.ts             │
├──────────────────────────────────────────────────┤
│  Facade（ビジネスワークフロー）                       │
│    LoginFacade, ReserveFacade                     │
├──────────────────────────────────────────────────┤
│  Builder（操作手順のチェーン）                        │
│    LoginPageBuilder, ReservationPageBuilder       │
├──────────────────────────────────────────────────┤
│  Page Object / Component（UI要素 + アクション）      │
│    LoginPage, Header, ReservationPage            │
├──────────────────────────────────────────────────┤
│  BasePage / BaseComponent（共通機能）                │
│    navigateTo(), waitForPageLoad(), updatePage()  │
└──────────────────────────────────────────────────┘
```

下から順に見ていきましょう。

---

## 層1: BasePage — 全ページ共通の基底クラス

```typescript
// playwright/src/pages/basePage.ts

import { Page } from "@playwright/test";
import { Header } from "../components/header";

export class BasePage {
    public header: Header;

    constructor(protected page: Page) {
        this.page = page;
        this.header = new Header(page);
    }

    async navigateTo(url: string) {
        await this.page.goto(url);
    }

    async getPageTitle() {
        return await this.page.title();
    }

    async waitForPageLoad(): Promise<void> {
        await this.page.waitForLoadState('domcontentloaded');
    }

    updatePage(newPage: Page): void {
        (this as any).page = newPage;
        this.header.updatePage(newPage);
    }

    getPage(): Page {
        return this.page;
    }
}
```

> [basePage.ts を開いて確認する](command:e2eWalkthrough.open.basePage)

**設計ポイント**
- `page` を `protected` にして子クラスからアクセス可能に
- **Header コンポーネントを自動で組み込み** — 全ページで `this.header` が使える
- `updatePage()` でポップアップ等のページ切り替えに対応
- ナビゲーション・待機・タイトル取得など共通操作を提供

---

## 層2: ページオブジェクト — 各画面の UI をカプセル化

### LoginPage の例

```typescript
// playwright/src/pages/loginPage.ts

export class LoginPage extends BasePage {
    // ロケータは private — 外部から直接触れない
    private emailInput: Locator;
    private passwordInput: Locator;
    private loginButton: Locator;

    constructor(page: Page) {
        super(page);
        this.emailInput    = page.locator("#email");
        this.passwordInput = page.locator("#password");
        this.loginButton   = page.locator("#login-button");
    }

    // public メソッドで操作を公開
    async inputEmail(email: string): Promise<void> {
        await this.emailInput.fill(email);
    }

    async inputPassword(password: string): Promise<void> {
        await this.passwordInput.fill(password);
    }

    async clickLoginButton(): Promise<void> {
        await this.loginButton.click();
    }
}
```

> [loginPage.ts を開いて確認する](command:e2eWalkthrough.open.loginPage)

**設計ポイント**
- ロケータは **`private`** → 外部には `inputEmail()` などのメソッドだけを公開
- メソッド名は **ユーザー操作を表す動詞** で統一（`input~`, `click~`）
- `BasePage` を継承するため `navigateTo()` や `header` が自動で使える

---

## 層2': コンポーネント — 複数ページで共通の UI 部品

```typescript
// playwright/src/components/baseComponent.ts
export class BaseComponent {
    constructor(protected page: Page) {
        this.page = page;
    }

    updatePage(newPage: Page): void {
        (this as any).page = newPage;
    }
}
```

```typescript
// playwright/src/components/header.ts
export class Header extends BaseComponent {
    // ... ロケータ定義（Step 1 で確認済み）

    async selectHeaderMenu(menu: HeaderMenu) {
        switch (menu) {
            case "ホーム":    await this.homeLink.click();    break;
            case "宿泊予約":  await this.reservationLink.click(); break;
            case "ログイン":  await this.loginButton.click();  break;
            case "ログアウト": await this.logoutButton.click(); break;
            // ...
        }
    }
}
```

> [header.ts を開いて確認する](command:e2eWalkthrough.open.header)

**設計ポイント**
- `BaseComponent` は `BasePage` とは別の継承ツリー（ページではないため）
- **型安全な `HeaderMenu` 型** でメニュー名の typo を防止
- `BasePage` のコンストラクタで `new Header(page)` として組み込まれる

---

## 層3: Builder — 操作手順を流れるインターフェースで記述

```typescript
// playwright/src/builders/loginPageBuilder.ts

export class LoginPageBuilder {
    private actions: (() => Promise<void>)[] = [];

    constructor(private loginPage: LoginPage) {}

    email(email: string): LoginPageBuilder {
        this.actions.push(async () => {
            await this.loginPage.inputEmail(email);
        });
        return this;  // ← メソッドチェーンの要
    }

    password(password: string): LoginPageBuilder {
        this.actions.push(async () => {
            await this.loginPage.inputPassword(password);
        });
        return this;
    }

    clickLoginButton(): LoginPageBuilder {
        this.actions.push(async () => {
            await this.loginPage.clickLoginButton();
        });
        return this;
    }

    // すべてのアクションを順に実行
    async execute(): Promise<void> {
        for (const action of this.actions) {
            await action();
        }
    }
}
```

> [loginPageBuilder.ts を開いて確認する](command:e2eWalkthrough.open.loginPageBuilder)

**設計ポイント**
- **Fluent Interface** — 各メソッドが `this` を返すのでメソッドチェーンで書ける
- アクションを配列に蓄積し、`execute()` で一括実行
- `conditionalAction()` で条件分岐にも対応
- 使い方:

```typescript
await new LoginPageBuilder(loginPage)
    .email("user@example.com")
    .password("password")
    .clickLoginButton()
    .execute();
```

---

## 層4: Facade — ビジネスワークフローを 1 メソッドに集約

```typescript
// playwright/src/facades/loginFacade.ts

export class LoginFacade {
    private loginPageBuilder: LoginPageBuilder;
    private mypagePageBuilder: MypagePageBuilder;

    constructor(private loginPage: LoginPage, private mypagePage: MypagePage) {
        this.loginPageBuilder  = new LoginPageBuilder(loginPage);
        this.mypagePageBuilder = new MypagePageBuilder(mypagePage);
    }

    // ログインのワークフロー全体
    async login(email: string, password: string): Promise<void> {
        await this.loginPageBuilder
            .email(email)
            .password(password)
            .clickLoginButton()
            .execute();
    }

    // ユーザー情報の検証
    async validateUserInfo(username: string, email: string): Promise<void> {
        await this.mypagePageBuilder
            .waitForPageLoad()
            .ensureUsernameVisible()
            .ensureEmailVisible()
            .validateUsername(username)
            .validateEmail(email)
            .validate();
    }
}
```

> [loginFacade.ts を開いて確認する](command:e2eWalkthrough.open.loginFacade)

**設計ポイント**
- **複数の Builder を組み合わせ**てビジネスワークフローを構成
- テストからは `loginFacade.login(email, password)` の 1 行で呼べる
- 「ログインして → ユーザー情報を検証」の流れが Facade の責務

---

## 高度な例: ポップアップウィンドウの処理

予約フローでは新しいウィンドウが開きます。`ReserveFacade` ではこれを処理しています:

```typescript
// playwright/src/facades/reserveFacade.ts（一部抜粋）

// ポップアップを待機しつつクリックを実行
const [popupPage] = await Promise.all([
    this.plansPage.getPage().context().waitForEvent('page'),
    (async () => {
        await this.plansPageBuilder
            .waitForPageLoad()
            .clickReserveButton(plan.id)
            .execute();
    })()
]);

// ポップアップの読み込み完了を待機
await popupPage.waitForLoadState('load');
await popupPage.bringToFront();

// ページオブジェクトのインスタンスを切り替え
this.reservationPage.updatePage(popupPage);
this.confirmPage.updatePage(popupPage);
```

> [reserveFacade.ts を開いて確認する](command:e2eWalkthrough.open.reserveFacade)

`Promise.all` でポップアップの待機とクリックを並行実行し、レースコンディションを回避しています。
`updatePage()` で既存のページオブジェクトを新しいページコンテキストに差し替えます。

---

## ディレクトリ構成のまとめ

```
playwright/src/
├── pages/              ← ページオブジェクト（各画面の UI + アクション）
│   ├── basePage.ts     ← 全ページ共通の基底クラス
│   ├── loginPage.ts
│   ├── signupPage.ts
│   ├── reservationPage.ts
│   ├── plansPage.ts
│   ├── confirmPage.ts
│   ├── indexPage.ts
│   └── mypagePage.ts
├── components/         ← 共通 UI コンポーネント
│   ├── baseComponent.ts
│   └── header.ts
├── builders/           ← Fluent Interface ビルダー
│   ├── loginPageBuilder.ts
│   ├── reservationPageBuilder.ts
│   └── ...
├── facades/            ← ビジネスワークフロー
│   ├── loginFacade.ts
│   ├── signupFacade.ts
│   └── reserveFacade.ts
├── data/               ← テストデータ
│   ├── users.ts
│   └── reservationData.ts
└── util/               ← ヘルパー関数
    ├── dateHelper.ts
    └── priceHelper.ts
```

---

## まとめ

| 層 | 役割 | 例 |
|----|------|-----|
| **BasePage** | ナビゲーション・待機など共通機能 | `navigateTo()`, `waitForPageLoad()` |
| **Page Object** | UI 要素のカプセル化 + アクション | `loginPage.inputEmail()` |
| **Component** | 複数ページ共通の UI 部品 | `header.selectHeaderMenu()` |
| **Builder** | 操作手順をチェーンで記述 | `.email().password().execute()` |
| **Facade** | ビジネスワークフローの統合 | `loginFacade.login()` |

次のステップでは、これらの POM をテストファイル（Spec）でどう使うかを学びます。
