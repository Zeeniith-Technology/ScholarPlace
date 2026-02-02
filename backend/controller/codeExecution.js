import { spawn } from 'child_process'
import { writeFileSync, unlinkSync, mkdirSync, existsSync, readdirSync, statSync } from 'fs'
import { join } from 'path'
import { promisify } from 'util'
import { exec } from 'child_process'

const execAsync = promisify(exec)

/** Run an executable with stdin string; returns { stdout, stderr, code }. cwd = directory to run in. */
function runWithStdin(exePath, stdinStr, timeoutMs = 5000, cwd) {
  const workDir = cwd || join(exePath, '..')
  return new Promise((resolve, reject) => {
    const child = spawn(exePath, [], {
      cwd: workDir,
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: false
    })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (d) => { stdout += d.toString() })
    child.stderr.on('data', (d) => { stderr += d.toString() })
    const timer = setTimeout(() => {
      child.kill()
      reject(new Error('Execution timeout'))
    }, timeoutMs)
    child.on('error', (err) => {
      clearTimeout(timer)
      reject(err)
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      resolve({ stdout, stderr, code })
    })
    child.stdin.write(stdinStr, (err) => {
      if (err) {
        clearTimeout(timer)
        child.kill()
        reject(err)
        return
      }
      child.stdin.end()
    })
  })
}

/**
 * Get machine-readable stdin from a test case for piping to program.
 * - If testCase.stdin exists, use it (ensure newline for cin/input()).
 * - Else if testCase.input looks like "n = 3" or "n=5", extract the number(s) for single-int problems.
 * - Else use testCase.input as-is.
 */
function getStdinForTestCase(testCase) {
  if (testCase.stdin != null && testCase.stdin !== '') {
    const s = String(testCase.stdin).trim()
    return s.endsWith('\n') ? s : s + '\n'
  }
  const input = String(testCase.input || '').trim()
  if (!input) return ''
  // Single integer: "n = 3", "n=5", "3", " 5 "
  const singleNum = input.match(/\bn\s*=\s*(\d+)\b/i) || input.match(/^\s*(\d+)\s*$/)
  if (singleNum) return singleNum[1] + '\n'
  // Use as-is (e.g. multi-line input); ensure trailing newline for cin
  return input.endsWith('\n') ? input : input + '\n'
}

export default class CodeExecutionController {
  constructor() {
    // Create temp directory if it doesn't exist
    this.tempDir = join(process.cwd(), 'temp', 'code-execution')
    if (!existsSync(this.tempDir)) {
      mkdirSync(this.tempDir, { recursive: true })
    }
    
    // Scalability: Execution queue and limits
    this.executionQueue = []
    this.activeExecutions = 0
    this.maxConcurrentExecutions = 10 // Max 10 concurrent executions
    this.maxQueueSize = 50 // Max 50 queued requests
    
    // Rate limiting per user (userId -> { count, resetTime })
    this.userRateLimits = new Map()
    this.rateLimitWindow = 60 * 1000 // 1 minute
    this.maxExecutionsPerMinute = 5 // Max 5 executions per minute per user
    
    // Resource limits
    this.maxFileSize = 100 * 1024 // 100KB max code size
    this.maxTempFiles = 1000 // Max 1000 temp files
    
    // Cleanup old files on startup and schedule periodic cleanup
    this.cleanupOldFiles()
    // Cleanup every 30 minutes
    setInterval(() => this.cleanupOldFiles(), 30 * 60 * 1000)
    // Cleanup queue every 5 minutes
    setInterval(() => this.cleanupQueue(), 5 * 60 * 1000)
  }

  /**
   * Check rate limit for user
   */
  checkRateLimit(userId) {
    const now = Date.now()
    const userLimit = this.userRateLimits.get(userId)
    
    if (!userLimit || now > userLimit.resetTime) {
      // Reset or create limit
      this.userRateLimits.set(userId, {
        count: 1,
        resetTime: now + this.rateLimitWindow
      })
      return true
    }
    
    if (userLimit.count >= this.maxExecutionsPerMinute) {
      return false
    }
    
    userLimit.count++
    return true
  }

