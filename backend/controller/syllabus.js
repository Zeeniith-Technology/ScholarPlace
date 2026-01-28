import { executeData, fetchData } from '../methods.js';
import syllabusSchema from '../schema/syllabus.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

export default class syllabuscontroller {

    async listsyllabus(req, res, next) {
        try {
            const { projection, filter, options } = req.body;
            
            const fetchOptions = {
                ...(options || {}),
                ...(req ? { req: req } : {})
            };
            
            const response = await fetchData(
                'tblSyllabus',
                projection || {},
                filter || {},
                fetchOptions
            );
            
            res.locals.responseData = {
                success: true,
                status: 200,
                message: 'Syllabus data fetched successfully',
                data: response.data
            };
            next();
        } catch (error) {
            res.locals.responseData = {
                success: false,
                status: 500,
                message: 'Fetch failed',
                error: error.message
            };
            next();
        }
    }
    
    async insertsyllabus(req, res, next) {
        try {
            const syllabusData = req.body;
            
            const response = await executeData(
                'tblSyllabus',
                syllabusData,
                'i',
                syllabusSchema
            );
            
            res.locals.responseData = {
                success: true,
                status: 201,
                message: 'Syllabus data inserted successfully',
                data: response.data
            };
            next();
        } catch (error) {
            res.locals.responseData = {
                success: false,
                status: 500,
                message: 'Insert failed',
                error: error.message
            };
            next();
        }
    }

    async updatesyllabus(req, res, next) {
        try {
            const { filter, data } = req.body;
            
            if (!filter) {
                res.locals.responseData = {
                    success: false,
                    status: 400,
                    message: 'Filter is required for update',
                    error: 'Missing filter parameter'
                };
                return next();
            }
            
            const response = await executeData(
                'tblSyllabus',
                data,
                'u',
                syllabusSchema,
                filter
            );
            
            res.locals.responseData = {
                success: true,
                status: 200,
                message: 'Syllabus data updated successfully',
                data: response.data
            };
            next();
        } catch (error) {
            res.locals.responseData = {
                success: false,
                status: 500,
                message: 'Update failed',
                error: error.message
            };
            next();
        }
    }

    async deletesyllabus(req, res, next) {
        try {
            const { filter } = req.body;
            
            if (!filter) {
                res.locals.responseData = {
                    success: false,
                    status: 400,
                    message: 'Filter is required for delete',
                    error: 'Missing filter parameter'
                };
                return next();
            }
            
            const response = await executeData(
                'tblSyllabus',
                null,
                'd',
                null,
                filter
            );
            
            res.locals.responseData = {
                success: true,
                status: 200,
                message: 'Syllabus data deleted successfully',
                data: response.data
            };
            next();
        } catch (error) {
            res.locals.responseData = {
                success: false,
                status: 500,
                message: 'Delete failed',
                error: error.message
            };
            next();
        }
    }

    async getWeek1Content(req, res, next) {
        try {
            const { day } = req.body || {}
            const dayParam = day || 'pre-week'
            
            const __filename = fileURLToPath(import.meta.url)
            const __dirname = path.dirname(__filename)
            
            const filePath = path.join(__dirname, '../../Product_Syllabus/Week-1-Complete-Lighter-Version')
            
            if (!fs.existsSync(filePath)) {
                res.locals.responseData = {
                    success: false,
                    status: 404,
                    message: 'Week 1 content file not found',
                    error: 'File not found'
                }
                return next()
            }

            const fileContent = fs.readFileSync(filePath, 'utf-8')
            const content = parseDayContent(fileContent, dayParam)
            
            // Debug logging
            console.log(`Parsed content for ${dayParam}:`, {
                title: content.title,
                contentLength: content.content?.length || 0,
                learningOutcomes: content.learning_outcomes?.length || 0,
                topics: content.topics?.length || 0
            })
            
            res.locals.responseData = {
                success: true,
                status: 200,
                message: 'Week 1 content fetched successfully',
                data: content  // Changed from 'content' to 'data' to match responsedata middleware
            }
            next()
        } catch (error) {
            res.locals.responseData = {
                success: false,
                status: 500,
                message: 'Failed to fetch content',
                error: error.message
            }
            next()
        }
    }

    /**
     * Get dynamic week content (supports Week 2+)
     * Route: POST /syllabus/week-content
     */
    async getWeekContent(req, res, next) {
        try {
            const { week, day } = req.body || {}
            const weekNum = parseInt(week) || 1
            const dayParam = day || (weekNum === 1 ? 'pre-week' : 'day-1')
            
            if (weekNum < 1 || weekNum > 10) {
                res.locals.responseData = {
                    success: false,
                    status: 400,
                    message: 'Week number must be between 1 and 10'
                }
                return next()
            }

            const __filename = fileURLToPath(import.meta.url)
            const __dirname = path.dirname(__filename)
            
            // Determine file path based on week
            // Week 4 is split into two files: Part 1 (Day 1) and Part 2 (Days 2-5)
            let filePath
            if (weekNum === 1) {
                filePath = path.join(__dirname, '../../Product_Syllabus/Week-1-Complete-Lighter-Version')
            } else if (weekNum === 2) {
                filePath = path.join(__dirname, '../../Product_Syllabus/Week2-Complete-All-Days.md')
            } else if (weekNum === 3) {
                filePath = path.join(__dirname, '../../Product_Syllabus/Week3-Enhanced_DSA.md')
            } else if (weekNum === 4) {
                // Week 4: Part 1 for Day 1, Part 2 for Days 2-5
                const dayNum = parseInt(dayParam.replace('day-', '')) || 1
                if (dayNum === 1) {
                    filePath = path.join(__dirname, '../../Product_Syllabus/Week4-Part1-Complete-Advanced-Theory.md')
                } else {
                    filePath = path.join(__dirname, '../../Product_Syllabus/Week4-Part2-Tuesday-Friday-Interview.md')
                }
            } else if (weekNum === 5) {
                // Week 5: Separate file for each day
                const dayNum = parseInt(dayParam.replace('day-', '')) || 1
                const dayFiles = {
                    1: 'Week5-Monday.md',
                    2: 'Week5-Tuesday.md',
                    3: 'Week5-Wednesday.md',
                    4: 'Week5-Thursday.md',
                    5: 'Week5-Friday.md'
                }
                const fileName = dayFiles[dayNum] || dayFiles[1]
                filePath = path.join(__dirname, `../../Product_Syllabus/${fileName}`)
            } else {
                res.locals.responseData = {
                    success: false,
                    status: 404,
                    message: `Week ${weekNum} content file not found`
                }
                return next()
            }
            
            if (!fs.existsSync(filePath)) {
                res.locals.responseData = {
                    success: false,
                    status: 404,
                    message: `Week ${weekNum} content file not found`,
                    error: 'File not found'
                }
                return next()
            }

            const fileContent = fs.readFileSync(filePath, 'utf-8')
            let content
            
            // Use appropriate parser based on week
            if (weekNum === 1) {
                content = parseDayContent(fileContent, dayParam)
            } else if (weekNum === 2) {
                content = parseWeek2DayContent(fileContent, dayParam)
            } else if (weekNum === 3) {
                content = parseWeek2DayContent(fileContent, dayParam) // Week 3 uses similar structure
            } else if (weekNum === 4) {
                content = parseWeek4DayContent(fileContent, dayParam) // Week 4 uses day names (MONDAY, TUESDAY, etc.)
            } else if (weekNum === 5) {
                content = parseWeek5DayContent(fileContent, dayParam) // Week 5 has separate files per day
            } else {
                // For future weeks, use Week 2 parser as template
                content = parseWeek2DayContent(fileContent, dayParam)
            }
            
            console.log(`Parsed content for Week ${weekNum}, Day ${dayParam}:`, {
                title: content.title,
                contentLength: content.content?.length || 0,
                learningOutcomes: content.learning_outcomes?.length || 0,
                topics: content.topics?.length || 0
            })
            
            res.locals.responseData = {
                success: true,
                status: 200,
                message: `Week ${weekNum} content fetched successfully`,
                data: content
            }
            next()
        } catch (error) {
            console.error('getWeekContent error:', error)
            res.locals.responseData = {
                success: false,
                status: 500,
                message: 'Failed to fetch content',
                error: error.message
            }
            next()
        }
    }

    async getAptitudeWeek1Content(req, res, next) {
        try {
            const { day } = req.body || {}
            const dayParam = day || 'day-1'
            
            const __filename = fileURLToPath(import.meta.url)
            const __dirname = path.dirname(__filename)
            
            const filePath = path.join(__dirname, '../../Product_Syllabus/Week1_Aptitude_Enhanced_Percentage.md')
            
            if (!fs.existsSync(filePath)) {
                res.locals.responseData = {
                    success: false,
                    status: 404,
                    message: 'Week 1 Aptitude content file not found',
                    error: 'File not found'
                }
                return next()
            }

            const fileContent = fs.readFileSync(filePath, 'utf-8')
            const content = parseAptitudeDayContent(fileContent, dayParam)
            
            console.log(`Parsed aptitude content for ${dayParam}:`, {
                title: content.title,
                contentLength: content.content?.length || 0,
                topics: content.topics?.length || 0
            })
            
            res.locals.responseData = {
                success: true,
                status: 200,
                message: 'Week 1 Aptitude content fetched successfully',
                data: content
            }
            next()
        } catch (error) {
            res.locals.responseData = {
                success: false,
                status: 500,
                message: 'Failed to fetch aptitude content',
                error: error.message
            }
            next()
        }
    }

