import React, { useState, useEffect } from 'react';
import './Dashboard.css';

const Dashboard = ({ user, onLogout }) => {
  const MEDICINE_TIMINGS = [
    'Before Breakfast',
    'After Breakfast',
    'Before Lunch',
    'After Lunch',
    'Before Dinner',
    'After Dinner'
  ];

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

  // Request notification permission on component mount
  useEffect(() => {
    if ('Notification' in window) {
      Notification.requestPermission().then(perm => {
        setPermission(perm);
      });
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('medicineReminders', JSON.stringify(reminders));
  }, [reminders]);

  useEffect(() => {
    // Check for reminders every minute
    const interval = setInterval(() => {
      const now = new Date();
      const currentTime = now.toLocaleTimeString('en-US', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit'
      });

      reminders.forEach(reminder => {
        const reminderTime = reminder.time;
        
        if (reminderTime === currentTime) {
          const lastTriggered = reminder.lastTriggered;
          const today = new Date().toLocaleDateString();

          // Check if reminder hasn't been triggered today
          if (lastTriggered !== today) {
            triggerReminder(reminder);
            
            // Update the last triggered date
            const updatedReminders = reminders.map(r => {
              if (r.id === reminder.id) {
                return { ...r, lastTriggered: today };
              }
              return r;
            });
            setReminders(updatedReminders);
            localStorage.setItem('medicineReminders', JSON.stringify(updatedReminders));
          }
        }
      });
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [reminders]);

  const triggerReminder = (reminder) => {
    // Show notification
    if ('Notification' in window && permission === 'granted') {
      try {
        const notification = new Notification('Medicine Reminder', {
          body: `Time to take your ${reminder.medicineName}. ${reminder.pillsPerDose} pill(s) ${reminder.timings.join(', ')}`,
          icon: reminder.medicineImage || '/medicine-icon.png',
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
    speakReminder(reminder);

    // Play a gentle alert sound
    try {
      const audio = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');
      audio.play().catch(e => console.log('Audio play failed:', e));
    } catch (error) {
      console.error('Audio play error:', error);
    }
  };

  const speakReminder = (reminder) => {
    try {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      // Create the reminder message
      const message = `Time to take your ${reminder.medicineName}. ${reminder.pillsPerDose} pill${reminder.pillsPerDose > 1 ? 's' : ''} ${reminder.timings.join(', ')}. You have ${reminder.stock} pills remaining.`;

      // Create and configure the utterance
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.rate = 0.9;  // Slightly slower rate for better clarity
      utterance.pitch = 1;
      utterance.volume = 1;
      
      // Speak the message
      window.speechSynthesis.speak(utterance);

      // Repeat the message after 3 seconds
      setTimeout(() => {
        const repeatUtterance = new SpeechSynthesisUtterance(message);
        repeatUtterance.rate = 0.9;
        repeatUtterance.pitch = 1;
        repeatUtterance.volume = 1;
        window.speechSynthesis.speak(repeatUtterance);
      }, 3000);

    } catch (error) {
      console.error('Speech synthesis error:', error);
    }
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
    if (!newReminder.medicineName || !newReminder.time || !newReminder.stock || !newReminder.pillsPerDose || (newReminder.timings || []).length === 0) {
      alert('Please fill in all required fields and select at least one timing');
      return;
    }

    const reminder = {
      id: Date.now(),
      ...newReminder,
      guardianPhone: user.guardianPhone,
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
          guardianPhone: user.guardianPhone,
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
        alternativeMedicines: []
      });

    } catch (error) {
      console.error('Error setting up reminder:', error);
      alert('Failed to set up reminder timer. Please try again.');
    }
  };

  const speak = (text) => {
    try {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 1;
      
      window.speechSynthesis.speak(utterance);
    } catch (error) {
      console.error('Speech synthesis error:', error);
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

  const markAsTaken = async (index) => {
    try {
      const reminder = reminders[index];
      if (!reminder) {
        throw new Error('Reminder not found');
      }

      // Calculate new stock before API call
      const newStock = reminder.stock - reminder.pillsPerDose;
      if (newStock < 0) {
        alert('Not enough pills in stock!');
        return;
      }

      // Cancel the timer in backend
      const response = await fetch(`http://localhost:5001/api/reminders/${reminder.id}/taken`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          newStock: newStock,
          pillsTaken: reminder.pillsPerDose
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to mark reminder as taken');
      }

      // Update reminder stock
      const updatedReminders = reminders.map((r, i) => {
        if (i === index) {
          const updatedReminder = {
            ...r,
            stock: newStock,
            lastTaken: new Date().toISOString()
          };
          
          // Handle low stock notifications
          if (newStock <= 0) {
            const availableAlternative = (r.alternativeMedicines || []).find(alt => alt.stock > 0);
            if (availableAlternative) {
              speak(`${r.medicineName} is out of stock. You can take ${availableAlternative.name} as an alternative. ${availableAlternative.stock} pills remaining.`);
            } else {
              speak(`${r.medicineName} is out of stock. No alternatives available. Please refill soon.`);
            }

            // Show out of stock notification
            if ('Notification' in window && permission === 'granted') {
              new Notification('Medicine Out of Stock', {
                body: `${r.medicineName} is out of stock. Please refill soon.`,
                icon: '/medicine-icon.png'
              });
            }
          } else {
            speak(`Marked ${r.medicineName} as taken. ${newStock} pills remaining.`);
            
            // Show low stock notification
            if (newStock <= r.pillsPerDose * 5 && 'Notification' in window && permission === 'granted') {
              new Notification('Low Medicine Stock', {
                body: `Only ${newStock} pills remaining for ${r.medicineName}. Please refill soon.`,
                icon: '/medicine-icon.png'
              });
            }
          }
          
          return updatedReminder;
        }
        return r;
      });
      
      setReminders(updatedReminders);
      localStorage.setItem('medicineReminders', JSON.stringify(updatedReminders));

    } catch (error) {
      console.error('Error marking reminder as taken:', error);
      alert(error.message || 'Failed to mark reminder as taken. Please try again.');
    }
  };

  const deleteReminder = (index) => {
    const updatedReminders = reminders.filter((_, i) => i !== index);
    setReminders(updatedReminders);
    speak("Reminder deleted");
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

  return (
    <div className="dashboard-container">
      <nav className="dashboard-nav">
        <div className="nav-logo">MedTrack</div>
        <div className="nav-user">
          <span>Welcome, {user.name}</span>
          <button onClick={onLogout} className="logout-button">Logout</button>
        </div>
      </nav>

      <div className="dashboard-content">
        <div className="reminders-section">
          <h2>Add New Reminder</h2>
          <form onSubmit={handleSubmit} className="reminder-form">
            <div className="form-group">
              <label htmlFor="medicineName">Medicine Name:</label>
              <input
                type="text"
                id="medicineName"
                value={newReminder.medicineName}
                onChange={(e) => setNewReminder({...newReminder, medicineName: e.target.value})}
                placeholder="Enter medicine name"
              />
            </div>

            <div className="image-upload-container">
              <label className="image-upload-label">Medicine Image</label>
              <div className="image-upload-area">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  id="medicine-image"
                />
                <span className="upload-icon">📷</span>
                <p className="upload-text">Click or drag image here</p>
                <p className="upload-hint">Supported formats: JPG, PNG, GIF</p>
              </div>
              {newReminder.medicineImage && (
                <div className="image-preview">
                  <img src={newReminder.medicineImage} alt="Medicine preview" />
                  <button
                    type="button"
                    className="image-preview-remove"
                    onClick={() => setNewReminder({...newReminder, medicineImage: null})}
                  >
                    ×
                  </button>
                </div>
              )}
            </div>

            <div className="form-group">
              <label>When to take:</label>
              <div className="timing-checkboxes">
                {MEDICINE_TIMINGS.map(timing => (
                  <label key={timing} className="timing-label">
                    <input
                      type="checkbox"
                      checked={newReminder.timings.includes(timing)}
                      onChange={() => handleTimingChange(timing)}
                    />
                    {timing}
                  </label>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="time">Time:</label>
              <input
                type="time"
                id="time"
                value={newReminder.time}
                onChange={(e) => setNewReminder({...newReminder, time: e.target.value})}
              />
            </div>

            <div className="form-group">
              <label htmlFor="stock">Number of Pills in Stock:</label>
              <input
                type="number"
                id="stock"
                min="0"
                value={newReminder.stock}
                onChange={(e) => setNewReminder({...newReminder, stock: e.target.value})}
                placeholder="Enter number of pills"
              />
            </div>

            <div className="form-group">
              <label htmlFor="pillsPerDose">Pills Per Dose:</label>
              <input
                type="number"
                id="pillsPerDose"
                min="1"
                value={newReminder.pillsPerDose}
                onChange={(e) => setNewReminder({...newReminder, pillsPerDose: e.target.value})}
                placeholder="Pills to take each time"
              />
            </div>

            <button type="submit" className="add-button">Add Reminder</button>
          </form>
        </div>

        <div className="reminders-list">
          <h2>Your Reminders</h2>
          {reminders.length === 0 ? (
            <p>No reminders set yet.</p>
          ) : (
            reminders.map((reminder, index) => (
              <div 
                key={index} 
                className={`reminder-item ${getTimeStatus(reminder)}`}
              >
                <div className="reminder-content">
                  {reminder.medicineImage && (
                    <img
                      src={reminder.medicineImage}
                      alt={reminder.medicineName}
                      className="reminder-image"
                    />
                  )}
                  <div className="reminder-details">
                    <h3>{reminder.medicineName}</h3>
                    <p>Time: {formatTime(reminder.time)}</p>
                    <p>Take: {(reminder.timings || []).join(', ')}</p>
                    <p className={`stock-info ${reminder.stock <= reminder.pillsPerDose * 5 ? 'low-stock' : ''}`}>
                      Stock: {reminder.stock} pills
                      {reminder.stock <= reminder.pillsPerDose * 5 && 
                        <span className="low-stock-warning"> (Low Stock!)</span>
                      }
                    </p>
                    <p>Pills per dose: {reminder.pillsPerDose}</p>
                  </div>
                </div>
                <div className="reminder-actions">
                  <button onClick={() => markAsTaken(index)} className="taken-button">
                    Mark as Taken
                  </button>
                  <div className="stock-update">
                    <input
                      type="number"
                      min="0"
                      value={reminder.stock}
                      onChange={(e) => updateStock(index, e.target.value)}
                      className="stock-input"
                    />
                  </div>
                  <button onClick={() => deleteReminder(index)} className="delete-button">
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 