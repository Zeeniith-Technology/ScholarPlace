import express from 'express';
import logincontroller from './controller/login.js';
import signupcontroller from './controller/Signup.js';
import examcontroller from './controller/exam.js';
import defaultdatacontroller from './controller/Defaultdata.js';
import superadmincontroller from './controller/superadmin/superadmin.js';
import collagecontroller from './controller/superadmin/collage.js';
import superadminAnalyticsController from './controller/superadmin/analytics.js';
import departmentController from './controller/superadmin/department.js';
import syllabuscontroller from './controller/syllabus.js';
import questionscontroller from './controller/questions.js';
import studentProgressController from './controller/studentProgress.js';
import profileController from './controller/profile.js';
import practiceTestController from './controller/practiceTest.js';
import codeExecutionController from './controller/codeExecution.js';
import aiController from './controller/aiController.js';
import studyHelpController from './controller/studyHelpController.js';
import testStateController from './controller/testState.js';
import testAnalysisController from './controller/testAnalysis.js';
import tpcController from './controller/tpc.js';
import tpcManagementController from './controller/tpcManagement.js';
import errorLogController from './controller/superadmin/errorLogs.js';

import questionController from './controller/questionController.js';
import PasswordResetController from './controller/passwordReset.js';
import BulkActionsController from './controller/bulkActions.js';
import DeptTestController from './controller/deptTest.js';
import * as codingProblemsController from './controller/codingProblems.js';
import { responsedata } from './methods.js';
import { auth, requireRole, optionalAuth } from './middleware/auth.js';
import tpcCodingController from './controller/tpcCoding.js';
import bugReportController from './controller/bugReport.js';
import contactController from './controller/contactController.js';

const router = express.Router();

// Initialize controllers
const login = new logincontroller();
const signup = new signupcontroller();
const exam = new examcontroller();
const superadmin = new superadmincontroller();
const defaultdata = new defaultdatacontroller();
const collage = new collagecontroller();
const superadminAnalytics = new superadminAnalyticsController();
const department = new departmentController();
const syllabus = new syllabuscontroller();
const questions = new questionscontroller();
const studentProgress = new studentProgressController();
const profile = new profileController();
const practiceTest = new practiceTestController();
const codeExecution = new codeExecutionController();
const ai = new aiController();
const studyHelp = new studyHelpController();
const testState = new testStateController();
const testAnalysis = new testAnalysisController();
const tpc = new tpcController();
const tpcManagement = new tpcManagementController();
const question = new questionController();
const passwordReset = new PasswordResetController();
const bulkActions = new BulkActionsController();
const deptTest = new DeptTestController();
const errorLogs = new errorLogController();
const tpcCoding = new tpcCodingController();
// bugReportController is already exported as default instance, no need to instantiate

// Default data routes
router.post('/defaultdata/insertroles', defaultdata.insertroles, responsedata);
// Auth routes (no auth middleware)
router.post('/auth/signup', signup.signup, responsedata);
router.post('/auth/login', login.login, responsedata);

// Password Reset routes (no auth required)
router.post('/auth/forgot-password', passwordReset.requestPasswordReset.bind(passwordReset), responsedata);
router.post('/auth/verify-reset-otp', passwordReset.verifyOTP.bind(passwordReset), responsedata);
router.post('/auth/reset-password', passwordReset.resetPassword.bind(passwordReset), responsedata);
router.post('/auth/resend-otp', passwordReset.resendOTP.bind(passwordReset), responsedata);
router.post('/auth/superadmin', superadmin.login, responsedata);

// Exam routes (with auth middleware)
router.post('/exam/insert', auth, exam.insertexam, responsedata);
router.post('/exam/update', auth, exam.updateexam, responsedata);
router.post('/exam/delete', auth, exam.deleteexam, responsedata);
router.post('/exam/list', auth, exam.listexam, responsedata);

