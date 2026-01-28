# 📚 WEEK 5 – WEDNESDAY
## MONOTONIC STACK | Next Greater Element + Sliding Window Maximum | 70+ Pages

---

# 🟢 MONOTONIC STACK CONCEPT

## What is Monotonic Stack?

A stack where elements are ordered (increasing or decreasing) while maintaining LIFO property.

```
Decreasing Monotonic Stack:
- New element comes
- Remove all smaller elements from top
- Add new element
- Stack remains decreasing (top to bottom)

Example: [5, 4, 2, 1] - decreasing order

Increasing Monotonic Stack:
- New element comes
- Remove all larger elements from top
- Add new element
- Stack remains increasing (top to bottom)
```

## Time Complexity Magic

```
Naive Approach: O(n²)
- For each element, look at all right elements

Monotonic Stack: O(n)
- Each element pushed once: O(1)
- Each element popped once: O(1)
- Total: O(n)

Optimization: 2x faster! 🚀
```

---

# 🔴 PROBLEM 1: NEXT GREATER ELEMENT

## Problem Statement

```
Input: [4, 5, 2, 25, 10]
Output: [5, 25, 25, -1, -1]

For each element, find first greater element to the right
- 4: next greater is 5 ✓
- 5: next greater is 25 ✓
- 2: next greater is 25 ✓
- 25: no greater element → -1
- 10: no greater element → -1
```

## Algorithm: Decreasing Monotonic Stack

**Intuition:**
```
Process right to left
Keep stack of elements in decreasing order

When new element arrives:
- Pop all smaller elements (they found their answer!)
- Top of stack (if exists) is the next greater
- Push current element
```

**Step by Step:**

```
Input: [4, 5, 2, 25, 10]
Process right to left: 10, 25, 2, 5, 4

Step 1: 10 → Stack: [10], Result[4] = -1
Step 2: 25 → Pop 10 (25 > 10), Stack: [25], Result[3] = -1
Step 3: 2 → Stack is [25], 25 > 2, Result[2] = 25, Stack: [25, 2]
Step 4: 5 → Pop 2 (5 > 2), Top 25 > 5, Result[1] = 25, Stack: [25, 5]
Step 5: 4 → Pop nothing, Top 5 > 4, Result[0] = 5, Stack: [25, 5, 4]

Result: [5, 25, 25, -1, -1] ✓
```

## Code Implementation

```cpp
#include <iostream>
#include <vector>
#include <stack>
using namespace std;

vector<int> nextGreaterElement(vector<int> arr) {
    int n = arr.size();
    vector<int> result(n, -1);
    stack<int> st;  // Stack stores indices
    
    // Process from right to left
    for (int i = n - 1; i >= 0; i--) {
        // Pop all elements <= current (they're not next greater)
        while (!st.empty() && arr[st.top()] <= arr[i]) {
            st.pop();
        }
        
        // If stack not empty, top is next greater
        if (!st.empty()) {
            result[i] = arr[st.top()];
        }
        
        // Push current index
        st.push(i);
    }
    
    return result;
}

int main() {
    vector<int> arr = {4, 5, 2, 25, 10};
    vector<int> result = nextGreaterElement(arr);
    
    cout << "Input: [4, 5, 2, 25, 10]" << endl;
    cout << "Output: [";
    for (int i = 0; i < result.size(); i++) {
        cout << result[i];
        if (i < result.size()-1) cout << ", ";
    }
    cout << "]" << endl;
    
    // Test case 2
    vector<int> arr2 = {1, 5, 0, 3, 4, 5};
    vector<int> result2 = nextGreaterElement(arr2);
    cout << "\nInput: [1, 5, 0, 3, 4, 5]" << endl;
    cout << "Output: [";
    for (int i = 0; i < result2.size(); i++) {
        cout << result2[i];
        if (i < result2.size()-1) cout << ", ";
    }
    cout << "]" << endl;
    
    return 0;
}
```

## Output

```
Input: [4, 5, 2, 25, 10]
Output: [5, 25, 25, -1, -1]

Input: [1, 5, 0, 3, 4, 5]
Output: [5, -1, 3, 4, 5, -1]
```

## Complexity

```
Time: O(n) - each element pushed/popped once
Space: O(n) - stack stores up to n elements
```

---

# 🔴 PROBLEM 2: SLIDING WINDOW MAXIMUM

## Problem Statement

```
Input: [1, 3, 1, 2, 0, 5], k=3
Output: [3, 3, 2, 5]

Find maximum in each sliding window:
Window 1: [1,3,1] → max=3
Window 2: [3,1,2] → max=3
Window 3: [1,2,0] → max=2
Window 4: [2,0,5] → max=5
```

## Why Deque?

```
Deque = Double Ended Queue
Can remove from both front and back

Naive: O(n*k) - for each window, find max
Optimized: O(n) - use deque to track maximums
```

## Algorithm: Decreasing Deque

