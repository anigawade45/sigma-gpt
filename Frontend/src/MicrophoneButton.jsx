import React, { useState, useRef, useEffect, useContext } from "react";
import axios from "axios";
import { MyContext } from "./MyContext.jsx";
import { useAuth } from "./AuthContext";

/*
- Records audio via MediaRecorder
- Sends the audio blob as multipart/form-data to /api/voice-to-text
- On success: places transcribed text into chat input via setPrompt
- Shows simple UI states (recording, uploading/transcribing)
*/

const MicrophoneButton = () => {
  const { setPrompt } = useContext(MyContext);
  const { api } = useAuth(); // optional: you can use axios or your auth-enabled api instance
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [permissionError, setPermissionError] = useState(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);

  useEffect(() => {
    return () => {
      // cleanup media stream on unmount
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const startRecording = async () => {
    setPermissionError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const options = {}; // let browser pick mimeType or specify e.g. { mimeType: 'audio/webm' }
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = handleStop;
      mediaRecorder.start();
      setRecording(true);
    } catch (err) {
      console.error("Microphone permission error:", err);
      setPermissionError("Permission denied or no microphone available.");
    }
  };

  const stopRecording = () => {
    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== "inactive") {
      mr.stop();
    }
    setRecording(false);
  };

  const handleStop = async () => {
    const blob = new Blob(chunksRef.current, {
      type: chunksRef.current[0]?.type || "audio/webm",
    });
    // free media tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    // send to server
    await sendAudio(blob);
  };

  const sendAudio = async (blob) => {
    setTranscribing(true);
    try {
      const form = new FormData();
      // Choose filename & extension based on mime type if possible
      const mime = blob.type || "audio/webm";
      let ext = "webm";
      if (mime.includes("wav")) ext = "wav";
      else if (mime.includes("mpeg") || mime.includes("mp3")) ext = "mp3";
      else if (mime.includes("ogg")) ext = "ogg";
      form.append("file", blob, `recording.${ext}`);

      // Use your auth-enabled api instance if you have one; otherwise axios default will work
      // If you use the AuthProvider's api instance, it will attach tokens automatically:
      const axiosClient = api || axios;

      const resp = await axiosClient.post("/api/voice-to-text", form, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 120000, // 2 minutes for larger files/transcriptions
      });

      const text = resp.data?.text || resp.data?.transcript || "";
      if (text) {
        setPrompt(text);
      }
    } catch (err) {
      console.error("Transcription error:", err);
      // Optionally show an inline error UI
      window.alert("Transcription failed. See console for details.");
    } finally {
      setTranscribing(false);
    }
  };

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <button
        onClick={() => (recording ? stopRecording() : startRecording())}
        title={recording ? "Stop recording" : "Start recording"}
        style={{
          height: 40,
          width: 40,
          borderRadius: 999,
          border: "none",
          background: recording ? "#ff6b6b" : "#339cff",
          color: "#fff",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          boxShadow: recording
            ? "0 6px 16px rgba(255,107,107,0.2)"
            : "0 6px 16px rgba(51,156,255,0.18)",
        }}
      >
        {recording ? (
          <span style={{ fontWeight: 700 }}>■</span>
        ) : (
          <i className="fa-solid fa-microphone"></i>
        )}
      </button>

      {/* transcription loader */}
      {transcribing && (
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            color: "#cbd5e1",
            fontSize: 13,
          }}
        >
          <i className="fa-solid fa-spinner fa-spin" /> Transcribing...
        </div>
      )}

      {permissionError && (
        <div style={{ color: "#ffb4b4", fontSize: 12 }}>{permissionError}</div>
      )}
    </div>
  );
};

export default MicrophoneButton;
