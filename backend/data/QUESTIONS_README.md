# Week 1 DSA Practice Questions - Day-wise Organization

## Overview
This file contains **150 practice questions** organized by day for Week 1 DSA Fundamentals.

## Question Distribution

| Day | Topic | Total Questions | Easy | Intermediate | Difficult |
|-----|-------|----------------|------|--------------|-----------|
| PRE-WEEK | I/O (Input/Output) | 30 | 10 | 10 | 10 |
| Day 1 | Data Types & Variables | 30 | 10 | 10 | 10 |
| Day 2 | Operators & Decision Making | 30 | 10 | 10 | 10 |
| Day 3 | Loops & Patterns | 30 | 10 | 10 | 10 |
| Day 4 | Arrays (DSA Foundation) | 30 | 10 | 10 | 10 |
| Day 5 | Functions (Basics) | 30 | 10 | 10 | 10 |
| **Total** | | **150** | **60** | **60** | **30** |

## Question Structure

Each question contains:
- `question_id`: Unique identifier (e.g., 'pre-week-001', 'day-1-015')
- `question`: Question text (may include code snippets)
- `options`: Array of 4 options
- `answer`: Correct answer (string)
- `question_type`: "easy", "intermediate", or "difficult"
- `time_taken`: Time in seconds (30-150 based on difficulty)
- `question_topic`: Array of topics
- `question_subtopic`: Specific subtopic
- `link`: Empty string (for future image links)
- `explanation`: Detailed step-by-step explanation for learning
- `day`: Day identifier ("pre-week", "day-1" through "day-5")
- `language`: Array of applicable languages (C, C++, JavaScript)

## API Endpoints

### 1. Get Questions by Day
**GET** `/questions/week1?day=<day>`

**Parameters:**
- `day` (required): One of `pre-week`, `day-1`, `day-2`, `day-3`, `day-4`, `day-5`

**Example:**
```
GET /questions/week1?day=day-1
```

**Response:**
```json
{
  "success": true,
  "message": "Questions for day-1 fetched successfully",
  "data": {
    "day": "day-1",
    "total": 30,
    "easy": 10,
    "intermediate": 10,
    "difficult": 10,
    "questions": [...],
    "organized": {
      "easy": [...],
      "intermediate": [...],
      "difficult": [...]
    }
  }
}
```

### 2. Get Questions by Day and Difficulty
**GET** `/questions/week1?day=<day>&difficulty=<difficulty>`

**Parameters:**
- `day` (required): One of `pre-week`, `day-1`, `day-2`, `day-3`, `day-4`, `day-5`
- `difficulty` (required): One of `easy`, `intermediate`, `difficult`

**Example:**
```
GET /questions/week1?day=day-2&difficulty=intermediate
```

**Response:**
```json
{
  "success": true,
  "message": "intermediate questions for day-2 fetched successfully",
  "data": {
    "day": "day-2",
    "difficulty": "intermediate",
    "count": 10,
    "questions": [...]
  }
}
```

### 3. Get All Week 1 Questions
**GET** `/questions/week1/all`

**Example:**
```
GET /questions/week1/all
```

**Response:**
```json
{
  "success": true,
  "message": "All Week 1 questions fetched successfully",
  "data": {
    "total": 150,
    "statistics": {
      "pre-week": { "total": 30, "easy": 10, "intermediate": 10, "difficult": 10 },
      "day-1": { "total": 30, "easy": 10, "intermediate": 10, "difficult": 10 },
      ...
    },
    "questionsByDay": {
      "pre-week": [...],
      "day-1": [...],
      ...
    }
  }
}
```

### 4. Get Single Question by ID
**GET** `/questions/week1/:questionId`

**Example:**
```
GET /questions/week1/day-1-015
```

**Response:**
```json
{
  "success": true,
  "message": "Question fetched successfully",
  "data": {
    "question_id": "day-1-015",
    "question": "...",
    "options": [...],
    "answer": "...",
    ...
  }
}
```

## Usage in Code

