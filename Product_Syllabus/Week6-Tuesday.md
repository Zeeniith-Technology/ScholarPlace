# 📚 WEEK 6 – TUESDAY
## RECURSION & BACKTRACKING | Subsets, Permutations, N-Queens, Tower of Hanoi

---

# 🌟 COMPREHENSIVE BEGINNER'S GUIDE (45 MINUTES)

## Part 1: Understanding Recursion

### What is Recursion?

```
A function that calls ITSELF to solve a smaller version of the same problem.

The key idea:
  Big problem = small step + smaller version of same problem

Example: Factorial
  5! = 5 × 4!
  4! = 4 × 3!
  3! = 3 × 2!
  2! = 2 × 1!
  1! = 1   ← BASE CASE (stop here!)

Working back up:
  1! = 1
  2! = 2 × 1 = 2
  3! = 3 × 2 = 6
  4! = 4 × 6 = 24
  5! = 5 × 24 = 120
```

### Two Essential Parts of Recursion

```
1. BASE CASE  → When to STOP (prevents infinite recursion)
2. RECURSIVE CASE → Call self with smaller problem

Without base case: Stack Overflow! (infinite calls)
Without recursive case: Not recursive at all.
```

### Call Stack Visualization

```cpp
factorial(3) → calls factorial(2) → calls factorial(1)

Call Stack:
┌───────────────────┐
│  factorial(1) = 1 │  ← TOP (executes first to finish)
├───────────────────┤
│  factorial(2) = ? │  ← waiting for factorial(1)
├───────────────────┤
│  factorial(3) = ? │  ← waiting for factorial(2)
└───────────────────┘  (BOTTOM = first called)

After factorial(1) returns 1:
factorial(2) = 2 × 1 = 2 → returns 2
factorial(3) = 3 × 2 = 6 → returns 6
```

---

# 🔵 SECTION 1: RECURSION FUNDAMENTALS

## Factorial

```cpp
#include <iostream>
using namespace std;

int factorial(int n) {
    // BASE CASE
    if (n == 0 || n == 1) return 1;

    // RECURSIVE CASE
    return n * factorial(n - 1);
}

int main() {
    for (int i = 0; i <= 7; i++) {
        cout << i << "! = " << factorial(i) << endl;
    }
    return 0;
}
```

**Output:**
```
0! = 1
1! = 1
2! = 2
3! = 6
4! = 24
5! = 120
6! = 720
7! = 5040
```

## Fibonacci Sequence

```cpp
// Method 1: Simple Recursion (slow, O(2^n))
int fibSlow(int n) {
    if (n <= 1) return n;           // BASE CASE
    return fibSlow(n-1) + fibSlow(n-2);  // RECURSIVE
}

// Method 2: With Memoization (fast, O(n))
int memo[100] = {0};
int fibFast(int n) {
    if (n <= 1) return n;
    if (memo[n] != 0) return memo[n];  // Already computed!
    memo[n] = fibFast(n-1) + fibFast(n-2);
    return memo[n];
}

// Why fibSlow is slow:
// fibSlow(5) calls fibSlow(4) AND fibSlow(3)
// fibSlow(4) calls fibSlow(3) AND fibSlow(2)
// fibSlow(3) is computed TWICE! (exponential waste)

// fibFast stores result → each n computed once → O(n)
```

## Recursion vs Iteration

```
Recursion:
  + Elegant, mirrors mathematical definition
  + Great for tree/graph problems, divide & conquer
  - Stack overhead (O(n) extra space for call stack)
  - Risk of stack overflow for large n

Iteration:
  + O(1) extra space
  + No stack overflow risk
  - Less elegant for naturally recursive problems

Rule: If problem is naturally hierarchical → Recursion
      If it's just a loop → Iteration
```

---

# 🔵 SECTION 2: TOWER OF HANOI

## The Problem

```
3 rods: Source (A), Auxiliary (B), Destination (C)
N disks on A, largest at bottom, smallest on top.
Goal: Move all disks from A to C.

Rules:
1. Move only ONE disk at a time
2. Never place LARGER disk on SMALLER disk
3. Use B as auxiliary

Visual (N=3):
    |           |           |
   _|_          |           |
  ___|___       |           |
 _____|_____    |           |
    A           B           C
```

## Recursive Solution

```
hanoi(n, source, dest, aux):
  if n == 1:
    MOVE disk 1 from source to dest  ← BASE CASE
    return

  hanoi(n-1, source, aux, dest)  ← Move top n-1 to aux
  MOVE disk n from source to dest  ← Move largest
  hanoi(n-1, aux, dest, source)  ← Move n-1 from aux to dest
```

