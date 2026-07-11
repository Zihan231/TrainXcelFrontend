"use client";

import { useState, useEffect, Suspense, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { useUser } from "@/hooks/useUser";
import { useTheme } from "@/context/ThemeContext";
import { useCourses, Course, Lesson, UserProfile } from "@/hooks/useCourses";
import { api } from "@/libs/api";
import {
  Users as UsersIcon, BookOpen, Briefcase, TrendingUp,
  AlertTriangle, Activity, Trophy, PlusCircle, CheckCircle,
  Play, FileText, ExternalLink, ShieldAlert, Award, Search,
  Check, BookOpenCheck, Settings, ArrowLeft, MonitorPlay, Sparkles, Filter,
  Maximize2, LayoutGrid, List
} from "lucide-react";
import {
  AreaChart, Area,
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine,
} from "recharts";

// Generates a unique color for any index using HSL
function getColor(i: number): string {
  const colors = [
    "#3b82f6", // Blue
    "#8b5cf6", // Purple
    "#10b981", // Emerald
    "#f59e0b", // Amber
    "#f43f5e", // Rose
    "#06b6d4", // Cyan
    "#d946ef", // Magenta
    "#84cc16", // Lime
    "#ec4899", // Pink
    "#14b8a6"  // Teal
  ];
  return colors[i % colors.length];
}

function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="relative flex items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500/20 border-t-blue-600" />
        <Sparkles className="absolute h-5 w-5 text-blue-500 animate-pulse" />
      </div>
      <p className="text-sm font-medium text-slate-500 dark:text-zinc-400 animate-pulse">Loading training ecosystem...</p>
    </div>
  );
}

function getEmbedLink(url: string): string {
  if (!url) return "";
  try {
    // Check YouTube watch link
    if (url.includes("youtube.com/watch")) {
      const urlObj = new URL(url);
      const v = urlObj.searchParams.get("v");
      if (v) return `https://www.youtube.com/embed/${v}`;
    }
    // Check YouTube short link
    if (url.includes("youtu.be/")) {
      const parts = url.split("/");
      const id = parts[parts.length - 1]?.split("?")[0];
      if (id) return `https://www.youtube.com/embed/${id}`;
    }
  } catch (e) {
    console.error("Invalid URL in getEmbedLink", e);
  }
  return url;
}

