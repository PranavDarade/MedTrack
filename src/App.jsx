import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Home from './components/Home/Home';
import Login from './components/Auth/Login';
import Signup from './components/Auth/Signup';
import Dashboard from './components/Dashboard/Dashboard';
import './App.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error:', error);
    console.error('Error Info:', errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <div>Something went wrong. Please refresh the page.</div>;
    }
    return this.props.children;
  }
}

const ProtectedRoute = ({ children, user }) => {
  const location = useLocation();
  
  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  return children;
};

const AuthRoute = ({ children, user }) => {
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

function App() {
  const MEDICINE_TIMINGS = [
    'Before Breakfast',
    'After Breakfast',
    'Before Lunch',
    'After Lunch',
    'Before Dinner',
    'After Dinner'
  ];

  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [authView, setAuthView] = useState('login'); // 'login' or 'signup'

  const [reminders, setReminders] = useState(() => {
    try {
      const saved = localStorage.getItem('medicineReminders');
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error('Error loading reminders:', error);
      return [];
    }
  });
  const [newReminder, setNewReminder] = useState({
    medicineName: '',
    time: '',
    frequency: 'daily',
    lastTriggered: null,
    stock: '',
    pillsPerDose: '',
    medicineImage: null,
    guardianPhone: '',
    alternativeMedicines: [],
    timings: []
  });
  const [permission, setPermission] = useState('default');

  useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
    }
  }, [user]);

  useEffect(() => {
    localStorage.setItem('medicineReminders', JSON.stringify(reminders));
  }, [reminders]);

  useEffect(() => {
    // Check for reminders every second
    const interval = setInterval(() => {
      const now = new Date();
      const currentTime = now.toLocaleTimeString('en-US', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit'
      });

      reminders.forEach(reminder => {
        const reminderTime = reminder.time;
        const currentTimeWithoutSeconds = currentTime.slice(0, -3);
        
        if (reminderTime === currentTimeWithoutSeconds) {
          const lastTriggered = reminder.lastTriggered;
          const today = new Date().toLocaleDateString();

          // Check if reminder hasn't been triggered today
          if (lastTriggered !== today) {
            triggerReminder(reminder);
            
            // Update the last triggered date
            const updatedReminders = reminders.map(r => {
              if (r === reminder) {
                return { ...r, lastTriggered: today };
              }
              return r;
            });
            setReminders(updatedReminders);
          }
        }
      });
    }, 1000); // Check every second

    return () => clearInterval(interval);
  }, [reminders]);

  const triggerReminder = (reminder) => {
    // Show notification
    if (permission === 'granted') {
      try {
        const notification = new Notification('Medicine Reminder', {
          body: `Time to take your ${reminder.medicineName} (${reminder.stock} pills remaining)`,
          icon: '/vite.svg', // Using vite.svg as fallback
          silent: false
        });

        notification.onclick = () => {
          window.focus();
          notification.close();
        };
      } catch (error) {
        console.error('Notification error:', error);
      }
    }

    // Play voice reminder
    try {
      speak(`Time to take your ${reminder.medicineName}. You have ${reminder.stock} pills remaining.`);
    } catch (error) {
      console.error('Speech synthesis error:', error);
    }

    // Play a gentle alert sound
    try {
      const audio = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');
      audio.play().catch(e => console.log('Audio play failed:', e));
    } catch (error) {
      console.error('Audio play error:', error);
    }
  };

  const speak = (text) => {
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.8;
    utterance.pitch = 1;
    utterance.volume = 1;
    
    window.speechSynthesis.speak(utterance);
    
    const repeatUtterance = new SpeechSynthesisUtterance(text);
    repeatUtterance.rate = 0.8;
    repeatUtterance.pitch = 1;
    repeatUtterance.volume = 1;
    
    setTimeout(() => {
      window.speechSynthesis.speak(repeatUtterance);
    }, 3000);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewReminder(prev => ({
          ...prev,
          medicineImage: reader.result
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const addAlternativeMedicine = () => {
    setNewReminder(prev => ({
      ...prev,
      alternativeMedicines: [
        ...(prev.alternativeMedicines || []),
        { name: '', stock: 0, pillsPerDose: 1 }
      ]
    }));
  };

  const updateAlternativeMedicine = (index, field, value) => {
    setNewReminder(prev => ({
      ...prev,
      alternativeMedicines: (prev.alternativeMedicines || []).map((med, i) => 
        i === index ? { ...med, [field]: field === 'stock' || field === 'pillsPerDose' ? parseInt(value) || 0 : value } : med
      )
    }));
  };

  const removeAlternativeMedicine = (index) => {
    setNewReminder(prev => ({
      ...prev,
      alternativeMedicines: (prev.alternativeMedicines || []).filter((_, i) => i !== index)
    }));
  };

  const handleTimingChange = (timing) => {
    setNewReminder(prev => ({
      ...prev,
      timings: prev.timings.includes(timing)
        ? prev.timings.filter(t => t !== timing)
        : [...prev.timings, timing]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newReminder.medicineName || !newReminder.time || !newReminder.stock || !newReminder.pillsPerDose || (newReminder.timings || []).length === 0 || !newReminder.guardianPhone) {
      alert('Please fill in all required fields and select at least one timing');
      return;
    }

    // Ensure phone number has country code
    const guardianPhone = newReminder.guardianPhone.startsWith('+') 
      ? newReminder.guardianPhone 
      : `+${newReminder.guardianPhone}`;

    const reminder = {
      id: Date.now(),
      ...newReminder,
      guardianPhone,
      stock: parseInt(newReminder.stock),
      pillsPerDose: parseInt(newReminder.pillsPerDose),
      active: false,
      upcoming: false
    };

    try {
      // Set up the reminder timer with Twilio
      const response = await fetch('http://localhost:5001/api/reminders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reminderId: reminder.id,
          medicineName: reminder.medicineName,
          guardianPhone: reminder.guardianPhone,
          time: reminder.time
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to set up reminder timer');
      }

      // If timer setup was successful, add to local state
      setReminders([...reminders, reminder]);
      speak(`Reminder set for ${reminder.medicineName} at ${formatTime(reminder.time)}. Take ${(reminder.timings || []).join(', ')}. Initial stock is ${reminder.stock} pills`);
      
      setNewReminder({
        medicineName: '',
        time: '',
        stock: '',
        pillsPerDose: '',
        image: null,
        timings: [],
        guardianPhone: '',
        alternativeMedicines: []
      });

    } catch (error) {
      console.error('Error setting up reminder:', error);
      alert('Failed to set up reminder timer. Please try again.');
    }
  };

  const formatTime = (time) => {
    try {
      const [hours, minutes] = time.split(':');
      const date = new Date();
      date.setHours(hours);
      date.setMinutes(minutes);
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit', 
        hour12: true 
      });
    } catch (e) {
      return time;
    }
  };

  const deleteReminder = (index) => {
    const updatedReminders = reminders.filter((_, i) => i !== index);
    setReminders(updatedReminders);
    speak("Reminder deleted");
  };

  const testVoice = (medicineName) => {
    speak(`Time to take your ${medicineName}`);
  };

  const markAsTaken = async (index) => {
    try {
      // Cancel the timer in backend
      const response = await fetch(`http://localhost:5001/api/reminders/${reminders[index].id}/taken`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to cancel reminder timer');
      }

      // Update reminder stock
      const updatedReminders = reminders.map((reminder, i) => {
        if (i === index) {
          const newStock = reminder.stock - reminder.pillsPerDose;
          const updatedReminder = {
            ...reminder,
            stock: newStock
          };
          
          // Announce the remaining stock
          if (newStock <= 0) {
            const availableAlternative = (reminder.alternativeMedicines || []).find(alt => alt.stock > 0);
            if (availableAlternative) {
              speak(`${reminder.medicineName} is out of stock. You can take ${availableAlternative.name} as an alternative. ${availableAlternative.stock} pills remaining.`);
            } else {
              speak(`${reminder.medicineName} is out of stock. No alternatives available. Please refill soon.`);
            }
          } else {
            speak(`Marked ${reminder.medicineName} as taken. ${newStock} pills remaining.`);
          }
          
          // Show low stock warning
          if (newStock <= reminder.pillsPerDose * 5) {
            const notification = new Notification('Low Medicine Stock', {
              body: `Only ${newStock} pills remaining for ${reminder.medicineName}. Please refill soon.`,
              icon: '/medicine-icon.png'
            });
          }
          
          return updatedReminder;
        }
        return reminder;
      });
      
      setReminders(updatedReminders);
    } catch (error) {
      console.error('Error marking reminder as taken:', error);
      alert('Failed to mark reminder as taken. Please try again.');
    }
  };

  const updateStock = (index, newStock) => {
    const updatedReminders = reminders.map((reminder, i) => {
      if (i === index) {
        return { ...reminder, stock: parseInt(newStock) };
      }
      return reminder;
    });
    setReminders(updatedReminders);
    speak(`Updated ${reminders[index].medicineName} stock to ${newStock} pills`);
  };

  const getTimeStatus = (reminder) => {
    const now = new Date();
    const [hours, minutes] = reminder.time.split(':');
    const reminderTime = new Date();
    reminderTime.setHours(hours, minutes, 0);

    const timeDiff = reminderTime - now;
    const minutesDiff = Math.floor(timeDiff / (1000 * 60));

    if (minutesDiff > 0 && minutesDiff <= 30) {
      return 'upcoming';
    } else if (minutesDiff <= 0 && minutesDiff > -30) {
      return 'active';
    }
    return 'normal';
  };

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleSignup = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('token');
  };

  const handleGetStarted = () => {
    setAuthView('signup');
  };

  return (
    <ErrorBoundary>
      <Router>
        <Routes>
          <Route
            path="/"
            element={
              <AuthRoute user={user}>
                <Home onGetStarted={handleGetStarted} />
              </AuthRoute>
            }
          />
          <Route
            path="/auth"
            element={
              <AuthRoute user={user}>
                {authView === 'login' ? (
                  <Login
                    onLogin={handleLogin}
                    onSwitchToSignup={() => setAuthView('signup')}
                  />
                ) : (
                  <Signup
                    onSignup={handleSignup}
                    onSwitchToLogin={() => setAuthView('login')}
                  />
                )}
              </AuthRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute user={user}>
                <Dashboard user={user} onLogout={handleLogout} />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
