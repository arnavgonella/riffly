declare module 'react-mic' {
    import * as React from 'react';
  
    export interface ReactMicProps {
      record: boolean;
      className?: string;
      onStop: (recordedBlob: any) => void;
      strokeColor?: string;
      backgroundColor?: string;
      mimeType?: string;
    }
  
    export const ReactMic: React.FC<ReactMicProps>;
  }
  