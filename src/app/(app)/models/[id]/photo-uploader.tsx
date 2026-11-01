"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { cx, secondaryButtonClass } from "@/components/ui/styles";
import { addModelImage } from "./image-actions";

// Long edge of the stored full-size photo and of its thumbnail.
const FULL_EDGE = 1600;
const THUMB_EDGE = 480;

/**
 * Resizes in the browser and re-encodes (WebP, or JPEG where the browser cannot
 * encode WebP). Re-encoding also drops EXIF metadata such as GPS position, and
 * keeps uploads far below the server's body limit.
 */
async function encode(bitmap: ImageBitmap, edge: number, quality: number) {
  const scale = Math.min(1, edge / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is not available");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const toBlob = (type: string) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
  const webp = await toBlob("image/webp");
  if (webp?.type === "image/webp") return webp;
  const jpeg = await toBlob("image/jpeg");
  if (!jpeg) throw new Error("Could not encode the image");
  return jpeg;
}

export function PhotoUploader({
  modelId,
  disabled,
}: {
  modelId: string;
  disabled: boolean;
}) {
  const t = useTranslations("models.photos");
  const [pending, startTransition] = useTransition();
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [failed, setFailed] = useState(false);

  function onChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;
    setFailed(false);
    startTransition(async () => {
      try {
        // One photo per request keeps each one under the body size limit.
        for (const [index, file] of files.entries()) {
          setProgress({ done: index, total: files.length });
          const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
          const [full, thumb] = await Promise.all([
            encode(bitmap, FULL_EDGE, 0.82),
            encode(bitmap, THUMB_EDGE, 0.75),
          ]);
          bitmap.close();
          const data = new FormData();
          data.set("full", full, "full");
          data.set("thumb", thumb, "thumb");
          await addModelImage(modelId, data);
        }
      } catch {
        setFailed(true);
      } finally {
        setProgress(null);
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <label
        className={cx(
          secondaryButtonClass,
          "self-start has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand",
          (pending || disabled) && "pointer-events-none opacity-50",
        )}
      >
        <input
          type="file"
          accept="image/*"
          multiple
          disabled={pending || disabled}
          onChange={onChange}
          className="sr-only"
        />
        {t("add")}
      </label>
      <p className="text-[13px] text-muted" role="status">
        {progress ? t("uploading", progress) : t("hint")}
      </p>
      {failed && (
        <p role="alert" className="text-sm text-danger">
          {t("uploadFailed")}
        </p>
      )}
    </div>
  );
}
