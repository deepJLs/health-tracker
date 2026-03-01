import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import { supabase } from '../_lib/supabaseClient';

function hashPassword(password: string): string {
    return crypto.createHash('sha256').update(password).digest('hex');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: '仅支持 POST 请求' });
    }

    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: '请输入邮箱和密码' });
        }

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

        if (existingUser.password_hash !== hashPassword(password)) {
            return res.status(401).json({ error: '密码错误' });
        }

        const { password_hash, ...safeUser } = existingUser;
        return res.status(200).json({ user: safeUser });
    } catch (err) {
        console.error('登录错误:', err);
        return res.status(500).json({ error: '服务器内部错误' });
    }
}
