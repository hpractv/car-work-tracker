import { expect, test } from 'vitest';
import { escapeCsvField } from '../app/utils/csv';

test('escapeCsvField handles commas and quotes correctly', () => {
  expect(escapeCsvField('hello')).toBe('hello');
  expect(escapeCsvField('hello, world')).toBe('"hello, world"');
  expect(escapeCsvField('he said "hi"')).toBe('"he said ""hi"""');
  expect(escapeCsvField(null)).toBe('');
  expect(escapeCsvField(123)).toBe('123');
});
