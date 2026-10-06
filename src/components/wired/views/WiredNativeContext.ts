import { createContext, useContext } from 'react';

/** True while the open Wired frame is drawn with the native Illumina section kit. */
export const WiredNativeContext = createContext(false);

export const useWiredNative = () => useContext(WiredNativeContext);