  /**
   * Execute code with timeout and resource limits
   * Route: POST /code/execute
   */
  async executeCode(req, res, next) {
    try {
      const { code, language = 'javascript', testCases } = req.body
      // Get userId from authenticated user (set by auth middleware)
      const userId = req.userId || req.user?.id || 'anonymous'

      // Rate limiting
      if (!this.checkRateLimit(userId)) {
        res.locals.responseData = {
          success: false,
          status: 429,
          message: `Rate limit exceeded. Maximum ${this.maxExecutionsPerMinute} executions per minute.`,
          error: 'Rate limit exceeded'
        }
        return next()
      }

      if (!code || !code.trim()) {
        res.locals.responseData = {
          success: false,
          status: 400,
          message: 'Code is required',
          error: 'Missing code'
        }
        return next()
      }

      // Resource limit: Check code size
      if (code.length > this.maxFileSize) {
        res.locals.responseData = {
          success: false,
          status: 400,
          message: `Code size exceeds limit of ${this.maxFileSize / 1024}KB`,
          error: 'Code too large'
        }
        return next()
      }

      // Check queue size
      if (this.executionQueue.length >= this.maxQueueSize) {
        res.locals.responseData = {
          success: false,
          status: 503,
          message: 'Server is busy. Please try again in a moment.',
          error: 'Queue full'
        }
        return next()
      }

      // Security: Basic validation
      if (this.containsDangerousCode(code, language)) {
        res.locals.responseData = {
          success: false,
          status: 403,
          message: 'Code contains potentially dangerous operations',
          error: 'Security violation'
        }
        return next()
      }

      // Queue execution if at max concurrent executions
      if (this.activeExecutions >= this.maxConcurrentExecutions) {
        return new Promise((resolve) => {
          this.executionQueue.push({
            req,
            res,
            next,
            code,
            language,
            testCases,
            userId,
            createdAt: Date.now(),
            resolve
          })
        })
      }

      // Execute immediately
      this.activeExecutions++
      try {
        const result = await this.executeCodeInternal(code, language, testCases)
        
        res.locals.responseData = {
          success: true,
          status: 200,
          message: 'Code executed successfully',
          data: result
        }
        return next()
      } finally {
        this.activeExecutions--
        this.processQueue()
      }
    } catch (error) {
      console.error('Code execution error:', error)
      this.activeExecutions--
      this.processQueue()
      res.locals.responseData = {
        success: false,
        status: 500,
        message: 'Code execution failed',
        error: error.message || 'Unknown error',
        data: {
          output: '',
          error: error.message || 'Execution failed'
        }
      }
      return next()
    }
  }

  /**
   * Internal code execution (actual execution logic)
   */
  async executeCodeInternal(code, language, testCases) {
    let result
    switch (language.toLowerCase()) {
      case 'javascript':
      case 'js':
        result = await this.executeJavaScript(code, testCases)
        break
      case 'c':
        result = await this.executeC(code, testCases)
        break
      case 'cpp':
      case 'c++':
        result = await this.executeCpp(code, testCases)
        break
      case 'python':
      case 'py':
        result = await this.executePython(code, testCases)
        break
      default:
        throw new Error(`Language ${language} is not supported`)
    }
    return result
  }

  /**
   * Process execution queue
   */
  async processQueue() {
    if (this.executionQueue.length === 0 || this.activeExecutions >= this.maxConcurrentExecutions) {
      return
    }

    const job = this.executionQueue.shift()
    if (!job) return

    this.activeExecutions++
    try {
      const result = await this.executeCodeInternal(job.code, job.language, job.testCases)
      
      job.res.locals.responseData = {
        success: true,
        status: 200,
        message: 'Code executed successfully',
        data: result
      }
      job.next()
      if (job.resolve) job.resolve()
    } catch (error) {
      console.error('Queued code execution error:', error)
      job.res.locals.responseData = {
        success: false,
        status: 500,
        message: 'Code execution failed',
        error: error.message
      }
      job.next()
      if (job.resolve) job.resolve()
    } finally {
      this.activeExecutions--
      // Process next in queue
      setImmediate(() => this.processQueue())
    }
  }

  /**
   * Cleanup stale queue items
   */
  cleanupQueue() {
    const now = Date.now()
    const maxAge = 5 * 60 * 1000 // 5 minutes
    
    this.executionQueue = this.executionQueue.filter(job => {
      if (!job.createdAt) {
        job.createdAt = now
        return true
      }
      
      if (now - job.createdAt > maxAge) {
        // Timeout old queue items
        job.res.locals.responseData = {
          success: false,
          status: 408,
          message: 'Request timeout. Please try again.',
          error: 'Request timeout'
        }
        job.next()
        if (job.resolve) job.resolve()
        return false
      }
      return true
    })
  }

