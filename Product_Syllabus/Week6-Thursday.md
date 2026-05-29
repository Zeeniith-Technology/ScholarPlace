# 📚 WEEK 6 – THURSDAY
## BINARY SEARCH ADVANCED | 2D Matrix, Peak Element, Rotated Array, Kth Smallest

---

# 🌟 COMPREHENSIVE BEGINNER'S GUIDE (45 MINUTES)

## Part 1: Binary Search Recap

```
Classic Binary Search (sorted array, find target):

low=0, high=n-1
while low <= high:
    mid = low + (high - low) / 2   ← avoids overflow
    if arr[mid] == target: found!
    if arr[mid] < target: low = mid + 1
    if arr[mid] > target: high = mid - 1

Time: O(log n) | Space: O(1)
```

## The Key Mental Model

```
Binary Search works on ANY "monotone" property, not just sorted arrays!

If you can answer "Is the answer in the LEFT half or RIGHT half?"
→ You can use binary search.

This week: We apply this to non-trivial problems.
```

---

# 🔵 SECTION 1: BINARY SEARCH IN 2D MATRIX

## Problem Type 1: Sorted Matrix (Row & Column Sorted)

```
Matrix where each row is sorted AND each column is sorted:
  1   4   7  11
  2   5   8  12
  3   6   9  16
 10  13  14  17

Search for 5:
Start at TOP-RIGHT corner (or bottom-left)

Why top-right?
- Go LEFT → smaller values
- Go DOWN → larger values
Two directions available → Binary-search-like elimination!
```

## Code: Search in Row-Column Sorted Matrix

```cpp
#include <iostream>
#include <vector>
using namespace std;

bool searchMatrix(vector<vector<int>>& matrix, int target) {
    int M = matrix.size(), N = matrix[0].size();
    int row = 0, col = N - 1;  // Start at top-right

    while (row < M && col >= 0) {
        int curr = matrix[row][col];

        if (curr == target) {
            cout << "Found " << target << " at (" << row << "," << col << ")" << endl;
            return true;
        } else if (curr > target) {
            col--;   // Move left (smaller values)
        } else {
            row++;   // Move down (larger values)
        }
    }

    cout << target << " not found in matrix" << endl;
    return false;
}

int main() {
    vector<vector<int>> matrix = {
        { 1,  4,  7, 11},
        { 2,  5,  8, 12},
        { 3,  6,  9, 16},
        {10, 13, 14, 17}
    };

    searchMatrix(matrix, 5);
    searchMatrix(matrix, 20);
    searchMatrix(matrix, 14);
    return 0;
}
```

**Output:**
```
Found 5 at (1,1)
20 not found in matrix
Found 14 at (3,2)
```

## Problem Type 2: Row-Sorted, First of Each Row > Last of Previous

```
Matrix:  1  3  5  7
         10 11 16 20
         23 30 34 60

This is basically a sorted 1D array laid out in 2D rows!
Element at (row,col) → position = row*N + col
Position p → row=p/N, col=p%N
→ Apply classic binary search on "positions"!
```

## Code: Strictly Sorted 2D Matrix

```cpp
bool searchStrictMatrix(vector<vector<int>>& matrix, int target) {
    int M = matrix.size(), N = matrix[0].size();
    int low = 0, high = M * N - 1;

    while (low <= high) {
        int mid = low + (high - low) / 2;
        int row = mid / N, col = mid % N;  // Convert position to 2D index
        int val = matrix[row][col];

        if (val == target) {
            cout << "Found " << target << " at (" << row << "," << col << ")" << endl;
            return true;
        } else if (val < target) low = mid + 1;
        else high = mid - 1;
    }
    return false;
}
```

---

# 🔵 SECTION 2: FIND PEAK ELEMENT

## Problem

```
A peak element is one that is >= its neighbors.
Find ANY peak element.

Example: [1, 3, 5, 4, 2]
Peak = 5 (5 > 3 and 5 > 4)

Example: [1, 2, 1, 3, 5, 6, 4]
Peaks: 2 or 6 (any one is acceptable)
```

## Why Binary Search Works Here?

```
At any mid position:
  If arr[mid] < arr[mid+1]:
    → Right side has a peak (values going UP → peak somewhere right)
    → Search right half

  If arr[mid] > arr[mid+1]:
    → Left side has a peak (we just came from higher value)
    → Search left half (including mid)

  If arr[mid] > both neighbors: → mid IS a peak!

This eliminates half the search space each time → O(log n)
```

## C++ Code

