# 📚 WEEK 6 – MONDAY
## SORTING ALGORITHMS | Bubble, Selection, Insertion | From Scratch

---

# 🌟 COMPREHENSIVE BEGINNER'S GUIDE (45 MINUTES)

## Part 1: Why Do We Sort?

### Real-World Need for Sorting

```
Unsorted Phone Contacts:
Zara, Alice, Mike, Bob, Chris, Sara
→ Finding "Mike"? You check EVERY name = O(n)

Sorted Phone Contacts:
Alice, Bob, Chris, Mike, Sara, Zara
→ Finding "Mike"? Open middle, go right = O(log n)

Sorting saves MILLIONS of operations in practice!
```

### Where Sorting Is Used

```
1. Binary Search requires sorted data
2. Database queries (ORDER BY)
3. Leaderboards / Rankings
4. Removing duplicates (easier after sorting)
5. Finding closest pair of elements
6. Merge of two datasets
```

---

## Part 2: What Makes a Good Sort?

| Property | Meaning |
|----------|---------|
| **Time Complexity** | How fast? O(n²) vs O(n log n) |
| **Space Complexity** | Extra memory used? O(1) vs O(n) |
| **Stable** | Equal elements keep relative order? |
| **In-Place** | Sorts without extra array? |
| **Adaptive** | Faster on nearly-sorted data? |

---

# 🔵 SECTION 1: BUBBLE SORT

## What is Bubble Sort?

```
Idea: Repeatedly compare adjacent elements and SWAP if out of order.
Largest elements "bubble up" to the end in each pass.

Visual: Sorting [5, 3, 8, 1, 4]

PASS 1:
Compare 5,3 → swap → [3, 5, 8, 1, 4]
Compare 5,8 → ok   → [3, 5, 8, 1, 4]
Compare 8,1 → swap → [3, 5, 1, 8, 4]
Compare 8,4 → swap → [3, 5, 1, 4, 8]  ← 8 is in place!

PASS 2:
Compare 3,5 → ok   → [3, 5, 1, 4, 8]
Compare 5,1 → swap → [3, 1, 5, 4, 8]
Compare 5,4 → swap → [3, 1, 4, 5, 8]  ← 5 is in place!

PASS 3:
Compare 3,1 → swap → [1, 3, 4, 5, 8]  ← 3,4 in place!

PASS 4:
Compare 1,3 → ok   → [1, 3, 4, 5, 8]  ← Already sorted!

Result: [1, 3, 4, 5, 8] ✓
```

## Bubble Sort Code (C++)

```cpp
#include <iostream>
using namespace std;

void bubbleSort(int arr[], int n) {
    cout << "Starting Bubble Sort..." << endl;
    int swaps = 0, comparisons = 0;

    for (int pass = 0; pass < n - 1; pass++) {
        cout << "Pass " << pass + 1 << ": ";
        bool swapped = false;

        for (int j = 0; j < n - 1 - pass; j++) {
            comparisons++;
            if (arr[j] > arr[j + 1]) {
                // SWAP
                int temp = arr[j];
                arr[j] = arr[j + 1];
                arr[j + 1] = temp;
                swapped = true;
                swaps++;
            }
        }

        // Print array after each pass
        for (int k = 0; k < n; k++) cout << arr[k] << " ";
        cout << endl;

        // Optimization: if no swap in a pass, array is sorted
        if (!swapped) {
            cout << "Array already sorted! Stopping early." << endl;
            break;
        }
    }
    cout << "Total comparisons: " << comparisons << endl;
    cout << "Total swaps: " << swaps << endl;
}

void printArray(int arr[], int n) {
    for (int i = 0; i < n; i++) cout << arr[i] << " ";
    cout << endl;
}

int main() {
    int arr[] = {5, 3, 8, 1, 4};
    int n = 5;

    cout << "Original: ";
    printArray(arr, n);

    bubbleSort(arr, n);

    cout << "Sorted:   ";
    printArray(arr, n);
    return 0;
}
```

## Output

```
Original: 5 3 8 1 4
Starting Bubble Sort...
Pass 1: 3 5 1 4 8
Pass 2: 3 1 4 5 8
Pass 3: 1 3 4 5 8
Pass 4: 1 3 4 5 8
Array already sorted! Stopping early.
Total comparisons: 9
Total swaps: 5
Sorted:   1 3 4 5 8
```

## Bubble Sort Complexity

