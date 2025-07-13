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
    <div className="fixed inset-0 bg-black bg-opacity-90 flex flex-col items-center justify-center z-50">
      <video ref={videoRef} className="w-full max-w-md" playsInline muted />
      {error && <p className="text-red-500 mt-2">{error}</p>}
      {captured && <p className="text-green-400 mt-2">Photo captured!</p>}
      <div className="mt-4 flex items-center space-x-16">
        <button onClick={onFlip} className="text-white text-[100px] p-6">
          🔄
        </button>
        <button
          onClick={capture}
          className="h-48 w-48 bg-white rounded-full border-4 border-gray-300 flex items-center justify-center text-[100px] text-black"
        >
          📸
        </button>
        <button
          onClick={() => {
            streamRef.current?.getTracks().forEach((t) => t.stop());
            onClose();
          }}
          className="text-white text-[100px] p-6"
        >
          ✖
        </button>
      </div>
    </div>
  );
}
