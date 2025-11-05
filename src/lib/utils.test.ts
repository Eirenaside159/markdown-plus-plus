import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('utils.cn', () => {
  it('merges class names and resolves tailwind conflicts', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
    expect(cn('text-sm', undefined, 'text-lg')).toBe('text-lg');
    expect(cn('bg-red-500', false as any, 'bg-blue-500')).toBe('bg-blue-500');
    expect(cn('mt-2', null as any, 'mt-2')).toBe('mt-2');
  });
});


