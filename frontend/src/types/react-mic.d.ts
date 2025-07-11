declare module "react-mic" {
  import React from "react";

  export interface ReactMicProps {
    record: boolean;
    className?: string;
    onStop: (recordedBlob: { blob: Blob }) => void;
    mimeType?: string;
    strokeColor?: string;
    backgroundColor?: string;
  }

  export const ReactMic: React.FC<ReactMicProps>;
}
