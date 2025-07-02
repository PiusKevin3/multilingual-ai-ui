/**
 * Converts AudioBuffer input to a 16-bit PCM encoded Blob
 * suitable for Gemini API real-time audio streaming.
 * @param inputBuffer AudioBuffer from Web Audio API
 * @returns Blob with 16-bit PCM encoded audio
 */
export function convertAudioTo16BitPCM(inputBuffer: AudioBuffer): Blob {
  const raw = inputBuffer.getChannelData(0); // Mono channel
  const pcm = new Int16Array(raw.length);

  for (let i = 0; i < raw.length; i++) {
    const sample = Math.max(-1, Math.min(1, raw[i])); // Clamp
    pcm[i] = sample * 32767; // Convert to 16-bit signed integer
  }

  return new Blob([pcm.buffer], { type: 'audio/pcm' });
}
