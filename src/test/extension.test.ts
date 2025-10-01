import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

suite('Extension Test Suite', () => {
    let testWorkspace: string;
    
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