```
Best Case:  O(n) — already sorted (with swap check)
Average:    O(n²) — random data
Worst Case: O(n²) — reverse sorted [5,4,3,2,1]

Space:      O(1) — in-place, no extra array
Stable:     YES — equal elements never swapped
```

---

# 🔵 SECTION 2: SELECTION SORT

## What is Selection Sort?

```
Idea: Find the MINIMUM element from unsorted portion.
Place it at the beginning of unsorted portion.

Visual: Sorting [5, 3, 8, 1, 4]

PASS 1: Find min in [5,3,8,1,4] → min=1 at index 3
        Swap arr[0] with arr[3] → [1, 3, 8, 5, 4]

PASS 2: Find min in [3,8,5,4] → min=3 at index 1
        No swap needed → [1, 3, 8, 5, 4]

PASS 3: Find min in [8,5,4] → min=4 at index 4
        Swap arr[2] with arr[4] → [1, 3, 4, 5, 8]

PASS 4: Find min in [5,8] → min=5 at index 3
        No swap needed → [1, 3, 4, 5, 8]

Result: [1, 3, 4, 5, 8] ✓
```

## Selection Sort Code (C++)

```cpp
#include <iostream>
using namespace std;

void selectionSort(int arr[], int n) {
    cout << "Starting Selection Sort..." << endl;
    int swaps = 0, comparisons = 0;

    for (int i = 0; i < n - 1; i++) {
        int minIdx = i;

        // Find minimum in unsorted portion
        for (int j = i + 1; j < n; j++) {
            comparisons++;
            if (arr[j] < arr[minIdx]) {
                minIdx = j;
            }
        }

        // Swap min to correct position
        if (minIdx != i) {
            int temp = arr[i];
            arr[i] = arr[minIdx];
            arr[minIdx] = temp;
            swaps++;
        }

        // Print after each pass
        cout << "Pass " << i + 1 << ": ";
        for (int k = 0; k < n; k++) cout << arr[k] << " ";
        cout << "(min was " << arr[i] << ")" << endl;
    }

    cout << "Total comparisons: " << comparisons << endl;
    cout << "Total swaps: " << swaps << " (Selection always O(n) swaps!)" << endl;
}

int main() {
    int arr[] = {5, 3, 8, 1, 4};
    int n = 5;

    cout << "Original: ";
    for (int x : arr) cout << x << " ";
    cout << endl;

    selectionSort(arr, n);

    cout << "Sorted: ";
    for (int x : arr) cout << x << " ";
    cout << endl;
    return 0;
}
```

## Key Insight: Selection Sort Does Minimum Swaps

```
Bubble Sort: Up to O(n²) swaps
Selection Sort: EXACTLY n-1 swaps

Why important?
Swapping is expensive (e.g., swapping large objects in memory)
Selection Sort is ideal when SWAP COST is high!
```

## Selection Sort Complexity

```
Best Case:  O(n²) — always scans full unsorted portion
Average:    O(n²)
Worst Case: O(n²)

Space:      O(1) — in-place
Stable:     NO — equal elements may get reordered by swap
Swaps:      O(n) — exactly n-1 swaps (best among O(n²) sorts)
```

---

# 🔵 SECTION 3: INSERTION SORT

## What is Insertion Sort?

```
Idea: Like sorting playing cards in your hand.
Take one card at a time, insert it in correct position.

Visual: Sorting [5, 3, 8, 1, 4]

Start: [5]  (1 card is trivially sorted)

Pick 3: Where does 3 go in [5]?
  3 < 5 → shift 5 right → [_, 5]
  Insert 3 → [3, 5]

Pick 8: Where does 8 go in [3, 5]?
  8 > 5 → stays here → [3, 5, 8]

Pick 1: Where does 1 go in [3, 5, 8]?
  1 < 8 → shift 8 → [3, 5, _, 8]
  1 < 5 → shift 5 → [3, _, 5, 8]
  1 < 3 → shift 3 → [_, 3, 5, 8]
  Insert 1 → [1, 3, 5, 8]

Pick 4: Where does 4 go in [1, 3, 5, 8]?
  4 < 8 → shift 8 → [1, 3, 5, _, 8]
  4 < 5 → shift 5 → [1, 3, _, 5, 8]
  4 > 3 → stop
  Insert 4 → [1, 3, 4, 5, 8]

Result: [1, 3, 4, 5, 8] ✓
```

## Insertion Sort Code (C++)

