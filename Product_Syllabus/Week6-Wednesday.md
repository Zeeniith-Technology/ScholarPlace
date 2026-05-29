# 📚 WEEK 6 – WEDNESDAY
## HASHING & FREQUENCY PROBLEMS | HashMap, Two-Sum, Anagrams, Non-Repeating

---

# 🌟 COMPREHENSIVE BEGINNER'S GUIDE (45 MINUTES)

## Part 1: Why Hashing?

### The Problem with Arrays and Searching

```
Unsorted array search: O(n) — check every element
Sorted array search:   O(log n) — binary search

Can we do O(1)? YES — with Hashing!

Hashing: Map key → index using a hash function.
Store value at that index. Retrieve in O(1).
```

### What is a Hash Function?

```
hash(key) → index in array

Example with name:
hash("Alice") = sum of ASCII values % table_size
= (65+108+105+99+101) % 10 = 478 % 10 = 8
→ Store Alice's data at index 8

Next time we want Alice's data:
hash("Alice") = 8 → Look at index 8 → Found instantly!
```

### Hash Map in C++: `unordered_map`

```cpp
#include <unordered_map>
using namespace std;

unordered_map<string, int> freq;

freq["apple"] = 5;       // Insert
freq["banana"] = 3;      // Insert
freq["apple"]++;         // Update (now 6)

cout << freq["apple"];   // Access: O(1)
cout << freq.count("mango"); // Check existence: 0 if not found

// Iterate
for (auto& pair : freq) {
    cout << pair.first << ": " << pair.second << endl;
}
```

---

# 🔵 SECTION 1: FREQUENCY COUNTING

## Count Character Frequencies

```cpp
#include <iostream>
#include <unordered_map>
#include <string>
using namespace std;

void countFrequency(string s) {
    unordered_map<char, int> freq;

    // Count each character
    for (char c : s) {
        freq[c]++;
    }

    cout << "Character frequencies in \"" << s << "\":" << endl;
    for (auto& p : freq) {
        cout << "  '" << p.first << "' → " << p.second
             << " time" << (p.second > 1 ? "s" : "") << endl;
    }
}

int main() {
    countFrequency("banana");
    return 0;
}
```

**Output:**
```
Character frequencies in "banana":
  'b' → 1 time
  'a' → 3 times
  'n' → 2 times
```

## Alternative: Frequency Array (when keys are bounded)

```cpp
// If only lowercase letters: use array of size 26
void countCharsArray(string s) {
    int freq[26] = {0};  // index 0='a', 1='b', ..., 25='z'

    for (char c : s) freq[c - 'a']++;

    for (int i = 0; i < 26; i++) {
        if (freq[i] > 0)
            cout << (char)('a' + i) << ": " << freq[i] << endl;
    }
}
// Time: O(n), Space: O(1) — fixed 26 slots, not O(n)!
```

---

# 🔵 SECTION 2: TWO-SUM PROBLEM

## Problem Statement

```
Given array and target T, find two indices i,j (i≠j)
where arr[i] + arr[j] == T.

Example: arr=[2,7,11,15], T=9
Answer: [0,1] (arr[0]+arr[1] = 2+7 = 9)
```

## Naive Solution: O(n²)

```cpp
// Check all pairs
for (int i = 0; i < n; i++)
    for (int j = i+1; j < n; j++)
        if (arr[i] + arr[j] == target)
            return {i, j};
// O(n²) time — too slow for large arrays
```

## Optimal Solution: O(n) with HashMap

```cpp
#include <iostream>
#include <unordered_map>
#include <vector>
using namespace std;

vector<int> twoSum(vector<int>& arr, int target) {
    unordered_map<int, int> seen;  // value → index

    for (int i = 0; i < arr.size(); i++) {
        int complement = target - arr[i];  // What we need

        if (seen.count(complement)) {
            // Found! complement was seen before
            cout << "Found: arr[" << seen[complement] << "]="
                 << complement << " + arr[" << i << "]="
                 << arr[i] << " = " << target << endl;
            return {seen[complement], i};
        }

        seen[arr[i]] = i;  // Remember this value and its index
    }

    return {};  // Not found
}

int main() {
    vector<int> arr = {2, 7, 11, 15};
    int target = 9;

    cout << "Array: [2, 7, 11, 15], Target: " << target << endl;
    vector<int> result = twoSum(arr, target);

    if (!result.empty())
        cout << "Indices: [" << result[0] << ", " << result[1] << "]" << endl;

    // Test 2
    arr = {3, 2, 4};
    target = 6;
    cout << "\nArray: [3, 2, 4], Target: " << target << endl;
    twoSum(arr, target);

    return 0;
}
```

