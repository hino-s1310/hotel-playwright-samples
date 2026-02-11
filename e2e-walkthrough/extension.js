const vscode = require('vscode');
const path = require('path');

function activate(context) {
    // ワークスペースのルートフォルダを取得するヘルパー
    function getWorkspaceRoot() {
        const folders = vscode.workspace.workspaceFolders;
        if (folders && folders.length > 0) {
            return folders[0].uri;
        }
        return null;
    }

    // 指定されたファイルをサイドパネルで開くヘルパー
    function openFileInEditor(relativePath) {
        const root = getWorkspaceRoot();
        if (!root) {
            vscode.window.showErrorMessage('ワークスペースが開かれていません');
            return;
        }
        const fileUri = vscode.Uri.joinPath(root, relativePath);
        vscode.window.showTextDocument(fileUri, { viewColumn: vscode.ViewColumn.Beside });
    }

    // ターミナルでコマンドを実行するヘルパー
    function runInTerminal(name, command) {
        const root = getWorkspaceRoot();
        if (!root) {
            vscode.window.showErrorMessage('ワークスペースが開かれていません');
            return;
        }
        const terminal = vscode.window.createTerminal({
            name: name,
            cwd: vscode.Uri.joinPath(root, 'playwright').fsPath
        });
        terminal.show();
        terminal.sendText(command);
    }

    // --- ファイルを開くコマンド ---

    // Pages
    const fileCommands = {
        'loginPage':         'playwright/src/pages/loginPage.ts',
        'signupPage':        'playwright/src/pages/signupPage.ts',
        'basePage':          'playwright/src/pages/basePage.ts',
        'indexPage':         'playwright/src/pages/indexPage.ts',
        'mypagePage':        'playwright/src/pages/mypagePage.ts',
        'reservationPage':   'playwright/src/pages/reservationPage.ts',
        'plansPage':         'playwright/src/pages/plansPage.ts',
        'confirmPage':       'playwright/src/pages/confirmPage.ts',

        // Components
        'header':            'playwright/src/components/header.ts',
        'baseComponent':     'playwright/src/components/baseComponent.ts',

        // Builders
        'loginPageBuilder':       'playwright/src/builders/loginPageBuilder.ts',
        'reservationPageBuilder': 'playwright/src/builders/reservationPageBuilder.ts',
        'plansPageBuilder':       'playwright/src/builders/plansPageBuilder.ts',
        'confirmPageBuilder':     'playwright/src/builders/confirmPageBuilder.ts',
        'mypagePageBuilder':      'playwright/src/builders/mypagePageBuilder.ts',

        // Facades
        'loginFacade':       'playwright/src/facades/loginFacade.ts',
        'signupFacade':      'playwright/src/facades/signupFacade.ts',
        'reserveFacade':     'playwright/src/facades/reserveFacade.ts',

        // Data
        'users':             'playwright/src/data/users.ts',
        'reservationData':   'playwright/src/data/reservationData.ts',

        // Tests
        'loginSpec':         'playwright/tests/login.spec.ts',
        'signupSpec':        'playwright/tests/signup.spec.ts',
        'reservationSpec':   'playwright/tests/reservation.spec.ts',
        'fixtures':          'playwright/tests/fixtures/fixtures.ts',

        // Config
        'playwrightConfig':  'playwright/playwright.config.ts',
        'packageJson':       'playwright/package.json',
    };

    for (const [name, filePath] of Object.entries(fileCommands)) {
        const disposable = vscode.commands.registerCommand(
            `e2eWalkthrough.open.${name}`,
            () => openFileInEditor(filePath)
        );
        context.subscriptions.push(disposable);
    }

    // --- テスト実行コマンド ---

    context.subscriptions.push(
        vscode.commands.registerCommand('e2eWalkthrough.runTest', () => {
            runInTerminal('Playwright Test', 'npx playwright test');
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('e2eWalkthrough.runTestHeaded', () => {
            runInTerminal('Playwright Headed', 'npx playwright test --headed');
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('e2eWalkthrough.runTestUI', () => {
            runInTerminal('Playwright UI', 'npx playwright test --ui');
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('e2eWalkthrough.runTestDebug', () => {
            runInTerminal('Playwright Debug', 'npx playwright test --debug');
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('e2eWalkthrough.showReport', () => {
            runInTerminal('Playwright Report', 'npx playwright show-report');
        })
    );

    // ウォークスルーを開くコマンド
    context.subscriptions.push(
        vscode.commands.registerCommand('e2eWalkthrough.start', () => {
            vscode.commands.executeCommand(
                'workbench.action.openWalkthrough',
                'hotel-playwright-samples.e2e-testing-walkthrough#e2e-testing-walkthrough',
                true
            );
        })
    );
}

function deactivate() {}

module.exports = { activate, deactivate };
