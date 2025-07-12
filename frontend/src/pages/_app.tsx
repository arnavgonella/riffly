import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { useState } from "react";
import {
  SessionContextProvider,
  type Session
} from "@supabase/auth-helpers-react";
import { supabase } from "@lib/supabaseClient";

export default function App({
  Component,
  pageProps,
}: AppProps<{ initialSession: Session }>) {
  const [supabaseClient] = useState(() => supabase);

  return (
    <SessionContextProvider
      supabaseClient={supabaseClient}
      initialSession={pageProps.initialSession}
    >
      <Component {...pageProps} />
    </SessionContextProvider>
  );
}