**Output:**
```
Array: [2, 7, 11, 15], Target: 9
Found: arr[0]=2 + arr[1]=7 = 9
Indices: [0, 1]

Array: [3, 2, 4], Target: 6
Found: arr[1]=2 + arr[2]=4 = 6
```

## Why HashMap Approach is O(n)?

```
Step-by-step for arr=[2,7,11,15], target=9:

i=0: arr[0]=2, need 9-2=7. seen={} → not found. Add {2:0}. seen={2:0}
i=1: arr[1]=7, need 9-7=2. seen={2:0} → FOUND 2 at index 0! → return [0,1]

Only 2 iterations! HashMap lookup is O(1) each time.
Total: O(n) ← vs O(n²) brute force
```

---

# 🔵 SECTION 3: FIRST NON-REPEATING CHARACTER

## Problem

```
Input: "aabcbc"
Output: First character that appears exactly once → 'a'... wait 'a' appears twice.
        First char with count=1 reading left to right.

"aabcbc" → a:2, b:2, c:2 → all repeat → return -1
"leetcode" → l:1, e:3, t:1, c:1, o:1, d:1 → first non-repeating = 'l'
```

## C++ Solution

```cpp
#include <iostream>
#include <unordered_map>
#include <string>
using namespace std;

char firstNonRepeating(string s) {
    unordered_map<char, int> freq;

    // Pass 1: Count all frequencies
    for (char c : s) freq[c]++;

    // Pass 2: Find first with count = 1
    for (char c : s) {
        if (freq[c] == 1) return c;
    }

    return '\0';  // All characters repeat
}

int main() {
    string tests[] = {"leetcode", "aabb", "aabcbc", "programming"};

    for (string& s : tests) {
        char result = firstNonRepeating(s);
        cout << "\"" << s << "\" → ";
        if (result) cout << "'" << result << "'" << endl;
        else cout << "None (all repeat)" << endl;
    }
    return 0;
}
```

**Output:**
```
"leetcode" → 'l'
"aabb" → None (all repeat)
"aabcbc" → None (all repeat)
"programming" → 'p'
```

---

# 🔵 SECTION 4: ANAGRAM CHECK

## What is an Anagram?

```
Two strings are anagrams if they have SAME characters with SAME frequencies.

"listen" ↔ "silent" → Yes (same 6 chars, rearranged)
"hello"  ↔ "world"  → No (different chars)
"race"   ↔ "care"   → Yes
```

## C++ Solution

```cpp
#include <iostream>
#include <unordered_map>
#include <string>
using namespace std;

bool isAnagram(string s1, string s2) {
    // Different lengths → can't be anagram
    if (s1.length() != s2.length()) return false;

    unordered_map<char, int> freq;

    // Add frequency for s1
    for (char c : s1) freq[c]++;

    // Subtract frequency for s2
    for (char c : s2) freq[c]--;

    // If all counts are 0 → anagram!
    for (auto& p : freq) {
        if (p.second != 0) return false;
    }

    return true;
}

int main() {
    cout << boolalpha;  // Print true/false instead of 1/0

    cout << "listen vs silent: " << isAnagram("listen", "silent") << endl;
    cout << "hello vs world:   " << isAnagram("hello", "world") << endl;
    cout << "race vs care:     " << isAnagram("race", "care") << endl;
    cout << "abc vs cba:       " << isAnagram("abc", "cba") << endl;

    return 0;
}
```

**Output:**
```
listen vs silent: true
hello vs world:   false
race vs care:     true
abc vs cba:       true
```

---

