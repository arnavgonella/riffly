import { useState, useEffect } from "react";
import { useSession } from "@supabase/auth-helpers-react";
import { useRouter } from "next/router";
import { supabase } from "@lib/supabaseClient";

export default function LoginPage() {
  const session = useSession();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (session) router.replace("/dashboard");
  }, [session, router]);

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) alert("❌ " + error.message);
    else setSent(true);
  };

  return (
    <main className="p-6 max-w-md mx-auto mt-20 text-center font-sans">
      <h1 className="text-2xl font-bold mb-4">Login to Riffly</h1>
      {sent ? (
        <p className="text-green-600">
          ✅ Login link sent to <b>{email}</b>
        </p>
      ) : (
        <>
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border p-2 mb-3 rounded"
          />
          <button
            onClick={handleLogin}
            className="bg-black text-white px-4 py-2 rounded w-full"
          >
            Send Magic Link
          </button>
        </>
      )}
    </main>
  );
}
