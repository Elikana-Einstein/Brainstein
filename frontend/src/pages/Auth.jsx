import { useState, useEffect } from "react";
import useStore from "../zustand/store";
import axios from 'axios'
import { toast } from "react-toastify";
const PARTICLES = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: Math.random() * 100,
  size: Math.random() * 2 + 1,
  opacity: Math.random() * 0.4 + 0.1,
  dur: 6 + Math.random() * 6,
  del: -(i * 0.3),
}));

function InputField({ label, type = "text", value, onChange, error }) {
  const [focused, setFocused] = useState(false);
  const [show, setShow] = useState(false);

  return (
    <div style={{ marginBottom: "12px" }}>
      <label style={{ fontSize: "10px", color: "#aaa" }}>{label}</label>
      <div style={{ position: "relative" }}>
        <input
          type={type === "password" ? (show ? "text" : "password") : type}
          value={value}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            width: "100%",
            padding: "10px",
            marginTop: "4px",
            borderRadius: "6px",
            border: `1px solid ${error ? "#ff6b6b" : focused ? "#4dabf7" : "#333"}`,
            background: "#111",
            color: "#eee",
            fontSize: "12px",
            outline: "none",
          }}
        />
        {type === "password" && (
          <button
            onClick={() => setShow(!show)}
            style={{
              position: "absolute",
              right: "8px",
              top: "50%",
              transform: "translateY(-50%)",
              border: "none",
              background: "none",
              color: "#777",
              cursor: "pointer",
            }}
          >
            {show ? "🙈" : "👁"}
          </button>
        )}
      </div>
      {error && (
        <p style={{ color: "#ff6b6b", fontSize: "10px", marginTop: "3px" }}>{error}</p>
      )}
    </div>
  );
}

export default function AuthModal() {
  const [mode, setMode] = useState("login");
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const{saveDetails,logged,setLogged,checkToken}=useStore()
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    confirm: "",
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    setTimeout(() => setMounted(true), 100);
  }, []);

  const validate = () => {
    const e = {};
    if (mode === "signup") {
      if (!form.username.trim()) e.username = "Username required";
      if (form.password !== form.confirm) e.confirm = "Passwords don't match";
    }
    if (!form.email.includes("@")) e.email = "Invalid email";
    if (form.password.length < 6) e.password = "Min 6 chars";
    return e;
  };

const submit = async () => {
  const e = validate();
  if (Object.keys(e).length) {
    setErrors(e);
    return;
  }

  // 1. Set loading to true IMMEDIATELY before the API calls
  setLoading(true);

  try {
    if (mode === 'login') {
      const result = await axios.post('https://proper-flyingfish-elikana-f71f5476.koyeb.app/login', form);
      
      if (result.status === 201 || result.status === 200) {
        const { userName, userId, token, message } = result.data;
        toast.success(message);
        console.log(userName,userId);
        
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify({ userName, userId }));
        useStore.setState({
          loggedInn:true
        })
        setLogged(true);
        checkToken();
        saveDetails();
        
        setForm({ username: "", email: "", password: "", confirm: "" });
      } else {
        toast.error(result.data.message || "Login failed");
      }
    } else {
      // SIGNUP MODE
      const result = await axios.post('https://proper-flyingfish-elikana-f71f5476.koyeb.app/signup', form);
      
      if (result.status === 201) {
        toast.success(result.data.message);
        setForm({ username: "", email: "", password: "", confirm: "" });
        // 2. Switch mode to login
        setMode('login');
      } else {
        toast.error(result.data.message || "Registration failed");
      }
    }
  } catch (error) {
    // 3. Catch network errors so the button doesn't stay disabled forever
    toast.error(error.response?.data?.message || "Something went wrong");
  } finally {
    // 4. Always turn off loading whether it succeeded or failed
    setLoading(false);
  }
};

  return (
    <>
      <style>{`
        @keyframes fade { from{opacity:0;transform:scale(.95)} to{opacity:1;transform:scale(1)} }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
        .particle { position:absolute;border-radius:50%;background:#4dabf7;animation:float var(--dur) ease-in-out infinite;animation-delay:var(--del); }
      `}</style>

      <div
        style={{
          width: "360px",
          background: "#0c0c0c",
          border: "1px solid #222",
          borderRadius: "12px",
          padding: "20px",
          position: "relative",
          overflow: "hidden",
          animation: mounted ? "fade .35s ease" : "none",
          transition: "all 0.3s ease",
        }}
      >

        
          <>
            <div style={{ display: "flex", justifyContent: "center", gap: "10px", marginBottom: "15px" }}>
              <button
                onClick={() => setMode("login")}
                style={{
                  padding: "6px 12px",
                  borderRadius: "6px",
                  border: "none",
                  background: mode === "login" ? "#4dabf7" : "#222",
                  color: "#fff",
                  cursor: "pointer",
                  transition: "all 0.3s",
                }}
              >
                Sign In
              </button>
              <button
                onClick={() => setMode("signup")}
                style={{
                  padding: "6px 12px",
                  borderRadius: "6px",
                  border: "none",
                  background: mode === "signup" ? "#4dabf7" : "#222",
                  color: "#fff",
                  cursor: "pointer",
                  transition: "all 0.3s",
                }}
              >
                Sign Up
              </button>
            </div>

            {mode === "signup" && (
              <InputField
                label="Username"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                error={errors.username}
              />
            )}


            <InputField
              label="Email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              error={errors.email}
            />

            <InputField
              label="Password"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              error={errors.password}
            />

            {mode === "signup" && (
              <InputField
                label="Confirm Password"
                type="password"
                value={form.confirm}
                onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                error={errors.confirm}
              />
            )}

            <button
              onClick={submit}
             // disabled={loading}
              style={{
                width: "100%",
                padding: "10px",
                marginTop: "6px",
                borderRadius: "6px",
                border: "none",
                background: "#4dabf7",
                color: "#fff",
                cursor: "pointer",
              }}
            >
              {loading ? "Loading..." : mode === "login" ? "Sign In" : "Register"}
            </button>
          </>
      </div>
    </>
  );
}