```cpp
#include <iostream>
#include <vector>
using namespace std;

int findPeak(vector<int>& arr) {
    int low = 0, high = arr.size() - 1;

    while (low < high) {
        int mid = low + (high - low) / 2;

        if (arr[mid] < arr[mid + 1]) {
            low = mid + 1;   // Peak is in right half
        } else {
            high = mid;      // Peak is in left half (including mid)
        }
    }
    return low;  // low == high → peak found
}

int main() {
    vector<int> arr1 = {1, 3, 5, 4, 2};
    int peak = findPeak(arr1);
    cout << "Peak in [1,3,5,4,2]: index=" << peak
         << " value=" << arr1[peak] << endl;

    vector<int> arr2 = {1, 2, 1, 3, 5, 6, 4};
    peak = findPeak(arr2);
    cout << "Peak in [1,2,1,3,5,6,4]: index=" << peak
         << " value=" << arr2[peak] << endl;

    vector<int> arr3 = {1};
    peak = findPeak(arr3);
    cout << "Peak in [1]: index=" << peak
         << " value=" << arr3[peak] << endl;
    return 0;
}
```

**Output:**
```
Peak in [1,3,5,4,2]: index=2 value=5
Peak in [1,2,1,3,5,6,4]: index=5 value=6
Peak in [1]: index=0 value=1
```

---

# 🔵 SECTION 3: SEARCH IN ROTATED SORTED ARRAY

## Problem

```
Array was sorted, then rotated at some pivot.
Example: [4, 5, 6, 7, 0, 1, 2]  (rotated at pivot=4)

Find target=0.

Why is this hard?
Normal binary search assumes fully sorted → breaks here.

Key insight: One half is ALWAYS sorted after rotation!
  [4,5,6,7,0,1,2] mid=7
  Left half [4,5,6,7]: sorted (4<=7)
  Right half [0,1,2]: sorted (0<=2)
```

## C++ Code

```cpp
#include <iostream>
#include <vector>
using namespace std;

int searchRotated(vector<int>& arr, int target) {
    int low = 0, high = arr.size() - 1;

    while (low <= high) {
        int mid = low + (high - low) / 2;

        if (arr[mid] == target) return mid;

        // Left half is sorted
        if (arr[low] <= arr[mid]) {
            if (arr[low] <= target && target < arr[mid]) {
                high = mid - 1;  // Target in sorted left half
            } else {
                low = mid + 1;   // Target in right half
            }
        }
        // Right half is sorted
        else {
            if (arr[mid] < target && target <= arr[high]) {
                low = mid + 1;   // Target in sorted right half
            } else {
                high = mid - 1;  // Target in left half
            }
        }
    }
    return -1;  // Not found
}

int main() {
    vector<int> arr = {4, 5, 6, 7, 0, 1, 2};
    cout << "Array: [4,5,6,7,0,1,2]" << endl;
    cout << "Search 0: index " << searchRotated(arr, 0) << endl;
    cout << "Search 4: index " << searchRotated(arr, 4) << endl;
    cout << "Search 3: index " << searchRotated(arr, 3) << endl;

    arr = {1};
    cout << "\nArray: [1], Search 0: index " << searchRotated(arr, 0) << endl;
    cout << "Array: [1], Search 1: index " << searchRotated(arr, 1) << endl;
    return 0;
}
```

**Output:**
```
Array: [4,5,6,7,0,1,2]
Search 0: index 4
Search 4: index 0
Search 3: index -1

Array: [1], Search 0: index -1
Array: [1], Search 1: index 0
```

---

# 🔵 SECTION 4: KTH SMALLEST ELEMENT

## Problem

```
Given two sorted arrays of sizes M and N.
Find the kth smallest element in their merged sorted array.
WITHOUT actually merging.

Example:
arr1 = [2, 3, 6, 7]
arr2 = [1, 4, 8, 9]
Merged = [1, 2, 3, 4, 6, 7, 8, 9]
k=4 → Answer = 4
```

## Simple Approach: Two-Pointer Merge (O(k))

```cpp
#include <iostream>
#include <vector>
using namespace std;

int kthSmallest(vector<int>& a, vector<int>& b, int k) {
    int i = 0, j = 0, count = 0;
    int last = -1;

    while (i < a.size() && j < b.size()) {
        if (a[i] <= b[j]) {
            last = a[i++];
        } else {
            last = b[j++];
        }
        if (++count == k) return last;
    }

    // Remaining elements from a or b
    while (i < a.size()) {
        last = a[i++];
        if (++count == k) return last;
    }
    while (j < b.size()) {
        last = b[j++];
        if (++count == k) return last;
    }

    return -1;
}

int main() {
    vector<int> a = {2, 3, 6, 7};
    vector<int> b = {1, 4, 8, 9};

    cout << "arr1: [2,3,6,7], arr2: [1,4,8,9]" << endl;
    for (int k = 1; k <= 8; k++) {
        cout << "k=" << k << " → " << kthSmallest(a, b, k) << endl;
    }
    return 0;
}
```

