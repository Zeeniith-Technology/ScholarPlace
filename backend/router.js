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
import studentAdminController from './controller/superadmin/studentAdmin.js';
import announcementController from './controller/announcements.js';
import settingsController from './controller/superadmin/settings.js';
import impersonationController from './controller/superadmin/impersonation.js';
import monitoringController from './controller/superadmin/monitoring.js';

import questionController from './controller/questionController.js';
import PasswordResetController from './controller/passwordReset.js';
import BulkActionsController from './controller/bulkActions.js';
import DeptTestController from './controller/deptTest.js';
import * as codingProblemsController from './controller/codingProblems.js';
import { responsedata } from './methods.js';
import { auth, requireRole, optionalAuth } from './middleware/auth.js';
import { requireAIEnabled } from './middleware/aiGate.js';
import tpcCodingController from './controller/tpcCoding.js';
import bugReportController from './controller/bugReport.js';
import contactController from './controller/contactController.js';
import CertificateController from './controller/certificate.js';
import WeeklyFeedbackController from './controller/weeklyFeedback.js';

// CRM Controllers
import CrmTeamController from './controller/crm/crmTeam.js';
import CrmStatusesController from './controller/crm/crmStatuses.js';
import CrmCollegesController from './controller/crm/crmColleges.js';
import CrmContactsController from './controller/crm/crmContacts.js';
import CrmActivitiesController from './controller/crm/crmActivities.js';
import CrmTasksController from './controller/crm/crmTasks.js';
import CrmDealsController from './controller/crm/crmDeals.js';
import CrmNotificationsController from './controller/crm/crmNotifications.js';
import CrmReportsController from './controller/crm/crmReports.js';
import { requireCrmAccess } from './middleware/crmAccess.js';

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
const certificate = new CertificateController();
const weeklyFeedback = new WeeklyFeedbackController();
// bugReportController is already exported as default instance, no need to instantiate

// CRM Instances
const crmTeam = new CrmTeamController();
const crmStatuses = new CrmStatusesController();
const crmColleges = new CrmCollegesController();
const crmContacts = new CrmContactsController();
const crmActivities = new CrmActivitiesController();
const crmTasks = new CrmTasksController();
const crmDeals = new CrmDealsController();
const crmNotifications = new CrmNotificationsController();
const crmReports = new CrmReportsController();

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

// Exam routes (list: all auth users; write: TPC and DeptTPC only)
router.post('/exam/insert', auth, requireRole(['TPC', 'DeptTPC']), exam.insertexam, responsedata);
router.post('/exam/update', auth, requireRole(['TPC', 'DeptTPC']), exam.updateexam, responsedata);
router.post('/exam/delete', auth, requireRole(['TPC', 'DeptTPC']), exam.deleteexam, responsedata);
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

// Coding problems by day (reads tblQuestion coding docs). Kept as-is.
// NOTE: the static-file-backed routes /questions/week1, /questions/week1/all,
// /questions/week1/get, /questions/week2, /questions/week2/all, and /questions/coding/get
// were removed 2026-08-19. They served seed-era static data (data/questions.js,
// week2Questions.js, codingProblems.js) that had drifted from the DB; their pages now
// redirect to the DB-backed flows. Do NOT re-add them — student content lives in the DB.
router.post('/questions/coding', auth, questions.getCodingProblemsByDay, responsedata);

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
// Get all student submissions (dashboard/analytics): All authenticated users
router.post('/coding-problems/submissions/all', auth, codingProblemsController.getAllStudentSubmissions, responsedata);

// Specific routes MUST come before generic :problemId parameter
// Get all coding problems (admin/testing): All authenticated users
router.post('/coding-problems/all', auth, codingProblemsController.getAllCodingProblems, responsedata);
// Submit solution: Students submit their code
router.post('/coding-problems/submit', auth, codingProblemsController.submitSolution, responsedata);
// Run solution (Test only): Students run their code against test cases
router.post('/coding-problems/run', auth, codingProblemsController.runSolution, responsedata);
// Get weekly coding progress (check capstone eligibility): All authenticated users
router.post('/coding-problems/progress/:weekNum', auth, codingProblemsController.getWeeklyCodingProgress, responsedata);

