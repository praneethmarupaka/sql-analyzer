import { analyzeSql } from '../compiler/index.js';

export function analyzeQuery(req, res) {
  try {
    const { query } = req.body;

    if (query === undefined || query === null) {
      return res.status(400).json({
        success: false,
        error: 'Request body must include a "query" field.'
      });
    }

    const result = analyzeSql(query);
    return res.json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: `Internal Server Error: ${error.message}`
    });
  }
}
