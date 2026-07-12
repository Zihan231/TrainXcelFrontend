"use client";

import { useEffect, useState } from "react";
import { api } from "@/libs/api";

export interface DashboardStats {
  totalUsers: number;
  totalCourses: number;
  totalEmployees: number;
  overallCompletionRate: number;
}

export interface MonthlyProgress {
  month: string;
  progress: number;
}

export interface CourseComparison {
  courseId: string;
  name: string;
  enrolledCount: number;
  completionRate: number;
}

export interface CategoryStat {
  categoryId: number;
  categoryName: string;
  coursesCount: number;
  totalEnrolled: number;
  averageProgress: number;
}

export interface MaterialStat {
  materialType: string;
  availableLessonsCount: number;
  totalCompletedLessonsCount: number;
}

export interface AtRiskUser {
  userId: string;
  name: string;
  email: string;
  courseId: string;
  courseName: string;
  progress: number;
}

export interface RecentActivity {
  activityId: number;
  type: string;
  userId: string;
  userName: string;
  courseId: string;
  courseName: string;
  message: string;
  timestamp: string;
}

export interface UserPerformance {
  userId: string;
  name: string;
  email: string;
  role: string;
  completedCoursesCount: number;
  activeCoursesCount: number;
  averageProgress: number;
}

export function useDashboardStats() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [monthly, setMonthly] = useState<MonthlyProgress[]>([]);
  const [courseComparison, setCourseComparison] = useState<CourseComparison[]>([]);
  const [categories, setCategories] = useState<CategoryStat[]>([]);
  const [materials, setMaterials] = useState<MaterialStat[]>([]);
  const [atRisk, setAtRisk] = useState<AtRiskUser[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [userPerformance, setUserPerformance] = useState<UserPerformance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [
          statsRes,
          monthlyRes,
          comparisonRes,
          categoriesRes,
          materialsRes,
          atRiskRes,
          activityRes,
          userPerfRes,
        ] = await Promise.all([
          api.get("/courses/stats/dashboard"),
          api.get("/courses/stats/monthly-progress"),
          api.get("/courses/stats/course-progress-comparison"),
          api.get("/courses/stats/categories"),
          api.get("/courses/stats/materials"),
          api.get("/courses/stats/at-risk"),
          api.get("/courses/stats/recent-activity"),
          api.get("/courses/stats/user-performance"),
        ]);

        setStats(statsRes.data);
        setMonthly(monthlyRes.data);
        setCourseComparison(comparisonRes.data);
        setCategories(categoriesRes.data);
        setMaterials(materialsRes.data);
        setAtRisk(atRiskRes.data);
        setRecentActivity(activityRes.data);
        setUserPerformance(userPerfRes.data);
      } catch {
        setError("Failed to load dashboard data.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchAll();
  }, []);

  return {
    stats,
    monthly,
    courseComparison,
    categories,
    materials,
    atRisk,
    recentActivity,
    userPerformance,
    isLoading,
    error,
  };
}
