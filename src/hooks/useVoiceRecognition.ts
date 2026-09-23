import { useEffect, useRef, useState } from 'react';

// SpeechRecognition type declarations
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export function useVoiceRecognition(onFinalTranscript?: (text: string) => void) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef(false);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const onFinalTranscriptRef = useRef(onFinalTranscript);

  useEffect(() => {
    onFinalTranscriptRef.current = onFinalTranscript;
  }, [onFinalTranscript]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognition) {
      setIsSupported(true);
      const recognition = new SpeechRecognition();

      // Mobile devices work best with continuous=false or true with manual restart
      recognition.continuous = true;
      recognition.interimResults = true;

      // Detect Spanish dialect; fallback to general Latin American Spanish 'es-419' or 'es-ES'
      const browserLang = navigator.language || '';
      if (browserLang.startsWith('es')) {
        recognition.lang = browserLang;
      } else {
        recognition.lang = 'es-419'; // Neutral Latin American Spanish
      }

      recognition.onstart = () => {
        setIsListening(true);
        isListeningRef.current = true;
        setError(null);
      };

      recognition.onresult = (event: any) => {
        let currentInterim = '';
        let currentFinal = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const part = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            currentFinal += part + ' ';
          } else {
            currentInterim += part;
          }
        }

        if (currentFinal) {
          setTranscript((prev) => {
            const next = prev ? `${prev} ${currentFinal.trim()}` : currentFinal.trim();
            return next;
          });
        }
        setInterimTranscript(currentInterim);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition event error:', event.error);
        if (event.error === 'not-allowed') {
          setError('Permiso de micrófono denegado. Por favor permite el acceso al micrófono en tu navegador.');
          setIsListening(false);
          isListeningRef.current = false;
        } else if (event.error === 'no-speech') {
          // Normal pause in speech, don't show alarming error
        } else if (event.error === 'network') {
          setError('Error de conexión al servicio de voz del navegador.');
        } else {
          setError(`Error de voz: ${event.error}`);
        }
      };

      recognition.onend = () => {
        // If user didn't explicitly stop listening, try restarting (mobile pause handling)
        if (isListeningRef.current) {
          try {
            recognition.start();
          } catch {
            setIsListening(false);
            isListeningRef.current = false;
          }
        } else {
          setIsListening(false);
          setInterimTranscript('');
        }
      };

      recognitionRef.current = recognition;
    } else {
      setIsSupported(false);
    }

    return () => {
      isListeningRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const startListening = async () => {
    setError(null);

    // 1. Explicitly request microphone permission via getUserMedia
    // This is required on mobile browsers (Safari iOS, Android Chrome) before SpeechRecognition works
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;
      } catch (err: any) {
        console.warn('Microphone permission rejected:', err);
        setError('No se pudo acceder al micrófono. Asegúrate de permitir el micrófono en tu navegador o ajustes.');
        return;
      }
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition || !recognitionRef.current) {
      setError('Tu navegador actual no tiene soporte directo de SpeechRecognition. Puedes escribir la frase en el campo.');
      return;
    }

    try {
      isListeningRef.current = true;
      recognitionRef.current.start();
      setIsListening(true);
    } catch (err: any) {
      console.warn('Error starting speech recognition:', err);
      // If already started, ignore
      if (err.name !== 'InvalidStateError') {
        setError('No se pudo iniciar el dictado. Intenta de nuevo.');
      }
    }
  };

  const stopListening = () => {
    isListeningRef.current = false;
    try {
      recognitionRef.current?.stop();
    } catch (err) {
      console.warn('Error stopping speech recognition:', err);
    }
    setIsListening(false);
    setInterimTranscript('');

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
  };

  const resetTranscript = () => {
    setTranscript('');
    setInterimTranscript('');
    setError(null);
  };

  return {
    isListening,
    transcript,
    setTranscript,
    interimTranscript,
    isSupported,
    error,
    startListening,
    stopListening,
    resetTranscript,
  };
}
