import React, { useEffect, useContext, useState } from "react";
import "./Sidebar.css";
import logo from "./assets/blacklogo.png";
import { MyContext } from "./MyContext.jsx";
import { v1 as uuidv1 } from "uuid";
import { useAuth } from "./AuthContext";
import { useNavigate } from "react-router-dom";

const Sidebar = () => {
  const {
    allThreads,
    setAllThreads,
    currThreadId,
    setNewChat,
    setPrompt,
    setReply,
    setCurrThreadId,
    setPrevChats,
  } = useContext(MyContext);

  const { api, user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const getAllThreads = async () => {
    if (!user) {
      setAllThreads([]);
      return;
    }
    setLoading(true);
    try {
      const response = await api.get("/api/threads");
      const data = response.data || [];

      const filteredData = data.map((thread) => ({
        threadId: thread.threadId,
        title: thread.title || "New Chat",
      }));

      setAllThreads(filteredData);
    } catch (error) {
      console.error("Error fetching threads:", error);
      // If unauthenticated or token invalid, redirect to login
      if (
        error.response &&
        (error.response.status === 401 || error.response.status === 403)
      ) {
        navigate("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getAllThreads();
    // Refresh when currThreadId changes or user changes
  }, [currThreadId, user]);

  const createNewChat = () => {
    setNewChat(true);
    setPrompt("");
    setReply(null);
    setCurrThreadId(uuidv1()); // new unique thread
    setPrevChats([]);
  };

  const changeThread = async (newThreadId) => {
    setCurrThreadId(newThreadId);

    try {
      const response = await api.get(`/api/thread/${newThreadId}`);
      const data = response.data;
      const chats = Array.isArray(data) ? data : data?.messages || [];
      setPrevChats(chats);
      setNewChat(false);
      setReply(null);
    } catch (error) {
      console.error("Error changing thread:", error);
      if (
        error.response &&
        (error.response.status === 401 || error.response.status === 403)
      ) {
        navigate("/login");
      }
    }
  };

  const deleteThread = async (threadId) => {
    try {
      const res = await api.delete(`/api/thread/${threadId}`);
      console.log("Deleted:", res.data);

      setAllThreads((prev) =>
        prev.filter((thread) => thread.threadId !== threadId)
      );

      if (currThreadId === threadId) {
        createNewChat();
      }
    } catch (err) {
      console.error("Error deleting thread:", err);
      if (
        err.response &&
        (err.response.status === 401 || err.response.status === 403)
      ) {
        navigate("/login");
      }
    }
  };

  // If user is not logged in, show prompt to login
  if (!user) {
    return (
      <section className="sidebar">
        <div className="not-logged-in">
          <p>Please log in to view your chat history.</p>
          <button onClick={() => navigate("/login")}>Go to Login</button>
        </div>
      </section>
    );
  }

  return (
    <section className="sidebar">
      {/* new chat button */}
      <button onClick={createNewChat} className="new-chat-button">
        <img src={logo} alt="gpt logo" className="logo" />
        <span>
          <i className="fa-solid fa-pen-to-square"></i>
        </span>
      </button>

      {/* history */}
      <ul className="history">
        {loading && <li>Loading...</li>}
        {!loading && allThreads?.length === 0 && (
          <li>No chats yet — start a new one.</li>
        )}
        {allThreads?.map((thread) => (
          <li
            key={thread.threadId}
            onClick={() => changeThread(thread.threadId)}
            className={currThreadId === thread.threadId ? "hightlighted" : ""}
          >
            {thread.title}
            <i
              className="fa-solid fa-trash"
              onClick={(e) => {
                e.stopPropagation();
                deleteThread(thread.threadId);
              }}
            ></i>
          </li>
        ))}
      </ul>

      {/* sign */}
      <div className="sign">
        <p>By Apna ChatGPT &hearts;</p>
      </div>
    </section>
  );
};

export default Sidebar;
