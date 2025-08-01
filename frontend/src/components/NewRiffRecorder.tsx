import { useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useUser } from "@supabase/auth-helpers-react";

type Props = {
  onUpload: () => void;
};

export default function NewRiffRecorder({ onUpload }: Props) {
  const user = useUser();
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    setAudioUrl(null);
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream);
    mediaRecorderRef.current = mediaRecorder;
    chunksRef.current = [];

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
      stream.getTracks().forEach((t) => t.stop());
    };

    mediaRecorder.start();
    setRecording(true);
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  const handleUpload = async () => {
    if (!audioUrl || !user) return;

    const response = await fetch(audioUrl);
    const blob = await response.blob();
    const file = new File([blob], "newriff.webm", { type: "audio/webm" });

    setUploading(true);
    try {
      const { data, error } = await supabase.storage
        .from("files")
        .upload(`${user.email}/newriff.webm`, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error) {
        throw error;
      }

      onUpload();
      setAudioUrl(null);
      setCaption("");
    } catch (err) {
      console.error("Failed to upload new riff:", err);
    }
    setUploading(false);
  };

  return (
    <div className="p-4 border rounded mb-6 bg-gray-100">
      <h2 className="text-xl font-semibold mb-2">Record a New Riff</h2>

      {!recording && !audioUrl && (
        <button
          onClick={startRecording}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
        >
          🎙️ Start Recording
        </button>
      )}

      {recording && (
        <button
          onClick={stopRecording}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
        >
          ⏹ Stop Recording
        </button>
      )}

      {audioUrl && (
        <div className="mt-4 space-y-3">
          <audio src={audioUrl} controls className="w-full" />
          <input
            className="w-full p-2 border"
            placeholder="Caption"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
          />
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
          >
            {uploading ? "Uploading..." : "Upload Riff"}
          </button>
        </div>
      )}
    </div>
  );
}