**Maintain decreasing order of elements**

```
When new element arrives:
1. Remove indices outside window from front
2. Remove all smaller elements from back
3. Front element is current max
4. Add current index to back
```

## Code Implementation

```cpp
#include <iostream>
#include <vector>
#include <deque>
using namespace std;

vector<int> maxSlidingWindow(vector<int> arr, int k) {
    vector<int> result;
    deque<int> dq;  // Stores indices in decreasing order
    
    for (int i = 0; i < arr.size(); i++) {
        // Remove indices outside window
        while (!dq.empty() && dq.front() < i - k + 1) {
            dq.pop_front();
        }
        
        // Remove smaller elements from back
        while (!dq.empty() && arr[dq.back()] <= arr[i]) {
            dq.pop_back();
        }
        
        // Add current index
        dq.push_back(i);
        
        // Window complete, add max to result
        if (i >= k - 1) {
            result.push_back(arr[dq.front()]);
        }
    }
    
    return result;
}

int main() {
    vector<int> arr = {1, 3, 1, 2, 0, 5};
    vector<int> result = maxSlidingWindow(arr, 3);
    
    cout << "Input: [1, 3, 1, 2, 0, 5], k=3" << endl;
    cout << "Output: [";
    for (int i = 0; i < result.size(); i++) {
        cout << result[i];
        if (i < result.size()-1) cout << ", ";
    }
    cout << "]" << endl;
    
    // Test case 2
    vector<int> arr2 = {1};
    vector<int> result2 = maxSlidingWindow(arr2, 1);
    cout << "\nInput: [1], k=1" << endl;
    cout << "Output: [";
    for (int i = 0; i < result2.size(); i++) {
        cout << result2[i];
        if (i < result2.size()-1) cout << ", ";
    }
    cout << "]" << endl;
    
    return 0;
}
```

## Output

```
Input: [1, 3, 1, 2, 0, 5], k=3
Output: [3, 3, 2, 5]

Input: [1], k=1
Output: [1]
```

## Step-by-Step Trace

```
Input: [1, 3, 1, 2, 0, 5], k=3

i=0 (val=1): dq=[0]
i=1 (val=3): remove 0, dq=[1]
i=2 (val=1): dq=[1,2], window complete → max=3
i=3 (val=2): remove index 0, remove 2, dq=[1,3], window complete → max=3
i=4 (val=0): dq=[1,3,4], window complete → max=2
i=5 (val=5): remove 1,3,4, dq=[5], window complete → max=5

Result: [3, 3, 2, 5] ✓
```

## Complexity

```
Time: O(n) - each element processed once
Space: O(k) - deque holds at most k elements

vs Naive:
Time: O(n*k)
Space: O(1)

Optimization: n times faster!
```

---

# 📊 TEST CASES

## Next Greater Element Tests

```
Test 1: [4, 5, 2, 25, 10]
Expected: [5, 25, 25, -1, -1] ✓

Test 2: [1, 5, 0, 3, 4, 5]
Expected: [5, -1, 3, 4, 5, -1] ✓

Test 3: [5, 4, 3, 2, 1]
Expected: [-1, -1, -1, -1, -1] ✓

Test 4: [1, 2, 3, 4, 5]
Expected: [2, 3, 4, 5, -1] ✓
```

## Sliding Window Maximum Tests

```
Test 1: [1, 3, 1, 2, 0, 5], k=3
Expected: [3, 3, 2, 5] ✓

Test 2: [1], k=1
Expected: [1] ✓

Test 3: [1, -1], k=1
Expected: [1, -1] ✓

Test 4: [9, 11], k=2
Expected: [11] ✓
```

---

# 📝 PRACTICE QUESTIONS (WEDNESDAY)

**Q1:** What is monotonic stack?  
**A1:** A stack where elements maintain order (increasing/decreasing) while having LIFO property.

**Q2:** Why use stack for next greater element?  
**A2:** Monotonic property allows O(n) solution instead of O(n²).

**Q3:** Why use deque for sliding window?  
**A3:** Deque allows O(1) removal from both ends, perfect for window sliding.

**Q4:** What does dq.front() represent?  
**A4:** The index of maximum element in current window.

**Q5:** Why pop smaller elements?  
**A5:** Smaller elements can never be next greater for previous elements.

**Q6:** Complexity without deque?  
**A6:** O(n*k) - for each window, find max by iterating all k elements.

**Q7:** Can you use stack instead of deque?  
**A7:** No - stack only allows removal from top, not front. Need deque.

---

# ✅ WEDNESDAY CHECKLIST

- [x] Understand monotonic stack concept
- [x] Know when to use monotonic stack
- [x] Implement next greater element
- [x] Understand deque operations
- [x] Implement sliding window maximum
- [x] Analyze time complexity
- [x] Compare naive vs optimized
- [x] Test with multiple cases

---

**WEDNESDAY COMPLETE** ✅