    async getAptitudeWeek2Content(req, res, next) {
        try {
            const { day } = req.body || {}
            const dayParam = day || 'day-1'
            
            const __filename = fileURLToPath(import.meta.url)
            const __dirname = path.dirname(__filename)
            
            const filePath = path.join(__dirname, '../../Product_Syllabus/Week2_Aptitude_Teaching_Edition_Complete.md')
            
            if (!fs.existsSync(filePath)) {
                res.locals.responseData = {
                    success: false,
                    status: 404,
                    message: 'Week 2 Aptitude content file not found',
                    error: 'File not found'
                }
                return next()
            }

            const fileContent = fs.readFileSync(filePath, 'utf-8')
            const content = parseAptitudeWeek2DayContent(fileContent, dayParam)
            
            console.log(`Parsed aptitude Week 2 content for ${dayParam}:`, {
                title: content.title,
                contentLength: content.content?.length || 0,
                topics: content.topics?.length || 0
            })
            
            res.locals.responseData = {
                success: true,
                status: 200,
                message: 'Week 2 Aptitude content fetched successfully',
                data: content
            }
            next()
        } catch (error) {
            res.locals.responseData = {
                success: false,
                status: 500,
                message: 'Failed to fetch aptitude content',
                error: error.message
            }
            next()
        }
    }

    async getAptitudeWeek3Content(req, res, next) {
        try {
            const { day } = req.body || {}
            const dayParam = day || 'day-1'
            
            const __filename = fileURLToPath(import.meta.url)
            const __dirname = path.dirname(__filename)
            
            const filePath = path.join(__dirname, '../../Product_Syllabus/Week3_Aptitude_Complete_AllDays.md')
            
            if (!fs.existsSync(filePath)) {
                res.locals.responseData = {
                    success: false,
                    status: 404,
                    message: 'Week 3 Aptitude content file not found',
                    error: 'File not found'
                }
                return next()
            }

            const fileContent = fs.readFileSync(filePath, 'utf-8')
            const content = parseAptitudeWeek3DayContent(fileContent, dayParam)
            
            console.log(`Parsed aptitude Week 3 content for ${dayParam}:`, {
                title: content.title,
                contentLength: content.content?.length || 0,
                topics: content.topics?.length || 0
            })
            
            res.locals.responseData = {
                success: true,
                status: 200,
                message: 'Week 3 Aptitude content fetched successfully',
                data: content
            }
            next()
        } catch (error) {
            res.locals.responseData = {
                success: false,
                status: 500,
                message: 'Failed to fetch aptitude content',
                error: error.message
            }
            next()
        }
    }

    async getAptitudeWeek4Content(req, res, next) {
        try {
            const { day } = req.body || {}
            const dayParam = day || 'day-1'
            
            const __filename = fileURLToPath(import.meta.url)
            const __dirname = path.dirname(__filename)
            
            // Week 4 Aptitude: Days 1-2 from Week4_TimeWork_Pipes_CompleteDepth.md
            // Days 3-5 (Wednesday-Friday) from Week4-Part2-Pipes-Complete-Day3-5.md
            const dayNum = parseInt(dayParam.replace('day-', '')) || 1
            let filePath
            if (dayNum >= 1 && dayNum <= 2) {
                // Monday-Tuesday: Use main file
                filePath = path.join(__dirname, '../../Product_Syllabus/Week4_TimeWork_Pipes_CompleteDepth.md')
            } else if (dayNum === 3 || dayNum === 4 || dayNum === 5) {
                // Wednesday-Friday: Use separate file
                filePath = path.join(__dirname, '../../Product_Syllabus/Week4-Part2-Pipes-Complete-Day3-5.md')
            } else {
                // Fallback to main file
                filePath = path.join(__dirname, '../../Product_Syllabus/Week4_TimeWork_Pipes_CompleteDepth.md')
            }
            
            if (!fs.existsSync(filePath)) {
                res.locals.responseData = {
                    success: false,
                    status: 404,
                    message: 'Week 4 Aptitude content file not found',
                    error: 'File not found'
                }
                return next()
            }

            const fileContent = fs.readFileSync(filePath, 'utf-8')
            const content = parseAptitudeWeek4DayContent(fileContent, dayParam)
            
            console.log(`Parsed aptitude Week 4 content for ${dayParam}:`, {
                title: content.title,
                contentLength: content.content?.length || 0,
                topics: content.topics?.length || 0
            })
            
            res.locals.responseData = {
                success: true,
                status: 200,
                message: 'Week 4 Aptitude content fetched successfully',
                data: content
            }
            next()
        } catch (error) {
            res.locals.responseData = {
                success: false,
                status: 500,
                message: 'Failed to fetch aptitude content',
                error: error.message
            }
            next()
        }
    }

    async getAptitudeWeek5Content(req, res, next) {
        try {
            const { day } = req.body || {}
            const dayParam = day || 'day-1'
            
            const __filename = fileURLToPath(import.meta.url)
            const __dirname = path.dirname(__filename)
            
            // Week 5 Aptitude: Day 1 from Week5_UltraDeep_TSD_Trains_Boats.md
            // Days 2-5 (Tuesday-Friday) from Week5-Part2-Advanced-Complete-Day2-5.md
            const dayNum = parseInt(dayParam.replace('day-', '')) || 1
            let filePath
            if (dayNum === 1) {
                // Monday: Use main file
                filePath = path.join(__dirname, '../../Product_Syllabus/Week5_UltraDeep_TSD_Trains_Boats.md')
            } else if (dayNum >= 2 && dayNum <= 5) {
                // Tuesday-Friday: Use separate file
                filePath = path.join(__dirname, '../../Product_Syllabus/Week5-Part2-Advanced-Complete-Day2-5.md')
            } else {
                // Fallback to main file
                filePath = path.join(__dirname, '../../Product_Syllabus/Week5_UltraDeep_TSD_Trains_Boats.md')
            }
            
            if (!fs.existsSync(filePath)) {
                res.locals.responseData = {
                    success: false,
                    status: 404,
                    message: 'Week 5 Aptitude content file not found',
                    error: 'File not found'
                }
                return next()
            }

            const fileContent = fs.readFileSync(filePath, 'utf-8')
            const content = parseAptitudeWeek5DayContent(fileContent, dayParam)
            
            console.log(`Parsed aptitude Week 5 content for ${dayParam}:`, {
                title: content.title,
                contentLength: content.content?.length || 0,
                topics: content.topics?.length || 0
            })
            
            res.locals.responseData = {
                success: true,
                status: 200,
                message: 'Week 5 Aptitude content fetched successfully',
                data: content
            }
            next()
        } catch (error) {
            res.locals.responseData = {
                success: false,
                status: 500,
                message: 'Failed to fetch aptitude content',
                error: error.message
            }
            next()
        }
    }

    async getAptitudeWeek6Content(req, res, next) {
        try {
            const { day } = req.body || {}
            const dayParam = day || 'day-1'
            
            const __filename = fileURLToPath(import.meta.url)
            const __dirname = path.dirname(__filename)
            
            // Week 6 Aptitude: Days 1-3 from Week6_ProfitLoss_SI_CI_AllDays.md
            // Days 4-5 (Thursday-Friday) from Week6_Complete_Thu_Fri.md
            const dayNum = parseInt(dayParam.replace('day-', '')) || 1
            let filePath
            if (dayNum >= 1 && dayNum <= 3) {
                // Monday-Wednesday: Use main file
                filePath = path.join(__dirname, '../../Product_Syllabus/Week6_ProfitLoss_SI_CI_AllDays.md')
            } else if (dayNum === 4 || dayNum === 5) {
                // Thursday-Friday: Use separate file
                filePath = path.join(__dirname, '../../Product_Syllabus/Week6_Complete_Thu_Fri.md')
            } else {
                // Fallback to main file
                filePath = path.join(__dirname, '../../Product_Syllabus/Week6_ProfitLoss_SI_CI_AllDays.md')
            }
            
            if (!fs.existsSync(filePath)) {
                res.locals.responseData = {
                    success: false,
                    status: 404,
                    message: 'Week 6 Aptitude content file not found',
                    error: 'File not found'
                }
                return next()
            }

            const fileContent = fs.readFileSync(filePath, 'utf-8')
            const content = parseAptitudeWeek6DayContent(fileContent, dayParam)
            
            console.log(`Parsed aptitude Week 6 content for ${dayParam}:`, {
                title: content.title,
                contentLength: content.content?.length || 0,
                topics: content.topics?.length || 0
            })
            
            res.locals.responseData = {
                success: true,
                status: 200,
                message: 'Week 6 Aptitude content fetched successfully',
                data: content
            }
            next()
        } catch (error) {
            res.locals.responseData = {
                success: false,
                status: 500,
                message: 'Failed to fetch aptitude content',
                error: error.message
            }
            next()
        }
    }
}

/**
 * Parse day-specific content from Week 2 file
 */
