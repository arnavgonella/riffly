'use client';

import { useEffect, useState } from "react";

export default function Home() {
  const [message, setMessage] = useState("Loading...");

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/`)
      .then((res) => res.text())
      .then((data) => setMessage(data))
      .catch((err) => setMessage("Failed to fetch: " + err.message));
  }, []);

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-4">
      <h1 className="text-3xl font-bold mb-4">Riffly Frontend</h1>
      <p>Message from backend:</p>
      <pre className="mt-2 p-4 bg-gray-100 rounded">{message}</pre>
    </main>
  );
}

