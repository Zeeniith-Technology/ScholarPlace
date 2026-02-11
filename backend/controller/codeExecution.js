import axios from 'axios';

export default class codeExecutionController {
  async executeCode(req, res, next) {
    try {
      const { language, code, input } = req.body;

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

      console.log(`[CodeExecution] Sending request to Piston for ${language}`);

      const response = await axios.post('https://emkc.org/api/v2/piston/execute', {
        language: pistonConfig.language,
        version: pistonConfig.version,
        files: [
          {
            content: code
          }
        ],
        stdin: input || "",
        args: [],
        compile_timeout: 10000,
        run_timeout: 3000,
        memory_limit: 128 * 1024 * 1024,
      });

      const { run, compile } = response.data;

      // Check if compilation failed (for compiled languages)
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
      res.json({
        success: true,
        data: {
          output: run.output,
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
