import { useState } from 'react';
import dynamic from 'next/dynamic';

// Load react-mic dynamically (only runs in browser)
const ReactMic = dynamic(() => import('react-mic').then(mod => mod.ReactMic), {
  ssr: false,
});

export default function Home() {
  const [recording, setRecording] = useState(false);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [downloadLink, setDownloadLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const startRecording = () => {
    setRecording(true);
    setDownloadLink(null);
  };

  const stopRecording = () => {
    setRecording(false);
  };

  const onStop = async (recordedBlob: any) => {
    console.log('🔊 Stopped. Sending blob to backend...');
    setBlob(recordedBlob.blob);
    setLoading(true);

    const formData = new FormData();
    formData.append('audio', recordedBlob.blob, 'recording.wav');

    try {
      const res = await fetch('https://riffly-backend.onrender.com/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (data.download) {
        setDownloadLink(data.download);
      } else {
        alert('⚠️ Upload failed or backend error.');
      }
    } catch (err) {
      alert('❌ Upload failed. Check backend or file format.');
    }

    setLoading(false);
  };

  return (
    <main style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: '600px', margin: 'auto' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>🎙️ Riffly QA – Voice Recorder</h1>

      {ReactMic && (
        <ReactMic
          record={recording}
          className="sound-wave"
          onStop={onStop}
          mimeType="audio/wav"
          strokeColor="#000000"
          backgroundColor="#f3f4f6"
        />
      )}

      <div style={{ marginTop: '1rem' }}>
        {!recording ? (
          <button
            onClick={startRecording}
            style={{
              background: '#2563eb',
              color: 'white',
              padding: '0.5rem 1rem',
              borderRadius: '4px',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            🎙️ Start Recording
          </button>
        ) : (
          <button
            onClick={stopRecording}
            style={{
              background: 'red',
              color: 'white',
              padding: '0.5rem 1rem',
              borderRadius: '4px',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            ⏹️ Stop Recording
          </button>
        )}
      </div>

      {loading && <p style={{ marginTop: '1rem' }}>⏳ Processing...</p>}

      {downloadLink && (
        <div style={{ marginTop: '1.5rem' }}>
          <p style={{ color: 'green', fontWeight: 500 }}>✅ Inspection complete!</p>
          <a
            href={`http://localhost:3001/uploads/${downloadLink}`}
            download
            style={{ color: '#2563eb', textDecoration: 'underline' }}
          >
            Download Excel Report
          </a>
        </div>
      )}
    </main>
  );
}
