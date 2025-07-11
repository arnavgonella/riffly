// pages/index.tsx
import React, { useState, useEffect } from "react";
import { useSession } from "@supabase/auth-helpers-react";
import { useRouter } from "next/router";

export default function Home() {
  const session = useSession();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!session) router.push("/login");
  }, [session, router]);

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) {
      alert("Error sending magic link: " + error.message);
    } else {
      setSent(true);
    }
  };

  return (
    <main className="p-6 max-w-md mx-auto mt-20 text-center">
      <h1 className="text-2xl font-bold mb-4">Login to Riffly</h1>
      {sent ? (
        <p className="text-green-600">✅ Magic link sent to <b>{email}</b></p>
      ) : (
        <>
          <input
            className="border p-2 w-full mb-3 rounded"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button
            className="bg-black text-white px-4 py-2 rounded w-full"
            onClick={handleLogin}
          >
            Send Login Link
          </button>
        </>
      )}
    </main>
  );
}

import { supabase } from "@lib/supabaseClient"; // ensure this import is at the bottom
