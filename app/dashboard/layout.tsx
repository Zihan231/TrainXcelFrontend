"use client";

import React from "react";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import { useUser } from "@/hooks/useUser";
import { useTheme } from "@/context/ThemeContext";
import {
  Search,
  Bell,
  Gift,
  Moon,
  Sun,
  LayoutDashboard,
  Library,
  BookOpen,
  BarChart3,
  Award,
  Settings,
  LogOut,
} from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { logout } = useAuth();
  const { name, email, role } = useUser();
  const { theme, toggle } = useTheme();
  return (
    <ProtectedRoute>
      <div className="flex h-screen w-full bg-slate-50 font-sans dark:bg-[#0a0a0a]">
        {/* =======================================================================
          LEFT SIDEBAR 
          ======================================================================= */}
        <aside className="hidden w-64 flex-col border-r border-slate-200 bg-white px-4 py-6 dark:border-zinc-800 dark:bg-[#121212] lg:flex">
          {/* Brand */}
          <div className="mb-10 flex items-center gap-3 px-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
              >
                <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                <path d="M6 12v5c3 3 9 3 12 0v-5" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight text-slate-900 dark:text-zinc-50">
                TrainXcel
              </h1>
              <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                Enterprise LMS
              </p>
            </div>
          </div>

          {/* Main Navigation */}
          <nav className="flex flex-1 flex-col gap-1">
            <NavItem icon={<LayoutDashboard size={18} />} label="Overview" href="/dashboard" active />
            <NavItem icon={<Library size={18} />} label="Course Catalog" href="#" />
            <NavItem icon={<BookOpen size={18} />} label="My Learning" href="#" />
            <NavItem icon={<BarChart3 size={18} />} label="Analytics" href="#" />
            <NavItem icon={<Award size={18} />} label="Certificates" href="#" />
          </nav>

          {/* System Navigation */}
          <div className="mb-4 px-3 text-xs font-semibold tracking-wider text-slate-400">
            SYSTEM
          </div>
          <nav className="flex flex-col gap-1">
            <NavItem icon={<Settings size={18} />} label="Settings" href="#" />
            <button
              onClick={logout}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/30"
            >
              <LogOut size={18} />
              Logout
            </button>
          </nav>
        </aside>

        {/* =======================================================================
          MAIN CONTENT AREA (Header + Children)
          ======================================================================= */}
        <main className="flex flex-1 flex-col overflow-hidden">
          {/* Top Header */}
          <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white/80 px-8 backdrop-blur-sm dark:border-zinc-800 dark:bg-[#121212]/80">
            {/* Search */}
            <div className="relative w-96">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder="Search courses, mentors, or topics..."
                className="w-full rounded-full border-none bg-slate-100 py-2 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-600/50 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder:text-zinc-400"
              />
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-5">
              <div className="flex items-center gap-3 text-slate-400">
                <button className="hover:text-slate-600 dark:hover:text-zinc-200">
                  <Bell size={20} />
                </button>
                <button className="hover:text-slate-600 dark:hover:text-zinc-200">
                  <Gift size={20} />
                </button>
                <button
                  onClick={() => toggle()}
                  className="hover:text-slate-600 dark:hover:text-zinc-200"
                >
                  {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
                </button>
              </div>
              <div className="h-6 w-px bg-slate-200 dark:bg-zinc-700"></div>
              <div className="flex cursor-pointer items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-900 dark:text-zinc-50">
                    {name}
                  </p>
                  <p className="text-[10px] font-bold tracking-wider text-blue-600 dark:text-blue-400">
                    {role.toUpperCase()}
                  </p>
                  <p className="text-[10px] text-slate-400 dark:text-zinc-500">
                    {email}
                  </p>
                </div>
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white dark:bg-blue-500">
                  {name.charAt(0).toUpperCase()}
                </div>
              </div>
            </div>
          </header>

          {/* Scrollable Page Content injected here */}
          <div className="flex-1 overflow-y-auto p-8">
            <div className="mx-auto max-w-6xl">{children}</div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}

// NavItem Helper Component
function NavItem({
  icon,
  label,
  href,
  active = false,
  className = "",
}: {
  icon: React.ReactNode;
  label: string;
  href: string;
  active?: boolean;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
        active
          ? "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
          : `text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-50 ${className}`
      }`}
    >
      {icon}
      {label}
    </Link>
  );
}