import { useState, useRef, useCallback } from 'react';

/**
 * Custom hook for microphone recording functionality.
 * Handles MediaRecorder lifecycle and returns recording state + controls.
 */
export function useRecording({ onRecordingComplete }) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [error, setError] = useState(null);

  const mediaRecorderRef = useRef(null);
  const recordingChunksRef = useRef([]);
  const recordingIntervalRef = useRef(null);

  /**
   * Start recording from the microphone.
   */
  const startRecording = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      recordingChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          recordingChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(recordingChunksRef.current, { type: 'audio/webm' });
        const arrayBuffer = await blob.arrayBuffer();

        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());

        // Clear recording state
        clearInterval(recordingIntervalRef.current);
        setRecordingTime(0);

        // Call the completion callback with the recorded audio
        if (onRecordingComplete) {
          onRecordingComplete(arrayBuffer);
        }
      };

      mediaRecorder.start(100);
      setIsRecording(true);

      // Start timer
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error('Recording error:', err);
      setError('Could not access microphone. Please check permissions.');
    }
  }, [onRecordingComplete]);

  /**
   * Stop the current recording.
   */
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  /**
   * Toggle recording on/off.
   */
  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  /**
   * Format recording time as MM:SS.
   * @param {number} seconds - Total seconds
   * @returns {string} Formatted time string
   */
  const formatRecordingTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return {
    isRecording,
    recordingTime,
    error,
    startRecording,
    stopRecording,
    toggleRecording,
    formatRecordingTime
  };
}
