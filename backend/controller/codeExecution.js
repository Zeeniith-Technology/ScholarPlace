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

      // If testCases are provided, run ALL of them
      if (testCases && Array.isArray(testCases) && testCases.length > 0) {
        // Test execution logs minimal

        const testResults = [];

        for (const testCase of testCases) {
          const testInput = testCase.input || '';
          const expectedOutput = (testCase.output || testCase.expected_output || testCase.expectedOutput || '').trim();

          // Test case details removed for security

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

          // Execute with Piston
          const response = await axios.post('https://emkc.org/api/v2/piston/execute', {
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
              actualOutput: `Compilation Error:\n${compile.stderr || compile.output}`,
              passed: false,
              error: compile.stderr || compile.output
            });
            continue;
          }

          // Get actual output
          let actualOutput = (run.stdout || run.output || '').trim();
          const stderr = (run.stderr || '').trim();

          // Handle runtime errors
          if (!actualOutput && stderr) {
            actualOutput = `Error:\n${stderr}`;
          } else if (run.code !== 0 && stderr) {
            actualOutput += `\n\nRuntime Error:\n${stderr}`;
          }

          // Compare outputs (normalize for comparison)
          const passed = actualOutput === expectedOutput;

          // Per-test logging removed

          testResults.push({
            input: testInput,
            expectedOutput: expectedOutput,
            actualOutput: actualOutput,
            passed: passed,
            error: stderr || (run.code !== 0 ? 'Runtime error' : null)
          });
        }

        // Return test results
        const allPassed = testResults.every(t => t.passed);
        const passedCount = testResults.filter(t => t.passed).length;

        console.log(`[CodeExec Summary] ${passedCount}/${testResults.length} tests passed → ${allPassed ? '✅ ALL PASSED' : '❌ SOME FAILED'}`);

        res.json({
          success: true,
          data: {
            testResults: testResults,
            output: allPassed
              ? `✅ All ${testResults.length} test cases passed!`
              : `❌ ${testResults.filter(t => !t.passed).length} of ${testResults.length} test cases failed.`
          }
        });
        return next();
      }

      // Fallback: single execution (no test cases provided)
      console.log(`[CodeExecution] Sending request to Piston for ${language}`);
      console.log(`[CodeExecution] Raw Input:`, JSON.stringify(input));

      // Sanitize input: strip variable names but preserve all values
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

      const response = await axios.post('https://emkc.org/api/v2/piston/execute', {
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

      res.locals.responseData = {
        success: false,
        status: 500,
        message: "Code execution service unavailable",
        error: error.message
      };
      next();
    }
  }
}
