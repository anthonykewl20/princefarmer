import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadJSON } from '../../src/utils/json-loader.js';

describe('loadJSON', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  it('fetches a URL and parses JSON', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'sword', name: 'Kampilan' }),
    });
    const result = await loadJSON('/data/sword.json');
    expect(result).toEqual({ id: 'sword', name: 'Kampilan' });
    expect(global.fetch).toHaveBeenCalledWith('/data/sword.json');
  });

  it('throws on HTTP error with the URL in the message', async () => {
    global.fetch.mockResolvedValueOnce({ ok: false, status: 404, statusText: 'Not Found' });
    await expect(loadJSON('/data/missing.json')).rejects.toThrow(/missing\.json.*404/);
  });

  it('throws on malformed JSON', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => { throw new SyntaxError('bad json'); },
    });
    await expect(loadJSON('/data/bad.json')).rejects.toThrow(/bad json/);
  });
});
