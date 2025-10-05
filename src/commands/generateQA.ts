import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { loadAll } from "../storage";

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export async function generateQA() {
  const ws = vscode.workspace.workspaceFolders?.[0];
  if (!ws) {
    vscode.window.showErrorMessage("No workspace folder is open.");
    return;
  }
  const rootPath = ws.uri.fsPath;
  const quizFile = path.join(rootPath, ".vscode", "quiz-questions.json");
  if (!fs.existsSync(quizFile)) {
    vscode.window.showErrorMessage("No quiz-questions.json found in .vscode folder.");
    return;
  }

  let questionsData: any[];
  try {
    questionsData = JSON.parse(fs.readFileSync(quizFile, "utf8"));
    if (!questionsData.length) {
      vscode.window.showErrorMessage("quiz-questions.json exists but contains no questions.");
      return;
    }
    
    const originalCount = questionsData.length;
    questionsData = questionsData.filter(q => !q.exclude);
    const excludedCount = originalCount - questionsData.length;
    
    if (questionsData.length === 0) {
      vscode.window.showErrorMessage("All questions are excluded. No questions to generate.");
      return;
    }
    
    if (excludedCount > 0) {
      vscode.window.showInformationMessage(`Excluded ${excludedCount} question(s) from generation.`);
    }
  } catch (err: any) {
    vscode.window.showErrorMessage(`Error reading quiz-questions.json: ${err.message}`);
    return;
  }

  const configPath = path.join(rootPath, "cqlc.config.json");
  let config: any;

  if (!fs.existsSync(configPath)) {
    
    const defaultConfig = {
      "title": " Quiz_Title",
      "topic": "Quiz_Topic",
      "folder": "Quiz_Folder",
      "pl_root": "/Users/benedictoseisefa/Desktop/pl-gvsu-cis500dev-master",
      "pl_question_root": "PersonalQuiz",
      "pl_assessment_root": "courseInstances/TemplateCourseInstance/assessments",
      "set": "Custom Quiz",
      "number": "2",
      "quiz_directory_name": "cis163_p1",
      "points_per_question": 10,
      "startDate": new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0] + "T10:00:00", 
      "endDate": new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] + "T23:59:59",
      "timeLimitMin": 30,
      "daysForGrading": 7,
      "reviewEndDate": new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] + "T23:59:59",
      "password": "letMeIn",
      "language": "python",
      "studentNameMapping": {
        "benedictosefaosei": "oseisefb@mail.gvsu.edu",
        "william_williams": "williamsw@mail.gvsu.edu",
        "sam": "sam.test@mail.gvsu.edu",
        "antonio": "anto.test@ug.edu.gh",
        "caleb": "caleb.test@ug.edu.gh"
      }
    };

    try {
      await fs.promises.writeFile(configPath, JSON.stringify(defaultConfig, null, 2), "utf8");
      vscode.window.showInformationMessage(
        "Config file 'cqlc.config.json' was not found. A default config file has been created. Please modify it with your specific paths and settings, then run the generate command again.",
        { modal: true }
      );
      
      const doc = await vscode.workspace.openTextDocument(configPath);
      await vscode.window.showTextDocument(doc);
      return; 
    } catch (err: any) {
      vscode.window.showErrorMessage(`Failed to create config file: ${err.message}`);
      return;
    }
  }

  try {
    config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  } catch (err: any) {
    vscode.window.showErrorMessage(`Error reading config file: ${err.message}`);
    return;
  }

  const requiredFields = [
    "title", "topic", "folder", "pl_root", "pl_question_root", "pl_assessment_root",
    "set", "number", "points_per_question", "startDate", "endDate",
    "timeLimitMin", "daysForGrading", "reviewEndDate", "language"
  ];
  
  const missingFields = requiredFields.filter(field => !config[field]);
  if (missingFields.length > 0) {
    const openConfig = "Open Config File";
    const response = await vscode.window.showErrorMessage(
      `Config file is missing required fields: ${missingFields.join(', ')}. Please update the config file and try again.`,
      openConfig
    );
    
    if (response === openConfig) {
      const doc = await vscode.workspace.openTextDocument(configPath);
      await vscode.window.showTextDocument(doc);
    }
    return;
  }

  const questionsRoot = path.join(config.pl_root, "questions", config.pl_question_root, config.folder);
  const assessmentsRoot = path.join(config.pl_root, config.pl_assessment_root, config.folder);
  const instructorRoot = path.join(questionsRoot, "instructor");
  const instructorAssessRoot = path.join(assessmentsRoot, "instructor");

  [questionsRoot, assessmentsRoot, instructorRoot, instructorAssessRoot].forEach(p => {
    if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
  });

  const questionsByStudent: Record<string, any[]> = {};
  for (const q of questionsData) {
    const studentName = (q.filePath || "").split(/[\\/]/)[0] || "unknown_student";
    if (!questionsByStudent[studentName]) questionsByStudent[studentName] = [];
    questionsByStudent[studentName].push(q);
  }

  for (const [student, qs] of Object.entries(questionsByStudent)) {
    const studentQPath = path.join(questionsRoot, student);
    const studentAssessPath = path.join(assessmentsRoot, student);
    if (!fs.existsSync(studentQPath)) fs.mkdirSync(studentQPath, { recursive: true });
    if (!fs.existsSync(studentAssessPath)) fs.mkdirSync(studentAssessPath, { recursive: true });

    const validQuestions = qs.filter(q => !q.exclude);
    
    if (validQuestions.length === 0) {
      vscode.window.showInformationMessage(`No valid questions for student ${student}, skipping generation.`);
      continue;
    }

    validQuestions.forEach((question, index) => {
      const questionFolder = path.join(studentQPath, `question${index + 1}`);
      if (!fs.existsSync(questionFolder)) fs.mkdirSync(questionFolder, { recursive: true });

      const questionText = question.question || question.text || question.content || "No question content available.";
      const codeSnippet = question.code || question.highlightedCode || question.snippet || "// No code highlighted";

      const questionHtmlContent = `
        <pl-question-panel>
        <markdown>
        ${questionText}
        </markdown>
            <pl-code language="${config.language || 'python'}">
        ${codeSnippet}
        </pl-code>
        </pl-question-panel>
        `.trim();

      const questionHtmlFile = path.join(questionFolder, "question.html");
      fs.writeFileSync(questionHtmlFile, questionHtmlContent, "utf8");

      // Create info.json file
      const questionInfo = {
        uuid: generateUUID(),
        type: "v3",
        gradingMethod: "Manual",
        title: config.title,
        topic: config.topic
      };

      const infoJsonFile = path.join(questionFolder, "info.json");
      fs.writeFileSync(infoJsonFile, JSON.stringify(questionInfo, null, 2), "utf8");
    });

    // Generate infoAssessment.json for this student 
    const infoAssessment = {
      uuid: generateUUID(),
      type: "Exam",
      title: config.title,
      set: config.set,
      number: config.number,
      allowAccess: [
        {
          mode: "Public",
          uids: [student],
          credit: 100,
          timeLimitMin: config.timeLimitMin,
          startDate: config.startDate,
          endDate: config.endDate,
          password: config.password || "letMeIn"
        },
        {
          mode: "Public",
          credit: 0,
          startDate: config.reviewEndDate ? new Date(new Date(config.reviewEndDate).getTime() + 24 * 60 * 60 * 1000).toISOString() : new Date(new Date(config.endDate).getTime() + 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date(new Date(config.endDate).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          active: false
        }
      ],
      zones: [
        {
          questions: validQuestions.map((_, index) => ({
            id: `${config.pl_question_root}/${config.folder}/${student}/question${index + 1}`,
            points: config.points_per_question
          }))
        }
      ]
    };

    const assessmentFile = path.join(studentAssessPath, "infoAssessment.json");
    fs.writeFileSync(assessmentFile, JSON.stringify(infoAssessment, null, 2), "utf8");
  }

  const combinedQuestionsFolder = path.join(instructorRoot, "combined-questions");
  if (!fs.existsSync(combinedQuestionsFolder)) {
    fs.mkdirSync(combinedQuestionsFolder, { recursive: true });
  }

  let combinedHtmlContent = `
    <pl-question-panel>
    <markdown>
    # ${config.title} - All Student Questions
    <hr><br>
    </markdown>
    </pl-question-panel>
    `.trim();

  // Add all valid questions from all students
  for (const [student, qs] of Object.entries(questionsByStudent)) {
    const validQuestions = qs.filter(q => !q.exclude);
    
    if (validQuestions.length === 0) {
      continue; 
    }

    combinedHtmlContent += `
      <pl-question-panel>
      <markdown>
      ## Student: ${student}
      </markdown>
      </pl-question-panel>
      `;

    validQuestions.forEach((question, index) => {
      const questionText = question.question || question.text || question.content || "No question content available.";
      const codeSnippet = question.code || question.highlightedCode || question.snippet || "// No code highlighted";

      combinedHtmlContent += `
        <pl-question-panel>
        <markdown>
        ### Question ${index + 1}
        ${questionText}
        </markdown>
            <pl-code language="${config.language || 'python'}">
        ${codeSnippet}
        </pl-code>
        </pl-question-panel>
        <br><hr><br>
        `;
    });
  }

  // Write combined question.html
  const combinedQuestionHtmlFile = path.join(combinedQuestionsFolder, "question.html");
  fs.writeFileSync(combinedQuestionHtmlFile, combinedHtmlContent, "utf8");

  // Create combined info.json
  const combinedInfo = {
    uuid: generateUUID(),
    gradingMethod: "Manual",
    type: "v3",
    title: `${config.title} - All Questions`,
    topic: config.topic
  };

  const combinedInfoJsonFile = path.join(combinedQuestionsFolder, "info.json");
  fs.writeFileSync(combinedInfoJsonFile, JSON.stringify(combinedInfo, null, 2), "utf8");

  // Create combined infoAssessment.json for instructor - ONLY include valid questions
  const combinedAssessment = {
    uuid: generateUUID(),
    type: "Exam",
    title: `${config.title} - Instructor View`,
    set: config.set,
    number: config.number,
    allowAccess: [
      {
        mode: "Public",
        uids: ["instructor"],
        credit: 100,
        timeLimitMin: 0,
        startDate: config.startDate,
        endDate: new Date(new Date(config.endDate).getTime() + 365 * 24 * 60 * 60 * 1000).toISOString(), 
        password: "instructorAccess"
      }
    ],
    zones: [
      {
        questions: [
          {
            id: `${config.pl_question_root}/${config.folder}/instructor/combined-questions`,
            points: 1
          }
        ]
      }
    ]
  };

  const combinedAssessmentFile = path.join(instructorAssessRoot, "infoAssessment.json");
  fs.writeFileSync(combinedAssessmentFile, JSON.stringify(combinedAssessment, null, 2), "utf8");

  vscode.window.showInformationMessage("Generated QA files with student questions, combined instructor view, and all assessment files.");
}