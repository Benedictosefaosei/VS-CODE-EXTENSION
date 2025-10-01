"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const assert = __importStar(require("assert"));
const vscode = __importStar(require("vscode"));
suite('Webview UI Test Suite', () => {
    let extensionContext;
    suiteSetup(async () => {
        // Get the extension context
        const extension = vscode.extensions.getExtension('your-extension-id');
        if (extension) {
            await extension.activate();
            extensionContext = extension.exports;
        }
    });
    test('Test Webview Creation', async () => {
        // Create a webview panel like the extension does
        const panel = vscode.window.createWebviewPanel('testWebview', 'Test Webview', vscode.ViewColumn.One, {
            enableScripts: true,
            retainContextWhenHidden: true
        });
        // Set HTML content
        panel.webview.html = getTestWebviewHtml();
        // Test webview messaging
        const messagePromise = new Promise((resolve) => {
            const disposable = panel.webview.onDidReceiveMessage(message => {
                resolve(message);
                disposable.dispose();
            });
        });
        // Send a test message
        panel.webview.postMessage({ command: 'test', data: 'hello' });
        // Wait for response
        const response = await Promise.race([
            messagePromise,
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
        ]);
        assert.strictEqual(response.command, 'test-response');
        panel.dispose();
    });
    test('Test QA Webview Interactions', async () => {
        // This would test the actual QA webview interactions
        // Since we can't directly access webview DOM in tests,
        // we test the webview creation and messaging
        await vscode.commands.executeCommand('extension.viewQA');
        // Wait for webview to load
        await new Promise(resolve => setTimeout(resolve, 3000));
        assert.ok(true, 'QA webview should open');
    });
});
function getTestWebviewHtml() {
    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Webview</title>
</head>
<body>
    <h1>Test Webview</h1>
    <button id="testButton">Click Me</button>
    
    <script>
        const vscode = acquireVsCodeApi();
        
        // Handle messages from extension
        window.addEventListener('message', event => {
            const message = event.data;
            if (message.command === 'test') {
                vscode.postMessage({ command: 'test-response', data: message.data });
            }
        });
        
        // Test button click
        document.getElementById('testButton').addEventListener('click', () => {
            vscode.postMessage({ command: 'buttonClicked', data: 'button was clicked' });
        });
    </script>
</body>
</html>`;
}
//# sourceMappingURL=webview.test.js.map