import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import { PGlite } from '@electric-sql/pglite';
import { Pool } from 'pg';
import * as schema from './schema.ts';

declare global {
  var _dbInstance: any | undefined;
  var _poolInstance: any | undefined;
  var _pgliteInstance: PGlite | undefined;
}

const DDL_STATEMENTS = `
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  uid TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'EXAMINEE',
  student_id TEXT UNIQUE,
  department TEXT DEFAULT 'College of Education',
  major_subject TEXT DEFAULT 'General Education',
  year_level TEXT DEFAULT '4th Year',
  contact_number TEXT,
  avatar_url TEXT,
  faculty_remarks TEXT,
  faculty_recommendation TEXT,
  evaluator_name TEXT,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  description TEXT
);

CREATE TABLE IF NOT EXISTS topics (
  id SERIAL PRIMARY KEY,
  category_id INTEGER REFERENCES categories(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT
);

CREATE TABLE IF NOT EXISTS questions (
  id SERIAL PRIMARY KEY,
  category_id INTEGER REFERENCES categories(id) ON DELETE CASCADE NOT NULL,
  topic_id INTEGER REFERENCES topics(id) ON DELETE SET NULL,
  question_text TEXT NOT NULL,
  explanation TEXT,
  point_value INTEGER DEFAULT 1 NOT NULL,
  source_reference TEXT NOT NULL,
  difficulty TEXT DEFAULT 'Medium' NOT NULL,
  created_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS question_choices (
  id SERIAL PRIMARY KEY,
  question_id INTEGER REFERENCES questions(id) ON DELETE CASCADE NOT NULL,
  choice_label TEXT NOT NULL,
  choice_text TEXT NOT NULL,
  is_correct BOOLEAN DEFAULT FALSE NOT NULL
);

CREATE TABLE IF NOT EXISTS examinations (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  duration_minutes INTEGER DEFAULT 120 NOT NULL,
  pass_percentage INTEGER DEFAULT 75 NOT NULL,
  total_questions INTEGER DEFAULT 50 NOT NULL,
  randomize_questions BOOLEAN DEFAULT TRUE NOT NULL,
  randomize_choices BOOLEAN DEFAULT TRUE NOT NULL,
  is_published BOOLEAN DEFAULT FALSE NOT NULL,
  created_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS exam_questions (
  id SERIAL PRIMARY KEY,
  exam_id INTEGER REFERENCES examinations(id) ON DELETE CASCADE NOT NULL,
  question_id INTEGER REFERENCES questions(id) ON DELETE CASCADE NOT NULL,
  order_index INTEGER DEFAULT 0 NOT NULL
);

CREATE TABLE IF NOT EXISTS exam_attempts (
  id SERIAL PRIMARY KEY,
  exam_id INTEGER REFERENCES examinations(id) ON DELETE CASCADE NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  score INTEGER DEFAULT 0 NOT NULL,
  total_points INTEGER DEFAULT 0 NOT NULL,
  percentage TEXT DEFAULT '0' NOT NULL,
  passed BOOLEAN DEFAULT FALSE NOT NULL,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  submitted_at TIMESTAMP,
  time_spent_seconds INTEGER DEFAULT 0 NOT NULL,
  status TEXT DEFAULT 'IN_PROGRESS' NOT NULL,
  allow_retake BOOLEAN DEFAULT FALSE NOT NULL
);

CREATE TABLE IF NOT EXISTS examinee_answers (
  id SERIAL PRIMARY KEY,
  attempt_id INTEGER REFERENCES exam_attempts(id) ON DELETE CASCADE NOT NULL,
  question_id INTEGER REFERENCES questions(id) ON DELETE CASCADE NOT NULL,
  selected_choice_id INTEGER REFERENCES question_choices(id) ON DELETE SET NULL,
  is_correct BOOLEAN DEFAULT FALSE NOT NULL,
  points_earned INTEGER DEFAULT 0 NOT NULL,
  is_flagged BOOLEAN DEFAULT FALSE NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS student_masterlist (
  id SERIAL PRIMARY KEY,
  student_id TEXT NOT NULL UNIQUE,
  last_name TEXT NOT NULL,
  first_name TEXT NOT NULL,
  middle_name TEXT,
  course TEXT NOT NULL,
  year_graduated TEXT NOT NULL,
  uploaded_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS exam_requests (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  student_id TEXT NOT NULL,
  exam_id INTEGER REFERENCES examinations(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'PENDING' NOT NULL,
  request_notes TEXT,
  review_notes TEXT,
  reviewed_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  reviewed_at TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_student_id ON users (student_id) WHERE student_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_student_masterlist_id ON student_masterlist (student_id);
`;

const useExternalPostgres = Boolean(
  process.env.DATABASE_URL ||
  (process.env.SQL_HOST && process.env.SQL_HOST !== 'localhost' && process.env.SQL_HOST !== '127.0.0.1')
);

export const getPgliteClient = (): PGlite => {
  if (!global._pgliteInstance) {
    global._pgliteInstance = new PGlite();
  }
  return global._pgliteInstance;
};

export const initDatabaseSchema = async () => {
  if (!useExternalPostgres) {
    const client = getPgliteClient();
    await client.waitReady;
    await client.exec(DDL_STATEMENTS);
  }
};

export const createPool = () => {
  if (useExternalPostgres) {
    if (!global._poolInstance) {
      global._poolInstance = new Pool({
        connectionString: process.env.DATABASE_URL,
        host: process.env.SQL_HOST || 'localhost',
        user: process.env.SQL_USER || 'postgres',
        password: process.env.SQL_PASSWORD || 'postgres',
        database: process.env.SQL_DB_NAME || 'postgres',
        max: 10,
        connectionTimeoutMillis: 15000,
      });

      global._poolInstance.on('error', (err: any) => {
        console.error('Unexpected error on idle SQL pool client:', err);
      });
    }
    return global._poolInstance;
  }

  // PGlite adapter returning pool-like query interface
  const client = getPgliteClient();
  return {
    query: async (text: string, params?: any[]) => {
      return client.query(text, params);
    },
    on: () => {},
  };
};

export const getDb = () => {
  if (!global._dbInstance) {
    if (useExternalPostgres) {
      const pool = createPool() as Pool;
      global._dbInstance = drizzlePg(pool, { schema });
    } else {
      const client = getPgliteClient();
      global._dbInstance = drizzlePglite({ client, schema });
    }
  }
  return global._dbInstance;
};

export const db = getDb();
