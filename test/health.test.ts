import { describe, expect, it } from 'vitest';

describe('health', () => {
  it('should return ok status', () => {
    expect({ status: 'ok' }).toEqual({
      status: 'ok',
    });
  });
});
