// frontend/app/page.js
import VoiceAssistant from '../components/VoiceAssistant';
import './globals.css';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-indigo-100 py-12">
      <div className="container mx-auto px-4">
        <VoiceAssistant />
      </div>
    </main>
  );
}