const API_BASE_URL = 'http://localhost:5000/api';

/**
 * Sends SQL query string to backend compiler analyzer endpoint
 * @param {string} query 
 * @returns {Promise<object>} Analysis results (tokens, status, error, suggestions, rewrittenSql)
 */
export async function analyzeQuery(query) {
  const response = await fetch(`${API_BASE_URL}/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Server responded with status ${response.status}`);
  }

  return response.json();
}
