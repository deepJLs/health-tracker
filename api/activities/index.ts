import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../_lib/supabaseClient';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method === 'GET') {
        // GET /api/activities?user_id=xxx
        try {
            const { user_id } = req.query;
            if (!user_id) {
                return res.status(400).json({ error: '缺少 user_id 参数' });
            }

            const { data, error } = await supabase
                .from('activities')
                .select('*')
                .eq('user_id', user_id as string)
                .order('timestamp', { ascending: false });

            if (error) {
                console.error('获取活动记录失败:', error);
                return res.status(500).json({ error: '获取活动记录失败' });
            }

            return res.status(200).json({ activities: data || [] });
        } catch (err) {
            console.error('获取活动错误:', err);
            return res.status(500).json({ error: '服务器内部错误' });
        }
    } else if (req.method === 'POST') {
        // POST /api/activities
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

            return res.status(200).json({ activity: data });
        } catch (err) {
            console.error('创建活动错误:', err);
            return res.status(500).json({ error: '服务器内部错误' });
        }
    } else {
        return res.status(405).json({ error: '不支持的请求方法' });
    }
}