// College routes (superadmin only - superadmin role is always allowed, checked in requireRole)
router.post('/collage/insert', auth, requireRole('Superadmin'), collage.insertcollage, responsedata);
router.post('/collage/update', auth, requireRole('Superadmin'), collage.updatecollage, responsedata);
router.post('/collage/delete', auth, requireRole('Superadmin'), collage.deletecollage, responsedata);
// College list: optionalAuth so signup gets active-only; superadmin gets full filter (e.g. Inactive)
router.post('/collage/list', optionalAuth, collage.listcollage, responsedata);
router.post('/collage/update-subscription', auth, requireRole('Superadmin'), collage.updateSubscription.bind(collage), responsedata);

// Department routes (superadmin only)
router.post('/department/insert', auth, requireRole('Superadmin'), department.insertdepartment, responsedata);
router.post('/department/update', auth, requireRole('Superadmin'), department.updatedepartment, responsedata);
router.post('/department/delete', auth, requireRole('Superadmin'), department.deletedepartment, responsedata);
// Department list: Allow public access when collegeId is provided (for signup), otherwise require Superadmin
router.post('/department/list', department.listdepartments, responsedata);

// Syllabus routes
// Insert/Update/Delete: Superadmin only
router.post('/syllabus/insert', auth, requireRole('Superadmin'), syllabus.insertsyllabus, responsedata);
router.post('/syllabus/update', auth, requireRole('Superadmin'), syllabus.updatesyllabus, responsedata);
router.post('/syllabus/delete', auth, requireRole('Superadmin'), syllabus.deletesyllabus, responsedata);
// List: All authenticated users (students, TPC, DeptTPC, Superadmin)
router.post('/syllabus/list', auth, syllabus.listsyllabus, responsedata);
// Get Week 1 content: All authenticated users
router.post('/syllabus/week1-content', auth, syllabus.getWeek1Content, responsedata);
router.post('/syllabus/aptitude-week1-content', auth, syllabus.getAptitudeWeek1Content, responsedata);
router.post('/syllabus/aptitude-week2-content', auth, syllabus.getAptitudeWeek2Content, responsedata);
router.post('/syllabus/aptitude-week3-content', auth, syllabus.getAptitudeWeek3Content, responsedata);
router.post('/syllabus/aptitude-week4-content', auth, syllabus.getAptitudeWeek4Content, responsedata);
router.post('/syllabus/aptitude-week5-content', auth, syllabus.getAptitudeWeek5Content, responsedata);
router.post('/syllabus/aptitude-week6-content', auth, syllabus.getAptitudeWeek6Content, responsedata);
// Get dynamic week content (supports Week 2+): All authenticated users
router.post('/syllabus/week-content', auth, syllabus.getWeekContent, responsedata);

// Questions routes (Week 1 DSA Practice Questions)
// Get questions by day: All authenticated users
router.post('/questions/week1', auth, questions.getWeek1QuestionsByDay, responsedata);
// Get all Week 1 questions organized by day: All authenticated users
router.post('/questions/week1/all', auth, questions.getAllWeek1Questions, responsedata);
// Get question by ID: All authenticated users
router.post('/questions/week1/get', auth, questions.getQuestionById, responsedata);
// Week 2 questions routes
router.post('/questions/week2', auth, questions.getWeek2QuestionsByDay, responsedata);
router.post('/questions/week2/all', auth, questions.getAllWeek2Questions, responsedata);

// Coding Problems routes
// Get coding problems by day: All authenticated users
router.post('/questions/coding', auth, questions.getCodingProblemsByDay, responsedata);
// Get coding problem by ID: All authenticated users
router.post('/questions/coding/get', auth, questions.getCodingProblemById, responsedata);

