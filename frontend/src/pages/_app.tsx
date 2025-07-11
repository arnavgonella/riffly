// frontend/src/pages/_app.tsx
import type { AppProps } from "next/app";
import Head from "next/head";
import { useEffect } from "react";
import { useRouter } from "next/router";
import "../styles/globals.css";

import { SessionContextProvider } from "@supabase/auth-helpers-react";
import { supabase } from "@lib/supabaseClient";

export default function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();

  useEffect(() => {
    const handleAuthRedirect = async () => {
      const hash = window.location.hash;

      // Only run if this is a magic link callback
      if (hash && (hash.includes("access_token") || hash.includes("error_description"))) {
        const { error } = await supabase.auth.getSession();

        if (error) {
          console.error("Error handling magic link:", error.message);
        }

        // Clean up the URL (remove the # fragment)
        router.replace(window.location.pathname);
      }
    };

    handleAuthRedirect();
  }, [router]);

  return (
    <>
      <Head>
        <title>Riffly</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <SessionContextProvider supabaseClient={supabase}>
        <Component {...pageProps} />
      </SessionContextProvider>
    </>
  );
}
