import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState("light");
  const [mounted, setMounted] = useState(false);

  // On first load - respect system preference if no saved theme
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle("dark", savedTheme === "dark");
    } else {
      // Check system preference
      const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const initialTheme = systemPrefersDark ? "dark" : "light";
      setTheme(initialTheme);
      document.documentElement.classList.toggle("dark", initialTheme === "dark");
    }
    
    setMounted(true);
  }, []);

  // Listen for system preference changes
  useEffect(() => {
    if (!mounted) return;
    
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e) => {
      // Only auto-update if user hasn't manually set a preference
      if (!localStorage.getItem("theme")) {
        const newTheme = e.matches ? "dark" : "light";
        setTheme(newTheme);
        document.documentElement.classList.toggle("dark", newTheme === "dark");
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [mounted]);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);

    document.documentElement.classList.toggle("dark", newTheme === "dark");
    localStorage.setItem("theme", newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, mounted }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);