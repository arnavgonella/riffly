import { useSession, useUser } from "@supabase/auth-helpers-react";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import useAudioRecorder from "@/lib/useAudioRecorder";

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

  useEffect(() => {
    if (!session) router.replace("/login");
  }, [session, router]);

  const handleUpload = async () => {
    if (!mediaBlob || !user) return;
    setLoading(true);
    const formData = new FormData();
    formData.append("audio", mediaBlob, "recording.wav");
    formData.append("userId", user.id);

    try {
      const res = await fetch("https://riffly-backend.onrender.com/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      setDownloadLink(data.download ?? null);
      if (data.download) setHistory((h) => [data.download, ...h]);
    } catch {
      alert("⚠️ Upload failed");
    }
    setLoading(false);
  };

  const handleAnnotateUpload = async () => {
    if (!mediaBlob || !user || !excelFile) return;
    setLoading(true);
    const formData = new FormData();
    formData.append("audio", mediaBlob, "recording.wav");
    formData.append("excel", excelFile);
    formData.append("userId", user.id);

    try {
      const res = await fetch("https://riffly-backend.onrender.com/annotate", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      setDownloadLink(data.download ?? null);
      if (data.download) setHistory((h) => [data.download, ...h]);
    } catch {
      alert("⚠️ Upload failed");
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!user) return;
    fetch(`https://riffly-backend.onrender.com/files/${user.id}`)
      .then((r) => r.json())
      .then((d) => setHistory(d.files ?? []))
      .catch(() => setHistory([]));
  }, [user]);

  if (!session) return null;

  return (
    <main className="p-6 max-w-xl mx-auto mt-10 text-center font-sans">
      <h1 className="text-2xl font-bold mb-4">Welcome, {user?.email}</h1>

      {!isRecording ? (
        <button
          onClick={() => {
            clear();
            setDownloadLink(null);
            startRecording();
          }}
          className="bg-blue-600 text-white px-6 py-3 rounded"
        >
          🎙️ Start Recording
        </button>
      ) : (
        <button
          onClick={stopRecording}
          className="bg-red-600 text-white px-6 py-3 rounded"
        >
          ⏹️ Stop Recording
        </button>
      )}

      {!downloadLink && (
        <div className="mt-4">
          <label className="block text-left mb-1 font-medium">
            Excel file to annotate (optional):
          </label>
          <input
            type="file"
            accept=".xlsx"
            onChange={(e) => setExcelFile(e.target.files?.[0] || null)}
            className="block w-full border p-2"
          />
        </div>
      )}

      {mediaBlob && !loading && !downloadLink && (
        <div className="mt-4 space-y-3">
          <button
            onClick={handleUpload}
            className="bg-black text-white px-6 py-3 rounded w-full"
          >
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
          <a
            href={`https://riffly-backend.onrender.com/uploads/${downloadLink}`}
            download
            className="text-blue-600 underline"
          >
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
                <a
                  href={`https://riffly-backend.onrender.com/uploads/${f}`}
                  download
                  className="text-blue-600 underline"
                >
                  {f}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </main>
  );
}