// ── Tiered Daily Coding (Easy / Medium / Hard) ──
// Fetch 12 grouped problems for a day: POST body { week, day }
router.post('/coding-problems/tiered/problems', auth, codingProblemsController.getDailyTieredProblems);
// Get daily progress summary (solved_today / daily_goal): POST body { week, day }
router.post('/coding-problems/tiered/progress', auth, codingProblemsController.getDailyTieredProgress);

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
// List: Student sees own; TPC sees college-scoped; DeptTPC sees dept-scoped; Superadmin sees all
router.post('/student-progress/list', auth, studentProgress.listStudentProgress, responsedata);
// Read-only checks accessible to any authenticated role
router.post('/student-progress/check-week-completion', auth, studentProgress.checkWeekCompletion.bind(studentProgress), responsedata);
router.post('/student-progress/check-blocked-retake', auth, requireRole('Student'), studentProgress.checkBlockedRetake.bind(studentProgress), responsedata);
router.post('/student-progress/bookmarks/get', auth, studentProgress.getBookmarks.bind(studentProgress), responsedata);
router.post('/student-progress/summary', auth, studentProgress.getStudentProgressSummary.bind(studentProgress), responsedata);
// Write routes: Student only (Superadmin bypasses requireRole automatically)
router.post('/student-progress/upsert', auth, requireRole('Student'), studentProgress.upsertStudentProgress, responsedata);
router.post('/student-progress/complete-day', auth, requireRole('Student'), studentProgress.completeDay.bind(studentProgress), responsedata);
router.post('/student-progress/update-practice-score', auth, requireRole('Student'), studentProgress.updatePracticeScore.bind(studentProgress), responsedata);
router.post('/student-progress/complete-coding-problem', auth, requireRole('Student'), studentProgress.completeCodingProblem.bind(studentProgress), responsedata);
router.post('/student-progress/complete-capstone-week', auth, requireRole('Student'), studentProgress.completeCapstoneWeek.bind(studentProgress), responsedata);
router.post('/student-progress/check-weekly-test-eligibility', auth, requireRole('Student'), studentProgress.checkWeeklyTestEligibility.bind(studentProgress), responsedata);
router.post('/student-progress/block-test-retake', auth, requireRole('Student'), studentProgress.blockTestRetake.bind(studentProgress), responsedata);
router.post('/student-progress/bookmarks/save', auth, requireRole('Student'), studentProgress.saveBookmarks.bind(studentProgress), responsedata);
// Admin: List all students progress
router.post('/student-progress/admin/list-all', auth, requireRole('Superadmin'), studentProgress.listAllStudentsProgress, responsedata);

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
router.post('/student/dept-test/start', auth, deptTest.startTest.bind(deptTest), responsedata);
router.post('/student/dept-test/submit', auth, deptTest.submitTest.bind(deptTest), responsedata);
router.post('/student/dept-test/results', auth, deptTest.getTestResults.bind(deptTest), responsedata);

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

// AI Routes — guarded by the ai_features_enabled kill-switch (Platform Settings)
// Code Review: Students can get AI feedback on their code
router.post('/ai/code-review', auth, requireAIEnabled, ai.reviewCode.bind(ai), responsedata);
// AI Tutor Hint: Get hints for coding problems (max 3 per problem)
router.post('/ai/hint', auth, requireAIEnabled, ai.getHint.bind(ai), responsedata);
// Generate Learning Path: Personalized learning recommendations
router.post('/ai/learning-path', auth, requireAIEnabled, ai.generateLearningPath.bind(ai), responsedata);
// Generate Questions: AI-generated practice questions
router.post('/ai/generate-questions', auth, requireAIEnabled, ai.generateQuestions.bind(ai), responsedata);
// Analyze Performance: AI performance analysis and feedback
router.post('/ai/analyze-performance', auth, requireAIEnabled, ai.analyzePerformance.bind(ai), responsedata);
// Answer Question: AI tutor answers student questions (scope-restricted)
router.post('/ai/answer-question', auth, requireAIEnabled, ai.answerQuestion.bind(ai), responsedata);