  /**
   * Execute JavaScript code
   */
  async executeJavaScript(code, testCases) {
    return new Promise((resolve, reject) => {
      const timeout = 5000 // 5 seconds
      const startTime = Date.now()

      // Wrap code in a function to capture output
      const wrappedCode = `
        const output = [];
        const originalLog = console.log;
        console.log = (...args) => {
          output.push(args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' '));
          originalLog(...args);
        };
        
        try {
          ${code}
        } catch (error) {
          output.push('Error: ' + error.message);
        }
        
        output.join('\\n');
      `

      const child = spawn('node', ['-e', wrappedCode], {
        cwd: this.tempDir,
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout
      })

      let stdout = ''
      let stderr = ''
      let output = ''

      child.stdout.on('data', (data) => {
        stdout += data.toString()
      })

      child.stderr.on('data', (data) => {
        stderr += data.toString()
      })

      const timer = setTimeout(() => {
        child.kill()
        reject(new Error('Execution timeout: Code took too long to execute'))
      }, timeout)

      child.on('close', (code) => {
        clearTimeout(timer)
        const executionTime = Date.now() - startTime

        if (code !== 0) {
          resolve({
            output: '',
            error: stderr || 'Execution failed',
            executionTime
          })
          return
        }

        output = stdout.trim() || 'No output'

        // If test cases provided, run them
        if (testCases && testCases.length > 0) {
          const testResults = this.runTestCases(code, testCases, output)
          resolve({
            output,
            testResults,
            executionTime
          })
        } else {
          resolve({
            output,
            executionTime
          })
        }
      })

      child.on('error', (error) => {
        clearTimeout(timer)
        reject(error)
      })
    })
  }

  /**
   * Execute C code
   * When testCases are provided, runs the binary once per test case with stdin from each test case.
   */
  async executeC(code, testCases) {
    const timestamp = Date.now()
    const fileName = `code_${timestamp}.c`
    const filePath = join(this.tempDir, fileName)
    const exePath = join(this.tempDir, `code_${timestamp}${process.platform === 'win32' ? '.exe' : ''}`)

    try {
      writeFileSync(filePath, code)

      await execAsync(`gcc "${filePath}" -o "${exePath}"`, {
        timeout: 10000,
        cwd: this.tempDir
      })

      if (testCases && testCases.length > 0) {
        const testResults = []
        let lastOutput = ''
        for (const tc of testCases) {
          const stdinStr = getStdinForTestCase(tc)
          const expected = String(tc.expectedOutput ?? tc.output ?? tc.expected_output ?? '').trim()
          try {
            const { stdout, stderr } = await runWithStdin(exePath, stdinStr, 5000, this.tempDir)
            const actual = (stdout || '').trim()
            lastOutput = actual
            const passed = actual === expected
            testResults.push({
              passed,
              input: tc.input || stdinStr.trim(),
              expected,
              actual: actual || '(no output)',
              error: passed ? undefined : (stderr || 'Output mismatch')
            })
          } catch (runErr) {
            testResults.push({
              passed: false,
              input: tc.input || stdinStr.trim(),
              expected,
              actual: '(no output)',
              error: runErr.message || 'Execution failed'
            })
          }
        }
        this.cleanupFiles([filePath, exePath])
        return {
          output: lastOutput || 'No output',
          testResults,
          executionTime: Date.now()
        }
      }

      const executeResult = await execAsync(`"${exePath}"`, {
        timeout: 5000,
        cwd: this.tempDir
      })

      const output = executeResult.stdout.trim() || 'No output'
      this.cleanupFiles([filePath, exePath])
      return {
        output,
        executionTime: Date.now()
      }
    } catch (error) {
      this.cleanupFiles([filePath, exePath])
      return {
        output: '',
        error: error.stderr || error.message || 'Compilation or execution failed'
      }
    }
  }

