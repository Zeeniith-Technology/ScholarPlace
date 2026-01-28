#!/usr/bin/env python3
"""
Script to process and consolidate all aptitude questions from 19 source files
into a single standardized FINAL_APTITUDE_BANK.md file.
"""

import re
import os
from pathlib import Path
from typing import List, Dict, Tuple

# Global question counter
question_counter = 1

def extract_question_from_line(line: str, current_q_num: int) -> Dict:
    """Extract question data from a line in source format."""
    # Pattern: **Q1** Question text?
    q_match = re.match(r'\*\*Q(\d+)\*\*\s*(.+?)(?:\s*$|\s*\|)', line)
    if not q_match:
        return None
    
    q_text = q_match.group(2).strip()
    
    # Look for answer pattern: **Answer: B | Easy** | Explanation
    answer_match = re.search(r'\*\*Answer:\s*([A-D])\s*\|\s*([^|]+)\s*\|\s*(.+?)(?:\s*$|\s*\*\*)', line)
    if answer_match:
        answer = answer_match.group(1)
        difficulty = answer_match.group(2).strip()
        explanation = answer_match.group(3).strip()
    else:
        # Try alternative pattern
        answer_match = re.search(r'Answer:\s*([A-D])', line)
        if answer_match:
            answer = answer_match.group(1)
            difficulty = "Medium"  # Default
            explanation = ""
        else:
            return None
    
    return {
        'number': current_q_num,
        'text': q_text,
        'answer': answer,
        'difficulty': difficulty,
        'explanation': explanation
    }

def extract_options_from_lines(lines: List[str], start_idx: int) -> List[str]:
    """Extract options from lines following question."""
    options = []
    for i in range(start_idx, min(start_idx + 5, len(lines))):
        line = lines[i].strip()
        if line.startswith('- A)') or line.startswith('A)'):
            # Extract all options from this line or following lines
            opt_match = re.findall(r'([A-D])\)\s*([^|]+?)(?:\s*\|\s*|$)', line)
            if opt_match:
                for opt_letter, opt_text in opt_match:
                    options.append(f"{opt_letter}) {opt_text.strip()}")
            else:
                # Single option per line format
                opt_match = re.match(r'-\s*([A-D])\)\s*(.+?)(?:\s*$|\s*\|\s*)', line)
                if opt_match:
                    options.append(f"{opt_match.group(1)}) {opt_match.group(2).strip()}")
    
    # Ensure we have 4 options
    while len(options) < 4:
        options.append(f"{chr(68 - (3 - len(options)))} [Option not found]")
    
    return options[:4]

def parse_source_file(file_path: Path, week: int, day: int, start_q_num: int) -> List[Dict]:
    """Parse a source markdown file and extract all questions."""
    global question_counter
    
    questions = []
    current_q_num = start_q_num
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            lines = content.split('\n')
        
        i = 0
        while i < len(lines):
            line = lines[i].strip()
            
            # Check if this is a question line
            q_match = re.match(r'\*\*Q(\d+)\*\*\s*(.+?)(?:\s*$|\s*\|)', line)
            if q_match:
                # Extract question
                q_data = extract_question_from_line(line, current_q_num)
                if q_data:
                    # Extract options from following lines
                    options = extract_options_from_lines(lines, i + 1)
                    q_data['options'] = options
                    q_data['week'] = week
                    q_data['day'] = day
                    q_data['topic'] = determine_topic(q_data['text'], week, day)
                    
                    questions.append(q_data)
                    current_q_num += 1
                    question_counter += 1
            
            i += 1
        
        return questions
    
    except Exception as e:
        print(f"Error parsing {file_path}: {e}")
        return []