// Study Help (Clarify & Learn + Quick checks) – names avoid "AI"
router.post('/study-help/conversation/start', auth, studyHelp.startSession.bind(studyHelp), responsedata);
router.post('/study-help/conversation/ask', auth, requireAIEnabled, studyHelp.ask.bind(studyHelp), responsedata);
router.post('/study-help/conversation/history', auth, studyHelp.getHistory.bind(studyHelp), responsedata);
router.post('/study-help/conversation/list', auth, studyHelp.listSessions.bind(studyHelp), responsedata);
router.post('/study-help/generate-check', auth, requireAIEnabled, studyHelp.generateCheck.bind(studyHelp), responsedata);
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
router.post('/superadmin/analytics/recent-activity', auth, requireRole('Superadmin'), superadminAnalytics.getRecentActivity.bind(superadminAnalytics), responsedata);
router.post('/superadmin/analytics/security', auth, requireRole('Superadmin'), superadminAnalytics.getSecurityViolations.bind(superadminAnalytics), responsedata);
router.post('/superadmin/ai-usage', auth, requireRole('Superadmin'), superadminAnalytics.getAIUsage.bind(superadminAnalytics), responsedata);
router.post('/superadmin/ops/health', auth, requireRole('Superadmin'), superadminAnalytics.getOpsHealth.bind(superadminAnalytics), responsedata);

// Superadmin Student Administration (account controls)
router.post('/superadmin/students/update-status', auth, requireRole('Superadmin'), studentAdminController.updateStudentStatus, responsedata);
router.post('/superadmin/students/reset-password', auth, requireRole('Superadmin'), studentAdminController.resetStudentPassword, responsedata);
router.post('/superadmin/students/move', auth, requireRole('Superadmin'), studentAdminController.moveStudent, responsedata);

// Announcements — superadmin manages, students read their active feed
router.post('/superadmin/announcements/create', auth, requireRole('Superadmin'), announcementController.create, responsedata);
router.post('/superadmin/announcements/list', auth, requireRole('Superadmin'), announcementController.list, responsedata);
router.post('/superadmin/announcements/update', auth, requireRole('Superadmin'), announcementController.update, responsedata);
router.post('/superadmin/announcements/delete', auth, requireRole('Superadmin'), announcementController.remove, responsedata);
router.post('/student/announcements/active', auth, requireRole('Student'), announcementController.activeForStudent, responsedata);

// Platform settings (runtime toggles without redeploy)
router.post('/superadmin/settings/get', auth, requireRole('Superadmin'), settingsController.get, responsedata);
router.post('/superadmin/settings/update', auth, requireRole('Superadmin'), settingsController.update, responsedata);

// Student impersonation ("View As") — read-only, audit-logged
router.post('/superadmin/impersonate/start', auth, requireRole('Superadmin'), impersonationController.start, responsedata);
router.post('/superadmin/impersonate/logs', auth, requireRole('Superadmin'), impersonationController.logs, responsedata);

// Superadmin monitoring — cross-college aptitude (practice) + coding visibility
router.post('/superadmin/monitoring/practice', auth, requireRole('Superadmin'), monitoringController.practice, responsedata);
router.post('/superadmin/monitoring/practice-detail', auth, requireRole('Superadmin'), monitoringController.practiceDetail, responsedata);
router.post('/superadmin/monitoring/practice-student', auth, requireRole('Superadmin'), monitoringController.practiceStudent, responsedata);
router.post('/superadmin/monitoring/coding', auth, requireRole('Superadmin'), monitoringController.coding, responsedata);
router.post('/superadmin/monitoring/coding-detail', auth, requireRole('Superadmin'), monitoringController.codingDetail, responsedata);
// Superadmin cross-college performance report (aptitude + coding): summary rollup + per-student detail
router.post('/superadmin/reports/generate', auth, requireRole('Superadmin'), monitoringController.report, responsedata);

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
router.post('/dept-tpc/test/generate-questions', auth, requireRole('DeptTPC'), deptTest.generateQuestions.bind(deptTest), responsedata);
router.post('/dept-tpc/test/list', auth, requireRole('DeptTPC'), deptTest.listTests.bind(deptTest), responsedata);
router.post('/dept-tpc/test/bulk-upload', auth, requireRole('DeptTPC'), deptTest.bulkUpload.bind(deptTest), responsedata);
router.post('/dept-tpc/test/analytics', auth, requireRole('DeptTPC'), deptTest.getTestAnalytics.bind(deptTest), responsedata);
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

