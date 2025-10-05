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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const types_1 = require("./types");
const decorations_1 = require("./decorations");
const addQuestion_1 = require("./commands/addQuestion");
const editQuestion_1 = require("./commands/editQuestion");
const answerQuestion_1 = require("./commands/answerQuestion");
const editAnswer_1 = require("./commands/editAnswer");
const viewQA_1 = require("./commands/viewQA");
const createConfigFile_1 = require("./commands/createConfigFile");
const generateQA_1 = require("./commands/generateQA");
let decorationType;
function activate(context) {
    console.log("Quiz Annotator extension activated");
    (0, types_1.setExtensionContext)(context);
    decorationType = (0, decorations_1.createDecorationType)();
    context.subscriptions.push(decorationType);
    context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(async () => {
        await (0, decorations_1.refreshAllDecorations)();
    }));
    context.subscriptions.push(vscode.workspace.onDidOpenTextDocument(async () => {
        await (0, decorations_1.refreshAllDecorations)();
    }));
    context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(async () => {
        await (0, decorations_1.refreshAllDecorations)();
    }));
    // Register all commands
    context.subscriptions.push(vscode.commands.registerCommand("extension.addQuestion", addQuestion_1.addQuestion));
    context.subscriptions.push(vscode.commands.registerCommand("quiz.createConfigFile", createConfigFile_1.createConfigFile));
    context.subscriptions.push(vscode.commands.registerCommand("extension.editQuestion", editQuestion_1.editQuestion));
    context.subscriptions.push(vscode.commands.registerCommand("extension.answerQuestion", answerQuestion_1.answerQuestion));
    context.subscriptions.push(vscode.commands.registerCommand("extension.editAnswer", editAnswer_1.editAnswer));
    context.subscriptions.push(vscode.commands.registerCommand("extension.viewQA", viewQA_1.viewQA));
    context.subscriptions.push(vscode.commands.registerCommand("extension.generateQA", generateQA_1.generateQA));
    (async () => {
        await (0, decorations_1.ensureStorageDir)().catch(() => { });
        await (0, decorations_1.refreshAllDecorations)();
    })();
}
function deactivate() { }
//# sourceMappingURL=extension.js.map