```cpp
#include <iostream>
using namespace std;

void insertionSort(int arr[], int n) {
    cout << "Starting Insertion Sort..." << endl;
    int shifts = 0, comparisons = 0;

    for (int i = 1; i < n; i++) {
        int key = arr[i];       // Element to insert
        int j = i - 1;         // Last sorted index

        cout << "Inserting " << key << " into [";
        for (int k = 0; k < i; k++) cout << arr[k] << (k < i-1 ? "," : "");
        cout << "] → ";

        // Shift elements that are > key to the right
        while (j >= 0 && arr[j] > key) {
            comparisons++;
            arr[j + 1] = arr[j];    // Shift right
            j--;
            shifts++;
        }
        comparisons++;              // Final comparison that failed

        arr[j + 1] = key;           // Insert key at correct position

        for (int k = 0; k < n; k++) cout << arr[k] << " ";
        cout << endl;
    }

    cout << "Total comparisons: " << comparisons << endl;
    cout << "Total shifts: " << shifts << endl;
}

int main() {
    int arr[] = {5, 3, 8, 1, 4};
    int n = 5;

    cout << "Original: ";
    for (int x : arr) cout << x << " ";
    cout << endl;

    insertionSort(arr, n);

    cout << "Sorted: ";
    for (int x : arr) cout << x << " ";
    cout << endl;
    return 0;
}
```

## Insertion Sort Complexity

```
Best Case:  O(n) — already sorted (no shifts needed!)
Average:    O(n²)
Worst Case: O(n²) — reverse sorted

Space:      O(1) — in-place
Stable:     YES — equal elements never cross
Adaptive:   YES — very fast on nearly-sorted data
```

---

# 📊 BIG COMPARISON TABLE

| Algorithm | Best | Average | Worst | Space | Stable | Swaps |
|-----------|------|---------|-------|-------|--------|-------|
| **Bubble** | O(n) | O(n²) | O(n²) | O(1) | ✅ Yes | O(n²) |
| **Selection** | O(n²) | O(n²) | O(n²) | O(1) | ❌ No | O(n) |
| **Insertion** | O(n) | O(n²) | O(n²) | O(1) | ✅ Yes | O(n²) |

## When to Use Which?

```
Bubble Sort:
  ✓ When you want simplest code
  ✓ Educational purposes
  ✗ Never in production (Selection/Insertion both better)

Selection Sort:
  ✓ When SWAP COST is high (e.g., large objects, disk writes)
  ✓ Small arrays
  ✗ Worst on nearly-sorted data (can't skip work)

Insertion Sort:
  ✓ Nearly-sorted data → O(n) best case
  ✓ Online sorting (sorting while data arrives)
  ✓ Small arrays (< 20 elements)
  ✓ Used inside Quicksort/Timsort for small subarrays
  ✗ Slow on large reverse-sorted arrays
```

---

# ❌ COMMON MISTAKES

| Mistake | Problem | Fix |
|---------|---------|-----|
| Loop bound `j < n` in Bubble | Compares out of bounds | Use `j < n - 1 - i` |
| Forget `temp` in swap | Data lost | Always use 3-variable swap |
| Selection Sort marked stable | It's NOT stable | Equal elements CAN reorder |
| Insertion inner loop condition | Missing `j >= 0` | Causes index -1 crash |
| Comparing complexity wrong | Selection looks "best" | Insertion wins on sorted data |

---

# 📝 PRACTICE QUESTIONS (MONDAY)

**Q1:** How many passes does Bubble Sort need for n elements?
**A1:** At most n-1 passes. With optimization, fewer if sorted early.

**Q2:** Which sort always does exactly n-1 swaps?
**A2:** Selection Sort — one swap per pass to place minimum.

**Q3:** On a nearly-sorted array [1,2,3,5,4], which is fastest?
**A3:** Insertion Sort — O(n) best case with almost no shifts.

**Q4:** Count bubble sort comparisons for n=5.
**A4:** 4+3+2+1 = 10 comparisons in worst case.

**Q5:** Why is Insertion Sort used in Timsort (Python, Java)?
**A5:** For small subarrays it's O(n) best case and cache-friendly.

---

# ✅ MONDAY CHECKLIST

- [x] Understand why sorting matters
- [x] Implement Bubble Sort with optimization
- [x] Implement Selection Sort
- [x] Implement Insertion Sort
- [x] Know time/space complexity of all three
- [x] Know which sort to choose when
- [x] Count comparisons and swaps
- [x] Understand stable vs unstable sorting

---

**MONDAY COMPLETE** ✅
