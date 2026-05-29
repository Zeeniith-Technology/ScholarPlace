# 📚 WEEK 6 – FRIDAY
## MIXED PLACEMENT MOCK | TCS / Infosys / Wipro / Accenture Style Problems

---

# 🌟 PLACEMENT PREPARATION GUIDE

## What to Expect in Campus Placement Tests

```
TCS NQT:
  - 2 coding questions in 60 minutes
  - Focus: Arrays, Strings, Basic Math, Loops
  - Difficulty: Medium (some Easy, rare Hard)

Infosys Superset:
  - 2-3 coding questions in 90 minutes
  - Focus: Sorting, Searching, String, Recursion
  - Difficulty: Medium-Hard

Wipro NLTH:
  - 2 questions in 60 minutes
  - Focus: Patterns, Sorting, Arrays
  - Difficulty: Easy-Medium

Accenture:
  - 2 questions in 60 minutes
  - Focus: Strings, Basic Math, Logic
  - Difficulty: Easy-Medium
```

---

# 🔵 SECTION 1: ARRAY + SORTING COMBO PROBLEMS

## Problem 1: Find Missing and Duplicate Numbers

```
Given array of n integers from range [1,n] with one number missing
and one number appearing twice. Find both.

Example: arr=[1,3,3,4,5] → Missing=2, Duplicate=3
```

### C++ Solution

```cpp
#include <iostream>
#include <vector>
using namespace std;

void findMissingDuplicate(vector<int>& arr) {
    int n = arr.size();
    int expectedSum = n * (n + 1) / 2;
    int expectedSumSq = n * (n + 1) * (2 * n + 1) / 6;

    long long actualSum = 0, actualSumSq = 0;
    for (int x : arr) {
        actualSum += x;
        actualSumSq += (long long)x * x;
    }

    // Let missing=a, duplicate=b
    // a - b = expectedSum - actualSum     ... (1)
    // a² - b² = expectedSumSq - actualSumSq ... (2)
    // (2)/(1): a + b = (expectedSumSq - actualSumSq) / (expectedSum - actualSum)

    long long diff = expectedSum - actualSum;            // a - b
    long long diffSq = expectedSumSq - actualSumSq;     // a² - b²
    long long sumAB = diffSq / diff;                     // a + b

    int missing = (diff + sumAB) / 2;
    int duplicate = sumAB - missing;

    cout << "Missing: " << missing << ", Duplicate: " << duplicate << endl;
}

int main() {
    vector<int> arr1 = {1, 3, 3, 4, 5};
    vector<int> arr2 = {2, 2, 3, 4, 5};
    vector<int> arr3 = {1, 2, 3, 5, 5};

    cout << "[1,3,3,4,5] → "; findMissingDuplicate(arr1);
    cout << "[2,2,3,4,5] → "; findMissingDuplicate(arr2);
    cout << "[1,2,3,5,5] → "; findMissingDuplicate(arr3);
    return 0;
}
```

**Output:**
```
[1,3,3,4,5] → Missing: 2, Duplicate: 3
[2,2,3,4,5] → Missing: 1, Duplicate: 2
[1,2,3,5,5] → Missing: 4, Duplicate: 5
```

---

## Problem 2: Leaders in Array

```
An element is a "leader" if it is GREATER than all elements to its RIGHT.
The rightmost element is always a leader.

Example: arr=[16, 17, 4, 3, 5, 2]
Leaders: 17, 5, 2
(17 > all right elements, 5 > 2, 2 is last)
```

### C++ Solution

```cpp
#include <iostream>
#include <vector>
using namespace std;

void findLeaders(vector<int>& arr) {
    int n = arr.size();
    vector<int> leaders;

    int maxRight = arr[n - 1];
    leaders.push_back(arr[n - 1]);  // Rightmost is always leader

    // Traverse right to left
    for (int i = n - 2; i >= 0; i--) {
        if (arr[i] > maxRight) {
            leaders.push_back(arr[i]);
            maxRight = arr[i];
        }
    }

    cout << "Leaders (right to left): ";
    for (int x : leaders) cout << x << " ";
    cout << endl;
}

int main() {
    vector<int> arr = {16, 17, 4, 3, 5, 2};
    cout << "Array: [16, 17, 4, 3, 5, 2]" << endl;
    findLeaders(arr);

    arr = {1, 2, 3, 4, 5};
    cout << "\nArray: [1,2,3,4,5]" << endl;
    findLeaders(arr);
    return 0;
}
```

**Output:**
```
Array: [16, 17, 4, 3, 5, 2]
Leaders (right to left): 2 5 17

Array: [1,2,3,4,5]
Leaders (right to left): 5
```

