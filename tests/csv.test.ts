import { expect, test } from 'vitest';
import { escapeCsvField } from '../app/utils/csv';

test('escapeCsvField handles commas and quotes correctly', () => {
  expect(escapeCsvField('hello')).toBe('hello');
  expect(escapeCsvField('hello, world')).toBe('"hello, world"');
  expect(escapeCsvField('he said "hi"')).toBe('"he said ""hi"""');
  expect(escapeCsvField(null)).toBe('');
  expect(escapeCsvField(123)).toBe('123');
});

test('escapeCsvField handles newlines and CRLF correctly', () => {
  expect(escapeCsvField('line1\nline2')).toBe('"line1\nline2"');
  expect(escapeCsvField('line1\rline2')).toBe('"line1\rline2"');
  expect(escapeCsvField('line1\r\nline2')).toBe('"line1\r\nline2"');
});
