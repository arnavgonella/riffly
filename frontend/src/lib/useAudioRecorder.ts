import { useState, useRef, useCallback } from "react";

export interface UseAudioRecorder {
  startRecording(): Promise<void>;
  stopRecording(): void;
  clear(): void;
  mediaBlob: Blob | null;
  isRecording: boolean;
}

export default function useAudioRecorder(): UseAudioRecorder {
  const [mediaBlob, setMediaBlob] = useState<Blob | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    setMediaBlob(null);
    chunksRef.current = [];

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mr = new MediaRecorder(stream);
    recorderRef.current = mr;

    mr.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    mr.onstop = () => {
      const blobType = chunksRef.current[0]?.type || "audio/webm";
      const blob = new Blob(chunksRef.current, { type: blobType });
      setMediaBlob(blob);
    };

    mr.start();
    setIsRecording(true);
  }, []);

  const stopRecording = useCallback(() => {
    recorderRef.current?.stop();
    setIsRecording(false);
  }, []);

  const clear = useCallback(() => {
    setMediaBlob(null);
  }, []);

  return { startRecording, stopRecording, clear, mediaBlob, isRecording };
}
