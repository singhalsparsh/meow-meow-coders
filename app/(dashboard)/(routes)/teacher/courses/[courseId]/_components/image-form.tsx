"use client";

import * as z from "zod";
import axios from "axios";
import { Pencil, PlusCircle, ImageIcon } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { Course } from "@prisma/client";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ImageFormProps {
  initialData: Course
  courseId: string;
};

const formSchema = z.object({
  imageUrl: z.string().min(1, {
    message: "An image is required",
  }),
});

export const ImageForm = ({
  initialData,
  courseId
}: ImageFormProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [imageUrl, setImageUrl] = useState(initialData.imageUrl ?? "");
  const [isSaving, setIsSaving] = useState(false);

  const toggleEdit = () => {
    setImageUrl(initialData.imageUrl ?? "");
    setIsEditing((current) => !current);
  };

  const router = useRouter();

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsSaving(true);
      await axios.patch(`/api/courses/${courseId}`, values);
      toast.success("Course updated");
      toggleEdit();
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setIsSaving(false);
    }
  }

  // A simple http(s) URL check so the Save button stays disabled until a real
  // link is pasted (same pattern as the chapter video URL field).
  const isValidUrl = /^https?:\/\/.+\..+/.test(imageUrl.trim());

  return (
    <div className="mt-6 border bg-slate-100 rounded-md p-4">
      <div className="font-medium flex items-center justify-between">
        Image
        <Button onClick={toggleEdit} variant="ghost">
          {isEditing && (
            <>Cancel</>
          )}
          {!isEditing && !initialData.imageUrl && (
            <>
              <PlusCircle className="h-4 w-4 mr-2" />
              Add an image
            </>
          )}
          {!isEditing && initialData.imageUrl && (
            <>
              <Pencil className="h-4 w-4 mr-2" />
              Edit image
            </>
          )}
        </Button>
      </div>
      {!isEditing && (
        !initialData.imageUrl ? (
          <div className="flex items-center justify-center h-60 bg-slate-200 rounded-md">
            <ImageIcon className="h-10 w-10 text-slate-500" />
          </div>
        ) : (
          <div className="relative aspect-video mt-2">
            <Image
              alt="Upload"
              fill
              className="object-cover rounded-md"
              src={initialData.imageUrl}
            />
          </div>
        )
      )}
      {isEditing && (
        <div>
          <Input
            placeholder="https://example.com/image.jpg"
            value={imageUrl}
            disabled={isSaving}
            onChange={(e) => setImageUrl(e.target.value)}
          />
          <div className="flex items-center gap-x-2 mt-4">
            <Button
              type="button"
              disabled={!isValidUrl || isSaving}
              onClick={() => onSubmit({ imageUrl: imageUrl.trim() })}
            >
              Save
            </Button>
          </div>
          <div className="text-xs text-muted-foreground mt-4">
            Paste a direct link to an image (JPG, PNG, WebP). A 16:9 ratio is recommended.
          </div>
        </div>
      )}
    </div>
  )
}
