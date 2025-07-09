import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

type AudioDeviceContextType = {
  inputDevices: MediaDeviceInfo[];
  outputDevices: MediaDeviceInfo[];
  selectedInput: string | null;
  selectedOutput: string | null;
  setSelectedInput: (deviceId: string | null) => void;
  setSelectedOutput: (deviceId: string | null) => void;
  refreshDevices: () => Promise<void>;
};

const AudioDeviceContext = createContext<AudioDeviceContextType | undefined>(
  undefined
);

export const AudioDeviceProvider = ({ children }: { children: ReactNode }) => {
  const [inputDevices, setInputDevices] = useState<MediaDeviceInfo[]>([]);
  const [outputDevices, setOutputDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedInput, setSelectedInputState] = useState<string | null>(null);
  const [selectedOutput, setSelectedOutputState] = useState<string | null>(null);

  // Wrap setters to sync with localStorage
  const setSelectedInput = (deviceId: string | null) => {
    setSelectedInputState(deviceId);
    if (deviceId) {
      localStorage.setItem("selectedInput", deviceId);
    } else {
      localStorage.removeItem("selectedInput");
    }
  };

  const setSelectedOutput = (deviceId: string | null) => {
    setSelectedOutputState(deviceId);
    if (deviceId) {
      localStorage.setItem("selectedOutput", deviceId);
    } else {
      localStorage.removeItem("selectedOutput");
    }
  };

  // Refresh devices from navigator.mediaDevices
  const refreshDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const inputs = devices.filter((d) => d.kind === "audioinput");
      const outputs = devices.filter((d) => d.kind === "audiooutput");
      setInputDevices(inputs);
      setOutputDevices(outputs);
    } catch (error) {
      console.error("Error enumerating devices:", error);
    }
  };

  // On mount, load saved device IDs from localStorage and refresh device lists
  useEffect(() => {
    refreshDevices();

    const savedInput = localStorage.getItem("selectedInput");
    if (savedInput) {
      setSelectedInputState(savedInput);
    }
    const savedOutput = localStorage.getItem("selectedOutput");
    if (savedOutput) {
      setSelectedOutputState(savedOutput);
    }

    // Optional: listen for devicechange events to refresh list dynamically
    navigator.mediaDevices.addEventListener("devicechange", refreshDevices);
    return () => {
      navigator.mediaDevices.removeEventListener("devicechange", refreshDevices);
    };
  }, []);

  return (
    <AudioDeviceContext.Provider
      value={{
        inputDevices,
        outputDevices,
        selectedInput,
        selectedOutput,
        setSelectedInput,
        setSelectedOutput,
        refreshDevices,
      }}
    >
      {children}
    </AudioDeviceContext.Provider>
  );
};

export const useAudioDevices = (): AudioDeviceContextType => {
  const context = useContext(AudioDeviceContext);
  if (!context) {
    throw new Error("useAudioDevices must be used within AudioDeviceProvider");
  }
  return context;
};

