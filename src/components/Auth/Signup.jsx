import React, { useState } from 'react';
import './Auth.css';

const Signup = ({ onSwitchToLogin, onSignup }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    age: '',
    gender: 'prefer-not-to-say',
    patientName: '',
    guardianPhone: ''
  });
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validate phone number
    const phoneRegex = /^\+\d{1,}$/;
    if (!phoneRegex.test(formData.guardianPhone)) {
      setError('Phone number must start with + followed by country code (e.g., +1234567890)');
      return;
    }

    // Validate age
    const age = parseInt(formData.age);
    if (isNaN(age) || age < 0 || age > 150) {
      setError('Please enter a valid age');
      return;
    }

    try {
      const response = await fetch('http://localhost:5001/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          age: parseInt(formData.age),
          gender: formData.gender,
          patientName: formData.patientName,
          guardianPhone: formData.guardianPhone
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Signup failed');
      }

      // Store the token
      localStorage.setItem('token', data.token);
      
      // Call the onSignup callback
      onSignup(data.user);
    } catch (err) {
      setError(err.message || 'Failed to sign up. Please try again.');
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h2>Create Account</h2>
        <p className="auth-subtitle">Sign up to start managing your medicine reminders</p>
        
        {error && <div className="auth-error">{error}</div>}
        
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="name">Guardian's Full Name</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="Enter guardian's full name"
            />
          </div>

          <div className="form-group">
            <label htmlFor="patientName">Patient's Full Name</label>
            <input
              type="text"
              id="patientName"
              name="patientName"
              value={formData.patientName}
              onChange={handleChange}
              required
              placeholder="Enter patient's full name"
            />
          </div>

          <div className="form-group">
            <label htmlFor="age">Patient's Age</label>
            <input
              type="number"
              id="age"
              name="age"
              value={formData.age}
              onChange={handleChange}
              required
              min="0"
              max="150"
              placeholder="Enter patient's age"
            />
          </div>

          <div className="form-group">
            <label htmlFor="gender">Patient's Gender</label>
            <select
              id="gender"
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              required
            >
              <option value="prefer-not-to-say">Prefer not to say</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="guardianPhone">Guardian's Phone Number</label>
            <input
              type="tel"
              id="guardianPhone"
              name="guardianPhone"
              value={formData.guardianPhone}
              onChange={handleChange}
              required
              placeholder="+1234567890"
            />
            <small className="form-hint">Include country code (e.g., +1 for US)</small>
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="Enter your email"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="Create a password"
              minLength="6"
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              placeholder="Confirm your password"
              minLength="6"
            />
          </div>
          
          <button type="submit" className="auth-button">
            Sign Up
          </button>
        </form>
        
        <div className="auth-switch">
          Already have an account?{' '}
          <button onClick={onSwitchToLogin} className="auth-switch-button">
            Log In
          </button>
        </div>
      </div>
    </div>
  );
};

export default Signup; 