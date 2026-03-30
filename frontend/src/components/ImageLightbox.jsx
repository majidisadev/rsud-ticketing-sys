import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

/**
 * Full-viewport lightbox (portal ke document.body, z di atas nav/layout).
 */
const ImageLightbox = ({ src, alt = "Pratinjau gambar", onClose }) => {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!src) return;
    const onKey = (e) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [src]);

  if (!src || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80"
      onClick={() => onCloseRef.current()}
      role="dialog"
      aria-modal="true"
      aria-label="Pratinjau gambar"
    >
      <button
        type="button"
        className="fixed top-3 right-3 z-[10001] p-2 rounded-full bg-white/15 text-white hover:bg-white/25 sm:top-4 sm:right-4"
        title="Tutup"
        aria-label="Tutup pratinjau"
        onClick={(e) => {
          e.stopPropagation();
          onCloseRef.current();
        }}
      >
        <X className="w-6 h-6" />
      </button>
      <img
        src={src}
        alt={alt}
        className="max-h-[90vh] max-w-full object-contain rounded shadow-lg"
        onClick={(e) => e.stopPropagation()}
      />
    </div>,
    document.body,
  );
};

export default ImageLightbox;
