import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import { supabase } from './supabaseClient';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// 密码哈希
function hashPassword(password: string): string {
    return crypto.createHash('sha256').update(password).digest('hex');
}

// 从用户数据中移除密码字段
function sanitizeUser(user: any) {
    const { password_hash, ...safeUser } = user;
    return safeUser;
}

// ============================================================
// Auth API
// ============================================================

// POST /api/auth/login - 登录用户
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: '请输入邮箱和密码' });
        }

        // 查找现有用户
        const { data: existingUser, error: findError } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .maybeSingle();

        if (findError) {
            console.error('查找用户失败:', findError);
            return res.status(500).json({ error: '查找用户失败: ' + findError.message });
        }

        if (!existingUser) {
            return res.status(404).json({ error: '未查找到用户，请先注册' });
        }

        // 验证密码
        if (existingUser.password_hash !== hashPassword(password)) {
            return res.status(401).json({ error: '密码错误' });
        }

        return res.json({ user: sanitizeUser(existingUser) });
    } catch (err) {
        console.error('登录错误:', err);
        return res.status(500).json({ error: '服务器内部错误' });
    }
});

// POST /api/auth/register - 注册新用户
app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: '请输入邮箱和密码' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: '密码长度不能少于6位' });
        }

        // 检查用户是否已存在
        const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .eq('email', email)
            .maybeSingle();

        if (existingUser) {
            return res.status(409).json({ error: '该邮箱已注册，请直接登录' });
        }

        // 创建新用户
        const name = email.split('@')[0];
        const joinDate = new Date().toLocaleDateString('zh-CN');
        const passwordHash = hashPassword(password);

        const { data: newUser, error: createError } = await supabase
            .from('users')
            .insert({ email, name, join_date: joinDate, password_hash: passwordHash })
            .select()
            .single();

        if (createError) {
            console.error('创建用户失败:', createError);
            return res.status(500).json({ error: '创建用户失败' });
        }

        return res.json({ user: sanitizeUser(newUser) });
    } catch (err) {
        console.error('注册错误:', err);
        return res.status(500).json({ error: '服务器内部错误' });
    }
});

// ============================================================
// Activities API
// ============================================================

// GET /api/activities?user_id=xxx - 获取用户活动记录
app.get('/api/activities', async (req, res) => {
    try {
        const { user_id } = req.query;
        if (!user_id) {
            return res.status(400).json({ error: '缺少 user_id 参数' });
        }

        const { data, error } = await supabase
            .from('activities')
            .select('*')
            .eq('user_id', user_id)
            .order('timestamp', { ascending: false });

        if (error) {
            console.error('获取活动记录失败:', error);
            return res.status(500).json({ error: '获取活动记录失败' });
        }

        return res.json({ activities: data || [] });
    } catch (err) {
        console.error('获取活动错误:', err);
        return res.status(500).json({ error: '服务器内部错误' });
    }
});

// POST /api/activities - 创建活动记录
app.post('/api/activities', async (req, res) => {
    try {
        const { user_id, type, time, title, detail, timestamp } = req.body;

        if (!user_id || !type || !time || !title || !detail || !timestamp) {
            return res.status(400).json({ error: '缺少必要参数' });
        }

        const { data, error } = await supabase
            .from('activities')
            .insert({ user_id, type, time, title, detail, timestamp })
            .select()
            .single();

        if (error) {
            console.error('创建活动记录失败:', error);
            return res.status(500).json({ error: '创建活动记录失败' });
        }

        return res.json({ activity: data });
    } catch (err) {
        console.error('创建活动错误:', err);
        return res.status(500).json({ error: '服务器内部错误' });
    }
});

// DELETE /api/activities/:id - 删除活动记录
app.delete('/api/activities/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const { error } = await supabase
            .from('activities')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('删除活动记录失败:', error);
            return res.status(500).json({ error: '删除活动记录失败' });
        }

        return res.json({ success: true });
    } catch (err) {
        console.error('删除活动错误:', err);
        return res.status(500).json({ error: '服务器内部错误' });
    }
});

// ============================================================
// Start Server
// ============================================================

app.listen(PORT, () => {
    console.log(`🚀 后端服务已启动: http://localhost:${PORT}`);
});
