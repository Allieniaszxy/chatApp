import React, { useEffect, useState, useRef } from "react";
import api, { setToken } from "../api";
import { connectSocket, getSocket } from "../socket";

export default function Chat({ auth, setAuth }) {
  const [groups, setGroups] = useState([]);
  const [current, setCurrent] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [online, setOnline] = useState([]);
  const scrollRef = useRef();

  useEffect(() => {
    if (!auth) return;
    setToken(auth.token);
    connectSocket(auth.token);
    loadGroups();
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    const s = getSocket();
    if (!s) return;
    function onReceive(msg) {
      // if message belongs to current open group, push; otherwise update groups list
      if (current && String(msg.group) === String(current._id))
        setMessages((prev) => [...prev, msg]);
      // update lastMessage in groups (simple)
      setGroups((prev) =>
        prev.map((g) => (g._id === msg.group ? { ...g, lastMessage: msg } : g))
      );
    }
    s.on("receive-message", onReceive);
    s.on("online:users", setOnline);

    return () => {
      s.off("receive-message", onReceive);
      s.off("online:users", setOnline);
    };
  }, [current]);

  useEffect(() => {
    if (scrollRef.current)
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  async function loadGroups() {
    try {
      const { data } = await api.get("/groups");
      setGroups(data);
    } catch (e) {
      console.error(e);
    }
  }

  async function openGroup(g) {
    setCurrent(g);
    const s = getSocket();
    if (s) s.emit("join-group", g._id);
    const { data } = await api.get(`/messages/${g._id}`);
    setMessages(data);
  }

  function send() {
    if (!text.trim() || !current) return;
    const s = getSocket();
    const payload = { groupId: current._id, text: text.trim() };
    // send through socket; server saves in DB and broadcasts back
    s.emit("send-message", payload);
    setText("");
  }

  async function sendFile(file, type = "image") {
    if (!current || !file) return;
    const form = new FormData();
    if (type === "image") form.append("image", file);
    else form.append("voice", file);

    try {
      const url = `/messages/${current._id}/${type}`;
      const { data } = await api.post(url, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      // emit via socket so others see instantly (server will broadcast, but emitting ensures immediate push if needed)
      const s = getSocket();
      s.emit("send-message", {
        groupId: current._id,
        imageUrl: data.imageUrl,
        voiceUrl: data.voiceUrl,
      });
    } catch (e) {
      console.error(e);
    }
  }

  function handleFile(e) {
    sendFile(e.target.files[0], "image");
  }
  function handleVoice(e) {
    sendFile(e.target.files[0], "voice");
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-72 bg-white border-r flex flex-col">
        <div className="flex items-center justify-between p-3 border-b">
          <span className="font-bold">Chats</span>
          <button
            onClick={async () => {
              const name = prompt("Group name?");
              if (!name) return;
              const { data } = await api.post("/groups", { name });
              setGroups((prev) => [data, ...prev]);
            }}
            className="bg-blue-500 text-white px-2 py-1 rounded text-sm"
          >
            + New
          </button>
        </div>

        <ul className="flex-1 overflow-y-auto">
          {groups.map((g) => (
            <li key={g._id}>
              <button
                onClick={() => openGroup(g)}
                className={`w-full flex items-center p-3 hover:bg-gray-100 ${
                  current?._id === g._id ? "bg-gray-200" : ""
                }`}
              >
                <div className="flex-1 text-left">
                  <p className="font-medium">{g.name}</p>
                  <p className="text-xs text-gray-500">
                    {g.lastMessage?.text || g.lastMessage?.imageUrl
                      ? "Media / image"
                      : "No messages yet"}
                  </p>
                </div>
              </button>
            </li>
          ))}
        </ul>

        <div className="p-3 border-t text-xs text-gray-600">
          Logged in as <strong>{auth.user.name}</strong>
        </div>
      </aside>

      {/* Chat Area */}
      <main className="flex-1 flex flex-col">
        <header className="flex items-center justify-between px-4 py-2 border-b bg-white">
          <div>
            <h2 className="font-semibold">
              {current?.name || "Select a group"}
            </h2>
            <p className="text-xs text-gray-500">
              {current
                ? online.includes(auth.user.id)
                  ? "You are online"
                  : "You are offline"
                : ""}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm text-gray-600">Online: {online.length}</div>
            <button
              className="text-sm text-red-500"
              onClick={() => {
                localStorage.removeItem("auth");
                setAuth(null);
              }}
            >
              Logout
            </button>
          </div>
        </header>

        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-50"
        >
          {messages.map((m) => (
            <div
              key={m._id}
              className={`flex ${
                m.sender?._id === auth.user.id ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`px-3 py-2 rounded-2xl max-w-xs shadow ${
                  m.sender?._id === auth.user.id
                    ? "bg-blue-500 text-white rounded-br-none"
                    : "bg-gray-200 text-gray-800 rounded-bl-none"
                }`}
              >
                {m.text && <p>{m.text}</p>}
                {m.imageUrl && (
                  <img
                    src={`${(
                      import.meta.env.VITE_API || "http://localhost:5000/api"
                    ).replace("/api", "")}${m.imageUrl}`}
                    alt="pic"
                    className="rounded-lg mt-1 max-w-full"
                  />
                )}
                {m.voiceUrl && (
                  <audio
                    controls
                    src={`${(
                      import.meta.env.VITE_API || "http://localhost:5000/api"
                    ).replace("/api", "")}${m.voiceUrl}`}
                    className="mt-1"
                  />
                )}
                <span className="block text-[10px] text-right opacity-70 mt-1">
                  {new Date(m.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>
          ))}
        </div>

        {current && (
          <footer className="flex items-center gap-2 p-3 border-t bg-white">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") send();
              }}
              placeholder="Type a message"
              className="flex-1 border rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <label className="cursor-pointer">
              <input type="file" className="hidden" onChange={handleFile} />
              <span className="text-gray-500">📎</span>
            </label>
            <label className="cursor-pointer">
              <input
                type="file"
                className="hidden"
                accept="audio/*"
                onChange={handleVoice}
              />
              <span className="text-gray-500">🎤</span>
            </label>
            <button
              onClick={send}
              className="bg-blue-500 text-white px-4 py-2 rounded-full"
            >
              ➤
            </button>
          </footer>
        )}
      </main>
    </div>
  );
}
