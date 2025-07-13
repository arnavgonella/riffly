import { useSession, useUser } from "@supabase/auth-helpers-react";
import { useRouter } from "next/router";
import { useEffect, useState, useRef } from "react";
import useAudioRecorder from "@/lib/useAudioRecorder";
import CameraModal from "@/components/CameraModal";

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

export default function Dashboard() {
  const session = useSession();
  const user = useUser();
  const router = useRouter();

  const {
    startRecording,
    stopRecording,
    clear,
    mediaBlob,
    isRecording,
  } = useAudioRecorder();

  const [downloadLink, setDownloadLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<{ blob: Blob; time: number }[]>([]);
  const [recordStart, setRecordStart] = useState<number | null>(null);
  const [captureMode, setCaptureMode] = useState<"environment" | "user">("environment");
  const [cameraOpen, setCameraOpen] = useState(false);

  useEffect(() => {
    if (!session) router.replace("/login");
  }, [session, router]);

  useEffect(() => {
    if (!user) return;
    fetch(`${API_BASE}/files/${user.id}`)
      .then((r) => r.json())
      .then((d) => setHistory(d.files ?? []))
      .catch(() => setHistory([]));
  }, [user]);

  useEffect(() => {
    if (downloadLink) setExcelFile(null);
  }, [downloadLink]);

  const handleUpload = async () => {
    if (!mediaBlob || !user) return;
    setLoading(true);
    const formData = new FormData();
    formData.append("audio", mediaBlob, "recording.wav");
    photos.forEach((p, i) => formData.append("images", p.blob, `photo_${i}.jpg`));
    formData.append("timestamps", JSON.stringify(photos.map((p) => p.time)));
    formData.append("userId", user.id);

    try {
      const res = await fetch(`${API_BASE}/upload`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setDownloadLink(data.download ?? null);
      if (data.download) setHistory((h) => [data.download, ...h]);
    } catch (err) {
      alert(`⚠️ ${(err as Error).message}`);
    }
    setLoading(false);
  };

  const handleAnnotateUpload = async () => {
    if (!mediaBlob || !user || !excelFile) return;
    setLoading(true);
    const formData = new FormData();
    formData.append("audio", mediaBlob, "recording.wav");
    formData.append("excel", excelFile);
    photos.forEach((p, i) => formData.append("images", p.blob, `photo_${i}.jpg`));
    formData.append("timestamps", JSON.stringify(photos.map((p) => p.time)));
    formData.append("userId", user.id);

    try {
      const res = await fetch(`${API_BASE}/annotate`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setDownloadLink(data.download ?? null);
      if (data.download) setHistory((h) => [data.download, ...h]);
    } catch (err) {
      alert(`⚠️ ${(err as Error).message}`);
    }
    setLoading(false);
  };

  const handleFileUpload = () => fileInputRef.current?.click();
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setExcelFile(e.target.files?.[0] || null);
  };

  const openCamera = () => setCameraOpen(true);

  const onPhotoCaptured = (blob: Blob) => {
    if (recordStart != null) {
      const t = (Date.now() - recordStart) / 1000;
      setPhotos((p) => [...p, { blob, time: t }]);
    }
  };

  if (!session) return null;

  return (
    <main className="p-6 max-w-xl mx-auto mt-10 text-center font-sans">
      <h1 className="text-2xl font-bold mb-4">Welcome, {user?.email}</h1>

      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx"
        onChange={handleFileChange}
        style={{ display: "none" }}
      />

      {!downloadLink && (
        <div className="mb-4">
          <button onClick={handleFileUpload} className="bg-blue-600 text-white px-6 py-3 rounded mb-4">
            📤 Upload File
          </button>
          {excelFile && <p className="mt-2 text-sm text-gray-600">{excelFile.name}</p>}
        </div>
      )}

      {!downloadLink ? (
        !isRecording ? (
          <button
            onClick={() => {
              clear();
              setDownloadLink(null);
              setPhotos([]);
              setRecordStart(Date.now());
              startRecording();
            }}
            className="bg-blue-600 text-white px-6 py-3 rounded"
          >
            🎙️ Start Recording
          </button>
        ) : (
          <>
            <button
              onClick={openCamera}
              className="bg-yellow-600 text-white px-6 py-3 rounded mr-2"
            >
              📷 Take Photo
            </button>
            <button
              onClick={stopRecording}
              className="bg-red-600 text-white px-6 py-3 rounded"
            >
              ⏹️ Stop Recording
            </button>
          </>
        )
      ) : (
        <div className="flex flex-col items-center space-y-3">
          <div className="flex items-center space-x-4">
            <button onClick={handleFileUpload} className="bg-blue-600 text-white px-6 py-3 rounded">
              📤 Upload New File
            </button>
            {excelFile && <span className="text-sm text-gray-600">Selected: {excelFile.name}</span>}
            <button
              onClick={() => {
                clear();
                setDownloadLink(null);
                setPhotos([]);
                setRecordStart(Date.now());
                startRecording();
              }}
              className="bg-green-600 text-white px-6 py-3 rounded"
            >
              🎙️ Start New Recording
            </button>
          </div>
        </div>
      )}

      {mediaBlob && !loading && !downloadLink && (
        <div className="mt-4 space-y-3">
          <button onClick={handleUpload} className="bg-black text-white px-6 py-3 rounded w-full">
            ⬆️ Upload & Generate Excel
          </button>
          <button
            onClick={handleAnnotateUpload}
            disabled={!excelFile}
            className="bg-green-600 text-white px-6 py-3 rounded w-full"
          >
            📋 Upload & Annotate Excel
          </button>
        </div>
      )}

      {loading && <p className="mt-4">⏳ Processing...</p>}

      {downloadLink && (
        <div className="mt-6">
          <p className="text-green-600 font-semibold">✅ Inspection complete!</p>
          <a href={`${API_BASE}/uploads/${downloadLink}`} download className="text-blue-600 underline">
            Download Excel Report
          </a>
        </div>
      )}

      {history.length > 0 && (
        <div className="mt-10 text-left">
          <h2 className="font-bold mb-2">Previous Reports</h2>
          <ul className="list-disc list-inside">
            {history.map((f) => (
              <li key={f} className="my-1">
                <a href={`${API_BASE}/uploads/${f}`} download className="text-blue-600 underline">
                  {f}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <CameraModal
        open={cameraOpen}
        facingMode={captureMode}
        onCapture={onPhotoCaptured}
        onClose={() => setCameraOpen(false)}
        onFlip={() => setCaptureMode((m) => (m === "environment" ? "user" : "environment"))}
      />
    </main>
  );
}
