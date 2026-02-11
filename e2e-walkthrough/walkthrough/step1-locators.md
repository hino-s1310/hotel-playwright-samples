# Step 1: ロケータ式の定義の仕方

Playwright でE2Eテストを書くとき、最初に学ぶべきことは**ロケータ（Locator）**です。
ロケータは「ページ上のどの要素を操作するか」を指定する式で、テストの安定性を大きく左右します。

---

## ロケータとは

ロケータは Playwright が提供する要素取得の仕組みです。
DOM から要素を検索し、クリック・入力・テキスト取得などの操作対象を特定します。

```typescript
import { Page, Locator } from "@playwright/test";

// Locator 型として定義する
private emailInput: Locator;
```

ロケータは**宣言時ではなくアクション実行時に要素を解決**するため、
ページ遷移や非同期描画にも強い設計になっています。

---

## 1. ID セレクタ — `page.locator()`

最もシンプルなロケータです。HTML の `id` 属性や CSS セレクタで要素を特定します。

### このリポジトリでの例: loginPage.ts

```typescript
// playwright/src/pages/loginPage.ts

export class LoginPage extends BasePage {
    private emailInput: Locator;
    private passwordInput: Locator;
    private loginButton: Locator;

    constructor(page: Page) {
        super(page);
        this.emailInput    = page.locator("#email");
        this.passwordInput = page.locator("#password");
        this.loginButton   = page.locator("#login-button");
    }
}
```

> [loginPage.ts を開いて確認する](command:e2eWalkthrough.open.loginPage)

**特徴**
- `#email` のように CSS セレクタをそのまま使える
- HTML 側に一意な `id` が振られている場合に有効
- 動的に生成される `id` や、フレームワークが付与するランダムな `id` には不向き

---

## 2. ロールベースのロケータ — `page.getByRole()`（推奨）

WAI-ARIA ロールとアクセシブルネームを使って要素を特定します。
**Playwright が最も推奨する方法**で、アクセシビリティの観点からも優れています。

### このリポジトリでの例: signupPage.ts

```typescript
// playwright/src/pages/signupPage.ts

export class SignupPage extends BasePage {
    private username: Locator;
    private email: Locator;
    private password: Locator;
    private confirmPassword: Locator;
    private signupButton: Locator;

    constructor(page: Page) {
        super(page);
        this.username        = page.getByRole("textbox", { name: "氏名 必須" });
        this.email           = page.getByRole("textbox", { name: "メールアドレス 必須" });
        this.password        = page.getByRole("textbox", { name: "パスワード 必須" });
        this.confirmPassword = page.getByRole("textbox", { name: "パスワード（確認） 必須" });
        this.signupButton    = page.getByRole("button", { name: "登録" });
    }
}
```

> [signupPage.ts を開いて確認する](command:e2eWalkthrough.open.signupPage)

**特徴**
- HTML の構造変更（クラス名やID の変更）に強い
- 要素のロールとラベルで特定するため、意味的に正しいセレクタになる
- ユーザーが実際に「見ている/操作している」ものとテストが一致する

### ロールの種類

| ロール | 対応する HTML 要素例 |
|---------|---------------------|
| `textbox` | `<input type="text">`, `<textarea>` |
| `button` | `<button>`, `<input type="submit">` |
| `link` | `<a href="...">` |
| `spinbutton` | `<input type="number">` |
| `combobox` | `<select>` |
| `checkbox` | `<input type="checkbox">` |

---

## 3. コンポーネント内のロケータ定義

ヘッダーやフッターなど、複数のページで共通して使うUI部品は
**コンポーネントとしてロケータを分離**して定義します。

### このリポジトリでの例: header.ts

```typescript
// playwright/src/components/header.ts

export type HeaderMenu = "ホーム" | "宿泊予約" | "会員登録"
                       | "マイページ" | "ログイン" | "ログアウト";

export class Header extends BaseComponent {
    private homeLink: Locator;
    private reservationLink: Locator;
    private registrationLink: Locator;
    private myPageLink: Locator;
    private loginButton: Locator;
    private logoutButton: Locator;

    constructor(protected page: Page) {
        super(page);
        this.homeLink         = page.getByRole("link", { name: "ホーム" });
        this.reservationLink  = page.getByRole("link", { name: "宿泊予約" });
        this.registrationLink = page.getByRole("link", { name: "会員登録" });
        this.myPageLink       = page.getByRole("link", { name: "マイページ" });
        this.loginButton      = page.getByRole("button", { name: "ログイン" });
        this.logoutButton     = page.getByRole("button", { name: "ログアウト" });
    }
}
```

> [header.ts を開いて確認する](command:e2eWalkthrough.open.header)

**ポイント**
- `link` と `button` でロールを使い分けている
- TypeScript のユニオン型 (`HeaderMenu`) でメニュー名を型安全に管理
- どのページからでも `page.header.selectHeaderMenu('ログイン')` のように呼び出せる

---

## 4. 複数ロケータ戦略の混在: reservationPage.ts

実際のプロジェクトでは、要素の特性に応じて複数の戦略を組み合わせます。

```typescript
// playwright/src/pages/reservationPage.ts

// ロールベース — フォーム入力要素
this.checkinDate    = page.getByRole("textbox", { name: "宿泊日 必須" });
this.stay           = page.getByRole("spinbutton", { name: "宿泊数 必須" });
this.guestCount     = page.getByRole("spinbutton", { name: "人数 必須" });
this.confirmOption  = page.getByRole("combobox", { name: "確認のご連絡 必須" });

// IDセレクタ — 表示専用要素（ロールが付与されていない）
this.totalBill      = page.locator("#total-bill");

// ロールベース — ボタン
this.submitButton   = page.getByRole("button", { name: "予約内容を確認する" });
```

> [reservationPage.ts を開いて確認する](command:e2eWalkthrough.open.reservationPage)

---

## ロケータの推奨優先順位

Playwright 公式ドキュメントが推奨する選択順序:

| 優先度 | メソッド | 用途 |
|--------|---------|------|
| 1 | `getByRole()` | ロール + アクセシブルネーム |
| 2 | `getByLabel()` | フォームのラベルテキスト |
| 3 | `getByPlaceholder()` | プレースホルダーテキスト |
| 4 | `getByText()` | 要素のテキストコンテンツ |
| 5 | `getByTestId()` | `data-testid` 属性 |
| 6 | `locator()` | CSS セレクタ / ID |
| 7 | XPath | **避けるべき**（構造変更に弱い） |

> **このリポジトリでは XPath を一切使用していません。**
> `getByRole()` を最優先とし、ロールが付かない要素にのみ `locator("#id")` を使っています。

---

## まとめ

- **ロケータは `private` プロパティ**として定義し、外部から直接アクセスさせない
- **`getByRole()` を優先**し、テストの安定性とアクセシビリティを両立する
- 同じ要素のロケータは **1箇所で定義** して DRY を守る
- 共通UIパーツは **コンポーネントとして分離** する

次のステップでは、これらのロケータをどのようにページオブジェクトとして構造化するかを学びます。
