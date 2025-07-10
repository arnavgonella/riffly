// riffly/frontend/src/pages/_app.tsx

import type { AppProps } from 'next/app';
import Head from 'next/head';
import '../styles/globals.css'; // adjust or remove if not using global styles

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>Riffly</title>
        <link rel="icon" href="/favicon.ico" />
        {/* You can also use PNG: <link rel="icon" type="image/png" href="/favicon.png" /> */}
      </Head>
      <Component {...pageProps} />
    </>
  );
}

export default MyApp;
