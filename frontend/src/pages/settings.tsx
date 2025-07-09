import { useEffect } from "react";
import { useAudioDevices } from "@/context/AudioDeviceContext";

export default function Settings() {
  const {
    inputDevices,
    outputDevices,
    selectedInput,
    selectedOutput,
    setSelectedInput,
    setSelectedOutput,
    refreshDevices,
  } = useAudioDevices();

  useEffect(() => {
    refreshDevices();
  }, [refreshDevices]);

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-3xl mb-4">Audio Device Settings</h1>
      
      <div className="mb-6">
        <label htmlFor="input-select" className="block font-semibold mb-1">Select Input Device (Microphone):</label>
        <select
          id="input-select"
          value={selectedInput ?? ""}
          onChange={(e) => setSelectedInput(e.target.value || null)}
          className="w-full border p-2"
        >
          <option value="">Default</option>
          {inputDevices.map((device) => (
            <option key={device.deviceId} value={device.deviceId}>
              {device.label || device.deviceId}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-6">
        <label htmlFor="output-select" className="block font-semibold mb-1">Select Output Device (Playback):</label>
        <select
          id="output-select"
          value={selectedOutput ?? ""}
          onChange={(e) => setSelectedOutput(e.target.value || null)}
          className="w-full border p-2"
        >
          <option value="">Default</option>
          {outputDevices.map((device) => (
            <option key={device.deviceId} value={device.deviceId}>
              {device.label || device.deviceId}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

