// ============================================================
// Frontend API Client
// ============================================================

const API_BASE = '/api';

interface UserResponse {
    user: {
        id: string;
        email: string;
        name: string;
        join_date: string;
        created_at: string;
    };
}

interface ActivityData {
    id: string;
    user_id: string;
    type: 'bowel' | 'water';
    time: string;
    title: string;
    detail: string;
    timestamp: number;
    created_at: string;
}

interface ActivitiesResponse {
    activities: ActivityData[];
}

interface CreateActivityResponse {
    activity: ActivityData;
}

// 安全解析 JSON 响应
async function safeJson(res: Response): Promise<any> {
    const text = await res.text();
    if (!text) return {};
    try {
        return JSON.parse(text);
    } catch {
        return { error: text };
    }
}

// 登录
export async function loginUser(email: string, password: string): Promise<UserResponse> {
    const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
        const err = await safeJson(res);
        throw new Error(err.error || '登录失败');
    }
    return res.json();
}

// 注册新用户
export async function registerUser(email: string, password: string): Promise<UserResponse> {
    const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
        const err = await safeJson(res);
        throw new Error(err.error || '注册失败');
    }
    return res.json();
}

// 获取活动记录
export async function fetchActivities(userId: string): Promise<ActivitiesResponse> {
    const res = await fetch(`${API_BASE}/activities?user_id=${encodeURIComponent(userId)}`);
    if (!res.ok) {
        const err = await safeJson(res);
        throw new Error(err.error || '获取记录失败');
    }
    return res.json();
}

// 创建活动记录
export async function createActivity(activity: {
    user_id: string;
    type: 'bowel' | 'water';
    time: string;
    title: string;
    detail: string;
    timestamp: number;
}): Promise<CreateActivityResponse> {
    const res = await fetch(`${API_BASE}/activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(activity),
    });
    if (!res.ok) {
        const err = await safeJson(res);
        throw new Error(err.error || '创建记录失败');
    }
    return res.json();
}

// 删除活动记录（撤销）
export async function deleteActivity(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/activities/${id}`, {
        method: 'DELETE',
    });
    if (!res.ok) {
        const err = await safeJson(res);
        throw new Error(err.error || '删除记录失败');
    }
}
