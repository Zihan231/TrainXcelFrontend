"use client";

import React from "react";
import { useParams } from "next/navigation";
import { CourseDetailView } from "@/components/CourseDetailView";
import { useUser } from "@/hooks/useUser";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function AdminCourseDetailPage() {
  const params = useParams();
  const courseId = params.courseId as string;
  const { role, userId } = useUser();

  const isAdminOrEmployee = role === "admin" || role === "employee";
  const isAdmin = role === "admin";

  return (
    <ProtectedRoute>
      <CourseDetailView
        courseId={courseId}
        backUrl="/dashboard?tab=manage-courses"
        isAdminOrEmployee={isAdminOrEmployee}
        isAdmin={isAdmin}
        userId={userId}
      />
    </ProtectedRoute>
  );
}
