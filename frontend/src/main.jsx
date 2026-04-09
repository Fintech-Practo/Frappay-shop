
import { createRoot } from "react-dom/client";
import App from "./app/App.jsx";
import "./index.css";
import { ThemeProvider } from "@/context/ThemeContext";


import { GoogleOAuthProvider } from '@react-oauth/google';

// Fallback to a placeholder if env is missing to prevent crash, though it won't work
const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "1059672988600-i8oe5jge0eiscro9u4rj28i3248nigmc.apps.googleusercontent.com";

createRoot(document.getElementById("root")).render(
    <ThemeProvider>
      <GoogleOAuthProvider clientId={googleClientId}>
        <App />
    </GoogleOAuthProvider>
    </ThemeProvider>
);
