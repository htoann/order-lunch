"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, useRef, useEffect, useCallback } from "react";
import { uploadSessionImage, deleteSessionImage } from "@/lib/actions";
import { useAdmin } from "./AdminProvider";
import { useToast } from "./ToastProvider";
import { useConfirm } from "./ConfirmProvider";
import { UploadIcon, TrashIcon, ImageIcon } from "./icons";

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
  const { promise, showInfo } = useToast();
  const { confirm } = useConfirm();
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const uploadFiles = useCallback(
    async (files: File[]) => {
      const images = files.filter(
        (f) => f.type.startsWith("image/") && f.size <= 5 * 1024 * 1024
      );
      if (images.length === 0) return;

      setUploading(true);
      const uploadAll = (async () => {
        for (const file of images) {
          const base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          });
          // Pasted images often have no filename.
          const name =
            file.name && file.name.trim() !== ""
              ? file.name
              : `paste-${Date.now()}.png`;
          await uploadSessionImage(dateStr, base64, name);
        }
      })();

      try {
        await promise(uploadAll, {
          loading: "Đang tải ảnh lên...",
          success: "Đã tải ảnh lên",
          error: "Lỗi khi tải ảnh lên!",
        });
      } catch {
        // Error toast already shown.
      } finally {
        setUploading(false);
        if (fileRef.current) fileRef.current.value = "";
        startTransition(() => router.refresh());
      }
    },
    [dateStr, promise, router]
  );

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    uploadFiles(Array.from(files));
  }

  // Paste images anywhere on the page with Ctrl+V.
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const dt = e.clipboardData;
      if (!dt) return;

      const files: File[] = [];
      for (const item of Array.from(dt.items ?? [])) {
        if (item.kind === "file" && item.type.startsWith("image/")) {
          const f = item.getAsFile();
          if (f) files.push(f);
        }
      }
      // Fallback: some browsers expose pasted images via files only.
      if (files.length === 0) {
        for (const f of Array.from(dt.files ?? [])) {
          if (f.type.startsWith("image/")) files.push(f);
        }
      }
      if (files.length === 0) return;

      e.preventDefault();
      if (!isAdmin) {
        showInfo("Đăng nhập admin để tải ảnh lên");
        return;
      }
      uploadFiles(files);
    }
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [isAdmin, uploadFiles, showInfo]);

  async function handleDelete(imageId: string) {
    const ok = await confirm({
      title: "Xóa hình ảnh",
      message: "Bạn có chắc muốn xóa hình ảnh này?",
    });
    if (!ok) return;
    try {
      await promise(deleteSessionImage(imageId), {
        loading: "Đang xóa...",
        success: "Đã xóa hình ảnh",
        error: "Lỗi khi xóa hình ảnh!",
      });
      startTransition(() => router.refresh());
    } catch {
      // Error toast already shown.
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-800">
          <ImageIcon className="h-4 w-4 text-gray-400" />
          Hình ảnh ({images.length})
        </h3>
        {isAdmin && (
          <label
            title="Tải lên hoặc dán ảnh (Ctrl+V)"
            className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-blue-700 ${
              uploading ? "opacity-50 pointer-events-none" : ""
            }`}
          >
            <UploadIcon className="h-4 w-4" />
            {uploading ? "Đang tải..." : "Tải lên"}
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
        <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 p-8">
          <ImageIcon className="h-8 w-8 text-gray-300" />
          <p className="text-center text-sm text-gray-400">Chưa có hình ảnh</p>
          {isAdmin && (
            <p className="text-center text-xs text-gray-400">
              Dán ảnh (Ctrl+V) hoặc bấm “Tải lên”
            </p>
          )}
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
                className="h-auto w-full cursor-pointer bg-gray-50 object-contain"
                onClick={() => setPreviewUrl(img.data)}
              />
              {isAdmin && (
                <button
                  onClick={() => handleDelete(img.id)}
                  title="Xóa hình"
                  className="absolute top-2 right-2 rounded-lg bg-black/50 p-1.5 text-white opacity-0 backdrop-blur-sm transition-all hover:bg-red-600 group-hover:opacity-100"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
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