## Complete C++ Code

```cpp
#include <iostream>
using namespace std;

int moveCount = 0;

void hanoi(int n, char source, char dest, char aux) {
    if (n == 1) {
        moveCount++;
        cout << "Move disk 1 from " << source << " to " << dest << endl;
        return;
    }

    hanoi(n - 1, source, aux, dest);  // Move n-1 disks to aux

    moveCount++;
    cout << "Move disk " << n << " from " << source << " to " << dest << endl;

    hanoi(n - 1, aux, dest, source);  // Move n-1 disks from aux to dest
}

int main() {
    int n = 3;
    cout << "Tower of Hanoi with " << n << " disks:" << endl;
    cout << "====================================" << endl;

    hanoi(n, 'A', 'C', 'B');

    cout << "\nTotal moves: " << moveCount << endl;
    cout << "Minimum moves formula: 2^n - 1 = " << (int)(pow(2, n) - 1) << endl;
    return 0;
}
```

## Output (N=3)

```
Tower of Hanoi with 3 disks:
====================================
Move disk 1 from A to C
Move disk 2 from A to B
Move disk 1 from C to B
Move disk 3 from A to C
Move disk 1 from B to A
Move disk 2 from B to C
Move disk 1 from A to C

Total moves: 7
Minimum moves formula: 2^n - 1 = 7
```

## Complexity

```
Moves: 2^n - 1 (minimum and exact)
Time:  O(2^n) — exponential (unavoidable for this problem)
Space: O(n) — recursive call stack depth n

For n=64 disks: 2^64 - 1 ≈ 18 quintillion moves!
At 1 move/second: 585 billion years!
```

---

# 🔵 SECTION 3: SUBSET GENERATION

## Generate All Subsets

```
Given: [1, 2, 3]
All 2^3 = 8 subsets:
[], [1], [2], [3], [1,2], [1,3], [2,3], [1,2,3]

For each element: either INCLUDE or EXCLUDE → 2 choices
Total subsets for n elements: 2^n
```

## C++ Code

```cpp
#include <iostream>
#include <vector>
using namespace std;

void generateSubsets(vector<int>& arr, vector<int>& current, int index) {
    // Print current subset
    cout << "[";
    for (int i = 0; i < current.size(); i++) {
        cout << current[i];
        if (i < current.size() - 1) cout << ",";
    }
    cout << "]" << endl;

    // Try including each element from index onward
    for (int i = index; i < arr.size(); i++) {
        current.push_back(arr[i]);            // INCLUDE arr[i]
        generateSubsets(arr, current, i + 1); // Recurse
        current.pop_back();                   // EXCLUDE arr[i] (backtrack)
    }
}

int main() {
    vector<int> arr = {1, 2, 3};
    vector<int> current;

    cout << "All subsets of [1,2,3]:" << endl;
    generateSubsets(arr, current, 0);

    cout << "\nTotal subsets: " << (1 << arr.size()) << endl; // 2^n
    return 0;
}
```

**Output:**
```
All subsets of [1,2,3]:
[]
[1]
[1,2]
[1,2,3]
[1,3]
[2]
[2,3]
[3]

Total subsets: 8
```

---

# 🔵 SECTION 4: PERMUTATIONS

## Generate All Permutations

```
Given: [1, 2, 3]
All 3! = 6 permutations:
[1,2,3], [1,3,2], [2,1,3], [2,3,1], [3,1,2], [3,2,1]

Idea: Fix first element, permute the rest
  Fix 1: permute [2,3] → [1,2,3], [1,3,2]
  Fix 2: permute [1,3] → [2,1,3], [2,3,1]
  Fix 3: permute [1,2] → [3,1,2], [3,2,1]
```

## C++ Code

```cpp
#include <iostream>
#include <vector>
using namespace std;

int permCount = 0;

void permute(vector<int>& arr, int start) {
    if (start == arr.size()) {
        // All positions filled → print permutation
        permCount++;
        cout << permCount << ". [";
        for (int i = 0; i < arr.size(); i++) {
            cout << arr[i];
            if (i < arr.size() - 1) cout << ",";
        }
        cout << "]" << endl;
        return;
    }

    for (int i = start; i < arr.size(); i++) {
        swap(arr[start], arr[i]);  // Place arr[i] at position 'start'
        permute(arr, start + 1);   // Recurse for remaining positions
        swap(arr[start], arr[i]);  // BACKTRACK: restore original order
    }
}

int main() {
    vector<int> arr = {1, 2, 3};
    cout << "All permutations of [1,2,3]:" << endl;
    permute(arr, 0);
    cout << "\nTotal: " << permCount << " (= 3! = 6)" << endl;
    return 0;
}
```

