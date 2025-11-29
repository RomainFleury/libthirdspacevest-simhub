/// <reference types="vite/client" />

// Declare module types for audio file imports
declare module '*.wav' {
  const src: string;
  export default src;
}

declare module '*.mp3' {
  const src: string;
  export default src;
}

declare module '*.ogg' {
  const src: string;
  export default src;
}

declare module '*.webm' {
  const src: string;
  export default src;
}

