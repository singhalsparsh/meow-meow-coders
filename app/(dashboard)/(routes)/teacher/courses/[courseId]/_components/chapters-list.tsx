"use client"

import { Chapter } from "@prisma/client"
import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Pencil, Plus } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export type ChapterWithSubs = Chapter & { subChapters: Chapter[] };

interface ChapterListProps {
    items: ChapterWithSubs[];
    onReorder: (updateData: { id: string; position: number; parentId: string | null }[]) => void;
    onEdit: (id: string) => void;
    onAddSub: (parentId: string) => void;
    addingSubFor: string | null;
}

// Flatten the topic -> sub-lesson tree into one ordered list. A topic is always
// followed immediately by its own sub-lessons, so the tree is a contiguous run.
const flatten = (items: ChapterWithSubs[]): Chapter[] =>
    items.flatMap((chapter) => [chapter, ...(chapter.subChapters ?? [])]);

// After a move, re-parent every sub-lesson to the nearest topic that precedes it.
const attachToNearestTopic = (list: Chapter[]): Chapter[] => {
    let currentTopicId: string | null = null;
    return list.map((item) => {
        if (item.parentId === null) {
            currentTopicId = item.id;
            return { ...item, parentId: null };
        }
        const parentId = currentTopicId;
        if (parentId === null) {
            currentTopicId = item.id;
        }
        return { ...item, parentId };
    });
};

// Position is scoped to a sibling group: topics count among topics, sub-lessons
// among their topic's sub-lessons.
const assignPositions = (list: Chapter[]): Chapter[] => {
    let topicPosition = 0;
    const subPositions: Record<string, number> = {};
    return list.map((item) => {
        if (item.parentId === null) {
            return { ...item, position: topicPosition++ };
        }
        const next = (subPositions[item.parentId] ?? -1) + 1;
        subPositions[item.parentId] = next;
        return { ...item, position: next };
    });
};

// A topic occupies a contiguous run with its sub-lessons; a sub-lesson is 1.
const blockSize = (flat: Chapter[], index: number): number => {
    const chapter = flat[index];
    if (chapter.parentId !== null) return 1;
    let size = 1;
    for (let i = index + 1; i < flat.length && flat[i].parentId === chapter.id; i++) {
        size++;
    }
    return size;
};

export const ChaptersList = ({
    items, onReorder, onEdit, onAddSub, addingSubFor
}: ChapterListProps) => {
    const [isMounted, setIsMounted] = useState(false)
    const [chapters, setChapters] = useState<Chapter[]>(() => flatten(items))

    useEffect(() => {
        setIsMounted(true)
    }, [])

    useEffect(() => {
        setChapters(flatten(items))
    }, [items])

    const commit = (flat: Chapter[]) => {
        const updated = assignPositions(attachToNearestTopic(flat));
        setChapters(updated);
        onReorder(updated.map((chapter) => ({
            id: chapter.id,
            position: chapter.position,
            parentId: chapter.parentId,
        })))
    }

    // Move a chapter within its own sibling group: topics move among topics
    // (carrying their sub-lessons), sub-lessons move within their parent.
    const move = (chapterId: string, direction: "up" | "down") => {
        const flat = [...chapters];
        const index = flat.findIndex((c) => c.id === chapterId);
        if (index === -1) return;

        const chapter = flat[index];
        const isTopic = chapter.parentId === null;

        // Indices of the peers this chapter can swap with.
        const peerIndices = flat
            .map((c, i) => (isTopic ? (c.parentId === null ? i : -1) : (c.parentId === chapter.parentId ? i : -1)))
            .filter((i) => i !== -1);

        const peerPosition = peerIndices.indexOf(index);
        const swapPosition = direction === "up" ? peerPosition - 1 : peerPosition + 1;
        if (swapPosition < 0 || swapPosition >= peerIndices.length) return;

        const otherIndex = peerIndices[swapPosition];

        const first = Math.min(index, otherIndex);
        const second = Math.max(index, otherIndex);
        const firstSize = blockSize(flat, first);
        const secondSize = blockSize(flat, second);

        const firstBlock = flat.slice(first, first + firstSize);
        const secondBlock = flat.slice(second, second + secondSize);

        const reordered = [
            ...flat.slice(0, first),
            ...(index === first ? secondBlock : firstBlock),
            ...(index === first ? firstBlock : secondBlock),
            ...flat.slice(second + secondSize),
        ];

        commit(reordered);
    }

    if (!isMounted) {
        return null;
    }

    return (
        <div>
            {chapters.map((chapter) => {
                const isSubChapter = chapter.parentId !== null;
                return (
                    <div
                        key={chapter.id}
                        className={cn(
                            "flex items-center gap-x-2 bg-slate-200 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 border text-slate-700 dark:text-slate-200 rounded-xl mb-4 text-sm transition-all duration-200",
                            isSubChapter && "ml-6 border-dashed",
                            chapter.isPublished && "bg-sky-100 dark:bg-sky-900/30 border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300"
                        )}
                    >
                        <span className="truncate pl-3 py-3">
                            {isSubChapter && <span className="text-slate-400 dark:text-slate-500 mr-1">└</span>}
                            {chapter.title}
                        </span>
                        <div className="ml-auto pr-2 flex items-center gap-x-2">
                            <Badge
                                className={cn(
                                    "bg-slate-500",
                                    chapter.isPublished && "bg-sky-700"
                                )}
                            >
                                {chapter.isPublished ? "Published" : "Draft"}
                            </Badge>
                            {!isSubChapter && (
                                <button
                                    type="button"
                                    title="Add sub-lesson"
                                    disabled={addingSubFor === chapter.id}
                                    onClick={() => onAddSub(chapter.id)}
                                    className="p-1 rounded hover:bg-slate-300 dark:hover:bg-slate-600 disabled:opacity-50 transition"
                                >
                                    <Plus className="w-4 h-4" />
                                </button>
                            )}
                            <button
                                type="button"
                                title="Move up"
                                onClick={() => move(chapter.id, "up")}
                                className="p-1 rounded hover:bg-slate-300 dark:hover:bg-slate-600 transition"
                            >
                                <ArrowUp className="w-4 h-4" />
                            </button>
                            <button
                                type="button"
                                title="Move down"
                                onClick={() => move(chapter.id, "down")}
                                className="p-1 rounded hover:bg-slate-300 dark:hover:bg-slate-600 transition"
                            >
                                <ArrowDown className="w-4 h-4" />
                            </button>
                            <Pencil
                                className="w-4 h-4 cursor-pointer hover:opacity-75 transition"
                                onClick={() => onEdit(chapter.id)}
                            />
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