// ========================================
// Question Management Routes (tblQuestion collection)
// ========================================
// List questions with filtering: All authenticated users
router.post('/questions/list', auth, question.listQuestions, responsedata);
// Get single question by ID: All authenticated users
router.post('/questions/get', auth, question.getQuestion, responsedata);
// Get random questions for practice: All authenticated users
router.post('/questions/random', auth, question.getRandomQuestions, responsedata);
// Get aptitude practice questions by week and day: All authenticated users (students)
router.post('/questions/aptitude-practice', auth, question.getAptitudePractice, responsedata);
// Insert question: Superadmin only
router.post('/questions/insert', auth, requireRole(['Superadmin']), question.insertQuestion, responsedata);
// Update question: Superadmin only
router.post('/questions/update', auth, requireRole(['Superadmin']), question.updateQuestion, responsedata);
// Delete question (soft): Superadmin only
router.post('/questions/delete', auth, requireRole(['Superadmin']), question.deleteQuestion, responsedata);
// Bulk insert questions: Superadmin only (for migration)
router.post('/questions/bulk-insert', auth, requireRole(['Superadmin']), question.bulkInsertQuestions, responsedata);

// ========================================
// Coding Problems Routes (Capstone Questions)
// ========================================
// Get coding problems by week (capstone): All authenticated users
router.post('/coding-problems/week/:weekNum', auth, codingProblemsController.getCodingProblemsByWeek, responsedata);
// Get daily coding problems by week and day: All authenticated users
router.post('/coding-problems/daily/:weekNum/:dayNum', auth, codingProblemsController.getDailyCodingProblems, responsedata);

// Specific routes MUST come before generic :problemId parameter
// Get all coding problems (admin/testing): All authenticated users
router.post('/coding-problems/all', auth, codingProblemsController.getAllCodingProblems, responsedata);
// Submit solution: Students submit their code
router.post('/coding-problems/submit', auth, codingProblemsController.submitSolution, responsedata);
// Run solution (Test only): Students run their code against test cases
router.post('/coding-problems/run', auth, codingProblemsController.runSolution, responsedata);
// Get weekly coding progress (check capstone eligibility): All authenticated users
router.post('/coding-problems/progress/:weekNum', auth, codingProblemsController.getWeeklyCodingProgress, responsedata);

// Code review: get by submission ID or by problem ID (for Code Review UI)
router.post('/coding-problems/review/get-by-submission', auth, codingProblemsController.getCodeReviewBySubmissionId, responsedata);
router.post('/coding-problems/review/get-by-problem', auth, codingProblemsController.getCodeReviewByProblemId, responsedata);
router.post('/coding-problems/review/list', auth, codingProblemsController.listCodeReviews, responsedata);

// Generic route last
// Get coding problem by ID: All authenticated users
router.post('/coding-problems/:problemId', auth, codingProblemsController.getCodingProblemById, responsedata);
// Get student submissions for a problem: Students see their own submissions
router.post('/coding-problems/:problemId/submissions', auth, codingProblemsController.getStudentSubmissions, responsedata);