### Import Questions
```javascript
import week1Questions, { 
  getQuestionsByDay, 
  getQuestionsByDayAndDifficulty,
  questionsByDay,
  questionsStats
} from './data/questions.js';

// Get all questions
const allQuestions = week1Questions;

// Get questions for a specific day
const day1Questions = getQuestionsByDay('day-1');

// Get questions by day and difficulty
const easyDay1Questions = getQuestionsByDayAndDifficulty('day-1', 'easy');

// Access pre-organized questions
const preWeekQuestions = questionsByDay['pre-week'];

// Get statistics
const stats = questionsStats['day-1'];
console.log(`Day 1 has ${stats.total} questions`);
```

## Verification

Run the verification script to check question organization:

```bash
node backend/scripts/verifyQuestions.js
```

This will:
- Verify total question count (150)
- Check each day has 30 questions
- Verify question structure
- Check for duplicate question IDs
- Display statistics by day

## Notes

- All questions include detailed explanations for learning
- Questions cover C, C++, and JavaScript
- No duplicate questions across all days
- Questions are designed to help students learn from mistakes
- Time allocation is based on difficulty level



## Overview
This file contains **150 practice questions** organized by day for Week 1 DSA Fundamentals.

## Question Distribution

| Day | Topic | Total Questions | Easy | Intermediate | Difficult |
|-----|-------|----------------|------|--------------|-----------|
| PRE-WEEK | I/O (Input/Output) | 30 | 10 | 10 | 10 |
| Day 1 | Data Types & Variables | 30 | 10 | 10 | 10 |
| Day 2 | Operators & Decision Making | 30 | 10 | 10 | 10 |
| Day 3 | Loops & Patterns | 30 | 10 | 10 | 10 |
| Day 4 | Arrays (DSA Foundation) | 30 | 10 | 10 | 10 |
| Day 5 | Functions (Basics) | 30 | 10 | 10 | 10 |
| **Total** | | **150** | **60** | **60** | **30** |

## Question Structure

Each question contains:
- `question_id`: Unique identifier (e.g., 'pre-week-001', 'day-1-015')
- `question`: Question text (may include code snippets)
- `options`: Array of 4 options
- `answer`: Correct answer (string)
- `question_type`: "easy", "intermediate", or "difficult"
- `time_taken`: Time in seconds (30-150 based on difficulty)
- `question_topic`: Array of topics
- `question_subtopic`: Specific subtopic
- `link`: Empty string (for future image links)
- `explanation`: Detailed step-by-step explanation for learning
- `day`: Day identifier ("pre-week", "day-1" through "day-5")
- `language`: Array of applicable languages (C, C++, JavaScript)

## API Endpoints

### 1. Get Questions by Day
**GET** `/questions/week1?day=<day>`

**Parameters:**
- `day` (required): One of `pre-week`, `day-1`, `day-2`, `day-3`, `day-4`, `day-5`

**Example:**
```
GET /questions/week1?day=day-1
```

**Response:**
```json
{
  "success": true,
  "message": "Questions for day-1 fetched successfully",
  "data": {
    "day": "day-1",
    "total": 30,
    "easy": 10,
    "intermediate": 10,
    "difficult": 10,
    "questions": [...],
    "organized": {
      "easy": [...],
      "intermediate": [...],
      "difficult": [...]
    }
  }
}
```

### 2. Get Questions by Day and Difficulty
**GET** `/questions/week1?day=<day>&difficulty=<difficulty>`

**Parameters:**
- `day` (required): One of `pre-week`, `day-1`, `day-2`, `day-3`, `day-4`, `day-5`
- `difficulty` (required): One of `easy`, `intermediate`, `difficult`

**Example:**
```
GET /questions/week1?day=day-2&difficulty=intermediate
```

**Response:**
```json
{
  "success": true,
  "message": "intermediate questions for day-2 fetched successfully",
  "data": {
    "day": "day-2",
    "difficulty": "intermediate",
    "count": 10,
    "questions": [...]
  }
}
```

### 3. Get All Week 1 Questions
**GET** `/questions/week1/all`

