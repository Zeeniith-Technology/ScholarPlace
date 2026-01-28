# 📚 WEEK 5 – MONDAY
## STACK FUNDAMENTALS | Complete Implementation | 80+ Pages

---

# 🌟 COMPREHENSIVE BEGINNER'S GUIDE (45 MINUTES)

## Part 1: Understanding Stacks (Real-World Analogy)

### What is a Stack?

**Analogy: Plate Stack in Restaurant**

```
You have plates in a container:
- Add new plate? Put it ON TOP
- Remove plate? Take from TOP
- Access middle plate? Can't! Must remove top ones first

┌─────────────────┐
│   Plate 5 (Top) │  ← Last one added, first one removed
├─────────────────┤
│   Plate 4       │
├─────────────────┤
│   Plate 3       │
├─────────────────┤
│   Plate 2       │
├─────────────────┤
│   Plate 1       │  ← First one added, last one removed
└─────────────────┘

This is LIFO (Last In, First Out)
```

### Real-Life Examples of Stacks

1. **Browser Back Button**
   - Pages visited: [Google, Gmail, LinkedIn, GitHub]
   - You're at GitHub
   - Click back → LinkedIn
   - Click back → Gmail
   - Last page visited, first one removed!

2. **Undo/Redo in Text Editor**
   - Actions: [Type 'A', Type 'B', Type 'C']
   - Current: "ABC"
   - Undo → "AB" (remove Type 'C')
   - Undo → "A" (remove Type 'B')

3. **Function Call Stack in Programming**
   ```
   main() calls func1()
   func1() calls func2()
   func2() calls func3()
   
   Call stack: [main → func1 → func2 → func3]
   
   func3() returns → pops
   func2() returns → pops
   func1() returns → pops
   main() returns → pops
   
   Last function called = first one to return!
   ```

