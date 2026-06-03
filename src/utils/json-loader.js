/**
 * Fetches a JSON file and returns the parsed object.
 * Throws an Error with a descriptive message on HTTP or parse failure.
 *
 * @param {string} url - the URL to fetch
 * @returns {Promise<any>} the parsed JSON
 */
export async function loadJSON(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to load JSON from ${url}: ${res.status} ${res.statusText}`);
  }
  try {
    return await res.json();
  } catch (err) {
    throw new Error(`Failed to parse JSON from ${url}: ${err.message}`);
  }
}
