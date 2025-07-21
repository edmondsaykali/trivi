# Database Setup Troubleshooting

## Current Issue
The application is experiencing network connectivity issues when connecting to your Supabase database from the Replit environment.

## Quick Fix: Alternative Database URL Format

Try updating your DATABASE_URL with the direct connection format instead of the pooler:

### Option 1: Direct Connection (Recommended)
```
postgresql://postgres.slhsyxrhjymbjekhilnu:[YOUR-PASSWORD]@aws-0-eu-north-1.pooler.supabase.com:5432/postgres
```

### Option 2: Transaction Mode
```
postgresql://postgres.slhsyxrhjymbjekhilnu:[YOUR-PASSWORD]@aws-0-eu-north-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
```

### Option 3: Session Mode  
```
postgresql://postgres.slhsyxrhjymbjekhilnu:[YOUR-PASSWORD]@aws-0-eu-north-1.pooler.supabase.com:5432/postgres?pgbouncer=true
```

## Creating Tables Manually

If the automatic table creation fails, run these SQL commands in your Supabase SQL Editor:

```sql
-- Games table
CREATE TABLE IF NOT EXISTS games (
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'waiting',
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  creator_id INTEGER NOT NULL,
  winner_id INTEGER,
  current_round INTEGER DEFAULT 1,
  current_question INTEGER DEFAULT 1,
  question_data JSONB,
  question_deadline TIMESTAMP,
  last_round_winner_id INTEGER,
  waiting_for_answers BOOLEAN DEFAULT false
);

-- Players table
CREATE TABLE IF NOT EXISTS players (
  id SERIAL PRIMARY KEY,
  game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  avatar TEXT NOT NULL,
  score INTEGER DEFAULT 0,
  session_id TEXT NOT NULL,
  joined_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Answers table
CREATE TABLE IF NOT EXISTS answers (
  id SERIAL PRIMARY KEY,
  game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  round INTEGER NOT NULL,
  question INTEGER NOT NULL,
  answer TEXT NOT NULL,
  submitted_at TIMESTAMP DEFAULT NOW() NOT NULL,
  is_correct BOOLEAN
);

-- Rounds table
CREATE TABLE IF NOT EXISTS rounds (
  id SERIAL PRIMARY KEY,
  game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL,
  winner_id INTEGER REFERENCES players(id),
  question1_data JSONB,
  question2_data JSONB,
  completed_at TIMESTAMP
);
```

## Verification Steps

1. Update the DATABASE_URL secret with one of the alternative formats above
2. Create the tables manually in Supabase if needed
3. Restart the application
4. Test creating a game

The application will show "✅ Database tables initialized successfully" when the connection is working properly.