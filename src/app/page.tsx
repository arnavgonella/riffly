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
      <video autoPlay muted loop playsInline style={styles.video}>
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

      <div style={styles.messageContainer}>
        <div style={styles.title}>Riffly</div>
        <div style={styles.subtitle}>Coming soon to the App Store!</div>
      </div>
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
    opacity: 0.3,
  },
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#5a43c7',
    opacity: 0,
    zIndex: 1,
  },
  messageContainer: {
    marginTop: 20,
    zIndex: 2,
    textAlign: 'center',
  },
  title: {
    fontSize: '2.5rem',
    fontWeight: 700,
  },
  subtitle: {
    fontSize: '1.2rem',
    fontWeight: 400,
    marginTop: '6px',
    color: '#ddd',
  },
};
