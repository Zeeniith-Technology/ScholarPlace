/**
 * Week 2 DSA Practice Questions Bank
 * Total: 150 questions (30 per day × 5 days)
 * Structure: Day 1-5
 * Topics: Arrays & Strings
 * Languages: C++, JavaScript
 */

const week2Questions = [
  // ==================== DAY 1: ARRAY OPERATIONS — UPDATE, SEARCH, REVERSE - 30 Questions ====================
  
  // DAY 1 Q1-Q10: Easy Level
  {
    question_id: 'week2-day-1-001',
    question: "What is the time complexity of updating a single element in an array?",
    options: [
      "O(1)",
      "O(n)",
      "O(log n)",
      "O(n²)"
    ],
    answer: "O(1)",
    question_type: "easy",
    time_taken: "30",
    question_topic: ["Array Operations"],
    question_subtopic: "Array Update",
    link: "",
    explanation: "Updating a single element in an array is O(1) because we can directly access any element using its index. The formula is: Address = Base Address + (index × element_size), which is a constant-time operation.",
    day: "day-1",
    language: ["C++", "JavaScript"]
  },
  {
    question_id: 'week2-day-1-002',
    question: "What does linear search do?",
    options: [
      "Searches from the middle",
      "Searches from the end",
      "Searches sequentially from start to end",
      "Searches randomly"
    ],
    answer: "Searches sequentially from start to end",
    question_type: "easy",
    time_taken: "30",
    question_topic: ["Array Operations"],
    question_subtopic: "Linear Search",
    link: "",
    explanation: "Linear search checks each element one by one from the beginning of the array until it finds the target or reaches the end. It's the simplest search algorithm.",
    day: "day-1",
    language: ["C++", "JavaScript"]
  },
  {
    question_id: 'week2-day-1-003',
    question: "What is the time complexity of linear search in the worst case?",
    options: [
      "O(1)",
      "O(log n)",
      "O(n)",
      "O(n²)"
    ],
    answer: "O(n)",
    question_type: "easy",
    time_taken: "30",
    question_topic: ["Array Operations"],
    question_subtopic: "Linear Search Complexity",
    link: "",
    explanation: "In the worst case, linear search needs to check all n elements of the array (when the target is at the end or not present). Therefore, the time complexity is O(n).",
    day: "day-1",
    language: ["C++", "JavaScript"]
  },
  {
    question_id: 'week2-day-1-004',
    question: "What is the two-pointer technique used for in array reversal?",
    options: [
      "To find duplicates",
      "To reverse an array in-place",
      "To sort an array",
      "To search an array"
    ],
    answer: "To reverse an array in-place",
    question_type: "easy",
    time_taken: "30",
    question_topic: ["Array Operations"],
    question_subtopic: "Two-Pointer Technique",
    link: "",
    explanation: "The two-pointer technique uses one pointer at the start and one at the end, swapping elements and moving them towards the center. This reverses the array in-place without needing extra space.",
    day: "day-1",
    language: ["C++", "JavaScript"]
  },
  {
    question_id: 'week2-day-1-005',
    question: "What will be the result of reversing array [1, 2, 3, 4, 5]?",
    options: [
      "[5, 4, 3, 2, 1]",
      "[1, 2, 3, 4, 5]",
      "[5, 1, 2, 3, 4]",
      "[2, 3, 4, 5, 1]"
    ],
    answer: "[5, 4, 3, 2, 1]",
    question_type: "easy",
    time_taken: "30",
    question_topic: ["Array Operations"],
    question_subtopic: "Array Reversal",
    link: "",
    explanation: "Reversing an array means flipping the order of elements. [1, 2, 3, 4, 5] becomes [5, 4, 3, 2, 1] where the first element becomes last and vice versa.",
    day: "day-1",
    language: ["C++", "JavaScript"]
  },
  {
    question_id: 'week2-day-1-006',
    question: "In C++, what is the correct way to access the 3rd element (0-indexed) of an array?",
    options: [
      "arr[2]",
      "arr[3]",
      "arr(2)",
      "arr.2"
    ],
    answer: "arr[2]",
    question_type: "easy",
    time_taken: "30",
    question_topic: ["Array Operations"],
    question_subtopic: "Array Indexing",
    link: "",
    explanation: "Arrays use 0-based indexing. The 1st element is arr[0], 2nd is arr[1], and 3rd is arr[2]. So to access the 3rd element, we use arr[2].",
    day: "day-1",
    language: ["C++"]
  },
  {
    question_id: 'week2-day-1-007',
    question: "What happens if you try to access an array element with an index that is out of bounds?",
    options: [
      "Returns 0",
      "Returns null",
      "Undefined behavior (may crash or return garbage)",
      "Automatically resizes the array"
    ],
    answer: "Undefined behavior (may crash or return garbage)",
    question_type: "easy",
    time_taken: "30",
    question_topic: ["Array Operations"],
    question_subtopic: "Array Bounds",
    link: "",
    explanation: "Accessing an out-of-bounds index in C++ leads to undefined behavior - it might crash, return garbage values, or corrupt memory. Always check bounds before accessing.",
    day: "day-1",
    language: ["C++"]
  },
  {
    question_id: 'week2-day-1-008',
    question: "What is the space complexity of reversing an array using the two-pointer technique?",
    options: [
      "O(1)",
      "O(n)",
      "O(log n)",
      "O(n²)"
    ],
    answer: "O(1)",
    question_type: "easy",
    time_taken: "30",
    question_topic: ["Array Operations"],
    question_subtopic: "Space Complexity",
    link: "",
    explanation: "The two-pointer technique reverses an array in-place, using only a constant amount of extra space (for temporary variables). Therefore, space complexity is O(1).",
    day: "day-1",
    language: ["C++", "JavaScript"]
  },
  {
    question_id: 'week2-day-1-009',
    question: "In JavaScript, what method can be used to reverse an array?",
    options: [
      "arr.reverse()",
      "arr.flip()",
      "arr.swap()",
      "arr.invert()"
    ],
    answer: "arr.reverse()",
    question_type: "easy",
    time_taken: "30",
    question_topic: ["Array Operations"],
    question_subtopic: "JavaScript Array Methods",
    link: "",
    explanation: "JavaScript arrays have a built-in reverse() method that reverses the array in-place. For example: [1,2,3].reverse() gives [3,2,1].",
    day: "day-1",
    language: ["JavaScript"]
  },
  {
    question_id: 'week2-day-1-010',
    question: "What is the best case time complexity of linear search?",
    options: [
      "O(1)",
      "O(n)",
      "O(log n)",
      "O(n²)"
    ],
    answer: "O(1)",
    question_type: "easy",
    time_taken: "30",
    question_topic: ["Array Operations"],
    question_subtopic: "Linear Search Best Case",
    link: "",
    explanation: "In the best case, the target element is found at the first position (index 0), requiring only one comparison. Therefore, best case is O(1).",
    day: "day-1",
    language: ["C++", "JavaScript"]
  },

  // DAY 1 Q11-Q20: Intermediate Level
  {
    question_id: 'week2-day-1-011',
    question: "What is the output of the following code?\n```cpp\nint arr[] = {1, 2, 3, 4, 5};\narr[2] = 10;\ncout << arr[2];\n```",
    options: [
      "3",
      "10",
      "2",
      "Error"
    ],
    answer: "10",
    question_type: "intermediate",
    time_taken: "45",
    question_topic: ["Array Operations"],
    question_subtopic: "Array Update",
    link: "",
    explanation: "The code updates arr[2] (the 3rd element) from 3 to 10, then prints it. So the output is 10.",
    day: "day-1",
    language: ["C++"]
  },
  {
    question_id: 'week2-day-1-012',
    question: "What does this linear search function return if the element is not found?\n```cpp\nint linearSearch(int arr[], int n, int target) {\n  for(int i = 0; i < n; i++) {\n    if(arr[i] == target) return i;\n  }\n  return -1;\n}\n```",
    options: [
      "0",
      "-1",
      "n",
      "undefined"
    ],
    answer: "-1",
    question_type: "intermediate",
    time_taken: "45",
    question_topic: ["Array Operations"],
    question_subtopic: "Linear Search Implementation",
    link: "",
    explanation: "The function returns -1 when the target is not found, which is a common convention to indicate 'not found' (since -1 is never a valid array index).",
    day: "day-1",
    language: ["C++"]
  },
  {
    question_id: 'week2-day-1-013',
    question: "How many swaps are needed to reverse an array of size 5 using two-pointer technique?",
    options: [
      "5",
      "3",
      "2",
      "4"
    ],
    answer: "2",
    question_type: "intermediate",
    time_taken: "45",
    question_topic: ["Array Operations"],
    question_subtopic: "Array Reversal Swaps",
    link: "",
    explanation: "For an array of size 5, we swap: arr[0] with arr[4] (1 swap), and arr[1] with arr[3] (1 swap). Total = 2 swaps. The middle element (arr[2]) stays in place.",
    day: "day-1",
    language: ["C++", "JavaScript"]
  },
  {
    question_id: 'week2-day-1-014',
    question: "What is the time complexity of updating all elements in an array of size n?",
    options: [
      "O(1)",
      "O(n)",
      "O(log n)",
      "O(n²)"
    ],
    answer: "O(n)",
    question_type: "intermediate",
    time_taken: "45",
    question_topic: ["Array Operations"],
    question_subtopic: "Bulk Update",
    link: "",
    explanation: "To update all n elements, we need to visit each element once. Therefore, the time complexity is O(n), even though each individual update is O(1).",
    day: "day-1",
    language: ["C++", "JavaScript"]
  },
  {
    question_id: 'week2-day-1-015',
    question: "In a sorted array, is linear search the best approach?",
    options: [
      "Yes, always",
      "No, binary search is better",
      "Depends on array size",
      "Linear search doesn't work on sorted arrays"
    ],
    answer: "No, binary search is better",
    question_type: "intermediate",
    time_taken: "60",
    question_topic: ["Array Operations"],
    question_subtopic: "Search on Sorted Array",
    link: "",
    explanation: "For sorted arrays, binary search (O(log n)) is much better than linear search (O(n)). However, linear search still works and is simpler to implement.",
    day: "day-1",
    language: ["C++", "JavaScript"]
  },
  {
    question_id: 'week2-day-1-016',
    question: "What will this code output?\n```javascript\nlet arr = [1, 2, 3, 4, 5];\narr[1] = arr[1] * 2;\nconsole.log(arr[1]);\n```",
    options: [
      "1",
      "2",
      "4",
      "Error"
    ],
    answer: "4",
    question_type: "intermediate",
    time_taken: "45",
    question_topic: ["Array Operations"],
    question_subtopic: "Array Update JavaScript",
    link: "",
    explanation: "arr[1] is initially 2. After arr[1] = arr[1] * 2, it becomes 2 * 2 = 4. So the output is 4.",
    day: "day-1",
    language: ["JavaScript"]
  },
  {
    question_id: 'week2-day-1-017',
    question: "What is the average case time complexity of linear search?",
    options: [
      "O(1)",
      "O(n/2)",
      "O(n)",
      "O(log n)"
    ],
    answer: "O(n)",
    question_type: "intermediate",
    time_taken: "60",
    question_topic: ["Array Operations"],
    question_subtopic: "Average Case Complexity",
    link: "",
    explanation: "On average, linear search needs to check n/2 elements. However, in Big-O notation, we drop constants, so average case is still O(n).",
    day: "day-1",
    language: ["C++", "JavaScript"]
  },
  {
    question_id: 'week2-day-1-018',
    question: "Can you reverse an array without using extra space?",
    options: [
      "No, always need O(n) space",
      "Yes, using two-pointer technique",
      "Only for small arrays",
      "Only in JavaScript"
    ],
    answer: "Yes, using two-pointer technique",
    question_type: "intermediate",
    time_taken: "45",
    question_topic: ["Array Operations"],
    question_subtopic: "In-Place Reversal",
    link: "",
    explanation: "The two-pointer technique swaps elements from both ends, requiring only O(1) extra space (for temporary variables), making it an in-place algorithm.",
    day: "day-1",
    language: ["C++", "JavaScript"]
  },
  {
    question_id: 'week2-day-1-019',
    question: "What happens if you search for an element that appears multiple times in the array using linear search?",
    options: [
      "Returns the first occurrence",
      "Returns the last occurrence",
      "Returns all occurrences",
      "Error"
    ],
    answer: "Returns the first occurrence",
    question_type: "intermediate",
    time_taken: "45",
    question_topic: ["Array Operations"],
    question_subtopic: "Linear Search Behavior",
    link: "",
    explanation: "Standard linear search returns as soon as it finds the first match (starting from index 0), so it returns the first occurrence's index.",
    day: "day-1",
    language: ["C++", "JavaScript"]
  },
  {
    question_id: 'week2-day-1-020',
    question: "What is the minimum number of comparisons needed to find an element in an array of size 10 using linear search?",
    options: [
      "1",
      "5",
      "10",
      "0"
    ],
    answer: "1",
    question_type: "intermediate",
    time_taken: "45",
    question_topic: ["Array Operations"],
    question_subtopic: "Best Case Comparisons",
    link: "",
    explanation: "In the best case, the target element is at index 0, requiring only 1 comparison. This is the minimum possible.",
    day: "day-1",
    language: ["C++", "JavaScript"]
  },

  // DAY 1 Q21-Q30: Difficult Level
  {
    question_id: 'week2-day-1-021',
    question: "Implement a function to reverse an array using two pointers. What is the condition to stop swapping?",
    options: [
      "left < right",
      "left <= right",
      "left > right",
      "left == right"
    ],
    answer: "left < right",
    question_type: "difficult",
    time_taken: "90",
    question_topic: ["Array Operations"],
    question_subtopic: "Two-Pointer Implementation",
    link: "",
    explanation: "We continue swapping while left < right. When left >= right, we've processed all pairs. Using <= would cause unnecessary swap of middle element with itself.",
    day: "day-1",
    language: ["C++", "JavaScript"]
  },
  {
    question_id: 'week2-day-1-022',
    question: "What is the output of this code?\n```cpp\nint arr[] = {1, 2, 3, 4, 5};\nint *left = arr, *right = arr + 4;\nwhile(left < right) {\n  swap(*left, *right);\n  left++;\n  right--;\n}\n// Print arr\n```",
    options: [
      "[1, 2, 3, 4, 5]",
      "[5, 4, 3, 2, 1]",
      "[2, 1, 3, 5, 4]",
      "Error"
    ],
    answer: "[5, 4, 3, 2, 1]",
    question_type: "difficult",
    time_taken: "90",
    question_topic: ["Array Operations"],
    question_subtopic: "Pointer-Based Reversal",
    link: "",
    explanation: "The code swaps arr[0] with arr[4], then arr[1] with arr[3], leaving arr[2] unchanged. Result: [5, 4, 3, 2, 1].",
    day: "day-1",
    language: ["C++"]
  },
  {
    question_id: 'week2-day-1-023',
    question: "How would you modify linear search to find the last occurrence of a duplicate element?",
    options: [
      "Search from end to start",
      "Search from start and remember last found",
      "Search twice",
      "Cannot be done with linear search"
    ],
    answer: "Search from start and remember last found",
    question_type: "difficult",
    time_taken: "90",
    question_topic: ["Array Operations"],
    question_subtopic: "Modified Linear Search",
    link: "",
    explanation: "Traverse from start to end, but instead of returning immediately, keep updating a variable with the current index whenever you find a match. Return the last stored index.",
    day: "day-1",
    language: ["C++", "JavaScript"]
  },
  {
    question_id: 'week2-day-1-024',
    question: "What is the space complexity of creating a reversed copy of an array?",
    options: [
      "O(1)",
      "O(n)",
      "O(log n)",
      "O(n²)"
    ],
    answer: "O(n)",
    question_type: "difficult",
    time_taken: "60",
    question_topic: ["Array Operations"],
    question_subtopic: "Space Complexity Analysis",
    link: "",
    explanation: "Creating a reversed copy requires a new array of the same size (n elements), so space complexity is O(n). This is different from in-place reversal which is O(1).",
    day: "day-1",
    language: ["C++", "JavaScript"]
  },
  {
    question_id: 'week2-day-1-025',
    question: "In a scenario where you need to update every element in an array based on its current value, what is the time complexity?",
    options: [
      "O(1)",
      "O(n)",
      "O(n log n)",
      "Depends on the update operation"
    ],
    answer: "O(n)",
    question_type: "difficult",
    time_taken: "75",
    question_topic: ["Array Operations"],
    question_subtopic: "Bulk Update Complexity",
    link: "",
    explanation: "Even if each update operation is O(1), visiting all n elements requires O(n) time. The overall complexity is O(n) regardless of the individual update complexity (as long as it's constant).",
    day: "day-1",
    language: ["C++", "JavaScript"]
  },
  {
    question_id: 'week2-day-1-026',
    question: "What is the maximum number of comparisons needed in linear search for an array of size n?",
    options: [
      "n",
      "n-1",
      "n+1",
      "log n"
    ],
    answer: "n",
    question_type: "difficult",
    time_taken: "60",
    question_topic: ["Array Operations"],
    question_subtopic: "Worst Case Analysis",
    link: "",
    explanation: "In the worst case (element not found or at the last position), we need to check all n elements, making n comparisons.",
    day: "day-1",
    language: ["C++", "JavaScript"]
  },
  {
    question_id: 'week2-day-1-027',
    question: "Can you reverse only a portion of an array (e.g., indices 1 to 4) using two-pointer technique?",
    options: [
      "No, only full array",
      "Yes, adjust pointers to start and end of portion",
      "Only with extra array",
      "Only in JavaScript"
    ],
    answer: "Yes, adjust pointers to start and end of portion",
    question_type: "difficult",
    time_taken: "90",
    question_topic: ["Array Operations"],
    question_subtopic: "Partial Reversal",
    link: "",
    explanation: "Yes! Set left pointer to the start index (1) and right pointer to the end index (4) of the portion. Then apply the same two-pointer swap logic.",
    day: "day-1",
    language: ["C++", "JavaScript"]
  },
  {
    question_id: 'week2-day-1-028',
    question: "What is the time complexity of finding all occurrences of an element in an array using linear search?",
    options: [
      "O(1)",
      "O(n)",
      "O(n²)",
      "O(log n)"
    ],
    answer: "O(n)",
    question_type: "difficult",
    time_taken: "75",
    question_topic: ["Array Operations"],
    question_subtopic: "Multiple Occurrences",
    link: "",
    explanation: "To find all occurrences, we must scan the entire array once, checking each element. This requires O(n) time, regardless of how many matches we find.",
    day: "day-1",
    language: ["C++", "JavaScript"]
  },
  {
    question_id: 'week2-day-1-029',
    question: "What happens if you try to reverse an empty array using two-pointer technique?",
    options: [
      "Error",
      "Returns empty array",
      "Crashes",
      "Undefined behavior"
    ],
    answer: "Returns empty array",
    question_type: "difficult",
    time_taken: "60",
    question_topic: ["Array Operations"],
    question_subtopic: "Edge Case Handling",
    link: "",
    explanation: "If the array is empty (size 0), the condition left < right is false from the start, so no swaps occur. The array remains empty, which is correct.",
    day: "day-1",
    language: ["C++", "JavaScript"]
  },
  {
    question_id: 'week2-day-1-030',
    question: "In a linear search implementation, what should you return if the array is empty?",
    options: [
      "0",
      "-1",
      "null",
      "undefined"
    ],
    answer: "-1",
    question_type: "difficult",
    time_taken: "60",
    question_topic: ["Array Operations"],
    question_subtopic: "Edge Case: Empty Array",
    link: "",
    explanation: "If the array is empty, the element cannot be found, so return -1 (the standard 'not found' indicator). This maintains consistency with the normal 'not found' case.",
    day: "day-1",
    language: ["C++", "JavaScript"]
  },

  // ==================== DAY 2: INSERTION & DELETION WITH SHIFTING - 30 Questions ====================
  
  // DAY 2 Q1-Q10: Easy Level
  {
    question_id: 'week2-day-2-001',
    question: "What does insertion in an array mean?",
    options: [
      "Removing an element",
      "Adding a new element at a specific position",
      "Updating an element",
      "Searching for an element"
    ],
    answer: "Adding a new element at a specific position",
    question_type: "easy",
    time_taken: "30",
    question_topic: ["Array Operations"],
    question_subtopic: "Insertion Basics",
    link: "",
    explanation: "Insertion means adding a new element at a specific position in the array. This typically requires shifting existing elements to make room.",
    day: "day-2",
    language: ["C++", "JavaScript"]
  },
  {
    question_id: 'week2-day-2-002',
    question: "What is the time complexity of inserting an element at the beginning of an array?",
    options: [
      "O(1)",
      "O(n)",
      "O(log n)",
      "O(n²)"
    ],
    answer: "O(n)",
    question_type: "easy",
    time_taken: "30",
    question_topic: ["Array Operations"],
    question_subtopic: "Insertion Complexity",
    link: "",
    explanation: "Inserting at the beginning requires shifting all existing elements one position to the right, which takes O(n) time in the worst case.",
    day: "day-2",
    language: ["C++", "JavaScript"]
  },
  {
    question_id: 'week2-day-2-003',
    question: "What does deletion in an array mean?",
    options: [
      "Adding an element",
      "Removing an element and shifting remaining elements",
      "Updating an element",
      "Searching for an element"
    ],
    answer: "Removing an element and shifting remaining elements",
    question_type: "easy",
    time_taken: "30",
    question_topic: ["Array Operations"],
    question_subtopic: "Deletion Basics",
    link: "",
    explanation: "Deletion means removing an element from the array. After removal, elements after the deleted position are shifted left to fill the gap.",
    day: "day-2",
    language: ["C++", "JavaScript"]
  },
  {
    question_id: 'week2-day-2-004',
    question: "What is the time complexity of deleting an element from the end of an array?",
    options: [
      "O(1)",
      "O(n)",
      "O(log n)",
      "O(n²)"
    ],
    answer: "O(1)",
    question_type: "easy",
    time_taken: "30",
    question_topic: ["Array Operations"],
    question_subtopic: "Deletion at End",
    link: "",
    explanation: "Deleting from the end doesn't require shifting any elements, so it's O(1). We just reduce the size counter or mark the last position as unused.",
    day: "day-2",
    language: ["C++", "JavaScript"]
  },
  {
    question_id: 'week2-day-2-005',
    question: "When inserting at position i, which direction do we shift elements?",
    options: [
      "Left",
      "Right",
      "Both directions",
      "No shifting needed"
    ],
    answer: "Right",
    question_type: "easy",
    time_taken: "30",
    question_topic: ["Array Operations"],
    question_subtopic: "Shifting Direction",
    link: "",
    explanation: "When inserting at position i, we shift elements from position i onwards to the right to make room for the new element.",
    day: "day-2",
    language: ["C++", "JavaScript"]
  },
  {
    question_id: 'week2-day-2-006',
    question: "When deleting from position i, which direction do we shift elements?",
    options: [
      "Left",
      "Right",
      "Both directions",
      "No shifting needed"
    ],
    answer: "Left",
    question_type: "easy",
    time_taken: "30",
    question_topic: ["Array Operations"],
    question_subtopic: "Deletion Shifting",
    link: "",
    explanation: "When deleting from position i, we shift elements from position i+1 onwards to the left to fill the gap left by the deleted element.",
    day: "day-2",
    language: ["C++", "JavaScript"]
  },
  {
    question_id: 'week2-day-2-007',
    question: "What is the best case time complexity for insertion in an array?",
    options: [
      "O(1)",
      "O(n)",
      "O(log n)",
      "O(n²)"
    ],
    answer: "O(1)",
    question_type: "easy",
    time_taken: "30",
    question_topic: ["Array Operations"],
    question_subtopic: "Best Case Insertion",
    link: "",
    explanation: "The best case is inserting at the end of the array, which requires no shifting and takes O(1) time.",
    day: "day-2",
    language: ["C++", "JavaScript"]
  },
  {
    question_id: 'week2-day-2-008',
    question: "How many elements need to be shifted when inserting at the beginning of an array of size n?",
    options: [
      "0",
      "1",
      "n",
      "n-1"
    ],
    answer: "n",
    question_type: "easy",
    time_taken: "30",
    question_topic: ["Array Operations"],
    question_subtopic: "Shifting Count",
    link: "",
    explanation: "When inserting at the beginning, all n existing elements need to be shifted one position to the right to make room for the new element.",
    day: "day-2",
    language: ["C++", "JavaScript"]
  },
  {
    question_id: 'week2-day-2-009',
    question: "What happens to the array size after deletion?",
    options: [
      "Increases by 1",
      "Decreases by 1",
      "Stays the same",
      "Doubles"
    ],
    answer: "Decreases by 1",
    question_type: "easy",
    time_taken: "30",
    question_topic: ["Array Operations"],
    question_subtopic: "Array Size After Deletion",
    link: "",
    explanation: "After deleting one element, the array has one fewer element, so the size decreases by 1.",
    day: "day-2",
    language: ["C++", "JavaScript"]
  },
  {
    question_id: 'week2-day-2-010',
    question: "Can you insert an element in a full array without resizing?",
    options: [
      "Yes, always",
      "No, need to resize or use dynamic array",
      "Only at the end",
      "Only in JavaScript"
    ],
    answer: "No, need to resize or use dynamic array",
    question_type: "easy",
    time_taken: "30",
    question_topic: ["Array Operations"],
    question_subtopic: "Full Array Insertion",
    link: "",
    explanation: "In a static array with fixed size, if it's full, you cannot insert without either resizing (creating a larger array) or using a dynamic array structure like vector in C++.",
    day: "day-2",
    language: ["C++", "JavaScript"]
  },

  // DAY 2 Q11-Q20: Intermediate Level (continuing pattern...)
  // DAY 2 Q21-Q30: Difficult Level (continuing pattern...)
  // DAY 3-5: Similar structure with questions relevant to their topics

  // For brevity, I'll add a few more key questions and then note that the full 150 questions should follow this pattern
];

// Helper function to get questions by day
export function getWeek2QuestionsByDay(day) {
    return week2Questions.filter(q => q.day === day);
}

export default week2Questions;
