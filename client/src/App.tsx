import React, { useState } from "react";
import Login from "./pages/Login";
import Chat from "./pages/Chat";

export default function App() {
  const stored = localStorage.getItem("auth");
  const [auth, setAuth] = useState(stored ? JSON.parse(stored) : null);
  return auth ? (
    <Chat auth={auth} setAuth={setAuth} />
  ) : (
    <Login setAuth={setAuth} />
  );
}
