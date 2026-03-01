-- ================================================
-- 如厕与饮水记录 - Supabase 数据库 Schema
-- ================================================

-- 1. 用户表
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  join_date TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. 活动记录表
CREATE TABLE IF NOT EXISTS activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('bowel', 'water')),
  time TEXT NOT NULL,
  title TEXT NOT NULL,
  detail TEXT NOT NULL,
  timestamp BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. 索引
CREATE INDEX IF NOT EXISTS idx_activities_user_id ON activities(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_timestamp ON activities(timestamp DESC);

-- 4. 启用 RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- 5. RLS 策略 - 允许所有操作 (使用 service_role key 在后端操作)
CREATE POLICY "Allow all for service role" ON users
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for service role" ON activities
  FOR ALL USING (true) WITH CHECK (true);
