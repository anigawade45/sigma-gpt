import React, { useState } from "react";
import "./App.css";
import { MyContext } from "./MyContext.jsx";
import Sidebar from "./Sidebar.jsx";
import ChatWindow from "./ChatWindow.jsx";
import { v1 as uuidv1 } from "uuid";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./AuthContext";
import Register from "./Register";
import Login from "./Login";
import Profile from "./Profile";
import ProtectedRoute from "./ProtectedRoute";

// Home is the chat UI that should be protected
const Home = () => (
  <div className="app">
    <Sidebar />          {/* left fixed */}
    <ChatWindow />       {/* center fixed */}
    <div className="right-space" /> {/* right flexible area (gutter) */}
  </div>
);

const AppRoutes = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
        <Route
          path="/login"
          element={<Login />}
        />
        <Route
          path="/register"
          element={<Register />}
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        {/* Fallback */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

const App = () => {
  const [prompt, setPrompt] = useState("");
  const [reply, setReply] = useState(null);
  const [currThreadId, setCurrThreadId] = useState(uuidv1());
  const [prevChats, setPrevChats] = useState([]);
  const [newChat, setNewChat] = useState(true);
  const [allThreads, setAllThreads] = useState([]);
  const providerValues = {
    prompt,
    setPrompt,
    reply,
    setReply,
    currThreadId,
    setCurrThreadId,
    prevChats,
    setPrevChats,
    newChat,
    setNewChat,
    allThreads,
    setAllThreads,
  };

  return (
    <AuthProvider>
      <MyContext.Provider value={providerValues}>
        <AppRoutes />
      </MyContext.Provider>
    </AuthProvider>
  );
};

export default App;
