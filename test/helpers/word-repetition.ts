/**
 * Pure helpers mirroring backend word non-repetition behavior.
 * Used by Playwright regression tests — keep in sync with:
 * - backend/src/word-generation/index.js (selectWord, getRecentWords window)
 * - backend/src/ai-word-generation/index.js (avoidWords, generateUniqueWord)
 * - backend/src/get-todays-word/index.js (buildAIPrompt exclude slice)
 */

export function filterWordBankByExcludedIds<T extends { wordId: string }>(
  words: T[],
  excludeWordIds: string[]
): T[] {
  if (!excludeWordIds.length) return words;
  return words.filter((w) => !excludeWordIds.includes(w.wordId));
}

export function normalizeWordForComparison(word: string): string {
  return word.trim().toLowerCase();
}

/** Same idea as ai-word-generation: Set of lowercased spellings to reject. */
export function buildAvoidWordsSetFromHistory(recentWordStrings: string[]): Set<string> {
  return new Set(
    recentWordStrings.map((w) => normalizeWordForComparison(w)).filter(Boolean)
  );
}

export function isWordInAvoidSet(word: string, avoidWords: Set<string>): boolean {
  return avoidWords.has(normalizeWordForComparison(word));
}

/**
 * get-todays-word buildAIPrompt: last 30 strings in prompt.
 */
export function buildGetTodaysWordExcludePromptSuffix(
  excludeWords: string[],
  maxInPrompt = 30
): string {
  if (!excludeWords.length) return '';
  const slice = excludeWords.slice(-maxInPrompt);
  return `\n\nDo NOT use these recently used words: ${slice.join(', ')}`;
}

/**
 * ai-word-generation buildPrompt: first 100 from Set in prompt.
 */
export function buildAiWordGenAvoidPromptSuffix(
  avoidWords: Set<string>,
  maxCount = 100
): string {
  if (!avoidWords.size) return '';
  const list = Array.from(avoidWords).slice(0, maxCount).join(', ');
  return `\nAvoid these words (already generated for this user): ${list}`;
}

/** Simulates generateUniqueWord retry: pick first LLM output not in avoid set (maxAttempts). */
export function pickFirstNonDuplicateFromAttempts(
  attempts: Array<{ word: string } | null>,
  avoidWords: Set<string>,
  maxAttempts = 5
): { word: string } | null {
  let count = 0;
  for (const wordData of attempts) {
    if (count >= maxAttempts) break;
    count += 1;
    if (!wordData?.word) continue;
    const normalized = normalizeWordForComparison(wordData.word);
    if (avoidWords.has(normalized)) continue;
    return wordData;
  }
  return null;
}
