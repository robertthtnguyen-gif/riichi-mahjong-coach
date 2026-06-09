import { describe, expect, it } from 'vitest';
import { getFocusActionKeys } from './ActionPanel';

describe('ActionPanel focus mode actions', () => {
  it('still exposes chi and pon in focus mode', () => {
    const keys = getFocusActionKeys();
    expect(keys).toContain('chi');
    expect(keys).toContain('pon');
    expect(keys).toContain('ron');
    expect(keys).toContain('pass');
  });
});
