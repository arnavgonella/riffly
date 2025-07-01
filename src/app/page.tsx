'use client';

import Image from 'next/image';
import { useEffect } from 'react';

export default function Home() {
  useEffect(() => {
    document.body.style.backgroundColor = '#5a43c7';
    return () => {
      document.body.style.backgroundColor = '';
    };
  }, []);

  return (
    <div style={styles.container}>
      <video
        autoPlay
        muted
        loop
        playsInline
        style={styles.video}
      >
        <source src="/waveform.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      <div style={styles.overlay}></div>

      <Image
        src="/riffly-logo.png"
        alt="Riffly Logo"
        width={160}
        height={160}
        style={{ zIndex: 2 }}
      />
      <div style={styles.message}>Coming soon on the App Store 🎵</div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    height: '100vh',
    width: '100%',
    overflow: 'hidden',
    backgroundColor: '#5a43c7',
    color: 'white',
    fontFamily: 'Segoe UI, sans-serif',
    fontSize: '1.8rem',
    fontWeight: 600,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    textAlign: 'center',
  },
  video: {
    position: 'fixed',
    top: 0,
    left: 0,
    minWidth: '100%',
    minHeight: '100%',
    objectFit: 'cover',
    zIndex: 0,
    opacity: 0.1,
  },
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#5a43c7',
    opacity: 0.05,
    zIndex: 1,
  },
  message: {
    marginTop: 20,
    zIndex: 2,
  },
};
