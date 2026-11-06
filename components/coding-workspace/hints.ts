import type { Difficulty, DsaTopic } from "@/lib/coding/types";

// Contextual hints shown for the "Hint" button. These are generic, safe
// algorithmic guidance keyed off the problem's topic and difficulty — they
// never give away the full solution.

const TOPIC_HINTS: Record<DsaTopic, string[]> = {
  ARRAYS: [
    "Try walking a sliding window or two-pointer across the array — many array problems are O(n) with one pass.",
    "If the array is sorted, binary search often turns an O(n) scan into O(log n).",
    "Consider whether a prefix-sum or running-aggregate array helps you answer range questions in O(1).",
  ],
  VECTORS: [
    "A vector is just a dynamically-sized array — same techniques apply (pointers, sliding window, sorting).",
    "Mind the resize cost: repeated insertions at the back are amortized O(1), but inserts in the middle shift elements.",
  ],
  STRINGS: [
    "Build strings with a character array or builder instead of repeated concatenation when performance matters.",
    "For substring/palindrome questions, two pointers inward from the ends often beats nested loops.",
    "Check if a hash map of character counts helps find anagrams or first-unique characters.",
  ],
  LINKED_LISTS: [
    "To find a middle node or detect a cycle, use Floyd's slow/fast pointer technique.",
    "Dummy/head sentinel nodes remove edge-case handling for head insertions and deletions.",
    "Reversing a list in place is iterative — keep three pointers (prev, current, next).",
  ],
  STACKS: [
    "Think about when an 'unresolved' element must wait for a future element — that's a classic stack signal.",
    "Monotonic stacks are great for next-greater / next-smaller problems in O(n).",
    "Parentheses matching is naturally a stack problem.",
  ],
  QUEUES: [
    "BFS on a graph/tree uses a queue — process level by level.",
    "A deque (double-ended queue) supports the monotonic-queue sliding-window maximum pattern.",
  ],
  TREES: [
    "Recursion fits tree traversal naturally; the recursive call stack mirrors the tree depth.",
    "For 'level order' or distance problems, prefer BFS with a queue.",
    "A recursive helper that returns (height, balanced) can solve many 'valid BST / balanced' checks in one pass.",
  ],
  GRAPHS: [
    "For shortest path on unweighted graphs use BFS; for weighted graphs consider Dijkstra.",
    "Cycle detection / connectivity often uses union-find (disjoint set) or DFS with a visited set.",
    "Count connected components with a simple DFS/BFS flood fill.",
  ],
  DYNAMIC_PROGRAMMING: [
    "Define dp[i] (or dp[i][j]) as the answer to the sub-problem ending at i — state is everything.",
    "Write the brute-force recursion first, then memoize; the DP table usually mirrors the recursion parameters.",
    "Check the transition: each state should depend only on already-computed smaller states.",
  ],
  SORTING_SEARCHING: [
    "Sorting is often a stepping stone: many problems become easy once the input is sorted.",
    "Binary search needs a monotonic predicate — find the condition that is false then true.",
    "Think about the right complexity: O(n log n) for sort+binary-search is fine for 1e5 inputs.",
  ],
  FUNDAMENTAL: [
    "Write out the simplest brute force first, then look for repeated work to eliminate.",
    "Draw a small example by hand to find the pattern before coding.",
  ],
  OTHER: [
    "Start with a brute-force solution that definitely works, then optimize only the hot path.",
    "Break the problem into smaller sub-problems and solve each independently.",
  ],
};

const DIFFICULTY_HINTS: Record<Difficulty, string[]> = {
  EASY: [
    "A straightforward single pass or a simple data structure (set/map) is usually enough.",
  ],
  MEDIUM: [
    "Expect to use a smarter technique — two pointers, a hash map, or a stack — not just nested loops.",
    "Check constraints to infer the target complexity before you commit to an algorithm.",
  ],
  HARD: [
    "This likely needs a classic advanced pattern: DP, graphs, or a clever data structure.",
    "Think carefully about edge cases and invariants before writing code.",
  ],
};

export function getHints(topic: DsaTopic, difficulty: Difficulty): string[] {
  const topicHints = TOPIC_HINTS[topic] ?? TOPIC_HINTS.OTHER;
  const difficultyHints = DIFFICULTY_HINTS[difficulty];
  return [...difficultyHints, ...topicHints];
}
