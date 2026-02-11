# Step 4: テストの実行

ここまでで、ロケータ → POM → Spec の全体像を理解しました。
最後のステップでは、テストの実行方法と周辺ツールを学びます。

---

## 事前準備

テストを実行するには、まず依存パッケージとブラウザをインストールします。

```bash
cd playwright

# 依存パッケージのインストール
pnpm install

# ブラウザのインストール（Chromium のみ）
pnpm run install:chromium
```

---

## 1. 基本の実行コマンド

### ヘッドレス実行（デフォルト）

ブラウザを表示せずにバックグラウンドで実行します。CI や自動テストに最適です。

```bash
npx playwright test
```

> [テストを実行する](command:e2eWalkthrough.runTest)

### Headed 実行（ブラウザ表示あり）

ブラウザを開いて操作の様子を目で確認できます。テスト作成中やデバッグに便利です。

```bash
npx playwright test --headed
```

> [Headed モードで実行する](command:e2eWalkthrough.runTestHeaded)

### UI モード

対話的にテストを選択・実行できる専用の UI を起動します。
テストの一覧表示・個別実行・タイムトラベルデバッグが可能です。

```bash
npx playwright test --ui
```

> [UI モードで開く](command:e2eWalkthrough.runTestUI)

### デバッグモード

Playwright Inspector を起動し、ステップ実行や要素の検査ができます。
ロケータの確認やテストの問題調査に最適です。

```bash
npx playwright test --debug
```

> [デバッグモードで実行する](command:e2eWalkthrough.runTestDebug)

---

## 2. 実行オプション

### 特定のテストファイルだけ実行

```bash
# ログインテストだけ
npx playwright test tests/login.spec.ts

# 予約テストだけ
npx playwright test tests/reservation.spec.ts
```

### タグでフィルタリング

```bash
# @stable タグのテストだけ実行
npx playwright test --grep @stable

# @stable 以外を実行
npx playwright test --grep-invert @stable
```

### テスト名でフィルタリング

```bash
# 「ログイン」を含むテストだけ実行
npx playwright test --grep "ログイン"
```

### npm scripts（package.json で定義済み）

```json
{
  "scripts": {
    "test":         "playwright test",
    "test:headed":  "playwright test --headed",
    "test:debug":   "playwright test --debug",
    "test:ui":      "playwright test --ui",
    "report":       "playwright show-report"
  }
}
```

> [package.json を開いて確認する](command:e2eWalkthrough.open.packageJson)

---

## 3. 設定ファイル: playwright.config.ts

テストの振る舞いを制御する設定ファイルです。

```typescript
// playwright/playwright.config.ts

export default defineConfig({
  // テストファイルのディレクトリ
  testDir: './tests',

  // テストの並列実行
  fullyParallel: true,

  // CI では test.only を禁止
  forbidOnly: !!(process as any).env?.CI,

  // CI ではリトライ 2 回
  retries: (process as any).env?.CI ? 2 : 0,

  // CI ではワーカー数 1（安定性優先）
  workers: (process as any).env?.CI ? 1 : undefined,
```

> [playwright.config.ts を開いて確認する](command:e2eWalkthrough.open.playwrightConfig)

### レポーター設定

4 種類のレポーターが設定されています:

```typescript
  reporter: [
    // HTML レポート — ブラウザで閲覧可能な詳細レポート
    ['html', {
      outputFolder: 'playwright-report',
      open: 'never'
    }],
    // JSON レポート — プログラムから解析可能
    ['json', { outputFile: 'test-results/results.json' }],
    // JUnit XML — CI ツールとの連携用
    ['junit', { outputFile: 'test-results/results.xml' }],
    // list — ターミナルにテスト名を表示
    ['list']
  ],
```

### テスト共通設定

```typescript
  use: {
    // テスト対象の URL
    baseURL: 'https://hotel-example-site.takeyaqa.dev',

    // 失敗時のトレース収集（リトライ時のみ）
    trace: 'on-first-retry',

    // 失敗時のスクリーンショット
    screenshot: 'only-on-failure',

    // 失敗時の動画記録
    video: 'retain-on-failure',
  },
```

### ブラウザプロジェクト

```typescript
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Firefox, WebKit, Mobile 等はコメントアウトで準備済み
  ],
```

---

## 4. テストレポートの確認

テスト実行後、HTML レポートを確認できます:

```bash
npx playwright show-report
```

> [レポートを表示する](command:e2eWalkthrough.showReport)

HTML レポートには以下の情報が含まれます:
- 各テストの成否とかかった時間
- 失敗テストのエラーメッセージとスタックトレース
- 失敗時のスクリーンショット
- リトライ時のトレース

---

## 5. 失敗時の調査ツール

### トレースビューア

失敗したテストのトレースファイルを開いて、各ステップの画面状態を確認できます:

```bash
npx playwright show-trace test-results/*/trace.zip
```

トレースビューアでは:
- 各アクション時点の **DOM スナップショット** が閲覧可能
- ネットワークリクエストの詳細を確認
- 各ステップの **前後のスクリーンショット** を比較
- コンソールログの確認

### Codegen（コード生成）

ブラウザ操作を記録して Playwright コードを自動生成します。
新しいテストの作成やロケータの調査に便利です:

```bash
npx playwright codegen https://hotel-example-site.takeyaqa.dev/ja/index.html
```

---

## 6. Docker での実行

CI 環境や環境を統一したい場合は Docker で実行できます。

```yaml
# docker-compose.yml
playwright:
  build: ./playwright
  working_dir: /e2e
  volumes:
    - ./playwright:/e2e
  command: ["npx", "playwright", "test"]
```

```bash
# Docker で実行
docker-compose run playwright
```

---

## 7. CI/CD での実行（GitHub Actions）

このリポジトリには GitHub Actions のワークフローが用意されています:

```yaml
# .github/workflows/playwright-tests.yml
# PR に 'playwright-tests' ラベルを付けると実行

- name: Install dependencies
  run: pnpm install
  working-directory: playwright

- name: Install browsers
  run: pnpm exec playwright install --with-deps chromium
  working-directory: playwright

- name: Run tests
  run: pnpm exec playwright test --reporter=dot
  working-directory: playwright
```

CI で設定が変わるポイント:
| 設定 | ローカル | CI |
|------|---------|-----|
| リトライ | 0 回 | 2 回 |
| ワーカー数 | 自動（CPU数） | 1 |
| `test.only` | 許可 | エラー |
| レポーター | list + html | dot |

---

## 実行コマンド早見表

| コマンド | 用途 |
|---------|------|
| `npx playwright test` | ヘッドレス実行 |
| `npx playwright test --headed` | ブラウザ表示あり |
| `npx playwright test --ui` | UI モード |
| `npx playwright test --debug` | デバッグモード |
| `npx playwright test --grep @stable` | タグでフィルタ |
| `npx playwright test tests/login.spec.ts` | ファイル指定 |
| `npx playwright show-report` | HTML レポート表示 |
| `npx playwright codegen <URL>` | コード生成 |

---

## ウォークスルー完了

おつかれさまでした。この 4 ステップで以下を学びました:

1. **ロケータ式の定義** — `getByRole()` を優先し、安定したセレクタを書く
2. **POM の実装** — BasePage → Page Object → Builder → Facade の層構造
3. **Spec の記述** — Fixture・データ駆動・Facade で読みやすいテストを書く
4. **テストの実行** — CLI・UI・デバッグの使い分けと CI 連携

実際にテストを実行して、コードを読み、自分でテストを追加してみてください。
