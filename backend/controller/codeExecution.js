import axios from 'axios';

export default class codeExecutionController {
  async executeCode(req, res, next) {
    try {
      const { language, code, input, testCases } = req.body;

      if (!code || !language) {
        res.status(400).json({
          success: false,
          message: "Code and language are required"
        });
        return next();
      }

      // Map frontend language names to Piston language names/versions
      const languageMap = {
        'python': { language: 'python', version: '3.10.0' },
        'javascript': { language: 'javascript', version: '18.15.0' },
        'c': { language: 'c', version: '10.2.0' },
        'cpp': { language: 'c++', version: '10.2.0' },
        'java': { language: 'java', version: '15.0.2' },
        'csharp': { language: 'csharp', version: '6.12.0' },
        'go': { language: 'go', version: '1.16.2' }
      };

      const pistonConfig = languageMap[language.toLowerCase()];

      if (!pistonConfig) {
        res.status(400).json({
          success: false,
          message: `Unsupported language: ${language}`
        });
        return next();
      }

      // Use self-hosted Piston (UNLIMITED & FREE!) OR RapidAPI Judge0
      // For Windows Docker issues, use RapidAPI temporarily
      // Get free key at: https://rapidapi.com/judge0-official/api/judge0-ce
      const useRapidAPI = !process.env.PISTON_URL || process.env.PISTON_URL.includes('rapidapi');
      const pistonUrl = process.env.PISTON_URL || 'https://judge0-ce.p.rapidapi.com/submissions';

      // If testCases are provided, run ALL of them
      if (testCases && Array.isArray(testCases) && testCases.length > 0) {
        const testResults = [];

        for (const testCase of testCases) {
          const testInput = testCase.input || '';
          const expectedOutput = (testCase.output || testCase.expected_output || testCase.expectedOutput || '').trim();

          // Sanitize input
          let sanitizedInput = testInput;
          if (typeof sanitizedInput === 'string' && sanitizedInput.includes('=')) {
            const assignments = sanitizedInput.split(',').map(s => s.trim());
            const values = [];

            for (const assignment of assignments) {
              if (assignment.includes('=')) {
                const parts = assignment.split('=');
                const value = parts.slice(1).join('=').trim();
                if (value) values.push(value);
              } else {
                if (values.length > 0) {
                  values[values.length - 1] += ', ' + assignment;
                }
              }
            }

            if (values.length > 0) {
              sanitizedInput = values.join(' ');
            }
          }

          // Execute with self-hosted Piston
          const response = await axios.post(pistonUrl, {
            language: pistonConfig.language,
            version: pistonConfig.version,
            files: [{ content: code }],
            stdin: sanitizedInput,
            args: [],
            compile_timeout: 10000,
            run_timeout: 3000,
            memory_limit: 128 * 1024 * 1024,
          });

          const { run, compile } = response.data;

          // Handle compilation error
          if (compile && compile.code !== 0) {
            testResults.push({
              input: testInput,
              expectedOutput: expectedOutput,
              actualOutput: compile.output || compile.stderr,
              passed: false,
              error: 'Compilation Error'
            });
            continue;
          }

          // Parse output
          let actualOutput = (run.stdout || run.output || '').trim();
          const stderr = (run.stderr || '').trim();

          if (!actualOutput && stderr) {
            actualOutput = stderr;
          }

          // Check if runtime error occurred
          if (run.code !== 0 && stderr) {
            testResults.push({
              input: testInput,
              expectedOutput: expectedOutput,
              actualOutput: actualOutput || stderr,
              passed: false,
              error: 'Runtime Error'
            });
            continue;
          }

          // Check if output matches expected
          const passed = actualOutput === expectedOutput;
          testResults.push({
            input: testInput,
            expectedOutput: expectedOutput,
            actualOutput: actualOutput,
            passed: passed
          });
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
      console.log(`[CodeExecution] Sending request to Piston for ${language}`);
      console.log(`[CodeExecution] Using URL: ${pistonUrl}`);

      // Sanitize input
      let sanitizedInput = input || "";
      if (typeof sanitizedInput === 'string' && sanitizedInput.includes('=')) {
        const assignments = sanitizedInput.split(',').map(s => s.trim());
        const values = [];

        for (const assignment of assignments) {
          if (assignment.includes('=')) {
            const parts = assignment.split('=');
            const value = parts.slice(1).join('=').trim();
            if (value) values.push(value);
          } else {
            if (values.length > 0) {
              values[values.length - 1] += ', ' + assignment;
            }
          }
        }

        if (values.length > 0) {
          sanitizedInput = values.join(' ');
          console.log(`[CodeExecution] Sanitized Input from "${input}" to "${sanitizedInput}"`);
        }
      }

      const response = await axios.post(pistonUrl, {
        language: pistonConfig.language,
        version: pistonConfig.version,
        files: [{ content: code }],
        stdin: sanitizedInput,
        args: [],
        compile_timeout: 10000,
        run_timeout: 3000,
        memory_limit: 128 * 1024 * 1024,
      });

      console.log('[CodeExecution] Piston Response:', JSON.stringify(response.data));

      const { run, compile } = response.data;

      // Check if compilation failed
      if (compile && compile.code !== 0) {
        res.json({
          success: true,
          data: {
            output: compile.output || compile.stderr,
            error: true
          }
        });
        return next();
      }

      // Return runtime output
      let actualOutput = (run.stdout || run.output || '').trim();
      const stderr = (run.stderr || '').trim();

      if (!actualOutput && stderr) {
        actualOutput = `Error:\n${stderr}`;
      } else if (run.code !== 0 && stderr) {
        actualOutput += `\n\nRuntime Error:\n${stderr}`;
      }

      res.json({
        success: true,
        data: {
          output: actualOutput,
          error: run.code !== 0
        }
      });
      return next();

    } catch (error) {
      console.error('[CodeExecution] Piston API Error:', error.message);

      // Log detailed error info for debugging
      if (error.response) {
        console.error('[CodeExecution] Status:', error.response.status);
        console.error('[CodeExecution] Response Data:', JSON.stringify(error.response.data));

        // Helpful error messages
        if (error.code === 'ECONNREFUSED') {
          res.locals.responseData = {
            success: false,
            status: 500,
            message: "Piston is not running. Please start it with: docker run -d -p 2000:2000 ghcr.io/engineer-man/piston",
            error: "Connection refused to Piston server"
          };
        } else {
          res.locals.responseData = {
            success: false,
            status: 500,
            message: "Code execution service error",
            error: error.response.data?.message || error.message
          };
        }
      } else if (error.code === 'ECONNREFUSED') {
        res.locals.responseData = {
          success: false,
          status: 500,
          message: "⚠️ Piston is not running! Run: docker run -d -p 2000:2000 ghcr.io/engineer-man/piston",
          error: "Connection refused - is Docker running?"
        };
      } else {
        res.locals.responseData = {
          success: false,
          status: 500,
          message: "Code execution service unavailable",
          error: error.message
        };
      }
      next();
    }
  }
}
