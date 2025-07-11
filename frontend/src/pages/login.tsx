import React, { useState, useEffect } from "react";
import { useSession } from "@supabase/auth-helpers-react";
import { useRouter } from "next/router";
import { supabase } from "@lib/supabaseClient";

export default function LoginPage() {
  const session = useSession();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (session) {
      router.push("/");
    }
  }, [session, router]);

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: "https://rifflyhq.com", 
      },
    });

    if (error) {
      alert("Error sending magic link: " + error.message);
    } else {
      setSent(true);
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto mt-20 text-center">
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
    </div>
  );
}
