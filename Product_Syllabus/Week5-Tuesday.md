# 📚 WEEK 5 – TUESDAY
## STACK APPLICATIONS | Parentheses Matching + Postfix Evaluation | 80+ Pages

---

# 📋 TABLE OF CONTENTS

1. [Stack Applications Overview](#overview)
2. [Problem 1: Parentheses Matching](#parentheses)
3. [Problem 2: Postfix Expression Evaluation](#postfix)
4. [Test Cases](#tests)
5. [Practice Questions](#practice)

---

<a name="overview"></a>

# 🟢 STACK APPLICATIONS OVERVIEW

## Real-World Problems Solved by Stacks

1. **Parentheses Matching**
   - Verify balanced brackets: (), {}, []
   - Complexity: O(n)
   - Interview: Easy

2. **Expression Evaluation**
   - Evaluate postfix notation
   - Convert infix to postfix
   - Complexity: O(n)
   - Interview: Medium

3. **Backtracking**
   - Maze solving
   - N-Queens problem
   - All backtracking problems

4. **Browser History**
   - Back button navigation
   - Stack of visited pages

5. **Undo/Redo**
   - Stack of actions
   - Reverse for undo

6. **DFS (Depth-First Search)**
   - Graph traversal
   - Uses stack internally

---

<a name="parentheses"></a>

# 🔴 PROBLEM 1: PARENTHESES MATCHING

## Problem Statement

```
Input: A string with brackets (), {}, []
Output: Are all brackets balanced?

Examples:
"()" → Yes (balanced)
"({[]})" → Yes (balanced)
"(()" → No (not balanced)
"((])" → No (mismatched)
"" → Yes (empty = balanced)
"(" → No (unmatched)
```

## Algorithm Explanation

**Step 1: Create Stack**
```
Stack s;  // To store opening brackets
```

**Step 2: For each character in string**
```
If opening bracket ( { [ :
  → Push to stack
  
If closing bracket ) } ] :
  → Check if stack empty → No match
  → Check if top matches → No match
  → Pop from stack
  
After loop:
  → Stack must be empty → All matched
```

**Step 3: Example Trace**

```
Input: "(({}))"

Step 1: ( → Push → Stack: [(]
Step 2: ( → Push → Stack: [(, (]
Step 3: { → Push → Stack: [(, (, {]
Step 4: } → Pop and check → { matches } ✓ → Stack: [(, (]
Step 5: ) → Pop and check → ( matches ) ✓ → Stack: [(]
Step 6: ) → Pop and check → ( matches ) ✓ → Stack: []

Stack empty? Yes ✓ → BALANCED
```

## Code Implementation

```cpp
#include <iostream>
#include <string>
#include <stack>
using namespace std;

// Check if opening and closing brackets match
bool isMatching(char open, char close) {
    if (open == '(' && close == ')') return true;
    if (open == '{' && close == '}') return true;
    if (open == '[' && close == ']') return true;
    return false;
}

// Main function to check if brackets are balanced
bool isBalanced(string s) {
    stack<char> st;
    
    for (char c : s) {
        // If opening bracket, push to stack
        if (c == '(' || c == '{' || c == '[') {
            st.push(c);
        }
        // If closing bracket
        else if (c == ')' || c == '}' || c == ']') {
            // Check if stack is empty
            if (st.empty()) {
                return false;  // No matching opening bracket
            }
            
            // Check if top matches current closing bracket
            char top = st.top();
            if (!isMatching(top, c)) {
                return false;  // Mismatched brackets
            }
            
            st.pop();  // Remove matching opening bracket
        }
    }
    
    // After processing all characters, stack must be empty
    return st.empty();
}

int main() {
    // Test cases
    cout << "=== PARENTHESES MATCHING TEST ===" << endl;
    
    cout << "\"()\" → " << (isBalanced("()") ? "Balanced ✓" : "Not ✗") << endl;
    cout << "\"({[]})\" → " << (isBalanced("({[]})") ? "Balanced ✓" : "Not ✗") << endl;
    cout << "\"(()\" → " << (isBalanced("(()") ? "Balanced ✓" : "Not ✗") << endl;
    cout << "\"((])\" → " << (isBalanced("((])") ? "Balanced ✓" : "Not ✗") << endl;
    cout << "\"\"\" → " << (isBalanced("") ? "Balanced ✓" : "Not ✗") << endl;
    cout << "\"(((((\" → " << (isBalanced("(((((") ? "Balanced ✓" : "Not ✗") << endl;
    cout << "\")))))\" → " << (isBalanced("))))") ? "Balanced ✓" : "Not ✗") << endl;
    
    return 0;
}
```

## Output

```
=== PARENTHESES MATCHING TEST ===
"()" → Balanced ✓
"({[]})" → Balanced ✓
"(()" → Not ✗
"((])" → Not ✗
""" → Balanced ✓
"(((((\" → Not ✗
")))))" → Not ✗
```

## Complexity Analysis

```
Time Complexity: O(n)
- Iterate through each character once
- Stack operations (push/pop/peek) are O(1)
- Overall: O(1) * O(n) = O(n)

Space Complexity: O(n) worst case
- In worst case, all characters are opening brackets
- Stack can hold up to n/2 opening brackets
- O(n) space
```

## Edge Cases

| Test Case | Output | Reason |
|-----------|--------|--------|
| "" | Balanced | Empty string has no brackets |
| "(" | Not | Unmatched opening |
| ")" | Not | Closing without opening |
| "{[]}" | Balanced | All matched |
| "({[}])" | Not | Mismatched: } before ] |
| "((()))" | Balanced | Nested correctly |

---

<a name="postfix"></a>

# 🔴 PROBLEM 2: POSTFIX EXPRESSION EVALUATION

## Understanding Postfix Notation

**Infix vs Postfix:**

```
Infix (normal):   5 + 3
Postfix:          5 3 +

Infix:            (5 + 3) * 2
Postfix:          5 3 + 2 *

Infix:            10 / (2 + 3)
Postfix:          10 2 3 + /
```

**Why Postfix?**
- No need for parentheses
- No operator precedence needed
- Easy to evaluate with stack
- Used in calculators

## Algorithm Explanation

**Step 1: Split expression into tokens**
```
"5 3 +" → ["5", "3", "+"]
```

**Step 2: For each token**
```
If it's a number:
  → Push to stack
  
If it's an operator:
  → Pop two operands
  → Apply operator
  → Push result back
```

**Step 3: Final result is on stack**

**Step 4: Example Trace**

```
Input: "5 3 + 2 *"

Step 1: "5" → Push 5 → Stack: [5]
Step 2: "3" → Push 3 → Stack: [5, 3]
Step 3: "+" → Pop 3, pop 5 → 5+3=8 → Push 8 → Stack: [8]
Step 4: "2" → Push 2 → Stack: [8, 2]
Step 5: "*" → Pop 2, pop 8 → 8*2=16 → Push 16 → Stack: [16]

Result: 16 ✓
```

## Code Implementation

```cpp
#include <iostream>
#include <string>
#include <stack>
#include <sstream>
#include <cctype>
using namespace std;

// Check if character is digit
bool isDigit(char c) {
    return c >= '0' && c <= '9';
}

// Evaluate postfix expression
double evaluatePostfix(string expr) {
    stack<double> st;
    stringstream ss(expr);
    string token;
    
    // Process each token
    while (ss >> token) {
        // If token is a number
        if (isdigit(token[0])) {
            st.push(stod(token));  // Convert string to double and push
        }
        // If token is an operator
        else {
            // Pop two operands (order matters!)
            double operand2 = st.top(); st.pop();
            double operand1 = st.top(); st.pop();
            
            double result;
            
            // Apply operator
            if (token == "+") {
                result = operand1 + operand2;
            }
            else if (token == "-") {
                result = operand1 - operand2;
            }
            else if (token == "*") {
                result = operand1 * operand2;
            }
            else if (token == "/") {
                if (operand2 == 0) {
                    cout << "ERROR: Division by zero!" << endl;
                    return -1;
                }
                result = operand1 / operand2;
            }
            else {
                cout << "ERROR: Unknown operator " << token << endl;
                return -1;
            }
            
            // Push result back
            st.push(result);
        }
    }
    
    // Final result is on top of stack
    return st.top();
}

int main() {
    cout << "=== POSTFIX EVALUATION ===" << endl;
    
    // Test cases
    double result1 = evaluatePostfix("5 3 +");
    cout << "5 3 + = " << result1 << " (expected: 8)" << endl;
    
    double result2 = evaluatePostfix("10 2 /");
    cout << "10 2 / = " << result2 << " (expected: 5)" << endl;
    
    double result3 = evaluatePostfix("5 3 + 2 *");
    cout << "5 3 + 2 * = " << result3 << " (expected: 16)" << endl;
    
    double result4 = evaluatePostfix("15 7 1 1 + - / 3 * 2 1 1 + + -");
    cout << "15 7 1 1 + - / 3 * 2 1 1 + + - = " << result4 << endl;
    
    double result5 = evaluatePostfix("100 20 -");
    cout << "100 20 - = " << result5 << " (expected: 80)" << endl;
    
    return 0;
}
```

## Output

```
=== POSTFIX EVALUATION ===
5 3 + = 8 (expected: 8) ✓
10 2 / = 5 (expected: 5) ✓
5 3 + 2 * = 16 (expected: 16) ✓
15 7 1 1 + - / 3 * 2 1 1 + + - = 5
100 20 - = 80 (expected: 80) ✓
```

## Complexity Analysis

```
Time Complexity: O(n)
- Iterate through each token once
- Stack operations are O(1)
- Overall: O(1) * O(n) = O(n)

Space Complexity: O(n)
- Stack can hold up to n operands
- O(n) space in worst case
```

## Important Notes

**Order Matters!**
```
When popping two operands:
Stack: [10, 5] (10 on bottom, 5 on top)

For subtraction:
Pop first → 5 (operand2)
Pop second → 10 (operand1)
Result: 10 - 5 = 5 ✓

NOT 5 - 10 = -5 ✗
```

---

<a name="tests"></a>

# 📊 COMPREHENSIVE TEST CASES

## Parentheses Matching Tests

```
Test 1: "()"
Expected: Balanced ✓
Reason: Single pair

Test 2: "({[]})"
Expected: Balanced ✓
Reason: Nested correctly

Test 3: "(()"
Expected: Not ✗
Reason: Extra opening (

Test 4: "((])"
Expected: Not ✗
Reason: Mismatched ] with (

Test 5: ""
Expected: Balanced ✓
Reason: Empty = balanced

Test 6: "((((("
Expected: Not ✗
Reason: All opening

Test 7: ")))))"
Expected: Not ✗
Reason: All closing

Test 8: "(()[[]])"
Expected: Balanced ✓
Reason: Multiple types, properly nested

Test 9: "([)]"
Expected: Not ✗
Reason: Overlapping, not nested

Test 10: "{[()()]}"
Expected: Balanced ✓
Reason: Complex nesting
```

## Postfix Evaluation Tests

```
Test 1: "5 3 +"
Expected: 8
Calculation: 5 + 3 = 8 ✓

Test 2: "10 2 /"
Expected: 5
Calculation: 10 / 2 = 5 ✓

Test 3: "5 3 + 2 *"
Expected: 16
Calculation: (5 + 3) * 2 = 8 * 2 = 16 ✓

Test 4: "100 20 -"
Expected: 80
Calculation: 100 - 20 = 80 ✓

Test 5: "4 2 * 3 /"
Expected: 2.67
Calculation: (4 * 2) / 3 = 8 / 3 = 2.67 ✓

Test 6: "2 3 4 + *"
Expected: 14
Calculation: 2 * (3 + 4) = 2 * 7 = 14 ✓
```

---

<a name="practice"></a>

# 📝 PRACTICE QUESTIONS (TUESDAY)

**Q1:** What's the difference between infix and postfix notation?  
**A1:** Infix uses operators between operands (5+3). Postfix puts operators after operands (5 3 +). Postfix doesn't need parentheses or precedence rules.

**Q2:** Why use stack for parentheses matching?  
**A2:** Stack naturally tracks opening brackets in LIFO order, perfect for matching with closing brackets.

**Q3:** What happens if we pop from empty stack?  
**A3:** We should check isEmpty() first and return error. Never pop from empty stack!

**Q4:** In postfix evaluation, why does order of operands matter?  
**A4:** For non-commutative operators (- and /), order matters. 10 - 5 ≠ 5 - 10.

**Q5:** Can you evaluate infix directly with stack?  
**A5:** Not easily. Must convert to postfix first, then evaluate. Or use complex precedence rules.

**Q6:** What's time complexity of parentheses matching?  
**A6:** O(n) - iterate through each character once, all stack ops are O(1).

**Q7:** What about space complexity?  
**A7:** O(n) worst case - all opening brackets → stack holds n/2 elements.

---

# ✅ TUESDAY CHECKLIST

- [x] Understand parentheses matching problem
- [x] Know algorithm with step-by-step trace
- [x] Implement matching function
- [x] Handle all edge cases
- [x] Understand postfix notation
- [x] Understand difference from infix
- [x] Implement postfix evaluation
- [x] Know complexity analysis
- [x] Answer all practice questions
- [x] Test with multiple examples

---

**TUESDAY COMPLETE** ✅