  /**
   * Execute C++ code
   * When testCases are provided, runs the binary once per test case with stdin from each test case.
   */
  async executeCpp(code, testCases) {
    const timestamp = Date.now()
    const fileName = `code_${timestamp}.cpp`
    const filePath = join(this.tempDir, fileName)
    // On Windows, executable needs .exe extension
    const exePath = join(this.tempDir, `code_${timestamp}${process.platform === 'win32' ? '.exe' : ''}`)

    try {
      writeFileSync(filePath, code)

      const compileResult = await execAsync(`g++ "${filePath}" -o "${exePath}"`, {
        timeout: 10000,
        cwd: this.tempDir
      })

      if (testCases && testCases.length > 0) {
        const testResults = []
        let lastOutput = ''
        for (const tc of testCases) {
          const stdinStr = getStdinForTestCase(tc)
          const expected = String(tc.expectedOutput ?? tc.output ?? tc.expected_output ?? '').trim()
          try {
            const { stdout, stderr } = await runWithStdin(exePath, stdinStr, 5000, this.tempDir)
            const actual = (stdout || '').trim()
            lastOutput = actual
            const passed = actual === expected
            testResults.push({
              passed,
              input: tc.input || stdinStr.trim(),
              expected,
              actual: actual || '(no output)',
              error: passed ? undefined : (stderr || 'Output mismatch')
            })
          } catch (runErr) {
            testResults.push({
              passed: false,
              input: tc.input || stdinStr.trim(),
              expected,
              actual: '(no output)',
              error: runErr.message || 'Execution failed'
            })
          }
        }
        this.cleanupFiles([filePath, exePath])
        return {
          output: lastOutput || 'No output',
          testResults,
          executionTime: Date.now()
        }
      }

      const executeResult = await execAsync(`"${exePath}"`, {
        timeout: 5000,
        cwd: this.tempDir
      })

      const output = executeResult.stdout.trim() || 'No output'

      this.cleanupFiles([filePath, exePath])

      return {
        output,
        executionTime: Date.now()
      }
    } catch (error) {
      this.cleanupFiles([filePath, exePath])
      return {
        output: '',
        error: error.stderr || error.message || 'Compilation or execution failed'
      }
    }
  }

  /**
   * Execute Python code
   * When testCases are provided, runs the script once per test case with stdin from each test case.
   */
  async executePython(code, testCases) {
    const timeout = 5000
    const fileName = `code_${Date.now()}.py`
    const filePath = join(this.tempDir, fileName)

    try {
      writeFileSync(filePath, code)

      if (testCases && testCases.length > 0) {
        const testResults = []
        let lastOutput = ''
        for (const tc of testCases) {
          const stdinStr = getStdinForTestCase(tc)
          const expected = String(tc.expectedOutput ?? tc.output ?? tc.expected_output ?? '').trim()
          try {
            const { stdout, stderr } = await this.runPythonWithStdin(filePath, stdinStr, timeout)
            const actual = (stdout || '').trim()
            lastOutput = actual
            const passed = actual === expected
            testResults.push({
              passed,
              input: tc.input || stdinStr.trim(),
              expected,
              actual: actual || '(no output)',
              error: passed ? undefined : (stderr || 'Output mismatch')
            })
          } catch (runErr) {
            testResults.push({
              passed: false,
              input: tc.input || stdinStr.trim(),
              expected,
              actual: '(no output)',
              error: runErr.message || 'Execution failed'
            })
          }
        }
        this.cleanupFiles([filePath])
        return {
          output: lastOutput || 'No output',
          testResults,
          executionTime: Date.now()
        }
      }

      return new Promise((resolve, reject) => {
        const child = spawn('python', [filePath], {
          cwd: this.tempDir,
          stdio: ['pipe', 'pipe', 'pipe'],
          timeout
        })

        let stdout = ''
        let stderr = ''

        child.stdout.on('data', (data) => { stdout += data.toString() })
        child.stderr.on('data', (data) => { stderr += data.toString() })

        const timer = setTimeout(() => {
          child.kill()
          this.cleanupFiles([filePath])
          reject(new Error('Execution timeout'))
        }, timeout)

        child.on('close', (code) => {
          clearTimeout(timer)
          this.cleanupFiles([filePath])
          if (code !== 0) {
            resolve({ output: '', error: stderr || 'Execution failed' })
          } else {
            resolve({ output: stdout.trim() || 'No output' })
          }
        })

        child.on('error', (err) => {
          clearTimeout(timer)
          this.cleanupFiles([filePath])
          reject(err)
        })
      })
    } catch (error) {
      this.cleanupFiles([filePath])
      return {
        output: '',
        error: error.message || 'Execution failed'
      }
    }
  }

