"use client";

import { useEffect } from "react";

import { CourseProgress } from "@/components/course-progress";
import { CourseSidebarItem } from "./course-sidebar-item";
import { useLocalProgress } from "@/hooks/use-local-progress";
import { writeCache } from "@/lib/client-cache";

const CONTENT_NS = "course-content";

export interface LessonNode {
  id: string;
  title: string;
  subChapters: { id: string; title: string }[];
}

interface CourseSidebarContentProps {
  courseTitle: string;
  courseId: string;
  userId: string;
  lessons: LessonNode[];
  seedProgress?: Record<string, boolean>;
}

/**
 * Client-rendered course sidebar. It renders instantly from the browser's
 * cached per-user progress (seeded from the server on first load), so on a
 * revisit/refresh the checkmarks and progress bar appear immediately instead
 * of waiting on the server. The course lesson structure is also written to the
 * browser cache so it can be restored without re-fetching.
 */
export const CourseSidebarContent = ({
  courseTitle,
  courseId,
  userId,
  lessons,
  seedProgress,
}: CourseSidebarContentProps) => {
  const {
    completedCount,
    isCompleted,
    setChapterCompleted,
    setProgress,
    needsSeed,
  } = useLocalProgress(courseId, userId, seedProgress);

  // Save the course lesson tree to the browser on first render (best-effort).
  useEffect(() => {
    if (!courseId) return;
    writeCache(CONTENT_NS, lessons, courseId);
  }, [courseId, lessons]);

  // Cold cache: hydrate the per-user progress from the server once, so a first
  // visit reflects real progress and repeat visits skip the server request.
  useEffect(() => {
    if (!needsSeed || !courseId) return;
    let active = true;
    fetch(`/api/my-progress?courseId=${encodeURIComponent(courseId)}`, {
      cache: "no-store",
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { completed?: Record<string, boolean> } | null) => {
        if (!active || !data || !data.completed) return;
        setProgress(data.completed);
      })
      .catch(() => {
        /* best-effort: keep local state */
      });
    return () => {
      active = false;
    };
  }, [needsSeed, courseId, setProgress]);

  let totalChapters = 0;
  for (const lesson of lessons) {
    totalChapters += 1 + lesson.subChapters.length;
  }
  const progressValue =
    totalChapters === 0 ? 0 : Math.round((completedCount / totalChapters) * 100);

  return (
    <div className="h-full flex flex-col overflow-y-auto">
      <div className="px-4 pb-4 pt-5 border-b border-border/60">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 px-3">
          Course content
        </p>
        <h1 className="font-semibold text-base truncate px-3 text-foreground">
          {courseTitle}
        </h1>
        <div className="mt-4 px-3">
          <CourseProgress variant="success" value={progressValue} />
        </div>
      </div>

      <div className="flex flex-col w-full px-3 gap-1 flex-1 pt-4">
        {lessons.map((lesson, index) => (
          <div
            key={lesson.id}
            className="animate-in fade-in slide-in-from-left-2"
            style={{
              animationDelay: `${index * 40}ms`,
              animationFillMode: "backwards",
            }}
          >
            <CourseSidebarItem
              id={lesson.id}
              label={lesson.title}
              isCompleted={isCompleted(lesson.id)}
              courseId={courseId}
              isLocked={false}
              onToggleComplete={(done) => setChapterCompleted(lesson.id, done)}
            />
            {lesson.subChapters.length > 0 && (
              <div className="flex flex-col gap-1 mt-0.5 ml-4 border-l border-border/70 pl-3">
                {lesson.subChapters.map((subChapter) => (
                  <CourseSidebarItem
                    key={subChapter.id}
                    id={subChapter.id}
                    label={subChapter.title}
                    isCompleted={isCompleted(subChapter.id)}
                    courseId={courseId}
                    isLocked={false}
                    onToggleComplete={(done) =>
                      setChapterCompleted(subChapter.id, done)
                    }
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
