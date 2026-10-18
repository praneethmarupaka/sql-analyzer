import express from 'express';
import cors from 'cors';
import analyzeRoutes from './routes/analyzeRoutes.js';

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api', analyzeRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'CD - SQL Query Analyzer and Optimizer API' });
});

export default app;
