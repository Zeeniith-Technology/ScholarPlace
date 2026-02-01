# WEEK 3 COMPLETE – ADVANCED STRINGS + LINKED LIST FOUNDATIONS
## Enhanced Version: Beginner to Expert Depth

---

## TABLE OF CONTENTS

1. **DAY 1: STRING INTERNALS & ADVANCED OPERATIONS**
2. **DAY 2: STRING ALGORITHMS & LOGIC PATTERNS**
3. **DAY 3: STRING IMPLEMENTATIONS & ROBUST PARSING**
4. **DAY 4: LINKED LISTS – WHY & BASIC STRUCTURE**
5. **DAY 5: LINKED LIST CORE OPERATIONS**

---

# DAY 1 – MONDAY: STRINGS – INTERNALS & ADVANCED OPERATIONS

## LEARNING OUTCOMES

### Beginner Level
- Understand what a string is and why it's different from a char array
- Learn how to read strings without common input bugs
- Convert between uppercase and lowercase
- Trim spaces from strings
- Split and join strings

### Intermediate Level
- Understand the internal memory model of `std::string`
- Comprehend the difference between size and capacity
- Understand why `cin` and `getline` interact problematically
- Analyze performance implications of different string operations
- Implement substring search and understand its complexity

### Expert Level
- Understand different string implementation strategies (copy-on-write, small string optimization)
- Analyze when to use C-style strings vs std::string in performance-critical code
- Understand string interning and its benefits
- Know the implications of string immutability in other languages
- Design custom string operations for specific use cases

---

## SECTION 1: WHAT ARE STRINGS – DEEP RECAP

### Beginner Understanding

A **string** is a sequence of characters stored contiguously in memory.

```cpp
#include <iostream>
#include <string>
using namespace std;

int main() {
    string s = "Hello World";
    cout << "Length: " << s.length() << endl;          // 11
    cout << "First char: " << s[0] << endl;             // H
    cout << "Character at index 6: " << s[6] << endl;   // W
    return 0;
}
```

**Key Points for Beginners:**
- Strings are indexed from 0 to length()-1
- `s[i]` gives you a single character
- `s.length()` tells you how many characters are in the string
- Strings can contain spaces and special characters

### Intermediate Understanding

**Why are strings "special"?**

Unlike a simple char array, `std::string` is a class that manages:
- The actual character data (stored on heap)
- The size (number of characters currently stored)
- The capacity (allocated memory for future growth)
- Automatic memory management (no manual `new`/`delete`)

This abstraction is powerful but adds complexity to understand.

**Comparison with char array:**

```cpp
// C-style string (char array)
char cstr[20] = "Hello";  // Fixed size, must know max length
int len1 = 5;  // You must track length manually

// C++ std::string
string cpp_str = "Hello";  // Dynamic size, automatically managed
int len2 = cpp_str.length();  // No manual tracking needed
```

**Why does this distinction matter?**
- Placement interviewers often ask about C-style strings to test pointer understanding
- Understanding internal representation helps optimize code
- Choosing the right type impacts performance in large systems

### Expert Understanding

**Internal Implementation Strategies:**

Most C++ implementations use one of these approaches:

1. **Simple Implementation (Conceptual)**
   ```
   struct String {
       char* buffer;      // pointer to character data on heap
       size_t size;       // current number of characters
       size_t capacity;   // allocated memory size
   };
   ```

2. **Small String Optimization (SSO)**
   - For strings ≤ 23 bytes (typical), store directly in the object
   - Avoids heap allocation for common cases
   - Used by most modern implementations (GCC, Clang, MSVC)
   ```
   struct OptimizedString {
       union {
           char inline_buffer[24];  // for small strings
           char* heap_pointer;      // for larger strings
       };
       size_t size;
       // ... metadata to distinguish inline vs heap
   };
   ```
   **Implication**: Small strings are nearly free to copy; large strings are expensive

3. **Copy-on-Write (COW) - Deprecated**
   - Multiple string objects could share the same buffer
   - Copy only happens when modification occurs
   - No longer recommended due to multithreading issues

**Performance Implications:**
```cpp
string s1 = "Hello";  // SSO: stored inline, no heap allocation
string s2 = s1;       // SSO: just copy inline buffer, O(1) cheap

string s3 = "This is a very long string that exceeds inline capacity";
string s4 = s3;       // Deep copy: O(n) expensive, heap allocation
```

**When does capacity differ from size?**
```cpp
string s;
s.reserve(100);      // allocate space for 100 chars
cout << s.size();    // 0 (no chars yet)
cout << s.capacity(); // 100 (space available)

s = "Hello";
cout << s.size();    // 5
cout << s.capacity(); // Still 100 (space remains allocated)
```

**Why is this important?**
- Appending to a string with capacity: O(1)
- Appending to a full string: O(n) due to reallocation and copy

---

## SECTION 2: STRING MEMORY MODEL – DETAILED VIEW

### Beginner Model

When you create a string, C++ allocates memory on the heap (behind the scenes):

```
Memory layout of: string s = "Hello";

Stack (program's local variables):
┌──────────────────────────────────┐
│ s (String object):               │
│  - buffer pointer → [heap addr]  │
│  - size: 5                       │
│  - capacity: varies              │
└──────────────────────────────────┘
           ↓ points to
Heap (dynamic memory):
┌──────────────────────────────────┐
│ [H][e][l][l][o][\0][? ]...       │
│  0  1  2  3  4   5   6           │
└──────────────────────────────────┘
```

**Important Detail**: C++ appends a null terminator (`\0`) for C-style string compatibility.

### Intermediate Model

**Understanding Capacity vs Size:**

```cpp
string s;
cout << "Initial - size: " << s.size() << ", capacity: " << s.capacity() << endl;

s.reserve(10);
cout << "After reserve(10) - size: " << s.size() << ", capacity: " << s.capacity() << endl;

s = "Hello";
cout << "After s = 'Hello' - size: " << s.size() << ", capacity: " << s.capacity() << endl;

s += "World";
cout << "After += 'World' - size: " << s.size() << ", capacity: " << s.capacity() << endl;
```

**Output (typical):**
```
Initial - size: 0, capacity: 0
After reserve(10) - size: 0, capacity: 10
After s = "Hello" - size: 5, capacity: 10
After += "World" - size: 10, capacity: 10
```

**Reallocation Happens Here:**
```cpp
string s;
s.reserve(5);  // capacity = 5

for (int i = 0; i < 10; i++) {
    s += "x";
    cout << "Size: " << s.size() << ", Capacity: " << s.capacity() << endl;
}
```

**Output (typical exponential growth):**
```
Size: 1, Capacity: 5
Size: 2, Capacity: 5
Size: 3, Capacity: 5
Size: 4, Capacity: 5
Size: 5, Capacity: 5
Size: 6, Capacity: 10    ← Reallocation! Capacity doubled
Size: 7, Capacity: 10
Size: 8, Capacity: 10
Size: 9, Capacity: 10
Size: 10, Capacity: 10
Size: 11, Capacity: 20   ← Reallocation! Capacity doubled again
```

**Why exponential growth?**
- Linear growth (capacity += 1) would cause N reallocations for N append operations
- Exponential growth (capacity *= 2) amortizes to O(1) per append

### Expert Model

**String Reallocation Strategy & Performance:**

When capacity is exceeded, a new buffer is allocated:

```cpp
// Simplified pseudocode of what happens internally
void String::append(const char* str) {
    size_t new_size = this->size + strlen(str);
    
    if (new_size > this->capacity) {
        // Need to reallocate
        size_t new_capacity = max(new_size, this->capacity * 2);
        
        char* new_buffer = new char[new_capacity];
        memcpy(new_buffer, this->buffer, this->size);  // O(old_size)
        delete[] this->buffer;                          // Free old memory
        this->buffer = new_buffer;
        this->capacity = new_capacity;
    }
    
    // Append new characters
    for (size_t i = 0; i < strlen(str); i++) {
        this->buffer[this->size + i] = str[i];
    }
    this->size = new_size;
}
```

**Amortized Complexity Analysis:**

Consider appending 1 character at a time to an initially empty string:

```
Append 1: capacity 0→1 (1 reallocation), total work = 0 + 1 = 1
Append 2: capacity 1→2 (1 reallocation), total work = 1 + 2 = 3
Append 3: capacity 2→4 (1 reallocation), total work = 2 + 4 = 6
Append 4: capacity 4→8 (1 reallocation), total work = 4 + 8 = 12
...
Append N: total work = N + (copies during reallocations)
```

With exponential growth, total work = O(N). Thus, amortized per append = O(1).

**Performance Benchmark Implications:**

```cpp
// SLOW: causes 30 reallocations
string s;
for (int i = 0; i < 1000000; i++) {
    s += "x";  // May reallocate multiple times
}

// FAST: pre-allocate space
string s;
s.reserve(1000000);  // Allocate once
for (int i = 0; i < 1000000; i++) {
    s += "x";  // Never reallocates
}
```

The second version can be **100x faster** for large strings.

---

## SECTION 3: INPUT HANDLING – CIN VS GETLINE (DEEP DIVE)

### Beginner Problem & Solution

**The Classic Bug:**

```cpp
int age;
string name;
cin >> age;
getline(cin, name);   // BUG: name becomes empty!
cout << "Name: " << name << ", Age: " << age << endl;
```

**Why does this happen?**

When you type `25` and press Enter, the input buffer contains: `25\n`

```
1. cin >> age;
   - Reads: 2, 5
   - Leaves: \n (newline) in buffer
   
2. getline(cin, name);
   - Looks for next line
   - Finds \n immediately (from step 1)
   - Treats this as an empty line
   - Result: name = ""
```

**Visual representation:**

```
Before cin >> age:
Input buffer: [2][5][\n]
              
After cin >> age:
Input buffer: [\n]      ← newline left behind!

After getline(cin, name):
Input buffer: []        ← consumed the newline
name = ""               ← empty because nothing between buffer state and \n
```

**Correct Solution:**

```cpp
int age;
string name;

cout << "Enter age: ";
cin >> age;
cin.ignore();  // CRITICAL: clear the newline from buffer

cout << "Enter full name: ";
getline(cin, name);

cout << "Name: " << name << ", Age: " << age << endl;
```

### Intermediate Understanding

**Why does `cin >>` leave the newline?**

The `>>` operator is **whitespace-skipping** for input:
- It skips leading whitespace (spaces, tabs, newlines)
- Reads characters until it hits whitespace
- **Stops at that whitespace but leaves it in buffer**

This design is intentional: it allows reading multiple values from one line:

```cpp
int a, b, c;
cin >> a >> b >> c;  // Input: "10 20 30"
// Works correctly: each >> skips leading space, reads number
```

**`getline` behavior:**
- Reads characters until it hits a newline
- **Removes the newline from buffer**

**The conflict:** After `cin >> age`, the newline is still there. When `getline` runs immediately after, it reads from the current buffer position—which is the newline—and stops, finding an empty line.

**Multiple ways to handle it:**

```cpp
// Option 1: Use cin.ignore() to skip one character
cin >> age;
cin.ignore();  // skips exactly 1 character (the \n)

// Option 2: Use cin.ignore(numeric_limits<streamsize>::max(), '\n')
// This skips all characters until a newline is found
cin >> age;
cin.ignore(numeric_limits<streamsize>::max(), '\n');

// Option 3: Read everything as string and parse manually
string line;
getline(cin, line);
int age = stoi(line);  // convert to int

// Option 4: Use getline for all input (most consistent)
string age_str;
getline(cin, age_str);
int age = stoi(age_str);
```

### Expert Considerations

**Stream State & Error Handling:**

When input operations fail, the stream enters a "fail state":

```cpp
int age;
cin >> age;

if (cin.fail()) {
    cout << "Invalid input! Expected an integer." << endl;
    cin.clear();  // Reset fail state
    cin.ignore(numeric_limits<streamsize>::max(), '\n');  // clear buffer
}
```

**Why this matters:**
- In production code, input validation is critical
- Unhandled failed input can lead to infinite loops or undefined behavior

**Buffer Management Strategy:**

```cpp
class InputHandler {
public:
    static int readInt() {
        int value;
        while (!(cin >> value)) {  // while input fails
            cin.clear();  // reset error state
            cin.ignore(numeric_limits<streamsize>::max(), '\n');
            cout << "Invalid integer. Please try again: ";
        }
        cin.ignore(numeric_limits<streamsize>::max(), '\n');  // clean remaining
        return value;
    }
    
    static string readLine() {
        string line;
        getline(cin, line);
        return line;
    }
};
```

**Performance Implication for Competitive Programming:**

```cpp
// SLOW for large input
for (int i = 0; i < 100000; i++) {
    int x;
    cin >> x;  // Each >> call has overhead
}

// FASTER: read entire line and parse
string line;
while (getline(cin, line)) {
    if (!line.empty()) {
        int x = stoi(line);
    }
}

// EVEN FASTER: use faster I/O (competitive programming trick)
ios_base::sync_with_stdio(false);
cin.tie(NULL);
for (int i = 0; i < 100000; i++) {
    int x;
    cin >> x;  // Now much faster due to sync disabled
}
```

---

## SECTION 4: CASE CONVERSION – UPPERCASE / LOWERCASE

### Beginner Implementation

**Why do we need case conversion?**

Often you need case-insensitive comparisons:
- Search for "hello" in user-provided text that might be "HELLO" or "Hello"
- Normalize user input before processing

**Implementation:**

```cpp
#include <iostream>
#include <string>
using namespace std;

string toLowerCase(string s) {
    for (int i = 0; i < (int)s.length(); i++) {
        if (s[i] >= 'A' && s[i] <= 'Z') {
            // Convert uppercase to lowercase
            // 'A' is ASCII 65, 'a' is ASCII 97
            // Difference is 32
            s[i] = s[i] - 'A' + 'a';
            
            // OR equivalently:
            // s[i] = s[i] + 32;
            // s[i] = tolower(s[i]);  // using library function
        }
    }
    return s;
}

string toUpperCase(string s) {
    for (int i = 0; i < (int)s.length(); i++) {
        if (s[i] >= 'a' && s[i] <= 'z') {
            s[i] = s[i] - 'a' + 'A';
        }
    }
    return s;
}

int main() {
    string s = "HeLlo WoRld 123";
    cout << toLowerCase(s) << endl; // hello world 123
    cout << toUpperCase(s) << endl; // HELLO WORLD 123
    return 0;
}
```