4. **Parentheses Matching**
   - Expression: (a + (b * c))
   - Stack helps verify: ( ( ) )
   - Each ( goes on stack
   - Each ) matches with top (

### Why Stacks Exist

```
Problem: Need LIFO ordering
Array: Hard to remove from end efficiently
Linked List: Possible but overhead

Stack: Optimized for:
- Push (add to top): O(1)
- Pop (remove from top): O(1)
- Peek (see top): O(1)
- Space: O(n)

All operations are O(1)!
```

---

## Part 2: Stack Structure (Core Concept)

### Stack Node Definition

```cpp
struct Node {
    int data;
    Node* next;
    Node(int val) : data(val), next(NULL) {}
};
```

### Stack Class Definition

```cpp
class Stack {
private:
    Node* top;        // Points to top element
    int size;         // Number of elements
    
public:
    Stack() : top(NULL), size(0) {}
    
    // CORE OPERATIONS:
    void push(int val);      // Add to top: O(1)
    int pop();              // Remove from top: O(1)
    int peek();             // See top: O(1)
    bool isEmpty();         // Check empty: O(1)
    int getSize();          // Get size: O(1)
    void display();         // Print all: O(n)
};
```

### Memory Visualization

```
Empty Stack:
top = NULL

After push(5):
┌─────────────────┐
│ data: 5         │  ← top
│ next: NULL      │
└─────────────────┘

After push(10):
┌─────────────────┐
│ data: 10        │  ← top
│ next: ────────┐ │
└─────────────┼───┘
              │
              ▼
        ┌─────────────────┐
        │ data: 5         │
        │ next: NULL      │
        └─────────────────┘

After push(15):
┌─────────────────┐
│ data: 15        │  ← top
│ next: ────────┐ │
└─────────────┼───┘
              │
              ▼
        ┌─────────────────┐
        │ data: 10        │
        │ next: ────────┐ │
        └─────────────┼───┘
                      │
                      ▼
                ┌─────────────────┐
                │ data: 5         │
                │ next: NULL      │
                └─────────────────┘

Stack: [15 (top), 10, 5 (bottom)]
```

---

## Part 3: Stack vs Array vs Linked List

### Implementation Comparison

| Feature | Array Stack | Linked List Stack | Regular LL |
|---------|-------------|-------------------|-----------|
| **Push** | O(1) | O(1) | O(1) |
| **Pop** | O(1) | O(1) | O(n) |
| **Memory** | Fixed | Dynamic | Dynamic |
| **Access** | Random O(1) | Sequential | Sequential |
| **Use Case** | Bounded size | Dynamic | General |

### Why Linked List Stack?

```
Reason 1: Dynamic Size
- Don't know how many items
- Linked list grows as needed
- Arrays need pre-allocation

Reason 2: LIFO Perfect Match
- Add/remove from front = O(1)
- No shifting needed (unlike array)
- Linked list naturally suits this

Reason 3: No Waste
- Array: allocate 1000 for 10 items
- Linked List: allocate exactly 10
```

---

## Part 4: Time & Space Complexity

### All Stack Operations

```
Push (add):       O(1) time, O(1) space
Pop (remove):     O(1) time, O(1) space
Peek (see top):   O(1) time, O(1) space
isEmpty:          O(1) time, O(1) space
getSize:          O(1) time, O(1) space
Display all:      O(n) time, O(1) space

TOTAL SPACE:      O(n) for n elements
TOTAL TIME (n ops): O(n) amortized
```

### Why All O(1)?

```
Push:
1. Create new node → O(1)
2. Set next pointer → O(1)
3. Update top → O(1)
Total: O(1) ✓

Pop:
1. Store top → O(1)
2. Move top to next → O(1)
3. Return old top → O(1)
Total: O(1) ✓

Peek:
1. Return top->data → O(1)
Total: O(1) ✓

No loops! All pointer operations!
```

---

## Part 5: Key Differences: Stack vs Queue

### Quick Comparison

```
STACK (LIFO - Last In, First Out):
Add:    Push on top
Remove: Pop from top
Order:  Last added = First removed

Example: [1, 2, 3] → Push 4 → [1, 2, 3, 4]
         Pop → 4 (last in)
         Pop → 3

QUEUE (FIFO - First In, First Out):
Add:    Enqueue at rear
Remove: Dequeue from front
Order:  First added = First removed

Example: [1, 2, 3] → Enqueue 4 → [1, 2, 3, 4]
         Dequeue → 1 (first in)
         Dequeue → 2

Visual:
STACK:        QUEUE:
  ↓ Push       Enqueue →
┌───┐         ┌───────────────┐
│ 4 │         │ 1  2  3  4    │
├───┤         └───────────────┘
│ 3 │           ↓ Dequeue
├───┤
│ 2 │
├───┤
│ 1 │
└───┘
```

---

# 🔵 THEORY SECTION: STACK OPERATIONS

## Push Operation

**What Happens:**
```
Before:
Stack: [5, 3]
top → 3

Operation: push(10)

After:
Stack: [5, 3, 10]
top → 10
```

**Algorithm:**
```
1. Create new node with value
2. Set new node's next to current top
3. Update top to point to new node
4. Increment size
```

**Code:**
```cpp
void push(int val) {
    Node* newNode = new Node(val);
    newNode->next = top;
    top = newNode;
    size++;
}
```

**Complexity:**
- Time: O(1) - just pointer operations
- Space: O(1) - one new node

---

## Pop Operation

**What Happens:**
```
Before:
Stack: [5, 3, 10]
top → 10

Operation: pop()

After:
Stack: [5, 3]
top → 3
Returns: 10
```

**Algorithm:**
```
1. Check if stack is empty
2. Store top node
3. Move top to next node
4. Delete old top
5. Decrement size
6. Return value
```

**Code:**
```cpp
int pop() {
    if (isEmpty()) {
        cout << "Stack Underflow!" << endl;
        return -1;
    }
    
    Node* temp = top;
    int val = temp->data;
    top = top->next;
    delete temp;
    size--;
    
    return val;
}
```

**Complexity:**
- Time: O(1)
- Space: O(1)

---

## Peek Operation

**What Happens:**
```
Before:
Stack: [5, 3, 10]
top → 10

Operation: peek()

After:
Stack: [5, 3, 10]  (unchanged!)
top → 10
Returns: 10
```

**Algorithm:**
```
1. Check if stack is empty
2. Return top value (don't remove!)
```

**Code:**
```cpp
int peek() {
    if (isEmpty()) {
        cout << "Stack is empty!" << endl;
        return -1;
    }
    return top->data;
}
```

**Complexity:**
- Time: O(1)
- Space: O(1)

---

# 🎯 COMPLETE STACK IMPLEMENTATION

```cpp
#include <iostream>
using namespace std;

struct Node {
    int data;
    Node* next;
    Node(int val) : data(val), next(NULL) {}
};

class Stack {
private:
    Node* top;
    int size;
    
public:
    // Constructor
    Stack() : top(NULL), size(0) {
        cout << "Stack created (empty)" << endl;
    }
    
    // Destructor - Clean up memory
    ~Stack() {
        while (!isEmpty()) {
            pop();
        }
        cout << "Stack destroyed" << endl;
    }
    
    // PUSH: Add element to top
    // TIME: O(1)
    void push(int val) {
        cout << "Pushing " << val << " onto stack..." << endl;
        
        Node* newNode = new Node(val);
        newNode->next = top;
        top = newNode;
        size++;
        
        cout << "  ✓ Pushed. Size now: " << size << endl;
    }
    
    // POP: Remove and return element from top
    // TIME: O(1)
    int pop() {
        if (isEmpty()) {
            cout << "Stack Underflow! Cannot pop from empty stack." << endl;
            return -1;
        }
        
        cout << "Popping from stack..." << endl;
        
        int val = top->data;
        Node* temp = top;
        top = top->next;
        delete temp;
        size--;
        
        cout << "  ✓ Popped " << val << ". Size now: " << size << endl;
        return val;
    }
    
    // PEEK: See top element without removing
    // TIME: O(1)
    int peek() {
        if (isEmpty()) {
            cout << "Stack is empty! Cannot peek." << endl;
            return -1;
        }
        
        cout << "Top element is: " << top->data << endl;
        return top->data;
    }
    
    // CHECK IF EMPTY
    bool isEmpty() {
        return size == 0;
    }
    
    // GET SIZE
    int getSize() {
        return size;
    }
    
    // DISPLAY: Print all elements
    // TIME: O(n)
    void display() {
        if (isEmpty()) {
            cout << "Stack is empty!" << endl;
            return;
        }
        
        cout << "\n=== STACK DISPLAY ===" << endl;
        cout << "Stack (Top to Bottom): ";
        
        Node* curr = top;
        
        while (curr != NULL) {
            cout << "[" << curr->data << "]";
            if (curr->next != NULL) cout << " ← ";
            curr = curr->next;
        }
        
        cout << endl;
        cout << "Size: " << size << endl;
        cout << "====================\n" << endl;
    }
};

// TEST FUNCTION 1: Basic Push/Pop
void test1_BasicOperations() {
    cout << "\n========== TEST 1: Basic Operations ==========\n";
    
    Stack s;
    
    s.push(10);
    s.push(20);
    s.push(30);
    s.push(40);
    
    s.display();
    
    s.peek();
    
    cout << "\nPopping elements:" << endl;
    s.pop();
    s.pop();
    
    s.display();
}

// TEST FUNCTION 2: Pop from Empty Stack
void test2_PopEmpty() {
    cout << "\n========== TEST 2: Pop from Empty Stack ==========\n";
    
    Stack s;
    
    s.push(100);
    cout << "\nPopping from stack with 1 element:" << endl;
    s.pop();
    
    cout << "\nTrying to pop from empty stack:" << endl;
    s.pop();
    
    s.display();
}

// TEST FUNCTION 3: Peek Operations
void test3_Peek() {
    cout << "\n========== TEST 3: Peek Operations ==========\n";
    
    Stack s;
    
    s.push(5);
    s.push(15);
    s.push(25);
    
    cout << "\nPeeking (doesn't remove):" << endl;
    int val1 = s.peek();
    
    cout << "Display after peek:" << endl;
    s.display();
    
    cout << "Peek again (same value):" << endl;
    int val2 = s.peek();
    cout << "Values equal? " << (val1 == val2 ? "Yes ✓" : "No ✗") << endl;
}

// TEST FUNCTION 4: isEmpty Check
void test4_IsEmpty() {
    cout << "\n========== TEST 4: isEmpty Check ==========\n";
    
    Stack s;
    
    cout << "Stack created. isEmpty? " << (s.isEmpty() ? "Yes ✓" : "No") << endl;
    
    s.push(50);
    cout << "After push(50). isEmpty? " << (s.isEmpty() ? "Yes" : "No ✓") << endl;
    
    s.pop();
    cout << "After pop(). isEmpty? " << (s.isEmpty() ? "Yes ✓" : "No") << endl;
}

// TEST FUNCTION 5: Size Tracking
void test5_SizeTracking() {
    cout << "\n========== TEST 5: Size Tracking ==========\n";
    
    Stack s;
    
    cout << "Initial size: " << s.getSize() << endl;
    
    for (int i = 1; i <= 5; i++) {
        s.push(i * 10);
        cout << "After push(" << i*10 << "). Size: " << s.getSize() << endl;
    }
    
    s.display();
    
    for (int i = 1; i <= 3; i++) {
        s.pop();
        cout << "After pop(). Size: " << s.getSize() << endl;
    }
    
    s.display();
}

// TEST FUNCTION 6: Sequence of Operations
void test6_SequenceOps() {
    cout << "\n========== TEST 6: Sequence of Operations ==========\n";
    
    Stack s;
    
    cout << "Operation sequence:\n";
    s.push(1);
    s.push(2);
    s.display();
    
    cout << "Popping:" << endl;
    int popped = s.pop();
    cout << "Got: " << popped << " (expected: 2) " << (popped == 2 ? "✓" : "✗") << endl;
    
    s.push(3);
    s.push(4);
    s.display();
    
    popped = s.pop();
    cout << "Got: " << popped << " (expected: 4) " << (popped == 4 ? "✓" : "✗") << endl;
    
    s.display();
}

int main() {
    test1_BasicOperations();
    test2_PopEmpty();
    test3_Peek();
    test4_IsEmpty();
    test5_SizeTracking();
    test6_SequenceOps();
    
    return 0;
}
```

---

# 📊 TEST EXECUTION OUTPUT

```
========== TEST 1: Basic Operations ==========

Stack created (empty)
Pushing 10 onto stack...
  ✓ Pushed. Size now: 1
Pushing 20 onto stack...
  ✓ Pushed. Size now: 2
Pushing 30 onto stack...
  ✓ Pushed. Size now: 3
Pushing 40 onto stack...
  ✓ Pushed. Size now: 4

=== STACK DISPLAY ===
Stack (Top to Bottom): [40] ← [30] ← [20] ← [10]
Size: 4
====================

Top element is: 40

Popping elements:
Popping from stack...
  ✓ Popped 40. Size now: 3
Popping from stack...
  ✓ Popped 30. Size now: 2

=== STACK DISPLAY ===
Stack (Top to Bottom): [20] ← [10]
Size: 2
====================
```

---

# ❌ COMMON MISTAKES

| Mistake | Problem | Why Wrong | Fix |
|---------|---------|-----------|-----|
| `pop()` on empty | Crash | No check | Add `isEmpty()` check |
| Forget `top = top->next` | Infinite loop | Pointer not updated | Update before delete |
| `delete` before storing | Lost value | Can't return | Store value first |
| No `new Node()` | Undefined | Memory not allocated | Use `new` |
| `size++` after pop | Size wrong | Incremented not decremented | Use `size--` |

---

# 📝 PRACTICE QUESTIONS (MONDAY)

**Q1:** What does LIFO mean?  
**A1:** Last In, First Out - most recently added element is removed first

**Q2:** What's the time complexity of push/pop?  
**A2:** O(1) - just pointer operations, no loops

**Q3:** Why use linked list for stack?  
**A3:** Dynamic size, O(1) operations, no overflow issues

**Q4:** What's the difference between pop() and peek()?  
**A4:** pop() removes element, peek() just views it without removing

**Q5:** When stack is empty, what should pop() return?  
**A5:** Error value (-1) or throw exception, handle gracefully

**Q6:** How many elements can be on a linked list stack?  
**A6:** Unlimited (until memory runs out)

**Q7:** Is array stack faster than linked list stack?  
**A7:** Similar O(1) operations but array has better cache locality

---

# ✅ MONDAY CHECKLIST

- [x] Understand LIFO concept
- [x] Know all operations (push, pop, peek)
- [x] All operations are O(1)
- [x] Implement stack from scratch
- [x] Handle edge cases (empty stack)
- [x] Write clean code with comments
- [x] Test all operations
- [x] Answer practice questions

---

**MONDAY COMPLETE** ✅

