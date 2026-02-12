import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, useNavigate } from "react-router-dom";
import { AuthClient } from "@dfinity/auth-client";
import { HttpAgent, Actor } from "@dfinity/agent";
import { ridesharing_backend, idlFactory, canisterId } from "declarations/ridesharing_backend";
import { Principal } from "@dfinity/principal";
import UserHome from "./pages/UserHome";
import DriverHome from "./pages/DriverHome";
import "./App.css";
import { AuthProvider, useAuth } from "./contexts/AuthContext";

function LoginForm({ activeLogin, onSubmit, plugAvailable }) {
  const handlePlugLogin = async () => {
    onSubmit({ type: "plug" });
  };

  const handleIILogin = async () => {
    onSubmit({ type: "ii" });
  };

  return (
    <form className="login-form">
      <h2>{activeLogin === "user" ? "User Login" : "Driver Login"}</h2>
      <button
        type="button"
        className="blockchain-login plug"
        onClick={handlePlugLogin}
        disabled={!plugAvailable}
      >
        {plugAvailable ? "Login with Plug Wallet" : "Plug Wallet Not Detected"}
      </button>

      <div className="login-divider">
        <span>or continue with</span>
      </div>
      <div className="blockchain-login-buttons">
        <button 
          type="button" 
          className="blockchain-login ii"
          onClick={handleIILogin}
        >
          Login with Internet Identity
        </button>
      </div>
    </form>
  );
}

function LandingPage() {
  const navigate = useNavigate();
  const [activeLogin, setActiveLogin] = useState("user");
  const [plugAvailable, setPlugAvailable] = useState(false);
  const { loginWithInternetIdentity, loginWithPlug } = useAuth();

  useEffect(() => {
    if (window.ic && window.ic.plug) {
      setPlugAvailable(true);
    }
  }, []);

  const handleLogin = async (formData) => {
    try {
      let success = false;
      
      if (formData.type === "plug") {
        const actor = await loginWithPlug();
        success = !!actor;
      } else if (formData.type === "ii") {
        const actor = await loginWithInternetIdentity();
        success = !!actor;
      }
      
      if (success) {
        navigate(activeLogin === "user" ? "/home" : "/driver-dashboard", { replace: true });
      }
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  return (
    <div className="app">
      <nav className="navbar">
        <div className="logo">
          Instant Car Pool <span className="icp-text">(ICP)</span>
        </div>
        <div className="nav-links">
          <a href="#about">About</a>
          <a href="#services">Services</a>
          <a href="#contact">Contact</a>
        </div>
      </nav>

      {/* Rest of the landing page JSX */}
      <div className="hero-section">
        <div className="hero-content">
          <span className="hero-label">Decentralized Ride Sharing</span>
          <h1>Experience The Future Of <span className="highlight">Car Pooling and Ride Sharing</span></h1>
          <p className="hero-description">
            Join the revolution of decentralized ride sharing powered by ICP
            blockchain. Because it is for the Internet Connected People "ICP 😊"
            developed by the Instant Car Pool "ICP⚡"
          </p>
          <div className="hero-stats">
            <div className="stat">
              <span className="stat-number">1000+</span>
              <span className="stat-label">Active Drivers</span>
            </div>
            <div className="stat">
              <span className="stat-number">5000+</span>
              <span className="stat-label">Happy Users</span>
            </div>
            <div className="stat">
              <span className="stat-number">0%</span>
              <span className="stat-label">Platform Fee</span>
            </div>
          </div>
        </div>

        <div className="login-container">
          <div className="login-tabs">
            <button
              className={activeLogin === "user" ? "active" : ""}
              onClick={() => setActiveLogin("user")}
            >
              User Login
            </button>
            <button
              className={activeLogin === "driver" ? "active" : ""}
              onClick={() => setActiveLogin("driver")}
            >
              Driver Login
            </button>
          </div>
          <LoginForm 
            activeLogin={activeLogin} 
            onSubmit={handleLogin}
            plugAvailable={plugAvailable}
          />
        </div>
      </div>
      
      {/* Blockchain features section */}
      <div className="blockchain-section">
        <h2>How we are Different?</h2>
        <div className="blockchain-features">
          <div className="feature">
            <h3>Secure Payments</h3>
            <p>
              Transparent and secure payment processing using ICP blockchain
              technology
            </p>
          </div>
          <div className="feature">
            <h3>Cheapest Ride</h3>
            <p>On our platform you will get the cheapest ride avaliable.</p>
          </div>
          <div className="feature">
            <h3>Eco Freindly</h3>
            <p>
              We help reduce carbon emissions because we believe in the 'less
              vehicle, more rides' concept through carpooling
            </p>
          </div>
        </div>
      </div>

      <footer className="footer">
        <p>Powered by ICP Blockchain and developed by Instant Car Pool team </p>
      </footer>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/home" element={<UserHome />} />
          <Route path="/driver-dashboard" element={<DriverHome />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;