**Output:**
```
arr1: [2,3,6,7], arr2: [1,4,8,9]
k=1 → 1
k=2 → 2
k=3 → 3
k=4 → 4
k=5 → 6
k=6 → 7
k=7 → 8
k=8 → 9
```

---

# 🔵 SECTION 5: BINARY SEARCH ON ANSWER

## Advanced Pattern: Search the Answer Space

```
Some problems: Answer lies in a RANGE.
Instead of searching array, binary search on the ANSWER RANGE.

"Is X a valid answer?" must be answerable in O(n) or O(n log n)

Pattern:
  low = minimum possible answer
  high = maximum possible answer
  while low < high:
    mid = (low + high) / 2
    if isValid(mid): high = mid
    else: low = mid + 1
```

## Example: Minimum Days to Make M Bouquets

```cpp
// N roses, bloom on day bloom[i], need K consecutive roses per bouquet.
// Find minimum days to make M bouquets.

bool canMake(vector<int>& bloom, int day, int m, int k) {
    int bouquets = 0, consecutive = 0;
    for (int b : bloom) {
        if (b <= day) {
            consecutive++;
            if (consecutive == k) { bouquets++; consecutive = 0; }
        } else {
            consecutive = 0;
        }
    }
    return bouquets >= m;
}

int minDays(vector<int>& bloom, int m, int k) {
    int low = 1, high = *max_element(bloom.begin(), bloom.end());

    while (low < high) {
        int mid = low + (high - low) / 2;
        if (canMake(bloom, mid, m, k)) high = mid;
        else low = mid + 1;
    }
    return low;
}
```

---

# 📊 BINARY SEARCH PATTERNS SUMMARY

| Problem Type | Search Space | Condition |
|-------------|-------------|-----------|
| Classic search | Sorted array | arr[mid] == target |
| Row-col sorted matrix | Top-right corner | Go left or down |
| Strictly sorted matrix | Positions 0 to M*N-1 | Map to 2D index |
| Peak element | Array indices | arr[mid] vs arr[mid+1] |
| Rotated array | Identify sorted half | Check left/right sorted |
| Kth smallest | Two pointer merge | Count to k |
| "Min/Max valid X" | Answer range | isValid(mid) check |

---

# ❌ COMMON MISTAKES

| Mistake | Problem | Fix |
|---------|---------|-----|
| `mid = (low+high)/2` | Integer overflow | Use `low + (high-low)/2` |
| `while low < high` vs `<=` | Infinite loop or miss | Use <= for exact search, < for boundary |
| Wrong half identification in rotated | Incorrect search | Check `arr[low] <= arr[mid]` |
| Searching unsorted half | Miss target | Always search the sorted half |
| Off-by-one in answer search | Wrong answer | Test boundary: low and high |

---

# 📝 PRACTICE QUESTIONS (THURSDAY)

**Q1:** How do you search in a row-sorted, column-sorted matrix efficiently?
**A1:** Start at top-right corner. Move left if current > target, move down if current < target. O(M+N).

**Q2:** Why does binary search work on a rotated array?
**A2:** At any mid, one half is always sorted. Use that half to determine if target is there; otherwise search the other half.

**Q3:** What is "binary search on the answer"?
**A3:** When the answer lies in a range, binary search on the answer value itself. For each candidate answer, verify it in O(n).

**Q4:** Find peak element — why is O(log n) possible?
**A4:** If arr[mid] < arr[mid+1], right half must contain a peak (values increasing → must peak somewhere). Eliminate half each time.

**Q5:** What is the time complexity for finding kth smallest in two sorted arrays?
**A5:** O(k) with two-pointer, O(log(min(M,N))) with optimal binary search.

---

# ✅ THURSDAY CHECKLIST

- [x] Binary search on 2D row-column sorted matrix
- [x] Binary search on strictly sorted 2D matrix
- [x] Find peak element in O(log n)
- [x] Search in rotated sorted array
- [x] Find kth smallest in two sorted arrays
- [x] Understand "binary search on answer" pattern
- [x] Avoid common overflow mistake in mid calculation

---

**THURSDAY COMPLETE** ✅
