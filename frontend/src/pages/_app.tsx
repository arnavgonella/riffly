import type { AppProps } from "next/app";
import Head from "next/head";
import "../styles/globals.css";

import { SessionContextProvider } from "@supabase/auth-helpers-react";
import { supabase } from "@lib/supabaseClient";

export default function MyApp({ Component, pageProps }: AppProps) {
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