function DashboardPageContent() {
  const { name, role, email, userId } = useUser();
  const playerRef = useRef<HTMLDivElement>(null);

  const toggleFullScreen = () => {
    if (playerRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        playerRef.current.requestFullscreen().catch((err) => {
          console.error("Error entering fullscreen mode:", err);
        });
      }
    }
  };
  const { theme } = useTheme();
  const searchParams = useSearchParams();
  const router = useRouter();
  const defaultTab = role === "admin" || role === "employee" ? "overview" : "progress";
  const currentTab = searchParams.get("tab") || defaultTab;
  const dark = theme === "dark";

  const isAdminOrEmployee = role === "admin" || role === "employee";
  const isAdmin = role === "admin";

  // Dashboard Stats Hook (Admin/Employee Stats)
  const {
    stats, monthly, courseComparison, categories,
    materials, atRisk, recentActivity, userPerformance,
    isLoading: isStatsLoading, error: statsError,
  } = useDashboardStats();

  // Course hook (Used by both admin & learners)
  const {
    courses: allCourses,
    isLoading: isCoursesLoading,
    fetchCourses,
    enrollInCourse,
    completeLesson,
    createCourse,
    addLesson,
    searchUsers,
    updateUserRole,
    fetchCoursesPaginated,
    fetchUsersPaginated,
  } = useCourses();

  // Learner/User State
  const [learnerProgress, setLearnerProgress] = useState<Record<string, number>>({});
  const [completedLessonsMap, setCompletedLessonsMap] = useState<Record<string, string[]>>({}); // courseId -> lessonIds[]
  
  // Selected course management page simulation
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  
  // Tab within the simulated Course Details page
  const [courseDetailsTab, setCourseDetailsTab] = useState<"player" | "add-lesson" | "settings">("player");

  const [catalogSearch, setCatalogSearch] = useState("");
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<number | null>(null);
  
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [userList, setUserList] = useState<UserProfile[]>([]);
  const [isUsersLoading, setIsUsersLoading] = useState(false);

  // Paginated user and course list states
  const [courseViewMode, setCourseViewMode] = useState<"card" | "list">("card");
  const [isCreateCourseModalOpen, setIsCreateCourseModalOpen] = useState(false);
  const [courseFilterCategoryId, setCourseFilterCategoryId] = useState<number | null>(null);
  const [courseFilterStatus, setCourseFilterStatus] = useState<string>("all");

  const [isCoursesPaginatedLoading, setIsCoursesPaginatedLoading] = useState(false);
  const [managedCourses, setManagedCourses] = useState<Course[]>([]);
  const [coursesPage, setCoursesPage] = useState(1);
  const [coursesTotalPages, setCoursesTotalPages] = useState(1);
  const [coursesTotalItems, setCoursesTotalItems] = useState(0);

  const [paginatedUserList, setPaginatedUserList] = useState<UserProfile[]>([]);
  const [usersPage, setUsersPage] = useState(1);
  const [usersTotalPages, setUsersTotalPages] = useState(1);
  const [usersTotalItems, setUsersTotalItems] = useState(0);

  // Course Management Search
  const [courseSearchQuery, setCourseSearchQuery] = useState("");
  const [courseSearchInput, setCourseSearchInput] = useState("");

  // Categories list loaded via API
  const [categoriesList, setCategoriesList] = useState<{ categoryId: number; categoryName: string }[]>([]);

  // Forms states
  const [newCourseName, setNewCourseName] = useState("");
  const [newCourseCategory, setNewCourseCategory] = useState(1);
  const [newCourseStatus, setNewCourseStatus] = useState("draft");
  const [courseFormError, setCourseFormError] = useState("");
  const [courseFormSuccess, setCourseFormSuccess] = useState("");

  const [newLessonTitle, setNewLessonTitle] = useState("");
  const [newLessonType, setNewLessonType] = useState("Video");
  const [newLessonLink, setNewLessonLink] = useState("");
  const [lessonFormError, setLessonFormError] = useState("");
  const [lessonFormSuccess, setLessonFormSuccess] = useState("");

  // Loading indicators for actions
  const [actionLoading, setActionLoading] = useState(false);
  const [isDeployingLesson, setIsDeployingLesson] = useState(false);

  // Confirm Modal state
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    onConfirm: () => void | Promise<void>;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const triggerConfirm = (
    title: string,
    message: string,
    onConfirm: () => void | Promise<void>,
    confirmText?: string
  ) => {
    setModalState({
      isOpen: true,
      title,
      message,
      confirmText,
      onConfirm: async () => {
        setActionLoading(true);
        try {
          await onConfirm();
        } finally {
          setActionLoading(false);
          setModalState((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  // Fetch initial course catalog data
  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  // Fetch categories list via API on mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await api.get("/courses/stats/categories");
        const list = (res.data || []).map((cat: any) => ({
          categoryId: cat.categoryId,
          categoryName: cat.categoryName,
        }));
        setCategoriesList(list);
        if (list.length > 0) {
          setNewCourseCategory(list[0].categoryId);
        }
      } catch (err) {
        console.error("Failed to load categories dynamically:", err);
      }
    };
    fetchCategories();
  }, []);

  // Live Search with Debounce for Course Catalog
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCourses(catalogSearch);
    }, 350);
    return () => clearTimeout(timer);
  }, [catalogSearch, fetchCourses]);

  // Fetch learner progress and enrollment status for all courses
  const loadLearnerProgress = useCallback(async () => {
    if (!allCourses.length || !userId) return;
    const progressMap: Record<string, number> = {};
    const compMap: Record<string, string[]> = {};

    await Promise.all(
      allCourses.map(async (c) => {
        try {
          const progressRes = await api.get(`/courses/${c.courseId}/progress/${userId}`);
          const data = progressRes.data;
          const progressValue = typeof data === "number" ? data : (data?.progress ?? 0);
          progressMap[c.courseId] = progressValue;

          const completed = data?.completedLessons || [];
          compMap[c.courseId] = completed;
        } catch {
          progressMap[c.courseId] = -1;
        }
      })
    );
    setLearnerProgress(progressMap);
    setCompletedLessonsMap(compMap);
  }, [allCourses, userId]);

  useEffect(() => {
    if (!isAdminOrEmployee) {
      loadLearnerProgress();
    }
  }, [allCourses, userId, isAdminOrEmployee, loadLearnerProgress]);

  // Fetch user list for admin User Management
  const loadUsers = useCallback(async (q: string = "") => {
    setIsUsersLoading(true);
    try {
      const users = await searchUsers(q);
      setUserList(users);
    } catch (err) {
      console.error(err);
    } finally {
      setIsUsersLoading(false);
    }
  }, [searchUsers]);

  // Fetch paginated user list
  const loadPaginatedUsers = useCallback(async (page: number = 1) => {
    setIsUsersLoading(true);
    try {
      const res = await fetchUsersPaginated(page, 10);
      setPaginatedUserList(res.data || []);
      setUsersPage(res.meta?.currentPage || page);
      setUsersTotalPages(res.meta?.totalPages || 1);
      setUsersTotalItems(res.meta?.totalItems || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setIsUsersLoading(false);
    }
  }, [fetchUsersPaginated]);

  // Fetch paginated course list
  const loadPaginatedCourses = useCallback(async (
    searchOverride?: string,
    catOverride?: number | null,
    statusOverride?: string
  ) => {
    setIsCoursesPaginatedLoading(true);
    try {
      const q = searchOverride !== undefined ? searchOverride : courseSearchQuery;
      const cat = catOverride !== undefined ? catOverride : courseFilterCategoryId;
      const stat = statusOverride !== undefined ? statusOverride : courseFilterStatus;

      // Query database with high limit to handle client-side pagination / toggle view mode instantly
      const res = await fetchCoursesPaginated(1, 1000, q, cat, stat);
      setManagedCourses(res.data || []);
      setCoursesPage(1);
    } catch (err) {
      console.error(err);
    } finally {
      setIsCoursesPaginatedLoading(false);
    }
  }, [fetchCoursesPaginated, courseSearchQuery, courseFilterCategoryId, courseFilterStatus]);

  // Debounce input to update search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setCourseSearchQuery(courseSearchInput);
    }, 500);
    return () => clearTimeout(timer);
  }, [courseSearchInput]);

  // Load paginated courses when category/status filters change, search query finishes debouncing, or tab is opened
  useEffect(() => {
    if (currentTab === "manage-courses" && isAdminOrEmployee) {
      loadPaginatedCourses(courseSearchQuery, courseFilterCategoryId, courseFilterStatus);
    }
  }, [courseSearchQuery, courseFilterCategoryId, courseFilterStatus, currentTab, isAdminOrEmployee, loadPaginatedCourses]);

  // Live Search with Debounce for User Management (only runs search if query is not empty)
  useEffect(() => {
    if (currentTab === "users" && isAdmin) {
      if (!userSearchQuery) {
        loadPaginatedUsers(usersPage);
        return;
      }
      const timer = setTimeout(() => {
        loadUsers(userSearchQuery);
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [userSearchQuery, usersPage, currentTab, isAdmin, loadUsers, loadPaginatedUsers]);

  // Recharts styling configs
  const grid = dark ? "#27272a" : "#f1f5f9";
  const tickColor = dark ? "#71717a" : "#94a3b8";
  const tooltipStyle = {
    backgroundColor: dark ? "#1c1c1c" : "#ffffff",
    border: `1px solid ${dark ? "#2d2d2d" : "#e2e8f0"}`,
    borderRadius: 10,
    boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
    fontSize: 12,
    color: dark ? "#fafafa" : "#0f172a",
    padding: "8px 12px",
  };

  // Course forms action
  const handleCreateCourse = (e: React.FormEvent) => {
    e.preventDefault();
    setCourseFormError("");
    setCourseFormSuccess("");
    if (!newCourseName.trim()) {
      setCourseFormError("Course name is required.");
      return;
    }
    triggerConfirm(
      "Create New Course",
      `Are you sure you want to create the course "${newCourseName}"? It will initially be saved as a draft.`,
      async () => {
        try {
          await createCourse({
            name: newCourseName,
            categoryId: Number(newCourseCategory),
            status: newCourseStatus,
            userId: userId || "",
          });
          setCourseFormSuccess("Course created successfully!");
          setNewCourseName("");
          fetchCourses();
          loadPaginatedCourses();
          setIsCreateCourseModalOpen(false);
        } catch (err: any) {
          setCourseFormError(err.message);
        }
      },
      "Create Course"
    );
  };

  const handleUpdateCourseStatus = (courseId: string, status: string) => {
    triggerConfirm(
      "Update Course Status",
      `Are you sure you want to change this course status to "${status.toUpperCase()}"? This affects who can view and enroll in it.`,
      async () => {
        try {
          await api.patch(`/courses/${courseId}`, { status });
          const updatedCourses = await api.get(`/courses/search?q=`);
          const freshCourse = updatedCourses.data?.find((c: Course) => c.courseId === courseId);
          if (freshCourse) {
            setSelectedCourse(freshCourse);
          }
          fetchCourses();
          loadPaginatedCourses();
        } catch (err: any) {
          alert(err.message);
        }
      },
      "Update Status"
    );
  };

  const handleAddLesson = (e: React.FormEvent) => {
    e.preventDefault();
    setLessonFormError("");
    setLessonFormSuccess("");
    if (!selectedCourse) {
      setLessonFormError("Select a course first.");
      return;
    }
    if (!newLessonTitle.trim() || !newLessonLink.trim()) {
      setLessonFormError("Lesson title and material link are required.");
      return;
    }
    triggerConfirm(
      "Deploy New Lesson",
      `Are you sure you want to publish the lesson "${newLessonTitle}" under ${selectedCourse.name}?`,
      async () => {
        setIsDeployingLesson(true);
        try {
          await addLesson(selectedCourse.courseId, {
            title: newLessonTitle,
            materialType: newLessonType,
            materialLink: newLessonLink,
            status: "Active",
            userId: userId || "",
          });
          setLessonFormSuccess("Lesson added successfully!");
          setNewLessonTitle("");
          setNewLessonLink("");
          
          const updatedCourses = await api.get(`/courses/search?q=`);
          const freshCourse = updatedCourses.data?.find((c: Course) => c.courseId === selectedCourse.courseId);
          if (freshCourse) {
            setSelectedCourse(freshCourse);
          }
          fetchCourses();
        } catch (err: any) {
          setLessonFormError(err.message);
        } finally {
          setIsDeployingLesson(false);
        }
      },
      "Deploy Lesson"
    );
  };

  // Learner Actions
  const handleEnroll = (courseId: string) => {
    triggerConfirm(
      "Confirm Enrollment",
      "Would you like to enroll in this course? You will gain access to its learning playlist and slides.",
      async () => {
        try {
          await enrollInCourse(courseId);
          await fetchCourses();
          loadLearnerProgress();
          router.push("/dashboard?tab=my-learning");
        } catch (err: any) {
          alert(err.message);
        }
      },
      "Enroll Now"
    );
  };

  const handleCompleteLesson = (courseId: string, lessonId: string) => {
    triggerConfirm(
      "Mark Lesson Completed",
      "Confirm that you have reviewed the study slides and completed this lesson tutorial.",
      async () => {
        try {
          await completeLesson(courseId, lessonId);
          await loadLearnerProgress();
          const updatedCourses = await api.get(`/courses/search?q=`);
          const freshCourse = updatedCourses.data?.find((c: Course) => c.courseId === courseId);
          if (freshCourse) {
            setSelectedCourse(freshCourse);
            
            // Find current lesson index to move to the next lesson if available
            const currentIdx = freshCourse.lessons?.findIndex((l: Lesson) => l.lessonId === lessonId || String(l.id) === lessonId) ?? -1;
            if (currentIdx !== -1 && freshCourse.lessons && currentIdx < freshCourse.lessons.length - 1) {
              setSelectedLesson(freshCourse.lessons[currentIdx + 1]);
            } else {
              const freshLesson = freshCourse.lessons?.find((l: Lesson) => l.lessonId === lessonId || String(l.id) === lessonId);
              if (freshLesson) setSelectedLesson(freshLesson);
            }
          }
        } catch (err: any) {
          alert(err.message);
        }
      },
      "Mark Complete"
    );
  };

  const handleRoleChange = (userId: string, newRole: string) => {
    triggerConfirm(
      "Change User Clearance",
      `Are you sure you want to change this user's authorization role to ${newRole.toUpperCase()}? This modifies their dashboard panels.`,
      async () => {
        try {
          await updateUserRole(userId, newRole);
          if (userSearchQuery) {
            loadUsers(userSearchQuery);
          } else {
            loadPaginatedUsers(usersPage);
          }
        } catch (err: any) {
          alert(err.message);
        }
      },
      "Change Clearance"
    );
  };

  // =========================================================================
  // VIEW RENDERERS
  // =========================================================================

  // YOUTUBE-STYLE DETAILED PLAYER VIEW (For Learners AND Administrators/Employees)
  const renderYouTubePlayerView = () => {
    if (!selectedCourse) return null;

    const lessons = selectedCourse.lessons || [];
    const currentProgress = learnerProgress[selectedCourse.courseId] ?? 0;
    const isCompleted = (l: Lesson) => {
      if (!l) return false;
      const completedList = completedLessonsMap[selectedCourse.courseId] || [];
      return (
        completedList.includes(l.lessonId) ||
        completedList.includes(String(l.id)) ||
        (completedList as any).includes(l.id)
      );
    };

    return (
      <div className="flex flex-col gap-6 pb-8 animate-fadeIn">
        {/* Navigation & Title block */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-zinc-800 pb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setSelectedCourse(null);
                setSelectedLesson(null);
                setCourseDetailsTab("player");
              }}
              className="flex items-center justify-center h-9 w-9 rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider dark:text-blue-400">
                  {selectedCourse.courseId}
                </span>
                <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-zinc-700" />
                <span className="text-xs text-slate-400">
                  {lessons.length} Lesson{lessons.length !== 1 ? "s" : ""}
                </span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-zinc-50">{selectedCourse.name}</h2>
            </div>
          </div>

          {!isAdminOrEmployee && (
            <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-2xl border border-slate-200 dark:bg-zinc-900 dark:border-zinc-800">
              <span className="text-xs text-slate-400 font-medium">Your Progress</span>
              <div className="w-24 h-2 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-green-500 transition-all" style={{ width: `${currentProgress}%` }} />
              </div>
              <span className="text-xs font-bold text-green-600 dark:text-green-400">{currentProgress}%</span>
            </div>
          )}
        </div>

        {/* Dynamic Split Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* MIDDLE COLUMN - Content Player & Sub-actions (70% width on Desktop) */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            
            {/* Player Container */}
            <div ref={playerRef} className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 shadow-md dark:border-zinc-800 aspect-video flex flex-col items-center justify-center text-center">
              {selectedLesson ? (
                <div className="w-full h-full relative">
                  {selectedLesson.materialType === "Video" ? (
                    <iframe
                      src={getEmbedLink(selectedLesson.materialLink)}
                      className="w-full h-full border-0"
                      allowFullScreen
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      title={selectedLesson.title}
                    />
                  ) : (
                    <iframe
                      src={selectedLesson.materialLink}
                      className="w-full h-full border-0 bg-white"
                      title={selectedLesson.title}
                    />
                  )}

                  {/* Absolute Player Controls Overlay */}
                  <div className="absolute top-4 right-4 z-10 flex gap-2">
                    <a
                      href={selectedLesson.materialLink} target="_blank" rel="noreferrer"
                      className="flex items-center gap-1.5 rounded-xl bg-black/60 hover:bg-black/85 text-white backdrop-blur-sm px-3.5 py-2 text-xs font-semibold transition"
                    >
                      Open Link <ExternalLink size={12} />
                    </a>
                  </div>

                  {/* Bottom-right Fullscreen Trigger */}
                  <button
                    onClick={toggleFullScreen}
                    className="absolute bottom-4 right-4 z-15 flex h-8 w-8 items-center justify-center rounded-lg bg-black/60 hover:bg-black/85 text-white backdrop-blur-sm transition"
                    title="Toggle Fullscreen"
                  >
                    <Maximize2 size={16} />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 p-8">
                  <MonitorPlay size={54} className="text-zinc-700 animate-bounce" />
                  <h3 className="text-lg font-bold text-white">Select a Lesson to Start</h3>
                  <p className="text-xs text-zinc-500 max-w-sm">Choose from the course outline playlist in the sidebar to review teaching slides or start stream playback.</p>
                </div>
              )}
            </div>

            {/* Lesson Detail Bar & Action Panel */}
            {selectedLesson && (
              <div className="flex flex-col gap-4 bg-white p-6 rounded-2xl border border-slate-200 dark:bg-zinc-900 dark:border-zinc-800 shadow-sm animate-fadeIn">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-400 px-2.5 py-1 rounded-md">
                      Playing: {selectedLesson.materialType}
                    </span>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-zinc-50 mt-2">{selectedLesson.title}</h3>
                  </div>

                  {!isAdminOrEmployee && selectedLesson && (
                    isCompleted(selectedLesson) ? (
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1 text-xs font-bold text-green-600 bg-green-50 px-3 py-1.5 rounded-xl dark:bg-green-950/20 dark:text-green-400">
                          <CheckCircle size={14} /> Completed
                        </span>
                        {lessons.length > 0 && (
                          lessons[lessons.length - 1].lessonId === selectedLesson.lessonId ||
                          String(lessons[lessons.length - 1].id) === selectedLesson.lessonId ||
                          lessons[lessons.length - 1].id === selectedLesson.id
                        ) && (
                          <button
                            onClick={() => alert("Demo: Launching Course Certification Assessment / Knowledge Quiz...")}
                            className="rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold px-4 py-2 transition flex items-center gap-1.5 shadow-sm"
                          >
                            <Award size={14} /> Take Test
                          </button>
                        )}
                      </div>
                    ) : (
                      <button
                        onClick={() => handleCompleteLesson(selectedCourse.courseId, selectedLesson.lessonId)}
                        disabled={actionLoading}
                        className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 transition disabled:opacity-50"
                      >
                        Mark Complete
                      </button>
                    )
                  )}
                </div>
              </div>
            )}

            {/* Admin / Employee Management Area Tabs */}
            {isAdminOrEmployee && (
              <div className="flex flex-col gap-4">
                <div className="flex border-b border-slate-200 dark:border-zinc-800">
                  <button
                    onClick={() => setCourseDetailsTab("player")}
                    className={`pb-3 text-sm font-semibold px-4 transition ${courseDetailsTab === "player" ? "border-b-2 border-blue-600 text-blue-600 dark:text-blue-400" : "text-slate-400 hover:text-slate-600"}`}
                  >
                    Information
                  </button>
                  <button
                    onClick={() => setCourseDetailsTab("add-lesson")}
                    className={`pb-3 text-sm font-semibold px-4 transition ${courseDetailsTab === "add-lesson" ? "border-b-2 border-blue-600 text-blue-600 dark:text-blue-400" : "text-slate-400 hover:text-slate-600"}`}
                  >
                    Add Lesson
                  </button>
                  <button
                    onClick={() => setCourseDetailsTab("settings")}
                    className={`pb-3 text-sm font-semibold px-4 transition ${courseDetailsTab === "settings" ? "border-b-2 border-blue-600 text-blue-600 dark:text-blue-400" : "text-slate-400 hover:text-slate-600"}`}
                  >
                    Course Settings
                  </button>
                </div>

                <div className="p-1">
                  {courseDetailsTab === "player" && (
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 dark:bg-zinc-900 dark:border-zinc-800">
                      <h4 className="font-bold text-slate-900 dark:text-zinc-50 mb-2">Course Metrics Summary</h4>
                      <div className="grid grid-cols-2 gap-4 mt-3">
                        <div className="p-3 bg-slate-50 dark:bg-zinc-800/40 rounded-xl">
                          <span className="text-xs text-slate-400 font-semibold block">Total Enrolled Learners</span>
                          <span className="text-lg font-bold text-slate-900 dark:text-zinc-100">{selectedCourse.enrolled}</span>
                        </div>
                        <div className="p-3 bg-slate-50 dark:bg-zinc-800/40 rounded-xl">
                          <span className="text-xs text-slate-400 font-semibold block">Lesson Chapters Count</span>
                          <span className="text-lg font-bold text-slate-900 dark:text-zinc-100">{lessons.length}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {courseDetailsTab === "add-lesson" && (
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 dark:bg-zinc-900 dark:border-zinc-800">
                      <h4 className="font-bold text-slate-900 dark:text-zinc-50 mb-3">Add Lesson</h4>
                      {lessonFormError && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-400">{lessonFormError}</div>}
                      {lessonFormSuccess && <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-600 dark:bg-green-950/30 dark:text-green-400">{lessonFormSuccess}</div>}

                      <form onSubmit={handleAddLesson} className="flex flex-col gap-4">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-semibold text-slate-500">Lesson Title</label>
                          <input
                            type="text" value={newLessonTitle} onChange={(e) => setNewLessonTitle(e.target.value)}
                            placeholder="e.g. Introduction to App Router"
                            className="rounded-xl border border-slate-200 bg-transparent px-3 py-2 text-sm focus:border-blue-600 focus:outline-none dark:border-zinc-800"
                          />
                        </div>
                        <div className="flex grid-cols-2 gap-3">
                          <div className="flex-1 flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-slate-500">Material Type</label>
                            <select
                              value={newLessonType} onChange={(e) => setNewLessonType(e.target.value)}
                              className="rounded-xl border border-slate-200 bg-white p-2 text-sm dark:border-zinc-800 dark:bg-zinc-900"
                            >
                              <option value="Video">Video Player Link</option>
                              <option value="PDF">PDF document</option>
                              <option value="PPT">PPT presentation slide</option>
                            </select>
                          </div>
                          <div className="flex-1 flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-slate-500">Material Link</label>
                            <input
                              type="text" value={newLessonLink} onChange={(e) => setNewLessonLink(e.target.value)}
                              placeholder="https://example.com/materials/..."
                              className="rounded-xl border border-slate-200 bg-transparent px-3 py-2 text-sm focus:border-blue-600 focus:outline-none dark:border-zinc-800"
                            />
                          </div>
                        </div>
                        <button
                          type="submit" disabled={actionLoading}
                          className="flex justify-center items-center gap-2 rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50 w-full"
                        >
                          {isDeployingLesson ? (
                            <>
                              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                              Deploying Lesson...
                            </>
                          ) : (
                            "Add Lesson"
                          )}
                        </button>
                      </form>

                      {isDeployingLesson && (
                        <div className="mt-4 p-4 rounded-xl border border-blue-100 bg-blue-50/20 dark:border-blue-900/20 dark:bg-blue-950/10 flex items-center gap-3 animate-pulse">
                          <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 dark:text-zinc-50">Syncing with databases...</p>
                            <p className="text-[10px] text-slate-400">Allocating assets and custom LES custom ID codes.</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {courseDetailsTab === "settings" && (
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 dark:bg-zinc-900 dark:border-zinc-800">
                      <h4 className="font-bold text-slate-900 dark:text-zinc-50 mb-3">Settings</h4>
                      <div className="flex flex-col gap-3">
                        <span className="text-xs text-slate-400">Toggle course visibility to users:</span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleUpdateCourseStatus(selectedCourse.courseId, "active")}
                            className={`rounded-xl px-4 py-2 text-xs font-semibold border transition ${selectedCourse.status === "active" ? "bg-green-500 text-white border-transparent" : "border-slate-200 dark:border-zinc-800 text-slate-600"}`}
                          >
                            Set Active
                          </button>
                          <button
                            onClick={() => handleUpdateCourseStatus(selectedCourse.courseId, "draft")}
                            className={`rounded-xl px-4 py-2 text-xs font-semibold border transition ${selectedCourse.status === "draft" ? "bg-zinc-500 text-white border-transparent" : "border-slate-200 dark:border-zinc-800 text-slate-600"}`}
                          >
                            Set Draft
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN - Playlist (30% width) */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-zinc-800 dark:bg-[#121212] shadow-sm flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 dark:text-zinc-50">Course Playlist</h3>
              <span className="text-[10px] font-bold text-slate-400 uppercase">{lessons.length} Items</span>
            </div>

            <div className="flex flex-col gap-2 overflow-y-auto max-h-[460px] pr-1">
              {lessons.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">No lessons available in this course.</div>
              ) : (
                lessons.map((l, index) => {
                  const isCur = selectedLesson?.lessonId === l.lessonId;
                  const isComp = isCompleted(l);
                  return (
                    <button
                      key={l.lessonId}
                      onClick={() => setSelectedLesson(l)}
                      className={`group flex items-start gap-3 rounded-xl p-2.5 text-left transition border ${
                        isCur
                          ? "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/20 dark:border-blue-900/40 dark:text-blue-400"
                          : "hover:bg-slate-50 border-transparent dark:hover:bg-zinc-800/40"
                      }`}
                    >
                      {/* YouTube Thumbnail Mockup */}
                      <div className="relative h-14 w-20 shrink-0 bg-slate-950 rounded-lg overflow-hidden flex items-center justify-center text-white border border-slate-800">
                        {l.materialType === "Video" ? (
                          <Play size={16} className="text-blue-500 fill-blue-500/20 group-hover:scale-110 transition" />
                        ) : (
                          <FileText size={16} className="text-emerald-500" />
                        )}
                        <span className="absolute bottom-1 right-1 bg-black/80 text-[8px] font-mono px-1 rounded text-slate-400">
                          {l.materialType}
                        </span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate dark:text-zinc-100">{l.title}</p>
                        <p className="text-[9px] text-slate-400 font-mono mt-0.5">{l.lessonId}</p>
                        
                        <div className="flex items-center gap-1.5 mt-1.5">
                          {isComp ? (
                            <span className="flex items-center gap-0.5 text-[9px] text-green-600 font-bold dark:text-green-400">
                              <Check size={10} /> Completed
                            </span>
                          ) : (
                            <span className="text-[9px] text-slate-400">Not Completed</span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // RENDER ADMIN / EMPLOYEE OVERVIEW
  const renderAdminOverview = () => {
    if (isStatsLoading || isCoursesLoading) return <LoadingSpinner />;
    if (statsError) {
      return (
        <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-400">
          {statsError}
        </div>
      );
    }

    const courseChartWidth = Math.max(500, courseComparison.length * 80);
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
      <div className="flex flex-col gap-6 pb-8 animate-fadeIn">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-zinc-50 flex items-center gap-2">
              Welcome back, {name} <Sparkles className="text-yellow-500 h-5 w-5 animate-pulse" />
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">
              Here&apos;s what&apos;s happening across your organization.
            </p>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard icon={<UsersIcon size={18} />} label="Total Users" value={stats?.totalUsers ?? 0} accent="#3b82f6" />
          <StatCard icon={<BookOpen size={18} />} label="Total Courses" value={stats?.totalCourses ?? 0} accent="#8b5cf6" />
          <StatCard icon={<Briefcase size={18} />} label="Employees" value={stats?.totalEmployees ?? 0} accent="#10b981" />
          <StatCard icon={<TrendingUp size={18} />} label="Completion Rate" value={`${stats?.overallCompletionRate?.toFixed(1) ?? 0}%`} accent="#f59e0b" />
        </div>

        {/* Row 1: Area + Materials */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2" title="Monthly Progress Trend" subtitle="Average learner progress over time">
            <ResponsiveContainer width="100%" height={210}>
              <AreaChart data={monthly} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                <defs>
                  <linearGradient id="grad1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={dark ? 0.6 : 0.4} />
                    <stop offset="60%" stopColor="#8b5cf6" stopOpacity={dark ? 0.25 : 0.15} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="50%" stopColor="#8b5cf6" />
                    <stop offset="100%" stopColor="#ec4899" />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={grid} strokeDasharray="4 4" vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 10, fill: tickColor, fontWeight: 500 }}
                  axisLine={false} tickLine={false}
                  height={40}
                />
                <YAxis tick={{ fontSize: 10, fill: tickColor, fontWeight: 500 }} axisLine={false} tickLine={false} domain={[0, 100]} unit="%" width={36} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [`${v}%`, "Progress"]} />
                <Area type="monotone" dataKey="progress" stroke="url(#lineGrad)" strokeWidth={3.5} fill="url(#grad1)" activeDot={{ r: 6, strokeWidth: 0, fill: "#ec4899" }} isAnimationActive={true} animationDuration={1200} />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          <Card title="Material Breakdown" subtitle="Completion rate by type">
            <div className="flex flex-col gap-4.5 pt-2">
              {materialData.map((m, i) => {
                const color = getColor(i);
                return (
                  <div key={m.materialType}>
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-700 dark:text-zinc-300">{m.materialType}</span>
                      <span className="text-sm font-extrabold text-slate-900 dark:text-zinc-50">{m.completionRate}%</span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-zinc-800/80">
                      <div 
                        className="h-full rounded-full transition-all duration-1000 ease-out" 
                        style={{ 
                          width: `${m.completionRate}%`, 
                          background: `linear-gradient(90deg, ${color}cc 0%, ${color} 100%)`,
                          boxShadow: `0 2px 8px ${color}33`
                        }} 
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Row 2: Course Completion Rates + Category Performance */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2" title="Course Completion Rates" subtitle={`${courseComparison.length} courses · scroll to see all`}>
            <div className="overflow-x-auto pb-1">
              <div style={{ width: courseChartWidth, minWidth: "100%" }}>
                <BarChart width={courseChartWidth} height={230} data={comparisonData} margin={{ top: 10, right: 10, left: -8, bottom: 8 }}>
                  <defs>
                    <linearGradient id="barBlue" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3b82f6" /><stop offset="100%" stopColor="#1d4ed8" /></linearGradient>
                    <linearGradient id="barPurple" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8b5cf6" /><stop offset="100%" stopColor="#6d28d9" /></linearGradient>
                    <linearGradient id="barGreen" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10b981" /><stop offset="100%" stopColor="#047857" /></linearGradient>
                    <linearGradient id="barAmber" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f59e0b" /><stop offset="100%" stopColor="#b45309" /></linearGradient>
                    <linearGradient id="barIndigo" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6366f1" /><stop offset="100%" stopColor="#4338ca" /></linearGradient>
                    <linearGradient id="barRose" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f43f5e" /><stop offset="100%" stopColor="#be123c" /></linearGradient>
                  </defs>
                  <CartesianGrid stroke={grid} strokeDasharray="4 4" vertical={false} />
                  <XAxis
                    dataKey="shortName"
                    tick={{ fontSize: 10, fill: tickColor, fontWeight: 500 }}
                    axisLine={false} tickLine={false}
                    interval={0}
                  />
                  <YAxis tick={{ fontSize: 10, fill: tickColor, fontWeight: 500 }} axisLine={false} tickLine={false} domain={[0, 100]} unit="%" width={38} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(v: any, name: any, props: any) => {
                      const real = props.payload.completionRate;
                      return [`${real}%`, "Completion"];
                    }}
                    labelFormatter={(_, p) => p?.[0]?.payload?.name ?? ""}
                    cursor={{ fill: dark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)", radius: 6 }}
                  />
                  <Bar dataKey="displayRate" radius={[6, 6, 0, 0]} maxBarSize={46} isAnimationActive={true} animationDuration={1000}>
                    {comparisonData.map((entry, i) => {
                      const gradNames = ["barBlue", "barPurple", "barGreen", "barAmber", "barIndigo", "barRose"];
                      return (
                        <Cell
                          key={i}
                          fill={`url(#${gradNames[i % gradNames.length]})`}
                          fillOpacity={entry.completionRate === 0 ? 0.35 : 1}
                        />
                      );
                    })}
                  </Bar>
                </BarChart>
              </div>
            </div>
          </Card>

          <Card title="Category Performance" subtitle="Avg progress per category">
            <div className="flex flex-col gap-4.5 pt-2">
              {categories.map((cat, i) => {
                const color = getColor(i);
                return (
                  <div key={cat.categoryId}>
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-700 dark:text-zinc-300">{cat.categoryName}</span>
                      <span className="text-sm font-extrabold text-slate-900 dark:text-zinc-50">{cat.averageProgress.toFixed(0)}%</span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-zinc-800/80">
                      <div
                        className="h-full rounded-full transition-all duration-1000 ease-out"
                        style={{ 
                          width: `${cat.averageProgress}%`, 
                          background: `linear-gradient(90deg, ${color}cc 0%, ${color} 100%)`,
                          boxShadow: `0 2px 8px ${color}33`
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Row 3: Leaderboard + At-Risk + Activity */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card title="Leaderboard" subtitle="Ranked by average progress" icon={<Trophy size={14} className="text-amber-500" />}>
            <div className="mt-3 flex flex-col gap-1">
              {userPerformance.map((u, i) => (
                <div key={u.userId} className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-slate-50/50 dark:hover:bg-zinc-800/20">
                  <span className="w-5 shrink-0 text-center text-sm flex justify-center">
                    {i === 0 ? (
                      <Trophy size={14} className="text-amber-500" />
                    ) : i === 1 ? (
                      <Trophy size={14} className="text-slate-400" />
                    ) : i === 2 ? (
                      <Trophy size={14} className="text-amber-700" />
                    ) : (
                      <span className="text-xs font-bold text-slate-400">{i + 1}</span>
                    )}
                  </span>
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" style={{ backgroundColor: getColor(i) }}>
                    {u.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900 dark:text-zinc-50">{u.name}</p>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono font-semibold" style={{ color: getColor(i) }}>{u.userId}</span>
                      <span className="text-[10px] text-slate-300 dark:text-zinc-600">·</span>
                      <span className="text-[10px] capitalize text-slate-450">{u.role}</span>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-bold" style={{ color: getColor(i) }}>{u.averageProgress.toFixed(0)}%</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card title="At-Risk Learners" subtitle="Enrolled with 0% progress" icon={<AlertTriangle size={14} className="text-amber-500" />}>
            <div className="mt-3">
              {atRisk.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-10">
                  <CheckCircle className="h-10 w-10 text-green-500" />
                  <p className="text-sm font-medium text-slate-500 dark:text-zinc-400">No at-risk learners!</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {atRisk.map((u) => (
                    <div key={`${u.userId}-${u.courseId}`} className="rounded-xl border border-amber-100 bg-gradient-to-r from-amber-50 to-orange-50 p-4 dark:border-amber-900/20 dark:from-amber-900/10 dark:to-orange-900/10">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900 dark:text-zinc-50">{u.name}</p>
                          <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-zinc-400">{u.courseName}</p>
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

          <Card title="Recent Activity" subtitle="Latest platform actions" icon={<Activity size={14} className="text-blue-500" />}>
            <div className="mt-3 flex flex-col">
              {recentActivity.slice(0, 5).map((a, i) => (
                <div key={a.activityId} className="flex items-start gap-3 border-b border-slate-100 py-3 last:border-0 dark:border-zinc-800">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white bg-blue-600" style={{ backgroundColor: getColor(i) }}>
                    {a.userName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-800 dark:text-zinc-300 leading-relaxed">{a.message}</p>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[10px] text-slate-450 dark:text-zinc-500 font-mono">
                      <span className="bg-slate-50 dark:bg-zinc-800/65 px-1.5 py-0.5 rounded text-[9px] font-bold text-slate-500 dark:text-zinc-450 border border-slate-100 dark:border-zinc-800/40">UID: {a.userId}</span>
                      <span className="text-slate-300 dark:text-zinc-650">|</span>
                      <span className="bg-slate-50 dark:bg-zinc-800/65 px-1.5 py-0.5 rounded text-[9px] font-bold text-slate-500 dark:text-zinc-450 border border-slate-100 dark:border-zinc-800/40">CID: {a.courseId}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    );
  };

  // Helper to dynamically color category tags consistently using hashing
  const getCategoryStyle = (categoryName: string) => {
    let hash = 0;
    for (let i = 0; i < categoryName.length; i++) {
      hash = categoryName.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colors = [
      { bg: "bg-blue-50 dark:bg-blue-950/20", text: "text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/30" },
      { bg: "bg-purple-50 dark:bg-purple-950/20", text: "text-purple-600 dark:text-purple-400 border-purple-100 dark:border-purple-900/30" },
      { bg: "bg-emerald-50 dark:bg-emerald-950/20", text: "text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30" },
      { bg: "bg-amber-50 dark:bg-amber-950/20", text: "text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900/30" },
      { bg: "bg-rose-50 dark:bg-rose-950/20", text: "text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/30" },
      { bg: "bg-cyan-50 dark:bg-cyan-950/20", text: "text-cyan-600 dark:text-cyan-400 border-cyan-100 dark:border-cyan-900/30" },
      { bg: "bg-indigo-50 dark:bg-indigo-950/20", text: "text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/30" },
      { bg: "bg-orange-50 dark:bg-orange-950/20", text: "text-orange-600 dark:text-orange-400 border-orange-100 dark:border-orange-900/30" }
    ];
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  // RENDER BEAUTIFIED COURSE MANAGEMENT PANEL (Admin/Employee Only)
  const renderManageCourses = () => {
    if (selectedCourse) {
      return renderYouTubePlayerView();
    }

    if (isCoursesLoading || isCoursesPaginatedLoading) return <LoadingSpinner />;

    const pageSize = courseViewMode === "card" ? 6 : 10;
    const coursesTotalItems = managedCourses.length;
    const coursesTotalPages = Math.max(1, Math.ceil(coursesTotalItems / pageSize));
    const coursesToRender = managedCourses.slice((coursesPage - 1) * pageSize, coursesPage * pageSize);

    return (
      <div className="flex flex-col gap-5 pb-6 animate-fadeIn">
        {/* Header row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-zinc-50">Course Management Dashboard</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">Deploy training courses, structure curriculum playlists, and review enrollment telemetry.</p>
          </div>
          <button
            onClick={() => {
              setCourseFormError("");
              setCourseFormSuccess("");
              setIsCreateCourseModalOpen(true);
            }}
            className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 transition shadow-sm shrink-0 self-start sm:self-center"
          >
            <PlusCircle size={15} /> Create Course
          </button>
        </div>

        {/* Filter / View switcher bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#121212] border border-slate-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm">
          <div className="flex flex-1 flex-col sm:flex-row items-center gap-3 max-w-2xl">
            {/* Search */}
            <div className="relative flex-1 w-full">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={courseSearchInput}
                onChange={(e) => setCourseSearchInput(e.target.value)}
                placeholder="Search managed courses by name or ID..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-3 text-xs focus:outline-none dark:border-zinc-800 dark:bg-zinc-900"
              />
            </div>

            {/* Category Select Dropdown */}
            <div className="w-full sm:w-48">
              <select
                value={courseFilterCategoryId ?? ""}
                onChange={(e) => {
                  const val = e.target.value;
                  const catId = val === "" ? null : Number(val);
                  setCourseFilterCategoryId(catId);
                  setCoursesPage(1);
                  loadPaginatedCourses(courseSearchQuery, catId, courseFilterStatus);
                }}
                className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
              >
                <option value="">All Categories</option>
                {categoriesList.map((cat) => (
                  <option key={cat.categoryId} value={cat.categoryId}>
                    {cat.categoryName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {/* Status Toggle Tab Selector */}
            <div className="flex rounded-xl bg-slate-50 p-1 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
              {["all", "active", "draft", "inactive"].map((statusOption) => {
                const isActive = courseFilterStatus === statusOption;
                let activeStyle = "";
                if (isActive) {
                  if (statusOption === "all") activeStyle = "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 shadow-sm";
                  else if (statusOption === "active") activeStyle = "bg-green-50 text-green-600 dark:bg-green-950/40 dark:text-green-400 shadow-sm";
                  else if (statusOption === "draft") activeStyle = "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 shadow-sm";
                  else if (statusOption === "inactive") activeStyle = "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 shadow-sm";
                } else {
                  activeStyle = "text-slate-450 hover:text-slate-650 dark:text-zinc-500 dark:hover:text-zinc-350";
                }
                return (
                  <button
                    key={statusOption}
                    onClick={() => {
                      setCourseFilterStatus(statusOption);
                      setCoursesPage(1);
                      loadPaginatedCourses(courseSearchQuery, courseFilterCategoryId, statusOption);
                    }}
                    className={`rounded-lg px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider transition ${activeStyle}`}
                  >
                    {statusOption}
                  </button>
                );
              })}
            </div>

            {/* Grid/List View switcher */}
            <div className="flex items-center gap-1.5 border-l pl-4 border-slate-100 dark:border-zinc-800/80">
              <button
                onClick={() => {
                  setCourseViewMode("card");
                }}
                className={`rounded-lg p-1.5 text-xs font-bold transition flex items-center gap-1 ${courseViewMode === "card" ? "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400" : "text-slate-655 hover:bg-slate-50 dark:text-zinc-400 dark:hover:bg-zinc-850"}`}
                title="Card View"
              >
                <LayoutGrid size={15} />
                <span className="hidden lg:inline">Grid</span>
              </button>
              <button
                onClick={() => {
                  setCourseViewMode("list");
                }}
                className={`rounded-lg p-1.5 text-xs font-bold transition flex items-center gap-1 ${courseViewMode === "list" ? "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400" : "text-slate-655 hover:bg-slate-50 dark:text-zinc-400 dark:hover:bg-zinc-850"}`}
                title="List View"
              >
                <List size={15} />
                <span className="hidden lg:inline">List</span>
              </button>
            </div>
          </div>
        </div>

        {/* Courses list/grid content */}
        {coursesToRender.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 dark:bg-[#121212] dark:border-zinc-800">
            <p className="text-sm text-slate-400">No managed courses found.</p>
          </div>
        ) : courseViewMode === "card" ? (
          /* CARD/GRID VIEW (6 per page, tight dimensions, readable fonts) */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {coursesToRender.map((c) => (
              <div
                key={c.courseId}
                className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md hover:border-slate-300 dark:border-zinc-800 dark:bg-[#121212] dark:hover:border-zinc-700 transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-center mb-2">
                    {(() => {
                      const catName = (c as any).category?.name || (c.categoryId === 1 ? "Software" : c.categoryId === 2 ? "Business" : "Compliance");
                      const catStyle = getCategoryStyle(catName);
                      return (
                        <span className={`inline-block rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${catStyle.bg} ${catStyle.text}`}>
                          {catName}
                        </span>
                      );
                    })()}
                    <select
                      value={c.status}
                      onChange={(e) => handleUpdateCourseStatus(c.courseId, e.target.value)}
                      className={`rounded-lg border px-1.5 py-0.5 text-[10px] font-bold uppercase cursor-pointer focus:outline-none transition ${c.status === "active" ? "bg-green-50 text-green-600 border-green-200 dark:bg-green-950/20 dark:text-green-400 dark:border-green-900/30" : c.status === "draft" ? "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30" : "bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30"}`}
                    >
                      <option value="draft">Draft</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>

                  <h4 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition dark:text-zinc-50 dark:group-hover:text-blue-400 line-clamp-1">{c.name}</h4>
                  <p className="text-[11px] text-slate-450 dark:text-zinc-500 font-mono mt-0.5">ID: {c.courseId}</p>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 dark:border-zinc-800/80 flex items-center justify-between">
                  <div className="flex gap-4">
                    <div className="text-left">
                      <span className="text-[10px] text-slate-400 block font-medium">Chapters</span>
                      <span className="text-sm font-bold text-slate-800 dark:text-zinc-200">{(c as any).totalLessons ?? c.lessons?.length ?? 0}</span>
                    </div>
                    <div className="text-left">
                      <span className="text-[10px] text-slate-400 block font-medium">Learners</span>
                      <span className="text-sm font-bold text-slate-800 dark:text-zinc-200">{c.enrolled}</span>
                    </div>
                  </div>

                  <button
                    onClick={async () => {
                      try {
                        setActionLoading(true);
                        const res = await api.get(`/courses/${c.courseId}`);
                        setSelectedCourse(res.data);
                        setSelectedLesson(res.data.lessons?.[0] || null);
                      } catch (err: any) {
                        alert(err.message);
                      } finally {
                        setActionLoading(false);
                      }
                    }}
                    className="flex items-center gap-0.5 text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400"
                  >
                    Manage Details →
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* LIST VIEW (10 per page, tight dimensions, readable fonts) */
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden dark:border-zinc-800 dark:bg-[#121212] shadow-sm animate-fadeIn">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/30 font-bold text-xs uppercase">
                    <th className="py-2.5 px-4">Course ID</th>
                    <th className="py-2.5 px-4">Course Name</th>
                    <th className="py-2.5 px-4">Category</th>
                    <th className="py-2.5 px-4">Chapters</th>
                    <th className="py-2.5 px-4">Learners</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {coursesToRender.map((c) => (
                    <tr key={c.courseId} className="border-b border-slate-100 hover:bg-slate-50/50 dark:border-zinc-800 dark:hover:bg-zinc-800/10 transition">
                      <td className="py-2.5 px-4 font-mono text-sm font-bold text-slate-550 dark:text-zinc-400">{c.courseId}</td>
                      <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-zinc-100 text-sm truncate max-w-xs">{c.name}</td>
                      <td className="py-2.5 px-4 text-xs font-semibold">
                        {(() => {
                          const catName = (c as any).category?.name || (c.categoryId === 1 ? "Software" : c.categoryId === 2 ? "Business" : "Compliance");
                          const catStyle = getCategoryStyle(catName);
                          return (
                            <span className={`inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${catStyle.bg} ${catStyle.text}`}>
                              {catName}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="py-2.5 px-4 text-sm font-semibold text-slate-650 dark:text-zinc-350">{(c as any).totalLessons ?? c.lessons?.length ?? 0}</td>
                      <td className="py-2.5 px-4 text-sm font-semibold text-slate-650 dark:text-zinc-350">{c.enrolled}</td>
                      <td className="py-2.5 px-4">
                        <select
                          value={c.status}
                          onChange={(e) => handleUpdateCourseStatus(c.courseId, e.target.value)}
                          className={`rounded-lg border px-2 py-0.5 text-[10px] font-bold uppercase cursor-pointer focus:outline-none transition ${c.status === "active" ? "bg-green-50 text-green-600 border-green-200 dark:bg-green-950/20 dark:text-green-400 dark:border-green-900/30" : c.status === "draft" ? "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30" : "bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30"}`}
                        >
                          <option value="draft">Draft</option>
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <button
                          onClick={async () => {
                            try {
                              setActionLoading(true);
                              const res = await api.get(`/courses/${c.courseId}`);
                              setSelectedCourse(res.data);
                              setSelectedLesson(res.data.lessons?.[0] || null);
                            } catch (err: any) {
                              alert(err.message);
                            } finally {
                              setActionLoading(false);
                            }
                          }}
                          className="text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400"
                        >
                          Manage Details →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Course Pagination Controls */}
        {coursesTotalPages > 1 && (
          <div className="flex items-center justify-between bg-white dark:bg-[#121212] border border-slate-200 dark:border-zinc-800 rounded-2xl p-3 shadow-sm animate-fadeIn">
            <span className="text-xs font-semibold text-slate-500">
              Page {coursesPage} of {coursesTotalPages} ({coursesTotalItems} total courses)
            </span>
            <div className="flex gap-2">
              <button
                disabled={coursesPage <= 1}
                onClick={() => setCoursesPage(p => Math.max(1, p - 1))}
                className="rounded-xl border border-slate-200 px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800 transition"
              >
                Previous
              </button>
              <button
                disabled={coursesPage >= coursesTotalPages}
                onClick={() => setCoursesPage(p => Math.min(coursesTotalPages, p + 1))}
                className="rounded-xl border border-slate-200 px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800 transition"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Create Course Modal overlay */}
        {isCreateCourseModalOpen && (
          <div className="fixed inset-0 z-55 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
            <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-[#121212] animate-scaleUp">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100 dark:border-zinc-800/80">
                <h3 className="text-base font-bold text-slate-900 dark:text-zinc-50 flex items-center gap-2">
                  <PlusCircle size={18} className="text-blue-600" /> Create Professional Course
                </h3>
                <button
                  onClick={() => setIsCreateCourseModalOpen(false)}
                  className="rounded-lg p-1 text-slate-455 hover:bg-slate-50 dark:hover:bg-zinc-850 transition"
                >
                  <span className="text-xl font-bold">×</span>
                </button>
              </div>

              {courseFormError && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-400">{courseFormError}</div>}
              {courseFormSuccess && <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-600 dark:bg-green-950/30 dark:text-green-400">{courseFormSuccess}</div>}

              <form onSubmit={handleCreateCourse} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-500">Course Name</label>
                  <input
                    type="text" value={newCourseName} onChange={(e) => setNewCourseName(e.target.value)}
                    placeholder="e.g. Next.js Enterprise Scaling"
                    className="rounded-xl border border-slate-200 bg-transparent px-3.5 py-2.5 text-sm focus:border-blue-600 focus:outline-none dark:border-zinc-800"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-500">Category Tag</label>
                  <select
                    value={newCourseCategory} onChange={(e) => setNewCourseCategory(Number(e.target.value))}
                    className="rounded-xl border border-slate-200 bg-white p-2.5 text-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                  >
                    {categoriesList.map((cat) => (
                      <option key={cat.categoryId} value={cat.categoryId}>
                        {cat.categoryName}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-500">Publication Status</label>
                  <select
                    value={newCourseStatus} onChange={(e) => setNewCourseStatus(e.target.value)}
                    className="rounded-xl border border-slate-200 bg-white p-2.5 text-sm dark:border-zinc-800 dark:bg-zinc-900"
                  >
                    <option value="draft">Draft mode (Hidden)</option>
                    <option value="active">Active (Deploy to Catalog)</option>
                  </select>
                </div>
                <div className="flex justify-end gap-2 mt-4 pt-2 border-t border-slate-100 dark:border-zinc-800/80">
                  <button
                    type="button"
                    onClick={() => setIsCreateCourseModalOpen(false)}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-705 hover:bg-slate-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit" disabled={actionLoading}
                    className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 transition disabled:opacity-50"
                  >
                    Create Course
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  };

  // RENDER USER MANAGEMENT (Admin Only)
  const renderUserManagement = () => {
    const listToRender = userSearchQuery ? userList : paginatedUserList;

    return (
      <div className="flex flex-col gap-6 pb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-zinc-50">User Access Management</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">Modify credentials, change clearance roles and overview workspace permissions.</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-zinc-800 dark:bg-[#121212]">
          <div className="mb-5 flex gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text" value={userSearchQuery} onChange={(e) => setUserSearchQuery(e.target.value)}
                placeholder="Search by name, email, or role..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-4 text-sm text-slate-900 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900"
              />
            </div>
            <button
              onClick={() => loadUsers(userSearchQuery)}
              className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Search
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 dark:border-zinc-800">
                  <th className="py-3 px-4 font-semibold text-xs uppercase">User ID</th>
                  <th className="py-3 px-4 font-semibold text-xs uppercase">Name</th>
                  <th className="py-3 px-4 font-semibold text-xs uppercase">Email</th>
                  <th className="py-3 px-4 font-semibold text-xs uppercase">Role</th>
                  <th className="py-3 px-4 font-semibold text-xs uppercase">Phone Number</th>
                  <th className="py-3 px-4 font-semibold text-xs uppercase">Address</th>
                </tr>
              </thead>
              <tbody>
                {isUsersLoading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      <div className="flex justify-center items-center gap-2">
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                        <span>Querying user records...</span>
                      </div>
                    </td>
                  </tr>
                ) : listToRender.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No matching user accounts found.
                    </td>
                  </tr>
                ) : (
                  listToRender.map((u) => (
                    <tr key={u.userId} className="border-b border-slate-100 hover:bg-slate-50/50 dark:border-zinc-800 dark:hover:bg-zinc-800/10">
                      <td className="py-4 px-4 font-mono text-slate-650 dark:text-zinc-400 font-bold">{u.userId}</td>
                      <td className="py-4 px-4 font-medium text-slate-900 dark:text-zinc-50 flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-400">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        {u.name}
                      </td>
                      <td className="py-4 px-4 text-slate-500 dark:text-zinc-400">{u.email}</td>
                      <td className="py-4 px-4">
                        <select
                          value={u.role} onChange={(e) => handleRoleChange(u.userId, e.target.value)}
                          className="rounded-lg border border-slate-200 bg-white p-1 text-xs dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                        >
                          <option value="user">User (Learner)</option>
                          <option value="employee">Employee</option>
                          <option value="admin">Administrator</option>
                        </select>
                      </td>
                      <td className="py-4 px-4 text-slate-500 dark:text-zinc-400">{u.phoneNumber || "N/A"}</td>
                      <td className="py-4 px-4 text-slate-500 dark:text-zinc-400 max-w-xs truncate">{u.address || "N/A"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* User Pagination Controls */}
          {!userSearchQuery && usersTotalPages > 1 && (
            <div className="flex items-center justify-between mt-4 bg-white dark:bg-[#121212] border border-slate-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm animate-fadeIn">
              <span className="text-xs font-semibold text-slate-500">
                Page {usersPage} of {usersTotalPages} ({usersTotalItems} total users)
              </span>
              <div className="flex gap-2">
                <button
                  disabled={usersPage <= 1}
                  onClick={() => setUsersPage(p => Math.max(1, p - 1))}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800 transition"
                >
                  Previous
                  </button>
                <button
                  disabled={usersPage >= usersTotalPages}
                  onClick={() => setUsersPage(p => Math.min(usersTotalPages, p + 1))}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800 transition"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // =========================================================================
  // LEARNER / USER VIEWS
  // =========================================================================

  // RENDER LEARNER PORTAL - MY LEARNING & LESSON VIEWER
  const renderMyLearning = () => {
    if (selectedCourse) {
      return renderYouTubePlayerView();
    }

    const enrolledCoursesList = allCourses.filter((c) => {
      const progress = learnerProgress[c.courseId];
      return progress !== undefined && progress >= 0;
    });

    if (isCoursesLoading) return <LoadingSpinner />;

    return (
      <div className="flex flex-col gap-6 pb-8 animate-fadeIn">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-zinc-50">My Courses</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">Track progress and resume your active training modules.</p>
        </div>

        {enrolledCoursesList.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-center rounded-2xl border border-dashed border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#121212]">
            <BookOpenCheck size={42} className="text-slate-400 animate-pulse" />
            <h4 className="font-bold text-slate-800 dark:text-zinc-200">No Enrolled Courses Found</h4>
            <p className="text-xs text-slate-400 max-w-xs">Search our catalog to enroll in training tracks matching your skills requirements.</p>
            <button
              onClick={() => router.push("/dashboard?tab=catalog")}
              className="mt-3 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-blue-700"
            >
              Go to Course Catalog
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {enrolledCoursesList.map((c) => {
              const progress = learnerProgress[c.courseId] ?? 0;
              return (
                <div
                  key={c.courseId}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-[#121212] flex flex-col justify-between hover:border-slate-300 hover:shadow-md transition cursor-pointer"
                  onClick={() => {
                    setSelectedCourse(c);
                    setSelectedLesson(c.lessons?.[0] || null);
                  }}
                >
                  <div>
                    <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-950/40 dark:text-blue-400">
                      Active Enrollment
                    </span>
                    <h3 className="font-bold text-slate-900 dark:text-zinc-50 mt-3">{c.name}</h3>
                    <p className="text-xs text-slate-400 font-mono mt-1">ID: {c.courseId}</p>
                  </div>
                  <div className="mt-8">
                    <div className="flex justify-between items-center text-xs font-medium text-slate-500 mb-1.5">
                      <span>Course Progress</span>
                      <span className="font-bold text-blue-600 dark:text-blue-400">{progress}%</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-zinc-800">
                      <div className="h-full rounded-full bg-blue-600 transition-all duration-500" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // RENDER COURSE CATALOG WITH INTEGRATED SEARCH BAR (User/Learner Only)
  const renderCourseCatalog = () => {
    // Filter active courses
    const catalogCourses = allCourses.filter((c) => {
      const isStatusActive = c.status === "active";
      const matchesSearch = c.name.toLowerCase().includes(catalogSearch.toLowerCase()) || c.courseId.toLowerCase().includes(catalogSearch.toLowerCase());
      const matchesCategory = activeCategoryFilter ? c.categoryId === activeCategoryFilter : true;
      return isStatusActive && matchesSearch && matchesCategory;
    });

    return (
      <div className="flex flex-col gap-6 pb-8 animate-fadeIn">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-zinc-50">Course Catalog</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">Search and register for professional development training sessions.</p>
        </div>

        {/* Catalog Search & Category Filters */}
        <div className="flex flex-col gap-4 bg-white p-5 rounded-2xl border border-slate-200 dark:bg-[#121212] dark:border-zinc-800 shadow-sm">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text" value={catalogSearch} onChange={(e) => setCatalogSearch(e.target.value)}
                placeholder="Search catalog by keywords, course IDs, or skills..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-3 pl-11 pr-4 text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white dark:border-zinc-800 dark:bg-zinc-900/50 dark:focus:bg-zinc-900 transition"
              />
            </div>
            {catalogSearch && (
              <button
                onClick={() => setCatalogSearch("")}
                className="rounded-xl border border-slate-200 text-xs font-semibold px-4 py-2 hover:bg-slate-50 transition dark:border-zinc-800 dark:text-zinc-300"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-zinc-800/80">
            <Filter size={13} className="text-slate-400 mr-2" />
            <button
              onClick={() => setActiveCategoryFilter(null)}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${!activeCategoryFilter ? "bg-blue-600 text-white" : "bg-slate-50 text-slate-600 hover:bg-slate-100 dark:bg-zinc-800/50 dark:text-zinc-300 dark:hover:bg-zinc-800"}`}
            >
              All Categories
            </button>
            {categoriesList.map((cat) => (
              <button
                key={cat.categoryId}
                onClick={() => setActiveCategoryFilter(cat.categoryId)}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${activeCategoryFilter === cat.categoryId ? "bg-blue-600 text-white" : "bg-slate-50 text-slate-600 hover:bg-slate-100 dark:bg-zinc-800/50 dark:text-zinc-300 dark:hover:bg-zinc-800"}`}
              >
                {cat.categoryName}
              </button>
            ))}
          </div>
        </div>

        {isCoursesLoading ? (
          <LoadingSpinner />
        ) : catalogCourses.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 dark:bg-[#121212] dark:border-zinc-800">
            <p className="text-sm text-slate-400">No courses match your query. Try searching with different terms.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {catalogCourses.map((c) => {
              const progress = learnerProgress[c.courseId];
              const isEnrolled = progress !== undefined && progress >= 0;
              return (
                <div key={c.courseId} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-[#121212] flex flex-col justify-between hover:border-slate-300 transition">
                  <div>
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                        {categoriesList.find(cat => cat.categoryId === c.categoryId)?.categoryName || c.categoryName || "Training"}
                      </span>
                    </div>
                    <h3 className="font-bold text-slate-900 dark:text-zinc-50 mt-3">{c.name}</h3>
                    <p className="text-xs text-slate-400 mt-1">Contains {c.lessons?.length ?? 0} lessons</p>
                  </div>
                  <div className="mt-8 flex items-center justify-between">
                    {isEnrolled ? (
                      <>
                        <span className="text-xs font-semibold text-green-600 dark:text-green-400">Enrolled ({progress}%)</span>
                        <button
                          onClick={() => {
                            setSelectedCourse(c);
                            setSelectedLesson(c.lessons?.[0] || null);
                            router.push("/dashboard?tab=my-learning");
                          }}
                          className="rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-4 py-2 transition dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                        >
                          Resume Course
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="text-xs text-slate-400">{c.enrolled} learners enrolled</span>
                        <button
                          onClick={() => handleEnroll(c.courseId)}
                          disabled={actionLoading}
                          className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 transition disabled:opacity-50"
                        >
                          Enroll Now
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // RENDER LEARNER PROGRESS REPORT (User/Learner Only)
  const renderLearnerProgressReport = () => {
    if (isCoursesLoading) return <LoadingSpinner />;

    const enrolledCourses = allCourses.filter((c) => {
      const p = learnerProgress[c.courseId];
      return p !== undefined && p >= 0;
    });

    const completedCount = enrolledCourses.filter((c) => learnerProgress[c.courseId] === 100).length;
    const enrolledCount = enrolledCourses.length;
    const sumProgress = enrolledCourses.reduce((sum, c) => sum + (learnerProgress[c.courseId] || 0), 0);
    const avgProgress = enrolledCount > 0 ? Math.round(sumProgress / enrolledCount) : 0;

    return (
      <div className="flex flex-col gap-6 pb-8 animate-fadeIn">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-zinc-50">My Progress</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">Overview of your training completions and success metrics.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex flex-col gap-2">
            <StatCard icon={<BookOpen size={18} />} label="Active Enrollments" value={enrolledCount} accent="#3b82f6" />
            <button
              onClick={() => router.push("/dashboard?tab=my-learning")}
              className="text-[11px] font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 self-start pl-2 transition-all"
            >
              See all enrolled courses →
            </button>
          </div>
          <div className="flex flex-col gap-2">
            <StatCard icon={<CheckCircle size={18} />} label="Completed Courses" value={completedCount} accent="#10b981" />
            <button
              onClick={() => router.push("/dashboard?tab=certificates")}
              className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 self-start pl-2 transition-all"
            >
              See all completed courses →
            </button>
          </div>
          <div className="flex flex-col gap-2">
            <StatCard icon={<TrendingUp size={18} />} label="Average Progress Rate" value={`${avgProgress}%`} accent="#f59e0b" />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-zinc-800 dark:bg-[#121212] shadow-sm">
          <h3 className="font-bold text-slate-900 dark:text-zinc-50 mb-4">Topic Performance Breakdown</h3>
          <div className="flex flex-col gap-5">
            {enrolledCourses.map((c, i) => {
              const progress = learnerProgress[c.courseId] ?? 0;
              return (
                <div key={c.courseId}>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-sm font-semibold text-slate-700 dark:text-zinc-300">{c.name}</span>
                    <span className="text-sm font-bold text-slate-950 dark:text-zinc-55">{progress}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-zinc-800">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress}%`, backgroundColor: getColor(i) }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // RENDER CERTIFICATES (User/Learner Only)
  const renderCertificates = () => {
    const completedCourses = allCourses.filter((c) => learnerProgress[c.courseId] === 100);

    return (
      <div className="flex flex-col gap-6 pb-8 animate-fadeIn">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-zinc-50">My Certificates</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">View and print credentials for completed coursework.</p>
        </div>

        {completedCourses.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-center rounded-2xl border border-dashed border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#121212]">
            <Award size={42} className="text-slate-300" />
            <h4 className="font-bold text-slate-800 dark:text-zinc-200">No Certificates Earned</h4>
            <p className="text-xs text-slate-400 max-w-xs">Complete active courses to 100% progress rate to automatically generate credentials.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {completedCourses.map((c) => (
              <div key={c.courseId} className="relative overflow-hidden rounded-2xl border-2 border-amber-200 bg-amber-50/10 p-6 shadow-sm dark:border-amber-900/30 dark:bg-[#1a1613] animate-scaleIn">
                <div className="absolute right-4 top-4 opacity-10 dark:opacity-20 text-amber-500">
                  <Award size={96} />
                </div>
                <div>
                  <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                    <Award size={18} />
                    <span className="text-xs font-bold uppercase tracking-wider">LMS Verified Credential</span>
                  </div>
                  <h3 className="font-extrabold text-slate-900 dark:text-zinc-50 mt-4 text-xl tracking-tight">{c.name}</h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-2">
                    Course Code: <span className="font-mono font-bold">{c.courseId}</span>
                  </p>
                  <p className="text-xs text-slate-400 mt-1">Recipient Name: <span className="font-semibold text-slate-700 dark:text-zinc-300">{name}</span></p>
                </div>
                <div className="mt-8 pt-4 border-t border-amber-100 dark:border-amber-900/30 flex justify-between items-center">
                  <span className="text-[9px] text-amber-700 dark:text-amber-500 font-semibold uppercase">TrainXcel Training Program</span>
                  <span className="text-xs font-bold text-green-600 dark:text-green-400">Active</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // SYSTEM SETTINGS VIEW
  const renderSettings = () => {
    return (
      <div className="flex flex-col gap-6 pb-8 animate-fadeIn">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-zinc-50">Settings</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">Review platform and account metrics configuration details.</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-zinc-800 dark:bg-[#121212] shadow-sm">
          <h3 className="font-bold text-slate-900 dark:text-zinc-50 mb-4">Account Profile</h3>
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-400">Full Name</label>
                <p className="text-sm font-semibold text-slate-900 dark:text-zinc-100 mt-0.5">{name}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400">Email Address</label>
                <p className="text-sm font-semibold text-slate-900 dark:text-zinc-100 mt-0.5">{email}</p>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400">Clearance Role</label>
              <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase mt-0.5">{role}</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // =========================================================================
  // VIEW DIRECTORY ROUTER
  // =========================================================================

  const renderViewContent = () => {
    if (isAdminOrEmployee) {
      switch (currentTab) {
        case "overview":
          return renderAdminOverview();
        case "manage-courses":
          return renderManageCourses();
        case "users":
          return isAdmin ? renderUserManagement() : renderAdminOverview();
        case "settings":
          return renderSettings();
        default:
          return renderAdminOverview();
      }
    } else {
      switch (currentTab) {
        case "my-learning":
        case "overview":
          return renderMyLearning();
        case "catalog":
          return renderCourseCatalog();
        case "progress":
          return renderLearnerProgressReport();
        case "certificates":
          return renderCertificates();
        case "settings":
          return renderSettings();
        default:
          return renderMyLearning();
      }
    }
  };

  return (
    <>
      {renderViewContent()}
      <ConfirmModal
        isOpen={modalState.isOpen}
        title={modalState.title}
        message={modalState.message}
        confirmText={modalState.confirmText}
        onConfirm={modalState.onConfirm}
        onCancel={() => setModalState((prev) => ({ ...prev, isOpen: false }))}
        isLoading={actionLoading}
      />
    </>
  );
}

// ── Sub-components ──

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
}

function ConfirmModal({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = "Confirm",
  cancelText = "Cancel",
  isLoading = false,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-[#121212] animate-scaleIn">
        <h3 className="text-lg font-bold text-slate-900 dark:text-zinc-50">{title}</h3>
        <p className="mt-2 text-sm text-slate-500 dark:text-zinc-400">{message}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="rounded-xl border border-slate-200 bg-transparent px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Processing...
              </>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

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
      <div className="mt-4">{children}</div>
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

export default function DashboardPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <DashboardPageContent />
    </Suspense>
  );
}
