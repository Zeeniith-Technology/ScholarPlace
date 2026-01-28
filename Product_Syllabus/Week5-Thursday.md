# 📚 WEEK 5 – THURSDAY
## QUEUE FUNDAMENTALS | FIFO | Complete Implementation | 80+ Pages

---

# 🌟 QUEUE BEGINNER'S GUIDE

## What is a Queue?

**Analogy: Customer Waiting Line in Bank**

```
Customers line up:
- New customer? Join END (rear)
- Serve customer? From FRONT
- Order: First arrived = First served

    Customer 1 → Served next
    │
    Customer 2 → Waiting
    │
    Customer 3 → Waiting (just joined)
    │
   Rear
   
This is FIFO (First In, First Out)
```

## Real-Life Examples

1. **Print Queue**
   - First document submitted prints first
   - Fair ordering

2. **Job Scheduling**
   - CPU processes jobs in order received
   - FCFS (First Come First Serve)

3. **Customer Service**
   - Customers served in arrival order
   - Fair and predictable

4. **BFS (Breadth-First Search)**
   - Visit nodes level by level
   - Process current level before next

5. **Network Packets**
   - Packets transmitted in order received
   - Maintains order

## Why Queues Exist

```
Problem: Need FIFO ordering
Array: Hard to remove from front efficiently
Linked List: Possible but overhead

Queue: Optimized for:
- Enqueue (add to rear): O(1)
- Dequeue (remove from front): O(1)
- Peek (see front): O(1)
- Space: O(n)

All operations are O(1)!
```

---

# 📋 QUEUE STRUCTURE

## Queue Node Definition

```cpp
struct Node {
    int data;
    Node* next;
    Node(int val) : data(val), next(NULL) {}
};
```

## Queue Class Definition

```cpp
class Queue {
private:
    Node* front;    // Points to first element (to dequeue)
    Node* rear;     // Points to last element (to enqueue)
    int size;       // Number of elements
    
public:
    Queue() : front(NULL), rear(NULL), size(0) {}
    
    // CORE OPERATIONS:
    void enqueue(int val);  // Add to rear: O(1)
    int dequeue();          // Remove from front: O(1)
    int peek();             // See front: O(1)
    bool isEmpty();         // Check empty: O(1)
    int getSize();          // Get size: O(1)
    void display();         // Print all: O(n)
};
```

## Memory Visualization

```
Empty Queue:
front = NULL
rear = NULL

After enqueue(5):
┌─────────────────┐
│ data: 5         │  ← front AND rear
│ next: NULL      │
└─────────────────┘

After enqueue(10):
┌─────────────────┐         ┌──────────────────┐
│ data: 5         │────────▶│ data: 10         │  ← rear
│ next: ──────────┤         │ next: NULL       │
└─────────────────┘         └──────────────────┘
      ↑ front

After enqueue(15):
┌─────────────────┐         ┌──────────────────┐         ┌──────────────────┐
│ data: 5         │────────▶│ data: 10         │────────▶│ data: 15         │  ← rear
│ next: ──────────┤         │ next: ──────────┤         │ next: NULL       │
└─────────────────┘         └──────────────────┘         └──────────────────┘
      ↑ front

Queue: [5 (front), 10, 15 (rear)]
```

---

# 🔴 QUEUE OPERATIONS

## Enqueue (Add to Rear)

**Algorithm:**
```
1. Create new node
2. If empty: set both front and rear to new node
3. Otherwise: link rear to new node, update rear
4. Increment size
```

**Code:**
```cpp
void enqueue(int val) {
    Node* newNode = new Node(val);
    
    if (isEmpty()) {
        front = rear = newNode;
    } else {
        rear->next = newNode;
        rear = newNode;
    }
    
    size++;
}
```

**Complexity:**
- Time: O(1)
- Space: O(1)

## Dequeue (Remove from Front)

**Algorithm:**
```
1. Check if empty
2. Store front node
3. Move front to next
4. Delete old front
5. If queue empty, update rear
6. Decrement size
```