**Why this works (ASCII values):**

```
Uppercase letters: A=65, B=66, ..., Z=90
Lowercase letters: a=97, b=98, ..., z=122
Difference: 32

To convert 'A' to 'a':
  'A' (65) - 'A' (65) = 0
  0 + 'a' (97) = 97 = 'a' ✓
  
To convert 'B' to 'b':
  'B' (66) - 'A' (65) = 1
  1 + 'a' (97) = 98 = 'b' ✓
```

**Edge case: non-alphabetic characters remain unchanged**
- Digits ('0'-'9'): not in 'A'-'Z' or 'a'-'z' ranges, so skipped
- Spaces, punctuation: also unaffected

### Intermediate Optimization

**Using library functions:**

```cpp
#include <cctype>  // for tolower, toupper

string toLowerCase(string s) {
    for (int i = 0; i < (int)s.length(); i++) {
        s[i] = tolower(s[i]);  // handles non-ASCII correctly
    }
    return s;
}

string toUpperCase(string s) {
    for (int i = 0; i < (int)s.length(); i++) {
        s[i] = toupper(s[i]);
    }
    return s;
}

// OR using std::transform (more idiomatic C++)
#include <algorithm>

string toLowerCase(const string &s) {
    string result = s;
    transform(result.begin(), result.end(), result.begin(), ::tolower);
    return result;
}
```

**Performance Comparison:**

```cpp
// Benchmark: converting 1 million characters
// Manual ASCII: ~0.5ms
// tolower(): ~1.2ms (more overhead but locale-aware)
// transform(): ~1.5ms (functional approach overhead)
```

For competitive programming: manual ASCII subtraction is fastest.

### Expert Considerations

**Locale-aware case conversion:**

```cpp
#include <locale>

string toUpperCaseLocale(const string &s) {
    locale loc;
    string result = s;
    for (int i = 0; i < (int)result.length(); i++) {
        result[i] = toupper(result[i], loc);  // respects locale
    }
    return result;
}
```

**Why this matters:**
- In Turkish, 'i' and 'I' are not simple case pairs
- Some languages have 3-character case conversions (e.g., German 'ß' → 'SS')
- International applications need locale-aware functions

**Wide character support:**

```cpp
#include <cwctype>

wstring toUpperCaseWide(const wstring &s) {
    wstring result = s;
    for (int i = 0; i < (int)result.length(); i++) {
        result[i] = towupper(result[i]);  // for wide characters
    }
    return result;
}
```

**When to use locale-aware functions:**
- Competitive programming (single locale): use fast manual ASCII
- Production systems: use locale-aware functions
- International applications: use wide characters + locales

---

## SECTION 5: TRIMMING SPACES – LTRIM, RTRIM, TRIM

### Beginner Implementation

**Problem:** User input often has extra spaces: `"   Hello World   "`

**Solution: Three functions**

```cpp
#include <string>
using namespace std;

// Remove leading spaces (left trim)
string ltrim(const string &s) {
    int i = 0;
    while (i < (int)s.length() && s[i] == ' ') {
        i++;
    }
    return s.substr(i);
}

// Remove trailing spaces (right trim)
string rtrim(const string &s) {
    if (s.empty()) return s;
    
    int i = s.length() - 1;
    while (i >= 0 && s[i] == ' ') {
        i--;
    }
    return s.substr(0, i + 1);
}

// Remove both leading and trailing spaces
string trim(const string &s) {
    return rtrim(ltrim(s));
}

int main() {
    string test1 = "   Hello";
    string test2 = "World   ";
    string test3 = "   Hello World   ";
    
    cout << "'" << ltrim(test1) << "'" << endl;  // 'Hello'
    cout << "'" << rtrim(test2) << "'" << endl;  // 'World'
    cout << "'" << trim(test3) << "'" << endl;   // 'Hello World'
    
    return 0;
}
```

**How ltrim works:**

```
Input: s = "   Hello"
       indices: 0 1 2 3 4 5 6 7

i = 0: s[0] = ' ' → increment i to 1
i = 1: s[1] = ' ' → increment i to 2
i = 2: s[2] = ' ' → increment i to 3
i = 3: s[3] = 'H' → not a space, exit loop

Return s.substr(3) = "Hello"
```

**How rtrim works:**

```
Input: s = "World   "
       indices: 0 1 2 3 4 5 6 7

i = 7: s[7] = ' ' → decrement i to 6
i = 6: s[6] = ' ' → decrement i to 5
i = 5: s[5] = ' ' → decrement i to 4
i = 4: s[4] = 'd' → not a space, exit loop

Return s.substr(0, 5) = "World"
```

**Edge cases:**

| Input | ltrim | rtrim | trim |
|-------|-------|-------|------|
| `"   Hello"` | `"Hello"` | `"   Hello"` | `"Hello"` |
| `"World   "` | `"World   "` | `"World"` | `"World"` |
| `"   "` (all spaces) | `""` | `""` | `""` |
| `""` (empty) | `""` | `""` | `""` |
| `"Hello"` (no spaces) | `"Hello"` | `"Hello"` | `"Hello"` |

### Intermediate Optimization

