"use client";

import { useDashboardStats } from "@/hooks/useDashboardStats";
import { useUser } from "@/hooks/useUser";
import { useTheme } from "@/context/ThemeContext";
import {
  Users, BookOpen, Briefcase, TrendingUp,
  AlertTriangle, Activity, Trophy,
} from "lucide-react";
import {
  AreaChart, Area,
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine,
} from "recharts";

// Generates a unique color for any index using HSL
function getColor(i: number): string {
  const hues = [217, 262, 158, 38, 0, 187, 291, 48, 142, 199];
  const h = hues[i % hues.length];
  return `hsl(${h}, 70%, 55%)`;
}

export default function DashboardPage() {
  const { name } = useUser();
  const { theme } = useTheme();
  const dark = theme === "dark";

  const {
    stats, monthly, courseComparison, categories,
    materials, atRisk, recentActivity, userPerformance,
    isLoading, error,
  } = useDashboardStats();

  const grid        = dark ? "#27272a" : "#f1f5f9";
  const tickColor   = dark ? "#71717a" : "#94a3b8";
  const tooltipStyle = {
    backgroundColor: dark ? "#1c1c1c" : "#ffffff",
    border: `1px solid ${dark ? "#2d2d2d" : "#e2e8f0"}`,
    borderRadius: 10,
    boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
    fontSize: 12,
    color: dark ? "#fafafa" : "#0f172a",
    padding: "8px 12px",
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-400">
        {error}
      </div>
    );
  }

  // Dynamic chart width: min 500px, grows with course count
  const courseChartWidth = Math.max(500, courseComparison.length * 80);

  // Add a tiny floor so 0% bars are still visible
  const comparisonData = courseComparison.map((c) => ({
    ...c,
    displayRate: c.completionRate === 0 ? 0.8 : c.completionRate,
    shortName: c.name.length > 12 ? c.name.slice(0, 12) + "…" : c.name,
  }));

  const materialData = materials.map((m) => ({
    ...m,
    completionRate: m.availableLessonsCount > 0
      ? Math.round((m.totalCompletedLessonsCount / m.availableLessonsCount) * 100)
      : 0,
  }));

  return (
    <div className="flex flex-col gap-6 pb-8">

      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-zinc-50">
          Welcome back, {name} 👋
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">
          Here&apos;s what&apos;s happening across your organization.
        </p>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={<Users size={18} />}      label="Total Users"     value={stats?.totalUsers ?? 0}                              accent="#3b82f6" />
        <StatCard icon={<BookOpen size={18} />}   label="Total Courses"   value={stats?.totalCourses ?? 0}                            accent="#8b5cf6" />
        <StatCard icon={<Briefcase size={18} />}  label="Employees"       value={stats?.totalEmployees ?? 0}                          accent="#10b981" />
        <StatCard icon={<TrendingUp size={18} />} label="Completion Rate" value={`${stats?.overallCompletionRate?.toFixed(1) ?? 0}%`} accent="#f59e0b" />
      </div>

      {/* ── Row 1: Area + Materials ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

        {/* Monthly Trend — spans 2 cols */}
        <Card className="lg:col-span-2" title="Monthly Progress Trend" subtitle="Average learner progress over time">
          {/* KPI row */}
          {monthly.length > 0 && (() => {
            const latest = monthly[monthly.length - 1];
            const prev   = monthly[monthly.length - 2];
            const delta  = prev ? +(latest.progress - prev.progress).toFixed(1) : 0;
            const avg    = +(monthly.reduce((s, m) => s + m.progress, 0) / monthly.length).toFixed(1);
            return (
              <div className="mb-5 flex items-end gap-6">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Latest</p>
                  <p className="mt-0.5 text-3xl font-bold text-slate-900 dark:text-zinc-50">{latest.progress}%</p>
                  <p className="mt-1 text-xs" style={{ color: delta >= 0 ? "#10b981" : "#ef4444" }}>
                    {delta >= 0 ? "▲" : "▼"} {Math.abs(delta)}% vs {prev?.month}
                  </p>
                </div>
                <div className="h-10 w-px bg-slate-100 dark:bg-zinc-800" />
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Avg</p>
                  <p className="mt-0.5 text-xl font-bold text-slate-700 dark:text-zinc-300">{avg}%</p>
                </div>
                <div className="h-10 w-px bg-slate-100 dark:bg-zinc-800" />
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Months</p>
                  <p className="mt-0.5 text-xl font-bold text-slate-700 dark:text-zinc-300">{monthly.length}</p>
                </div>
              </div>
            );
          })()}
          <ResponsiveContainer width="100%" height={210}>
            <AreaChart data={monthly} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
              <defs>
                <linearGradient id="grad1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#3b82f6" stopOpacity={dark ? 0.5 : 0.3} />
                  <stop offset="60%"  stopColor="#8b5cf6" stopOpacity={dark ? 0.2 : 0.1} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%"   stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={grid} strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: tickColor, fontWeight: 500 }}
                axisLine={false} tickLine={false}
                interval={0}
                angle={-35}
                textAnchor="end"
                height={48}
              />
              <YAxis
                tick={{ fontSize: 11, fill: tickColor }}
                axisLine={false} tickLine={false}
                domain={[0, 100]} unit="%" width={36}
              />
              <ReferenceLine
                y={monthly.length > 0 ? +(monthly.reduce((s, m) => s + m.progress, 0) / monthly.length).toFixed(1) : 0}
                stroke={dark ? "#52525b" : "#cbd5e1"}
                strokeDasharray="5 4"
                label={{ value: "avg", position: "insideTopRight", fontSize: 10, fill: tickColor }}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v: number) => [`${v}%`, "Progress"]}
                cursor={{ stroke: "#8b5cf6", strokeWidth: 1.5, strokeDasharray: "4 4" }}
              />
              <Area
                type="monotoneX" dataKey="progress"
                stroke="url(#lineGrad)" strokeWidth={3}
                fill="url(#grad1)"
                dot={({ cx, cy, index }: any) => (
                  <circle
                    key={index} cx={cx} cy={cy} r={index === monthly.length - 1 ? 6 : 4}
                    fill={index === monthly.length - 1 ? "#8b5cf6" : "#3b82f6"}
                    stroke={dark ? "#1c1c1c" : "#fff"} strokeWidth={2}
                  />
                )}
                activeDot={{ r: 7, fill: "#8b5cf6", stroke: dark ? "#1c1c1c" : "#fff", strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
          {/* Month pills */}
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {monthly.map((m, i) => (
              <div
                key={i}
                className="flex shrink-0 flex-col items-center rounded-xl px-3 py-2"
                style={{ backgroundColor: i === monthly.length - 1 ? (dark ? "#3b82f620" : "#eff6ff") : (dark ? "#27272a" : "#f8fafc") }}
              >
                <span className="text-[10px] font-medium text-slate-400 whitespace-nowrap">{m.month}</span>
                <span
                  className="mt-0.5 text-sm font-bold"
                  style={{ color: i === monthly.length - 1 ? "#3b82f6" : (dark ? "#a1a1aa" : "#475569") }}
                >
                  {m.progress}%
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* Material Breakdown */}
        <Card title="Material Breakdown" subtitle="Completion rate by type">
          <div className="flex flex-col gap-4 pt-2">
            {materialData.map((m, i) => (
              <div key={m.materialType}>
                <div className="mb-1.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: getColor(i) }} />
                    <span className="text-sm font-medium text-slate-700 dark:text-zinc-300">{m.materialType}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-slate-900 dark:text-zinc-50">{m.completionRate}%</span>
                    <span className="ml-2 text-xs text-slate-400">{m.totalCompletedLessonsCount}/{m.availableLessonsCount}</span>
                  </div>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-zinc-800">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${m.completionRate}%`, backgroundColor: getColor(i) }}
                  />
                </div>
              </div>
            ))}

            {/* Donut-style summary */}
            <div className="mt-2 grid grid-cols-3 gap-2">
              {materialData.map((m, i) => (
                <div key={i} className="flex flex-col items-center rounded-xl py-3" style={{ backgroundColor: dark ? `${getColor(i)}18` : `${getColor(i)}15` }}>
                  <span className="text-lg font-bold" style={{ color: getColor(i) }}>{m.completionRate}%</span>
                  <span className="text-[10px] text-slate-400 mt-0.5">{m.materialType}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

      </div>

      {/* ── Row 2: Course Completion (scrollable) + Category ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

        {/* Course Completion — scrollable, spans 2 cols */}
        <Card className="lg:col-span-2" title="Course Completion Rates" subtitle={`${courseComparison.length} courses · scroll to see all`}>
          <div className="overflow-x-auto pb-1">
            <div style={{ width: courseChartWidth, minWidth: "100%" }}>
              <BarChart width={courseChartWidth} height={230} data={comparisonData} margin={{ top: 10, right: 10, left: -8, bottom: 8 }}>
                <CartesianGrid stroke={grid} strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="shortName"
                  tick={{ fontSize: 11, fill: tickColor }}
                  axisLine={false} tickLine={false}
                  interval={0}
                />
                <YAxis tick={{ fontSize: 11, fill: tickColor }} axisLine={false} tickLine={false} domain={[0, 100]} unit="%" width={38} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v: number, _: string, props: any) => {
                    const real = props.payload.completionRate;
                    return [`${real}%`, "Completion"];
                  }}
                  labelFormatter={(_, p) => p?.[0]?.payload?.name ?? ""}
                  cursor={{ fill: dark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)", radius: 6 }}
                />
                <Bar dataKey="displayRate" radius={[6, 6, 0, 0]} maxBarSize={52}>
                  {comparisonData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={getColor(i)}
                      fillOpacity={entry.completionRate === 0 ? 0.3 : 1}
                    />
                  ))}
                </Bar>
              </BarChart>
            </div>
          </div>
          {/* Legend */}
          <div className="mt-3 flex flex-wrap gap-2">
            {comparisonData.map((c, i) => (
              <div key={i} className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs" style={{ backgroundColor: dark ? `${getColor(i)}20` : `${getColor(i)}15`, color: getColor(i) }}>
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: getColor(i) }} />
                <span className="font-medium">{c.name}</span>
                <span className="opacity-70">· {c.completionRate}%</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Category Performance */}
        <Card title="Category Performance" subtitle="Avg progress per category">
          <div className="flex flex-col gap-4 pt-2">
            {categories.map((cat, i) => (
              <div key={cat.categoryId}>
                <div className="mb-1.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: getColor(i) }} />
                    <span className="text-sm font-medium text-slate-700 dark:text-zinc-300">{cat.categoryName}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-slate-900 dark:text-zinc-50">{cat.averageProgress.toFixed(0)}%</span>
                    <span className="ml-2 text-xs text-slate-400">{cat.totalEnrolled} enrolled</span>
                  </div>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-zinc-800">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${cat.averageProgress}%`, backgroundColor: getColor(i) }}
                  />
                </div>
                <p className="mt-1 text-[11px] text-slate-400">{cat.coursesCount} course{cat.coursesCount !== 1 ? "s" : ""}</p>
              </div>
            ))}
          </div>
        </Card>

      </div>

      {/* ── Row 3: Leaderboard + At-Risk + Activity ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

        {/* Leaderboard */}
        <Card title="Leaderboard" subtitle="Ranked by average progress" icon={<Trophy size={14} className="text-amber-500" />}>
          <div className="mt-3 flex flex-col gap-1">
            {userPerformance.map((u, i) => {
              const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;
              return (
                <div key={u.userId} className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-slate-50 dark:hover:bg-zinc-800/40">
                  <span className="w-5 shrink-0 text-center text-sm">
                    {medal ?? <span className="text-xs font-bold text-slate-400">{i + 1}</span>}
                  </span>
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" style={{ backgroundColor: getColor(i) }}>
                    {u.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900 dark:text-zinc-50">{u.name}</p>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono font-semibold" style={{ color: getColor(i) }}>{u.userId}</span>
                      <span className="text-[10px] text-slate-300 dark:text-zinc-600">·</span>
                      <span className="text-[11px] capitalize text-slate-400">{u.role}</span>
                      <span className="text-[10px] text-slate-300 dark:text-zinc-600">·</span>
                      <span className="text-[11px] text-slate-400">{u.activeCoursesCount} active</span>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-bold" style={{ color: getColor(i) }}>{u.averageProgress.toFixed(0)}%</p>
                    <p className="text-[11px] text-slate-400">{u.completedCoursesCount} done</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* At-Risk */}
        <Card title="At-Risk Learners" subtitle="Enrolled with 0% progress" icon={<AlertTriangle size={14} className="text-amber-500" />}>
          <div className="mt-3">
            {atRisk.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-10">
                <span className="text-4xl">🎉</span>
                <p className="text-sm font-medium text-slate-500 dark:text-zinc-400">No at-risk learners!</p>
                <p className="text-xs text-slate-400">Everyone is making progress</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {atRisk.map((u) => (
                  <div key={`${u.userId}-${u.courseId}`} className="rounded-xl border border-amber-100 bg-gradient-to-r from-amber-50 to-orange-50 p-4 dark:border-amber-900/20 dark:from-amber-900/10 dark:to-orange-900/10">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900 dark:text-zinc-50">{u.name}</p>
                        <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-zinc-400">{u.courseName}</p>
                        <p className="mt-0.5 text-[11px] text-slate-400">{u.email}</p>
                      </div>
                      <span className="shrink-0 rounded-full bg-amber-200 px-2.5 py-1 text-xs font-bold text-amber-800 dark:bg-amber-900/40 dark:text-amber-400">
                        {u.progress}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Recent Activity */}
        <Card title="Recent Activity" subtitle="Latest platform actions" icon={<Activity size={14} className="text-blue-500" />}>
          <div className="mt-3 flex flex-col">
            {recentActivity.slice(0, 6).map((a, i) => (
              <div key={a.activityId} className="flex items-start gap-3 border-b border-slate-100 py-3 last:border-0 dark:border-zinc-800">
                <div
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{ backgroundColor: getColor(i) }}
                >
                  {a.userName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs leading-relaxed text-slate-600 dark:text-zinc-400">{a.message}</p>
                  <span
                    className="mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize"
                    style={{ backgroundColor: dark ? `${getColor(i)}20` : `${getColor(i)}15`, color: getColor(i) }}
                  >
                    {a.type}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>

      </div>
    </div>
  );
}

// ── Sub-components ──

function Card({ title, subtitle, icon, className = "", children }: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-white p-6 dark:border-zinc-800 dark:bg-[#121212] ${className}`}>
      <div className="flex items-start gap-2">
        {icon && <div className="mt-0.5">{icon}</div>}
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-50">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

function StatCard({ icon, label, value, accent }: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  accent: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 dark:border-zinc-800 dark:bg-[#121212]">
      <div className="mb-3 inline-flex rounded-xl p-2.5" style={{ backgroundColor: `${accent}18`, color: accent }}>
        {icon}
      </div>
      <p className="text-2xl font-bold text-slate-900 dark:text-zinc-50">{value}</p>
      <p className="mt-0.5 text-xs font-medium text-slate-500 dark:text-zinc-400">{label}</p>
      <div className="absolute bottom-0 left-0 h-[3px] w-full" style={{ backgroundColor: accent, opacity: 0.8 }} />
    </div>
  );
}