**Example:**
```
GET /questions/week1/all
```

**Response:**
```json
{
  "success": true,
  "message": "All Week 1 questions fetched successfully",
  "data": {
    "total": 150,
    "statistics": {
      "pre-week": { "total": 30, "easy": 10, "intermediate": 10, "difficult": 10 },
      "day-1": { "total": 30, "easy": 10, "intermediate": 10, "difficult": 10 },
      ...
    },
    "questionsByDay": {
      "pre-week": [...],
      "day-1": [...],
      ...
    }
  }
}
```

### 4. Get Single Question by ID
**GET** `/questions/week1/:questionId`

**Example:**
```
GET /questions/week1/day-1-015
```

**Response:**
```json
{
  "success": true,
  "message": "Question fetched successfully",
  "data": {
    "question_id": "day-1-015",
    "question": "...",
    "options": [...],
    "answer": "...",
    ...
  }
}
```

## Usage in Code

### Import Questions
```javascript
import week1Questions, { 
  getQuestionsByDay, 
  getQuestionsByDayAndDifficulty,
  questionsByDay,
  questionsStats
} from './data/questions.js';

// Get all questions
const allQuestions = week1Questions;

// Get questions for a specific day
const day1Questions = getQuestionsByDay('day-1');

// Get questions by day and difficulty
const easyDay1Questions = getQuestionsByDayAndDifficulty('day-1', 'easy');

// Access pre-organized questions
const preWeekQuestions = questionsByDay['pre-week'];

// Get statistics
const stats = questionsStats['day-1'];
console.log(`Day 1 has ${stats.total} questions`);
```

## Verification

Run the verification script to check question organization:

```bash
node backend/scripts/verifyQuestions.js
```

This will:
- Verify total question count (150)
- Check each day has 30 questions
- Verify question structure
- Check for duplicate question IDs
- Display statistics by day

## Notes

- All questions include detailed explanations for learning
- Questions cover C, C++, and JavaScript
- No duplicate questions across all days
- Questions are designed to help students learn from mistakes
- Time allocation is based on difficulty level






## Overview
This file contains **150 practice questions** organized by day for Week 1 DSA Fundamentals.

## Question Distribution

| Day | Topic | Total Questions | Easy | Intermediate | Difficult |
|-----|-------|----------------|------|--------------|-----------|
| PRE-WEEK | I/O (Input/Output) | 30 | 10 | 10 | 10 |
| Day 1 | Data Types & Variables | 30 | 10 | 10 | 10 |
| Day 2 | Operators & Decision Making | 30 | 10 | 10 | 10 |
| Day 3 | Loops & Patterns | 30 | 10 | 10 | 10 |
| Day 4 | Arrays (DSA Foundation) | 30 | 10 | 10 | 10 |
| Day 5 | Functions (Basics) | 30 | 10 | 10 | 10 |
| **Total** | | **150** | **60** | **60** | **30** |

## Question Structure

Each question contains:
- `question_id`: Unique identifier (e.g., 'pre-week-001', 'day-1-015')
- `question`: Question text (may include code snippets)
- `options`: Array of 4 options
- `answer`: Correct answer (string)
- `question_type`: "easy", "intermediate", or "difficult"
- `time_taken`: Time in seconds (30-150 based on difficulty)
- `question_topic`: Array of topics
- `question_subtopic`: Specific subtopic
- `link`: Empty string (for future image links)
- `explanation`: Detailed step-by-step explanation for learning
- `day`: Day identifier ("pre-week", "day-1" through "day-5")
- `language`: Array of applicable languages (C, C++, JavaScript)

## API Endpoints

### 1. Get Questions by Day
**GET** `/questions/week1?day=<day>`

**Parameters:**
- `day` (required): One of `pre-week`, `day-1`, `day-2`, `day-3`, `day-4`, `day-5`

**Example:**
```
GET /questions/week1?day=day-1
```

