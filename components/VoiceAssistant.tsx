"use client";
import { useState, useRef, useEffect } from "react";
import { FaMicrophone, FaStopCircle } from "react-icons/fa";

type AudioContextType = AudioContext | null;
type ScriptProcessorType = ScriptProcessorNode | null;
type MediaStreamType = MediaStream | null;
type WebSocketType = WebSocket | null;

export default function VoiceAssistant() {
  const [isListening, setIsListening] = useState(false);
  const [language, setLanguage] = useState("");
  const socketRef = useRef<WebSocketType>(null);
  const audioContextRef = useRef<AudioContextType>(null);
  const processorRef = useRef<ScriptProcessorType>(null);
  const mediaStreamRef = useRef<MediaStreamType>(null);
  const [status, setStatus] = useState("idle");
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "ws://localhost:8000";

  // Initialize AudioContext once on mount
  useEffect(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
  }, []);

  const startRecording = async () => {
    try {
      setStatus("starting");

      // Resume AudioContext if suspended (required in some browsers)
      if (audioContextRef.current?.state === "suspended") {
        await audioContextRef.current.resume();
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const AudioContext = window.AudioContext;
      if (!AudioContext) throw new Error("AudioContext not supported");

      // Use existing AudioContext
      const audioCtx = audioContextRef.current;

      const source = audioCtx!.createMediaStreamSource(stream);
      const processor = audioCtx!.createScriptProcessor(1024, 1, 1);
      processorRef.current = processor;

      source.connect(processor);
      processor.connect(audioCtx!.destination);

      processor.onaudioprocess = (event) => {
        console.log("🔊 Audio processing...");
        const pcmData = convertAudioTo16BitPCM(event.inputBuffer);
        console.log(`📤 Sending ${pcmData.byteLength} bytes`);
        if (socketRef.current?.readyState === WebSocket.OPEN) {
          socketRef.current.send(pcmData);
        }
      };

      setIsListening(true);
      setStatus("listening");
    } catch (error) {
      console.error("❌ Microphone error:", error);
      setStatus("error");
    }
  };

  const stopRecording = () => {
    console.log("🛑 Stopping recording...");
    setIsListening(false);
    setStatus("processing");

    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    if (socketRef.current?.readyState === WebSocket.OPEN) {
      console.log("🚩 Sending end-of-speech signal");
      socketRef.current.send(new ArrayBuffer(0));
    }
  };

  const initWebSocket = () => {
    if (!language ) return;

    const sessionId = Date.now().toString();
    socketRef.current = new WebSocket(`${backendUrl}/ws/${sessionId}/${language}`);

    socketRef.current.onopen = () => {
      console.log("✅ WebSocket connected");
      setStatus("ready");
    };

    socketRef.current.onmessage = (event) => {
      if (event.data instanceof Blob) {
        if (event.data.size === 0) {
          console.warn("⚠️ Received empty audio blob, skipping playback");
          setStatus("ready");
          return;
        }

        console.log("🔊 Received audio blob");
        playAudio(event.data);
      }
    };

    socketRef.current.onerror = (error) => {
      console.error("❌ WebSocket error:", error);
      setStatus("error");
    };

    socketRef.current.onclose = () => {
      console.log("🔌 WebSocket disconnected");
      setStatus("disconnected");
    };
  };

  // Improved playAudio function with persistent AudioContext and async handling
  const playAudio = async (audioBlob: Blob) => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }

      // Resume AudioContext if suspended
      if (audioContextRef.current.state === "suspended") {
        await audioContextRef.current.resume();
      }

      const arrayBuffer = await audioBlob.arrayBuffer();
      const decodedData = await audioContextRef.current.decodeAudioData(arrayBuffer);

      const source = audioContextRef.current.createBufferSource();
      source.buffer = decodedData;
      source.connect(audioContextRef.current.destination);
      source.start();

      source.onended = () => {
        setStatus("ready");
      };

      setStatus("playing");
    } catch (error) {
      console.error("❌ Audio playback error:", error);
      setStatus("error");
    }
  };

  // Convert Float32 audio to 16-bit PCM buffer
  const convertAudioTo16BitPCM = (audioBuffer: AudioBuffer) => {
    const buffer = audioBuffer.getChannelData(0);
    const length = buffer.length;
    const pcm = new Int16Array(length);

    for (let i = 0; i < length; i++) {
      const s = Math.max(-1, Math.min(1, buffer[i]));
      pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }

    return pcm.buffer;
  };

  // Re-init websocket when language changes
  useEffect(() => {
    initWebSocket();
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [language]);

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-xl shadow-lg">
      <h1 className="text-2xl font-bold text-center mb-6 text-black">Multilingual Time Assistant</h1>

      <div className="mb-6">
        <label className="block text-sm font-medium mb-2 text-gray-500">Select Language:</label>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          disabled={isListening}
          className="w-full p-2 border rounded-md text-gray-800 max-h-48 overflow-y-auto"
        >
          <option value="" >===Select Language===</option>
          <option value="en">English (achernar)</option>
          <option value="lg">Luganda (charon)</option>
          <option value="es">Spanish (achird)</option>
          <option value="fr">French (algenib)</option>
          <option value="de">German (algieba)</option>
          <option value="ja">Japanese (alnilam)</option>
          <option value="zh">Chinese (aoede)</option>
          <option value="hi">Hindi (autonoe)</option>
          <option value="ar">Arabic (callirrhoe)</option>
          <option value="ru">Russian (charon)</option>
          <option value="pt">Portuguese (despina)</option>
          <option value="sw">Swahili (achernar)</option>
          <option value="ny">Runyankore (autonoe)</option>
          <option value="luo">Luo (charon)</option>
          <option value="xog">Lusoga (despina)</option>
          <option value="bug">Lugisu (achird)</option>
          <option value="ln">Lingala (algenib)</option>
        </select>
      </div>

      <div className="flex flex-col items-center">
        <button
          onClick={isListening ? stopRecording : startRecording}
          disabled={status === "starting" || status === "processing"}
          className={`flex items-center justify-center gap-2 w-full py-3 px-6 rounded-full text-white font-medium ${isListening ? "bg-red-500 hover:bg-red-600" : "bg-blue-500 hover:bg-blue-600"
            } transition-colors`}
        >
          {isListening ? (
            <>
              <FaStopCircle className="text-xl" /> Stop Listening
            </>
          ) : (
            <>
              <FaMicrophone className="text-xl" /> Ask for Time
            </>
          )}
        </button>

        <div className="mt-4 text-sm text-gray-600">
          {status === "ready" && "Ready to listen"}
          {status === "starting" && "Initializing microphone..."}
          {status === "listening" && "Listening... Speak now"}
          {status === "processing" && "Processing your request..."}
          {status === "playing" && "Playing audio..."}
          {status === "error" && "Error occurred - try again"}
          {status === "disconnected" && "Connection lost - please refresh"}
        </div>
      </div>

      <div className="mt-8 text-center text-sm text-gray-500">
        <p>Ask questions like:</p>
        <p>"What time is it?"</p>
        <p>"Current time please"</p>
      </div>
    </div>
  );
}