**Code:**
```cpp
int dequeue() {
    if (isEmpty()) {
        cout << "Queue Underflow!" << endl;
        return -1;
    }
    
    Node* temp = front;
    int val = temp->data;
    front = front->next;
    
    if (front == NULL) {
        rear = NULL;
    }
    
    delete temp;
    size--;
    
    return val;
}
```

**Complexity:**
- Time: O(1)
- Space: O(1)

---

# 🎯 COMPLETE QUEUE IMPLEMENTATION

```cpp
#include <iostream>
using namespace std;

struct Node {
    int data;
    Node* next;
    Node(int val) : data(val), next(NULL) {}
};

class Queue {
private:
    Node* front;
    Node* rear;
    int size;
    
public:
    Queue() : front(NULL), rear(NULL), size(0) {
        cout << "Queue created (empty)" << endl;
    }
    
    ~Queue() {
        while (!isEmpty()) {
            dequeue();
        }
        cout << "Queue destroyed" << endl;
    }
    
    void enqueue(int val) {
        cout << "Enqueuing " << val << "..." << endl;
        
        Node* newNode = new Node(val);
        
        if (isEmpty()) {
            front = rear = newNode;
            cout << "  Queue was empty. Set as both front and rear." << endl;
        } else {
            rear->next = newNode;
            rear = newNode;
            cout << "  Added to rear." << endl;
        }
        
        size++;
        cout << "  Size now: " << size << endl;
    }
    
    int dequeue() {
        if (isEmpty()) {
            cout << "Queue Underflow! Cannot dequeue." << endl;
            return -1;
        }
        
        cout << "Dequeuing..." << endl;
        
        Node* temp = front;
        int val = temp->data;
        front = front->next;
        
        if (front == NULL) {
            rear = NULL;
            cout << "  Queue now empty. Reset rear." << endl;
        }
        
        delete temp;
        size--;
        
        cout << "  Dequeued " << val << ". Size now: " << size << endl;
        return val;
    }
    
    int peek() {
        if (isEmpty()) {
            cout << "Queue is empty!" << endl;
            return -1;
        }
        
        cout << "Front element is: " << front->data << endl;
        return front->data;
    }
    
    bool isEmpty() {
        return size == 0;
    }
    
    int getSize() {
        return size;
    }
    
    void display() {
        if (isEmpty()) {
            cout << "Queue is empty!" << endl;
            return;
        }
        
        cout << "\n=== QUEUE DISPLAY ===" << endl;
        cout << "Queue (Front to Rear): ";
        
        Node* curr = front;
        while (curr != NULL) {
            cout << "[" << curr->data << "]";
            if (curr->next != NULL) cout << " → ";
            curr = curr->next;
        }
        
        cout << endl;
        cout << "Size: " << size << endl;
        cout << "====================\n" << endl;
    }
};

// TEST 1: Basic Operations
void test1_BasicOperations() {
    cout << "\n========== TEST 1: Basic Operations ==========\n";
    
    Queue q;
    
    q.enqueue(10);
    q.enqueue(20);
    q.enqueue(30);
    q.enqueue(40);
    
    q.display();
    
    q.peek();
    
    cout << "\nDequeuing:" << endl;
    q.dequeue();
    q.dequeue();
    
    q.display();
}

// TEST 2: Empty Dequeue
void test2_EmptyDequeue() {
    cout << "\n========== TEST 2: Empty Dequeue ==========\n";
    
    Queue q;
    
    q.enqueue(100);
    cout << "\nDequeuing from queue with 1 element:" << endl;
    q.dequeue();
    
    cout << "\nTrying to dequeue from empty:" << endl;
    q.dequeue();
    
    q.display();
}

// TEST 3: FIFO Order
void test3_FIFOOrder() {
    cout << "\n========== TEST 3: FIFO Order ==========\n";
    
    Queue q;
    
    cout << "Enqueuing 1, 2, 3, 4, 5:" << endl;
    for (int i = 1; i <= 5; i++) {
        q.enqueue(i);
    }
    
    q.display();
    
    cout << "Dequeuing (should be 1, 2, 3, 4, 5 in order):" << endl;
    for (int i = 1; i <= 5; i++) {
        int val = q.dequeue();
        cout << "Got: " << val << " (expected: " << i << ") " 
             << (val == i ? "✓" : "✗") << endl;
    }
}

// TEST 4: Mixed Operations
void test4_MixedOps() {
    cout << "\n========== TEST 4: Mixed Operations ==========\n";
    
    Queue q;
    
    q.enqueue(10);
    q.enqueue(20);
    q.display();
    
    q.dequeue();
    q.display();
    
    q.enqueue(30);
    q.enqueue(40);
    q.display();
    
    q.peek();
}

int main() {
    test1_BasicOperations();
    test2_EmptyDequeue();
    test3_FIFOOrder();
    test4_MixedOps();
    
    return 0;
}
```

