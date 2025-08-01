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
  const [inspectionActive, setInspectionActive] = useState(false);

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
      if (data.download) {
        setHistory((h) => [data.download, ...h]);
        setInspectionActive(false);
      }
    } catch (err) {
      alert(`Error: ${(err as Error).message}`);
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
      if (data.download) {
        setHistory((h) => [data.download, ...h]);
        setInspectionActive(false);
      }
    } catch (err) {
      alert(`Error: ${(err as Error).message}`);
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">Qualica</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Welcome, {user?.email?.split('@')[0]}</span>
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-blue-600">
                  {user?.email?.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx"
          onChange={handleFileChange}
          style={{ display: "none" }}
        />

        {/* Status Card */}
        <div className="card mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Quality Inspection Workspace</h2>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">Status:</span>
              <span className={`status-indicator ${
                isRecording ? 'status-recording' : 
                loading ? 'status-processing' : 
                inspectionActive ? 'status-ready' :
                'status-idle'
              }`}>
                {isRecording ? 'Recording in Progress' : 
                 loading ? 'Processing Data' : 
                 inspectionActive ? 'Inspection Active - Ready to Record' :
                 'Ready to Start New Inspection'}
              </span>
            </div>
          </div>

          {/* Current Inspection Session */}
          {!downloadLink && inspectionActive ? (
            <div className="space-y-6">
              {/* File Upload Section */}
              <div className="border border-dashed border-gray-300 rounded-lg p-6 text-center">
                <div className="space-y-4">
                  <div className="flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {excelFile ? 'Template File Selected' : 'Upload Inspection Template (Optional)'}
                    </h3>
                    {excelFile ? (
                      <div className="space-y-2">
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Selected:</span> {excelFile.name}
                        </p>
                        <button onClick={handleFileUpload} className="btn-secondary">
                          Change Template
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-sm text-gray-600">
                          Upload an existing inspection template to annotate with your findings
                        </p>
                        <button onClick={handleFileUpload} className="btn-secondary">
                          Select Template File
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Recording Controls */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Audio Inspection</h3>
                  {!isRecording ? (
                    <button
                      onClick={() => {
                        clear();
                        setDownloadLink(null);
                        setPhotos([]);
                        setRecordStart(Date.now());
                        startRecording();
                      }}
                      className="btn-primary w-full flex items-center justify-center space-x-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                      <span>Start Voice Recording</span>
                    </button>
                  ) : (
                    <button
                      onClick={stopRecording}
                      className="btn-danger w-full flex items-center justify-center space-x-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10h6v4H9z" />
                      </svg>
                      <span>Stop Recording</span>
                    </button>
                  )}
                  <p className="text-sm text-gray-500">
                    Record your observations, measurements, and findings during the inspection process.
                  </p>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Visual Documentation</h3>
                  <button
                    onClick={openCamera}
                    disabled={!isRecording}
                    className={`w-full flex items-center justify-center space-x-2 ${
                      isRecording ? 'btn-warning' : 'btn-secondary opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>Capture Photo</span>
                  </button>
                  {photos.length > 0 && (
                    <p className="text-sm text-green-600 font-medium">
                      {photos.length} photo{photos.length > 1 ? 's' : ''} captured
                    </p>
                  )}
                  <p className="text-sm text-gray-500">
                    {isRecording ? 'Take photos of defects, measurements, or components during recording.' : 'Start recording to enable photo capture.'}
                  </p>
                </div>
              </div>
            </div>
          ) : !downloadLink ? (
            <div className="text-center space-y-6">
              <div className="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Ready to Start</h3>
                <p className="text-gray-600 mb-6">Begin a new quality inspection process.</p>
                <div className="space-y-4">
                  <div className="flex justify-center space-x-4">
                    <button onClick={handleFileUpload} className="btn-secondary">
                      Upload Template
                    </button>
                    <button
                      onClick={() => {
                        clear();
                        setDownloadLink(null);
                        setPhotos([]);
                        setRecordStart(Date.now());
                        setInspectionActive(true);
                      }}
                      className="btn-success"
                    >
                      Start New Inspection
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center space-y-6">
              <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Inspection Complete</h3>
                <p className="text-gray-600 mb-6">Your quality inspection has been processed successfully.</p>
                <div className="space-y-4">
                  <a 
                    href={`${API_BASE}/uploads/${downloadLink}`} 
                    download 
                    className="btn-primary inline-flex items-center space-x-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>Download Report</span>
                  </a>
                  <div className="flex justify-center space-x-4">
                    <button onClick={handleFileUpload} className="btn-secondary">
                      Upload New Template
                    </button>
                    <button
                      onClick={() => {
                        clear();
                        setDownloadLink(null);
                        setPhotos([]);
                        setRecordStart(Date.now());
                        setInspectionActive(true);
                      }}
                      className="btn-success"
                    >
                      Start New Inspection
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Processing Actions */}
        {mediaBlob && !loading && !downloadLink && (
          <div className="card mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Generate Inspection Report</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button onClick={handleUpload} className="btn-primary flex items-center justify-center space-x-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Generate New Report</span>
              </button>
              <button
                onClick={handleAnnotateUpload}
                disabled={!excelFile}
                className={`flex items-center justify-center space-x-2 ${
                  excelFile ? 'btn-success' : 'btn-secondary opacity-50 cursor-not-allowed'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span>Annotate Template</span>
              </button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="card text-center">
            <div className="flex items-center justify-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="text-gray-700 font-medium">Processing inspection data...</span>
            </div>
          </div>
        )}

        {/* Previous Reports */}
        {history.length > 0 && (
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Previous Inspection Reports</h3>
            <div className="space-y-3">
              {history.map((f) => (
                <div key={f} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="text-sm font-medium text-gray-900">{f}</span>
                  </div>
                  <a 
                    href={`${API_BASE}/uploads/${f}`} 
                    download 
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    Download
                  </a>
                </div>
              ))}
            </div>
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
    </div>
  );
}