---

# 🔵 SECTION 2: STRING + LOGIC PROBLEMS

## Problem 3: Count Words with Vowel Start and End

```
Given a sentence. Count words that START with a vowel AND END with a vowel.

Example: "alice is eating apple"
"alice" → a(vowel) and e(vowel) → YES
"is" → i(vowel) and s(not) → NO
"eating" → e(vowel) and g(not) → NO
"apple" → a(vowel) and e(vowel) → YES
Count = 2
```

### C++ Solution

```cpp
#include <iostream>
#include <sstream>
#include <string>
using namespace std;

bool isVowel(char c) {
    c = tolower(c);
    return c == 'a' || c == 'e' || c == 'i' || c == 'o' || c == 'u';
}

int countVowelStartEnd(string sentence) {
    stringstream ss(sentence);
    string word;
    int count = 0;

    while (ss >> word) {
        if (isVowel(word.front()) && isVowel(word.back())) {
            cout << "  \"" << word << "\" qualifies" << endl;
            count++;
        }
    }
    return count;
}

int main() {
    string s = "alice is eating apple";
    cout << "Sentence: \"" << s << "\"" << endl;
    int result = countVowelStartEnd(s);
    cout << "Count: " << result << endl;

    s = "umbrella elope inside";
    cout << "\nSentence: \"" << s << "\"" << endl;
    result = countVowelStartEnd(s);
    cout << "Count: " << result << endl;
    return 0;
}
```

---

## Problem 4: Reverse Words in a Sentence

```
Input:  "Hello World from India"
Output: "India from World Hello"

(Reverse order of words, not characters in each word)
```

### C++ Solution

```cpp
#include <iostream>
#include <sstream>
#include <vector>
#include <string>
using namespace std;

string reverseWords(string sentence) {
    vector<string> words;
    stringstream ss(sentence);
    string word;

    while (ss >> word) words.push_back(word);

    string result = "";
    for (int i = words.size() - 1; i >= 0; i--) {
        result += words[i];
        if (i > 0) result += " ";
    }
    return result;
}

int main() {
    string s = "Hello World from India";
    cout << "Input:  \"" << s << "\"" << endl;
    cout << "Output: \"" << reverseWords(s) << "\"" << endl;

    s = "I love programming";
    cout << "\nInput:  \"" << s << "\"" << endl;
    cout << "Output: \"" << reverseWords(s) << "\"" << endl;
    return 0;
}
```

**Output:**
```
Input:  "Hello World from India"
Output: "India from World Hello"

Input:  "I love programming"
Output: "programming love I"
```

---

# 🔵 SECTION 3: RECURSION + SORTING COMBO

## Problem 5: Check if Array Can Be Sorted Using Subsets

```
Given array of N integers. Find if it can be made sorted by
sorting any subarrays individually.
(If entire array is already sortable via segment sorts)

Simple check: Can we make it equal to its sorted version
by sorting only certain segments?

Answer: Always YES — sort the full array.
But the interesting version: What's minimum number of segments to sort?
```

## Problem 6: Count Inversions (Merge Sort Based)

```
Count pairs (i,j) where i < j and arr[i] > arr[j].

Example: arr=[5, 3, 2, 4, 1]
Inversions: (5,3),(5,2),(5,4),(5,1),(3,2),(3,1),(2,1),(4,1) = 8
```

### C++ Solution (Merge Sort Based)

```cpp
#include <iostream>
#include <vector>
using namespace std;

long long mergeCount(vector<int>& arr, int left, int mid, int right) {
    vector<int> leftArr(arr.begin() + left, arr.begin() + mid + 1);
    vector<int> rightArr(arr.begin() + mid + 1, arr.begin() + right + 1);

    int i = 0, j = 0, k = left;
    long long inversions = 0;

    while (i < leftArr.size() && j < rightArr.size()) {
        if (leftArr[i] <= rightArr[j]) {
            arr[k++] = leftArr[i++];
        } else {
            // leftArr[i..end] are all > rightArr[j]
            inversions += leftArr.size() - i;
            arr[k++] = rightArr[j++];
        }
    }

    while (i < leftArr.size()) arr[k++] = leftArr[i++];
    while (j < rightArr.size()) arr[k++] = rightArr[j++];

    return inversions;
}

long long countInversions(vector<int>& arr, int left, int right) {
    if (left >= right) return 0;

    int mid = left + (right - left) / 2;
    long long inv = 0;
    inv += countInversions(arr, left, mid);
    inv += countInversions(arr, mid + 1, right);
    inv += mergeCount(arr, left, mid, right);
    return inv;
}

int main() {
    vector<int> arr = {5, 3, 2, 4, 1};
    cout << "Array: [5,3,2,4,1]" << endl;
    cout << "Inversions: " << countInversions(arr, 0, arr.size() - 1) << endl;

    arr = {1, 2, 3, 4, 5};
    cout << "\nArray: [1,2,3,4,5] (sorted)" << endl;
    cout << "Inversions: " << countInversions(arr, 0, arr.size() - 1) << endl;
    return 0;
}
```

