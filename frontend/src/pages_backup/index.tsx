import React, { useState, useEffect } from "react";
import axios from "axios";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [username, setUsername] = useState("");
  const [caption, setCaption] = useState("");
  const [riffs, setRiffs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchRiffs();
  }, []);

  async function fetchRiffs() {
    try {
      const res = await axios.get("http://localhost:3001/riffs");
      setRiffs(res.data);
    } catch (error) {
      console.error("Error fetching riffs", error);
    }
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return alert("Please select a file");

    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("username", username);
    formData.append("caption", caption);

    try {
      await axios.post("http://localhost:3001/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setFile(null);
      setUsername("");
      setCaption("");
      fetchRiffs();
    } catch (error) {
      alert("Upload failed");
      console.error(error);
    }
    setLoading(false);
  }

  return (
    <main className="p-4 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Upload a Riff</h1>
      <form onSubmit={handleUpload} className="space-y-4">
        <input
          type="file"
          accept="audio/*"
          onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
          disabled={loading}
          required
        />
        <input
          type="text"
          placeholder="Your username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          disabled={loading}
          className="w-full border px-2 py-1 rounded"
          required
        />
        <input
          type="text"
          placeholder="Caption"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          disabled={loading}
          className="w-full border px-2 py-1 rounded"
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          {loading ? "Uploading..." : "Upload"}
        </button>
      </form>

      <h2 className="mt-8 text-xl font-semibold">Riffs</h2>
      <ul className="space-y-4 mt-4">
        {riffs.length === 0 && <li>No riffs uploaded yet.</li>}
        {riffs.map(({ id, username, caption, url }) => (
          <li key={id} className="border p-3 rounded">
            <p className="font-bold">{username}</p>
            <audio controls src={url} className="w-full mt-2" />
            <p className="italic mt-1">{caption}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}