// Student Progress routes
// List student progress: Students see only their own, Admin/Superadmin can filter
router.post('/student-progress/list', auth, studentProgress.listStudentProgress, responsedata);
// Upsert student progress: Students can update their own progress
router.post('/student-progress/upsert', auth, studentProgress.upsertStudentProgress, responsedata);
// Complete a day: Students mark a day as completed
router.post('/student-progress/complete-day', auth, studentProgress.completeDay.bind(studentProgress), responsedata);
// Update practice test score: Students update their practice test scores
router.post('/student-progress/update-practice-score', auth, studentProgress.updatePracticeScore.bind(studentProgress), responsedata);
// Mark coding problem as completed: Students mark coding problems as solved
router.post('/student-progress/complete-coding-problem', auth, studentProgress.completeCodingProblem.bind(studentProgress), responsedata);
// Mark capstone week as completed: Students mark entire week as complete after capstone submission
router.post('/student-progress/complete-capstone-week', auth, studentProgress.completeCapstoneWeek.bind(studentProgress), responsedata);
// Check if specific week is completed
router.post('/student-progress/check-week-completion', auth, studentProgress.checkWeekCompletion.bind(studentProgress), responsedata);
// Check weekly test eligibility: Check if student can take weekly test
router.post('/student-progress/check-weekly-test-eligibility', auth, studentProgress.checkWeeklyTestEligibility.bind(studentProgress), responsedata);
// Block student from retaking test: After window switch violation
router.post('/student-progress/block-test-retake', auth, studentProgress.blockTestRetake.bind(studentProgress), responsedata);
// Check if student is blocked from retaking test
router.post('/student-progress/check-blocked-retake', auth, studentProgress.checkBlockedRetake.bind(studentProgress), responsedata);
// Get bookmarks: Get bookmarks for a specific week
router.post('/student-progress/bookmarks/get', auth, studentProgress.getBookmarks.bind(studentProgress), responsedata);
// Save bookmarks: Save bookmarks for a specific week
router.post('/student-progress/bookmarks/save', auth, studentProgress.saveBookmarks.bind(studentProgress), responsedata);
// Get progress summary: For dashboard
router.post('/student-progress/summary', auth, studentProgress.getStudentProgressSummary.bind(studentProgress), responsedata);
// Admin: List all students progress
router.post('/student-progress/admin/list-all', auth, requireRole(['Admin', 'Superadmin']), studentProgress.listAllStudentsProgress, responsedata);

// Profile routes
// Get profile: All authenticated users
router.post('/profile/get', auth, profile.getProfile, responsedata);
// Update profile: All authenticated users can update their own
router.post('/profile/update', auth, profile.updateProfile, responsedata);
// Change password: All authenticated users
router.post('/profile/verify-password', auth, profile.verifyPassword, responsedata);
router.post('/profile/change-password', auth, profile.changePassword, responsedata);

// Practice Test routes (Detailed test data)
// Save practice test: Students save their complete test data (includes AI analysis)
router.post('/practice-test/save', auth, practiceTest.savePracticeTest, responsedata);
// List practice tests: Students see their own, Admin/Superadmin can filter
router.post('/practice-test/list', auth, practiceTest.listPracticeTests, responsedata);
// Get practice test by ID: Students see their own, Admin/Superadmin can see any
router.post('/practice-test/get', auth, practiceTest.getPracticeTest, responsedata);
// Get practice test statistics: Students see their own stats
router.post('/practice-test/stats', auth, practiceTest.getPracticeTestStats, responsedata);
// Get student's own practice history with analytics
router.post('/student/practice-history', auth, studentProgress.getMyPracticeHistory.bind(studentProgress), responsedata);

// Student Scheduled Tests (Dept Assigned)
router.post('/student/tests/scheduled', auth, deptTest.getAvailableTests.bind(deptTest), responsedata);

// TPC Practice Test Routes
router.post('/tpc/student/practice-tests', auth, tpc.getStudentPracticeTests, responsedata);
router.post('/tpc/practice-analytics', auth, tpc.getPracticeTestAnalytics, responsedata);
router.post('/tpc/student/practice-details', auth, tpc.getStudentPracticeDetails, responsedata);

// Test Analysis routes (AI-powered performance analysis and guidance)
// Get analysis for a test: Students see their own analysis
router.post('/test-analysis/get', auth, testAnalysis.getAnalysis.bind(testAnalysis), responsedata);
// List all analyses: Students see their own analyses
router.post('/test-analysis/list', auth, testAnalysis.listAnalyses.bind(testAnalysis), responsedata);
// Manually trigger analysis for practice test (usually auto-generated)
router.post('/test-analysis/practice', auth, testAnalysis.analyzePracticeTest.bind(testAnalysis), responsedata);
// Manually trigger analysis for weekly test
router.post('/test-analysis/weekly', auth, testAnalysis.analyzeWeeklyTest.bind(testAnalysis), responsedata);

