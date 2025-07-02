"use client";
import { useState, useRef, useEffect, RefObject } from 'react';
import { FaMicrophone, FaStopCircle } from 'react-icons/fa';

type AudioContextType = AudioContext | null;
type ScriptProcessorType = ScriptProcessorNode | null;
type MediaStreamType = MediaStream | null;
type WebSocketType = WebSocket | null;

export default function VoiceAssistant() {
  const [isListening, setIsListening] = useState(false);
  const [language, setLanguage] = useState('en');
  const socketRef = useRef<WebSocketType>(null);
  const audioContextRef = useRef<AudioContextType>(null);
  const processorRef = useRef<ScriptProcessorType>(null);
  const mediaStreamRef = useRef<MediaStreamType>(null);
  const [status, setStatus] = useState('idle');
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "ws://localhost:8000";

  const startRecording = async () => {
    try {
      setStatus('starting');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      
      // Create AudioContext with proper type handling
      const AudioContext = window.AudioContext;
      if (!AudioContext) {
        throw new Error('AudioContext not supported in this browser');
      }
      
      audioContextRef.current = new AudioContext({ sampleRate: 16000 });
      
      // Ensure audioContextRef.current is not null
      if (!audioContextRef.current) {
        throw new Error('AudioContext creation failed');
      }
      
      const source = audioContextRef.current.createMediaStreamSource(stream);
      const processor = audioContextRef.current.createScriptProcessor(1024, 1, 1);
      processorRef.current = processor;
      
      source.connect(processor);
      processor.connect(audioContextRef.current.destination);
      
      processor.onaudioprocess = (event) => {
        if (!isListening) return;
        const pcmData = convertAudioTo16BitPCM(event.inputBuffer);
        if (socketRef.current?.readyState === WebSocket.OPEN) {
          socketRef.current.send(pcmData);
        }
      };
      
      setIsListening(true);
      setStatus('listening');
    } catch (error) {
      console.error('Error accessing microphone:', error);
      setStatus('error');
    }
  };

  const stopRecording = () => {
    setIsListening(false);
    setStatus('processing');
    
    // Clean up audio resources with null checks
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
  };

  const initWebSocket = () => {
    const sessionId = Date.now().toString();
    socketRef.current = new WebSocket(
      `${backendUrl}/ws/${sessionId}/${language}`
    );

    socketRef.current.onopen = () => {
      console.log("WebSocket connected");
      setStatus('ready');
    };

    socketRef.current.onmessage = (event) => {
      if (event.data instanceof Blob) {
        playAudio(event.data);
      } else if (typeof event.data === 'string') {
        console.log("Text response:", event.data);
      }
    };

    socketRef.current.onerror = (error) => {
      console.error("WebSocket error:", error);
      setStatus('error');
    };

    socketRef.current.onclose = () => {
      console.log("WebSocket disconnected");
      setStatus('disconnected');
    };
  };

  const playAudio = (audioBlob: Blob) => {
    const audioContext = new AudioContext({ sampleRate: 24000 });
    
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        audioContext.decodeAudioData(reader.result).then((decodedData) => {
          const source = audioContext.createBufferSource();
          source.buffer = decodedData;
          source.connect(audioContext.destination);
          source.start();
          setStatus('ready');
        }).catch(e => {
          console.error("Audio decoding error:", e);
          setStatus('error');
        });
      }
    };
    reader.onerror = () => {
      console.error("FileReader error");
      setStatus('error');
    };
    reader.readAsArrayBuffer(audioBlob);
  };

 const convertAudioTo16BitPCM = (audioBuffer: AudioBuffer) => {
    const buffer = audioBuffer.getChannelData(0);
    const length = buffer.length;
    const pcm = new Int16Array(length);
    
    for (let i = 0; i < length; i++) {
        const sample = Math.max(-1, Math.min(1, buffer[i]));
        pcm[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
    }
    
    return pcm.buffer;
};

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
      <h1 className="text-2xl font-bold text-center mb-6">Multilingual Time Assistant</h1>
      
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Select Language:</label>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          disabled={isListening}
          className="w-full p-2 border rounded-md"
        >
          <option value="en">English</option>
          <option value="es">Spanish</option>
          <option value="fr">French</option>
          <option value="de">German</option>
          <option value="ja">Japanese</option>
          <option value="zh">Chinese</option>
          <option value="hi">Hindi</option>
          <option value="ar">Arabic</option>
          <option value="ru">Russian</option>
          <option value="pt">Portuguese</option>
        </select>
      </div>
      
      <div className="flex flex-col items-center">
        <button
          onClick={isListening ? stopRecording : startRecording}
          disabled={status === 'starting' || status === 'processing'}
          className={`flex items-center justify-center gap-2 w-full py-3 px-6 rounded-full text-white font-medium ${
            isListening 
              ? 'bg-red-500 hover:bg-red-600' 
              : 'bg-blue-500 hover:bg-blue-600'
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
          {status === 'ready' && 'Ready to listen'}
          {status === 'starting' && 'Initializing microphone...'}
          {status === 'listening' && 'Listening... Speak now'}
          {status === 'processing' && 'Processing your request...'}
          {status === 'error' && 'Error occurred - try again'}
          {status === 'disconnected' && 'Connection lost - please refresh'}
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