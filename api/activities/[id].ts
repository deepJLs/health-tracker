import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../_lib/supabaseClient.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'DELETE') {
        return res.status(405).json({ error: '仅支持 DELETE 请求' });
    }

    try {
        const { id } = req.query;

        const { error } = await supabase
            .from('activities')
            .delete()
            .eq('id', id as string);

        if (error) {
            console.error('删除活动记录失败:', error);
            return res.status(500).json({ error: '删除活动记录失败' });
        }

        return res.status(200).json({ success: true });
    } catch (err: any) {
        console.error('删除活动错误:', err);
        return res.status(500).json({ error: '服务器内部错误: ' + (err.message || '') });
    }
}