// Code Execution routes
// Execute code: All authenticated users (students can test their code)
router.post('/code/execute', auth, codeExecution.executeCode.bind(codeExecution), responsedata);

// AI Routes
// Code Review: Students can get AI feedback on their code
router.post('/ai/code-review', auth, ai.reviewCode.bind(ai), responsedata);
// AI Tutor Hint: Get hints for coding problems (max 3 per problem)
router.post('/ai/hint', auth, ai.getHint.bind(ai), responsedata);
// Generate Learning Path: Personalized learning recommendations
router.post('/ai/learning-path', auth, ai.generateLearningPath.bind(ai), responsedata);
// Generate Questions: AI-generated practice questions
router.post('/ai/generate-questions', auth, ai.generateQuestions.bind(ai), responsedata);
// Analyze Performance: AI performance analysis and feedback
router.post('/ai/analyze-performance', auth, ai.analyzePerformance.bind(ai), responsedata);
// Answer Question: AI tutor answers student questions (scope-restricted)
router.post('/ai/answer-question', auth, ai.answerQuestion.bind(ai), responsedata);

// Study Help (Clarify & Learn + Quick checks) – names avoid "AI"
router.post('/study-help/conversation/start', auth, studyHelp.startSession.bind(studyHelp), responsedata);
router.post('/study-help/conversation/ask', auth, studyHelp.ask.bind(studyHelp), responsedata);
router.post('/study-help/conversation/history', auth, studyHelp.getHistory.bind(studyHelp), responsedata);
router.post('/study-help/conversation/list', auth, studyHelp.listSessions.bind(studyHelp), responsedata);
router.post('/study-help/generate-check', auth, studyHelp.generateCheck.bind(studyHelp), responsedata);
router.post('/study-help/check/list', auth, studyHelp.listChecks.bind(studyHelp), responsedata);
router.post('/study-help/check/get', auth, studyHelp.getCheck.bind(studyHelp), responsedata);
router.post('/study-help/check/submit', auth, studyHelp.submitAttempt.bind(studyHelp), responsedata);
router.post('/study-help/check/result', auth, studyHelp.getCheckResult.bind(studyHelp), responsedata);

// Test State routes (for tracking active tests, multiple tabs, etc.)
// Get test state: Get current test state for a student
router.post('/test-state/get', auth, testState.getTestState.bind(testState), responsedata);
// Update test state: Update test state (active/inactive, tab count, etc.)
router.post('/test-state/update', auth, testState.updateTestState.bind(testState), responsedata);
// Clear test state: Clear test state when test ends
router.post('/test-state/clear', auth, testState.clearTestState.bind(testState), responsedata);

// Superadmin Analytics Routes (Superadmin only)
router.post('/superadmin/error-logs/list', auth, requireRole('Superadmin'), errorLogs.listErrorLogs.bind(errorLogs), responsedata);
router.post('/superadmin/analytics/overview', auth, requireRole('Superadmin'), superadminAnalytics.getPlatformOverview.bind(superadminAnalytics), responsedata);
router.post('/superadmin/analytics/colleges', auth, requireRole('Superadmin'), superadminAnalytics.getCollegeStatistics.bind(superadminAnalytics), responsedata);
router.post('/superadmin/analytics/students', auth, requireRole('Superadmin'), superadminAnalytics.getStudentAnalytics.bind(superadminAnalytics), responsedata);
router.post('/superadmin/analytics/graphical', auth, requireRole('Superadmin'), superadminAnalytics.getGraphicalAnalytics.bind(superadminAnalytics), responsedata);
router.post('/superadmin/analytics/security', auth, requireRole('Superadmin'), superadminAnalytics.getSecurityViolations.bind(superadminAnalytics), responsedata);

// TPC Coding Monitoring
router.post('/tpc/coding/stats', auth, (req, res, next) => tpcCoding.getCodingStats(req, res, next), responsedata);
router.post('/tpc/coding/student-details', auth, (req, res, next) => tpcCoding.getStudentDetails(req, res, next), responsedata);

