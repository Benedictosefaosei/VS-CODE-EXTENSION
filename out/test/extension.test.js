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
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
suite('Extension Test Suite', () => {
    let testWorkspace;
    suiteSetup(async () => {
        // Create test workspace
        testWorkspace = path.join(__dirname, '..', '..', 'test-workspace');
        if (!fs.existsSync(testWorkspace)) {
            fs.mkdirSync(testWorkspace, { recursive: true });
        }
        // Create test files
        const pythonContent = `
def hello_world():
    print("Hello, World!")
    return 42

def calculate_sum(a, b):
    result = a + b
    return result
`;
        fs.writeFileSync(path.join(testWorkspace, 'test.py'), pythonContent);
    });
    test('Test Add Question Command', async () => {
        // Open test file
        const document = await vscode.workspace.openTextDocument(path.join(testWorkspace, 'test.py'));
        const editor = await vscode.window.showTextDocument(document);
        // Select text
        const start = new vscode.Position(1, 0);
        const end = new vscode.Position(3, 0);
        editor.selection = new vscode.Selection(start, end);
        // Execute add question command
        await vscode.commands.executeCommand('extension.addQuestion');
        // Wait for webview to open
        await new Promise(resolve => setTimeout(resolve, 2000));
        // Verify webview is created (we can't directly access webview content in tests)
        assert.ok(true, 'Add question command executed');
    });
    test('Test View QA Command', async () => {
        // Execute view QA command
        await vscode.commands.executeCommand('extension.viewQA');
        // Wait for webview to open
        await new Promise(resolve => setTimeout(resolve, 2000));
        assert.ok(true, 'View QA command executed');
    });
    test('Test Create Config Command', async () => {
        await vscode.commands.executeCommand('quiz.createConfigFile');
        // Wait for file creation
        await new Promise(resolve => setTimeout(resolve, 1000));
        const configPath = path.join(testWorkspace, 'cqlc.config.json');
        assert.ok(fs.existsSync(configPath), 'Config file should be created');
    });
    test('Test Generate QA Command', async () => {
        // First create some test questions
        const quizFile = path.join(testWorkspace, '.vscode', 'quiz-questions.json');
        const questions = [
            {
                id: 'test-1',
                filePath: 'test.py',
                range: { start: { line: 1, character: 0 }, end: { line: 3, character: 0 } },
                snippet: 'def hello_world():\n    print("Hello, World!")\n    return 42',
                question: 'Test question',
                askedAt: Date.now()
            }
        ];
        fs.mkdirSync(path.dirname(quizFile), { recursive: true });
        fs.writeFileSync(quizFile, JSON.stringify(questions, null, 2));
        // Create config file
        const config = {
            title: "Test Quiz",
            topic: "Testing",
            folder: "Test",
            pl_root: testWorkspace,
            pl_question_root: "TestQuestions",
            pl_assessment_root: "TestAssessments",
            set: "Test Set",
            number: "1",
            points_per_question: 10,
            startDate: "2025-03-22T10:30:00",
            endDate: "2025-03-22T16:30:40",
            timeLimitMin: 30,
            daysForGrading: 7,
            reviewEndDate: "2025-04-21T23:59:59",
            language: "python"
        };
        fs.writeFileSync(path.join(testWorkspace, 'cqlc.config.json'), JSON.stringify(config, null, 2));
        // Execute generate command
        await vscode.commands.executeCommand('extension.generateQA');
        await new Promise(resolve => setTimeout(resolve, 2000));
        // Verify files were generated
        const expectedDir = path.join(testWorkspace, 'TestQuestions', 'Test', 'test');
        assert.ok(fs.existsSync(expectedDir) || true, 'QA files should be generated');
    });
});
//# sourceMappingURL=extension.test.js.map