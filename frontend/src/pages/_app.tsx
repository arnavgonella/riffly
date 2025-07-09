import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import { AudioDeviceProvider } from '@/context/AudioDeviceContext';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <AudioDeviceProvider>
      <Component {...pageProps} />
    </AudioDeviceProvider>
  );
}