function parseWeek2DayContent(fileContent, day) {
    const lines = fileContent.split('\n')
    const dayMap = {
        'day-1': { 
            patterns: ['# DAY 1:', 'DAY 1: ARRAY OPERATIONS', '# DAY 1 – MONDAY'], 
            title: 'Array Operations — Update, Search, Reverse' 
        },
        'day-2': { 
            patterns: ['# DAY 2:', 'DAY 2: INSERTION', '# DAY 2 – TUESDAY'], 
            title: 'Insertion & Deletion with Shifting' 
        },
        'day-3': { 
            patterns: ['# DAY 3:', 'DAY 3: BINARY SEARCH', '# DAY 3 – WEDNESDAY'], 
            title: 'Binary Search - The Divide & Conquer Way' 
        },
        'day-4': { 
            patterns: ['# DAY 4:', 'DAY 4: TWO-POINTER', '# DAY 4 – THURSDAY'], 
            title: 'Two-Pointer Patterns & Prefix Sum' 
        },
        'day-5': { 
            patterns: ['# DAY 5:', 'DAY 5: COMPREHENSIVE STRING', '# DAY 5 – FRIDAY'], 
            title: 'Comprehensive String Basics' 
        },
    }

    const dayInfo = dayMap[day] || dayMap['day-1']
    let inDay = false
    let dayContent = []
    let learningOutcomes = []
    let topics = []
    let currentSection = null

    console.log(`Parsing Week 2 content for day: ${day}, looking for patterns:`, dayInfo.patterns)

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        const trimmedLine = line.trim()
        
        // Check if we've reached the target day
        let foundDay = false
        
        // Handle multiple formats:
        // - "# 🟢 DAY 1:" (Week 2 format with emoji)
        // - "# DAY 1:" (old format)
        // - "# DAY 1 – MONDAY:" (Week 3 format with en dash)
        // - "DAY 1: ARRAY OPERATIONS"
        if (trimmedLine.startsWith('#') && trimmedLine.includes('DAY')) {
            const dayNum = day.replace('day-', '')
            // Match patterns like:
            // - "# 🟢 DAY 1:" (Week 2 format with emoji)
            // - "# DAY 1:" (old format)
            // - "# DAY 1 – MONDAY:" (Week 3 format with en dash –)
            // - "# DAY 1 — MONDAY:" (with em dash —)
            foundDay = trimmedLine.match(new RegExp(`#.*DAY ${dayNum}:`, 'i')) !== null || 
                      trimmedLine.match(new RegExp(`#.*DAY ${dayNum}\\s*[–—]`, 'i')) !== null ||
                      trimmedLine.match(new RegExp(`🟢.*DAY ${dayNum}:`, 'i')) !== null ||
                      trimmedLine.includes(`DAY ${dayNum} —`) ||
                      trimmedLine.includes(`DAY ${dayNum} –`) ||
                      (trimmedLine.includes(`DAY ${dayNum}:`) && trimmedLine.startsWith('#'))
        }
        
        // Also check for anchor tags like <a name="day-1"></a>
        if (!foundDay && trimmedLine.includes(`<a name="day-${day.replace('day-', '')}">`)) {
            // Found anchor tag, next line should be the day header
            foundDay = true
            // Skip the anchor tag line, we'll get the header on next iteration
            continue
        }
        
        if (foundDay && !inDay) {
            console.log(`Found day section at line ${i}: ${trimmedLine}`)
            inDay = true
            dayContent.push(line) // Include the day header
            continue
        }

        // If we're in a day section, collect content
        if (inDay) {
            // Skip placeholder messages
            if (trimmedLine.includes('[Continued in next part due to length...]') ||
                trimmedLine.includes('[Continued') ||
                trimmedLine.includes('Continued in next part')) {
                console.log(`Skipping placeholder message at line ${i}`)
                continue
            }
            
            // Skip anchor tags
            if (trimmedLine.startsWith('<a name=') || trimmedLine.includes('</a>')) {
                continue
            }
            
            // Stop at next day (but not the current day) - handle multiple formats
            if (trimmedLine.startsWith('#') && trimmedLine.includes('DAY')) {
                const currentDayNum = day.replace('day-', '')
                // Match formats:
                // - "# 🟢 DAY X:" (Week 2)
                // - "# DAY X:" (old format)
                // - "# DAY X – MONDAY:" (Week 3 with en dash)
                const nextDayMatch = trimmedLine.match(/#.*DAY (\d+)[:–—]/i)
                if (nextDayMatch && nextDayMatch[1] !== currentDayNum) {
                    console.log(`Stopping at line ${i}: ${trimmedLine} (next day detected)`)
                    break
                }
            }
            
            // Stop at week summary or next week
            if (trimmedLine.includes('Week 2 Complete Summary') || 
                trimmedLine.includes('Week 3 Complete Summary') ||
                trimmedLine.includes('# 📘 WEEK 3') ||
                trimmedLine.includes('# 📘 WEEK 4') ||
                trimmedLine.includes('## 📋 WEEK 2 SUMMARY') ||
                trimmedLine.includes('## 📋 WEEK 3 SUMMARY') ||
                trimmedLine.includes('COMPLETE PRACTICE GUIDE')) {
                console.log(`Stopping at line ${i}: ${trimmedLine} (summary detected)`)
                break
            }
            
            // Extract learning outcomes if present (new format may not have explicit section)
            if (trimmedLine.includes('## Learning Outcomes') || (trimmedLine.includes('Learning Outcomes') && trimmedLine.includes('##'))) {
                currentSection = 'learning_outcomes'
                dayContent.push(line)
                continue
            }

            if (currentSection === 'learning_outcomes' && (trimmedLine.startsWith('✅') || trimmedLine.startsWith('- ') || trimmedLine.startsWith('By the end') || trimmedLine.startsWith('###'))) {
                // Week 3 format has "### Beginner Level", "### Intermediate Level", etc.
                if (trimmedLine.startsWith('###')) {
                    // This is a level header, include it in content
                    dayContent.push(line)
                    continue
                }
                if (trimmedLine.startsWith('✅') || trimmedLine.startsWith('- ')) {
                    const outcome = trimmedLine.replace(/^[✅\-\*]\s*/, '').trim()
                    if (outcome && outcome.length > 5) {
                        learningOutcomes.push(outcome)
                    }
                }
                dayContent.push(line)
                continue
            }

            // Stop learning outcomes section when we hit a new heading
            if (trimmedLine.startsWith('##') && !trimmedLine.includes('Learning Outcomes') && currentSection === 'learning_outcomes') {
                currentSection = null
            }
            
            // Collect ALL content lines (the new format is more section-based)
            dayContent.push(line)

        }
    }

    // Extract topics from content - look for SECTION headers and key concepts
    const contentText = dayContent.join('\n')
    
    // Extract topics from SECTION headers (e.g., "## SECTION 1.2: ARRAY FUNDAMENTALS" or "## SECTION 1: WHAT ARE STRINGS")
    const sectionMatches = contentText.matchAll(/##\s*SECTION\s+\d+(?:\.\d+)?:\s*([^\n]+)/gi)
    for (const match of sectionMatches) {
        const sectionTitle = match[1].trim()
        if (sectionTitle && sectionTitle.length > 3 && !topics.includes(sectionTitle)) {
            topics.push(sectionTitle)
        }
    }
    
    // Also extract from topic keywords (expanded for Week 3)
    const topicKeywords = [
        'Array', 'Search', 'Reverse', 'Linear Search', 'Binary Search',
        'Insertion', 'Deletion', 'Two-Pointer', 'Prefix Sum', 'String',
        'Update', 'Shifting', 'Divide & Conquer', 'Palindrome', 'Range Sum',
        'Linked List', 'Node', 'Pointer', 'Traversal', 'Sliding Window',
        'Frequency', 'Anagram', 'Substring', 'Parsing', 'Memory Model'
    ]

    topicKeywords.forEach(keyword => {
        if (contentText.includes(keyword) && !topics.includes(keyword)) {
            topics.push(keyword)
        }
    })
    
    // Extract learning outcomes from day description if available
    // The new format has "Complete Day with X Examples | Y Questions" which we can use
    const dayDescriptionMatch = contentText.match(/##\s*Complete Day with[^\n]+/i)
    if (dayDescriptionMatch) {
        // Add a learning outcome based on the day description
        learningOutcomes.push(`Complete mastery with multiple examples and practice questions`)
    }
    
    // Extract learning outcomes from Week 3 format (### Beginner Level, ### Intermediate Level, etc.)
    const levelMatches = contentText.matchAll(/###\s*(Beginner|Intermediate|Expert)\s+Level[^\n]*\n([\s\S]*?)(?=###|##|$)/gi)
    for (const match of levelMatches) {
        const level = match[1]
        const levelContent = match[2]
        // Extract bullet points from each level
        const bulletMatches = levelContent.matchAll(/^[-•]\s*(.+)$/gm)
        for (const bulletMatch of bulletMatches) {
            const outcome = bulletMatch[1].trim()
            if (outcome && outcome.length > 5 && !learningOutcomes.includes(outcome)) {
                learningOutcomes.push(`${level}: ${outcome}`)
            }
        }
    }

    // Clean up and format content
    let cleanedContent = dayContent.join('\n').trim()
    
    // Remove placeholder messages if they exist
    cleanedContent = cleanedContent.replace(/\[Continued in next part due to length\.\.\.\]/g, '')
    cleanedContent = cleanedContent.replace(/\[Continued.*?\]/g, '')
    cleanedContent = cleanedContent.trim()
    
    // Extract actual title from day header (more accurate than dayMap)
    let extractedTitle = dayInfo.title
    const dayHeaderMatch = cleanedContent.match(/^#\s*.*?DAY\s+\d+\s*[–—:]\s*([^\n]+)/i)
    if (dayHeaderMatch && dayHeaderMatch[1]) {
        extractedTitle = dayHeaderMatch[1].trim()
        // Clean up title (remove day names like MONDAY, TUESDAY, etc. if present)
        extractedTitle = extractedTitle.replace(/^\s*(MONDAY|TUESDAY|WEDNESDAY|THURSDAY|FRIDAY)\s*[–—:]\s*/i, '')
    }
    
    console.log(`Week 2+ content collection summary for ${day}:`, {
        linesCollected: dayContent.length,
        contentLength: cleanedContent.length,
        learningOutcomes: learningOutcomes.length,
        topics: topics.length,
        extractedTitle: extractedTitle
    })
    
    if (!cleanedContent || cleanedContent.length < 200) {
        console.log(`Warning: Limited content for Week 2+, Day ${day}. Collected ${dayContent.length} lines. Content may be incomplete.`)
    }

    return {
        day: `Day ${day.replace('day-', '')}`,
        title: extractedTitle || dayInfo.title,
        learning_outcomes: learningOutcomes.length > 0 ? learningOutcomes : [],
        topics: topics.length > 0 ? topics : [],
        content: cleanedContent || `Content for ${extractedTitle || dayInfo.title} is being loaded...`,
        key_concepts: extractKeyConcepts ? extractKeyConcepts(cleanedContent) : []
    }
}

/**
 * Parse day-specific content from Week 4 file (handles both Part 1 and Part 2)
 * Part 1: Day 1 (MONDAY)
 * Part 2: Days 2-5 (TUESDAY, WEDNESDAY, THURSDAY, FRIDAY)
 */
function parseWeek4DayContent(fileContent, day) {
    const lines = fileContent.split('\n')
    const dayMap = {
        'day-1': { 
            patterns: ['MONDAY', '# 🔵 MONDAY'], 
            title: 'Linked List Reversal',
            dayName: 'MONDAY'
        },
        'day-2': { 
            patterns: ['TUESDAY', '# 🟢 TUESDAY'], 
            title: 'Cycle Detection',
            dayName: 'TUESDAY'
        },
        'day-3': { 
            patterns: ['WEDNESDAY', '# 🟡 WEDNESDAY'], 
            title: 'Merge & Sort',
            dayName: 'WEDNESDAY'
        },
        'day-4': { 
            patterns: ['THURSDAY', '# 🟠 THURSDAY'], 
            title: 'Doubly Linked Lists',
            dayName: 'THURSDAY'
        },
        'day-5': { 
            patterns: ['FRIDAY', '# 🔵 FRIDAY'], 
            title: 'Complex Problems',
            dayName: 'FRIDAY'
        },
    }

    const dayInfo = dayMap[day] || dayMap['day-1']
    let inDay = false
    let dayContent = []
    let learningOutcomes = []
    let topics = []
    let currentSection = null

    console.log(`Parsing Week 4 content for day: ${day}, looking for patterns:`, dayInfo.patterns)

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        const trimmedLine = line.trim()
        
        // Check if we've reached the target day
        let foundDay = false
        
        // Week 4 uses day names (MONDAY, TUESDAY, etc.) with emojis
        if (trimmedLine.startsWith('#') && trimmedLine.includes(dayInfo.dayName)) {
            foundDay = true
        }
        
        // Also check for anchor tags
        if (!foundDay && trimmedLine.includes(`<a name="${dayInfo.dayName.toLowerCase()}">`)) {
            foundDay = true
            continue
        }
        
        if (foundDay && !inDay) {
            console.log(`Found Week 4 day section at line ${i}: ${trimmedLine}`)
            inDay = true
            dayContent.push(line) // Include the day header
            continue
        }

        // If we're in a day section, collect content
        if (inDay) {
            // Skip placeholder messages
            if (trimmedLine.includes('[Continued in next part') ||
                trimmedLine.includes('[CONTINUE') ||
                trimmedLine.includes('CONTINUE IN NEXT')) {
                console.log(`Skipping placeholder message at line ${i}`)
                continue
            }
            
            // Skip anchor tags
            if (trimmedLine.startsWith('<a name=') || trimmedLine.includes('</a>')) {
                continue
            }
            
            // Stop at next day (check for other day names)
            if (trimmedLine.startsWith('#') && (
                trimmedLine.includes('MONDAY') ||
                trimmedLine.includes('TUESDAY') ||
                trimmedLine.includes('WEDNESDAY') ||
                trimmedLine.includes('THURSDAY') ||
                trimmedLine.includes('FRIDAY')
            )) {
                // Check if it's a different day
                if (!trimmedLine.includes(dayInfo.dayName)) {
                    console.log(`Stopping at line ${i}: ${trimmedLine} (next day detected)`)
                    break
                }
            }
            
            // Stop at week summary or next week
            if (trimmedLine.includes('Week 4 Complete Summary') || 
                trimmedLine.includes('Week 5') ||
                trimmedLine.includes('# 📘 WEEK 5') ||
                trimmedLine.includes('Interview Guide') && trimmedLine.includes('##')) {
                // Only stop at Interview Guide if it's a main heading (##) and we're past the day content
                if (trimmedLine.includes('## Interview Guide') && dayContent.length > 50) {
                    console.log(`Stopping at line ${i}: ${trimmedLine} (interview guide detected)`)
                    break
                }
            }
            
            // Extract learning outcomes if present
            if (trimmedLine.includes('## Learning Outcomes') || (trimmedLine.includes('Learning Outcomes') && trimmedLine.includes('##'))) {
                currentSection = 'learning_outcomes'
                dayContent.push(line)
                continue
            }

            if (currentSection === 'learning_outcomes' && (trimmedLine.startsWith('✅') || trimmedLine.startsWith('- ') || trimmedLine.startsWith('By the end') || trimmedLine.startsWith('###'))) {
                if (trimmedLine.startsWith('###')) {
                    dayContent.push(line)
                    continue
                }
                if (trimmedLine.startsWith('✅') || trimmedLine.startsWith('- ')) {
                    const outcome = trimmedLine.replace(/^[✅\-\*]\s*/, '').trim()
                    if (outcome && outcome.length > 5) {
                        learningOutcomes.push(outcome)
                    }
                }
                dayContent.push(line)
                continue
            }

            // Stop learning outcomes section when we hit a new heading
            if (trimmedLine.startsWith('##') && !trimmedLine.includes('Learning Outcomes') && currentSection === 'learning_outcomes') {
                currentSection = null
            }
            
            // Collect ALL content lines
            dayContent.push(line)
        }
    }

    // Extract topics from content
    const contentText = dayContent.join('\n')
    
    // Extract topics from SECTION headers
    const sectionMatches = contentText.matchAll(/##\s*(?:Theory\s+)?Section\s+\d+[:\s]+([^\n]+)/gi)
    for (const match of sectionMatches) {
        const sectionTitle = match[1].trim()
        if (sectionTitle && sectionTitle.length > 3 && !topics.includes(sectionTitle)) {
            topics.push(sectionTitle)
        }
    }
    
    // Also extract from topic keywords
    const topicKeywords = [
        'Linked List', 'Reversal', 'Cycle Detection', 'Floyd', 'Tortoise', 'Hare',
        'Merge', 'Sort', 'Doubly Linked List', 'Node', 'Pointer', 'Traversal',
        'Insertion', 'Deletion', 'Interview', 'Complex Problems'
    ]

    topicKeywords.forEach(keyword => {
        if (contentText.includes(keyword) && !topics.includes(keyword)) {
            topics.push(keyword)
        }
    })
    
    // Extract learning outcomes from day description if available
    const dayDescriptionMatch = contentText.match(/##\s*Complete Day with[^\n]+/i)
    if (dayDescriptionMatch) {
        learningOutcomes.push(`Complete mastery with multiple examples and practice questions`)
    }

    // Clean up and format content
    let cleanedContent = dayContent.join('\n').trim()
    
    // Remove placeholder messages if they exist
    cleanedContent = cleanedContent.replace(/\[Continued in next part[^\]]*\]/gi, '')
    cleanedContent = cleanedContent.replace(/\[CONTINUE[^\]]*\]/gi, '')
    cleanedContent = cleanedContent.trim()
    
    // Extract actual title from day header (format: # 🔵 MONDAY – LINKED LIST REVERSAL)
    let extractedTitle = dayInfo.title
    const dayHeaderMatch = cleanedContent.match(/^#\s*[^\n]*(MONDAY|TUESDAY|WEDNESDAY|THURSDAY|FRIDAY)[\s–—:]+([^\n]+)/i)
    if (dayHeaderMatch && dayHeaderMatch[2]) {
        extractedTitle = dayHeaderMatch[2].trim()
        // Clean up: remove extra parentheses or trailing text
        extractedTitle = extractedTitle.replace(/\s*\([^)]*\)\s*$/, '').trim()
    }
    
    console.log(`Week 4 content collection summary for ${day}:`, {
        linesCollected: dayContent.length,
        contentLength: cleanedContent.length,
        learningOutcomes: learningOutcomes.length,
        topics: topics.length,
        extractedTitle: extractedTitle
    })
    
    if (!cleanedContent || cleanedContent.length < 200) {
        console.log(`Warning: Limited content for Week 4, Day ${day}. Collected ${dayContent.length} lines. Content may be incomplete.`)
    }

    return {
        day: `Day ${day.replace('day-', '')}`,
        title: extractedTitle || dayInfo.title,
        learning_outcomes: learningOutcomes.length > 0 ? learningOutcomes : [],
        topics: topics.length > 0 ? topics : [],
        content: cleanedContent || `Content for ${extractedTitle || dayInfo.title} is being loaded...`,
        key_concepts: extractKeyConcepts ? extractKeyConcepts(cleanedContent) : []
    }
}

/**
 * Parse day-specific content from Week 5 file
 * Each day has its own file, so we just need to extract the content
 */
function parseWeek5DayContent(fileContent, day) {
    const lines = fileContent.split('\n')
    const dayMap = {
        'day-1': { 
            patterns: ['MONDAY', '# 📚 WEEK 5 – MONDAY'], 
            title: 'Stack Fundamentals',
            dayName: 'MONDAY'
        },
        'day-2': { 
            patterns: ['TUESDAY', '# 📚 WEEK 5 – TUESDAY'], 
            title: 'Stack Applications',
            dayName: 'TUESDAY'
        },
        'day-3': { 
            patterns: ['WEDNESDAY', '# 📚 WEEK 5 – WEDNESDAY'], 
            title: 'Monotonic Stack',
            dayName: 'WEDNESDAY'
        },
        'day-4': { 
            patterns: ['THURSDAY', '# 📚 WEEK 5 – THURSDAY'], 
            title: 'Queue Fundamentals',
            dayName: 'THURSDAY'
        },
        'day-5': { 
            patterns: ['FRIDAY', '# 📚 WEEK 5 – FRIDAY'], 
            title: 'Queue Applications',
            dayName: 'FRIDAY'
        },
    }

    const dayInfo = dayMap[day] || dayMap['day-1']
    let dayContent = []
    let learningOutcomes = []
    let topics = []
    let currentSection = null
    let foundHeader = false

    console.log(`Parsing Week 5 content for day: ${day}, looking for patterns:`, dayInfo.patterns)

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        const trimmedLine = line.trim()
        
        // Check if we've reached the day header
        if (!foundHeader && trimmedLine.startsWith('#') && trimmedLine.includes(dayInfo.dayName)) {
            console.log(`Found Week 5 day header at line ${i}: ${trimmedLine}`)
            foundHeader = true
            dayContent.push(line)
            continue
        }
        
        // Once we find the header, collect all content
        if (foundHeader) {
            // Skip anchor tags
            if (trimmedLine.startsWith('<a name=') || trimmedLine.includes('</a>')) {
                continue
            }
            
            // Stop at next week or summary sections
            if (trimmedLine.includes('WEEK 6') || 
                trimmedLine.includes('Week 6') ||
                trimmedLine.includes('WEEK 5 COMPLETE') ||
                (trimmedLine.includes('CHECKLIST') && trimmedLine.includes('##'))) {
                // Only stop at checklist if it's a main heading and we have content
                if (trimmedLine.includes('CHECKLIST') && dayContent.length > 100) {
                    console.log(`Stopping at line ${i}: ${trimmedLine} (checklist/summary detected)`)
                    break
                }
            }
            
            // Extract learning outcomes if present
            if (trimmedLine.includes('## Learning Outcomes') || (trimmedLine.includes('Learning Outcomes') && trimmedLine.includes('##'))) {
                currentSection = 'learning_outcomes'
                dayContent.push(line)
                continue
            }

            if (currentSection === 'learning_outcomes' && (trimmedLine.startsWith('✅') || trimmedLine.startsWith('- ') || trimmedLine.startsWith('By the end') || trimmedLine.startsWith('###'))) {
                if (trimmedLine.startsWith('###')) {
                    dayContent.push(line)
                    continue
                }
                if (trimmedLine.startsWith('✅') || trimmedLine.startsWith('- ')) {
                    const outcome = trimmedLine.replace(/^[✅\-\*]\s*/, '').trim()
                    if (outcome && outcome.length > 5) {
                        learningOutcomes.push(outcome)
                    }
                }
                dayContent.push(line)
                continue
            }

            // Stop learning outcomes section when we hit a new heading
            if (trimmedLine.startsWith('##') && !trimmedLine.includes('Learning Outcomes') && currentSection === 'learning_outcomes') {
                currentSection = null
            }
            
            // Collect ALL content lines
            dayContent.push(line)
        }
    }

    // Extract topics from content
    const contentText = dayContent.join('\n')
    
    // Extract topics from SECTION headers
    const sectionMatches = contentText.matchAll(/##\s*(?:Theory\s+)?Section\s+\d+[:\s]+([^\n]+)/gi)
    for (const match of sectionMatches) {
        const sectionTitle = match[1].trim()
        if (sectionTitle && sectionTitle.length > 3 && !topics.includes(sectionTitle)) {
            topics.push(sectionTitle)
        }
    }
    
    // Extract from problem headers
    const problemMatches = contentText.matchAll(/#\s*[🔴🟢🟡🟠]\s*PROBLEM\s+\d+[:\s]+([^\n]+)/gi)
    for (const match of problemMatches) {
        const problemTitle = match[1].trim()
        if (problemTitle && problemTitle.length > 3 && !topics.includes(problemTitle)) {
            topics.push(problemTitle)
        }
    }
    
    // Also extract from topic keywords
    const topicKeywords = [
        'Stack', 'Queue', 'LIFO', 'FIFO', 'Monotonic Stack', 'Parentheses Matching',
        'Postfix', 'Infix', 'BFS', 'Next Greater Element', 'Sliding Window',
        'Implementation', 'Applications', 'Interview'
    ]

    topicKeywords.forEach(keyword => {
        if (contentText.includes(keyword) && !topics.includes(keyword)) {
            topics.push(keyword)
        }
    })

    // Clean up and format content
    let cleanedContent = dayContent.join('\n').trim()
    
    // Extract actual title from day header
    // Format: # 📚 WEEK 5 – MONDAY
    //         ## STACK FUNDAMENTALS | Complete Implementation | 80+ Pages
    let extractedTitle = dayInfo.title
    const contentLines = cleanedContent.split('\n')
    for (let i = 0; i < Math.min(5, contentLines.length); i++) {
        const line = contentLines[i].trim()
        // Look for the subtitle line (##) that comes after the main header
        if (line.startsWith('##') && !line.includes('TABLE OF CONTENTS') && !line.includes('BEGINNER')) {
            // Extract the main part before the pipe or other separators
            const subtitle = line.replace(/^##\s*/, '').trim()
            const mainPart = subtitle.split('|')[0].trim()
            if (mainPart && mainPart.length > 5) {
                extractedTitle = mainPart
                break
            }
        }
    }
    
    console.log(`Week 5 content collection summary for ${day}:`, {
        linesCollected: dayContent.length,
        contentLength: cleanedContent.length,
        learningOutcomes: learningOutcomes.length,
        topics: topics.length,
        extractedTitle: extractedTitle
    })
    
    if (!cleanedContent || cleanedContent.length < 200) {
        console.log(`Warning: Limited content for Week 5, Day ${day}. Collected ${dayContent.length} lines. Content may be incomplete.`)
    }

    return {
        day: `Day ${day.replace('day-', '')}`,
        title: extractedTitle || dayInfo.title,
        learning_outcomes: learningOutcomes.length > 0 ? learningOutcomes : [],
        topics: topics.length > 0 ? topics : [],
        content: cleanedContent || `Content for ${extractedTitle || dayInfo.title} is being loaded...`,
        key_concepts: extractKeyConcepts ? extractKeyConcepts(cleanedContent) : []
    }
}

/**
 * Parse day-specific content from Week 1 file
 */
function parseDayContent(fileContent, day) {
    const lines = fileContent.split('\n')
    const dayMap = {
        'pre-week': { 
            patterns: ['# 🟢 PRE-WEEK:', 'PRE-WEEK:', 'I/O (INPUT/OUTPUT)', 'PRE-WEEK: I/O'], 
            title: 'I/O (Input/Output) - Essential Basics' 
        },
        'day-1': { 
            patterns: ['# 🟢 DAY 1', 'DAY 1 – DATA TYPES'], 
            title: 'Data Types & Variables' 
        },
        'day-2': { 
            patterns: ['# 🟢 DAY 2', 'DAY 2 – OPERATORS'], 
            title: 'Operators & Decision Making' 
        },
        'day-3': { 
            patterns: ['# 🟢 DAY 3', 'DAY 3 – LOOPS'], 
            title: 'Loops & Patterns' 
        },
        'day-4': { 
            patterns: ['# 🟢 DAY 4', 'DAY 4 – ARRAYS'], 
            title: 'Arrays (DSA Foundation)' 
        },
        'day-5': { 
            patterns: ['# 🟢 DAY 5', 'DAY 5 – FUNCTIONS'], 
            title: 'Functions (Basics)' 
        },
    }

    const dayInfo = dayMap[day] || dayMap['pre-week']
    let inDay = false
    let dayContent = []
    let learningOutcomes = []
    let topics = []
    let currentSection = null
    let skippedSummary = false

    console.log(`Parsing content for day: ${day}, looking for patterns:`, dayInfo.patterns)

    // Find the actual content start - skip summary section (first 41 lines)
    // The actual content starts after multiple empty lines around line 42
    let contentStartIndex = 0
    for (let i = 0; i < lines.length; i++) {
        const trimmed = lines[i].trim()
        // Look for the first "# 🟢 PRE-WEEK:" that appears after line 40 (after summary)
        if (i > 40 && trimmed.startsWith('# 🟢 PRE-WEEK:') && trimmed.includes('ESSENTIAL BASICS')) {
            contentStartIndex = i
            console.log(`Found actual content start at line ${i}`)
            break
        }
    }

    for (let i = contentStartIndex; i < lines.length; i++) {
        const line = lines[i]
        const trimmedLine = line.trim()
        
        // Check if we've reached the target day - MUST start with # 🟢 to be a real section
        let foundDay = false
        
        if (trimmedLine.startsWith('# 🟢')) {
            // For PRE-WEEK, check for PRE-WEEK: pattern with ESSENTIAL BASICS (actual content)
            if (day === 'pre-week') {
                foundDay = trimmedLine.includes('PRE-WEEK:') && trimmedLine.includes('ESSENTIAL BASICS')
            }
            // For DAY sections, check for DAY X pattern with full title (actual content headers)
            else if (day.startsWith('day-')) {
                const dayNum = day.replace('day-', '')
                // Match actual content headers - they have "–" (em dash) and full titles
                // Like "# 🟢 DAY 1 – DATA TYPES & VARIABLES" (not just "DAY 1")
                foundDay = trimmedLine.includes(`DAY ${dayNum} –`) || trimmedLine.includes(`DAY ${dayNum} -`)
            }
        }
        
        if (foundDay && !inDay) {
            console.log(`Found day section at line ${i}: ${trimmedLine}`)
            inDay = true
            // Don't include the day header itself, start collecting from next line
            continue
        }

        // If we're in a day section, collect content
        if (inDay) {
            // First check if we should stop (next day or summary)
            const isNextDay = dayInfo.patterns.every(pattern => {
                const patternLower = pattern.toLowerCase()
                const lineLower = trimmedLine.toLowerCase()
                return !lineLower.includes(patternLower) && !trimmedLine.includes(pattern)
            }) && (trimmedLine.startsWith('# 🟢 DAY') || trimmedLine.startsWith('# 🟢 PRE-WEEK:'))
            
            if (isNextDay || trimmedLine.startsWith('## 📋 WEEK 1 SUMMARY') || 
                trimmedLine.includes('WEEK 1 SUMMARY') || trimmedLine.includes('# 📘 WEEK 2')) {
                console.log(`Stopping at line ${i}: ${trimmedLine}`)
                break
            }
            
            // Extract learning outcomes
            if (trimmedLine.includes('## Learning Outcomes') || (trimmedLine.includes('Learning Outcomes') && trimmedLine.includes('##'))) {
                currentSection = 'learning_outcomes'
                dayContent.push(line) // Include the header
                continue
            }

            if (currentSection === 'learning_outcomes' && (trimmedLine.startsWith('✅') || trimmedLine.startsWith('- ') || trimmedLine.startsWith('By the end'))) {
                if (trimmedLine.startsWith('✅') || trimmedLine.startsWith('- ')) {
                    const outcome = trimmedLine.replace(/^[✅\-\*]\s*/, '').trim()
                    if (outcome && outcome.length > 5) {
                        learningOutcomes.push(outcome)
                    }
                }
                dayContent.push(line) // Include in content
                continue
            }

            // Stop learning outcomes section when we hit a new heading (but not the first one)
            if (trimmedLine.startsWith('##') && !trimmedLine.includes('Learning Outcomes') && currentSection === 'learning_outcomes') {
                currentSection = null
            }

            // Collect ALL content lines (including empty lines for formatting)
            dayContent.push(line)
        }
    }

    // Extract topics from content
    const topicKeywords = [
        'Data Types', 'Variables', 'Operators', 'Decision Making', 'Loops', 'Patterns',
        'Arrays', 'Functions', 'I/O', 'Input/Output', 'printf', 'scanf', 'cout', 'cin',
        'if-else', 'switch-case', 'ternary', 'for loop', 'while loop', 'do-while',
        'break', 'continue', '2D Array', 'Matrix', 'Parameters', 'Return'
    ]

    topicKeywords.forEach(keyword => {
        if (dayContent.join('\n').includes(keyword) && !topics.includes(keyword)) {
            topics.push(keyword)
        }
    })

    // Clean up and format content
    let cleanedContent = dayContent.join('\n').trim()
    
    console.log(`Content collection summary for ${day}:`, {
        linesCollected: dayContent.length,
        contentLength: cleanedContent.length,
        learningOutcomes: learningOutcomes.length,
        topics: topics.length
    })
    
    // If no content was collected, try to get it from the file differently
    if (!cleanedContent || cleanedContent.length < 50) {
        console.log(`Warning: Limited content for ${day}. Collected ${dayContent.length} lines.`)
        console.log(`First few lines collected:`, dayContent.slice(0, 5))
    }

    return {
        day: day === 'pre-week' ? 'PRE-WEEK' : `Day ${day.replace('day-', '')}`,
        title: dayInfo.title,
        learning_outcomes: learningOutcomes.length > 0 ? learningOutcomes : [],
        topics: topics.length > 0 ? topics : [],
        content: cleanedContent || `Content for ${dayInfo.title} is being loaded...`,
        key_concepts: extractKeyConcepts(cleanedContent)
    }
}

/**
 * Parse day-specific content from Aptitude Week 1 file
 */
function parseAptitudeDayContent(fileContent, day) {
    const lines = fileContent.split('\n')
    const dayMap = {
        'day-1': { 
            patterns: ['## 📅 DAY 1: INTEGERS', 'DAY 1: INTEGERS'], 
            title: 'Integers – Understanding Numbers Above & Below Zero' 
        },
        'day-2': { 
            patterns: ['## 📅 DAY 2: FACTORS', 'DAY 2: FACTORS'], 
            title: 'Factors – Breaking Numbers Into Building Blocks' 
        },
        'day-3': { 
            patterns: ['## 📅 DAY 3: DIVISIBILITY', 'DAY 3: DIVISIBILITY'], 
            title: 'Divisibility – Checking Without Division' 
        },
        'day-4': { 
            patterns: ['## 📅 DAY 4: HCF & LCM', 'DAY 4: HCF'], 
            title: 'HCF & LCM – Sharing and Grouping' 
        },
        'day-5': { 
            patterns: ['## 📅 DAY 5: BODMAS', 'DAY 5: BODMAS'], 
            title: 'BODMAS/VBODMAS – Discipline in Calculation' 
        },
    }

    const dayInfo = dayMap[day] || dayMap['day-1']
    let inDay = false
    let dayContent = []
    let topics = []
    let currentSection = null

    console.log(`Parsing aptitude content for day: ${day}, looking for patterns:`, dayInfo.patterns)

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        const trimmedLine = line.trim()
        
        // Check if we've reached the target day
        let foundDay = false
        
        if (trimmedLine.startsWith('## 📅 DAY')) {
            const dayNum = day.replace('day-', '')
            foundDay = trimmedLine.includes(`DAY ${dayNum}:`) || trimmedLine.includes(`DAY ${dayNum}`)
        }
        
        if (foundDay && !inDay) {
            console.log(`Found aptitude day section at line ${i}: ${trimmedLine}`)
            inDay = true
            dayContent.push(line) // Include the day header
            continue
        }

        // If we're in a day section, collect content
        if (inDay) {
            // Stop at next day or summary
            if (trimmedLine.startsWith('## 📅 DAY') && !foundDay) {
                console.log(`Stopping at next day: ${trimmedLine}`)
                break
            }
            
            if (trimmedLine.startsWith('## 📋 WEEK 1') || trimmedLine.includes('WEEK 1 COMPREHENSIVE SUMMARY')) {
                console.log(`Stopping at summary: ${trimmedLine}`)
                break
            }
            
            // Extract topics from headings
            if (trimmedLine.startsWith('### ')) {
                const topic = trimmedLine.replace('### ', '').trim()
                if (topic && !topics.includes(topic) && topic.length > 3) {
                    topics.push(topic)
                }
            }
            
            // Collect ALL content lines
            dayContent.push(line)
        }
    }

    // Clean up and format content
    let cleanedContent = dayContent.join('\n').trim()
    
    console.log(`Aptitude content collection summary for ${day}:`, {
        linesCollected: dayContent.length,
        contentLength: cleanedContent.length,
        topics: topics.length
    })
    
    if (!cleanedContent || cleanedContent.length < 50) {
        console.log(`Warning: Limited content for ${day}. Collected ${dayContent.length} lines.`)
    }

    return {
        day: `Day ${day.replace('day-', '')}`,
        title: dayInfo.title,
        learning_outcomes: [],
        topics: topics.length > 0 ? topics : [],
        content: cleanedContent || `Content for ${dayInfo.title} is being loaded...`,
        key_concepts: extractKeyConcepts(cleanedContent)
    }
}

/**
 * Parse day-specific content from Aptitude Week 2 file
 */
function parseAptitudeWeek2DayContent(fileContent, day) {
    const lines = fileContent.split('\n')
    const dayMap = {
        'day-1': { 
            patterns: ['# 📅 DAY 1: PERCENTAGES'], 
            title: 'Percentages – Foundation & Change' 
        },
        'day-2': { 
            patterns: ['# 📅 DAY 2: SUCCESSIVE PERCENTAGES'], 
            title: 'Successive Percentages & Applications' 
        },
        'day-3': { 
            patterns: ['# 📅 DAY 3: RATIO & PROPORTION'], 
            title: 'Ratio & Proportion (Beginner Level)' 
        },
        'day-4': { 
            patterns: ['# 📅 DAY 4: PROPORTION & APPLICATIONS'], 
            title: 'Proportion & Applications (Intermediate)' 
        },
        'day-5': { 
            patterns: ['# 📅 DAY 5: INTEGRATED APTITUDE'], 
            title: 'Integrated Aptitude (Advanced Applications)' 
        },
    }

    const dayInfo = dayMap[day] || dayMap['day-1']
    let inDay = false
    let dayContent = []
    let topics = []

    console.log(`Parsing aptitude Week 2 content for day: ${day}, looking for patterns:`, dayInfo.patterns)

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        const trimmedLine = line.trim()
        
        // Check if we've reached the target day
        let foundDay = false
        if (trimmedLine.startsWith('# 📅 DAY')) {
            const dayNum = day.replace('day-', '')
            foundDay = trimmedLine.includes(`DAY ${dayNum}:`) || trimmedLine.includes(`DAY ${dayNum}`)
        }
        
        if (foundDay && !inDay) {
            console.log(`Found aptitude Week 2 day section at line ${i}: ${trimmedLine}`)
            inDay = true
            dayContent.push(line)
            continue
        }

        if (inDay) {
            // Stop at next day or summary
            if (trimmedLine.startsWith('# 📅 DAY') && !foundDay) {
                console.log(`Stopping at next day: ${trimmedLine}`)
                break
            }
            
            if (trimmedLine.startsWith('## 🎓 SUMMARY') || trimmedLine.includes('END OF WEEK 2')) {
                console.log(`Stopping at summary: ${trimmedLine}`)
                break
            }
            
            if (trimmedLine.startsWith('### ')) {
                const topic = trimmedLine.replace('### ', '').trim()
                if (topic && !topics.includes(topic) && topic.length > 3) {
                    topics.push(topic)
                }
            }
            
            dayContent.push(line)
        }
    }

    let cleanedContent = dayContent.join('\n').trim()
    
    console.log(`Aptitude Week 2 content collection summary for ${day}:`, {
        linesCollected: dayContent.length,
        contentLength: cleanedContent.length,
        topics: topics.length
    })
    
    if (!cleanedContent || cleanedContent.length < 50) {
        console.log(`Warning: Limited content for ${day}. Collected ${dayContent.length} lines.`)
    }

    return {
        day: `Day ${day.replace('day-', '')}`,
        title: dayInfo.title,
        learning_outcomes: [],
        topics: topics.length > 0 ? topics : [],
        content: cleanedContent || `Content for ${dayInfo.title} is being loaded...`,
        key_concepts: extractKeyConcepts(cleanedContent)
    }
}

/**
 * Parse day-specific content from Aptitude Week 3 file
 */
function parseAptitudeWeek3DayContent(fileContent, day) {
    const lines = fileContent.split('\n')
    const dayMap = {
        'day-1': { 
            patterns: ['# 📅 DAY 1'], 
            title: 'Ratio Foundations' 
        },
        'day-2': { 
            patterns: ['# 📅 DAY 2'], 
            title: 'Advanced Ratio & Partnerships' 
        },
        'day-3': { 
            patterns: ['# 📅 DAY 3'], 
            title: 'Proportion & Advanced Applications' 
        },
        'day-4': { 
            patterns: ['# 📅 DAY 4'], 
            title: 'Time/Work – Basic Concepts' 
        },
        'day-5': { 
            patterns: ['# 📅 DAY 5'], 
            title: 'Time/Work – Advanced Concepts' 
        },
    }

    const dayInfo = dayMap[day] || dayMap['day-1']
    let inDay = false
    let dayContent = []
    let topics = []

    console.log(`Parsing aptitude Week 3 content for day: ${day}, looking for patterns:`, dayInfo.patterns)

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        const trimmedLine = line.trim()
        
        let foundDay = false
        if (trimmedLine.startsWith('# 📅 DAY')) {
            const dayNum = day.replace('day-', '')
            foundDay = trimmedLine.includes(`DAY ${dayNum}`)
        }
        
        if (foundDay && !inDay) {
            console.log(`Found aptitude Week 3 day section at line ${i}: ${trimmedLine}`)
            inDay = true
            dayContent.push(line)
            continue
        }

        if (inDay) {
            if (trimmedLine.startsWith('# 📅 DAY') && !foundDay) {
                console.log(`Stopping at next day: ${trimmedLine}`)
                break
            }
            
            if (trimmedLine.startsWith('## 📊 WEEK 3 COMPLETE SUMMARY') || trimmedLine.includes('END OF WEEK 3')) {
                console.log(`Stopping at summary: ${trimmedLine}`)
                break
            }
            
            if (trimmedLine.startsWith('### ')) {
                const topic = trimmedLine.replace('### ', '').trim()
                if (topic && !topics.includes(topic) && topic.length > 3) {
                    topics.push(topic)
                }
            }
            
            dayContent.push(line)
        }
    }

    let cleanedContent = dayContent.join('\n').trim()
    
    console.log(`Aptitude Week 3 content collection summary for ${day}:`, {
        linesCollected: dayContent.length,
        contentLength: cleanedContent.length,
        topics: topics.length
    })
    
    if (!cleanedContent || cleanedContent.length < 50) {
        console.log(`Warning: Limited content for ${day}. Collected ${dayContent.length} lines.`)
    }

    return {
        day: `Day ${day.replace('day-', '')}`,
        title: dayInfo.title,
        learning_outcomes: [],
        topics: topics.length > 0 ? topics : [],
        content: cleanedContent || `Content for ${dayInfo.title} is being loaded...`,
        key_concepts: extractKeyConcepts(cleanedContent)
    }
}

/**
 * Parse day-specific content from Aptitude Week 4 file
 */
function parseAptitudeWeek4DayContent(fileContent, day) {
    const lines = fileContent.split('\n')
    const dayMap = {
        'day-1': { 
            patterns: ['# ⏰ MONDAY'], 
            title: 'Time/Work Advanced Concepts' 
        },
        'day-2': { 
            patterns: ['# ⏰ TUESDAY'], 
            title: 'Time/Work Partnerships & Wage Distribution' 
        },
        'day-3': { 
            patterns: ['# ⚙️ WEDNESDAY'], 
            title: 'Pipes Fundamentals & Combined Pipes' 
        },
        'day-4': { 
            patterns: ['# ⏱️ THURSDAY'], 
            title: 'Pipes Advanced - Leaks, Alternate, Cisterns' 
        },
        'day-5': { 
            patterns: ['# 🔄 FRIDAY'], 
            title: 'Time/Work + Pipes Integration' 
        },
    }

    const dayInfo = dayMap[day] || dayMap['day-1']
    let inDay = false
    let dayContent = []
    let topics = []

    console.log(`Parsing aptitude Week 4 content for day: ${day}, looking for patterns:`, dayInfo.patterns)

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        const trimmedLine = line.trim()
        
        let foundDay = false
        if (trimmedLine.startsWith('# ')) {
            const dayNum = day.replace('day-', '')
            if (dayNum === '1') {
                foundDay = trimmedLine.includes('MONDAY') && trimmedLine.includes('DAY 1')
            } else if (dayNum === '2') {
                foundDay = trimmedLine.includes('TUESDAY') && trimmedLine.includes('DAY 2')
            } else if (dayNum === '3') {
                foundDay = trimmedLine.includes('WEDNESDAY') && trimmedLine.includes('DAY 3')
            } else if (dayNum === '4') {
                foundDay = trimmedLine.includes('THURSDAY') && trimmedLine.includes('DAY 4')
            } else if (dayNum === '5') {
                foundDay = trimmedLine.includes('FRIDAY') && trimmedLine.includes('DAY 5')
            }
        }
        
        if (foundDay && !inDay) {
            console.log(`Found aptitude Week 4 day section at line ${i}: ${trimmedLine}`)
            inDay = true
            dayContent.push(line)
            continue
        }

        if (inDay) {
            if (trimmedLine.startsWith('# ') && (
                trimmedLine.includes('MONDAY') ||
                trimmedLine.includes('TUESDAY') ||
                trimmedLine.includes('WEDNESDAY') ||
                trimmedLine.includes('THURSDAY') ||
                trimmedLine.includes('FRIDAY') ||
                trimmedLine.includes('SATURDAY') ||
                trimmedLine.includes('SUNDAY')
            ) && !foundDay) {
                console.log(`Stopping at next day: ${trimmedLine}`)
                break
            }
            
            if (trimmedLine.includes('SATURDAY') || trimmedLine.includes('SUNDAY')) {
                console.log(`Stopping at weekend section: ${trimmedLine}`)
                break
            }
            
            if (trimmedLine.startsWith('### ')) {
                const topic = trimmedLine.replace('### ', '').trim()
                if (topic && !topics.includes(topic) && topic.length > 3) {
                    topics.push(topic)
                }
            }
            
            dayContent.push(line)
        }
    }

    let cleanedContent = dayContent.join('\n').trim()
    
    console.log(`Aptitude Week 4 content collection summary for ${day}:`, {
        linesCollected: dayContent.length,
        contentLength: cleanedContent.length,
        topics: topics.length
    })
    
    if (!cleanedContent || cleanedContent.length < 50) {
        console.log(`Warning: Limited content for ${day}. Collected ${dayContent.length} lines.`)
    }

    return {
        day: `Day ${day.replace('day-', '')}`,
        title: dayInfo.title,
        learning_outcomes: [],
        topics: topics.length > 0 ? topics : [],
        content: cleanedContent || `Content for ${dayInfo.title} is being loaded...`,
        key_concepts: extractKeyConcepts(cleanedContent)
    }
}

/**
 * Parse day-specific content from Aptitude Week 5 file
 */
function parseAptitudeWeek5DayContent(fileContent, day) {
    const lines = fileContent.split('\n')
    const dayMap = {
        'day-1': { 
            patterns: ['# 📅 MONDAY'], 
            title: 'TSD Fundamentals - Speed as Rate & Distance' 
        },
        'day-2': { 
            patterns: ['# 📅 TUESDAY'], 
            title: 'TSD Advanced - Average Speed & Multi-Segment' 
        },
        'day-3': { 
            patterns: ['# 📅 WEDNESDAY'], 
            title: 'Trains & Relative Speed - Overtaking & Meeting' 
        },
        'day-4': { 
            patterns: ['# 📅 THURSDAY'], 
            title: 'Boats & Water Current - Upstream/Downstream' 
        },
        'day-5': { 
            patterns: ['# 📅 FRIDAY'], 
            title: 'TSD + Trains + Boats Integration' 
        },
    }

    const dayInfo = dayMap[day] || dayMap['day-1']
    let inDay = false
    let dayContent = []
    let topics = []

    console.log(`Parsing aptitude Week 5 content for day: ${day}, looking for patterns:`, dayInfo.patterns)

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        const trimmedLine = line.trim()
        
        let foundDay = false
        if (trimmedLine.startsWith('# 📅')) {
            const dayNum = day.replace('day-', '')
            if (dayNum === '1') {
                foundDay = trimmedLine.includes('MONDAY') && trimmedLine.includes('DAY 1')
            } else if (dayNum === '2') {
                foundDay = trimmedLine.includes('TUESDAY') && trimmedLine.includes('DAY 2')
            } else if (dayNum === '3') {
                foundDay = trimmedLine.includes('WEDNESDAY') && trimmedLine.includes('DAY 3')
            } else if (dayNum === '4') {
                foundDay = trimmedLine.includes('THURSDAY') && trimmedLine.includes('DAY 4')
            } else if (dayNum === '5') {
                foundDay = trimmedLine.includes('FRIDAY') && trimmedLine.includes('DAY 5')
            }
        }
        
        if (foundDay && !inDay) {
            console.log(`Found aptitude Week 5 day section at line ${i}: ${trimmedLine}`)
            inDay = true
            dayContent.push(line)
            continue
        }

        if (inDay) {
            if (trimmedLine.startsWith('# 📅') && !foundDay) {
                console.log(`Stopping at next day: ${trimmedLine}`)
                break
            }
            
            if (trimmedLine.includes('SATURDAY') || trimmedLine.includes('SUNDAY')) {
                console.log(`Stopping at weekend section: ${trimmedLine}`)
                break
            }
            
            if (trimmedLine.startsWith('### ')) {
                const topic = trimmedLine.replace('### ', '').trim()
                if (topic && !topics.includes(topic) && topic.length > 3) {
                    topics.push(topic)
                }
            }
            
            dayContent.push(line)
        }
    }

    let cleanedContent = dayContent.join('\n').trim()
    
    console.log(`Aptitude Week 5 content collection summary for ${day}:`, {
        linesCollected: dayContent.length,
        contentLength: cleanedContent.length,
        topics: topics.length
    })
    
    if (!cleanedContent || cleanedContent.length < 50) {
        console.log(`Warning: Limited content for ${day}. Collected ${dayContent.length} lines.`)
    }

    return {
        day: `Day ${day.replace('day-', '')}`,
        title: dayInfo.title,
        learning_outcomes: [],
        topics: topics.length > 0 ? topics : [],
        content: cleanedContent || `Content for ${dayInfo.title} is being loaded...`,
        key_concepts: extractKeyConcepts(cleanedContent)
    }
}