  /** Run Python script with stdin; returns Promise<{ stdout, stderr }>. */
  runPythonWithStdin(filePath, stdinStr, timeoutMs = 5000) {
    return new Promise((resolve, reject) => {
      const child = spawn('python', [filePath], {
        cwd: this.tempDir,
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: timeoutMs
      })
      let stdout = ''
      let stderr = ''
      child.stdout.on('data', (d) => { stdout += d.toString() })
      child.stderr.on('data', (d) => { stderr += d.toString() })
      const timer = setTimeout(() => {
        child.kill()
        reject(new Error('Execution timeout'))
      }, timeoutMs)
      child.on('error', reject)
      child.on('close', (code) => {
        clearTimeout(timer)
        resolve({ stdout, stderr, code })
      })
      child.stdin.write(stdinStr, (err) => {
        if (err) {
          clearTimeout(timer)
          child.kill()
          reject(err)
        } else {
          child.stdin.end()
        }
      })
    })
  }

  /**
   * Run test cases against code output
   */
  runTestCases(code, testCases, actualOutput) {
    return testCases.map((testCase, index) => {
      // Simple comparison - can be enhanced for more complex scenarios
      const expected = String(testCase.expectedOutput).trim()
      const actual = String(actualOutput).trim()

      return {
        passed: expected === actual,
        input: testCase.input || '',
        expected,
        actual,
        error: expected !== actual ? 'Output mismatch' : undefined
      }
    })
  }

  /**
   * Check for dangerous code patterns
   */
  containsDangerousCode(code, language) {
    const dangerousPatterns = [
      /require\s*\(\s*['"]fs['"]/,
      /require\s*\(\s*['"]child_process['"]/,
      /require\s*\(\s*['"]exec['"]/,
      /eval\s*\(/,
      /Function\s*\(/,
      /process\.exit/,
      /process\.kill/,
      /__dirname/,
      /__filename/,
      /system\s*\(/,
      /exec\s*\(/,
      /popen\s*\(/,
      /subprocess/,
      /os\.system/,
      /import\s+os/,
      /import\s+subprocess/,
      /import\s+sys/,
    ]

    return dangerousPatterns.some(pattern => pattern.test(code))
  }

  /**
   * Cleanup temporary files
   */
  cleanupFiles(files) {
    files.forEach(file => {
      try {
        if (existsSync(file)) {
          unlinkSync(file)
        }
      } catch (error) {
        // On Windows, files might be locked - try again after a short delay
        if (process.platform === 'win32') {
          setTimeout(() => {
            try {
              if (existsSync(file)) {
                unlinkSync(file)
              }
            } catch (retryError) {
              // If still fails, mark for later cleanup
              console.warn(`Could not cleanup file ${file}, will retry later`)
            }
          }, 1000)
        } else {
          console.warn(`Error cleaning up file ${file}:`, error.message)
        }
      }
    })
  }
  
  /**
   * Cleanup all old temporary files (call this periodically or on startup)
   */
  cleanupOldFiles() {
    try {
      const files = readdirSync(this.tempDir)
      const now = Date.now()
      const maxAge = 30 * 60 * 1000 // 30 minutes (reduced for better cleanup)
      let cleanedCount = 0
      let totalSize = 0
      
      // If we have too many files, clean more aggressively
      const shouldAggressiveClean = files.length > this.maxTempFiles
      const aggressiveMaxAge = shouldAggressiveClean ? 10 * 60 * 1000 : maxAge // 10 minutes if too many files
      
      files.forEach(file => {
        const filePath = join(this.tempDir, file)
        try {
          const stats = statSync(filePath)
          const age = now - stats.mtimeMs
          totalSize += stats.size
          
          // Clean if old OR if we have too many files
          if (age > aggressiveMaxAge || (shouldAggressiveClean && age > 5 * 60 * 1000)) {
            unlinkSync(filePath)
            cleanedCount++
          }
        } catch (error) {
          // File might be in use, skip it
          console.warn(`Could not check/clean file ${file}:`, error.message)
        }
      })
      
      if (cleanedCount > 0) {
        console.log(`🧹 Cleaned up ${cleanedCount} old temporary files (${(totalSize / 1024 / 1024).toFixed(2)}MB)`)
      }
      
      // Log current status
      const remainingFiles = readdirSync(this.tempDir).length
      if (remainingFiles > this.maxTempFiles * 0.8) {
        console.warn(`⚠️  Temp folder has ${remainingFiles} files (limit: ${this.maxTempFiles})`)
      }
    } catch (error) {
      console.error('Error cleaning up old files:', error)
    }
  }
}