// TPC Routes (College TPC only)
router.post('/tpc-college/dashboard/stats', auth, requireRole('TPC'), tpc.getDashboardStats.bind(tpc), responsedata);
router.post('/tpc-college/students/list', auth, requireRole('TPC'), tpc.getStudentsList.bind(tpc), responsedata);
router.post('/tpc-college/students/top-performers', auth, requireRole('TPC'), tpc.getTopPerformers.bind(tpc), responsedata);
router.post('/tpc-college/students/needs-attention', auth, requireRole('TPC'), tpc.getStudentsNeedingAttention.bind(tpc), responsedata);
router.post('/tpc-college/departments/list', auth, requireRole('TPC'), tpc.getDepartmentsList.bind(tpc), responsedata);
router.post('/tpc-college/analytics/department-performance', auth, requireRole('TPC'), tpc.getDepartmentPerformance.bind(tpc), responsedata);
router.post('/tpc-college/analytics/trends', auth, requireRole('TPC'), tpc.getPerformanceTrends.bind(tpc), responsedata);
router.post('/tpc-college/tests/list', auth, requireRole('TPC'), tpc.getTestsList.bind(tpc), responsedata);
router.post('/tpc-college/tests/results', auth, requireRole('TPC'), tpc.getTestResults.bind(tpc), responsedata);
router.post('/tpc-college/reports/generate', auth, requireRole('TPC'), tpc.generateReport.bind(tpc), responsedata);

// DeptTPC Routes (Department TPC only)
router.post('/tpc-dept/dashboard/stats', auth, requireRole('DeptTPC'), tpc.getDashboardStats.bind(tpc), responsedata);
router.post('/tpc-dept/students/list', auth, requireRole('DeptTPC'), tpc.getStudentsList.bind(tpc), responsedata);
router.post('/tpc-dept/students/top-performers', auth, requireRole('DeptTPC'), tpc.getTopPerformers.bind(tpc), responsedata);
router.post('/tpc-dept/students/needs-attention', auth, requireRole('DeptTPC'), tpc.getStudentsNeedingAttention.bind(tpc), responsedata);
router.post('/tpc-dept/analytics/performance', auth, requireRole('DeptTPC'), tpc.getDeptTPCPerformance.bind(tpc), responsedata);
router.post('/tpc-dept/analytics/trends', auth, requireRole('DeptTPC'), tpc.getDeptTPCTrends.bind(tpc), responsedata);
router.post('/tpc-dept/analytics/distribution', auth, requireRole('DeptTPC'), tpc.getDeptTPCDistribution.bind(tpc), responsedata);
router.post('/tpc-dept/student/details', auth, requireRole('DeptTPC'), tpc.getStudentDetailedAnalytics.bind(tpc), responsedata);
// Approve test retake: DeptTPC can approve blocked students
router.post('/tpc-dept/approve-test-retake', auth, requireRole('DeptTPC'), tpc.approveTestRetake.bind(tpc), responsedata);
// Get blocked students: DeptTPC can view students needing approval
router.post('/tpc-dept/blocked-students', auth, requireRole('DeptTPC'), tpc.getBlockedStudents.bind(tpc), responsedata);
router.post('/tpc-dept/coding-reviews/list', auth, requireRole('DeptTPC'), codingProblemsController.listCodeReviewsForDeptTPC, responsedata);
router.post('/tpc-dept/tests/list', auth, requireRole('DeptTPC'), tpc.getDeptTPCTestsList.bind(tpc), responsedata);
router.post('/tpc-dept/tests/results', auth, requireRole('DeptTPC'), tpc.getDeptTPCTestResults.bind(tpc), responsedata);
router.post('/tpc-dept/reports/generate', auth, requireRole('DeptTPC'), tpc.generateDeptTPCReport.bind(tpc), responsedata);


