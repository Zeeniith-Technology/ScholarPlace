import axios from 'axios';
import crypto from 'crypto';

// In-memory execution cache: dedup identical (language, versionIndex, code, stdin)
// JDoodle calls. Deterministic problems → same inputs yield same output, so this
// kills credits wasted on double-clicks and unchanged re-runs (the capstone editor
// re-runs all test cases on every click). Transient API failures are NOT cached.
const EXEC_CACHE_TTL_MS = 10 * 60 * 1000;
const EXEC_CACHE_MAX = 5000;
const execCache = new Map(); // key -> { data, ts }

function execCacheKey(lang, versionIndex, code, stdin) {
    return crypto.createHash('sha1')
        .update(`${lang} ${versionIndex} ${code} ${stdin}`)
        .digest('hex');
}
function execCacheGet(key) {
    const hit = execCache.get(key);
    if (hit && (Date.now() - hit.ts) < EXEC_CACHE_TTL_MS) return hit.data;
    if (hit) execCache.delete(key);
    return null;
}
function execCacheSet(key, data) {
    if (execCache.size >= EXEC_CACHE_MAX) {
        const oldest = execCache.keys().next().value;
        if (oldest !== undefined) execCache.delete(oldest);
    }
    execCache.set(key, { data, ts: Date.now() });
}