def determine_topic(question_text: str, week: int, day: int) -> str:
    """Determine topic based on question text and week/day."""
    text_lower = question_text.lower()
    
    if week == 1:
        if 'integer' in text_lower or 'negative' in text_lower or 'positive' in text_lower:
            return "Integer Basics"
        elif 'factor' in text_lower or 'multiple' in text_lower:
            return "Factors & Multiples"
        elif 'divisibility' in text_lower or 'divisible' in text_lower:
            return "Divisibility Rules"
        elif 'hcf' in text_lower or 'gcd' in text_lower or 'lcm' in text_lower:
            return "HCF & LCM"
        elif 'bodmas' in text_lower or 'order' in text_lower:
            return "BODMAS"
    
    elif week == 2:
        if 'percentage' in text_lower or '%' in text_lower:
            return "Percentages"
        elif 'ratio' in text_lower:
            return "Ratios"
        elif 'proportion' in text_lower:
            return "Proportions"
    
    elif week == 3:
        if 'ratio' in text_lower:
            return "Ratio & Proportion"
        elif 'time' in text_lower and 'work' in text_lower:
            return "Time & Work"
    
    elif week == 4:
        if 'pipe' in text_lower:
            return "Pipes & Cisterns"
        elif 'time' in text_lower and 'work' in text_lower:
            return "Time & Work Advanced"
    
    elif week == 5:
        if 'speed' in text_lower or 'distance' in text_lower:
            return "Time-Speed-Distance"
        elif 'train' in text_lower:
            return "Trains"
        elif 'boat' in text_lower:
            return "Boats & Streams"
    
    return "General"

def format_question_standard(q: Dict) -> str:
    """Format a question in the standardized format."""
    output = f"**Question {q['number']}:** {q['text']}\n"
    output += "**Options:**\n"
    for opt in q['options']:
        output += f"{opt}\n"
    output += f"\n**Answer:** {q['answer']}\n"
    output += f"**Difficulty:** {q['difficulty']}\n"
    output += f"**Topic:** {q['topic']}\n"
    output += f"**Week:** {q['week']}\n"
    output += f"**Day:** {q['day']}\n"
    output += f"**Explanation:** {q['explanation']}\n"
    output += "\n---\n\n"
    return output

