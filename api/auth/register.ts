import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import { supabase } from '../_lib/supabaseClient';

function hashPassword(password: string): string {
    return crypto.createHash('sha256').update(password).digest('hex');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: '仅支持 POST 请求' });
    }

    try {
        const { email, password } = req.body || {};
        if (!email || !password) {
            return res.status(400).json({ error: '请输入邮箱和密码' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: '密码长度不能少于6位' });
        }

        const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .eq('email', email)
            .maybeSingle();

        if (existingUser) {
            return res.status(409).json({ error: '该邮箱已注册，请直接登录' });
        }

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
            return res.status(500).json({ error: '创建用户失败: ' + createError.message });
        }

        const { password_hash, ...safeUser } = newUser;
        return res.status(200).json({ user: safeUser });
    } catch (err: any) {
        console.error('注册错误:', err);
        return res.status(500).json({ error: '服务器内部错误: ' + (err.message || '') });
    }
}
