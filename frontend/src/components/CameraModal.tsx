import { useEffect, useRef, useState } from "react";

interface Props {
  open: boolean;
  facingMode: "environment" | "user";
  onCapture: (b: Blob) => void;
  onClose: () => void;
  onFlip: () => void;
}

export default function CameraModal({
  open,
  facingMode,
  onCapture,
  onClose,
  onFlip,
}: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [captured, setCaptured] = useState(false);

  useEffect(() => {
    if (!open) return;
    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode },
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await new Promise((res) =>
            videoRef.current?.addEventListener("loadedmetadata", () => res(null), {
              once: true,
            })
          );
          await videoRef.current.play();
        }
      } catch {
        setError("Unable to access camera");
      }
    };
    start();
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [open, facingMode]);

  const capture = async () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    const width = videoRef.current.videoWidth || videoRef.current.clientWidth || 640;
    const height = videoRef.current.videoHeight || videoRef.current.clientHeight || 480;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0, width, height);
    canvas.toBlob(
      (blob) => {
        if (blob) {
          onCapture(blob);
          setCaptured(true);
          setTimeout(() => {
            setCaptured(false);
            streamRef.current?.getTracks().forEach((t) => t.stop());
            onClose();
          }, 500);
        }
      },
      "image/jpeg",
      0.95
    );
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex flex-col z-50">
      {/* Video container - takes most of the screen */}
      <div className="flex-1 flex items-center justify-center">
        <video ref={videoRef} className="w-full max-w-md" playsInline muted />
      </div>
      
      {/* Error/Success messages */}
      {error && <p className="text-red-500 text-center py-2">{error}</p>}
      {captured && <p className="text-green-400 text-center py-2">Photo captured!</p>}
      
      {/* Button controls - fixed at bottom with large touch targets */}
      <div className="h-32 flex items-center justify-center px-4 pb-8">
        <div className="flex items-center justify-between w-full max-w-md">
          {/* Flip button */}
          <button
            onClick={onFlip}
            className="w-16 h-16 bg-gray-800 bg-opacity-70 rounded-full flex items-center justify-center text-white text-3xl border-2 border-gray-300 active:bg-gray-700"
          >
            🔄
          </button>
          
          {/* Capture button - largest */}
          <button
            onClick={capture}
            className="w-20 h-20 bg-white rounded-full border-4 border-gray-300 flex items-center justify-center text-4xl text-black active:bg-gray-100 shadow-lg"
          >
            📸
          </button>
          
          {/* Close button */}
          <button
            onClick={() => {
              streamRef.current?.getTracks().forEach((t) => t.stop());
              onClose();
            }}
            className="w-16 h-16 bg-gray-800 bg-opacity-70 rounded-full flex items-center justify-center text-white text-3xl border-2 border-gray-300 active:bg-gray-700"
          >
            ✖
          </button>
        </div>
      </div>
    </div>
  );
}