**Output:**
```
Array: [5,3,2,4,1]
Inversions: 8

Array: [1,2,3,4,5] (sorted)
Inversions: 0
```

---

# 🔵 SECTION 4: PLACEMENT TEST STRATEGY

## Time Management in Test

```
2 questions, 60 minutes:
  Question 1 (easier): Aim to finish in 20-25 min
  Question 2 (harder): 30-35 min

First 5 minutes:
  - Read BOTH questions carefully
  - Identify which is easier
  - Plan approach before writing any code

If stuck:
  - Code brute force first → get partial marks
  - Then optimize
  - Always test with given examples
```

## Common Patterns to Recognize Instantly

```
"Find two elements that sum to X"
→ Two-pointer (sorted) OR HashMap O(n)

"Find first non-repeating"
→ Frequency counting + one pass

"Check balanced parentheses"
→ Stack

"Rotate array by K"
→ Reverse trick: reverse all, reverse first K, reverse rest

"Find maximum subarray sum"
→ Kadane's algorithm

"Count occurrences in sorted array"
→ Binary search (first occurrence + last occurrence)

"Generate all subsets/permutations"
→ Recursion + backtracking

"Sort with O(n) space"
→ Merge sort / Count sort
```

## Checklist Before Submitting

```
✅ Tested with the given sample input
✅ Handled edge cases: empty array, single element, all same
✅ Check variable names don't conflict
✅ No infinite loops (check loop conditions)
✅ Output format matches exactly (spaces, newlines)
✅ Integer overflow: use long long for large sums/products
```

---

# 📊 WEEK 6 TOPICS SUMMARY

| Day | Topic | Key Algorithms | Complexity |
|-----|-------|---------------|------------|
| Monday | Sorting | Bubble, Selection, Insertion | O(n²) |
| Tuesday | Recursion | Factorial, Subsets, Permutations, N-Queens | O(2^n) to O(n!) |
| Wednesday | Hashing | Frequency, Two-Sum, Anagram | O(n) |
| Thursday | Binary Search | 2D Matrix, Peak, Rotated | O(log n) |
| Friday | Mixed Mock | All combined | Varies |

---

# 📊 FULL 6-WEEK JOURNEY SUMMARY

```
Week 1: Programming Foundations (I/O, Variables, Loops, Arrays, Functions)
Week 2: Arrays Deep Dive (Sorting, Searching, Two-Pointer, Strings)
Week 3: Strings & Linked Lists (String Algorithms, LL Basics)
Week 4: Linked Lists Advanced (Reversal, Cycle, Merge, DLL)
Week 5: Stacks & Queues (LIFO/FIFO, Monotonic Stack, BFS)
Week 6: Capstone (Sorting, Recursion, Hashing, Binary Search, Mock)

YOU ARE PLACEMENT READY! 🎯
```

---

# ✅ FRIDAY CHECKLIST

- [x] Solve "Missing and Duplicate" with math approach
- [x] Find leaders in array in O(n)
- [x] Count words starting and ending with vowels
- [x] Reverse words in a sentence
- [x] Count inversions using Merge Sort
- [x] Know all common placement patterns
- [x] Practice time management: 2 questions in 60 min
- [x] Always handle edge cases

---

# 🎉 WEEK 6 COMPLETE! YOU'VE FINISHED THE CURRICULUM!

```
You have covered:
✅ I/O, Variables, Operators, Loops, Functions
✅ Arrays: Sorting, Searching, Two-Pointer, Prefix Sum
✅ Strings: Algorithms, Patterns, Manipulation
✅ Linked Lists: Basic, Reversal, Cycle, DLL
✅ Stacks & Queues: LIFO, FIFO, BFS, Monotonic
✅ Sorting: Bubble, Selection, Insertion
✅ Recursion & Backtracking: Subsets, Permutations, N-Queens
✅ Hashing: Frequency, Two-Sum, Anagrams
✅ Binary Search: Classic & Advanced patterns

You are ready for: TCS NQT, Infosys Superset,
                   Wipro NLTH, Accenture, and more!

BEST OF LUCK! 🚀
```

---

**FRIDAY & WEEK 6 COMPLETE** ✅
