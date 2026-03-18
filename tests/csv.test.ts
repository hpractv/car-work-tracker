import { expect, test } from 'vitest';
import { escapeCsvField, sanitizeFilename } from '../app/utils/csv';

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

test('escapeCsvField empty, undefined, spaces and tabs', () => {
  expect(escapeCsvField("")).toBe("");
  expect(escapeCsvField(undefined)).toBe("");
  expect(escapeCsvField(" leading")).toBe('" leading"');
  expect(escapeCsvField("trailing ")).toBe('"trailing "');
  expect(escapeCsvField("\tindented")).toBe('"\tindented"');
  expect(escapeCsvField("ends\t")).toBe('"ends\t"');
});

test('escapeCsvField complex combined chars and already quoted', () => {
  expect(escapeCsvField('a, "b"\n c')).toBe('"a, ""b""\n c"');
  expect(escapeCsvField('"a,b"')).toBe('"""a,b"""');
});

test('sanitizeFilename basic cases', () => {
  expect(sanitizeFilename('My File: Test/Name')).toBe('my-file-test-name');
  expect(sanitizeFilename('  Leading and trailing  ')).toBe('leading-and-trailing');
});
