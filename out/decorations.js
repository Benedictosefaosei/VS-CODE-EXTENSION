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
exports.decorationType = void 0;
exports.createDecorationType = createDecorationType;
exports.applyDecorationsToEditor = applyDecorationsToEditor;
exports.refreshAllDecorations = refreshAllDecorations;
exports.escapeHtml = escapeHtml;
exports.escapeMarkdown = escapeMarkdown;
exports.ensureStorageDir = ensureStorageDir;
const vscode = __importStar(require("vscode"));
const storage_1 = require("./storage");
const path = __importStar(require("path"));
function createDecorationType() {
    return vscode.window.createTextEditorDecorationType({
        backgroundColor: "rgba(102, 255, 102, 0.18)",
        isWholeLine: false,
        borderRadius: "2px"
    });
}
async function applyDecorationsToEditor(editor) {
    if (!editor)
        return;
    if (!exports.decorationType)
        exports.decorationType = createDecorationType();
    const docPath = vscode.workspace.asRelativePath(editor.document.uri);
    const all = await (0, storage_1.loadAll)();
    const decorations = [];
    for (const it of all) {
        if (it.filePath === docPath) {
            const start = new vscode.Position(Math.max(0, it.range.start.line), Math.max(0, it.range.start.character));
            const end = new vscode.Position(Math.max(0, it.range.end.line), Math.max(0, it.range.end.character));
            const range = new vscode.Range(start, end);
            const hoverMessage = new vscode.MarkdownString(`**Question:** ${escapeMarkdown(it.question)}\n\n**Answer:** ${escapeMarkdown(it.answer ?? "(not answered)")}`);
            decorations.push({ range, hoverMessage });
        }
    }
    editor.setDecorations(exports.decorationType, decorations);
}
async function refreshAllDecorations() {
    for (const editor of vscode.window.visibleTextEditors) {
        await applyDecorationsToEditor(editor);
    }
}
function escapeHtml(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function escapeMarkdown(s) {
    return s.replace(/\*/g, "\\*").replace(/_/g, "\\_");
}
// Separate function for storage directory creation without circular dependency
async function ensureStorageDir() {
    const { getStoragePath } = await Promise.resolve().then(() => __importStar(require("./storage")));
    const sp = getStoragePath();
    if (!sp)
        throw new Error("Open a workspace folder first.");
    const dir = path.dirname(sp);
    const fs = await Promise.resolve().then(() => __importStar(require("fs")));
    await fs.promises.mkdir(dir, { recursive: true });
}
//# sourceMappingURL=decorations.js.map