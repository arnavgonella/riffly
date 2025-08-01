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
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <h3 className="text-white text-lg font-medium">Photo Capture</h3>
        <button
          onClick={() => {
            streamRef.current?.getTracks().forEach((t) => t.stop());
            onClose();
          }}
          className="w-10 h-10 bg-gray-800 bg-opacity-70 rounded-full flex items-center justify-center text-white hover:bg-gray-700 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Video container - takes most of the screen */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="relative w-full max-w-md aspect-video bg-gray-900 rounded-lg overflow-hidden">
          <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
          {/* Overlay grid for composition guidance */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="w-full h-full grid grid-cols-3 grid-rows-3 opacity-20">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="border border-white border-opacity-30"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Error/Success messages */}
      {error && (
        <div className="px-4 py-2 text-center">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}
      {captured && (
        <div className="px-4 py-2 text-center">
          <p className="text-green-400 text-sm font-medium">Photo captured successfully!</p>
        </div>
      )}
      
      {/* Button controls - fixed at bottom with large touch targets */}
      <div className="h-32 flex items-center justify-center px-4 pb-8">
        <div className="flex items-center justify-between w-full max-w-md">
          {/* Flip button */}
          <button
            onClick={onFlip}
            className="w-16 h-16 bg-gray-800 bg-opacity-70 rounded-full flex items-center justify-center text-white hover:bg-gray-700 transition-colors border-2 border-gray-600"
            title="Switch Camera"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          
          {/* Capture button - largest */}
          <button
            onClick={capture}
            className="w-20 h-20 bg-white rounded-full border-4 border-gray-300 flex items-center justify-center hover:bg-gray-100 transition-colors shadow-lg"
            title="Capture Photo"
          >
            <svg className="w-8 h-8 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          
          {/* Spacer to balance layout */}
          <div className="w-16 h-16"></div>
        </div>
      </div>
    </div>
  );
}
