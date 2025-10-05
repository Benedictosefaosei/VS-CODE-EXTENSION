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
exports.addQuestion = addQuestion;
const vscode = __importStar(require("vscode"));
const storage_1 = require("../storage");
const decorations_1 = require("../decorations");
async function addQuestion() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage("Open a file and select a portion of code first.");
        return;
    }
    const sel = editor.selection;
    if (sel.isEmpty) {
        vscode.window.showErrorMessage("Please select the code you want to ask about.");
        return;
    }
    const snippet = editor.document.getText(sel);
    const relPath = vscode.workspace.asRelativePath(editor.document.uri);
    const panel = vscode.window.createWebviewPanel("quizAddQuestion", "Add Quiz Question", vscode.ViewColumn.Beside, { enableScripts: true });
    const nonce = (0, storage_1.makeId)();
    panel.webview.html = `<!DOCTYPE html>
    <html lang="en">
    <head>
    <meta charset="utf-8">
    <meta http-equiv="Content-Security-Policy"
          content="default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Add Question</title>
    <style nonce="${nonce}">
      body { font-family: sans-serif; padding: 16px; }
      pre  { background:#f8f8f8; padding:8px; border-radius:4px; max-height:200px; overflow:auto; }
      textarea { width:100%; min-height:120px; margin-top:8px; padding:8px; font-family:inherit; font-size:14px; }
      .buttons { margin-top:12px; display:flex; gap:8px; }
      button { padding:6px 12px; border-radius:6px; cursor:pointer; border:none; }
      .save { background:#4caf50; color:white; }
      .cancel { background:#ccc; }
    </style>
    </head>
    <body>
      <h2>Add Question</h2>
      <p><strong>File:</strong> ${(0, decorations_1.escapeHtml)(relPath)}</p>
      <p><strong>Selected Code:</strong></p>
      <pre>${(0, decorations_1.escapeHtml)(snippet)}</pre>

      <label for="question">Your question:</label>
      <textarea id="question" placeholder="Type your question here"></textarea>

      <div class="buttons">
        <button class="save" id="save">Save</button>
        <button class="cancel" id="cancel">Cancel</button>
      </div>

    <script nonce="${nonce}">
      const vscode = acquireVsCodeApi();
      document.getElementById('save').addEventListener('click', () => {
        const q = document.getElementById('question').value.trim();
        vscode.postMessage({ command: 'save', question: q });
      });
      document.getElementById('cancel').addEventListener('click', () => {
        vscode.postMessage({ command: 'cancel' });
      });
    </script>
    </body>
    </html>`;
    panel.webview.onDidReceiveMessage(async (msg) => {
        if (msg.command === "cancel") {
            panel.dispose();
            return;
        }
        if (msg.command === "save") {
            const q = (msg.question || "").trim();
            if (!q) {
                vscode.window.showErrorMessage("Question cannot be empty.");
                return;
            }
            const item = {
                id: (0, storage_1.makeId)(),
                filePath: relPath,
                range: {
                    start: { line: sel.start.line, character: sel.start.character },
                    end: { line: sel.end.line, character: sel.end.character }
                },
                snippet,
                question: q,
                askedAt: Date.now()
            };
            const all = await (0, storage_1.loadAll)();
            all.push(item);
            await (0, storage_1.saveAll)(all);
            await (0, decorations_1.refreshAllDecorations)();
            vscode.window.showInformationMessage("Question saved.");
            panel.dispose();
        }
    }, undefined);
}
//# sourceMappingURL=addQuestion.js.map