import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Home.css';

const Home = ({ onGetStarted }) => {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    onGetStarted(); // This sets authView to 'signup'
    navigate('/auth'); // Navigate to auth page
  };

  return (
    <div className="home-container">
      <nav className="home-nav">
        <div className="nav-logo">MedTrack</div>
        <button onClick={handleGetStarted} className="nav-button">Get Started</button>
      </nav>

      <main className="home-main">
        <div className="hero-section">
          <h1>Never Miss Your Medicine Again</h1>
          <p className="hero-subtitle">
            Smart reminders with voice alerts and SMS notifications for you and your loved ones
          </p>
          <div className="hero-buttons">
            <button onClick={handleGetStarted} className="primary-button">
              Start Now
            </button>
            <a href="#features" className="secondary-button">
              Learn More
            </a>
          </div>
        </div>

        <section id="features" className="features-section">
          <h2>Key Features</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">🔔</div>
              <h3>Voice Reminders</h3>
              <p>Clear voice alerts when it's time to take your medicine</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📱</div>
              <h3>SMS Notifications</h3>
              <p>Guardian notifications if medication is missed</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📊</div>
              <h3>Stock Management</h3>
              <p>Track your medicine inventory and get refill alerts</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🔄</div>
              <h3>Alternative Medicines</h3>
              <p>Manage alternative medications for each prescription</p>
            </div>
          </div>
        </section>

        <section className="cta-section">
          <h2>Ready to Start?</h2>
          <p>Join thousands of users who never miss their medications</p>
          <button onClick={handleGetStarted} className="primary-button">
            Create Free Account
          </button>
        </section>
      </main>

      <footer className="home-footer">
        <div className="footer-content">
          <div className="footer-section">
            <h4>MedTrack</h4>
            <p>Your personal medicine reminder assistant</p>
          </div>
          <div className="footer-section">
            <h4>Contact</h4>
            <p>support@medtrack.com</p>
            <p>1-800-MED-HELP</p>
          </div>
          <div className="footer-section">
            <h4>Legal</h4>
            <a href="/privacy">Privacy Policy</a>
            <a href="/terms">Terms of Service</a>
          </div>
        </div>
        <div className="footer-bottom">
          © 2024 MedTrack. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default Home; 