# 🔵 SECTION 5: GROUP ANAGRAMS

## Problem

```
Input: ["eat","tea","tan","ate","nat","bat"]
Group words that are anagrams of each other.

Output:
Group 1: eat, tea, ate
Group 2: tan, nat
Group 3: bat
```

## C++ Solution

```cpp
#include <iostream>
#include <unordered_map>
#include <vector>
#include <algorithm>
#include <string>
using namespace std;

void groupAnagrams(vector<string>& words) {
    unordered_map<string, vector<string>> groups;

    for (string& word : words) {
        string key = word;
        sort(key.begin(), key.end());  // Sort letters: "eat" → "aet"
        groups[key].push_back(word);   // Group by sorted form
    }

    int groupNum = 1;
    for (auto& p : groups) {
        cout << "Group " << groupNum++ << ": ";
        for (string& w : p.second) cout << w << " ";
        cout << "(key: " << p.first << ")" << endl;
    }
}

int main() {
    vector<string> words = {"eat","tea","tan","ate","nat","bat"};
    cout << "Input: eat, tea, tan, ate, nat, bat" << endl;
    cout << "Grouped anagrams:" << endl;
    groupAnagrams(words);
    return 0;
}
```

**Output:**
```
Input: eat, tea, tan, ate, nat, bat
Grouped anagrams:
Group 1: eat tea ate (key: aet)
Group 2: tan nat (key: ant)
Group 3: bat (key: abt)
```

---

# 📊 HASHING COMPLEXITY SUMMARY

| Operation | unordered_map | Frequency Array (size 26) |
|-----------|--------------|--------------------------|
| Insert | O(1) avg | O(1) |
| Lookup | O(1) avg | O(1) |
| Delete | O(1) avg | O(1) |
| Space | O(n) | O(1) fixed |
| Use when | Any key type | Small bounded keys (a-z) |

## Common HashMap Patterns

```cpp
// 1. Count frequency
for (char c : s) freq[c]++;

// 2. Check if exists
if (map.count(key)) { /* found */ }
if (map.find(key) != map.end()) { /* found */ }

// 3. Get with default
int val = map.count(key) ? map[key] : 0;

// 4. Iterate all entries
for (auto& [key, val] : map) { }

// 5. Two-sum pattern: need = target - current
if (seen.count(target - arr[i])) found!
```

---

# ❌ COMMON MISTAKES

| Mistake | Problem | Fix |
|---------|---------|-----|
| `map[key]` on non-existent key | Creates entry with 0 | Use `map.count(key)` first |
| Using `map` vs `unordered_map` | O(log n) vs O(1) | Use `unordered_map` for O(1) |
| Frequency array wrong index | Wrong count | Use `c - 'a'` for lowercase |
| Sorting for anagram check | Forgot to sort | Sort both → compare |
| Confuse first/second in pair | Wrong output | pair.first=key, pair.second=value |

---

# 📝 PRACTICE QUESTIONS (WEDNESDAY)

**Q1:** What is the time complexity of HashMap lookup?
**A1:** O(1) average case (O(n) worst case due to collisions, rare in practice).

**Q2:** How do you check if two strings are anagrams?
**A2:** Count character frequencies with HashMap; if all counts match → anagrams.

**Q3:** What's the key insight in solving Two-Sum optimally?
**A3:** For each element x, we need (target - x). Store seen elements in HashMap for O(1) lookup.

**Q4:** Why use frequency array [26] instead of unordered_map for lowercase strings?
**A4:** Space is O(1) fixed vs O(n), and faster due to no hashing overhead.

**Q5:** How do you group anagrams together?
**A5:** Sort each word alphabetically → use sorted word as HashMap key → all anagrams share same key.

---

# ✅ WEDNESDAY CHECKLIST

- [x] Understand HashMap: O(1) insert/lookup
- [x] Count character/element frequencies
- [x] Solve Two-Sum in O(n) using HashMap
- [x] Find first non-repeating character
- [x] Check if two strings are anagrams
- [x] Group anagrams using sorted key
- [x] Know when to use HashMap vs frequency array

---

**WEDNESDAY COMPLETE** ✅
