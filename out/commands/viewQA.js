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
exports.openFileAt = openFileAt;
exports.viewQA = viewQA;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const storage_1 = require("../storage");
const decorations_1 = require("../decorations");
const webview_1 = require("../webview");
async function openFileAt(item) {
    const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!root) {
        vscode.window.showErrorMessage("Open a workspace folder first.");
        return;
    }
    const fullPath = path.join(root, item.filePath);
    try {
        const doc = await vscode.workspace.openTextDocument(fullPath);
        const editor = await vscode.window.showTextDocument(doc, { preview: false });
        const posStart = new vscode.Position(item.range.start.line, item.range.start.character);
        const posEnd = new vscode.Position(item.range.end.line, item.range.end.character);
        editor.revealRange(new vscode.Range(posStart, posEnd), vscode.TextEditorRevealType.InCenter);
        editor.selection = new vscode.Selection(posStart, posEnd);
    }
    catch (e) {
        vscode.window.showErrorMessage("Could not open file: " + String(e));
    }
}
async function viewQA() {
    const panel = vscode.window.createWebviewPanel("quizView", "Quiz: Questions & Answers", vscode.ViewColumn.One, {
        enableScripts: true
    });
    const all = await (0, storage_1.loadAll)();
    panel.webview.html = (0, webview_1.getWebviewHtml)(all, panel);
    const folders = (vscode.workspace.workspaceFolders || []).map(f => path.basename(f.uri.fsPath));
    panel.webview.postMessage({ studentFolders: folders });
    panel.webview.onDidReceiveMessage(async (msg) => {
        if (!msg || !msg.command)
            return;
        const cmd = msg.command;
        const id = msg.id;
        let items = await (0, storage_1.loadAll)();
        if (cmd === "open" && id) {
            const it = items.find((x) => x.id === id);
            if (it)
                await openFileAt(it);
            return;
        }
        if (cmd === "toggleExclude" && id) {
            const allItems = await (0, storage_1.loadAll)();
            const idx = allItems.findIndex(x => x.id === id);
            if (idx >= 0) {
                allItems[idx].exclude = msg.exclude;
                await (0, storage_1.saveAll)(allItems);
                panel.webview.html = (0, webview_1.getWebviewHtml)(await (0, storage_1.loadAll)(), panel);
            }
            return;
        }
        if (cmd === "delete" && id) {
            const choice = await vscode.window.showWarningMessage("Are you sure you want to delete this question?", { modal: true }, "Yes", "No");
            if (choice !== "Yes") {
                return;
            }
            items = items.filter((x) => x.id !== id);
            await (0, storage_1.saveAll)(items);
            panel.webview.html = (0, webview_1.getWebviewHtml)(await (0, storage_1.loadAll)(), panel);
            await (0, decorations_1.refreshAllDecorations)();
            return;
        }
        if (cmd === 'runCommand' && msg.name) {
            const allItems = await (0, storage_1.loadAll)();
            const target = allItems.find(x => x.id === msg.id);
            if (target) {
                await vscode.commands.executeCommand(msg.name, target);
            }
            return;
        }
        if (cmd === "refresh") {
            panel.webview.html = (0, webview_1.getWebviewHtml)(await (0, storage_1.loadAll)(), panel);
            await (0, decorations_1.refreshAllDecorations)();
            return;
        }
    }, undefined);
}
//# sourceMappingURL=viewQA.js.map