## Output

```
========== TEST 1: Basic Operations ==========

Queue created (empty)
Enqueuing 10...
  Queue was empty. Set as both front and rear.
  Size now: 1
Enqueuing 20...
  Added to rear.
  Size now: 2
Enqueuing 30...
  Added to rear.
  Size now: 3
Enqueuing 40...
  Added to rear.
  Size now: 4

=== QUEUE DISPLAY ===
Queue (Front to Rear): [10] → [20] → [30] → [40]
Size: 4
====================

Front element is: 10

Dequeuing:
Dequeuing...
  Dequeued 10. Size now: 3
Dequeuing...
  Dequeued 20. Size now: 2

=== QUEUE DISPLAY ===
Queue (Front to Rear): [30] → [40]
Size: 2
====================
```

---

# 🟣 CIRCULAR QUEUE (Alternative)

## Problem with Linear Queue

```
Linear Queue (Array):
Array: [10, 20, 30, ?, ?, ?, ?, ?]
       front=0         rear=2

After several dequeues:
Array: [?, ?, ?, ?, ?, ?, ?, ?]
       front=3         rear=5

Problem: Space at beginning wasted!
```

## Circular Queue Solution

```cpp
class CircularQueue {
private:
    int* arr;
    int front, rear, capacity, size;
    
public:
    CircularQueue(int cap) {
        capacity = cap;
        arr = new int[cap];
        front = rear = -1;
        size = 0;
    }
    
    void enqueue(int val) {
        if (size == capacity) {
            cout << "Queue Full!" << endl;
            return;
        }
        
        if (front == -1) front = 0;
        
        rear = (rear + 1) % capacity;
        arr[rear] = val;
        size++;
    }
    
    int dequeue() {
        if (size == 0) {
            cout << "Queue Empty!" << endl;
            return -1;
        }
        
        int val = arr[front];
        size--;
        
        if (size == 0) {
            front = rear = -1;
        } else {
            front = (front + 1) % capacity;
        }
        
        return val;
    }
};
```

---

# 📝 PRACTICE QUESTIONS (THURSDAY)

**Q1:** What does FIFO mean?  
**A1:** First In, First Out. First element added is first removed.

**Q2:** What's time complexity of enqueue/dequeue?  
**A2:** O(1) for both - just pointer operations.

**Q3:** Why update rear in enqueue?  
**A3:** To maintain pointer to last element for next enqueue.

**Q4:** What if we forget to update rear when dequeuing?  
**A4:** Queue becomes broken - rear points to deleted element.

**Q5:** Difference between stack and queue?  
**A5:** Stack is LIFO (remove from top), Queue is FIFO (remove from front).

**Q6:** When to use queue?  
**A6:** BFS, scheduling, job queues, fair ordering.

**Q7:** What's circular queue advantage?  
**A7:** Reuses space instead of wasting front space.

---

# ✅ THURSDAY CHECKLIST

- [x] Understand FIFO concept
- [x] Know all operations (enqueue, dequeue, peek)
- [x] All operations are O(1)
- [x] Implement queue from scratch
- [x] Handle front and rear pointers correctly
- [x] Understand circular queue
- [x] Test all operations
- [x] Compare with stack

---

**THURSDAY COMPLETE** ✅

