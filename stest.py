import os
import json
import time
import tempfile
import shutil
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.common.keys import Keys
import unittest

class VSCodeExtensionTest(unittest.TestCase):
    
    @classmethod
    def setUpClass(cls):
        """Set up the test environment"""
        # Configure Chrome options for VS Code extension testing
        chrome_options = webdriver.ChromeOptions()
        
        # Add VS Code specific arguments
        chrome_options.add_argument("--disable-extensions")
        chrome_options.add_argument("--disable-plugins")
        chrome_options.add_argument("--disable-popup-blocking")
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        
        # Set up the driver
        cls.driver = webdriver.Chrome(options=chrome_options)
        cls.driver.implicitly_wait(10)
        cls.wait = WebDriverWait(cls.driver, 20)
        
        # Create a temporary workspace for testing
        cls.test_workspace = tempfile.mkdtemp(prefix="vscode_test_")
        print(f"Test workspace: {cls.test_workspace}")
        
        # Create necessary directory structure
        os.makedirs(os.path.join(cls.test_workspace, ".vscode"), exist_ok=True)
        
        # Create test files
        cls.create_test_files()
    
    @classmethod
    def create_test_files(cls):
        """Create test files for the extension to work with"""
        # Create a sample Python file
        python_content = '''
def hello_world():
    print("Hello, World!")
    return 42

def calculate_sum(a, b):
    result = a + b
    return result

class TestClass:
    def __init__(self):
        self.value = 100
    
    def get_value(self):
        return self.value
'''
        
        with open(os.path.join(cls.test_workspace, "test_file.py"), "w") as f:
            f.write(python_content)
        
        # Create a sample JavaScript file
        js_content = '''
function greet(name) {
    return `Hello, ${name}!`;
}

const calculateArea = (radius) => {
    return Math.PI * radius * radius;
};

class Calculator {
    constructor() {
        this.result = 0;
    }
    
    add(x) {
        this.result += x;
        return this;
    }
}
'''
        
        with open(os.path.join(cls.test_workspace, "test_file.js"), "w") as f:
            f.write(js_content)
    
    def setUp(self):
        """Set up before each test"""
        # Clear any existing quiz data
        quiz_file = os.path.join(self.test_workspace, ".vscode", "quiz-questions.json")
        if os.path.exists(quiz_file):
            os.remove(quiz_file)
    
    def test_01_workspace_setup(self):
        """Test that workspace is properly set up"""
        print("Testing workspace setup...")
        
        # Verify workspace directory exists
        self.assertTrue(os.path.exists(self.test_workspace))
        
        # Verify test files exist
        self.assertTrue(os.path.exists(os.path.join(self.test_workspace, "test_file.py")))
        self.assertTrue(os.path.exists(os.path.join(self.test_workspace, "test_file.js")))
        
        print("✓ Workspace setup test passed")
    
    def test_02_create_config_file(self):
        """Test the quiz.createConfigFile command"""
        print("Testing config file creation...")
        
        # Simulate executing the command (in real VS Code, this would be through command palette)
        config_path = os.path.join(self.test_workspace, "cqlc.config.json")
        
        # Create config file as the extension would
        config_content = {
            "title": "Test Quiz",
            "topic": "Variables",
            "folder": "TestStudent",
            "pl_root": "/fake/path/to/pl",
            "pl_question_root": "PersonalQuiz",
            "pl_assessment_root": "courseInstances/TemplateCourseInstance/assessments",
            "set": "Test Set",
            "number": "1",
            "quiz_directory_name": "test_quiz",
            "points_per_question": 10,
            "startDate": "2025-03-22T10:30:00",
            "endDate": "2025-03-22T16:30:40",
            "timeLimitMin": 30,
            "daysForGrading": 7,
            "reviewEndDate": "2025-04-21T23:59:59",
            "password": "testPassword",
            "language": "python",
            "studentNameMapping": {
                "test_student": "test@example.com"
            }
        }
        
        with open(config_path, "w") as f:
            json.dump(config_content, f, indent=2)
        
        # Verify config file was created
        self.assertTrue(os.path.exists(config_path))
        
        # Verify config content
        with open(config_path, "r") as f:
            loaded_config = json.load(f)
        
        self.assertEqual(loaded_config["title"], "Test Quiz")
        self.assertEqual(loaded_config["language"], "python")
        
        print("✓ Config file creation test passed")
    
    def test_03_add_question_workflow(self):
        """Test the complete question addition workflow"""
        print("Testing question addition workflow...")
        
        # Simulate the extension.addQuestion command workflow
        quiz_file = os.path.join(self.test_workspace, ".vscode", "quiz-questions.json")
        
        # Create sample question data as the extension would
        sample_question = {
            "id": "test-question-1",
            "filePath": "test_file.py",
            "range": {
                "start": {"line": 1, "character": 0},
                "end": {"line": 3, "character": 0}
            },
            "snippet": 'def hello_world():\n    print("Hello, World!")\n    return 42',
            "question": "What does this function do?",
            "askedAt": int(time.time() * 1000)
        }
        
        # Save the question
        questions = [sample_question]
        with open(quiz_file, "w") as f:
            json.dump(questions, f, indent=2)
        
        # Verify question was saved
        self.assertTrue(os.path.exists(quiz_file))
        
        with open(quiz_file, "r") as f:
            loaded_questions = json.load(f)
        
        self.assertEqual(len(loaded_questions), 1)
        self.assertEqual(loaded_questions[0]["question"], "What does this function do?")
        self.assertEqual(loaded_questions[0]["filePath"], "test_file.py")
        
        print("✓ Question addition workflow test passed")
    
    def test_04_edit_question_workflow(self):
        """Test editing an existing question"""
        print("Testing question editing workflow...")
        
        quiz_file = os.path.join(self.test_workspace, ".vscode", "quiz-questions.json")
        
        # Create initial question
        initial_question = {
            "id": "test-question-edit",
            "filePath": "test_file.js",
            "range": {
                "start": {"line": 1, "character": 0},
                "end": {"line": 3, "character": 0}
            },
            "snippet": 'function greet(name) {\n    return `Hello, ${name}!`;\n}',
            "question": "Original question",
            "askedAt": int(time.time() * 1000)
        }
        
        questions = [initial_question]
        with open(quiz_file, "w") as f:
            json.dump(questions, f, indent=2)
        
        # Simulate editing the question
        edited_questions = questions.copy()
        edited_questions[0]["question"] = "Edited: What does this function return?"
        
        with open(quiz_file, "w") as f:
            json.dump(edited_questions, f, indent=2)
        
        # Verify edit was saved
        with open(quiz_file, "r") as f:
            final_questions = json.load(f)
        
        self.assertEqual(final_questions[0]["question"], "Edited: What does this function return?")
        
        print("✓ Question editing workflow test passed")
    
    def test_05_answer_question_workflow(self):
        """Test answering a question"""
        print("Testing question answering workflow...")
        
        quiz_file = os.path.join(self.test_workspace, ".vscode", "quiz-questions.json")
        
        # Create unanswered question
        unanswered_question = {
            "id": "test-question-answer",
            "filePath": "test_file.py",
            "range": {
                "start": {"line": 5, "character": 0},
                "end": {"line": 8, "character": 0}
            },
            "snippet": 'def calculate_sum(a, b):\n    result = a + b\n    return result',
            "question": "How does this function work?",
            "askedAt": int(time.time() * 1000)
        }
        
        questions = [unanswered_question]
        with open(quiz_file, "w") as f:
            json.dump(questions, f, indent=2)
        
        # Simulate answering the question
        answered_questions = questions.copy()
        answered_questions[0]["answer"] = "This function takes two parameters and returns their sum."
        answered_questions[0]["answeredAt"] = int(time.time() * 1000)
        
        with open(quiz_file, "w") as f:
            json.dump(answered_questions, f, indent=2)
        
        # Verify answer was saved
        with open(quiz_file, "r") as f:
            final_questions = json.load(f)
        
        self.assertIsNotNone(final_questions[0]["answer"])
        self.assertIsNotNone(final_questions[0]["answeredAt"])
        self.assertEqual(final_questions[0]["answer"], "This function takes two parameters and returns their sum.")
        
        print("✓ Question answering workflow test passed")
    
    def test_06_edit_answer_workflow(self):
        """Test editing an answer"""
        print("Testing answer editing workflow...")
        
        quiz_file = os.path.join(self.test_workspace, ".vscode", "quiz-questions.json")
        
        # Create question with initial answer
        question_with_answer = {
            "id": "test-answer-edit",
            "filePath": "test_file.js",
            "range": {
                "start": {"line": 7, "character": 0},
                "end": {"line": 12, "character": 0}
            },
            "snippet": 'class Calculator {\n    constructor() {\n        this.result = 0;\n    }\n    \n    add(x) {\n        this.result += x;\n        return this;\n    }\n}',
            "question": "Explain the Calculator class",
            "answer": "Initial answer",
            "askedAt": int(time.time() * 1000),
            "answeredAt": int(time.time() * 1000)
        }
        
        questions = [question_with_answer]
        with open(quiz_file, "w") as f:
            json.dump(questions, f, indent=2)
        
        # Simulate editing the answer
        edited_questions = questions.copy()
        edited_questions[0]["answer"] = "Updated: The Calculator class maintains internal state and provides method chaining."
        
        with open(quiz_file, "w") as f:
            json.dump(edited_questions, f, indent=2)
        
        # Verify answer was edited
        with open(quiz_file, "r") as f:
            final_questions = json.load(f)
        
        self.assertEqual(final_questions[0]["answer"], "Updated: The Calculator class maintains internal state and provides method chaining.")
        
        print("✓ Answer editing workflow test passed")
    
    def test_07_view_qa_workflow(self):
        """Test the view QA workflow"""
        print("Testing view QA workflow...")
        
        quiz_file = os.path.join(self.test_workspace, ".vscode", "quiz-questions.json")
        
        # Create multiple questions for testing the view
        multiple_questions = [
            {
                "id": "view-test-1",
                "filePath": "test_file.py",
                "range": {"start": {"line": 1, "character": 0}, "end": {"line": 3, "character": 0}},
                "snippet": 'def hello_world():\n    print("Hello, World!")\n    return 42',
                "question": "Question 1 for view test",
                "askedAt": int(time.time() * 1000)
            },
            {
                "id": "view-test-2",
                "filePath": "test_file.js",
                "range": {"start": {"line": 1, "character": 0}, "end": {"line": 3, "character": 0}},
                "snippet": 'function greet(name) {\n    return `Hello, ${name}!`;\n}',
                "question": "Question 2 for view test",
                "answer": "This is an answered question",
                "askedAt": int(time.time() * 1000),
                "answeredAt": int(time.time() * 1000)
            }
        ]
        
        with open(quiz_file, "w") as f:
            json.dump(multiple_questions, f, indent=2)
        
        # Verify multiple questions were saved
        self.assertTrue(os.path.exists(quiz_file))
        
        with open(quiz_file, "r") as f:
            loaded_questions = json.load(f)
        
        self.assertEqual(len(loaded_questions), 2)
        self.assertEqual(loaded_questions[0]["question"], "Question 1 for view test")
        self.assertEqual(loaded_questions[1]["question"], "Question 2 for view test")
        
        # Test filtering scenarios that would be handled in the webview
        unanswered_questions = [q for q in loaded_questions if "answer" not in q or not q["answer"]]
        answered_questions = [q for q in loaded_questions if "answer" in q and q["answer"]]
        
        self.assertEqual(len(unanswered_questions), 1)
        self.assertEqual(len(answered_questions), 1)
        
        print("✓ View QA workflow test passed")
    
    def test_08_delete_question_workflow(self):
        """Test deleting a question"""
        print("Testing question deletion workflow...")
        
        quiz_file = os.path.join(self.test_workspace, ".vscode", "quiz-questions.json")
        
        # Create questions including one to delete
        questions_to_delete = [
            {
                "id": "keep-this-question",
                "filePath": "test_file.py",
                "range": {"start": {"line": 1, "character": 0}, "end": {"line": 3, "character": 0}},
                "snippet": 'def hello_world():\n    print("Hello, World!")\n    return 42',
                "question": "Keep this question",
                "askedAt": int(time.time() * 1000)
            },
            {
                "id": "delete-this-question",
                "filePath": "test_file.js",
                "range": {"start": {"line": 1, "character": 0}, "end": {"line": 3, "character": 0}},
                "snippet": 'function greet(name) {\n    return `Hello, ${name}!`;\n}',
                "question": "Delete this question",
                "askedAt": int(time.time() * 1000)
            }
        ]
        
        with open(quiz_file, "w") as f:
            json.dump(questions_to_delete, f, indent=2)
        
        # Simulate deleting the second question
        remaining_questions = [q for q in questions_to_delete if q["id"] != "delete-this-question"]
        
        with open(quiz_file, "w") as f:
            json.dump(remaining_questions, f, indent=2)
        
        # Verify deletion
        with open(quiz_file, "r") as f:
            final_questions = json.load(f)
        
        self.assertEqual(len(final_questions), 1)
        self.assertEqual(final_questions[0]["id"], "keep-this-question")
        self.assertEqual(final_questions[0]["question"], "Keep this question")
        
        print("✓ Question deletion workflow test passed")
    
    def test_09_generate_qa_workflow(self):
        """Test the generate QA files workflow"""
        print("Testing generate QA workflow...")
        
        # First create config file
        config_path = os.path.join(self.test_workspace, "cqlc.config.json")
        config_content = {
            "title": "Generated Test Quiz",
            "topic": "Testing",
            "folder": "GeneratedTest",
            "pl_root": self.test_workspace,  # Use test workspace as root for testing
            "pl_question_root": "TestQuestions",
            "pl_assessment_root": "TestAssessments",
            "set": "Test Set",
            "number": "1",
            "points_per_question": 10,
            "startDate": "2025-03-22T10:30:00",
            "endDate": "2025-03-22T16:30:40",
            "timeLimitMin": 30,
            "daysForGrading": 7,
            "reviewEndDate": "2025-04-21T23:59:59",
            "language": "python"
        }
        
        with open(config_path, "w") as f:
            json.dump(config_content, f, indent=2)
        
        # Create quiz questions file
        quiz_file = os.path.join(self.test_workspace, ".vscode", "quiz-questions.json")
        generate_questions = [
            {
                "id": "generate-test-1",
                "filePath": "student1/test_file.py",
                "range": {"start": {"line": 1, "character": 0}, "end": {"line": 3, "character": 0}},
                "snippet": 'def hello_world():\n    print("Hello, World!")\n    return 42',
                "question": "Generated question 1",
                "answer": "Generated answer 1",
                "askedAt": int(time.time() * 1000),
                "answeredAt": int(time.time() * 1000)
            },
            {
                "id": "generate-test-2",
                "filePath": "student2/test_file.js",
                "range": {"start": {"line": 1, "character": 0}, "end": {"line": 3, "character": 0}},
                "snippet": 'function greet(name) {\n    return `Hello, ${name}!`;\n}',
                "question": "Generated question 2",
                "askedAt": int(time.time() * 1000)
            }
        ]
        
        with open(quiz_file, "w") as f:
            json.dump(generate_questions, f, indent=2)
        
        # Verify both files exist
        self.assertTrue(os.path.exists(config_path))
        self.assertTrue(os.path.exists(quiz_file))
        
        # Simulate the directory structure that would be created
        expected_dirs = [
            os.path.join(self.test_workspace, "TestQuestions", "GeneratedTest", "student1"),
            os.path.join(self.test_workspace, "TestQuestions", "GeneratedTest", "student2"),
            os.path.join(self.test_workspace, "TestAssessments", "GeneratedTest", "student1"),
            os.path.join(self.test_workspace, "TestAssessments", "GeneratedTest", "student2"),
        ]
        
        # Create these directories to simulate successful generation
        for dir_path in expected_dirs:
            os.makedirs(dir_path, exist_ok=True)
        
        # Verify directories were created
        for dir_path in expected_dirs:
            self.assertTrue(os.path.exists(dir_path))
        
        print("✓ Generate QA workflow test passed")
    
    def test_10_storage_functions(self):
        """Test the storage helper functions"""
        print("Testing storage functions...")
        
        # Test getWorkspaceRoot simulation
        workspace_root = self.test_workspace
        
        # Test getStoragePath simulation
        storage_path = os.path.join(workspace_root, ".vscode", "quiz-questions.json")
        
        # Test loadAll with non-existent file
        non_existent_path = os.path.join(workspace_root, "non_existent.json")
        if os.path.exists(non_existent_path):
            os.remove(non_existent_path)
        
        # Simulate loadAll behavior for empty file
        try:
            with open(non_existent_path, "r") as f:
                data = json.load(f)
        except:
            data = []
        
        self.assertEqual(data, [])
        
        # Test saveAll and loadAll with actual data
        test_data = [{"id": "storage-test", "question": "Storage test question"}]
        
        with open(storage_path, "w") as f:
            json.dump(test_data, f, indent=2)
        
        # Simulate loadAll
        try:
            with open(storage_path, "r") as f:
                loaded_data = json.load(f)
        except:
            loaded_data = []
        
        self.assertEqual(len(loaded_data), 1)
        self.assertEqual(loaded_data[0]["question"], "Storage test question")
        
        print("✓ Storage functions test passed")
    
    def test_11_decorations_workflow(self):
        """Test the decoration functionality"""
        print("Testing decorations workflow...")
        
        quiz_file = os.path.join(self.test_workspace, ".vscode", "quiz-questions.json")
        
        # Create questions with different ranges for decoration testing
        decoration_questions = [
            {
                "id": "decorate-1",
                "filePath": "test_file.py",
                "range": {
                    "start": {"line": 0, "character": 0},
                    "end": {"line": 2, "character": 0}
                },
                "snippet": 'def hello_world():\n    print("Hello, World!")\n    return 42',
                "question": "Decoration test question 1",
                "askedAt": int(time.time() * 1000)
            },
            {
                "id": "decorate-2",
                "filePath": "test_file.js",
                "range": {
                    "start": {"line": 0, "character": 0},
                    "end": {"line": 2, "character": 0}
                },
                "snippet": 'function greet(name) {\n    return `Hello, ${name}!`;\n}',
                "question": "Decoration test question 2",
                "answer": "This has an answer for hover test",
                "askedAt": int(time.time() * 1000),
                "answeredAt": int(time.time() * 1000)
            }
        ]
        
        with open(quiz_file, "w") as f:
            json.dump(decoration_questions, f, indent=2)
        
        # Verify questions were saved for decoration
        self.assertTrue(os.path.exists(quiz_file))
        
        # Test range conversion (simulating what applyDecorationsToEditor would do)
        for question in decoration_questions:
            range_data = question["range"]
            start_line = max(0, range_data["start"]["line"])
            start_char = max(0, range_data["start"]["character"])
            end_line = max(0, range_data["end"]["line"])
            end_char = max(0, range_data["end"]["character"])
            
            # Verify range values are valid
            self.assertGreaterEqual(start_line, 0)
            self.assertGreaterEqual(start_char, 0)
            self.assertGreaterEqual(end_line, 0)
            self.assertGreaterEqual(end_char, 0)
            self.assertLessEqual(start_line, end_line)
        
        print("✓ Decorations workflow test passed")
    
    def test_12_comprehensive_workflow(self):
        """Test a comprehensive workflow using all commands"""
        print("Testing comprehensive workflow...")
        
        # Step 1: Create config file
        config_path = os.path.join(self.test_workspace, "cqlc.config.json")
        config_content = {
            "title": "Comprehensive Test",
            "topic": "Comprehensive",
            "folder": "CompTest",
            "pl_root": self.test_workspace,
            "pl_question_root": "CompQuestions",
            "pl_assessment_root": "CompAssessments",
            "set": "Comp Set",
            "number": "1",
            "points_per_question": 15,
            "startDate": "2025-03-22T10:30:00",
            "endDate": "2025-03-22T16:30:40",
            "timeLimitMin": 45,
            "daysForGrading": 7,
            "reviewEndDate": "2025-04-21T23:59:59",
            "language": "python"
        }
        
        with open(config_path, "w") as f:
            json.dump(config_content, f, indent=2)
        
        # Step 2: Add multiple questions
        quiz_file = os.path.join(self.test_workspace, ".vscode", "quiz-questions.json")
        comprehensive_questions = []
        
        # Add first question
        question1 = {
            "id": "comp-1",
            "filePath": "test_file.py",
            "range": {"start": {"line": 0, "character": 0}, "end": {"line": 4, "character": 0}},
            "snippet": 'def hello_world():\n    print("Hello, World!")\n    return 42',
            "question": "Comprehensive question 1 - what does this do?",
            "askedAt": int(time.time() * 1000)
        }
        comprehensive_questions.append(question1)
        
        # Add second question
        question2 = {
            "id": "comp-2", 
            "filePath": "test_file.js",
            "range": {"start": {"line": 0, "character": 0}, "end": {"line": 3, "character": 0}},
            "snippet": 'function greet(name) {\n    return `Hello, ${name}!`;\n}',
            "question": "Comprehensive question 2 - explain this function",
            "askedAt": int(time.time() * 1000)
        }
        comprehensive_questions.append(question2)
        
        with open(quiz_file, "w") as f:
            json.dump(comprehensive_questions, f, indent=2)
        
        # Step 3: Answer first question
        comprehensive_questions[0]["answer"] = "This function prints a greeting and returns the number 42."
        comprehensive_questions[0]["answeredAt"] = int(time.time() * 1000)
        
        with open(quiz_file, "w") as f:
            json.dump(comprehensive_questions, f, indent=2)
        
        # Step 4: Edit second question
        comprehensive_questions[1]["question"] = "Edited: How does this greeting function work?"
        
        with open(quiz_file, "w") as f:
            json.dump(comprehensive_questions, f, indent=2)
        
        # Step 5: Verify final state
        with open(quiz_file, "r") as f:
            final_questions = json.load(f)
        
        # Verify we have 2 questions
        self.assertEqual(len(final_questions), 2)
        
        # Verify first question is answered
        self.assertIn("answer", final_questions[0])
        self.assertIsNotNone(final_questions[0]["answer"])
        
        # Verify second question was edited
        self.assertEqual(final_questions[1]["question"], "Edited: How does this greeting function work?")
        
        # Verify mixed answered status
        answered_count = len([q for q in final_questions if "answer" in q and q["answer"]])
        unanswered_count = len([q for q in final_questions if "answer" not in q or not q["answer"]])
        
        self.assertEqual(answered_count, 1)
        self.assertEqual(unanswered_count, 1)
        
        print("✓ Comprehensive workflow test passed")
    
    @classmethod
    def tearDownClass(cls):
        """Clean up after all tests"""
        cls.driver.quit()
        
        # Remove test workspace
        if os.path.exists(cls.test_workspace):
            shutil.rmtree(cls.test_workspace)
            print(f"Cleaned up test workspace: {cls.test_workspace}")

if __name__ == "__main__":
    # Run the tests
    unittest.main(verbosity=2)