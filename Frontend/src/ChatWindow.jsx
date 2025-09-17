import React, { useContext, useState, useEffect } from "react";
import "./ChatWindow.css";
import Chat from "./Chat.jsx";
import { MyContext } from "./MyContext.jsx";
import { BeatLoader } from "react-spinners";
import { useAuth } from "./AuthContext";
import { useNavigate } from "react-router-dom";
import MicrophoneButton from "./MicrophoneButton";

const ChatWindow = () => {
  const {
    prompt,
    setPrompt,
    reply,
    setReply,
    currThreadId,
    prevChats,
    setPrevChats,
    setNewChat,
  } = useContext(MyContext);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { api, logout, user } = useAuth();
  const navigate = useNavigate();

  const getReply = async () => {
    if (!prompt?.trim()) return;
    setIsLoading(true);
    setNewChat(false);

    try {
      const response = await api.post("/api/chat", {
        message: prompt,
        threadId: currThreadId,
      });

      setReply(response.data.reply);
    } catch (error) {
      console.error(
        "Error fetching reply:",
        error.response?.data || error.message
      );
      if (
        error.response &&
        (error.response.status === 401 || error.response.status === 403)
      ) {
        await logout();
        navigate("/login");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!reply) return;

    const nowISO = new Date().toISOString();
    setPrevChats((prev) => [
      ...prev,
      { role: "user", content: prompt, timestamp: nowISO },
      { role: "assistant", content: reply, timestamp: nowISO },
    ]);
    setPrompt("");
    setReply(null);
  }, [reply]);

  const toggleDropdown = () => setIsOpen((s) => !s);

  const handleLogout = async () => {
    try {
      setPrevChats([]);
      setNewChat(true);
      setPrompt("");
      setReply(null);
    } catch (err) {
      // ignore
    } finally {
      await logout();
    }
  };

  const goToSettings = () => {
    setIsOpen(false);
    navigate("/profile");
  };

  const initials = user
    ? user.name
        .split(" ")
        .map((s) => s[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "G";

  return (
    <div className="chatWindow">
      <header className="cw-header">
        <div className="cw-title">SigmaGPT</div>
        <div className="cw-user">
          <button
            className="user-button"
            onClick={toggleDropdown}
            aria-haspopup="true"
            aria-expanded={isOpen}
          >
            <span className="user-initials">{initials}</span>
          </button>
          {isOpen && (
            <div className="cw-dropdown" role="menu">
              <button className="cw-dd-item" onClick={() => {}}>
                Upgrade plan
              </button>
              <button className="cw-dd-item" onClick={goToSettings}>
                Profile / Settings
              </button>
              <button className="cw-dd-item danger" onClick={handleLogout}>
                Logout
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="cw-main" aria-live="polite">
        <Chat />
      </main>

      <div className={`cw-loader ${isLoading ? "active" : "hidden"}`}>
        <BeatLoader color="#ffffff" loading={isLoading} size={8} />
        <span className="cw-label">Thinking...</span>
      </div>

      <footer className="cw-footer">
        <div className="inputBox">
          <input
            placeholder="Ask anything"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") getReply();
            }}
            aria-label="Message input"
          />
          <button
            id="submit"
            onClick={getReply}
            aria-label="Send message"
          >
            <i className="fa-solid fa-paper-plane"></i>
          </button>
          <MicrophoneButton />
        </div>
      </footer>
    </div>
  );
};

export default ChatWindow;