def main():
    """Main processing function."""
    base_path = Path(__file__).parent
    
    # File mapping: (file_path, week, day, expected_start_q)
    file_mapping = [
        # Week 1
        (base_path / "Week_1" / "week1_Part-1-200mcqs-ALL-DAYS-COMPLETE-Q1-Q200.md", 1, 1, 1),
        (base_path / "Week_1" / "Week1_Part-2-Day5_50MCQs.md", 1, 5, 201),
        # Week 2
        (base_path / "Week_2" / "Week2-Day1-50Q.md", 2, 1, 251),
        (base_path / "Week_2" / "Week2-Day2-50Q.md", 2, 2, 301),
        (base_path / "Week_2" / "Week2-Day3-50Q.md", 2, 3, 351),
        (base_path / "Week_2" / "Week2-Day4-50Q.md", 2, 4, 401),
        (base_path / "Week_2" / "Week2-Day5-50Q.md", 2, 5, 451),
        # Week 3
        (base_path / "Week_3" / "Week3-Day1-50Q.md", 3, 1, 501),
        (base_path / "Week_3" / "Week3-Day2-50Q.md", 3, 2, 551),
        (base_path / "Week_3" / "Week3-Day3-50Q.md", 3, 3, 601),
        (base_path / "Week_3" / "Week3-Day4-50Q.md", 3, 4, 651),
        (base_path / "Week_3" / "Week3-Day5-50Q.md", 3, 5, 701),
        # Week 4
        (base_path / "Week_4" / "Week4-Day1-50Q.md", 4, 1, 751),
        (base_path / "Week_4" / "Week4-Day2-50Q.md", 4, 2, 801),
        (base_path / "Week_4" / "Week4-Day3-50Q.md", 4, 3, 851),
        (base_path / "Week_4" / "Week4-Day4-50Q.md", 4, 4, 901),
        (base_path / "Week_4" / "Week4-Day5-50Q.md", 4, 5, 951),
        # Week 5
        (base_path / "Week_5" / "week5_Part-1_250mcqs-FULLY-EXPANDED-all-days.md", 5, 1, 1001),
        (base_path / "Week_5" / "week5_Part2_250mcqs-DAYS4-5-COMPLETE-Q151-Q250.md", 5, 4, 1151),
    ]
    
    all_questions = []
    
    # Process all files
    for file_path, week, day, start_q in file_mapping:
        if file_path.exists():
            print(f"Processing {file_path.name}...")
            questions = parse_source_file(file_path, week, day, start_q)
            all_questions.extend(questions)
            print(f"  Extracted {len(questions)} questions")
        else:
            print(f"  WARNING: File not found: {file_path}")
    
    # Generate output
    output_path = base_path / "FINAL_APTITUDE_BANK.md"
    
    # Read existing header
    header = """# FINAL APTITUDE PRACTICE BANK
## 1250 Complete Practice Questions (Weeks 1-5)

---

## 📊 BANK SUMMARY
- **Total Questions:** 1250
- **Weeks:** 5
- **Days per Week:** 5
- **Questions per Day:** 50
- **Total Topics:** 15+
- **Difficulty Distribution:**
  - Easy: 250 (20%)
  - Medium: 600 (48%)
  - Hard: 305 (24.4%)
  - Expert: 95 (7.6%)

---

## 📑 QUICK NAVIGATION
- [Week 1: Numbers, Integers, Factors, Divisibility, HCF-LCM](#week-1)
- [Week 2: Percentages, Ratios, Proportions](#week-2)
- [Week 3: Ratio, Proportion, Timework](#week-3)
- [Week 4: Timework Advanced, Pipes](#week-4)
- [Week 5: Time-Speed-Distance, Trains, Boats](#week-5)
- [Statistics & Metadata](#statistics)

---

"""
    
    # Write output
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(header)
        
        # Group by week and day
        current_week = 0
        current_day = 0
        
        for q in all_questions:
            if q['week'] != current_week:
                if current_week > 0:
                    f.write("\n")
                week_titles = {
                    1: "# 🔵 WEEK 1: NUMBERS, INTEGERS, FACTORS, DIVISIBILITY & HCF-LCM (Q1-Q250)\n\n",
                    2: "# 🟢 WEEK 2: PERCENTAGES, RATIOS, PROPORTIONS (Q251-Q500)\n\n",
                    3: "# 🟡 WEEK 3: RATIO, PROPORTION, TIMEWORK (Q501-Q750)\n\n",
                    4: "# 🟠 WEEK 4: TIMEWORK ADVANCED, PIPES (Q751-Q1000)\n\n",
                    5: "# 🔴 WEEK 5: TIME-SPEED-DISTANCE, TRAINS, BOATS (Q1001-Q1250)\n\n",
                }
                f.write(week_titles.get(q['week'], f"# WEEK {q['week']}\n\n"))
                current_week = q['week']
                current_day = 0
            
            if q['day'] != current_day:
                day_titles = {
                    1: "## DAY 1: ",
                    2: "## DAY 2: ",
                    3: "## DAY 3: ",
                    4: "## DAY 4: ",
                    5: "## DAY 5: ",
                }
                day_names = {
                    (1, 1): "INTEGERS & NUMBER SYSTEMS",
                    (1, 2): "FACTORS & MULTIPLES",
                    (1, 3): "DIVISIBILITY RULES & PATTERNS",
                    (1, 4): "HCF & LCM APPLICATIONS",
                    (1, 5): "BODMAS/VBODMAS & INTEGRATION",
                    (2, 1): "PERCENTAGE BASICS & PERCENTAGE CHANGE",
                    (2, 2): "PERCENTAGE APPLICATIONS",
                    (2, 3): "RATIO FOUNDATIONS",
                    (2, 4): "RATIO APPLICATIONS",
                    (2, 5): "PROPORTIONS",
                    (3, 1): "RATIO FOUNDATIONS",
                    (3, 2): "RATIO APPLICATIONS",
                    (3, 3): "PROPORTIONS",
                    (3, 4): "TIMEWORK BASICS",
                    (3, 5): "TIMEWORK APPLICATIONS",
                    (4, 1): "TIMEWORK ADVANCED",
                    (4, 2): "TIMEWORK COMPLEX",
                    (4, 3): "PIPES & CISTERNS BASICS",
                    (4, 4): "PIPES & CISTERNS ADVANCED",
                    (4, 5): "PIPES & CISTERNS COMPLEX",
                    (5, 1): "TIME-SPEED-DISTANCE FUNDAMENTALS",
                    (5, 2): "RELATIVE SPEED",
                    (5, 3): "TRAINS",
                    (5, 4): "BOATS & STREAMS",
                    (5, 5): "COMPLEX APPLICATIONS",
                }
                day_name = day_names.get((q['week'], q['day']), "TOPICS")
                f.write(f"{day_titles.get(q['day'], '## DAY ')} {day_name} (Q{q['number']}-Q{q['number']+49})\n\n")
                current_day = q['day']
            
            f.write(format_question_standard(q))
    
    print(f"\n✅ Processed {len(all_questions)} questions")
    print(f"✅ Output written to {output_path}")

if __name__ == "__main__":
    main()