**Response:**
```json
{
  "success": true,
  "message": "Questions for day-1 fetched successfully",
  "data": {
    "day": "day-1",
    "total": 30,
    "easy": 10,
    "intermediate": 10,
    "difficult": 10,
    "questions": [...],
    "organized": {
      "easy": [...],
      "intermediate": [...],
      "difficult": [...]
    }
  }
}
```

### 2. Get Questions by Day and Difficulty
**GET** `/questions/week1?day=<day>&difficulty=<difficulty>`

**Parameters:**
- `day` (required): One of `pre-week`, `day-1`, `day-2`, `day-3`, `day-4`, `day-5`
- `difficulty` (required): One of `easy`, `intermediate`, `difficult`

**Example:**
```
GET /questions/week1?day=day-2&difficulty=intermediate
```

**Response:**
```json
{
  "success": true,
  "message": "intermediate questions for day-2 fetched successfully",
  "data": {
    "day": "day-2",
    "difficulty": "intermediate",
    "count": 10,
    "questions": [...]
  }
}
```

### 3. Get All Week 1 Questions
**GET** `/questions/week1/all`

**Example:**
```
GET /questions/week1/all
```

**Response:**
```json
{
  "success": true,
  "message": "All Week 1 questions fetched successfully",
  "data": {
    "total": 150,
    "statistics": {
      "pre-week": { "total": 30, "easy": 10, "intermediate": 10, "difficult": 10 },
      "day-1": { "total": 30, "easy": 10, "intermediate": 10, "difficult": 10 },
      ...
    },
    "questionsByDay": {
      "pre-week": [...],
      "day-1": [...],
      ...
    }
  }
}
```

### 4. Get Single Question by ID
**GET** `/questions/week1/:questionId`

**Example:**
```
GET /questions/week1/day-1-015
```

**Response:**
```json
{
  "success": true,
  "message": "Question fetched successfully",
  "data": {
    "question_id": "day-1-015",
    "question": "...",
    "options": [...],
    "answer": "...",
    ...
  }
}
```

## Usage in Code

### Import Questions
```javascript
import week1Questions, { 
  getQuestionsByDay, 
  getQuestionsByDayAndDifficulty,
  questionsByDay,
  questionsStats
} from './data/questions.js';

// Get all questions
const allQuestions = week1Questions;

// Get questions for a specific day
const day1Questions = getQuestionsByDay('day-1');

// Get questions by day and difficulty
const easyDay1Questions = getQuestionsByDayAndDifficulty('day-1', 'easy');

// Access pre-organized questions
const preWeekQuestions = questionsByDay['pre-week'];

// Get statistics
const stats = questionsStats['day-1'];
console.log(`Day 1 has ${stats.total} questions`);
```

## Verification

Run the verification script to check question organization:

```bash
node backend/scripts/verifyQuestions.js
```

This will:
- Verify total question count (150)
- Check each day has 30 questions
- Verify question structure
- Check for duplicate question IDs
- Display statistics by day

## Notes

- All questions include detailed explanations for learning
- Questions cover C, C++, and JavaScript
- No duplicate questions across all days
- Questions are designed to help students learn from mistakes
- Time allocation is based on difficulty level



## Overview
This file contains **150 practice questions** organized by day for Week 1 DSA Fundamentals.

## Question Distribution

| Day | Topic | Total Questions | Easy | Intermediate | Difficult |
|-----|-------|----------------|------|--------------|-----------|
| PRE-WEEK | I/O (Input/Output) | 30 | 10 | 10 | 10 |
| Day 1 | Data Types & Variables | 30 | 10 | 10 | 10 |
| Day 2 | Operators & Decision Making | 30 | 10 | 10 | 10 |
| Day 3 | Loops & Patterns | 30 | 10 | 10 | 10 |
| Day 4 | Arrays (DSA Foundation) | 30 | 10 | 10 | 10 |
| Day 5 | Functions (Basics) | 30 | 10 | 10 | 10 |
| **Total** | | **150** | **60** | **60** | **30** |

## Question Structure