export default class codeExecutionController {
  async executeCode(req, res, next) {
    try {
      const { language, code, input, testCases } = req.body;
      const userId = req.user?.id || req.user?.userId;

      // Rate Limiting (Run Code)
      if (userId) {
        const { checkRateLimit } = await import('../utils/rateLimiter.js');
        const limit = checkRateLimit(userId, 'run');
        if (!limit.allowed) {
          res.status(429).json({
            success: false,
            message: `Rate limit exceeded. Please wait ${limit.waitTime}s before running code again.`,
            error: 'RateLimitExceeded'
          });
          return next();
        }
      }

      if (!code || !language) {
        res.status(400).json({
          success: false,
          message: "Code and language are required"
        });
        return next();
      }

      // JDoodle language version IDs
      const languageMap = {
        'python': { language: 'python3', versionIndex: '4' },  // Python 3.10
        'javascript': { language: 'nodejs', versionIndex: '4' }, // Node.js 18
        'c': { language: 'c', versionIndex: '5' },              // GCC 11.1.0
        'cpp': { language: 'cpp17', versionIndex: '1' },        // C++17
        'java': { language: 'java', versionIndex: '4' },        // JDK 17
        'csharp': { language: 'csharp', versionIndex: '4' },    // Mono 6.12
        'go': { language: 'go', versionIndex: '4' }             // Go 1.18
      };

      const jdoodleConfig = languageMap[language.toLowerCase()];

      if (!jdoodleConfig) {
        res.status(400).json({
          success: false,
          message: `Unsupported language: ${language}`
        });
        return next();
      }

      // JDoodle API credentials (get from https://www.jdoodle.com/compiler-api)
      const CLIENT_ID = process.env.JDOODLE_CLIENT_ID;
      const CLIENT_SECRET = process.env.JDOODLE_CLIENT_SECRET;

      if (!CLIENT_ID || !CLIENT_SECRET) {
        res.status(500).json({
          success: false,
          message: "JDoodle API credentials not configured. Add JDOODLE_CLIENT_ID and JDOODLE_CLIENT_SECRET to .env"
        });
        return next();
      }

      // If testCases are provided, run ALL of them
      if (testCases && Array.isArray(testCases) && testCases.length > 0) {
        const testResults = [];

        for (const testCase of testCases) {
          const testInput = testCase.input || '';
          const expectedOutput = (testCase.output || testCase.expected_output || testCase.expectedOutput || '').trim();

          // Execute with JDoodle API (cache identical executions to save credits)
          try {
            const cacheKey = execCacheKey(jdoodleConfig.language, jdoodleConfig.versionIndex, code, testInput);
            let data = execCacheGet(cacheKey);
            if (!data) {
              const response = await axios.post('https://api.jdoodle.com/v1/execute', {
                clientId: CLIENT_ID,
                clientSecret: CLIENT_SECRET,
                script: code,
                language: jdoodleConfig.language,
                versionIndex: jdoodleConfig.versionIndex,
                stdin: testInput
              });
              data = response.data;
              execCacheSet(cacheKey, data); // deterministic result (incl. compile/runtime errors)
            }

            const { output, statusCode, memory, cpuTime } = data;

            // Check for compilation/runtime errors
            if (statusCode && statusCode !== 200) {
              testResults.push({
                input: testInput,
                expectedOutput: expectedOutput,
                actualOutput: output || 'Execution failed',
                passed: false,
                error: statusCode === 400 ? 'Compilation Error' : 'Runtime Error'
              });
              continue;
            }

            // Parse output
            let actualOutput = (output || '').trim();

            // Check if output matches expected
            const passed = actualOutput === expectedOutput;
            testResults.push({
              input: testInput,
              expectedOutput: expectedOutput,
              actualOutput: actualOutput,
              passed: passed,
              executionTime: cpuTime,
              memory: memory
            });
          } catch (error) {
            // axios collapses an HTTP failure into "Request failed with status
            // code 403", which says nothing about WHY. JDoodle's own message —
            // invalid credentials vs. daily limit reached vs. plan expired — is
            // in error.response.data, and needs three very different responses.
            // Log it, or an outage is undiagnosable from the server logs alone.
            const jdoodleStatus = error.response?.status;
            const jdoodleBody = error.response?.data;
            console.error('[JDoodle] Error executing test case:', error.message,
              jdoodleStatus ? `| HTTP ${jdoodleStatus}` : '',
              jdoodleBody ? `| JDoodle said: ${JSON.stringify(jdoodleBody)}` : '');
            const detail = jdoodleBody?.error || jdoodleBody?.message;
            testResults.push({
              input: testInput,
              expectedOutput: expectedOutput,
              // Students should not read a raw provider error, but the status is
              // useful to whoever they forward the screenshot to.
              actualOutput: detail
                ? `Execution service error (${jdoodleStatus}): ${detail}`
                : error.message,
              passed: false,
              error: 'Execution Error'
            });
          }
        }

        res.json({
          success: true,
          data: {
            testResults: testResults
          }
        });
        return next();
      }

      // Fallback: single execution (no test cases provided)
      console.log(`[JDoodle] Executing ${language} code`);

      const response = await axios.post('https://api.jdoodle.com/v1/execute', {
        clientId: CLIENT_ID,
        clientSecret: CLIENT_SECRET,
        script: code,
        language: jdoodleConfig.language,
        versionIndex: jdoodleConfig.versionIndex,
        stdin: input || ''
      });

      console.log('[JDoodle] Response:', JSON.stringify(response.data));

      const { output, statusCode, memory, cpuTime } = response.data;

      // Check if execution was successful  
      if (statusCode && statusCode !== 200) {
        res.json({
          success: true,
          data: {
            output: output || 'Execution failed',
            error: true,
            errorType: statusCode === 400 ? 'Compilation Error' : 'Runtime Error'
          }
        });
        return next();
      }

      // Return successful output
      res.json({
        success: true,
        data: {
          output: (output || '').trim(),
          error: false,
          executionTime: cpuTime,
          memory: memory
        }
      });
      return next();

    } catch (error) {
      console.error('[JDoodle] API Error:', error.message);

      // Log detailed error info for debugging
      if (error.response) {
        console.error('[JDoodle] Status:', error.response.status);
        console.error('[JDoodle] Response Data:', JSON.stringify(error.response.data));

        // Helpful error messages for common issues
        if (error.response.status === 401) {
          res.locals.responseData = {
            success: false,
            status: 401,
            message: "JDoodle API authentication failed. Check your JDOODLE_CLIENT_ID and JDOODLE_CLIENT_SECRET in .env",
            error: "Invalid credentials"
          };
        } else if (error.response.status === 429) {
          res.locals.responseData = {
            success: false,
            status: 429,
            message: "JDoodle API rate limit exceeded. Upgrade to Pro plan for unlimited executions: https://www.jdoodle.com/compiler-api/pricing",
            error: "Rate limit exceeded"
          };
        } else {
          res.locals.responseData = {
            success: false,
            status: 500,
            message: "Code execution service error",
            error: error.response.data?.error || error.message
          };
        }
      } else {
        res.locals.responseData = {
          success: false,
          status: 500,
          message: "Code execution service unavailable. Please check your internet connection.",
          error: error.message
        };
      }
      next();
    }
  }
}
