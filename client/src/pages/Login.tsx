import React, { useState, type FormEvent } from "react";
import api, { setToken } from "../api";

interface AuthData {
  token: string;
  [key: string]: unknown; // for extra fields returned from backend
}

interface LoginProps {
  setAuth: (auth: AuthData) => void;
}

export default function Login({ setAuth }: LoginProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    try {
      const url = mode === "login" ? "/auth/login" : "/auth/register";
      const body =
        mode === "login" ? { email, password } : { name, email, password };

      const { data } = await api.post<AuthData>(url, body);

      localStorage.setItem("auth", JSON.stringify(data));
      setToken(data.token);
      setAuth(data);
    } catch (err) {
      alert(err.response?.data?.message || "Error");
    }
  }

  return (
    <div className="flex h-screen items-center justify-center bg-gray-100">
      <form
        onSubmit={submit}
        className="bg-white p-6 rounded-2xl shadow-md w-80"
      >
        <h2 className="text-xl font-bold mb-4">
          {mode === "login" ? "Login" : "Register"}
        </h2>

        {mode === "register" && (
          <input
            className="border p-2 w-full mb-3 rounded"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        )}

        <input
          className="border p-2 w-full mb-3 rounded"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          className="border p-2 w-full mb-3 rounded"
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          type="submit"
          className="bg-blue-500 text-white py-2 px-4 rounded w-full"
        >
          {mode === "login" ? "Login" : "Create account"}
        </button>

        <p className="text-center mt-3 text-sm">
          {mode === "login" ? "No account?" : "Have account?"}
          <button
            type="button"
            onClick={() => setMode(mode === "login" ? "register" : "login")}
            className="ml-2 text-blue-600 underline"
          >
            {mode === "login" ? "Register" : "Login"}
          </button>
        </p>
      </form>
    </div>
  );
}
