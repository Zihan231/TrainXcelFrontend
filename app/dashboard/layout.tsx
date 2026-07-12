"use client";

import React, { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import { useUser } from "@/hooks/useUser";
import { useTheme } from "@/context/ThemeContext";
import { api } from "@/libs/api";
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
  Users,
  PlusCircle,
  Phone,
  MapPin,
  Mail,
  User as UserIcon,
  Trash2,
  Menu,
  X,
} from "lucide-react";

// Sidebar content that uses search params
function SidebarContent({ isMobile = false, onClose }: { isMobile?: boolean; onClose?: () => void }) {
  const { logout } = useAuth();
  const { name, email, role } = useUser();
  const searchParams = useSearchParams();
  const defaultTab = role === "admin" || role === "employee" ? "overview" : "progress";
  const currentTab = searchParams.get("tab") || defaultTab;

  const isAdminOrEmployee = role === "admin" || role === "employee";
  const isAdmin = role === "admin";

  return (
    <aside className={`flex flex-col bg-white px-4 py-6 dark:bg-[#121212] ${isMobile ? "w-full h-full" : "hidden lg:flex w-64 border-r border-slate-200 dark:border-zinc-800"}`}>
      {/* Brand */}
      <div className="mb-10 flex items-center justify-between px-2">
        <div className="flex items-center gap-3">
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
        {isMobile && onClose && (
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Main Navigation */}
      <nav className="flex flex-1 flex-col gap-1">
        {isAdminOrEmployee ? (
          <>
            <NavItem
              icon={<LayoutDashboard size={18} />}
              label="Overview"
              href="/dashboard?tab=overview"
              active={currentTab === "overview"}
              onClick={onClose}
            />
            <NavItem
              icon={<PlusCircle size={18} />}
              label="Manage Courses"
              href="/dashboard?tab=manage-courses"
              active={currentTab === "manage-courses"}
              onClick={onClose}
            />
            {isAdmin && (
              <NavItem
                icon={<Users size={18} />}
                label="User Management"
                href="/dashboard?tab=users"
                active={currentTab === "users"}
                onClick={onClose}
              />
            )}
          </>
        ) : (
          <>
            <NavItem
              icon={<BookOpen size={18} />}
              label="My Learning"
              href="/dashboard?tab=my-learning"
              active={currentTab === "my-learning" || currentTab === "overview"}
              onClick={onClose}
            />
            <NavItem
              icon={<Library size={18} />}
              label="Course Catalog"
              href="/dashboard?tab=catalog"
              active={currentTab === "catalog"}
              onClick={onClose}
            />
            <NavItem
              icon={<BarChart3 size={18} />}
              label="My Progress"
              href="/dashboard?tab=progress"
              active={currentTab === "progress"}
              onClick={onClose}
            />
            <NavItem
              icon={<Award size={18} />}
              label="Certificates"
              href="/dashboard?tab=certificates"
              active={currentTab === "certificates"}
              onClick={onClose}
            />
          </>
        )}
      </nav>

      {/* System Navigation */}
      <div className="mb-4 px-3 text-xs font-semibold tracking-wider text-slate-400">
        SYSTEM
      </div>
      <nav className="flex flex-col gap-1">
        {isAdminOrEmployee && (
          <NavItem
            icon={<Trash2 size={18} />}
            label="Recycle Bin"
            href="/dashboard?tab=trash"
            active={currentTab === "trash"}
            onClick={onClose}
          />
        )}
        <NavItem
          icon={<Settings size={18} />}
          label="Settings"
          href="/dashboard?tab=settings"
          active={currentTab === "settings"}
          onClick={onClose}
        />
        <button
          onClick={() => {
            onClose?.();
            logout();
          }}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/30"
        >
          <LogOut size={18} />
          Logout
        </button>
      </nav>
    </aside>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { logout, reloadProfile } = useAuth();
  const { name, email, role, userId } = useUser();
  const { theme, toggle } = useTheme();

  // Dropdown & Modal States
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Form Fields
  const [nameInput, setNameInput] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [addressInput, setAddressInput] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState("");

  const openEditModal = async () => {
    setIsDropdownOpen(false);
    setIsEditModalOpen(true);
    setProfileError("");
    try {
      const res = await api.get("/auth/profile");
      setNameInput(res.data.name || "");
      setPhoneInput(res.data.phoneNumber || "");
      setAddressInput(res.data.address || "");
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError("");
    setIsSavingProfile(true);
    try {
      await api.patch(`/auth/users/${userId}`, {
        name: nameInput,
        phoneNumber: phoneInput,
        address: addressInput,
      });
      await reloadProfile();
      setIsEditModalOpen(false);
    } catch (err: any) {
      setProfileError(err.response?.data?.message || "Failed to update profile.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="flex h-screen w-full bg-slate-50 font-sans dark:bg-[#0a0a0a]">
        {/* =======================================================================
          LEFT SIDEBAR (Wrapped in Suspense because of useSearchParams)
          ======================================================================= */}
        <Suspense fallback={
          <aside className="hidden w-64 flex-col border-r border-slate-200 bg-white px-4 py-6 dark:border-zinc-800 dark:bg-[#121212] lg:flex">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
          </aside>
        }>
          <SidebarContent />
        </Suspense>

        {/* =======================================================================
          MAIN CONTENT AREA (Header + Children)
          ======================================================================= */}
        <main className="flex flex-1 flex-col overflow-hidden">
          {/* Top Header */}
          <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white/80 px-8 backdrop-blur-sm dark:border-zinc-800 dark:bg-[#121212]/80 relative z-30">
            {/* Spacer to push actions to the right */}
            <button
              onClick={() => setIsMobileOpen(true)}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-zinc-800 lg:hidden"
              title="Open menu"
            >
              <Menu size={20} />
            </button>

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
              
              {/* Profile Avatar Clickable Area */}
              <div className="relative">
                <div 
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex cursor-pointer items-center gap-3 hover:opacity-85 select-none"
                >
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-semibold text-slate-900 dark:text-zinc-50">
                      {name}
                    </p>
                    <p className="text-[10px] font-bold tracking-wider text-blue-600 dark:text-blue-400">
                      {role.toUpperCase()}
                    </p>
                  </div>
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white dark:bg-blue-500">
                    {name.charAt(0).toUpperCase()}
                  </div>
                </div>

                {/* Profile Header Dropdown Menu */}
                {isDropdownOpen && (
                  <div className="absolute right-0 mt-3 w-56 rounded-2xl border border-slate-200 bg-white p-2.5 shadow-xl dark:border-zinc-800 dark:bg-[#121212] animate-fadeIn">
                    <div className="px-3.5 py-2 border-b border-slate-100 dark:border-zinc-800/80 mb-1">
                      <p className="text-xs font-semibold text-slate-400">Signed in as</p>
                      <p className="text-sm font-bold text-slate-900 truncate dark:text-zinc-50 mt-0.5">{name}</p>
                      <p className="text-[10px] text-slate-400 truncate dark:text-zinc-500 mt-0.5">{email}</p>
                    </div>
                    
                    <button
                      onClick={openEditModal}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition dark:text-zinc-300 dark:hover:bg-zinc-800/40"
                    >
                      <UserIcon size={16} />
                      Edit Profile
                    </button>
                    
                    <button
                      onClick={logout}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition dark:text-red-400 dark:hover:bg-red-950/20"
                    >
                      <LogOut size={16} />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Scrollable Page Content injected here */}
          <div className="flex-1 overflow-y-auto px-8 pt-4 pb-8">
            <div className="mx-auto max-w-6xl">{children}</div>
          </div>
        </main>
      </div>

      {/* Mobile Sidebar Drawer Overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-black/55 backdrop-blur-xs transition-opacity animate-fadeIn"
            onClick={() => setIsMobileOpen(false)}
          />
          {/* Sidebar drawer content container */}
          <div className="relative flex w-64 max-w-xs flex-col bg-white dark:bg-[#121212] animate-slideIn">
            <Suspense fallback={
              <aside className="w-full flex h-full flex-col bg-white px-4 py-6 dark:bg-[#121212]">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
              </aside>
            }>
              <SidebarContent isMobile={true} onClose={() => setIsMobileOpen(false)} />
            </Suspense>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-[#121212] animate-scaleIn">
            <h3 className="text-lg font-bold text-slate-900 dark:text-zinc-50 flex items-center gap-2">
              <UserIcon size={18} className="text-blue-600" /> Edit Profile Details
            </h3>
            
            {profileError && (
              <div className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-400">
                {profileError}
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="mt-4 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-500">Full Name</label>
                <input
                  type="text" value={nameInput} onChange={(e) => setNameInput(e.target.value)}
                  placeholder="e.g. Alex Mercer" required
                  className="rounded-xl border border-slate-200 bg-transparent px-3.5 py-2.5 text-sm focus:border-blue-600 focus:outline-none dark:border-zinc-800"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-500">Phone Number</label>
                <div className="relative">
                  <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text" value={phoneInput} onChange={(e) => setPhoneInput(e.target.value)}
                    placeholder="e.g. +1 555-0100"
                    className="w-full rounded-xl border border-slate-200 bg-transparent pl-10 pr-3.5 py-2.5 text-sm focus:border-blue-600 focus:outline-none dark:border-zinc-800"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-500">Address</label>
                <div className="relative">
                  <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text" value={addressInput} onChange={(e) => setAddressInput(e.target.value)}
                    placeholder="e.g. New York, NY"
                    className="w-full rounded-xl border border-slate-200 bg-transparent pl-10 pr-3.5 py-2.5 text-sm focus:border-blue-600 focus:outline-none dark:border-zinc-800"
                  />
                </div>
              </div>

              <div className="mt-4 flex justify-end gap-3 border-t border-slate-100 dark:border-zinc-800/80 pt-4">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  disabled={isSavingProfile}
                  className="rounded-xl border border-slate-200 bg-transparent px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSavingProfile ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  href: string;
  active?: boolean;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
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