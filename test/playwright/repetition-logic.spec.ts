/**
 * Regression tests for word non-repetition logic (mirrors backend behavior).
 * @see test/fixtures/REPETITION_REGRESSION_CASES.md
 */
import { test, expect } from '@playwright/test';
import {
  filterWordBankByExcludedIds,
  normalizeWordForComparison,
  buildAvoidWordsSetFromHistory,
  isWordInAvoidSet,
  buildGetTodaysWordExcludePromptSuffix,
  buildAiWordGenAvoidPromptSuffix,
  pickFirstNonDuplicateFromAttempts,
} from '../helpers/word-repetition';

test.describe('Word bank exclusion (W1–W3)', () => {
  test('W1: empty exclude list leaves all words', () => {
    const words = [
      { wordId: 'a', word: 'alpha' },
      { wordId: 'b', word: 'beta' },
    ];
    expect(filterWordBankByExcludedIds(words, [])).toHaveLength(2);
  });

  test('W2: excludes matching wordIds', () => {
    const words = [
      { wordId: 'id1', word: 'one' },
      { wordId: 'id2', word: 'two' },
      { wordId: 'id3', word: 'three' },
    ];
    const out = filterWordBankByExcludedIds(words, ['id2']);
    expect(out.map((w) => w.wordId)).toEqual(['id1', 'id3']);
  });

  test('W3: all excluded yields empty pool', () => {
    const words = [{ wordId: 'x', word: 'only' }];
    expect(filterWordBankByExcludedIds(words, ['x'])).toHaveLength(0);
  });
});

test.describe('Avoid set / duplicate detection (A1–A2)', () => {
  test('A1: history lowercased in Set', () => {
    const set = buildAvoidWordsSetFromHistory(['Hello', 'WORLD', '  mixed  ']);
    expect(set.has('hello')).toBe(true);
    expect(set.has('world')).toBe(true);
    expect(set.has('mixed')).toBe(true);
  });

  test('A2: isWordInAvoidSet case-insensitive', () => {
    const set = new Set(['ephemeral']);
    expect(isWordInAvoidSet('Ephemeral', set)).toBe(true);
    expect(isWordInAvoidSet('newword', set)).toBe(false);
  });

  test('normalizeWordForComparison trims and lowercases', () => {
    expect(normalizeWordForComparison('  AbC  ')).toBe('abc');
  });
});

test.describe('get-todays-word AI prompt suffix (G1–G2)', () => {
  test('G1: uses last 30 words only in suffix', () => {
    const many = Array.from({ length: 40 }, (_, i) => `w${i}`);
    const suffix = buildGetTodaysWordExcludePromptSuffix(many, 30);
    expect(suffix).toContain('w10');
    expect(suffix).toContain('w39');
    expect(suffix).not.toContain('w9');
  });

  test('G2: empty history → empty suffix', () => {
    expect(buildGetTodaysWordExcludePromptSuffix([])).toBe('');
  });
});

test.describe('ai-word-generation prompt suffix (A3)', () => {
  test('A3: caps avoid list at 100 entries', () => {
    const set = new Set(Array.from({ length: 150 }, (_, i) => `word${i}`));
    const suffix = buildAiWordGenAvoidPromptSuffix(set, 100);
    const matches = suffix.match(/word\d+/g) || [];
    expect(matches.length).toBeLessThanOrEqual(100);
    expect(suffix).toContain('word0');
    expect(suffix).not.toContain('word149');
  });
});

test.describe('generateUniqueWord retry simulation', () => {
  test('skips duplicates until first fresh word', () => {
    const avoid = buildAvoidWordsSetFromHistory(['used', 'old']);
    const attempts = [
      { word: 'used' },
      { word: 'old' },
      { word: 'fresh' },
    ];
    const picked = pickFirstNonDuplicateFromAttempts(attempts, avoid, 5);
    expect(picked?.word).toBe('fresh');
  });

  test('returns null when all attempts are duplicates', () => {
    const avoid = buildAvoidWordsSetFromHistory(['a', 'b']);
    const picked = pickFirstNonDuplicateFromAttempts([{ word: 'a' }, { word: 'b' }], avoid, 5);
    expect(picked).toBeNull();
  });
});