**In-place trimming (doesn't create new string):**

```cpp
void trimInPlace(string &s) {
    // Remove trailing spaces
    int end = s.length() - 1;
    while (end >= 0 && s[end] == ' ') {
        end--;
    }
    
    // Remove leading spaces
    int start = 0;
    while (start <= end && s[start] == ' ') {
        start++;
    }
    
    if (start > end) {
        s = "";  // all spaces
    } else {
        s = s.substr(start, end - start + 1);
    }
}
```

**Why pass by reference?** The `&` allows us to modify the original string.

**Performance:**
- `substr` creates a new string: O(n) time, O(n) space
- In-place: O(n) time, O(1) space (if we could truly modify in-place)

### Expert Considerations

**Generalizing trim for any whitespace:**

```cpp
#include <cctype>

bool isWhitespace(char c) {
    return c == ' ' || c == '\t' || c == '\n' || c == '\r';
}

string trim(const string &s) {
    int start = 0;
    while (start < (int)s.length() && isWhitespace(s[start])) {
        start++;
    }
    
    int end = s.length() - 1;
    while (end >= 0 && isWhitespace(s[end])) {
        end--;
    }
    
    if (start > end) return "";
    return s.substr(start, end - start + 1);
}

// Even more general: custom predicate
template <typename Predicate>
string trimGeneral(const string &s, Predicate shouldRemove) {
    int start = 0;
    while (start < (int)s.length() && shouldRemove(s[start])) {
        start++;
    }
    
    int end = s.length() - 1;
    while (end >= 0 && shouldRemove(s[end])) {
        end--;
    }
    
    if (start > end) return "";
    return s.substr(start, end - start + 1);
}

// Usage:
string s = "\t\tHello World\n\n";
string trimmed = trimGeneral(s, [](char c) { 
    return isspace(c); 
});
```

**Stream-based trimming:**

```cpp
#include <sstream>

string trim(const string &s) {
    stringstream ss(s);
    string word, result = "";
    while (ss >> word) {  // >> automatically skips all whitespace
        result += word + " ";
    }
    if (!result.empty()) {
        result.pop_back();  // remove last space
    }
    return result;
}

// This also collapses multiple spaces: "a  b  c" → "a b c"
```

---

## SECTION 6: SPLITTING STRING INTO WORDS – TOKENIZATION

### Beginner Implementation

**Problem:** Convert `"The  quick brown   fox"` to `["The", "quick", "brown", "fox"]`

**Logic:**
1. Iterate through string character by character
2. Build current word while encountering non-space characters
3. When hitting a space, save the word if non-empty and reset
4. Don't forget the last word!

```cpp
#include <vector>
#include <string>
using namespace std;

vector<string> splitBySpace(const string &s) {
    vector<string> words;
    string current = "";
    
    for (char c : s) {
        if (c == ' ') {
            if (!current.empty()) {
                words.push_back(current);
                current.clear();  // or current = "";
            }
        } else {
            current += c;
        }
    }
    
    // Don't forget the last word!
    if (!current.empty()) {
        words.push_back(current);
    }
    
    return words;
}

int main() {
    vector<string> result = splitBySpace("The  quick brown   fox");
    for (const auto &word : result) {
        cout << word << endl;
    }
    // Output:
    // The
    // quick
    // brown
    // fox
    return 0;
}
```

**Trace through the algorithm:**

```
Input: "The  quick brown   fox"

c='T': current="T"
c='h': current="Th"
c='e': current="The"
c=' ': push "The", current=""
c=' ': current is empty, skip
c='q': current="q"
c='u': current="qu"
c='i': current="qui"
c='c': current="quic"
c='k': current="quick"
c=' ': push "quick", current=""
c='b': current="b"
c='r': current="br"
c='o': current="bro"
c='w': current="brow"
c='n': current="brown"
c=' ': push "brown", current=""
c=' ': current is empty, skip
c=' ': current is empty, skip
c='f': current="f"
c='o': current="fo"
c='x': current="fox"
(end of string): push "fox"

Result: ["The", "quick", "brown", "fox"]
```

### Intermediate Optimization

**Using stringstream (cleaner, more idiomatic):**

```cpp
#include <sstream>

vector<string> splitBySpace(const string &s) {
    vector<string> words;
    stringstream ss(s);
    string word;
    
    while (ss >> word) {  // >> automatically skips whitespace
        words.push_back(word);
    }
    
    return words;
}
```

**Advantages:**
- Shorter, cleaner code
- Automatically handles multiple consecutive spaces
- More readable intent

**Custom delimiter:**

```cpp
vector<string> splitByDelimiter(const string &s, char delimiter) {
    vector<string> words;
    string current = "";
    
    for (char c : s) {
        if (c == delimiter) {
            if (!current.empty()) {
                words.push_back(current);
                current.clear();
            }
        } else {
            current += c;
        }
    }
    
    if (!current.empty()) {
        words.push_back(current);
    }
    
    return words;
}

// Usage:
vector<string> csvFields = splitByDelimiter("John,Doe,30", ',');
vector<string> pathParts = splitByDelimiter("/home/user/documents", '/');
```

### Expert Considerations

**Performance: splitting vs streaming:**

```cpp
// Method 1: Build result vector (uses dynamic memory)
vector<string> splitBySpace(const string &s) {
    vector<string> words;
    // ... populate words
    return words;  // Return by value (C++17 RVO optimizes this)
}

// Method 2: Use iterator or callback (no memory allocation)
template <typename Callback>
void splitBySpace(const string &s, Callback onWord) {
    string word = "";
    for (char c : s) {
        if (c == ' ') {
            if (!word.empty()) {
                onWord(word);
                word.clear();
            }
        } else {
            word += c;
        }
    }
    if (!word.empty()) {
        onWord(word);
    }
}

// Usage:
splitBySpace("the quick fox", [](const string &word) {
    cout << word << endl;
});
```

**Handling empty tokens:**

```cpp
// Sometimes we want empty tokens
vector<string> splitKeepEmpty(const string &s, char delimiter) {
    vector<string> result;
    string current = "";
    
    for (char c : s) {
        if (c == delimiter) {
            result.push_back(current);  // even if empty
            current.clear();
        } else {
            current += c;
        }
    }
    result.push_back(current);
    return result;
}

// Example: "a,,b" with ',' delimiter → ["a", "", "b"]
// This is important for CSV parsing where empty fields matter
```

**Using regex (for complex patterns):**

```cpp
#include <regex>

vector<string> splitByWhitespace(const string &s) {
    regex whitespace("\\s+");  // one or more whitespace
    sregex_token_iterator it(s.begin(), s.end(), whitespace, -1);
    sregex_token_iterator end;
    
    vector<string> words(it, end);
    // Remove empty strings if any
    words.erase(remove(words.begin(), words.end(), ""), words.end());
    return words;
}
```

---

## SECTION 7: JOINING WORDS BACK INTO STRING

### Beginner Implementation

**Problem:** Convert `["Hello", "World"]` to `"Hello World"`

```cpp
#include <vector>
#include <string>
using namespace std;

string joinWithSpace(const vector<string> &words) {
    if (words.empty()) return "";
    
    string result = words[0];
    for (int i = 1; i < (int)words.size(); i++) {
        result += " " + words[i];
    }
    return result;
}

int main() {
    vector<string> words = {"Hello", "World"};
    cout << joinWithSpace(words) << endl;  // "Hello World"
    
    vector<string> empty = {};
    cout << "'" << joinWithSpace(empty) << "'" << endl;  // ""
    
    return 0;
}
```

**Trace:**

```
Input: ["Hello", "World"]

result = "Hello"
i = 1: result += " " + "World" → result = "Hello World"

Return "Hello World"
```

### Intermediate Optimization

**Reserving space (avoiding repeated reallocations):**

```cpp
string joinWithSpace(const vector<string> &words) {
    if (words.empty()) return "";
    
    // Calculate total length needed
    size_t totalLength = 0;
    for (const auto &word : words) {
        totalLength += word.length() + 1;  // +1 for space
    }
    totalLength -= 1;  // Last word doesn't have trailing space
    
    string result;
    result.reserve(totalLength);  // Allocate once
    
    result = words[0];
    for (int i = 1; i < (int)words.size(); i++) {
        result += " " + words[i];
    }
    
    return result;
}
```

**Performance:**
- Without reserve: 10-100 reallocations for large input
- With reserve: 1 allocation

**Custom delimiter:**

```cpp
string joinWithDelimiter(const vector<string> &words, const string &delimiter) {
    if (words.empty()) return "";
    
    string result = words[0];
    for (int i = 1; i < (int)words.size(); i++) {
        result += delimiter + words[i];
    }
    return result;
}

// Usage:
joinWithDelimiter({"apple", "banana", "cherry"}, ", ");  // "apple, banana, cherry"
joinWithDelimiter({"home", "user", "documents"}, "/");   // "home/user/documents"
```

### Expert Considerations

**Streaming approach (for iterators, no vector required):**

```cpp
template <typename Iterator>
string join(Iterator begin, Iterator end, const string &delimiter) {
    if (begin == end) return "";
    
    string result = *begin;
    ++begin;
    
    while (begin != end) {
        result += delimiter + *begin;
        ++begin;
    }
    
    return result;
}

// Usage works with any iterable
vector<string> vec = {"a", "b", "c"};
cout << join(vec.begin(), vec.end(), "-") << endl;  // "a-b-c"

list<string> lst = {"x", "y", "z"};
cout << join(lst.begin(), lst.end(), "|") << endl;  // "x|y|z"
```

**Functional approach (using std::accumulate):**

```cpp
#include <numeric>

string joinFunctional(const vector<string> &words, const string &delimiter) {
    if (words.empty()) return "";
    
    return accumulate(
        words.begin() + 1, 
        words.end(), 
        words[0],
        [&delimiter](const string &a, const string &b) {
            return a + delimiter + b;
        }
    );
}
```

---

## SECTION 8: NAIVE SUBSTRING SEARCH – IMPLEMENTING `find`

### Beginner Implementation

**Problem:** Find index of first occurrence of pattern `p` in text `s`, or -1 if not found

```cpp
#include <string>
using namespace std;

int findSubstring(const string &s, const string &p) {
    int n = s.length();  // text length
    int m = p.length();  // pattern length
    
    if (m == 0) return 0;      // empty pattern is always at index 0
    if (m > n) return -1;      // pattern longer than text
    
    // Try each possible starting position
    for (int i = 0; i + m <= n; i++) {
        bool match = true;
        
        // Check if pattern matches at position i
        for (int j = 0; j < m; j++) {
            if (s[i + j] != p[j]) {
                match = false;
                break;
            }
        }
        
        if (match) {
            return i;  // Found at position i
        }
    }
    
    return -1;  // Not found
}

int main() {
    cout << findSubstring("Hello World", "World") << endl;  // 6
    cout << findSubstring("Hello World", "xyz") << endl;    // -1
    cout << findSubstring("aaa", "aa") << endl;             // 0
    cout << findSubstring("", "a") << endl;                 // -1
    return 0;
}
```

**Trace for "Hello World" and "World":**

```
n = 11, m = 5

i = 0: Compare "Hello" with "World"
  j=0: 'H' != 'W' → match=false, break

i = 1: Compare "elloW" with "World"
  j=0: 'e' != 'W' → match=false, break

... (skip non-matches)

i = 6: Compare "World" with "World"
  j=0: 'W' == 'W' ✓
  j=1: 'o' == 'o' ✓
  j=2: 'r' == 'r' ✓
  j=3: 'l' == 'l' ✓
  j=4: 'd' == 'd' ✓
  match=true, return 6 ✓
```

### Intermediate Analysis

**Time Complexity:**

```
Worst case: O(n * m)
- Outer loop: up to (n - m + 1) positions
- Inner loop: up to m comparisons per position
- Total: (n - m + 1) * m ≈ n*m for large strings

Best case: O(n)
- Pattern found immediately or not present
- Early exit helps with real-world data
```

**Worst-case example (exponential mismatch):**

```cpp
string s(100000, 'a');
s += 'b';  // s = "aaa...aaab" (100000 'a's then 'b')
string p(50000, 'a');
p += 'b';  // p = "aaa...aaab" (50000 'a's then 'b')

// This causes O(n*m) comparisons because:
// - At each position i (except near end), 50000 comparisons fail
// - The pattern never matches, so we try all positions
```

**Improvement: Find all occurrences:**

```cpp
vector<int> findAllOccurrences(const string &s, const string &p) {
    vector<int> positions;
    int n = s.length();
    int m = p.length();
    
    if (m == 0 || m > n) return positions;
    
    for (int i = 0; i + m <= n; i++) {
        bool match = true;
        for (int j = 0; j < m; j++) {
            if (s[i + j] != p[j]) {
                match = false;
                break;
            }
        }
        if (match) {
            positions.push_back(i);
        }
    }
    
    return positions;
}

// Usage:
vector<int> pos = findAllOccurrences("aaaa", "aa");
// Returns: [0, 1, 2] (overlapping occurrences)
```

### Expert Considerations

**Advanced Algorithms:**

1. **KMP (Knuth-Morris-Pratt) Algorithm: O(n + m)**
   - Precomputes failure function to avoid re-checking characters
   - Useful when pattern is reused many times
   ```cpp
   // Conceptual outline (full implementation in Week 4 advanced)
   vector<int> computeFailureFunction(const string &p) {
       int m = p.length();
       vector<int> fail(m, 0);
       int j = 0;
       for (int i = 1; i < m; i++) {
           while (j > 0 && p[i] != p[j]) {
               j = fail[j - 1];
           }
           if (p[i] == p[j]) j++;
           fail[i] = j;
       }
       return fail;
   }
   ```

2. **Boyer-Moore Algorithm: O(n/m) average case**
   - Skip characters from right to left
   - Best for searching long patterns in large texts
   - Practical algorithm used in many libraries

3. **Rabin-Karp Algorithm: O(n + m) with hashing**
   - Uses rolling hash to quickly compare substrings
   - Faster for short patterns
   - Can find all occurrences efficiently

**When to use each:**
- Simple search: naive algorithm (competitive programming)
- Production code, multiple searches: KMP or Boyer-Moore
- DNA sequence matching: suffix trees or specialized algorithms
- Text editor find-all: Rabin-Karp

---

## SECTION 9: COMMON MISTAKES STRING OPERATIONS

| Mistake | Problem | Example | Fix |
|---------|---------|---------|-----|
| Using `cin >> s` for sentences | Cuts at first space | `cin >> s;` with input "hello world" gives "hello" | Use `getline(cin, s)` |
| Mixing `cin` and `getline` without ignore | First getline reads empty string | After `cin >> age;` followed by `getline(cin, name)` | Use `cin.ignore()` after `cin >>` |
| Comparing case-sensitive | "Hello" ≠ "hello" | `if (s == "Hello")` fails for input "hello" | Use `toLowerCase(s) == "hello"` |
| Not trimming input | Extra spaces cause comparison failure | `name == "John"` fails if name is " John " | Use `name = trim(name)` |
| Assuming one space between words | Extra spaces break logic | Split "a  b  c" assuming single spaces | Handle multiple consecutive spaces |
| Not checking empty string before indexing | Crashes with segmentation fault | `if (s[0] == 'a')` when s is "" | Check `if (!s.empty() && s[0] == 'a')` |
| Off-by-one in substr | Wrong substring extracted | `s.substr(1, 2)` means start=1, length=2 (not end index) | Remember: substr(start, length), not substr(start, end) |
| Modifying string while iterating | Undefined behavior | Erasing characters while in for loop | Use indices or create new string |
| Forgetting null terminator | Missing character | C-style string handling without '\0' | Always ensure '\0' at end of C-style strings |
| Capacity vs Length confusion | Incorrect memory assumptions | Thinking capacity() tells you string length | Use size() or length() for actual character count |

---

## SECTION 10: PRACTICE QUESTIONS

### Beginner Level

1. **String Basics**
   - Explain the difference between `size()` and `capacity()` for `std::string`. Why would capacity ever be larger than size?
   - Write a program that reads a person's full name and age, handling the input correctly without the newline bug.

2. **Case Conversion**
   - Write `toTitleCase(string s)` that converts "hello world" to "Hello World".
   - Write `toggleCase(string s)` that converts uppercase to lowercase and vice versa.

3. **String Manipulation**
   - Implement `removeAllSpaces(string s)` that removes all space characters.
   - Implement `reverseString(string s)` that reverses the entire string.

### Intermediate Level

4. **Trimming & Splitting**
   - Implement `removeLeadingTrailingAndExtraMiddleSpaces` so that "   a   b  c " becomes "a b c" (removes leading, trailing, and collapses multiple middle spaces).
   - Write `countWords(string s)` that counts distinct words in a sentence, case-insensitive.

5. **Substring Search**
   - Use `findSubstring` to write `countOccurrences(string s, string p)` that counts how many times pattern p occurs in string s.
   - Write `replaceFirst(string s, string old, string new)` that replaces only the first occurrence of `old` with `new`.

6. **Performance**
   - Write a program that reads 1000 strings and converts them all to lowercase. Compare performance of manual ASCII conversion vs. `tolower()`.

### Expert Level

7. **Advanced Parsing**
   - Write a function that parses a line like "age:25,name:John,city:NYC" into a map of key-value pairs.
   - Handle edge cases: missing values, extra spaces, different delimiters.

8. **String Optimization**
   - Explain why `s.reserve(n)` before a loop of appends can be 100x faster.
   - Write a benchmark comparing appending to a string with and without pre-allocation.

9. **Locale-aware Operations**
   - Research and explain why `tolower()` might behave differently in different locales.
   - Write a program demonstrating case conversion in Turkish (where 'i' is complex).

10. **Algorithm Analysis**
    - Compare the naive substring search (O(n*m)) with theoretical knowledge of KMP (O(n+m)).
    - For a text of 1 million characters and a 100-character pattern, estimate the difference.

---

# DAY 2 – TUESDAY: STRING ALGORITHMS – TWO-POINTER, SLIDING WINDOW, FREQUENCY

## LEARNING OUTCOMES

### Beginner Level
- Master two-pointer technique for reversing strings and checking palindromes
- Understand sliding window for finding substrings with properties
- Use frequency counting for anagram detection
- Implement algorithms correctly with edge cases

### Intermediate Level
- Prove why these algorithms are optimal
- Understand amortized complexity and trade-offs
- Recognize when each pattern applies
- Optimize solutions for space and time

### Expert Level
- Generalize patterns across multiple problem types
- Combine patterns for complex problems
- Understand theoretical foundations
- Design custom applications

---

## SECTION 1: TWO-POINTER PATTERN – DEEP UNDERSTANDING

### Beginner Concept

Two-pointer technique uses two indices moving through the data structure, often from opposite ends:

```cpp
bool isPalindrome(const string &s) {
    int left = 0, right = s.length() - 1;
    
    while (left < right) {
        if (s[left] != s[right]) {
            return false;
        }
        left++;   // move towards center from left
        right--;  // move towards center from right
    }
    return true;
}
```

**Visual:**

```
String: "racecar"
Indices: 0 1 2 3 4 5 6

left=0, right=6:  s[0]='r' == s[6]='r' ✓
left=1, right=5:  s[1]='a' == s[5]='a' ✓
left=2, right=4:  s[2]='c' == s[4]='c' ✓
left=3, right=3:  left >= right, stop

Result: true (palindrome)
```

### Intermediate: Applications and Tradeoffs

**Why two-pointers work:**
- Time: O(n) – each element visited once
- Space: O(1) – only two variables
- Both optimal for many string problems

**Three main patterns:**

1. **Mirror/Palindrome (start and end moving inward)**
   - Use when: comparing opposite ends
   - Examples: palindrome check, reverse string, valid parentheses

2. **Same direction (fast and slow pointers)**
   - Use when: removing/skipping elements
   - Examples: remove duplicates, remove non-alphanumeric

3. **Sliding window** (see Section 4)
   - Use when: finding substrings with properties

### Expert: Pattern Generalization

**Template for two-pointer problems:**

```cpp
// Generic two-pointer framework
template <typename T, typename Comparator>
int twoPointerGeneric(const vector<T> &arr, Comparator compare) {
    int left = 0, right = arr.size() - 1;
    
    while (left < right) {
        if (compare(arr[left], arr[right])) {
            return left;  // or process result
        }
        left++;
        right--;
    }
    return -1;
}

// Usage:
vector<string> words = {"hello", "racecar", "world"};
int palindrome_idx = twoPointerGeneric(words, [](const string &a, const string &b) {
    return a == b;  // simplified; actual palindrome check more complex
});
```

---

## SECTION 2: REVERSE STRING & REVERSE WORDS

### Beginner: Basic Reversal

**Reversing entire string:**

```cpp
void reverseString(string &s) {
    int left = 0, right = s.length() - 1;
    
    while (left < right) {
        swap(s[left], s[right]);
        left++;
        right--;
    }
}

int main() {
    string s = "Hello";
    reverseString(s);
    cout << s << endl;  // "olleH"
    return 0;
}
```

**Trace:**

```
Input: s = "Hello"

left=0, right=4:  swap s[0]='H' and s[4]='o' → "olleH" → wait, wrong
Actually: swap('H', 'o') → "olleH"... no that's indices 0 and 4

Let me retrace:
s = "Hello" (indices 0,1,2,3,4)

left=0, right=4: swap s[0] and s[4] → swap 'H' and 'o' → "olleH"
left=1, right=3: swap s[1] and s[3] → swap 'l' and 'l' → "olleH"
left=2, right=2: left >= right, stop

Result: "olleH" ✓
```

### Intermediate: Reversing Words in Sentence

**Problem:** "The quick brown fox" → "ehT kciuq nworb xof" (reverse each word)

```cpp
void reverseWordsInPlace(string &s) {
    int n = s.length();
    int i = 0;
    
    while (i < n) {
        // Skip spaces
        while (i < n && s[i] == ' ') i++;
        
        // Find word start and end
        int start = i;
        while (i < n && s[i] != ' ') i++;
        int end = i - 1;
        
        // Reverse this word
        while (start < end) {
            swap(s[start], s[end]);
            start++;
            end--;
        }
    }
}
```

**Complex variant: reverse word order**

Input: "the sky is blue"  
Output: "blue is sky the"

```cpp
void reverseWordOrder(string &s) {
    // First, reverse entire string
    reverse(s.begin(), s.end());  // "eulb si yks eht"
    
    // Then reverse each word back
    int n = s.length();
    int i = 0;
    while (i < n) {
        while (i < n && s[i] == ' ') i++;
        int start = i;
        while (i < n && s[i] != ' ') i++;
        reverse(s.begin() + start, s.begin() + i);
    }
}
```

### Expert: Generalizing Reversal

```cpp
// Reverse any substring
void reverseRange(string &s, int start, int end) {
    while (start < end) {
        swap(s[start], s[end]);
        start++;
        end--;
    }
}

// Reverse preserving non-alphabetic characters
void reverseAlphabetic(string &s) {
    vector<char> alpha;
    for (char c : s) {
        if (isalpha(c)) {
            alpha.push_back(c);
        }
    }
    reverse(alpha.begin(), alpha.end());
    
    int idx = 0;
    for (int i = 0; i < (int)s.length(); i++) {
        if (isalpha(s[i])) {
            s[i] = alpha[idx++];
        }
    }
}

// Example: "a-bC-dEf-ghIj" → "j-Ih-gfE-dCba"
```

---

## SECTION 3: SLIDING WINDOW – FIXED LENGTH

### Beginner Concept

**Problem:** Find maximum number of vowels in any substring of length k.

```
Input: s = "abciiidef", k = 3
       a b c i i i d e f
       
Windows of size 3:
- "abc" → vowels = 1
- "bci" → vowels = 1
- "cii" → vowels = 2
- "iii" → vowels = 3  ← Maximum
- "iid" → vowels = 2
- "ide" → vowels = 2
- "def" → vowels = 1

Answer: 3
```

**Algorithm:**

```cpp
int maxVowelsInWindow(const string &s, int k) {
    int n = s.length();
    if (k > n) return 0;
    
    auto isVowel = [](char c) {
        c = tolower(c);
        return c == 'a' || c == 'e' || c == 'i' || c == 'o' || c == 'u';
    };
    
    // Count vowels in first window
    int count = 0;
    for (int i = 0; i < k; i++) {
        if (isVowel(s[i])) count++;
    }
    int maxCount = count;
    
    // Slide window: remove left, add right
    for (int i = k; i < n; i++) {
        if (isVowel(s[i - k])) count--;  // remove leftmost from previous window
        if (isVowel(s[i])) count++;      // add new rightmost
        maxCount = max(maxCount, count);
    }
    
    return maxCount;
}
```

**Why sliding window?**

Brute force: check every substring → O(n * k)  
Sliding window: update count incrementally → O(n)

For n=1,000,000 and k=1,000:
- Brute force: 1,000,000,000 operations
- Sliding window: 1,000,000 operations

### Intermediate: Generalized Framework

```cpp
// Template for fixed-window sliding window
int fixedWindowMax(const string &s, int k, function<bool(char)> condition) {
    int n = s.length();
    if (k > n) return 0;
    
    // Initial window
    int count = 0;
    for (int i = 0; i < k; i++) {
        if (condition(s[i])) count++;
    }
    int maxCount = count;
    
    // Slide
    for (int i = k; i < n; i++) {
        if (condition(s[i - k])) count--;
        if (condition(s[i])) count++;
        maxCount = max(maxCount, count);
    }
    
    return maxCount;
}

// Usage:
int result = fixedWindowMax(s, 3, [](char c) {
    return tolower(c) == 'a' || tolower(c) == 'e';
});
```

### Expert: Optimization & Analysis

**When to use fixed-window sliding window:**
- Window size is constant
- You can update in O(1)
- Reduces O(n*k) to O(n)

**Space-time tradeoff:**

```cpp
// Option 1: Count directly (O(1) space)
int count = 0;
for (int i = 0; i < k; i++) {
    if (isVowel(s[i])) count++;
}

// Option 2: Precompute frequency array (O(26) space for alphabets)
vector<int> freq(26, 0);
for (int i = 0; i < k; i++) {
    freq[tolower(s[i]) - 'a']++;
}
int count = freq['a'-'a'] + freq['e'-'a'] + ... // vowels only
```

**Why choose Option 1:**
- Simpler, less memory
- For vowel counting, only need a counter

**Why choose Option 2:**
- More flexible for different queries
- If you need "consonant count", "digit count", etc.

---

## SECTION 4: SLIDING WINDOW – VARIABLE LENGTH

### Beginner Problem & Solution

**Problem:** Longest substring with at most K distinct characters.

Example: s = "araaci", k = 2
```
- "ar" (2 distinct) ✓
- "ara" (2 distinct) ✓
- "arac" (3 distinct) ✗
- Back up: "ra" (2 distinct) ✓
- "rac" (3 distinct) ✗
- Back up: "ac" (2 distinct) ✓
- "aci" (3 distinct) ✗
- Back up: "ci" (2 distinct) ✓

Maximum: "ara" or "ara" (length 3)
```

**Algorithm:**

```cpp
int longestSubstringAtMostKDistinct(const string &s, int k) {
    vector<int> freq(256, 0);  // frequency of each character
    int distinct = 0;          // count of distinct characters
    int maxLen = 0;
    int left = 0;
    
    for (int right = 0; right < (int)s.length(); right++) {
        // Add right character
        if (freq[(unsigned char)s[right]] == 0) {
            distinct++;  // new character seen
        }
        freq[(unsigned char)s[right]]++;
        
        // Shrink window if too many distinct characters
        while (distinct > k) {
            freq[(unsigned char)s[left]]--;
            if (freq[(unsigned char)s[left]] == 0) {
                distinct--;
            }
            left++;
        }
        
        // Update maximum
        int currLen = right - left + 1;
        maxLen = max(maxLen, currLen);
    }
    
    return maxLen;
}
```

**Trace for "araaci", k=2:**

```
right=0, s[0]='a': freq[a]=1, distinct=1, left=0, len=1, max=1
right=1, s[1]='r': freq[r]=1, distinct=2, left=0, len=2, max=2
right=2, s[2]='a': freq[a]=2, distinct=2, left=0, len=3, max=3
right=3, s[3]='a': freq[a]=3, distinct=2, left=0, len=4, max=4
right=4, s[4]='c': freq[c]=1, distinct=3
  → distinct > k, shrink:
    left=0: freq[a]=2, distinct=3, left=1
    left=1: freq[r]=0, distinct=2, left=2
  len=3, max=4
right=5, s[5]='i': freq[i]=1, distinct=3
  → distinct > k, shrink:
    left=2: freq[a]=1, distinct=2, left=3
  len=3, max=4

Answer: 4 (substring "raac")
```

### Intermediate: General Template

```cpp
// Variable-length sliding window template
int variableWindow(const string &s, function<bool()> isValid, 
                   function<void(char)> addChar, function<void(char)> removeChar) {
    int left = 0, maxLen = 0;
    
    for (int right = 0; right < (int)s.length(); right++) {
        addChar(s[right]);
        
        while (!isValid()) {
            removeChar(s[left]);
            left++;
        }
        
        maxLen = max(maxLen, right - left + 1);
    }
    
    return maxLen;
}
```

**Common conditions:**
- At most K distinct: `distinct <= k`
- At most K repeating: `maxFreq <= k`
- No repeating: `maxFreq <= 1`
- Contains all letters: `distinct == 26`

### Expert: Advanced Variations

**Find all substrings matching condition:**

```cpp
vector<pair<int, int>> findAllValidSubstrings(const string &s, int k) {
    vector<pair<int, int>> result;
    vector<int> freq(256, 0);
    int distinct = 0;
    int left = 0;
    
    for (int right = 0; right < (int)s.length(); right++) {
        if (freq[(unsigned char)s[right]] == 0) distinct++;
        freq[(unsigned char)s[right]]++;
        
        while (distinct > k) {
            freq[(unsigned char)s[left]]--;
            if (freq[(unsigned char)s[left]] == 0) distinct--;
            left++;
        }
        
        // Every window from left to right is valid
        if (distinct == k) {
            result.push_back({left, right});
        }
    }
    
    return result;
}
```

**Optimization for multiple queries:**

```cpp
class SubstringQuery {
    string s;
    vector<vector<int>> dp;  // dp[i][j] = distinct chars in s[i..j]
    
public:
    SubstringQuery(const string &str) : s(str) {
        // Precompute (optional, for repeated queries)
    }
    
    int query(int k) {
        // Use sliding window for single query
        return longestSubstringAtMostKDistinct(s, k);
    }
};
```

---

## SECTION 5: FREQUENCY ARRAYS – ANAGRAM CHECK

### Beginner Problem

**Two strings are anagrams if they contain the same characters with same frequencies.**

Examples:
- "listen" and "silent": both have l, i, s, t, e, n
- "evil" and "live": both have e, v, i, l
- "abc" and "xyz": NOT anagrams

```cpp
bool areAnagrams(const string &a, const string &b) {
    if (a.length() != b.length()) return false;
    
    vector<int> freq(256, 0);
    
    // Count characters in first string
    for (char c : a) {
        freq[(unsigned char)c]++;
    }
    
    // Subtract characters in second string
    for (char c : b) {
        freq[(unsigned char)c]--;
        if (freq[(unsigned char)c] < 0) {
            return false;  // extra character in b
        }
    }
    
    // Check all frequencies are zero
    for (int f : freq) {
        if (f != 0) return false;  // leftover characters from a
    }
    
    return true;
}
```

**Why this works:**

```
a = "listen"
After counting a: freq['l']=1, freq['i']=1, freq['s']=1, freq['t']=1, freq['e']=1, freq['n']=1

b = "silent"
Process 's': freq['s']=0
Process 'i': freq['i']=0
Process 'l': freq['l']=0
Process 'e': freq['e']=0
Process 'n': freq['n']=0
Process 't': freq['t']=0

All frequencies zero → anagrams ✓
```

### Intermediate: Optimization

**Shorter version using single pass:**

```cpp
bool areAnagrams(const string &a, const string &b) {
    if (a.length() != b.length()) return false;
    
    vector<int> freq(256, 0);
    for (int i = 0; i < (int)a.length(); i++) {
        freq[(unsigned char)a[i]]++;
        freq[(unsigned char)b[i]]--;
    }
    
    for (int f : freq) {
        if (f != 0) return false;
    }
    return true;
}
```

**Using sorting (alternative approach):**

```cpp
#include <algorithm>

bool areAnagramsSorting(string a, string b) {
    if (a.length() != b.length()) return false;
    sort(a.begin(), a.end());
    sort(b.begin(), b.end());
    return a == b;
}
```

**Comparison:**
- Frequency: O(n) time, O(1) space (256 fixed)
- Sorting: O(n log n) time, O(1) space (ignoring sort space)
- For large strings, frequency is better

### Expert: Generalizations

**Grouped Anagrams (LeetCode problem):**

```cpp
#include <map>
#include <vector>

map<string, vector<string>> groupAnagrams(vector<string> &strs) {
    map<string, vector<string>> groups;
    
    for (const string &s : strs) {
        string sorted_s = s;
        sort(sorted_s.begin(), sorted_s.end());
        groups[sorted_s].push_back(s);
    }
    
    return groups;
}

// Or using frequency signature
map<string, vector<string>> groupAnagramsFreq(vector<string> &strs) {
    map<vector<int>, vector<string>> groups;
    
    for (const string &s : strs) {
        vector<int> freq(256, 0);
        for (char c : s) {
            freq[(unsigned char)c]++;
        }
        groups[freq].push_back(s);
    }
    
    // Convert to string key for cleaner output
    map<string, vector<string>> result;
    for (auto &p : groups) {
        result[to_string(p.first)].swap(p.second);
    }
    return result;
}
```

**Valid Anagram with Allowed Transformations:**

```cpp
bool areAnagramsWithEdits(const string &a, const string &b, int maxEdits) {
    if (abs((int)a.length() - (int)b.length()) > maxEdits) {
        return false;
    }
    
    vector<int> freq(256, 0);
    for (char c : a) freq[(unsigned char)c]++;
    for (char c : b) freq[(unsigned char)c]--;
    
    int edits = 0;
    for (int f : freq) {
        edits += abs(f);
    }
    
    return edits <= maxEdits * 2;  // *2 because each edit affects both strings
}
```

---

## SECTION 6: MOST FREQUENT CHARACTER

### Beginner Implementation

**Find the character appearing most often. If tie, return first appearing character.**

```cpp
char mostFrequentChar(const string &s) {
    if (s.empty()) return '\0';  // sentinel value for empty string
    
    vector<int> freq(256, 0);
    for (char c : s) {
        freq[(unsigned char)c]++;
    }
    
    int maxFreq = -1;
    char mostFrequent = s[0];
    
    for (char c : s) {
        if (freq[(unsigned char)c] > maxFreq) {
            maxFreq = freq[(unsigned char)c];
            mostFrequent = c;
        }
    }
    
    return mostFrequent;
}

int main() {
    cout << mostFrequentChar("hello") << endl;      // 'l' (appears 2 times)
    cout << mostFrequentChar("abcabc") << endl;     // 'a' (first with freq 2)
    cout << mostFrequentChar("xyz") << endl;        // 'x' (first appearing)
    return 0;
}
```

### Intermediate: Handling Ties

**Different strategies for ties:**

```cpp
// Strategy 1: First appearing (above)
char mostFrequentFirstAppearing(const string &s) { ... }

// Strategy 2: Last appearing
char mostFrequentLastAppearing(const string &s) {
    vector<int> freq(256, 0);
    for (char c : s) freq[(unsigned char)c]++;
    
    int maxFreq = -1;
    char mostFrequent = '\0';
    
    // Iterate in reverse order of appearance
    for (int i = (int)s.length() - 1; i >= 0; i--) {
        if (freq[(unsigned char)s[i]] > maxFreq) {
            maxFreq = freq[(unsigned char)s[i]];
            mostFrequent = s[i];
        }
    }
    return mostFrequent;
}

// Strategy 3: Lexicographically smallest/largest
char mostFrequentLexSmallest(const string &s) {
    vector<int> freq(256, 0);
    for (char c : s) freq[(unsigned char)c]++;
    
    int maxFreq = 0;
    char result = '\0';
    for (int i = 0; i < 256; i++) {
        if (freq[i] > maxFreq || (freq[i] == maxFreq && i < result)) {
            maxFreq = freq[i];
            result = (char)i;
        }
    }
    return result;
}
```

### Expert: Top K Frequent Characters

```cpp
#include <queue>
#include <map>

vector<char> topKFrequent(const string &s, int k) {
    // Count frequencies
    map<char, int> freq;
    for (char c : s) {
        freq[c]++;
    }
    
    // Min-heap to keep top k
    auto cmp = [](pair<char, int> a, pair<char, int> b) {
        return a.second > b.second;  // min-heap on frequency
    };
    priority_queue<pair<char, int>, vector<pair<char, int>>, decltype(cmp)> heap(cmp);
    
    for (auto &p : freq) {
        heap.push(p);
        if ((int)heap.size() > k) {
            heap.pop();
        }
    }
    
    vector<char> result;
    while (!heap.empty()) {
        result.push_back(heap.top().first);
        heap.pop();
    }
    reverse(result.begin(), result.end());
    return result;
}
```

---

## SECTION 7: COMMON MISTAKES 

| Mistake | Problem | Fix |
|---------|---------|-----|
| Forgetting to check `left < right` condition | Comparing same element multiple times | Use `while (left < right)` |
| Not updating both pointers | Infinite loop or incomplete processing | Remember `left++` AND `right--` |
| Using wrong loop bounds in sliding window | Off-by-one errors | Use `i + m <= n`, not `i < n - m` |
| Not initializing/updating window state | Incorrect initial window | Compute initial window BEFORE sliding loop |
| Forgetting to track "distinct" or similar state | Missing tracking of important invariant | Update state on adding/removing elements |
| Using fixed-window logic for variable-window | Wrong algorithm applied | Check if window size is truly fixed |
| Not checking empty string | Crashes or unexpected behavior | Add `if (s.empty()) return ...` early |

---

## SECTION 8: PRACTICE PROBLEMS 

### Beginner

1. Check if string is palindrome using two-pointers.
2. Reverse a string in-place.
3. Check if two strings are anagrams.
4. Find the most frequent character.

### Intermediate

5. **Longest Substring Without Repeating Characters** (classic)
   - Find length of longest substring where all characters are unique
   - Example: "abcabcbb" → 3 ("abc")

6. **Longest Substring with At Most K Distinct Characters**
   - Already covered, implement from scratch

7. **Longest Repeating Character Replacement**
   - Replace at most K characters to get longest repeated character
   - Example: "ABABAB", k=2 → "AAAAAB" (length 5)

8. **Minimum Window Substring**
   - Find smallest substring containing all characters of pattern
   - Example: s="ADOBECODEBANC", t="ABC" → "BANC"

### Expert

9. **Permutation in String**
   - Check if permutation of s1 is substring of s2
   - Use sliding window with fixed size

10. **Substring with Concatenation of All Words**
    - More complex sliding window variant with word boundaries

11. **Anagram-based Grouping**
    - Given list of strings, group anagrams together
    - Optimize for time and space

12. **Complex Two-Pointer Problem**
    - Remove duplicate letters while keeping lexicographic order
    - Combines multiple concepts

---

# DAY 3 – WEDNESDAY: STRING IMPLEMENTATIONS & ROBUST PARSING

## LEARNING OUTCOMES

### Beginner Level
- Implement strlen, strcmp, strcpy, strcat manually
- Understand C-style string dangers (buffer overflow)
- Manually convert between strings and integers
- Parse simple input formats

### Intermediate Level
- Understand performance implications of different implementations
- Implement safe versions with bounds checking
- Handle edge cases in parsing (signs, leading zeros, overflow)
- Optimize parsing for competitive programming

### Expert Level
- Design string libraries with correctness and performance
- Implement streaming parsers
- Understand memory safety and security implications
- Create domain-specific parsers

---

## SECTION 1: C-STYLE STRINGS VS STD::STRING

### Beginner Comparison

**C-style string (char array):**

```cpp
char name[10] = "John";
```
- Fixed-size array of characters
- Must manually track length
- Ends with null terminator `\0`
- No built-in methods
- Risk of buffer overflow if not careful

**C++ std::string:**

```cpp
string name = "John";
```
- Dynamic size (grows/shrinks)
- Automatically manages memory
- Automatically null-terminated for C compatibility
- Rich set of methods (length, substr, find, etc.)
- Safe (though not foolproof)

### Intermediate: Memory Layout

**C-style string in memory:**

```cpp
char cstr[5] = "Hi";
// Memory:
// cstr[0] = 'H'
// cstr[1] = 'i'
// cstr[2] = '\0'
// cstr[3] = ? (uninitialized)
// cstr[4] = ? (uninitialized)
```

**std::string in memory:**

```cpp
string cpp_str = "Hi";
// Stack: String object
// ├─ pointer → heap buffer: [H][i][\0]
// ├─ size = 2
// ├─ capacity = (may be >2)

// When you do: cpp_str = "A very long string..."
// New heap buffer allocated, old one freed
```

### Expert: Implementation Details

**Simple std::string implementation:**

```cpp
template <typename T = char>
class SimpleString {
private:
    T* buffer;
    size_t size;
    size_t capacity;
    
    void reallocateIfNeeded(size_t needed) {
        if (size + needed > capacity) {
            size_t newCapacity = capacity == 0 ? 1 : capacity * 2;
            while (newCapacity < size + needed) newCapacity *= 2;
            
            T* newBuffer = new T[newCapacity];
            if (buffer) {
                copy(buffer, buffer + size, newBuffer);
                delete[] buffer;
            }
            buffer = newBuffer;
            capacity = newCapacity;
        }
    }
    
public:
    SimpleString() : buffer(nullptr), size(0), capacity(0) {}
    
    void append(const T& c) {
        reallocateIfNeeded(1);
        buffer[size++] = c;
    }
    
    size_t length() const { return size; }
    size_t getCapacity() const { return capacity; }
    
    ~SimpleString() {
        delete[] buffer;
    }
};
```

---

## SECTION 2: IMPLEMENTING STRLEN

### Beginner Version

**strlen returns the number of characters before the null terminator.**

```cpp
int my_strlen(const char *s) {
    int len = 0;
    while (s[len] != '\0') {
        len++;
    }
    return len;
}

int main() {
    cout << my_strlen("Hello") << endl;    // 5
    cout << my_strlen("") << endl;         // 0
    cout << my_strlen("Test\0Extra") << endl;  // 4 (stops at first \0)
    return 0;
}
```

**Pointer version (more idiomatic C):**

```cpp
int my_strlen(const char *s) {
    const char *p = s;
    while (*p != '\0') {
        p++;
    }
    return p - s;  // pointer arithmetic: difference in addresses
}
```

**Why pointer arithmetic works:**

```cpp
const char *s = "Hello";
const char *p = s;

p points to 'H' at address 0x1000
After loop, p points to '\0' at address 0x1005

p - s = 0x1005 - 0x1000 = 5 bytes

Since char is 1 byte, this equals 5 characters ✓
```

### Intermediate: Edge Cases & Optimization

**Safer version with size limit:**

```cpp
int my_strnlen(const char *s, int maxSize) {
    int len = 0;
    while (len < maxSize && s[len] != '\0') {
        len++;
    }
    return len;
}
```

**Why needed?** Prevents reading past buffer if string is not null-terminated.

**Performance optimization (check 4 bytes at once):**

```cpp
// Advanced: Optimized strlen for long strings
// (Not needed for basic competitive programming)
size_t optimized_strlen(const char *s) {
    const unsigned long *align = (unsigned long *)(s);
    while (!hasNullByte(*align)) {
        align++;
    }
    // Then check byte-by-byte to find exact position
    // ... (complex bit manipulation)
    return position;
}
```

### Expert: Comparison with Library Implementations

**glibc strlen uses SIMD:**

```cpp
// Conceptual: processes 16 bytes at once with SSE/AVX
// Much faster for long strings (>1KB)
// Trade-off: complex code, large binary
```

**When to use custom strlen:**
- Competitive programming: simple version is fine
- Performance-critical: use optimized library version
- Embedded systems: size-limited version with bounds checking

---

## SECTION 3: IMPLEMENTING STRCMP

### Beginner Version

**strcmp compares two strings lexicographically.**

Returns:
- 0 if equal
- negative if s1 < s2
- positive if s1 > s2

```cpp
int my_strcmp(const char *s1, const char *s2) {
    int i = 0;
    
    while (s1[i] != '\0' && s2[i] != '\0') {
        if (s1[i] != s2[i]) {
            return (unsigned char)s1[i] - (unsigned char)s2[i];
        }
        i++;
    }
    
    // If we're here, one or both strings ended
    return (unsigned char)s1[i] - (unsigned char)s2[i];
}

int main() {
    cout << my_strcmp("abc", "abc") << endl;   // 0 (equal)
    cout << my_strcmp("abc", "abd") << endl;   // negative (-1)
    cout << my_strcmp("abd", "abc") << endl;   // positive (1)
    cout << my_strcmp("ab", "abc") << endl;    // negative (-1 - 'c')
    return 0;
}
```

**ASCII values matter:**

```cpp
my_strcmp("abc", "abd"):
i=0: 'a' == 'a' ✓
i=1: 'b' == 'b' ✓
i=2: 'c' != 'd' → return 'c' - 'd' = 99 - 100 = -1 ✓
```

### Intermediate: Case-Insensitive Comparison

```cpp
int my_strcasecmp(const char *s1, const char *s2) {
    int i = 0;
    
    while (s1[i] != '\0' && s2[i] != '\0') {
        unsigned char c1 = tolower((unsigned char)s1[i]);
        unsigned char c2 = tolower((unsigned char)s2[i]);
        
        if (c1 != c2) {
            return c1 - c2;
        }
        i++;
    }
    
    return tolower((unsigned char)s1[i]) - tolower((unsigned char)s2[i]);
}
```

### Expert: Collation & Localization

```cpp
#include <locale>

// Locale-aware comparison
int my_strcmp_locale(const char *s1, const char *s2, const locale &loc) {
    const collate<char> &coll = use_facet<collate<char>>(loc);
    return coll.compare(s1, s1 + strlen(s1), s2, s2 + strlen(s2));
}
```

---

## SECTION 4: IMPLEMENTING STRCPY

### Beginner Version

**strcpy copies source string to destination.**

```cpp
char* my_strcpy(char *dest, const char *src) {
    int i = 0;
    while (src[i] != '\0') {
        dest[i] = src[i];
        i++;
    }
    dest[i] = '\0';  // Don't forget null terminator!
    return dest;     // Return dest for chaining
}

int main() {
    char buffer[20];
    my_strcpy(buffer, "Hello");
    cout << buffer << endl;  // Hello
    return 0;
}
```

**Pointer version:**

```cpp
char* my_strcpy(char *dest, const char *src) {
    char *d = dest;
    while ((*d++ = *src++) != '\0');  // Copy including null terminator
    return dest;
}
```

### Intermediate: Safe Version (strncpy)

**Original strcpy is DANGEROUS – it can overflow buffer:**

```cpp
char buffer[5];
my_strcpy(buffer, "Hello World");  // BUFFER OVERFLOW!
// Only 5 bytes in buffer, but we're writing 12 characters
// This corrupts memory and causes crashes
```

**Safe version with size limit:**

```cpp
char* my_strncpy(char *dest, const char *src, size_t n) {
    size_t i = 0;
    while (i < n - 1 && src[i] != '\0') {
        dest[i] = src[i];
        i++;
    }
    dest[i] = '\0';
    return dest;
}

// Usage:
char buffer[5];
my_strncpy(buffer, "Hello World", 5);
// buffer now contains "Hell\0" (safely truncated)
```

### Expert: Move Semantics & Optimization

```cpp
// Modern C++ string movement (no copy)
string s1 = "Hello World";
string s2 = move(s1);  // s1 is now empty, s2 owns the buffer

// In competitive programming:
// When you need to "copy" strings many times, consider:
// - Using indices instead of copying
// - Using string_view (C++17) for non-owning references
```

---

## SECTION 5: IMPLEMENTING STRCAT

### Beginner Version

**strcat appends source to destination.**

```cpp
char* my_strcat(char *dest, const char *src) {
    // Find end of dest
    int i = 0;
    while (dest[i] != '\0') {
        i++;
    }
    
    // Append src
    int j = 0;
    while (src[j] != '\0') {
        dest[i + j] = src[j];
        j++;
    }
    dest[i + j] = '\0';
    
    return dest;
}

int main() {
    char buffer[30] = "Hello ";
    my_strcat(buffer, "World");
    cout << buffer << endl;  // Hello World
    return 0;
}
```

### Intermediate: Safe Version

```cpp
char* my_strncat(char *dest, const char *src, size_t n) {
    // Find end of dest
    size_t dest_len = my_strlen(dest);
    
    // Append at most n characters from src
    size_t i = 0;
    while (i < n && src[i] != '\0') {
        dest[dest_len + i] = src[i];
        i++;
    }
    dest[dest_len + i] = '\0';
    
    return dest;
}
```

---

## SECTION 6: STRING TO INTEGER – IMPLEMENTING STOI

### Beginner Version

**Convert string "1234" to integer 1234.**

```cpp
int my_stoi(const string &s) {
    int result = 0;
    
    for (char c : s) {
        if (c < '0' || c > '9') {
            break;  // Stop at first non-digit
        }
        int digit = c - '0';
        result = result * 10 + digit;
    }
    
    return result;
}

int main() {
    cout << my_stoi("123") << endl;    // 123
    cout << my_stoi("0") << endl;      // 0
    cout << my_stoi("999") << endl;    // 999
    return 0;
}
```

**Trace for "123":**

```
c='1': digit=1, result = 0*10 + 1 = 1
c='2': digit=2, result = 1*10 + 2 = 12
c='3': digit=3, result = 12*10 + 3 = 123

Result: 123 ✓
```

### Intermediate: Handling Signs & Spaces

```cpp
int my_stoi_advanced(const string &s) {
    int i = 0;
    
    // Skip leading spaces
    while (i < (int)s.length() && s[i] == ' ') {
        i++;
    }
    
    // Handle sign
    int sign = 1;
    if (i < (int)s.length() && (s[i] == '+' || s[i] == '-')) {
        if (s[i] == '-') sign = -1;
        i++;
    }
    
    // Convert digits
    int result = 0;
    while (i < (int)s.length() && s[i] >= '0' && s[i] <= '9') {
        int digit = s[i] - '0';
        result = result * 10 + digit;
        i++;
    }
    
    return result * sign;
}

// Examples:
cout << my_stoi_advanced("  +123") << endl;   // 123
cout << my_stoi_advanced("  -456") << endl;   // -456
cout << my_stoi_advanced("789abc") << endl;   // 789 (stops at 'a')
```

### Expert: Overflow Handling

```cpp
#include <limits>

int my_stoi_safe(const string &s) {
    int i = 0;
    int sign = 1;
    
    // Skip spaces, parse sign
    while (i < (int)s.length() && s[i] == ' ') i++;
    if (i < (int)s.length() && s[i] == '-') {
        sign = -1;
        i++;
    } else if (i < (int)s.length() && s[i] == '+') {
        i++;
    }
    
    // Parse digits with overflow check
    long long result = 0;
    const int MAX_INT = 2147483647;
    const int MIN_INT = -2147483648;
    
    while (i < (int)s.length() && s[i] >= '0' && s[i] <= '9') {
        int digit = s[i] - '0';
        
        // Check overflow
        if (result > MAX_INT / 10 || (result == MAX_INT / 10 && digit > 7)) {
            return sign == 1 ? MAX_INT : MIN_INT;
        }
        
        result = result * 10 + digit;
        i++;
    }
    
    return (int)(result * sign);
}
```

---

## SECTION 7: INTEGER TO STRING – IMPLEMENTING TO_STRING

### Beginner Version

```cpp
#include <algorithm>

string my_to_string(int x) {
    if (x == 0) return "0";
    
    bool negative = false;
    if (x < 0) {
        negative = true;
        x = -x;  // Make positive
    }
    
    string result = "";
    while (x > 0) {
        int digit = x % 10;
        char c = '0' + digit;
        result += c;
        x /= 10;
    }
    
    if (negative) {
        result += '-';
    }
    
    reverse(result.begin(), result.end());
    return result;
}

int main() {
    cout << my_to_string(123) << endl;      // "123"
    cout << my_to_string(-456) << endl;     // "-456"
    cout << my_to_string(0) << endl;        // "0"
    return 0;
}
```

**Trace for 123:**

```
x = 123, negative = false

digit = 123 % 10 = 3, result = "3", x = 12
digit = 12 % 10 = 2, result = "32", x = 1
digit = 1 % 10 = 1, result = "321", x = 0

reverse("321") = "123"
Result: "123" ✓
```

### Intermediate: C-style String Version

```cpp
char* my_to_string_cstyle(int x, char *buffer) {
    if (x == 0) {
        buffer[0] = '0';
        buffer[1] = '\0';
        return buffer;
    }
    
    bool negative = x < 0;
    if (negative) x = -x;
    
    char *p = buffer;
    while (x > 0) {
        *p++ = '0' + (x % 10);
        x /= 10;
    }
    
    if (negative) *p++ = '-';
    *p = '\0';
    
    reverse(buffer, p);
    return buffer;
}

int main() {
    char buffer[20];
    cout << my_to_string_cstyle(-123, buffer) << endl;  // "-123"
    return 0;
}
```

---

## SECTION 8: PARSING SPACE-SEPARATED INTEGERS

### Beginner: Using stringstream

```cpp
#include <iostream>
#include <sstream>
#include <vector>
using namespace std;

vector<int> parseIntegers(const string &line) {
    vector<int> nums;
    stringstream ss(line);
    int x;
    
    while (ss >> x) {
        nums.push_back(x);
    }
    
    return nums;
}

int main() {
    string line = "10 20   30   40";
    vector<int> nums = parseIntegers(line);
    
    for (int n : nums) {
        cout << n << " ";
    }
    // Output: 10 20 30 40
    
    return 0;
}
```

### Intermediate: Manual Parsing

```cpp
vector<int> parseIntegersManual(const string &line) {
    vector<int> nums;
    int current = 0;
    bool inNumber = false;
    bool negative = false;
    
    for (char c : line) {
        if (c >= '0' && c <= '9') {
            current = current * 10 + (c - '0');
            inNumber = true;
        } else if (c == '-' && !inNumber) {
            negative = true;
        } else if ((c == ' ' || c == '\t') && inNumber) {
            nums.push_back(negative ? -current : current);
            current = 0;
            inNumber = false;
            negative = false;
        }
    }
    
    if (inNumber) {
        nums.push_back(negative ? -current : current);
    }
    
    return nums;
}
```

### Expert: Streaming Parser

```cpp
class IntegerParser {
private:
    stringstream ss;
    
public:
    IntegerParser(const string &line) : ss(line) {}
    
    bool hasNext() const {
        return ss.rdbuf()->in_avail() > 0;
    }
    
    int nextInt() {
        int x;
        if (ss >> x) {
            return x;
        }
        throw runtime_error("No more integers");
    }
    
    vector<int> parseAll() {
        vector<int> result;
        int x;
        while (ss >> x) {
            result.push_back(x);
        }
        return result;
    }
};
```

---

## SECTION 9: PRACTICE QUESTIONS – DAY 3

### Beginner

1. Implement `my_strlen` and test with various strings (empty, single char, long).
2. Implement `my_strcmp` and test comparison logic.
3. Convert "12345" to integer 12345 manually.
4. Parse input "1 2 3 4 5" into a vector of integers.

### Intermediate

5. Implement safe `my_strncpy` that prevents buffer overflow.
6. Implement `my_strcasecmp` for case-insensitive comparison.
7. Implement integer-to-string with sign handling ("+123", "-456").
8. Create a parser that handles "10, 20, 30" (commas instead of spaces).

### Expert

9. Implement `my_stoi` with overflow detection and error handling.
10. Parse CSV-like input: "John,25,NYC" into structured data.
11. Implement a tokenizer for mathematical expressions: "3 + 4 * 2".
12. Build a configuration parser: "key1=value1 key2=value2".

---

# DAY 4 – THURSDAY: LINKED LISTS – WHY & BASIC STRUCTURE

## LEARNING OUTCOMES

### Beginner Level
- Understand why linked lists exist and when to use them
- Learn node structure and pointer management
- Create nodes dynamically with `new`
- Build and traverse simple linked lists
- Calculate length and sum

### Intermediate Level
- Understand memory layout and pointer arithmetic
- Analyze insertion/deletion complexity compared to arrays
- Handle edge cases (empty, single node)
- Understand dynamic memory management

### Expert Level
- Design linked list variants
- Optimize traversal for cache efficiency
- Understand memory fragmentation
- Design for concurrent access

---

## SECTION 1: WHY LINKED LISTS – DETAILED ANALYSIS

### Beginner: Array Limitations

**Arrays are great for:**
- Fast random access: O(1) to access element at index i
- Simple memory layout (contiguous)
- Cache-friendly

**Arrays are bad for:**
- Fixed size (or expensive dynamic resizing)
- Insertion/deletion at beginning or middle: O(n)
- Unpredictable memory usage

**Example: inserting at beginning**

```cpp
vector<int> arr = {20, 30, 40};
// Insert 10 at beginning

// What needs to happen:
// Original: [20][30][40][?]
// Step 1:   [20][30][40][?]  ← allocate new space
// Step 2:   [?][20][30][40]  ← shift everything
// Step 3:   [10][20][30][40] ← insert value

// Operations:
// - Allocate new array: O(1)
// - Copy old elements: O(n)
// - Total: O(n)
```

### Intermediate: Linked List Advantages

**Linked List advantages:**

1. **Dynamic size**: No pre-allocation needed; grows as needed
2. **Fast insertion/deletion at known position**: O(1) if you have the pointer
3. **No need for contiguous memory**: Can use fragmented memory

**Linked List disadvantages:**

1. **Slow random access**: Must traverse from head, O(n)
2. **Extra memory**: Pointer takes extra space per node
3. **Cache-unfriendly**: Nodes scattered in memory, poor cache locality
4. **More complex**: Requires pointer management

### Expert: When to Choose

**Use Array (vector):**
- Frequent random access
- Small datasets
- Need cache efficiency
- Simple implementation

**Use Linked List:**
- Frequent insertion/deletion at known positions
- Unknown size, highly variable
- Need to split/merge lists
- Memory must be reused dynamically

**Real-world example:**

```cpp
// LRU Cache: Recently used items move to front
// Array: O(n) to find and remove, then insert at front
// Linked List: O(1) to unlink and relink at front
// → Linked list is better

// Database indices: Need to find element quickly
// Array: O(log n) binary search
// Linked List: O(n) sequential search
// → Array is better
```

---

## SECTION 2: NODE STRUCTURE – SINGLY LINKED LIST

### Beginner Node Definition

```cpp
struct Node {
    int data;        // payload
    Node *next;      // pointer to next node
};
```

**Memory layout:**

```
Node at address 0x1000:
┌──────────────────────┐
│ data: 10   [4 bytes] │
│ next: 0x1010[8 bytes]│ (on 64-bit system)
└──────────────────────┘
Total: 12 bytes per node

Node at address 0x1010:
┌──────────────────────┐
│ data: 20   [4 bytes] │
│ next: 0x1020[8 bytes]│
└──────────────────────┘

Node at address 0x1020:
┌──────────────────────┐
│ data: 30   [4 bytes] │
│ next: 0     [0]      │ (nullptr)
└──────────────────────┘
```

### Intermediate: Template Node

**Generic node for any data type:**

```cpp
template <typename T>
struct Node {
    T data;
    Node<T>* next;
    
    Node(const T &val) : data(val), next(nullptr) {}
};

// Usage:
Node<int> n1(10);
Node<string> n2("Hello");
Node<double> n3(3.14);
```

### Expert: Memory Layout & Optimization

**Pointer size varies:**

```cpp
// 32-bit system: pointers are 4 bytes
struct Node32 {
    int data;       // 4 bytes
    Node32 *next;   // 4 bytes
};  // Total: 8 bytes

// 64-bit system: pointers are 8 bytes
struct Node64 {
    int data;       // 4 bytes (padded to 8)
    Node64 *next;   // 8 bytes
};  // Total: 16 bytes (due to alignment)

// Optimization: cache data more efficiently
struct OptimizedNode {
    Node* next;     // 8 bytes
    int data;       // 4 bytes
};  // Still 16 bytes, but different layout
```

---

## SECTION 3: CREATING NODES DYNAMICALLY

### Beginner: Using new

```cpp
Node* createNode(int value) {
    Node* temp = new Node;  // Allocate on heap
    temp->data = value;
    temp->next = nullptr;
    return temp;
}

int main() {
    Node* head = createNode(10);
    cout << "Node created at: " << head << endl;
    cout << "Data: " << head->data << endl;
    cout << "Next: " << head->next << endl;
    
    // Clean up memory (important!)
    delete head;
    return 0;
}
```

**Why `new` instead of stack?**

```cpp
// WRONG: local variable destroyed when function exits
Node* createNodeWrong() {
    Node node;  // Local variable on stack
    node.data = 10;
    node.next = nullptr;
    return &node;  // Pointer to destroyed object!
}

// When createNodeWrong returns, the stack frame is freed
// Pointer points to invalid memory (use-after-free bug)

// RIGHT: heap allocation persists
Node* createNodeRight() {
    Node* node = new Node;  // Allocates on heap
    node->data = 10;
    node->next = nullptr;
    return node;  // Valid pointer; caller must delete
}
```

### Intermediate: Memory Management

**Tracking allocated memory:**

```cpp
vector<Node*> nodes;

for (int i = 0; i < 5; i++) {
    nodes.push_back(createNode(i));
}

// Use nodes...

// Clean up
for (Node* n : nodes) {
    delete n;
}
nodes.clear();
```

**Memory leak example:**

```cpp
Node* head = createNode(10);
head->next = createNode(20);
head->next->next = createNode(30);

// If we lose the head pointer, we can't delete the list
// Memory leak!
head = nullptr;  // Now head->data is unreachable and not freed
```

### Expert: RAII (Resource Acquisition Is Initialization)

```cpp
template <typename T>
class LinkedListNode {
private:
    T data;
    unique_ptr<LinkedListNode<T>> next;
    
public:
    LinkedListNode(const T &val) : data(val), next(nullptr) {}
    
    // Automatic cleanup when destroyed
    ~LinkedListNode() {
        // next automatically deleted (unique_ptr handles it)
    }
    
    // ... methods
};

// Usage: automatic cleanup
{
    auto head = make_unique<LinkedListNode<int>>(10);
    head->next = make_unique<LinkedListNode<int>>(20);
}  // Automatic deletion when head goes out of scope
```

---

## SECTION 4: BUILDING A LINKED LIST MANUALLY

### Beginner: Step-by-step

```cpp
#include <iostream>
using namespace std;

struct Node {
    int data;
    Node *next;
};

Node* createNode(int value) {
    Node* temp = new Node;
    temp->data = value;
    temp->next = nullptr;
    return temp;
}

int main() {
    // Step 1: Create first node
    Node* head = createNode(10);
    
    // Step 2: Create second node and link
    head->next = createNode(20);
    
    // Step 3: Create third node and link
    head->next->next = createNode(30);
    
    // Now we have: 10 -> 20 -> 30 -> nullptr
    
    // Verify
    cout << "Head data: " << head->data << endl;                      // 10
    cout << "Second node: " << head->next->data << endl;              // 20
    cout << "Third node: " << head->next->next->data << endl;         // 30
    cout << "After third: " << head->next->next->next << endl;        // 0 (nullptr)
    
    return 0;
}
```

### Intermediate: Cleaner Construction

```cpp
Node* buildList() {
    Node* head = createNode(10);
    Node* current = head;
    
    for (int i = 20; i <= 50; i += 10) {
        current->next = createNode(i);
        current = current->next;  // Move forward
    }
    
    return head;
}

// This builds: 10 -> 20 -> 30 -> 40 -> 50 -> nullptr
```

---

## SECTION 5: TRAVERSAL FUNCTION – PRINTING THE LIST

### Beginner Version

```cpp
void printList(Node* head) {
    Node* current = head;
    
    while (current != nullptr) {
        cout << current->data << " ";
        current = current->next;
    }
    cout << endl;
}

// Usage:
Node* head = buildList();  // 10 -> 20 -> 30 -> ...
printList(head);           // Output: 10 20 30 ...
```

**Trace:**

```
head = [10|*] -> [20|*] -> [30|nullptr]

current = [10|*]
  cout << 10, current = [20|*]

current = [20|*]
  cout << 20, current = [30|nullptr]

current = [30|nullptr]
  cout << 30, current = nullptr

current == nullptr, exit loop
```

### Intermediate: Enhanced Version

```cpp
void printListDetailed(Node* head) {
    if (head == nullptr) {
        cout << "Empty list" << endl;
        return;
    }
    
    Node* current = head;
    cout << "List: ";
    
    while (current != nullptr) {
        cout << current->data;
        if (current->next != nullptr) {
            cout << " -> ";
        } else {
            cout << " -> nullptr";
        }
        current = current->next;
    }
    cout << endl;
}

// Output example: List: 10 -> 20 -> 30 -> nullptr
```

### Expert: Iterator-based Traversal

```cpp
template <typename Callback>
void traverseList(Node* head, Callback func) {
    Node* current = head;
    int index = 0;
    
    while (current != nullptr) {
        func(index, current->data);
        current = current->next;
        index++;
    }
}

// Usage:
traverseList(head, [](int idx, int data) {
    cout << "Index " << idx << ": " << data << endl;
});
```

---

## SECTION 6: LENGTH AND SUM OF LINKED LIST

### Beginner Implementation

**Finding length (count of nodes):**

```cpp
int length(Node* head) {
    int count = 0;
    Node* current = head;
    
    while (current != nullptr) {
        count++;
        current = current->next;
    }
    
    return count;
}

// Usage:
cout << "Length: " << length(head) << endl;
```

**Finding sum of all values:**

```cpp
int sum(Node* head) {
    int total = 0;
    Node* current = head;
    
    while (current != nullptr) {
        total += current->data;
        current = current->next;
    }
    
    return total;
}

// Usage:
cout << "Sum: " << sum(head) << endl;
```

### Intermediate: Additional Statistics

```cpp
struct ListStats {
    int length;
    int sum;
    int max_val;
    int min_val;
    double average;
};

ListStats computeStats(Node* head) {
    ListStats stats = {0, 0, INT_MIN, INT_MAX, 0.0};
    Node* current = head;
    
    while (current != nullptr) {
        stats.length++;
        stats.sum += current->data;
        stats.max_val = max(stats.max_val, current->data);
        stats.min_val = min(stats.min_val, current->data);
        current = current->next;
    }
    
    if (stats.length > 0) {
        stats.average = (double)stats.sum / stats.length;
    }
    
    return stats;
}
```

### Expert: Streaming Computation

```cpp
class ListAggregator {
private:
    int count = 0, sum = 0;
    int max_val = INT_MIN, min_val = INT_MAX;
    
public:
    void process(Node* head) {
        Node* current = head;
        while (current != nullptr) {
            count++;
            sum += current->data;
            max_val = max(max_val, current->data);
            min_val = min(min_val, current->data);
            current = current->next;
        }
    }
    
    int getCount() const { return count; }
    int getSum() const { return sum; }
    double getAverage() const { return count > 0 ? (double)sum / count : 0; }
    int getMax() const { return max_val; }
    int getMin() const { return min_val; }
};
```

---

## SECTION 7: COMMON MISTAKES – LINKED LIST BASICS

| Mistake | Problem | Example | Fix |
|---------|---------|---------|-----|
| Not initializing next to nullptr | Garbage pointer causes crash | `Node* n = new Node; n->data = 10;` (next uninitialized) | `n->next = nullptr;` |
| Losing head pointer | Can't access or delete list | `head = head->next;` without saving old head | Keep reference or use helper functions |
| Dereferencing nullptr | Segmentation fault | `Node* n = nullptr; cout << n->data;` | Check `if (n != nullptr)` first |
| Forgetting to delete nodes | Memory leak | Create node with `new`, never call `delete` | Implement deleteList() function |
| Creating circular list unintentionally | Infinite loops | `last->next = head;` by accident | Ensure `last->next = nullptr` |
| Not updating pointers correctly | Wrong list structure | `node->next = node;` (self-loop) | Carefully manage next assignments |
| Modifying while traversing | Skip nodes or crash | Deleting current node while iterating | Use two pointers: current and previous |

---

## SECTION 8: PRACTICE QUESTIONS – DAY 4

### Beginner

1. Create a linked list with values 1, 2, 3, 4, 5 manually and print it.
2. Write a function to find the length of a linked list.
3. Write a function to find the sum of all values in a linked list.
4. Create a printListDetailed function that shows the structure (10 -> 20 -> nullptr).

### Intermediate

5. Count even numbers in the linked list (function: `countEven(Node* head)`).
6. Find the maximum value in the linked list.
7. Find the average of all values.
8. Write a function `printReverse` that prints the list in reverse (using recursion).

### Expert

9. Implement `findKthNode(Node* head, int k)` to return the k-th node (1-indexed).
10. Write a function to find the middle node using two-pointer technique (tortoise and hare).
11. Design a generic linked list node class using templates.
12. Implement automatic cleanup using smart pointers (unique_ptr).

---

# DAY 5 – FRIDAY: LINKED LIST CORE OPERATIONS

## LEARNING OUTCOMES

### Beginner Level
- Insert nodes at beginning, end, and specific position
- Delete nodes from beginning and end
- Search for values in linked list
- Handle edge cases properly

### Intermediate Level
- Optimize insertion/deletion with careful pointer management
- Understand time complexity implications
- Handle complex edge cases
- Design functions for robustness

### Expert Level
- Implement advanced insertion patterns
- Design for concurrent access
- Optimize for cache efficiency
- Build generalized templates

---

## SECTION 1: INSERT AT BEGINNING

### Beginner Version

**Logic:**
1. Create new node
2. Set new node's next to current head
3. Update head to point to new node

```cpp
void insertAtBeginning(Node* &head, int value) {
    Node* newNode = createNode(value);
    newNode->next = head;  // Link new node to old head
    head = newNode;        // Update head reference
}

int main() {
    Node* head = nullptr;
    
    insertAtBeginning(head, 30);
    insertAtBeginning(head, 20);
    insertAtBeginning(head, 10);
    // List: 10 -> 20 -> 30 -> nullptr
    
    printList(head);
    return 0;
}
```

**Visual:**

```
Before: head → [30|*] → nullptr

Insert 20:
newNode = [20|*]
newNode->next = [30|*]
head = [20|*]

After: head → [20|*] → [30|*] → nullptr

Insert 10:
Similar process

After: head → [10|*] → [20|*] → [30|*] → nullptr
```

### Intermediate: Why Pass Head by Reference?

```cpp
// WRONG: pass by value (doesn't modify original head)
void insertWrong(Node* head, int value) {
    Node* newNode = createNode(value);
    newNode->next = head;
    head = newNode;  // Only modifies local copy!
}

// In main:
Node* head = nullptr;
insertWrong(head, 10);
cout << head << endl;  // Still nullptr! Not updated!

// RIGHT: pass by reference (modifies original head)
void insertRight(Node* &head, int value) {  // Note: &head
    Node* newNode = createNode(value);
    newNode->next = head;
    head = newNode;  // Modifies the original head reference
}

// In main:
Node* head = nullptr;
insertRight(head, 10);
cout << head->data << endl;  // 10! Updated correctly!
```

**Why does this matter?**

When you pass a pointer by value:
```cpp
void func(Node* head) {  // head is a copy
    head = newNode;  // Modifies the copy, not original
}
```

When you pass by reference:
```cpp
void func(Node* &head) {  // head is a reference to the original
    head = newNode;  // Modifies the original
}
```

### Expert: Builder Pattern

```cpp
class LinkedListBuilder {
private:
    Node* head;
    Node* tail;
    
public:
    LinkedListBuilder() : head(nullptr), tail(nullptr) {}
    
    LinkedListBuilder& prepend(int value) {
        Node* newNode = createNode(value);
        if (head == nullptr) {
            head = tail = newNode;
        } else {
            newNode->next = head;
            head = newNode;
        }
        return *this;  // For chaining
    }
    
    Node* build() {
        return head;
    }
};

// Usage:
Node* list = LinkedListBuilder()
    .prepend(30)
    .prepend(20)
    .prepend(10)
    .build();
```

---

## SECTION 2: INSERT AT END

### Beginner Version

**Logic:**
1. If list is empty: new node becomes head
2. Otherwise: traverse to end (where next == nullptr)
3. Link last node's next to new node

```cpp
void insertAtEnd(Node* &head, int value) {
    Node* newNode = createNode(value);
    
    // If list is empty
    if (head == nullptr) {
        head = newNode;
        return;
    }
    
    // Traverse to last node
    Node* current = head;
    while (current->next != nullptr) {
        current = current->next;
    }
    
    // Link last node to new node
    current->next = newNode;
}

int main() {
    Node* head = nullptr;
    
    insertAtEnd(head, 10);
    insertAtEnd(head, 20);
    insertAtEnd(head, 30);
    // List: 10 -> 20 -> 30 -> nullptr
    
    printList(head);
    return 0;
}
```

**Trace:**

```
Insert 10: head=nullptr, list becomes: [10|nullptr]

Insert 20:
  head != nullptr
  current = head = [10|nullptr]
  current->next == nullptr, exit loop
  current->next = [20|nullptr]
  List: [10|*] -> [20|nullptr]

Insert 30:
  Similar process
  List: [10|*] -> [20|*] -> [30|nullptr]
```

### Intermediate: Optimization with Tail Pointer

**Problem with above approach:**
- Traversing to end each time: O(n)
- For n insertions: O(n²) total time

**Solution: Keep track of tail**

```cpp
class LinkedList {
private:
    Node* head;
    Node* tail;
    
public:
    LinkedList() : head(nullptr), tail(nullptr) {}
    
    void insertAtEnd(int value) {
        Node* newNode = createNode(value);
        
        if (head == nullptr) {
            head = tail = newNode;
        } else {
            tail->next = newNode;
            tail = newNode;  // Update tail!
        }
    }
    
    void printList() {
        Node* current = head;
        while (current != nullptr) {
            cout << current->data << " ";
            current = current->next;
        }
        cout << endl;
    }
};

// Usage:
LinkedList list;
for (int i = 1; i <= 1000000; i++) {
    list.insertAtEnd(i);  // O(1) each!
}
```

### Expert: Dynamic Tail Maintenance

```cpp
class OptimizedLinkedList {
private:
    Node* head;
    Node* tail;
    int length;  // Track length too
    
    void updateTail() {
        if (head == nullptr) {
            tail = nullptr;
        } else {
            Node* current = head;
            while (current->next != nullptr) {
                current = current->next;
            }
            tail = current;
        }
    }
    
public:
    OptimizedLinkedList() : head(nullptr), tail(nullptr), length(0) {}
    
    void insertAtEnd(int value) {
        Node* newNode = createNode(value);
        
        if (head == nullptr) {
            head = tail = newNode;
        } else {
            tail->next = newNode;
            tail = newNode;
        }
        length++;
    }
    
    void deleteFromEnd() {
        if (head == nullptr) return;
        
        if (head == tail) {
            delete head;
            head = tail = nullptr;
        } else {
            Node* current = head;
            while (current->next != tail) {
                current = current->next;
            }
            delete tail;
            tail = current;
            tail->next = nullptr;
        }
        length--;
    }
    
    int getLength() const { return length; }
};
```

---

## SECTION 3: INSERT AT POSITION

### Beginner Version

**Logic:**
1. If pos == 0: use insertAtBeginning
2. Otherwise: traverse to position pos-1
3. Insert new node between pos-1 and pos

```cpp
void insertAtPosition(Node* &head, int pos, int value) {
    if (pos == 0) {
        insertAtBeginning(head, value);
        return;
    }
    
    Node* current = head;
    
    // Traverse to position pos-1
    for (int i = 0; i < pos - 1 && current != nullptr; i++) {
        current = current->next;
    }
    
    // If position beyond list, insert at end (simple handling)
    if (current == nullptr) {
        insertAtEnd(head, value);
        return;
    }
    
    // Insert at position
    Node* newNode = createNode(value);
    newNode->next = current->next;
    current->next = newNode;
}

int main() {
    Node* head = nullptr;
    insertAtEnd(head, 10);
    insertAtEnd(head, 20);
    insertAtEnd(head, 30);
    // List: 10 -> 20 -> 30
    
    insertAtPosition(head, 1, 15);
    // List: 10 -> 15 -> 20 -> 30
    
    printList(head);
    return 0;
}
```

**Trace for insertAtPosition(head, 1, 15):**

```
List: [10|*] -> [20|*] -> [30|nullptr]

pos = 1, value = 15

insertAtBeginning? No, pos != 0

Traverse to position 0 (pos-1):
i=0: current = [10|*]
Loop exits (i < 0 is false)

current != nullptr, so insert:
newNode = [15|*]
newNode->next = current->next = [20|*]
current->next = [15|*]

Result: [10|*] -> [15|*] -> [20|*] -> [30|nullptr]
```

### Intermediate: Safer Implementation

```cpp
int insertAtPositionSafe(Node* &head, int pos, int value) {
    // Validate position
    if (pos < 0) return -1;  // Invalid position
    
    if (pos == 0) {
        insertAtBeginning(head, value);
        return 0;
    }
    
    Node* current = head;
    int i = 0;
    
    while (i < pos - 1 && current != nullptr) {
        current = current->next;
        i++;
    }
    
    if (current == nullptr) {
        return -1;  // Position beyond list length
    }
    
    Node* newNode = createNode(value);
    newNode->next = current->next;
    current->next = newNode;
    return 0;  // Success
}

// Usage:
if (insertAtPositionSafe(head, 1, 15) == 0) {
    cout << "Inserted successfully" << endl;
} else {
    cout << "Invalid position" << endl;
}
```

### Expert: Sorted Insertion

```cpp
void insertSorted(Node* &head, int value) {
    Node* newNode = createNode(value);
    
    // If list empty or new value smaller than head
    if (head == nullptr || head->data >= value) {
        newNode->next = head;
        head = newNode;
        return;
    }
    
    // Find correct position
    Node* current = head;
    while (current->next != nullptr && current->next->data < value) {
        current = current->next;
    }
    
    // Insert
    newNode->next = current->next;
    current->next = newNode;
}

// Usage:
Node* head = nullptr;
insertSorted(head, 30);
insertSorted(head, 10);
insertSorted(head, 20);
// List: 10 -> 20 -> 30 (automatically sorted!)
```

---

## SECTION 4: DELETE FROM BEGINNING

### Beginner Version

**Logic:**
1. If list empty: do nothing
2. Save head pointer
3. Move head to next node
4. Delete old head

```cpp
void deleteFromBeginning(Node* &head) {
    if (head == nullptr) return;
    
    Node* temp = head;      // Save current head
    head = head->next;      // Move head forward
    delete temp;            // Free old head
}

int main() {
    Node* head = nullptr;
    insertAtEnd(head, 10);
    insertAtEnd(head, 20);
    insertAtEnd(head, 30);
    // List: 10 -> 20 -> 30
    
    deleteFromBeginning(head);
    // List: 20 -> 30
    
    printList(head);
    return 0;
}
```

**Trace:**

```
List: [10|*] -> [20|*] -> [30|nullptr]

temp = [10|*]
head = [20|*]
delete [10|*]

Result: [20|*] -> [30|nullptr]
```

### Intermediate: Return Deleted Value

```cpp
int deleteFromBeginning(Node* &head) {
    if (head == nullptr) {
        return -1;  // Error value
    }
    
    int value = head->data;  // Save value to return
    Node* temp = head;
    head = head->next;
    delete temp;
    
    return value;
}

// Usage:
int deleted_value = deleteFromBeginning(head);
cout << "Deleted: " << deleted_value << endl;
```

---

## SECTION 5: DELETE FROM END

### Beginner Version

**Logic:**
1. If list empty: do nothing
2. If only one node: delete it and set head to nullptr
3. Otherwise: traverse to second-to-last node
4. Delete last node and set second-to-last's next to nullptr

```cpp
void deleteFromEnd(Node* &head) {
    if (head == nullptr) return;  // Empty list
    
    if (head->next == nullptr) {   // Single node
        delete head;
        head = nullptr;
        return;
    }
    
    // Traverse to second-to-last node
    Node* current = head;
    while (current->next->next != nullptr) {
        current = current->next;
    }
    
    // Delete last node
    delete current->next;
    current->next = nullptr;
}

int main() {
    Node* head = nullptr;
    insertAtEnd(head, 10);
    insertAtEnd(head, 20);
    insertAtEnd(head, 30);
    // List: 10 -> 20 -> 30
    
    deleteFromEnd(head);
    // List: 10 -> 20
    
    printList(head);
    return 0;
}
```

**Trace:**

```
List: [10|*] -> [20|*] -> [30|nullptr]

Single node? No
current = [10|*]

Loop condition: current->next->next != nullptr
  current->next->next = [30|nullptr]->next = nullptr
  Condition false, exit

Delete current->next = [20|*] → wait, that's wrong!

Let me re-trace:
current = [10|*], current->next = [20|*], current->next->next = [30|nullptr]
  Condition: [30|nullptr]->next != nullptr? No, exit loop

Delete [30|nullptr]
Set current->next = nullptr

Result: [10|*] -> [20|nullptr]
```

### Intermediate: Using Tail Pointer

```cpp
class LinkedListWithTail {
private:
    Node* head;
    Node* tail;
    
public:
    void deleteFromEnd() {
        if (head == nullptr) return;
        
        if (head == tail) {  // Single node
            delete head;
            head = tail = nullptr;
            return;
        }
        
        // Find new tail (second-to-last node)
        Node* current = head;
        while (current->next != tail) {
            current = current->next;
        }
        
        delete tail;
        tail = current;
        tail->next = nullptr;
    }
};
```

---

## SECTION 6: SEARCH IN LINKED LIST

### Beginner Version

```cpp
bool search(Node* head, int key) {
    Node* current = head;
    
    while (current != nullptr) {
        if (current->data == key) {
            return true;  // Found
        }
        current = current->next;
    }
    
    return false;  // Not found
}

int main() {
    Node* head = nullptr;
    insertAtEnd(head, 10);
    insertAtEnd(head, 20);
    insertAtEnd(head, 30);
    
    cout << search(head, 20) << endl;   // 1 (true)
    cout << search(head, 100) << endl;  // 0 (false)
    return 0;
}
```

### Intermediate: Return Index

```cpp
int searchIndex(Node* head, int key) {
    Node* current = head;
    int index = 0;
    
    while (current != nullptr) {
        if (current->data == key) {
            return index;
        }
        current = current->next;
        index++;
    }
    
    return -1;  // Not found
}

// Usage:
int idx = searchIndex(head, 20);
if (idx != -1) {
    cout << "Found at index: " << idx << endl;
} else {
    cout << "Not found" << endl;
}
```

### Expert: Binary Search on Sorted List

```cpp
// Note: Binary search on linked list is not practical (O(n) vs O(log n) tree)
// But can be done with clever techniques

bool binarySearchLinkedList(Node* head, int target) {
    if (head == nullptr) return false;
    
    // Find middle using slow/fast pointers
    Node* slow = head;
    Node* fast = head;
    
    while (fast != nullptr && fast->next != nullptr) {
        slow = slow->next;
        fast = fast->next->next;
    }
    
    // Now slow is at middle
    if (slow->data == target) return true;
    if (slow->data < target) {
        return binarySearchLinkedList(slow->next, target);
    } else {
        return binarySearchLinkedList(head, target);
    }
}
```

---

## SECTION 7: COMBINED DEMO PROGRAM

```cpp
#include <iostream>
using namespace std;

struct Node {
    int data;
    Node *next;
};

Node* createNode(int value) {
    Node* temp = new Node;
    temp->data = value;
    temp->next = nullptr;
    return temp;
}

void printList(Node* head) {
    if (head == nullptr) {
        cout << "Empty list" << endl;
        return;
    }
    Node* current = head;
    while (current != nullptr) {
        cout << current->data << " ";
        current = current->next;
    }
    cout << endl;
}

void insertAtBeginning(Node* &head, int value) {
    Node* newNode = createNode(value);
    newNode->next = head;
    head = newNode;
}

void insertAtEnd(Node* &head, int value) {
    Node* newNode = createNode(value);
    if (head == nullptr) {
        head = newNode;
        return;
    }
    Node* current = head;
    while (current->next != nullptr) {
        current = current->next;
    }
    current->next = newNode;
}

void insertAtPosition(Node* &head, int pos, int value) {
    if (pos == 0) {
        insertAtBeginning(head, value);
        return;
    }
    Node* current = head;
    for (int i = 0; i < pos - 1 && current != nullptr; i++) {
        current = current->next;
    }
    if (current == nullptr) {
        insertAtEnd(head, value);
        return;
    }
    Node* newNode = createNode(value);
    newNode->next = current->next;
    current->next = newNode;
}

void deleteFromBeginning(Node* &head) {
    if (head == nullptr) return;
    Node* temp = head;
    head = head->next;
    delete temp;
}

void deleteFromEnd(Node* &head) {
    if (head == nullptr) return;
    if (head->next == nullptr) {
        delete head;
        head = nullptr;
        return;
    }
    Node* current = head;
    while (current->next->next != nullptr) {
        current = current->next;
    }
    delete current->next;
    current->next = nullptr;
}

bool search(Node* head, int key) {
    Node* current = head;
    while (current != nullptr) {
        if (current->data == key) return true;
        current = current->next;
    }
    return false;
}

void deleteList(Node* &head) {
    while (head != nullptr) {
        deleteFromBeginning(head);
    }
}

int main() {
    Node* head = nullptr;
    
    cout << "=== Linked List Demo ===" << endl;
    
    // Build list
    insertAtEnd(head, 10);
    insertAtEnd(head, 20);
    insertAtBeginning(head, 5);
    insertAtPosition(head, 1, 7);
    
    cout << "List after insertions: ";
    printList(head);  // 5 7 10 20
    
    cout << "Searching for 10: " << (search(head, 10) ? "Found" : "Not found") << endl;
    cout << "Searching for 100: " << (search(head, 100) ? "Found" : "Not found") << endl;
    
    deleteFromBeginning(head);
    cout << "After deleting from beginning: ";
    printList(head);  // 7 10 20
    
    deleteFromEnd(head);
    cout << "After deleting from end: ";
    printList(head);  // 7 10
    
    deleteList(head);
    cout << "After deleting all: ";
    printList(head);  // Empty list
    
    return 0;
}
```

---

## SECTION 8: COMMON MISTAKES – LINKED LIST OPERATIONS

| Mistake | Problem | Fix |
|---------|---------|-----|
| Not checking head == nullptr before accessing | Null pointer dereference | Always check `if (head == nullptr)` |
| Losing reference to nodes during deletion | Memory leak or unreachable nodes | Update pointers before deleting |
| Not updating tail pointer after operations | Stale tail pointer causes bugs | Maintain tail consistency |
| Forgetting to call delete | Memory leak | Every `new` needs a `delete` |
| Modifying next pointer incorrectly | Wrong list structure or loops | Careful pointer assignment |
| Position validation issues | Inserting at invalid position | Validate position bounds |
| Loop termination bugs | Infinite loops | Check loop conditions carefully |

---

## SECTION 9: PRACTICE PROBLEMS – DAY 5

### Beginner

1. Implement complete demo program with insert/delete/search.
2. Create a list, insert elements, print at each step.
3. Delete from beginning repeatedly until empty.
4. Search for multiple values in the list.

### Intermediate

5. **Insert in Sorted Order:** Maintain a sorted linked list by inserting in correct position.
6. **Reverse Linked List:** Reverse the entire list in-place (advanced Day 5).
7. **Merge Two Lists:** Merge two sorted linked lists into one sorted list.
8. **Remove Duplicates:** Given a sorted list, remove duplicate nodes.

### Expert

9. **Implement Doubly Linked List:** Add prev pointers for bidirectional traversal.
10. **Circular Linked List:** Make last node point to head for circular structure.
11. **Detect Cycle:** Use Floyd's algorithm (slow/fast pointers) to detect cycles.
12. **Find Middle Element:** Use slow/fast pointer technique.

<!-- ---

# WEEK 3 SUMMARY – READY FOR WEEK 4

By the end of WEEK 3, you have built a comprehensive foundation in:

## Strings (Days 1-3)

**Core Concepts:**
- Internal memory model of strings (size, capacity, reallocation)
- Input handling without bugs (cin vs getline interaction)
- Case conversion with ASCII understanding
- Trimming, splitting, and joining strings
- Substring search (naive O(n*m))

**Algorithms:**
- Two-pointer: reversing, palindromes
- Sliding window: fixed and variable length
- Frequency counting: anagrams, character statistics

**Implementation:**
- C-style vs C++ strings comparison
- Manual string function implementations (strlen, strcmp, strcpy, strcat)
- String-to-integer and integer-to-string conversion
- Robust input parsing

**Why this matters:** Strings appear in every problem. Mastery here translates to all data manipulation.

## Linked Lists – Foundations (Days 4-5)

**Core Concepts:**
- Why linked lists exist (vs arrays)
- Node structure and dynamic memory management
- Pointer arithmetic and references
- Traversal and statistics computation

**Operations:**
- Insert at beginning: O(1)
- Insert at end: O(n) naive, O(1) with tail pointer
- Insert at position: O(n) traversal
- Delete from beginning: O(1)
- Delete from end: O(n)
- Search: O(n)

**Why this matters:** Linked lists are building blocks for:
- Week 4: Advanced operations (reverse, merge, cycle detection)
- Stacks and queues (built on linked lists)
- Trees and graphs (use pointers similar to linked lists)
- Interview problems (classic linked list questions)

## Transition to Week 4

Week 3 prepares you for:

1. **Advanced Linked List Algorithms:**
   - Reverse linked list (iterative and recursive)
   - Detect and remove cycles
   - Find middle element
   - Merge sorted lists
   - Clone with random pointers

2. **Problem-Solving Framework:**
   - Pattern recognition (when to use which algorithm)
   - Optimization techniques (space/time trade-offs)
   - Edge case handling at scale

3. **Interview Readiness:**
   - Classic string problems (LeetCode Easy/Medium)
   - Linked list problems (LeetCode Easy/Medium)
   - Combined problems (strings + linked lists)

## Key Takeaways

1. **Understand before memorizing:** Know WHY two-pointers work, not just HOW.
2. **Edge cases matter:** Empty strings, single nodes, overflow conditions.
3. **Memory management:** Understand heap allocation, deletion, and leaks.
4. **Performance thinking:** Always consider time and space complexity.
5. **Write code carefully:** One wrong pointer assignment breaks the entire structure.

--- -->

# APPENDIX: QUICK REFERENCE

## String Operations Complexity

| Operation | Time | Space | Notes |
|-----------|------|-------|-------|
| length() | O(1) | - | Built-in |
| charAt(i) | O(1) | - | Direct indexing |
| substr(start, len) | O(len) | O(len) | Creates new string |
| find(pattern) | O(n*m) | O(1) | Naive algorithm |
| toLowerCase() | O(n) | O(n) or O(1) | Depends on in-place |
| split() | O(n) | O(n) | Creates new strings |
| join() | O(total_length) | O(total) | All strings combined |

## Linked List Operations Complexity

| Operation | Time | Space | Notes |
|-----------|------|-------|-------|
| traverse | O(n) | O(1) | Must visit each node |
| search | O(n) | O(1) | Linear search only |
| insertAtBeginning | O(1) | O(1) | With head reference |
| insertAtEnd | O(n) | O(1) | O(1) with tail pointer |
| insertAtPosition | O(n) | O(1) | Traversal required |
| deleteFromBeginning | O(1) | O(1) | Simple pointer update |
| deleteFromEnd | O(n) | O(1) | Must find second-to-last |
| deleteAtPosition | O(n) | O(1) | Traversal required |

---

**END OF WEEK 3 COMPLETE GUIDE**

This enhanced guide provides comprehensive coverage from beginner to expert level. Master this, and you'll be well-prepared for advanced data structures and interview problems.
