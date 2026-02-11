# Step 3: Spec の記述

Step 2 までで POM の各層が揃いました。
ここでは、それらを実際のテストファイル（Spec）でどのように使うかを学びます。

---

## テストファイルの全体構造

まず、最もシンプルな `login.spec.ts` の全体を見てみましょう。

```typescript
// playwright/tests/login.spec.ts

import { loginUsers } from '../src/data/users';
import { test } from './fixtures/fixtures';

for (const user of loginUsers) {
    test.describe(`ユーザー:${user.name}`, { tag: '@stable' }, () => {
        test.beforeEach(async ({ indexPage }) => {
            await indexPage.navigateTo(
                'https://hotel-example-site.takeyaqa.dev/ja/index.html'
            );
        });

        test(`ログイン機能テスト`, async ({ indexPage, loginFacade }) => {
            await indexPage.header.selectHeaderMenu('ログイン');
            await loginFacade.login(user.email, user.password);
            await loginFacade.validateUserInfo(user.name, user.email);
        });

        test.afterEach(async ({ mypagePage }) => {
            await mypagePage.header.selectHeaderMenu('ログアウト');
        });
    });
}
```

> [login.spec.ts を開いて確認する](command:e2eWalkthrough.open.loginSpec)

わずか 21 行でログインテストが完成しています。各要素を順に解説します。

---

## 1. カスタム Fixture の仕組み

### Fixture とは

Playwright の **Fixture** は、テストに必要なオブジェクト（ページオブジェクト・Facade など）を自動で生成・注入する仕組みです。テスト関数の引数にオブジェクト名を書くだけで、Playwright が自動で用意してくれます。

```typescript
// テスト関数の引数でオブジェクトを受け取る
test('テスト', async ({ indexPage, loginFacade }) => {
//                      ↑           ↑
//                Fixture が自動注入
});
```

### Fixture の定義

```typescript
// playwright/tests/fixtures/fixtures.ts

import { test as base } from '@playwright/test';
import { LoginPage } from '../../src/pages/loginPage';
import { IndexPage } from '../../src/pages/indexPage';
import { MypagePage } from '../../src/pages/mypagePage';
import { LoginFacade } from '../../src/facades/loginFacade';
// ... 他のインポート

// Fixture の型定義
type MyFixtures = {
  loginPage: LoginPage;
  indexPage: IndexPage;
  mypagePage: MypagePage;
  signupPage: SignupPage;
  loginFacade: LoginFacade;
  signupFacade: SignupFacade;
  reservationPage: ReservationPage;
  plansPage: PlansPage;
  reserveFacade: ReserveFacade;
  confirmPage: ConfirmPage;
};

// Playwright の base.extend で Fixture を登録
export const test = base.extend<MyFixtures>({
  // ページオブジェクト — page を受け取ってインスタンス化
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  indexPage: async ({ page }, use) => {
    await use(new IndexPage(page));
  },
  mypagePage: async ({ page }, use) => {
    await use(new MypagePage(page));
  },

  // Facade — 複数のページオブジェクトを組み合わせ
  loginFacade: async ({ page }, use) => {
    await use(new LoginFacade(new LoginPage(page), new MypagePage(page)));
  },
  reserveFacade: async ({ page }, use) => {
    await use(new ReserveFacade(
      new ReservationPage(page),
      new PlansPage(page),
      new ConfirmPage(page)
    ));
  },
});

export { expect } from '@playwright/test';
```

> [fixtures.ts を開いて確認する](command:e2eWalkthrough.open.fixtures)

**設計ポイント**
- `base.extend<MyFixtures>()` で Playwright の `test` を拡張
- 各 Fixture は `async ({ page }, use) =>` のパターンで定義
  - `page` は Playwright が自動で提供するブラウザページ
  - `use()` に渡したインスタンスがテストに注入される
- テストで使わない Fixture はインスタンス化されない（遅延評価）
- `export const test` を使うことで、テストファイルでは `import { test } from './fixtures/fixtures'` と書くだけ

---

## 2. テストデータの管理

テストデータは `src/data/` に分離して定義します。

### ユーザーデータ

```typescript
// playwright/src/data/users.ts

export interface User {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
}

export const loginUsers: User[] = [
    {
        name: '山田一郎',
        email: 'ichiro@example.com',
        password: 'password',
        confirmPassword: 'password'
    },
    {
        name: '松本さくら',
        email: 'sakura@example.com',
        password: 'pass1234',
        confirmPassword: 'pass1234'
    },
    // ... 他 2 名
];
```

> [users.ts を開いて確認する](command:e2eWalkthrough.open.users)

### 動的なテストデータ

予約データでは getter を使って**実行時に動的に計算**される値を定義しています:

```typescript
// playwright/src/data/reservationData.ts

export const reservation = {
    checkinDate: getTomorrowDate(),  // 明日の日付を動的に取得
    stay: "2",
    guestCount: "2",
    confirmOption: "希望しない",
    get totalBill() {                // 実行時に料金を計算
        return getReservationTotalBill();
    }
};
```

> [reservationData.ts を開いて確認する](command:e2eWalkthrough.open.reservationData)

**ポイント**: `get totalBill()` は呼び出されるたびに現在の日付をもとに
土日の割増料金を含む合計金額を再計算します。