// Certificate routes
router.post('/student/certificate', auth, requireRole('Student'), certificate.getStudentCertificate.bind(certificate), responsedata);
router.post('/dept-tpc/certificates', auth, requireRole('DeptTPC'), certificate.getDeptCertificates.bind(certificate), responsedata);
router.post('/superadmin/certificates', auth, requireRole('Superadmin'), certificate.getAllCertificates.bind(certificate), responsedata);

// ─── Weekly Feedback Routes ───────────────────────────────────────────────

// Student: submit & view own feedback
router.post('/student/feedback/submit', auth, requireRole('Student'), weeklyFeedback.submitFeedback.bind(weeklyFeedback), responsedata);
router.post('/student/feedback/check-submitted', auth, requireRole('Student'), weeklyFeedback.checkSubmitted.bind(weeklyFeedback), responsedata);
router.post('/student/feedback/check-submitted-bulk', auth, requireRole('Student'), weeklyFeedback.checkSubmittedBulk.bind(weeklyFeedback), responsedata);
router.post('/student/feedback/my-history', auth, requireRole('Student'), weeklyFeedback.getMyFeedback.bind(weeklyFeedback), responsedata);
// DeptTPC: view + analytics for their department
router.post('/tpc-dept/feedback/list', auth, requireRole('DeptTPC'), weeklyFeedback.listFeedback.bind(weeklyFeedback), responsedata);
router.post('/tpc-dept/feedback/analytics', auth, requireRole('DeptTPC'), weeklyFeedback.getAnalytics.bind(weeklyFeedback), responsedata);
router.post('/tpc-dept/feedback/student', auth, requireRole('DeptTPC'), weeklyFeedback.getStudentFeedback.bind(weeklyFeedback), responsedata);

// College TPC: view + analytics for their entire college
router.post('/tpc-college/feedback/list', auth, requireRole('TPC'), weeklyFeedback.listFeedback.bind(weeklyFeedback), responsedata);
router.post('/tpc-college/feedback/analytics', auth, requireRole('TPC'), weeklyFeedback.getAnalytics.bind(weeklyFeedback), responsedata);
router.post('/tpc-college/feedback/student', auth, requireRole('TPC'), weeklyFeedback.getStudentFeedback.bind(weeklyFeedback), responsedata);

// Superadmin: view + analytics across all colleges
router.post('/superadmin/feedback/list', auth, requireRole('Superadmin'), weeklyFeedback.listFeedback.bind(weeklyFeedback), responsedata);
router.post('/superadmin/feedback/analytics', auth, requireRole('Superadmin'), weeklyFeedback.getAnalytics.bind(weeklyFeedback), responsedata);
router.post('/superadmin/feedback/student', auth, requireRole('Superadmin'), weeklyFeedback.getStudentFeedback.bind(weeklyFeedback), responsedata);
// ─── CRM Routes ───────────────────────────────────────────────
const crmRoles = ['Superadmin', 'CRMExec'];

// Auth uses existing /auth/login

// CRM Team (SuperAdmin only)
router.post('/crm/team/list', auth, requireRole('Superadmin'), crmTeam.list.bind(crmTeam), responsedata);
router.post('/crm/team/create', auth, requireRole('Superadmin'), crmTeam.create.bind(crmTeam), responsedata);
router.post('/crm/team/deactivate', auth, requireRole('Superadmin'), crmTeam.deactivate.bind(crmTeam), responsedata);

// CRM Statuses (SuperAdmin for write, all CRM for list)
router.post('/crm/statuses/list', auth, requireRole(crmRoles), crmStatuses.list.bind(crmStatuses), responsedata);
router.post('/crm/statuses/create', auth, requireRole('Superadmin'), crmStatuses.create.bind(crmStatuses), responsedata);
router.post('/crm/statuses/update', auth, requireRole('Superadmin'), crmStatuses.update.bind(crmStatuses), responsedata);
router.post('/crm/statuses/reorder', auth, requireRole('Superadmin'), crmStatuses.reorder.bind(crmStatuses), responsedata);
router.post('/crm/statuses/archive', auth, requireRole('Superadmin'), crmStatuses.archive.bind(crmStatuses), responsedata);
router.post('/crm/statuses/set-default', auth, requireRole('Superadmin'), crmStatuses.setDefault.bind(crmStatuses), responsedata);

