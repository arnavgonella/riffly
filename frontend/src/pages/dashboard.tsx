// pages/dashboard.tsx
import { useSession, useUser } from "@supabase/auth-helpers-react";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { supabase } from "@lib/supabaseClient";

const ReactMic = dynamic(() => import("react-mic").then((mod) => mod.ReactMic), {
  ssr: false,
});

interface RecordedBlob {
  blob: Blob;
}

export default function Dashboard() {
  const session = useSession();
  const user = useUser();
  const router = useRouter();

  const [recording, setRecording] = useState(false);
  const [downloadLink, setDownloadLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!session) {
      router.push("/login");
    }
  }, [session]);

  const startRecording = () => {
    setRecording(true);
    setDownloadLink(null);
  };

  const stopRecording = () => {
    setRecording(false);
  };

  const onStop = async (recordedBlob: RecordedBlob) => {
    console.log("🔊 Stopped. Sending blob to backend...");
    setLoading(true);

    const formData = new FormData();
    formData.append("audio", recordedBlob.blob, "recording.wav");

    try {
      const res = await fetch("https://riffly-backend.onrender.com/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (data.download) {
        setDownloadLink(data.download);
      } else {
        alert("⚠️ Upload failed or backend error.");
        console.error('Backend responded without "download":', data);
      }
    } catch (err) {
      alert("❌ Upload failed. Check backend or file format.");
      console.error("❌ Upload error:", err);
    }

    setLoading(false);
  };

  if (!session) return null;

  return (
    <main className="p-6 max-w-xl mx-auto mt-10 font-sans">
      <h1 className="text-2xl font-bold mb-4">👋 Welcome, {user?.email}</h1>
      <p className="mb-6 text-gray-600">Start a new inspection voice log:</p>

      <ReactMic
        record={recording}
        className="sound-wave"
        onStop={onStop}
        mimeType="audio/wav"
        strokeColor="#000000"
        backgroundColor="#f3f4f6"
      />

      <div className="mt-4">
        {!recording ? (
          <button
            onClick={startRecording}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            🎙️ Start Recording
          </button>
        ) : (
          <button
            onClick={stopRecording}
            className="bg-red-600 text-white px-4 py-2 rounded"
          >
            ⏹️ Stop Recording
          </button>
        )}
      </div>

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