---

## 3. テストの構造: describe / test / beforeEach / afterEach

### 基本構造

```typescript
test.describe('テストグループ名', { tag: '@stable' }, () => {

    test.beforeEach(async ({ indexPage }) => {
        // 各テストの前に実行 — 共通のセットアップ
        await indexPage.navigateTo('...');
    });

    test('テスト名', async ({ fixture1, fixture2 }) => {
        // テスト本体
    });

    test.afterEach(async ({ mypagePage }) => {
        // 各テストの後に実行 — クリーンアップ
        await mypagePage.header.selectHeaderMenu('ログアウト');
    });
});
```

| 要素 | 役割 |
|------|------|
| `test.describe` | テストをグループ化。`tag` でフィルタリング可能 |
| `test.beforeEach` | 各テスト前の共通セットアップ（ページ遷移など） |
| `test` | テスト本体 |
| `test.afterEach` | 各テスト後のクリーンアップ（ログアウトなど） |

---

## 4. データ駆動テスト

`login.spec.ts` では `for` ループでテストデータを回し、
**同じテストロジックを複数のユーザーに対して実行**しています。

```typescript
for (const user of loginUsers) {
    test.describe(`ユーザー:${user.name}`, { tag: '@stable' }, () => {
        // user ごとに describe ブロックが作られる
        test('ログイン機能テスト', async ({ indexPage, loginFacade }) => {
            await indexPage.header.selectHeaderMenu('ログイン');
            await loginFacade.login(user.email, user.password);
            await loginFacade.validateUserInfo(user.name, user.email);
        });
    });
}
```

`loginUsers` 配列に 4 ユーザーが定義されているため、
実行時には **4 つの独立したテスト** が生成されます:

```
  ユーザー:山田一郎
    ✓ ログイン機能テスト
  ユーザー:松本さくら
    ✓ ログイン機能テスト
  ユーザー:林潤
    ✓ ログイン機能テスト
  ユーザー:木村良樹
    ✓ ログイン機能テスト
```

---

## 5. Facade を活用した複雑なテスト

予約テストでは、複数の Facade を組み合わせてワークフロー全体をテストします。

```typescript
// playwright/tests/reservation.spec.ts

import { loginUsers, plan, reservation, confirm } from '../src/data';
import { test } from './fixtures/fixtures';

const loginUser = loginUsers[0];

test.describe(`ユーザー:${loginUser.name}`, { tag: '@stable' }, () => {
    test.beforeEach(async ({ indexPage }) => {
        await indexPage.navigateTo(
            'https://hotel-example-site.takeyaqa.dev/ja/index.html'
        );
    });

    test('予約機能テスト', async ({
        indexPage, mypagePage, loginFacade, reserveFacade
    }) => {
        // 1. ログイン
        await indexPage.header.selectHeaderMenu('ログイン');
        await loginFacade.login(loginUser.email, loginUser.password);
        await loginFacade.validateUserInfo(loginUser.name, loginUser.email);

        // 2. 予約
        await mypagePage.header.selectHeaderMenu('宿泊予約');
        await reserveFacade.reserve(plan, reservation, confirm);
    });

    test.afterEach(async ({ mypagePage }) => {
        await mypagePage.header.selectHeaderMenu('ログアウト');
    });
});
```

> [reservation.spec.ts を開いて確認する](command:e2eWalkthrough.open.reservationSpec)

**注目ポイント**
- `loginFacade` と `reserveFacade` の 2 つの Facade を使っている
- テストコードは **ビジネス用語** で書かれている（「ログイン」→「予約」）
- UI の詳細（どのボタンを押すか、どのフィールドに入力するか）はテストに現れない

---

## 6. タグによるテストの分類

```typescript
test.describe('テスト名', { tag: '@stable' }, () => { ... });
```

`@stable` タグを付けることで、実行時にタグでフィルタリングできます:

```bash
# @stable タグのテストだけ実行
npx playwright test --grep @stable

# @stable タグ以外のテストを実行
npx playwright test --grep-invert @stable
```

テストの成熟度や種類に応じてタグを使い分けることで、CI での実行対象を制御できます。

---

## Spec 記述のパターンまとめ

```
┌─────────────────────────────────────────────────────┐
│ import: カスタム test + テストデータ                     │
│                                                      │
│ for (ユーザーデータ) {            ← データ駆動テスト      │
│   describe('グループ名', tag) {                        │
│     beforeEach: ページ遷移       ← 共通セットアップ      │
│     test: Facade 呼び出し       ← テスト本体            │
│     afterEach: ログアウト        ← クリーンアップ        │
│   }                                                   │
│ }                                                     │
└─────────────────────────────────────────────────────┘
```

| 原則 | 実践 |
|------|------|
| テストデータを分離 | `src/data/` にデータファイルを配置 |
| Fixture で DI | `fixtures.ts` でページオブジェクト/Facade を注入 |
| ビジネス用語で記述 | Facade のメソッド名はユーザー操作に対応 |
| データ駆動 | `for` ループで複数パターンを自動生成 |
| セットアップ/クリーンアップ | `beforeEach` / `afterEach` で分離 |

次のステップでは、作成したテストの実行方法を学びます。
