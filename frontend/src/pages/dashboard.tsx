import { useSession, useUser } from "@supabase/auth-helpers-react";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import useAudioRecorder from "@lib/useAudioRecorder";

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

  useEffect(() => {
    if (!session) router.replace("/login");
  }, [session, router]);

  const handleUpload = async () => {
    if (!mediaBlob) return;
    setLoading(true);
    const formData = new FormData();
    formData.append("audio", mediaBlob, "recording.wav");

    try {
      const res = await fetch(
        "https://riffly-backend.onrender.com/upload",
        { method: "POST", body: formData }
      );
      const data = await res.json();
      setDownloadLink(data.download ?? null);
    } catch {
      alert("⚠️ Upload failed");
    }
    setLoading(false);
  };

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

      {mediaBlob && !loading && !downloadLink && (
        <button
          onClick={handleUpload}
          className="bg-black text-white px-6 py-3 rounded mt-4"
        >
          ⬆️ Upload & Generate Excel
        </button>
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
    </main>
  );
}
