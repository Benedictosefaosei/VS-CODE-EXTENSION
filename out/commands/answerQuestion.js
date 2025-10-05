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
exports.answerQuestion = answerQuestion;
const vscode = __importStar(require("vscode"));
const storage_1 = require("../storage");
const decorations_1 = require("../decorations");
const viewQA_1 = require("./viewQA");
async function answerQuestion(itemArg) {
    let item = itemArg;
    const all = await (0, storage_1.loadAll)();
    if (!item) {
        const unanswered = all.filter((i) => !i.answer);
        if (unanswered.length === 0) {
            vscode.window.showInformationMessage("No unanswered questions found.");
            return;
        }
        const pick = await vscode.window.showQuickPick(unanswered.map((it) => ({ label: it.question, description: it.filePath, id: it.id })), { placeHolder: "Pick a question to answer" });
        if (!pick)
            return;
        item = all.find((i) => i.id === pick.id);
    }
    const openNow = "Open file & highlight";
    const skipOpen = "Answer now";
    const choice = await vscode.window.showInformationMessage("Open the file to review the snippet before answering?", openNow, skipOpen);
    if (choice === openNow) {
        await (0, viewQA_1.openFileAt)(item);
    }
    const ans = await vscode.window.showInputBox({ prompt: "Enter your answer" });
    if (ans === undefined)
        return;
    const allItems = await (0, storage_1.loadAll)();
    const idx = allItems.findIndex(x => x.id === item.id);
    if (idx >= 0) {
        allItems[idx].answer = ans;
        allItems[idx].answeredAt = Date.now();
        await (0, storage_1.saveAll)(allItems);
        vscode.window.showInformationMessage("Answer saved.");
        await (0, decorations_1.refreshAllDecorations)();
    }
}
//# sourceMappingURL=answerQuestion.js.map