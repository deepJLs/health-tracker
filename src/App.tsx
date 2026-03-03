import React, { useState, useEffect, useCallback } from 'react';
import {
  Home,
  ClipboardList,
  BarChart2,
  User,
  ChevronLeft,
  ChevronRight,
  Share2,
  Info,
  CheckCircle2,
  Clock,
  Droplets,
  Plus,
  Settings,
  TrendingDown,
  TrendingUp,
  Minus,
  Loader2
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { loginUser, registerUser, fetchActivities, createActivity, deleteActivity } from './api';

// --- Types ---

type View = 'home' | 'records' | 'analysis' | 'profile' | 'login' | 'register';

interface UserProfile {
  id: string;
  email: string;
  name: string;
  join_date: string;
}

interface Activity {
  id: string;
  user_id: string;
  type: 'bowel' | 'water';
  time: string;
  title: string;
  detail: string;
  timestamp: number;
}

// --- Components ---

const LoadingSpinner = () => (
  <div className="flex items-center justify-center py-12">
    <Loader2 className="animate-spin text-amber-500" size={32} />
  </div>
);

const ErrorToast = ({ message, onClose }: { message: string, onClose: () => void }) => (
  <motion.div
    initial={{ opacity: 0, y: 50 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: 50 }}
    className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-red-500 text-white px-6 py-3 rounded-2xl shadow-lg z-[100] text-sm font-bold"
  >
    {message}
    <button onClick={onClose} className="ml-3 underline">关闭</button>
  </motion.div>
);

const WaterSelectionModal = ({
  isOpen,
  onClose,
  onSelect
}: {
  isOpen: boolean,
  onClose: () => void,
  onSelect: (amount: string) => void
}) => {
  const options = ["100ml", "200ml", "250ml", "300ml", "500ml"];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60]"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 bg-white dark:bg-zinc-900 rounded-t-3xl p-6 z-[70] shadow-2xl max-w-md mx-auto"
          >
            <div className="w-12 h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full mx-auto mb-6" />
            <h3 className="text-lg font-bold mb-4 text-center">选择饮水量</h3>
            <div className="grid grid-cols-1 gap-3">
              {options.map((opt) => (
                <button
                  key={opt}
                  onClick={() => {
                    onSelect(opt);
                    onClose();
                  }}
                  className="w-full py-4 rounded-2xl bg-zinc-100 dark:bg-zinc-800 hover:bg-blue-500 hover:text-white transition-all font-bold text-lg"
                >
                  {opt}
                </button>
              ))}
            </div>
            <button
              onClick={onClose}
              className="w-full mt-4 py-4 rounded-2xl text-zinc-500 font-bold"
            >
              取消
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

const BottomNav = ({ activeView, setView }: { activeView: View, setView: (v: View) => void }) => {
  const navItems = [
    { id: 'home', label: '首页', icon: Home },
    { id: 'records', label: '记录', icon: ClipboardList },
    { id: 'analysis', label: '趋势', icon: BarChart2 },
    { id: 'profile', label: '个人', icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 pb-safe-area z-50">
      <div className="w-full md:max-w-md mx-auto flex justify-around py-2 px-4">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setView(item.id as View)}
            className={cn(
              "flex flex-col items-center gap-1 transition-colors",
              activeView === item.id ? "text-amber-500" : "text-zinc-400"
            )}
          >
            <item.icon size={24} fill={activeView === item.id ? "currentColor" : "none"} />
            <span className="text-xs font-medium">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
};

const Header = ({ title, leftAction, rightAction }: { title: string, leftAction?: React.ReactNode, rightAction?: React.ReactNode }) => (
  <header className="sticky top-0 z-40 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800">
    <div className="w-full md:max-w-md mx-auto flex items-center justify-between px-4 h-14">
      <div className="w-10 flex items-center justify-start">{leftAction}</div>
      <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{title}</h1>
      <div className="w-10 flex items-center justify-end">{rightAction}</div>
    </div>
  </header>
);

// --- Views ---

const HomeView = ({
  onViewDetails,
  activities,
  onRecordBowel,
  onRecordWater,
  onUndo,
  stats,
  loading
}: {
  onViewDetails: () => void,
  activities: Activity[],
  onRecordBowel: (detail: string) => void,
  onRecordWater: () => void,
  onUndo: () => void,
  stats: { avgBowel: string, todayWater: string },
  loading: boolean,
  key?: string
}) => {
  const lastBowel = activities.find(a => a.type === 'bowel');
  const [timeSince, setTimeSince] = useState('暂无记录');
  const [bowelType, setBowelType] = useState('软硬适中');

  React.useEffect(() => {
    if (!lastBowel) {
      setTimeSince('暂无记录');
      return;
    }

    const updateTime = () => {
      const diff = Date.now() - lastBowel.timestamp;
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (hours >= 24) {
        const days = Math.floor(hours / 24);
        setTimeSince(`${days}天 ${hours % 24}小时`);
      } else if (hours > 0) {
        setTimeSince(`${hours}小时 ${minutes}分钟`);
      } else if (minutes > 0) {
        setTimeSince(`${minutes}分钟`);
      } else {
        setTimeSince('刚刚');
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, [lastBowel]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex flex-col gap-6 p-4 pb-24"
    >
      {/* Last Event Card */}
      <div className="bg-zinc-100 dark:bg-zinc-800/50 rounded-2xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">距离上次如厕时间间隔</p>
        <div className="flex items-baseline gap-2 mt-1">
          <p className="text-zinc-900 dark:text-zinc-100 text-3xl font-bold">{timeSince}</p>
          <span className="text-amber-500 text-sm font-semibold">正常范围</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col items-center justify-center py-4 gap-6">
        <div className="flex flex-col items-center gap-4">
          <button
            onClick={() => onRecordBowel(`类型：${bowelType}`)}
            className="group relative flex flex-col items-center justify-center w-48 h-48 rounded-full bg-amber-500/10 border-4 border-amber-500 shadow-lg shadow-amber-500/20 transition-transform active:scale-95"
          >
            <div className="absolute inset-0 rounded-full bg-amber-500 opacity-5 animate-pulse" />
            <div className="text-amber-500 mb-2">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 21h10" /><path d="M9 18h6" /><path d="M10 14h4" /><path d="M12 2v12" /><path d="M12 2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2 2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" /></svg>
            </div>
            <span className="text-zinc-900 dark:text-zinc-100 text-xl font-bold">记录如厕</span>
          </button>

          {/* Bowel Type Selector */}
          <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl border border-zinc-200 dark:border-zinc-700">
            {["偏软", "软硬适中", "偏硬"].map((type) => (
              <button
                key={type}
                onClick={() => setBowelType(type)}
                className={cn(
                  "px-4 py-2 rounded-lg text-xs font-bold transition-all",
                  bowelType === type
                    ? "bg-white dark:bg-zinc-700 text-amber-500 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                )}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={onRecordWater}
          className="flex items-center gap-3 px-8 py-4 bg-blue-500/10 border-2 border-blue-500/50 rounded-full transition-transform active:scale-95"
        >
          <Droplets className="text-blue-500" size={24} fill="currentColor" />
          <span className="text-zinc-900 dark:text-zinc-100 text-lg font-bold">记录饮水</span>
        </button>

        <p className="text-zinc-500 dark:text-zinc-400 text-sm">点击按钮记录您的健康习惯</p>
      </div>

      {/* Activity Summary */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="text-zinc-900 dark:text-zinc-100 text-lg font-bold">今日动态</h3>
          <button
            onClick={onViewDetails}
            className="text-amber-500 text-sm font-semibold hover:underline"
          >
            查看详情
          </button>
        </div>

        {loading ? (
          <LoadingSpinner />
        ) : (
          <div className="relative flex flex-col gap-6 pl-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-zinc-200 dark:before:bg-zinc-800">
            {activities.slice(0, 3).map((activity, idx) => (
              <div key={activity.id} className="relative flex flex-col gap-1">
                <div className={cn(
                  "absolute -left-[21px] top-1.5 size-[11px] rounded-full border-2 border-white dark:border-zinc-900",
                  activity.type === 'bowel' ? "bg-amber-500" : "bg-blue-500"
                )} />
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <p className="text-zinc-900 dark:text-zinc-100 font-semibold">{activity.title}</p>
                    {idx === 0 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onUndo();
                        }}
                        className="text-[10px] text-red-500 font-bold hover:underline"
                      >
                        撤销记录
                      </button>
                    )}
                  </div>
                  <span className="text-zinc-500 dark:text-zinc-400 text-xs">{activity.time}</span>
                </div>
                <p className="text-zinc-500 dark:text-zinc-400 text-sm">{activity.detail}</p>
              </div>
            ))}
            {activities.length === 0 && (
              <div className="text-center py-6 text-zinc-400 text-sm">暂无记录，点击上方按钮开始记录</div>
            )}
          </div>
        )}
      </section>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mt-2">
        <div className="bg-zinc-100 dark:bg-zinc-800/30 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
          <p className="text-zinc-500 dark:text-zinc-400 text-xs font-medium uppercase tracking-wider">每日平均如厕</p>
          <p className="text-zinc-900 dark:text-zinc-100 text-xl font-bold mt-1">{stats.avgBowel} 次</p>
        </div>
        <div className="bg-zinc-100 dark:bg-zinc-800/30 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
          <p className="text-zinc-500 dark:text-zinc-400 text-xs font-medium uppercase tracking-wider">今日饮水量</p>
          <div className="flex items-baseline gap-1 mt-1">
            <p className="text-zinc-900 dark:text-zinc-100 text-xl font-bold">{stats.todayWater}升</p>
            <p className="text-zinc-500 dark:text-zinc-400 text-xs">/ 2.5升</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const RecordsView = ({ activities, heatmapData, loading, key }: { activities: Activity[], heatmapData: { day: number, intensity: number }[], loading: boolean, key?: string }) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      className="flex flex-col gap-6 p-4 pb-24"
    >
      <section>
        <h3 className="text-zinc-900 dark:text-zinc-100 text-xl font-bold mb-6">今日时间轴</h3>
        {loading ? (
          <LoadingSpinner />
        ) : (
          <div className="flex flex-col gap-8">
            {activities.length === 0 ? (
              <div className="text-center py-12 text-zinc-400">暂无记录</div>
            ) : activities.map((activity, idx) => (
              <div key={activity.id} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className={cn(
                    "flex items-center justify-center size-10 rounded-full",
                    activity.type === 'bowel' ? "bg-amber-500/20 text-amber-500" : "bg-blue-500/20 text-blue-500"
                  )}>
                    {activity.type === 'bowel' ? <CheckCircle2 size={20} /> : <Droplets size={20} />}
                  </div>
                  {idx !== activities.length - 1 && (
                    <div className="w-0.5 bg-zinc-200 dark:bg-zinc-800 h-12 mt-2" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <p className="text-zinc-900 dark:text-zinc-100 font-semibold">{activity.title}</p>
                    <p className="text-zinc-500 dark:text-zinc-400 text-sm">{activity.time}</p>
                  </div>
                  <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">{activity.detail}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="pt-6 border-t border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-zinc-900 dark:text-zinc-100 text-xl font-bold">频率矩阵</h3>
          <span className="text-xs font-semibold text-amber-500 tracking-wider">过去 4 周</span>
        </div>

        <div className="bg-zinc-100 dark:bg-zinc-900/50 rounded-xl p-4">
          <div className="grid grid-cols-7 gap-2 mb-4">
            {['一', '二', '三', '四', '五', '六', '日'].map(day => (
              <div key={day} className="text-center text-[10px] font-bold text-zinc-400">{day}</div>
            ))}
            {heatmapData.map((item) => (
              <div
                key={item.day}
                className={cn(
                  "aspect-square rounded-sm transition-colors",
                  item.intensity === -1 ? "bg-transparent" :
                    item.intensity === 0 ? "bg-zinc-200 dark:bg-zinc-800" :
                      item.intensity === 1 ? "bg-amber-500/20" :
                        item.intensity === 2 ? "bg-amber-500/40" :
                          item.intensity === 3 ? "bg-amber-500/70" :
                            "bg-amber-500 rounded-full border-2 border-white dark:border-zinc-900"
                )}
              />
            ))}
          </div>

          <div className="flex items-center justify-end gap-2">
            <span className="text-[10px] text-zinc-500 font-bold">较低</span>
            <div className="flex gap-1">
              <div className="size-3 bg-zinc-200 dark:bg-zinc-800 rounded-sm" />
              <div className="size-3 bg-amber-500/20 rounded-sm" />
              <div className="size-3 bg-amber-500/40 rounded-sm" />
              <div className="size-3 bg-amber-500/70 rounded-sm" />
              <div className="size-3 bg-amber-500 rounded-sm" />
            </div>
            <span className="text-[10px] text-zinc-500 font-bold">较高</span>
          </div>
        </div>

        <div className="mt-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
          <div className="flex gap-3">
            <Info className="text-amber-500 shrink-0" size={20} />
            <div>
              <p className="text-zinc-900 dark:text-zinc-100 text-sm font-bold">活跃度分析</p>
              <p className="text-zinc-600 dark:text-zinc-400 text-sm leading-snug mt-1">您在周末的频率高出 15%。建议关注周六早晨的纤维摄入量。</p>
            </div>
          </div>
        </div>
      </section>

      <div className="fixed bottom-24 right-6">
        <button className="size-14 rounded-full bg-amber-500 text-white shadow-lg shadow-amber-500/40 flex items-center justify-center transition-transform active:scale-95">
          <Plus size={32} />
        </button>
      </div>
    </motion.div>
  );
};

const AnalysisView = ({ stats, tab, activities, key }: {
  stats: {
    avgBowel: string,
    avgInterval: string,
    monthlyTotal: number,
    heatmapData: { day: number, intensity: number }[],
    analysisHeatmapData: { day: number, intensity: number, dateNum: number }[],
    weeklyData: { name: string, value: number }[],
    healthAdvice: string
  },
  tab: '日' | '周' | '月',
  activities: Activity[],
  key?: string
}) => {
  // Compute daily stats (today)
  const dailyStats = React.useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now).setHours(0, 0, 0, 0);
    const todayActivities = activities.filter(a => a.timestamp >= startOfToday);
    const todayBowel = todayActivities.filter(a => a.type === 'bowel');
    const todayWater = todayActivities.filter(a => a.type === 'water');

    const todayWaterMl = todayWater.reduce((sum, a) => {
      const match = a.detail.match(/\d+/);
      return sum + (match ? parseInt(match[0]) : 0);
    }, 0);

    // Hourly distribution for today (0-23)
    const hourlyData = Array.from({ length: 24 }, (_, h) => {
      const count = todayBowel.filter(a => new Date(a.timestamp).getHours() === h).length;
      return { name: `${h}`, value: count };
    });

    return {
      bowelCount: todayBowel.length,
      waterMl: todayWaterMl,
      hourlyData,
    };
  }, [activities]);

  // Compute weekly stats (this week, Mon-Sun)
  const weeklyStats = React.useMemo(() => {
    const now = new Date();
    const dow = now.getDay(); // 0=Sun
    const mondayOffset = dow === 0 ? 6 : dow - 1;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - mondayOffset);
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const weekActivities = activities.filter(a => a.timestamp >= weekStart.getTime() && a.timestamp <= weekEnd.getTime());
    const weekBowel = weekActivities.filter(a => a.type === 'bowel');
    const weekWater = weekActivities.filter(a => a.type === 'water');

    const weekWaterMl = weekWater.reduce((sum, a) => {
      const match = a.detail.match(/\d+/);
      return sum + (match ? parseInt(match[0]) : 0);
    }, 0);

    const dayLabels = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    const dailyData = dayLabels.map((label, idx) => {
      const dayDate = new Date(weekStart);
      dayDate.setDate(weekStart.getDate() + idx);
      const dateStr = dayDate.toDateString();
      const count = weekBowel.filter(a => new Date(a.timestamp).toDateString() === dateStr).length;
      return { name: label, value: count };
    });

    const activeDays = dailyData.filter(d => d.value > 0).length;

    return {
      bowelCount: weekBowel.length,
      waterMl: weekWaterMl,
      dailyAvg: activeDays > 0 ? (weekBowel.length / activeDays).toFixed(1) : '0',
      dailyData,
    };
  }, [activities]);

  const renderChart = (data: { name: string, value: number }[], label: string, xInterval?: number) => (
    <div className="bg-zinc-100 dark:bg-zinc-900/50 p-5 rounded-2xl">
      <h3 className="text-zinc-900 dark:text-zinc-100 text-sm font-bold mb-6">{label}</h3>
      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: xInterval !== undefined ? 0 : -20, bottom: 0 }}>
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: xInterval !== undefined ? 8 : 10, fill: '#94a3b8', fontWeight: 700 }}
              dy={10}
              interval={xInterval !== undefined ? xInterval : 'preserveStartEnd'}
            />
            <Tooltip
              cursor={{ fill: 'transparent' }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-zinc-900 text-white px-2 py-1 rounded text-[10px] font-bold">
                      {payload[0].value}次
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="value" radius={[6, 6, 0, 0]}>
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.value > 0 ? '#f59e0b' : '#e2e8f0'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="flex flex-col gap-6 p-4 pb-24"
    >
      {/* ===== 日 Tab ===== */}
      {tab === '日' && (
        <>
          <h2 className="text-zinc-900 dark:text-zinc-100 text-xl font-bold">今日概览</h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-zinc-100 dark:bg-zinc-900/50 p-4 rounded-2xl flex flex-col gap-1">
              <p className="text-zinc-500 dark:text-zinc-400 text-xs font-medium">今日如厕</p>
              <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{dailyStats.bowelCount}次</p>
            </div>
            <div className="bg-zinc-100 dark:bg-zinc-900/50 p-4 rounded-2xl flex flex-col gap-1">
              <p className="text-zinc-500 dark:text-zinc-400 text-xs font-medium">今日饮水</p>
              <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{(dailyStats.waterMl / 1000).toFixed(1)}升</p>
            </div>
          </div>

          {renderChart(dailyStats.hourlyData, '24小时分布', 0)}
        </>
      )}

      {/* ===== 周 Tab ===== */}
      {tab === '周' && (
        <>
          <h2 className="text-zinc-900 dark:text-zinc-100 text-xl font-bold">本周概览</h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-zinc-100 dark:bg-zinc-900/50 p-4 rounded-2xl flex flex-col gap-1">
              <p className="text-zinc-500 dark:text-zinc-400 text-xs font-medium">本周如厕</p>
              <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{weeklyStats.bowelCount}次</p>
            </div>
            <div className="bg-zinc-100 dark:bg-zinc-900/50 p-4 rounded-2xl flex flex-col gap-1">
              <p className="text-zinc-500 dark:text-zinc-400 text-xs font-medium">日均次数</p>
              <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{weeklyStats.dailyAvg}次</p>
            </div>
          </div>

          {renderChart(weeklyStats.dailyData, '本周每日次数')}

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-zinc-100 dark:bg-zinc-900/50 p-4 rounded-2xl flex flex-col gap-1">
              <p className="text-zinc-500 dark:text-zinc-400 text-xs font-medium">本周饮水</p>
              <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{(weeklyStats.waterMl / 1000).toFixed(1)}升</p>
            </div>
          </div>
        </>
      )}

      {/* ===== 月 Tab ===== */}
      {tab === '月' && (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-zinc-900 dark:text-zinc-100 text-xl font-bold">频率热度图</h2>
            <Info size={16} className="text-zinc-400" />
          </div>

          {/* Calendar Heatmap */}
          <div className="bg-zinc-100 dark:bg-zinc-900/50 p-4 rounded-2xl">
            <div className="flex items-center justify-between mb-6">
              <button className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full transition-colors">
                <ChevronLeft size={20} />
              </button>
              <p className="text-zinc-900 dark:text-zinc-100 font-bold">最近 28 天</p>
              <button className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full transition-colors">
                <ChevronRight size={20} />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-y-2 text-center mb-4">
              {['日', '一', '二', '三', '四', '五', '六'].map(day => (
                <div key={day} className="text-[11px] font-bold text-zinc-400 h-8 flex items-center justify-center">{day}</div>
              ))}
              {stats.analysisHeatmapData.map((item) => {
                const dateNum = item.dateNum;
                const intensity = item.intensity;

                return (
                  <div key={item.day} className="h-10 flex items-center justify-center">
                    {intensity === -1 ? (
                      <span></span>
                    ) : intensity > 0 ? (
                      <div className={cn(
                        "size-8 flex items-center justify-center rounded-full font-bold text-sm transition-all",
                        intensity === 1 && "bg-amber-500/20 text-zinc-900 dark:text-zinc-100",
                        intensity === 2 && "bg-amber-500/40 text-zinc-900 dark:text-zinc-100",
                        intensity === 3 && "bg-amber-500/60 text-zinc-900 dark:text-zinc-100",
                        intensity === 4 && "bg-amber-500 text-white shadow-sm"
                      )}>
                        {dateNum}
                      </div>
                    ) : (
                      <span className="text-zinc-400 text-sm">{dateNum}</span>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
              <p className="text-[10px] text-zinc-400 font-bold">较少</p>
              <div className="flex gap-1">
                <div className="size-3 rounded-sm bg-zinc-200 dark:bg-zinc-800" />
                <div className="size-3 rounded-sm bg-amber-500/30" />
                <div className="size-3 rounded-sm bg-amber-500/60" />
                <div className="size-3 rounded-sm bg-amber-500" />
              </div>
              <p className="text-[10px] text-zinc-400 font-bold">较多</p>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-zinc-100 dark:bg-zinc-900/50 p-4 rounded-2xl flex flex-col gap-1">
              <p className="text-zinc-500 dark:text-zinc-400 text-xs font-medium">平均间隔</p>
              <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{stats.avgInterval}h</p>
              <div className="flex items-center gap-1 text-emerald-500 text-xs font-bold mt-1">
                <TrendingDown size={12} />
                <span>状态稳定</span>
              </div>
            </div>
            <div className="bg-zinc-100 dark:bg-zinc-900/50 p-4 rounded-2xl flex flex-col gap-1">
              <p className="text-zinc-500 dark:text-zinc-400 text-xs font-medium">月度总计</p>
              <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{stats.monthlyTotal}次</p>
              <div className="flex items-center gap-1 text-amber-500 text-xs font-bold mt-1">
                <Minus size={12} />
                <span>状态稳定</span>
              </div>
            </div>
          </div>

          {renderChart(stats.weeklyData, '每周总次数')}
        </>
      )}

      {/* Health Suggestions (always shown) */}
      <section className="pb-4">
        <h3 className="text-zinc-900 dark:text-zinc-100 text-sm font-bold mb-3">健康建议</h3>
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-4 p-3 bg-zinc-50 dark:bg-zinc-900/30 rounded-xl border border-zinc-200 dark:border-zinc-800">
            <div className="size-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
              <TrendingUp size={20} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold">系统分析结果</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-tight mt-0.5">
                {stats.healthAdvice}
              </p>
            </div>
          </div>
        </div>
      </section>
    </motion.div>
  );
};

const LoginView = ({ onLogin, onGoToRegister, loading, key }: { onLogin: (email: string, password: string) => void, onGoToRegister: () => void, loading: boolean, key?: string }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center min-h-[80vh] p-6 gap-8"
    >
      <div className="text-center flex flex-col gap-2">
        <div className="size-20 bg-amber-500 rounded-3xl mx-auto flex items-center justify-center text-white shadow-lg shadow-amber-500/20 mb-4">
          <CheckCircle2 size={40} />
        </div>
        <h1 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-zinc-100">欢迎回来</h1>
        <p className="text-zinc-500 dark:text-zinc-400">请输入您的邮箱和密码登录</p>
      </div>

      <div className="w-full flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest ml-1">电子邮箱</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            className="w-full p-4 bg-zinc-100 dark:bg-zinc-900 border-2 border-transparent focus:border-amber-500 rounded-2xl outline-none transition-all font-medium"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest ml-1">密码</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="请输入密码"
            className="w-full p-4 bg-zinc-100 dark:bg-zinc-900 border-2 border-transparent focus:border-amber-500 rounded-2xl outline-none transition-all font-medium"
          />
        </div>
        <button
          onClick={() => email && password && onLogin(email, password)}
          disabled={!email || !password || loading}
          className="w-full py-4 bg-amber-500 text-white rounded-2xl font-bold text-lg shadow-lg shadow-amber-500/30 active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin" size={20} />
              登录中...
            </>
          ) : '登录'}
        </button>
      </div>

      <p className="text-sm text-zinc-500">
        还没有账号？
        <button onClick={onGoToRegister} className="text-amber-500 font-bold ml-1 hover:underline">立即注册</button>
      </p>
    </motion.div>
  );
};

const RegisterView = ({ onRegister, onGoToLogin, loading, key }: { onRegister: (email: string, password: string) => void, onGoToLogin: () => void, loading: boolean, key?: string }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSubmit = () => {
    if (password !== confirmPassword) {
      alert('两次输入的密码不一致');
      return;
    }
    if (email && password) {
      onRegister(email, password);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center min-h-[80vh] p-6 gap-8"
    >
      <div className="text-center flex flex-col gap-2">
        <div className="size-20 bg-emerald-500 rounded-3xl mx-auto flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 mb-4">
          <Plus size={40} />
        </div>
        <h1 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-zinc-100">创建账号</h1>
        <p className="text-zinc-500 dark:text-zinc-400">输入邮箱和密码注册</p>
      </div>

      <div className="w-full flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest ml-1">电子邮箱</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            className="w-full p-4 bg-zinc-100 dark:bg-zinc-900 border-2 border-transparent focus:border-emerald-500 rounded-2xl outline-none transition-all font-medium"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest ml-1">密码</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="至少6位密码"
            className="w-full p-4 bg-zinc-100 dark:bg-zinc-900 border-2 border-transparent focus:border-emerald-500 rounded-2xl outline-none transition-all font-medium"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest ml-1">确认密码</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="再次输入密码"
            className="w-full p-4 bg-zinc-100 dark:bg-zinc-900 border-2 border-transparent focus:border-emerald-500 rounded-2xl outline-none transition-all font-medium"
          />
        </div>
        <button
          onClick={handleSubmit}
          disabled={!email || !password || !confirmPassword || loading}
          className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-bold text-lg shadow-lg shadow-emerald-500/30 active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin" size={20} />
              注册中...
            </>
          ) : '注册'}
        </button>
      </div>

      <p className="text-sm text-zinc-500">
        已有账号？
        <button onClick={onGoToLogin} className="text-amber-500 font-bold ml-1 hover:underline">返回登录</button>
      </p>
    </motion.div>
  );
};

const ProfileView = ({ user, onLogout, key }: { user: UserProfile, onLogout: () => void, key?: string }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col gap-6 p-4 pb-24"
    >
      <div className="flex flex-col items-center py-8 gap-4">
        <div className="size-24 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 border-2 border-amber-500/20">
          <User size={48} />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{user.name}</h2>
          <p className="text-sm text-zinc-500">{user.email}</p>
          <p className="text-xs text-zinc-400 mt-1">加入时间: {user.join_date}</p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="p-4 bg-zinc-100 dark:bg-zinc-800/50 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <CheckCircle2 size={18} />
            </div>
            <span className="font-medium">登录状态</span>
          </div>
          <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-full">已登录</span>
        </div>

        <button className="flex items-center justify-between p-4 bg-zinc-100 dark:bg-zinc-800/50 rounded-xl">
          <div className="flex items-center gap-3">
            <Settings size={20} className="text-zinc-500" />
            <span className="font-medium">个人设置</span>
          </div>
          <ChevronRight size={18} className="text-zinc-400" />
        </button>

        <button
          onClick={onLogout}
          className="flex items-center justify-between p-4 bg-red-500/5 dark:bg-red-500/10 rounded-xl mt-4 group"
        >
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500 group-active:scale-90 transition-transform">
              <Share2 size={18} className="rotate-90" />
            </div>
            <span className="font-medium text-red-500">退出登录</span>
          </div>
        </button>
      </div>
    </motion.div>
  );
};

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('health_tracker_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [view, setView] = useState<View>(user ? 'home' : 'login');
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showWaterModal, setShowWaterModal] = useState(false);
  const [analysisTab, setAnalysisTab] = useState<'日' | '周' | '月'>('月');

  // Load activities from API when user changes
  const loadActivities = useCallback(async (userId: string) => {
    setLoading(true);
    try {
      const res = await fetchActivities(userId);
      setActivities(res.activities);
    } catch (err: any) {
      setError(err.message || '加载记录失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadActivities(user.id);
    } else {
      setActivities([]);
    }
  }, [user, loadActivities]);

  const handleLogin = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await loginUser(email, password);
      const userProfile: UserProfile = {
        id: res.user.id,
        email: res.user.email,
        name: res.user.name,
        join_date: res.user.join_date,
      };
      setUser(userProfile);
      localStorage.setItem('health_tracker_user', JSON.stringify(userProfile));
      setView('home');
    } catch (err: any) {
      setError(err.message || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await registerUser(email, password);
      const userProfile: UserProfile = {
        id: res.user.id,
        email: res.user.email,
        name: res.user.name,
        join_date: res.user.join_date,
      };
      setUser(userProfile);
      localStorage.setItem('health_tracker_user', JSON.stringify(userProfile));
      setView('home');
    } catch (err: any) {
      setError(err.message || '注册失败');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setActivities([]);
    localStorage.removeItem('health_tracker_user');
    setView('login');
  };

  // Stats calculation
  const stats = React.useMemo(() => {
    const bowelActivities = [...activities]
      .filter(a => a.type === 'bowel')
      .sort((a, b) => a.timestamp - b.timestamp);
    const waterActivities = activities.filter(a => a.type === 'water');

    // Today's water
    const startOfToday = new Date().setHours(0, 0, 0, 0);
    const todayWaterMl = waterActivities
      .filter(a => a.timestamp >= startOfToday)
      .reduce((sum, a) => {
        const match = a.detail.match(/\d+/);
        return sum + (match ? parseInt(match[0]) : 0);
      }, 0);

    // Average bowel
    const uniqueDays = new Set(bowelActivities.map(a => new Date(a.timestamp).toDateString()));
    const avgBowel = uniqueDays.size > 0
      ? Math.round(bowelActivities.length / uniqueDays.size).toString()
      : "0";

    // Average Interval
    let avgInterval = "0";
    if (bowelActivities.length > 1) {
      let totalDiff = 0;
      for (let i = 1; i < bowelActivities.length; i++) {
        totalDiff += bowelActivities[i].timestamp - bowelActivities[i - 1].timestamp;
      }
      const avgMs = totalDiff / (bowelActivities.length - 1);
      avgInterval = (avgMs / (1000 * 60 * 60)).toFixed(1);
    }

    // Weekly Data (Last 5 weeks, Mon-Sun aligned)
    const weeklyData = (() => {
      const now = new Date();
      const nowDow = now.getDay();
      const nowMondayOffset = nowDow === 0 ? 6 : nowDow - 1;
      const thisMonday = new Date(now);
      thisMonday.setDate(now.getDate() - nowMondayOffset);
      thisMonday.setHours(0, 0, 0, 0);

      return Array.from({ length: 5 }, (_, i) => {
        const weekStart = new Date(thisMonday);
        weekStart.setDate(thisMonday.getDate() - (4 - i) * 7);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);

        const count = bowelActivities.filter(a => a.timestamp >= weekStart.getTime() && a.timestamp <= weekEnd.getTime()).length;
        return { name: `第${i + 1}周`, value: count };
      });
    })();

    // Heatmap data for AnalysisView (Sun-first calendar, last 28 days)
    // Grid columns: 日 一 二 三 四 五 六
    const analysisHeatmapData: { day: number; intensity: number; dateNum: number }[] = [];
    const today = new Date();
    // Find the Sunday that starts the grid (4 weeks ago)
    const todayDow = today.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
    const gridStartDate = new Date(today);
    gridStartDate.setDate(today.getDate() - todayDow - 21); // Sunday 3 weeks ago
    gridStartDate.setHours(0, 0, 0, 0);

    const todayStr = today.toDateString();
    for (let i = 0; i < 28; i++) {
      const cellDate = new Date(gridStartDate);
      cellDate.setDate(gridStartDate.getDate() + i);
      const dateNum = cellDate.getDate();
      if (cellDate > today && cellDate.toDateString() !== todayStr) {
        analysisHeatmapData.push({ day: i, intensity: -1, dateNum });
      } else {
        const dateStr = cellDate.toDateString();
        const count = bowelActivities.filter(a => new Date(a.timestamp).toDateString() === dateStr).length;
        analysisHeatmapData.push({ day: i, intensity: Math.min(count, 4), dateNum });
      }
    }

    // Heatmap data for RecordsView (Mon-first, last 28 days)
    const recordsHeatmapData: { day: number; intensity: number }[] = [];
    const recordsMondayOffset = todayDow === 0 ? 6 : todayDow - 1;
    const recordsGridStart = new Date(today);
    recordsGridStart.setDate(today.getDate() - recordsMondayOffset - 21);
    recordsGridStart.setHours(0, 0, 0, 0);

    for (let i = 0; i < 28; i++) {
      const cellDate = new Date(recordsGridStart);
      cellDate.setDate(recordsGridStart.getDate() + i);
      if (cellDate > today && cellDate.toDateString() !== todayStr) {
        recordsHeatmapData.push({ day: i, intensity: -1 });
      } else {
        const dateStr = cellDate.toDateString();
        const count = bowelActivities.filter(a => new Date(a.timestamp).toDateString() === dateStr).length;
        recordsHeatmapData.push({ day: i, intensity: Math.min(count, 4) });
      }
    }

    // Health Advice
    let healthAdvice = "您的排便规律性良好。建议保持充足的饮水量和纤维摄入。";
    if (parseFloat(avgInterval) > 48) {
      healthAdvice = "最近排便间隔较长，建议增加膳食纤维摄入并多喝水。";
    } else if (bowelActivities.length > 0 && todayWaterMl < 1500) {
      healthAdvice = "今日饮水量不足，可能会影响排便顺畅度，请及时补充水分。";
    }

    return {
      avgBowel,
      avgInterval,
      todayWater: (todayWaterMl / 1000).toFixed(1),
      monthlyTotal: bowelActivities.length,
      heatmapData: recordsHeatmapData,
      analysisHeatmapData,
      weeklyData,
      healthAdvice
    };
  }, [activities]);

  const addActivity = async (type: 'bowel' | 'water', customDetail?: string) => {
    if (!user) return;

    const now = new Date();
    const timeStr = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
    const period = now.getHours() < 12 ? '上午' : '下午';

    const activityData = {
      user_id: user.id,
      type,
      time: `${period} ${timeStr}`,
      title: type === 'bowel' ? '如厕记录' : '饮水记录',
      detail: customDetail || (type === 'bowel' ? '类型 4 • 软硬适中' : '摄入量：250毫升'),
      timestamp: Date.now(),
    };

    try {
      const res = await createActivity(activityData);
      // Prepend new activity to the list (already sorted DESC from server)
      setActivities(prev => [res.activity, ...prev]);
    } catch (err: any) {
      setError(err.message || '创建记录失败');
    }
  };

  const undoLastActivity = async () => {
    if (activities.length === 0) return;
    const lastActivity = activities[0];

    try {
      await deleteActivity(lastActivity.id);
      setActivities(prev => prev.filter(a => a.id !== lastActivity.id));
    } catch (err: any) {
      setError(err.message || '撤销记录失败');
    }
  };

  const renderHeader = () => {
    switch (view) {
      case 'home':
        return <Header title="如厕与饮水记录" />;
      case 'records':
        return (
          <div className="sticky top-0 z-40 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
            <Header title="如厕记录" leftAction={<Clock className="text-amber-500" size={24} />} rightAction={<Settings size={24} />} />
          </div>
        );
      case 'analysis':
        return (
          <div className="sticky top-0 z-40 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
            <Header title="健康分析" />
            <div className="max-w-md mx-auto px-4">
              <div className="flex justify-between gap-8">
                {(['日', '周', '月'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setAnalysisTab(tab)}
                    className={cn(
                      "flex-1 py-3 border-b-2 font-bold text-sm transition-colors",
                      analysisTab === tab ? "border-amber-500 text-amber-500" : "border-transparent text-zinc-500"
                    )}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );
      case 'profile':
        return <Header title="个人中心" />;
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans selection:bg-amber-500/30">
      <div className="w-full md:max-w-md mx-auto relative md:border-x border-zinc-200 dark:border-zinc-800">
        {view !== 'login' && view !== 'register' && renderHeader()}

        <main className="overflow-x-hidden">
          <AnimatePresence mode="wait">
            {view === 'login' && <LoginView key="login" onLogin={handleLogin} onGoToRegister={() => setView('register')} loading={loading} />}
            {view === 'register' && <RegisterView key="register" onRegister={handleRegister} onGoToLogin={() => setView('login')} loading={loading} />}
            {view === 'home' && (
              <HomeView
                key="home"
                activities={activities}
                stats={stats}
                loading={loading}
                onViewDetails={() => setView('records')}
                onRecordBowel={(detail) => addActivity('bowel', detail)}
                onRecordWater={() => setShowWaterModal(true)}
                onUndo={undoLastActivity}
              />
            )}
            {view === 'records' && <RecordsView key="records" activities={activities} heatmapData={stats.heatmapData} loading={loading} />}
            {view === 'analysis' && <AnalysisView key={`analysis-${analysisTab}`} stats={stats} tab={analysisTab} activities={activities} />}
            {view === 'profile' && user && <ProfileView key="profile" user={user} onLogout={handleLogout} />}
          </AnimatePresence>
        </main>

        <WaterSelectionModal
          isOpen={showWaterModal}
          onClose={() => setShowWaterModal(false)}
          onSelect={(amount) => addActivity('water', `摄入量：${amount}`)}
        />

        {view !== 'login' && view !== 'register' && <BottomNav activeView={view} setView={setView} />}
      </div>

      {/* Error Toast */}
      <AnimatePresence>
        {error && <ErrorToast message={error} onClose={() => setError(null)} />}
      </AnimatePresence>
    </div>
  );
}
