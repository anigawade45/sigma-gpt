import React, { useContext, useEffect, useRef, useState } from "react";
import "./Chat.css";
import { MyContext } from "./MyContext.jsx";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";

const Chat = () => {
  const { newChat, prevChats } = useContext(MyContext);
  const [latestReply, setLatestReply] = useState(null);
  const lastAnimatedRef = useRef("");

  useEffect(() => {
    // Ensure prevChats is an array before using it
    if (!Array.isArray(prevChats) || prevChats.length === 0) {
      setLatestReply(null);
      lastAnimatedRef.current = "";
      return;
    }

    const last = prevChats[prevChats.length - 1];
    if (!last || last.role !== "assistant" || !last.content) {
      setLatestReply(null);
      return;
    }

    // If message has a timestamp, treat messages older than threshold as history (no typing)
    const THRESHOLD_MS = 5000; // 5 seconds
    const msgTime = last.timestamp ? new Date(last.timestamp).getTime() : null;
    const isRecent = msgTime ? Date.now() - msgTime < THRESHOLD_MS : false;

    // If last message is not recent, show it fully (no typing)
    if (!isRecent) {
      setLatestReply(null);
      lastAnimatedRef.current = last.content; // mark as already shown
      return;
    }

    // Don't re-animate the same assistant message
    if (last.content === lastAnimatedRef.current) return;
    lastAnimatedRef.current = last.content;

    const tokens = last.content.split(/(\s+)/); // keep spaces as tokens
    if (tokens.length === 0) {
      setLatestReply(null);
      return;
    }

    let idx = 0;
    setLatestReply(tokens[0] || "");
    const interval = setInterval(() => {
      idx++;
      if (idx >= tokens.length) {
        setLatestReply(tokens.join(""));
        clearInterval(interval);
      } else {
        setLatestReply(tokens.slice(0, idx + 1).join(""));
      }
    }, 40);

    return () => clearInterval(interval);
  }, [prevChats]);

  return (
    <>
      {newChat && <h1>Start a new chat!</h1>}
      <div className="chats">
        {Array.isArray(prevChats) &&
          prevChats.slice(0, -1).map((chat, index) => (
            <div
              className={chat.role === "user" ? "userDiv" : "gptDiv"}
              key={index}
            >
              {chat.role === "user" ? (
                <div className="userMessageWrapper">
                  <p className="userMessage">{chat.content}</p>
                </div>
              ) : (
                <div className="assistantMessage">
                  <ReactMarkdown rehypePlugins={[rehypeHighlight]}>
                    {chat.content}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          ))}

        {Array.isArray(prevChats) &&
          prevChats.length > 0 &&
          latestReply !== null && (
            <div className="gptDiv typing" key={"typing"}>
              <div className="assistantMessage">
                <ReactMarkdown rehypePlugins={[rehypeHighlight]}>
                  {latestReply}
                </ReactMarkdown>
              </div>
            </div>
          )}

        {Array.isArray(prevChats) &&
          prevChats.length > 0 &&
          latestReply === null && (
            <div className="gptDiv" key={"nontyping"}>
              <div className="assistantMessage">
                <ReactMarkdown rehypePlugins={[rehypeHighlight]}>
                  {prevChats[prevChats.length - 1].content}
                </ReactMarkdown>
              </div>
            </div>
          )}
      </div>
    </>
  );
};

export default Chat;
