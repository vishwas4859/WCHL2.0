import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import "../styles/Landing.css";

function Landing() {
  const navigate = useNavigate();
  const { loginWithInternetIdentity, loginWithPlug } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (method) => {
    setIsLoading(true);
    try {
      const result = method === 'ii' ? 
        await loginWithInternetIdentity() : 
        await loginWithPlug();

      if (result) {
        // Always navigate to /home first
        navigate('/home');
      }
    } catch (error) {
      console.error("Login failed:", error);
    }
    setIsLoading(false);
  };

  return (
    <div className="landing">
      <div className="landing-content glass">
        <h1>Welcome to Instant Car Pool (ICP)</h1>
        <p>Join the ride-sharing revolution!</p>
        <div className="login-buttons">
          <button
            className="login-btn glass"
            onClick={() => handleLogin('ii')}
            disabled={isLoading}
          >
            {isLoading ? "Logging in..." : "Login with Internet Identity"}
          </button>
          <button
            className="login-btn glass"
            onClick={() => handleLogin('plug')}
            disabled={isLoading}
          >
            {isLoading ? "Logging in..." : "Login with Plug Wallet"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Landing;