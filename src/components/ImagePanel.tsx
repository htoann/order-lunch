"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, useRef } from "react";
import { uploadSessionImage, deleteSessionImage } from "@/lib/actions";
import { useAdmin } from "./AdminProvider";
import { useToast } from "./ToastProvider";

type SessionImage = {
  id: string;
  data: string;
  filename: string;
};

export default function ImagePanel({
  dateStr,
  images,
}: {
  dateStr: string;
  images: SessionImage[];
}) {
  const router = useRouter();
  const { isAdmin } = useAdmin();
  const [, startTransition] = useTransition();
  const { showError } = useToast();
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;
      if (file.size > 5 * 1024 * 1024) continue;

      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

      try {
        await uploadSessionImage(dateStr, base64, file.name);
      } catch {
        showError(`Lỗi khi upload ${file.name}!`);
      }
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
    startTransition(() => router.refresh());
  }

  function handleDelete(imageId: string) {
    deleteSessionImage(imageId).then(() => {
      startTransition(() => router.refresh());
    }).catch(() => showError("Lỗi khi xóa hình ảnh!"));
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">
          Hình ảnh ({images.length})
        </h3>
        {isAdmin && (
          <label
            className={`cursor-pointer rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 ${
              uploading ? "opacity-50 pointer-events-none" : ""
            }`}
          >
            {uploading ? "Uploading..." : "Upload"}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleUpload}
              className="hidden"
            />
          </label>
        )}
      </div>

      {images.length === 0 ? (
        <div className="flex flex-1 items-center justify-center rounded-lg border-2 border-dashed border-gray-200 p-6">
          <p className="text-center text-sm text-gray-400">
            Chưa có hình ảnh
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 overflow-y-auto">
          {images.map((img) => (
            <div
              key={img.id}
              className="group relative overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm"
            >
              <img
                src={img.data}
                alt={img.filename}
                className="w-full cursor-pointer object-cover"
                style={{ maxHeight: "200px" }}
                onClick={() => setPreviewUrl(img.data)}
              />
              {isAdmin && (
                <div className="absolute top-1 right-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    onClick={() => handleDelete(img.id)}
                    className="rounded bg-red-600 px-2 py-0.5 text-xs text-white hover:bg-red-700"
                  >
                    Xóa
                  </button>
                </div>
              )}
              <div className="px-2 py-1">
                <p className="truncate text-xs text-gray-500">{img.filename}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {previewUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
          onClick={() => setPreviewUrl(null)}
        >
          <img
            src={previewUrl}
            alt="Preview"
            className="max-h-[90vh] max-w-[90vw] rounded-lg"
          />
        </div>
      )}
    </div>
  );
}
