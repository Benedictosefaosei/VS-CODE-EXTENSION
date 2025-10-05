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
exports.STORAGE_REL_PATH = void 0;
exports.getWorkspaceRoot = getWorkspaceRoot;
exports.getStoragePath = getStoragePath;
exports.ensureStorageDir = ensureStorageDir;
exports.loadAll = loadAll;
exports.saveAll = saveAll;
exports.makeId = makeId;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const vscode = __importStar(require("vscode"));
exports.STORAGE_REL_PATH = ".vscode/quiz-questions.json";
function getWorkspaceRoot() {
    const wf = vscode.workspace.workspaceFolders;
    if (!wf || wf.length === 0) {
        return undefined;
    }
    return wf[0].uri.fsPath;
}
function getStoragePath() {
    const root = getWorkspaceRoot();
    if (!root)
        return undefined;
    return path.join(root, exports.STORAGE_REL_PATH);
}
async function ensureStorageDir() {
    const sp = getStoragePath();
    if (!sp)
        throw new Error("Open a workspace folder first.");
    const dir = path.dirname(sp);
    await fs.promises.mkdir(dir, { recursive: true });
}
async function loadAll() {
    const sp = getStoragePath();
    if (!sp)
        return [];
    try {
        const raw = await fs.promises.readFile(sp, "utf8");
        const items = JSON.parse(raw);
        return Array.isArray(items) ? items : [];
    }
    catch (e) {
        return [];
    }
}
async function saveAll(items) {
    const sp = getStoragePath();
    if (!sp)
        throw new Error("Open a workspace folder first.");
    await ensureStorageDir();
    await fs.promises.writeFile(sp, JSON.stringify(items, null, 2), "utf8");
}
function makeId() {
    return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 9);
}
//# sourceMappingURL=storage.js.map