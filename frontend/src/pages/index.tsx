import { useSession } from "@supabase/auth-helpers-react";
import { useRouter } from "next/router";
import { useEffect } from "react";

export default function Home() {
  const session = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session) router.replace("/dashboard");
    else router.replace("/login");
  }, [session, router]);

  return null;
}