// Bulk Actions Routes
// Bulk approve test retakes (DeptTPC only)
router.post('/dept-tpc/bulk-approve-retakes', auth, requireRole('DeptTPC'), bulkActions.bulkApproveRetakes.bind(bulkActions), responsedata);
// Export students (TPC and DeptTPC)
router.post('/tpc/export-students', auth, requireRole(['TPC', 'DeptTPC']), bulkActions.exportStudents.bind(bulkActions), responsedata);
router.post('/dept-tpc/export-students', auth, requireRole('DeptTPC'), bulkActions.exportStudents.bind(bulkActions), responsedata);

// DeptTPC Test Scheduling
router.post('/dept-tpc/test/create', auth, requireRole('DeptTPC'), deptTest.createTest.bind(deptTest), responsedata);
router.post('/dept-tpc/test/list', auth, requireRole('DeptTPC'), deptTest.listTests.bind(deptTest), responsedata);
router.post('/dept-tpc/test/bulk-upload', auth, requireRole('DeptTPC'), deptTest.bulkUpload.bind(deptTest), responsedata);
router.post('/dept-tpc/students/search', auth, requireRole('DeptTPC'), deptTest.searchStudents.bind(deptTest), responsedata);

// TPC Management Routes (Superadmin only)
router.post('/tpc-management/create-college-tpc', auth, requireRole('Superadmin'), tpcManagement.createCollegeTpc.bind(tpcManagement), responsedata);
router.post('/tpc-management/update-college-tpc', auth, requireRole('Superadmin'), tpcManagement.updateCollegeTpc.bind(tpcManagement), responsedata);
router.post('/tpc-management/delete-college-tpc', auth, requireRole('Superadmin'), tpcManagement.deleteCollegeTpc.bind(tpcManagement), responsedata);
router.post('/tpc-management/create-dept-tpc', auth, requireRole('Superadmin'), tpcManagement.createDeptTpc.bind(tpcManagement), responsedata);
router.post('/tpc-management/update-dept-tpc', auth, requireRole('Superadmin'), tpcManagement.updateDeptTpc.bind(tpcManagement), responsedata);
router.post('/tpc-management/delete-dept-tpc', auth, requireRole('Superadmin'), tpcManagement.deleteDeptTpc.bind(tpcManagement), responsedata);
router.post('/tpc-management/list-college-tpc', auth, requireRole('Superadmin'), tpcManagement.listCollegeTpc.bind(tpcManagement), responsedata);
router.post('/tpc-management/list-dept-tpc', auth, requireRole('Superadmin'), tpcManagement.listDeptTpc.bind(tpcManagement), responsedata);

// Bug Report Routes
router.post('/bug-report/submit', auth, bugReportController.submitBugReport.bind(bugReportController), responsedata);
router.post('/bug-report/my-reports', auth, bugReportController.getMyReports.bind(bugReportController), responsedata);
router.post('/bug-report/view', auth, bugReportController.viewReport.bind(bugReportController), responsedata);

// Superadmin only bug report routes
router.post('/bug-report/all', auth, requireRole('Superadmin'), bugReportController.getAllReports.bind(bugReportController), responsedata);
router.post('/bug-report/update-status', auth, requireRole('Superadmin'), bugReportController.updateStatus.bind(bugReportController), responsedata);
router.post('/bug-report/delete', auth, requireRole('Superadmin'), bugReportController.deleteReport.bind(bugReportController), responsedata);

// Contact Routes
router.post('/contact/submit', contactController.submitContact.bind(contactController), responsedata);
router.post('/contact/all', auth, requireRole('Superadmin'), contactController.getAllContacts.bind(contactController), responsedata);
router.post('/contact/update-status', auth, requireRole('Superadmin'), contactController.updateStatus.bind(contactController), responsedata);
router.post('/contact/delete', auth, requireRole('Superadmin'), contactController.deleteContact.bind(contactController), responsedata);

export default router;