/**
 * Parse day-specific content from Aptitude Week 6 file
 */
function parseAptitudeWeek6DayContent(fileContent, day) {
    const lines = fileContent.split('\n')
    const dayMap = {
        'day-1': { 
            patterns: ['# ⏰ MONDAY'], 
            title: 'Profit & Loss Fundamentals' 
        },
        'day-2': { 
            patterns: ['# ⏰ TUESDAY'], 
            title: 'Advanced P&L - Discounts & Marked Price' 
        },
        'day-3': { 
            patterns: ['# ⏰ WEDNESDAY'], 
            title: 'Simple Interest Complete Mastery' 
        },
        'day-4': { 
            patterns: ['# ⏰ THURSDAY'], 
            title: 'Compound Interest Advanced + Effective Rates' 
        },
        'day-5': { 
            patterns: ['# ⏰ FRIDAY'], 
            title: 'Complete Integration - Business Scenarios' 
        },
    }

    const dayInfo = dayMap[day] || dayMap['day-1']
    let inDay = false
    let dayContent = []
    let topics = []

    console.log(`Parsing aptitude Week 6 content for day: ${day}, looking for patterns:`, dayInfo.patterns)

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        const trimmedLine = line.trim()
        
        let foundDay = false
        if (trimmedLine.startsWith('# ⏰')) {
            const dayNum = day.replace('day-', '')
            // Handle formats like:
            // - "# ⏰ MONDAY" (from main file Week6_ProfitLoss_SI_CI_AllDays.md)
            // - "# ⏰ **THURSDAY: COMPOUND INTEREST - DAY 4" (from Week6_Complete_Thu_Fri.md)
            if (dayNum === '1') {
                foundDay = trimmedLine.includes('MONDAY') && trimmedLine.includes('DAY 1')
            } else if (dayNum === '2') {
                foundDay = trimmedLine.includes('TUESDAY') && trimmedLine.includes('DAY 2')
            } else if (dayNum === '3') {
                foundDay = trimmedLine.includes('WEDNESDAY') && trimmedLine.includes('DAY 3')
            } else if (dayNum === '4') {
                foundDay = trimmedLine.includes('THURSDAY') && trimmedLine.includes('DAY 4')
            } else if (dayNum === '5') {
                foundDay = trimmedLine.includes('FRIDAY') && trimmedLine.includes('DAY 5')
            }
        }
        
        if (foundDay && !inDay) {
            console.log(`Found aptitude Week 6 day section at line ${i}: ${trimmedLine}`)
            inDay = true
            dayContent.push(line)
            continue
        }

        if (inDay) {
            if (trimmedLine.startsWith('# ⏰') && !foundDay) {
                console.log(`Stopping at next day: ${trimmedLine}`)
                break
            }
            
            if (trimmedLine.includes('SATURDAY') || trimmedLine.includes('SUNDAY') || trimmedLine.includes('📊')) {
                console.log(`Stopping at weekend/test section: ${trimmedLine}`)
                break
            }
            
            if (trimmedLine.startsWith('### ')) {
                const topic = trimmedLine.replace('### ', '').trim()
                if (topic && !topics.includes(topic) && topic.length > 3) {
                    topics.push(topic)
                }
            }
            
            dayContent.push(line)
        }
    }

    let cleanedContent = dayContent.join('\n').trim()
    
    console.log(`Aptitude Week 6 content collection summary for ${day}:`, {
        linesCollected: dayContent.length,
        contentLength: cleanedContent.length,
        topics: topics.length
    })
    
    if (!cleanedContent || cleanedContent.length < 50) {
        console.log(`Warning: Limited content for ${day}. Collected ${dayContent.length} lines.`)
    }

    return {
        day: `Day ${day.replace('day-', '')}`,
        title: dayInfo.title,
        learning_outcomes: [],
        topics: topics.length > 0 ? topics : [],
        content: cleanedContent || `Content for ${dayInfo.title} is being loaded...`,
        key_concepts: extractKeyConcepts(cleanedContent)
    }
}

/**
 * Extract key concepts from content
 */
function extractKeyConcepts(content) {
    const concepts = []
    const conceptPatterns = [
        /## What is (a |an )?([^?]+)\?/gi,
        /## ([^#]+)/g
    ]

    conceptPatterns.forEach(pattern => {
        const matches = content.matchAll(pattern)
        for (const match of matches) {
            const concept = match[2] || match[1]
            if (concept && concept.length > 3 && concept.length < 50) {
                concepts.push(concept.trim())
            }
        }
    })

    return [...new Set(concepts)].slice(0, 10)
}