// CRM Colleges
router.post('/crm/colleges/list', auth, requireRole(crmRoles), crmColleges.list.bind(crmColleges), responsedata);
router.post('/crm/colleges/get', auth, requireRole(crmRoles), crmColleges.get.bind(crmColleges), responsedata);
router.post('/crm/colleges/create', auth, requireRole(crmRoles), crmColleges.create.bind(crmColleges), responsedata);
router.post('/crm/colleges/update', auth, requireRole(crmRoles), requireCrmAccess, crmColleges.update.bind(crmColleges), responsedata);
router.post('/crm/colleges/delete', auth, requireRole(crmRoles), requireCrmAccess, crmColleges.delete.bind(crmColleges), responsedata);
router.post('/crm/colleges/move-stage', auth, requireRole(crmRoles), requireCrmAccess, crmColleges.moveStage.bind(crmColleges), responsedata);
router.post('/crm/colleges/assign', auth, requireRole('Superadmin'), crmColleges.assign.bind(crmColleges), responsedata);
router.post('/crm/colleges/search', auth, requireRole(crmRoles), crmColleges.search.bind(crmColleges), responsedata);

// CRM Contacts
router.post('/crm/contacts/list', auth, requireRole(crmRoles), requireCrmAccess, crmContacts.list.bind(crmContacts), responsedata);
router.post('/crm/contacts/create', auth, requireRole(crmRoles), requireCrmAccess, crmContacts.create.bind(crmContacts), responsedata);
router.post('/crm/contacts/update', auth, requireRole(crmRoles), requireCrmAccess, crmContacts.update.bind(crmContacts), responsedata);
router.post('/crm/contacts/delete', auth, requireRole('Superadmin'), crmContacts.delete.bind(crmContacts), responsedata);

// CRM Activities
router.post('/crm/activities/list', auth, requireRole(crmRoles), requireCrmAccess, crmActivities.list.bind(crmActivities), responsedata);
router.post('/crm/activities/create', auth, requireRole(crmRoles), requireCrmAccess, crmActivities.create.bind(crmActivities), responsedata);

// CRM Tasks
router.post('/crm/tasks/list', auth, requireRole(crmRoles), crmTasks.list.bind(crmTasks), responsedata);
router.post('/crm/tasks/create', auth, requireRole(crmRoles), requireCrmAccess, crmTasks.create.bind(crmTasks), responsedata);
router.post('/crm/tasks/update', auth, requireRole(crmRoles), requireCrmAccess, crmTasks.update.bind(crmTasks), responsedata);
router.post('/crm/tasks/mark-complete', auth, requireRole(crmRoles), requireCrmAccess, crmTasks.markComplete.bind(crmTasks), responsedata);
router.post('/crm/tasks/delete', auth, requireRole('Superadmin'), crmTasks.delete.bind(crmTasks), responsedata);

// CRM Deals
router.post('/crm/deals/list', auth, requireRole(crmRoles), requireCrmAccess, crmDeals.list.bind(crmDeals), responsedata);
router.post('/crm/deals/create', auth, requireRole(crmRoles), requireCrmAccess, crmDeals.create.bind(crmDeals), responsedata);
router.post('/crm/deals/update', auth, requireRole(crmRoles), requireCrmAccess, crmDeals.update.bind(crmDeals), responsedata);
router.post('/crm/deals/delete', auth, requireRole(crmRoles), requireCrmAccess, crmDeals.delete.bind(crmDeals), responsedata);

// CRM Notifications
router.post('/crm/notifications/list', auth, requireRole(crmRoles), crmNotifications.list.bind(crmNotifications), responsedata);
router.post('/crm/notifications/mark-read', auth, requireRole(crmRoles), crmNotifications.markRead.bind(crmNotifications), responsedata);
router.post('/crm/notifications/mark-all-read', auth, requireRole(crmRoles), crmNotifications.markAllRead.bind(crmNotifications), responsedata);

// CRM Reports (Superadmin only)
router.post('/crm/reports/pipeline', auth, requireRole('Superadmin'), crmReports.pipeline.bind(crmReports), responsedata);
router.post('/crm/reports/team-stats', auth, requireRole('Superadmin'), crmReports.teamStats.bind(crmReports), responsedata);

export default router;
