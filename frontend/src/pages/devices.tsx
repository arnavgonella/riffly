import React, { useEffect, useState, useRef } from 'react';

export default function DevicesPage() {
  const [inputDevices, setInputDevices] = useState<MediaDeviceInfo[]>([]);
  const [outputDevices, setOutputDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedInput, setSelectedInput] = useState<string | null>(null);
  const [selectedOutput, setSelectedOutput] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    async function getDevices() {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        const devices = await navigator.mediaDevices.enumerateDevices();
        setInputDevices(devices.filter(d => d.kind === 'audioinput'));
        setOutputDevices(devices.filter(d => d.kind === 'audiooutput'));
        if (devices.length > 0) {
          const defaultInput = devices.find(d => d.kind === 'audioinput');
          const defaultOutput = devices.find(d => d.kind === 'audiooutput');
          if (defaultInput) setSelectedInput(defaultInput.deviceId);
          if (defaultOutput) setSelectedOutput(defaultOutput.deviceId);
        }
      } catch (err) {
        console.error('Error accessing media devices:', err);
      }
    }
    getDevices();
  }, []);

  useEffect(() => {
    async function getStream() {
      if (!selectedInput) return;
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      try {
        const newStream = await navigator.mediaDevices.getUserMedia({
          audio: { deviceId: selectedInput }
        });
        setStream(newStream);
        // Pass this stream to your recording logic
      } catch (err) {
        console.error('Error getting user media:', err);
      }
    }
    getStream();
  }, [selectedInput]);

  useEffect(() => {
    if (audioRef.current && selectedOutput) {
      if (typeof audioRef.current.setSinkId === 'function') {
        audioRef.current.setSinkId(selectedOutput).catch(err => {
          console.error('Error setting output device:', err);
        });
      } else {
        console.warn('setSinkId not supported in this browser.');
      }
    }
  }, [selectedOutput]);

  return (
    <div style={{ padding: 20 }}>
      <h2>🎙️ Select Audio Devices</h2>

      <label>
        Microphone:
        <select
          value={selectedInput ?? ''}
          onChange={e => setSelectedInput(e.target.value)}
        >
          {inputDevices.map(device => (
            <option key={device.deviceId} value={device.deviceId}>
              {device.label || 'Unnamed Mic'}
            </option>
          ))}
        </select>
      </label>

      <br /><br />

      <label>
        Speakers / Headphones:
        <select
          value={selectedOutput ?? ''}
          onChange={e => setSelectedOutput(e.target.value)}
        >
          {outputDevices.map(device => (
            <option key={device.deviceId} value={device.deviceId}>
              {device.label || 'Unnamed Output'}
            </option>
          ))}
        </select>
      </label>

      <br /><br />

      <audio
        ref={audioRef}
        controls
        src="/sample-audio.mp3" // Replace with a riff if you want
      />
    </div>
  );
}

