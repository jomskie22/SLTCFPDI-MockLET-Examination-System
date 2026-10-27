import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { seedDatabase } from './src/db/seed.ts';
import authRoutes from './src/server/authRoutes.ts';
import userRoutes from './src/server/userRoutes.ts';
import questionRoutes from './src/server/questionRoutes.ts';
import examRoutes from './src/server/examRoutes.ts';
import analyticsRoutes from './src/server/analyticsRoutes.ts';
import reportRoutes from './src/server/reportRoutes.ts';
import studentRoutes from './src/server/studentRoutes.ts';
import examRequestRoutes from './src/server/examRequestRoutes.ts';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Auto-seed database on server boot
  try {
    await seedDatabase();
  } catch (err) {
    console.error('Database seeding failed during startup:', err);
  }

  // API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/questions', questionRoutes);
  app.use('/api/exams', examRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/reports', reportRoutes);
  app.use('/api/students', studentRoutes);
  app.use('/api/exam-requests', examRequestRoutes);

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', school: 'SLTCFPDI', system: 'LET Mock Examination System' });
  });

  // Vite middleware or static serving
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SLTCFPDI LET Mock Examination Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
