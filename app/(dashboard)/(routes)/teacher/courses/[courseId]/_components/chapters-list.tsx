"use client"

import { Chapter } from "@prisma/client"
import { useEffect, useState } from "react";
import {
    DragDropContext,
    Droppable,
    Draggable,
    DropResult
} from "@hello-pangea/dnd"
import { Grip, Pencil } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export type ChapterWithSubs = Chapter & { subChapters: Chapter[] };

interface ChapterListProps {
    items: ChapterWithSubs[];
    onReorder: (updateData: { id: string; position: number; parentId: string | null }[]) => void;
    onEdit: (id: string) => void;
}

// Flatten the topic -> sub-lesson tree into one ordered list. Sub-lessons sit
// directly after their topic, which lets a single Droppable reorder both levels
// without nested droppables (notoriously buggy in @hello-pangea/dnd).
const flatten = (items: ChapterWithSubs[]): Chapter[] =>
    items.flatMap((chapter) => [chapter, ...(chapter.subChapters ?? [])]);

// After a drag, re-parent every sub-lesson to the nearest topic that precedes
// it. A sub-lesson dragged above the first topic is promoted to a top-level topic.
const attachToNearestTopic = (list: Chapter[]): Chapter[] => {
    let currentTopicId: string | null = null;
    return list.map((item) => {
        if (item.parentId === null) {
            currentTopicId = item.id;
            return { ...item, parentId: null };
        }
        const parentId = currentTopicId;
        if (parentId === null) {
            // Promoted to a top-level topic; it becomes a boundary for what follows.
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

export const ChaptersList = ({
    items, onReorder, onEdit
}: ChapterListProps) => {
    const [isMounted, setIsMounted] = useState(false)
    const [chapters, setChapters] = useState<Chapter[]>(() => flatten(items))

    useEffect(() => {
        setIsMounted(true)
    }, [])

    useEffect(() => {
        setChapters(flatten(items))
    }, [items])

    const onDragEnd = (result: DropResult) => {
        const { source, destination } = result;
        if (!destination || source.index === destination.index) return;

        // Operate on the local flat state, not the items prop: onReorder does
        // not refresh the page, so the prop is stale until a navigation happens.
        const flat = chapters;
        const sourceIndex = source.index;
        const destinationIndex = destination.index;
        const moved = flat[sourceIndex];

        // Dragging a topic carries its sub-lessons along as one block.
        const blockSize = moved.parentId === null
            ? 1 + flat.filter((c) => c.parentId === moved.id).length
            : 1;

        const rest = flat.filter((_, index) => index < sourceIndex || index >= sourceIndex + blockSize);

        // destination.index is expressed in the pre-drag list. Convert it to an
        // insertion index in `rest`, which no longer contains the moved block.
        let insertAt: number;
        if (destinationIndex > sourceIndex) {
            insertAt = destinationIndex - blockSize + 1;
        } else {
            insertAt = destinationIndex;
        }
        insertAt = Math.max(0, Math.min(rest.length, insertAt));

        const reordered = [
            ...rest.slice(0, insertAt),
            ...flat.slice(sourceIndex, sourceIndex + blockSize),
            ...rest.slice(insertAt),
        ];

        const updated = assignPositions(attachToNearestTopic(reordered));
        setChapters(updated);

        onReorder(updated.map((chapter) => ({
            id: chapter.id,
            position: chapter.position,
            parentId: chapter.parentId,
        })))
    }

    if (!isMounted) {
        return null;
    }

    return (
        <DragDropContext
            onDragEnd={onDragEnd}
        >
            <Droppable
                droppableId="chapters"
            >
                {(provided) => (
                    <div {...provided.droppableProps} ref={provided.innerRef}>
                        {chapters.map((chapter, index) => {
                            const isSubChapter = chapter.parentId !== null;
                            return (
                                <Draggable key={chapter.id} draggableId={chapter.id} index={index}>
                                    {(provided) => (
                                        <div
                                            className={cn(
                                                "flex items-center gap-x-2 bg-slate-200 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 border text-slate-700 dark:text-slate-200 rounded-xl mb-4 text-sm transition-all duration-200",
                                                "hover:shadow-md hover:scale-[1.005]",
                                                isSubChapter && "ml-6 border-dashed",
                                                chapter.isPublished && "bg-sky-100 dark:bg-sky-900/30 border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300"
                                            )}
                                            ref={provided.innerRef}
                                            {...provided.draggableProps}
                                        >
                                            <div
                                                className={cn(
                                                    "px-2 py-3 border-r border-r-slate-200 dark:border-r-slate-600 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-l-md transition",
                                                    chapter.isPublished && "border-r-sky-200 dark:border-r-sky-800 hover:bg-sky-200 dark:hover:bg-sky-800/40"
                                                )}
                                                {...provided.dragHandleProps}
                                            >
                                                <Grip
                                                    className="h-5 w-5"
                                                />
                                            </div>
                                            <span className="truncate">
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
                                                <Pencil
                                                    className="w-4 h-4 cursor-pointer hover:opacity-75 transition"
                                                    onClick={() => onEdit(chapter.id)}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </Draggable>
                            )
                        })}
                        {provided.placeholder}
                    </div>
                )}

            </Droppable>
        </DragDropContext>
    )
}