**Output:**
```
All permutations of [1,2,3]:
1. [1,2,3]
2. [1,3,2]
3. [2,1,3]
4. [2,3,1]
5. [3,2,1]
6. [3,1,2]

Total: 6 (= 3! = 6)
```

---

# 🔵 SECTION 5: N-QUEENS PROBLEM (Backtracking)

## The Problem

```
Place N queens on N×N chessboard.
No two queens can attack each other.
Queens attack: same row, same column, same diagonal.

Example: 4-Queens solution
. Q . .
. . . Q
Q . . .
. . Q .
```

## C++ Code

```cpp
#include <iostream>
#include <vector>
using namespace std;

int solutions = 0;

bool isSafe(vector<string>& board, int row, int col, int n) {
    // Check column above
    for (int i = 0; i < row; i++)
        if (board[i][col] == 'Q') return false;

    // Check upper-left diagonal
    for (int i = row - 1, j = col - 1; i >= 0 && j >= 0; i--, j--)
        if (board[i][j] == 'Q') return false;

    // Check upper-right diagonal
    for (int i = row - 1, j = col + 1; i >= 0 && j < n; i--, j++)
        if (board[i][j] == 'Q') return false;

    return true;  // Safe to place queen here
}

void solveNQueens(vector<string>& board, int row, int n) {
    if (row == n) {
        // All queens placed → found a solution!
        solutions++;
        cout << "Solution " << solutions << ":" << endl;
        for (auto& r : board) cout << r << endl;
        cout << endl;
        return;
    }

    for (int col = 0; col < n; col++) {
        if (isSafe(board, row, col, n)) {
            board[row][col] = 'Q';       // PLACE queen
            solveNQueens(board, row + 1, n);  // Recurse to next row
            board[row][col] = '.';       // BACKTRACK: remove queen
        }
    }
}

int main() {
    int n = 4;
    vector<string> board(n, string(n, '.'));

    cout << "Solving " << n << "-Queens Problem:" << endl;
    cout << "==================================" << endl;

    solveNQueens(board, 0, n);

    cout << "Total solutions for " << n << "-Queens: " << solutions << endl;
    return 0;
}
```

## Output (4-Queens)

```
Solving 4-Queens Problem:
==================================
Solution 1:
.Q..
...Q
Q...
..Q.

Solution 2:
..Q.
Q...
...Q
.Q..

Total solutions for 4-Queens: 2
```

---

# 📊 BACKTRACKING PATTERN

```
void backtrack(state, choices) {
    if (goal reached):
        save/print solution
        return

    for each choice in choices:
        if choice is valid:
            MAKE choice      ← modify state
            backtrack(new state, remaining choices)
            UNDO choice      ← restore state (backtrack!)
}

The key: UNDO operation restores state for next branch.
This is the "backtrack" in backtracking!
```

---

# ❌ COMMON MISTAKES

| Mistake | Problem | Fix |
|---------|---------|-----|
| Missing base case | Stack overflow | Always define when to stop |
| Wrong base case | Wrong answer | Trace small examples first |
| Forget backtrack | Wrong combinations | Always undo after recursion |
| n=0 vs n=1 base case | Off-by-one | Test with n=0,1,2 |
| Print before/after recurse | Wrong output order | Decide: preorder or postorder |

---

# 📝 PRACTICE QUESTIONS (TUESDAY)

**Q1:** What are the two mandatory parts of any recursive function?
**A1:** Base case (when to stop) and recursive case (call with smaller input).

**Q2:** How many moves does Tower of Hanoi need for n disks?
**A2:** 2^n - 1 moves (minimum and exact).

**Q3:** How many subsets does a set of n elements have?
**A3:** 2^n subsets (each element is either included or excluded).

**Q4:** How many permutations does [1,2,...,n] have?
**A4:** n! permutations.

**Q5:** What is backtracking? How does it differ from brute force?
**A5:** Backtracking explores choices and UNDOES invalid choices early (pruning), while brute force tries all possibilities without pruning.

---

# ✅ TUESDAY CHECKLIST

- [x] Understand recursion: base case + recursive case
- [x] Trace factorial and fibonacci recursion
- [x] Implement Tower of Hanoi and understand 2^n-1 moves
- [x] Generate all subsets using recursion
- [x] Generate all permutations using swap+backtrack
- [x] Solve N-Queens problem using backtracking
- [x] Understand the backtracking pattern: make→recurse→undo

---

**TUESDAY COMPLETE** ✅