Each question contains:
- `question_id`: Unique identifier (e.g., 'pre-week-001', 'day-1-015')
- `question`: Question text (may include code snippets)
- `options`: Array of 4 options
- `answer`: Correct answer (string)
- `question_type`: "easy", "intermediate", or "difficult"
- `time_taken`: Time in seconds (30-150 based on difficulty)
- `question_topic`: Array of topics
- `question_subtopic`: Specific subtopic
- `link`: Empty string (for future image links)
- `explanation`: Detailed step-by-step explanation for learning
- `day`: Day identifier ("pre-week", "day-1" through "day-5")
- `language`: Array of applicable languages (C, C++, JavaScript)

## API Endpoints

### 1. Get Questions by Day
**GET** `/questions/week1?day=<day>`

**Parameters:**
- `day` (required): One of `pre-week`, `day-1`, `day-2`, `day-3`, `day-4`, `day-5`

**Example:**
```
GET /questions/week1?day=day-1
```

**Response:**
```json
{
  "success": true,
  "message": "Questions for day-1 fetched successfully",
  "data": {
    "day": "day-1",
    "total": 30,
    "easy": 10,
    "intermediate": 10,
    "difficult": 10,
    "questions": [...],
    "organized": {
      "easy": [...],
      "intermediate": [...],
      "difficult": [...]
    }
  }
}
```

### 2. Get Questions by Day and Difficulty
**GET** `/questions/week1?day=<day>&difficulty=<difficulty>`

**Parameters:**
- `day` (required): One of `pre-week`, `day-1`, `day-2`, `day-3`, `day-4`, `day-5`
- `difficulty` (required): One of `easy`, `intermediate`, `difficult`

**Example:**
```
GET /questions/week1?day=day-2&difficulty=intermediate
```

**Response:**
```json
{
  "success": true,
  "message": "intermediate questions for day-2 fetched successfully",
  "data": {
    "day": "day-2",
    "difficulty": "intermediate",
    "count": 10,
    "questions": [...]
  }
}
```

### 3. Get All Week 1 Questions
**GET** `/questions/week1/all`

**Example:**
```
GET /questions/week1/all
```

**Response:**
```json
{
  "success": true,
  "message": "All Week 1 questions fetched successfully",
  "data": {
    "total": 150,
    "statistics": {
      "pre-week": { "total": 30, "easy": 10, "intermediate": 10, "difficult": 10 },
      "day-1": { "total": 30, "easy": 10, "intermediate": 10, "difficult": 10 },
      ...
    },
    "questionsByDay": {
      "pre-week": [...],
      "day-1": [...],
      ...
    }
  }
}
```

### 4. Get Single Question by ID
**GET** `/questions/week1/:questionId`

**Example:**
```
GET /questions/week1/day-1-015
```

**Response:**
```json
{
  "success": true,
  "message": "Question fetched successfully",
  "data": {
    "question_id": "day-1-015",
    "question": "...",
    "options": [...],
    "answer": "...",
    ...
  }
}
```

## Usage in Code

### Import Questions
```javascript
import week1Questions, { 
  getQuestionsByDay, 
  getQuestionsByDayAndDifficulty,
  questionsByDay,
  questionsStats
} from './data/questions.js';

// Get all questions
const allQuestions = week1Questions;

// Get questions for a specific day
const day1Questions = getQuestionsByDay('day-1');

// Get questions by day and difficulty
const easyDay1Questions = getQuestionsByDayAndDifficulty('day-1', 'easy');

// Access pre-organized questions
const preWeekQuestions = questionsByDay['pre-week'];

// Get statistics
const stats = questionsStats['day-1'];
console.log(`Day 1 has ${stats.total} questions`);
```

## Verification

Run the verification script to check question organization:

```bash
node backend/scripts/verifyQuestions.js
```

This will:
- Verify total question count (150)
- Check each day has 30 questions
- Verify question structure
- Check for duplicate question IDs
- Display statistics by day

## Notes

- All questions include detailed explanations for learning
- Questions cover C, C++, and JavaScript
- No duplicate questions across all days
- Questions are designed to help students learn from mistakes
- Time allocation is based on difficulty level





