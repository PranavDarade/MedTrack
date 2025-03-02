import { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [reminders, setReminders] = useState(() => {
    const saved = localStorage.getItem('medicineReminders');
    return saved ? JSON.parse(saved) : [];
  });
  const [newReminder, setNewReminder] = useState({
    medicineName: '',
    time: '',
    frequency: 'daily',
    lastTriggered: null,
    stock: 0,
    pillsPerDose: 1
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
      const notification = new Notification('Medicine Reminder', {
        body: `Time to take your ${reminder.medicineName} (${reminder.stock} pills remaining)`,
        icon: '/medicine-icon.png',
        silent: false
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    }

    // Play voice reminder
    speak(`Time to take your ${reminder.medicineName}. You have ${reminder.stock} pills remaining.`);

    // Play a gentle alert sound
    const audio = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');
    audio.play().catch(e => console.log('Audio play failed:', e));
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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newReminder.medicineName || !newReminder.time || !newReminder.stock || !newReminder.pillsPerDose) return;
    
    const reminder = {
      ...newReminder,
      lastTriggered: null,
      stock: parseInt(newReminder.stock),
      pillsPerDose: parseInt(newReminder.pillsPerDose)
    };
    
    setReminders([...reminders, reminder]);
    setNewReminder({
      medicineName: '',
      time: '',
      frequency: 'daily',
      lastTriggered: null,
      stock: 0,
      pillsPerDose: 1
    });

    speak(`Reminder set for ${newReminder.medicineName} at ${formatTime(newReminder.time)}. Initial stock is ${newReminder.stock} pills`);
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

  const markAsTaken = (index) => {
    const updatedReminders = reminders.map((reminder, i) => {
      if (i === index) {
        const newStock = reminder.stock - reminder.pillsPerDose;
        const updatedReminder = {
          ...reminder,
          stock: newStock
        };
        
        // Announce the remaining stock
        speak(`Marked ${reminder.medicineName} as taken. ${newStock} pills remaining.`);
        
        // Show low stock warning if less than 5 days worth of pills remaining
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
    <div className="app-container">
      <h1>Medicine Voice Reminder</h1>
      
      <div className="content-wrapper">
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

          <div className="form-group">
            <label htmlFor="frequency">Frequency:</label>
            <select
              id="frequency"
              value={newReminder.frequency}
              onChange={(e) => setNewReminder({...newReminder, frequency: e.target.value})}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>

          <button type="submit" className="add-button">Add Reminder</button>
        </form>

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
                <div className="reminder-info">
                  <h3>{reminder.medicineName}</h3>
                  <p>Time: {formatTime(reminder.time)}</p>
                  <p>Frequency: {reminder.frequency}</p>
                  <p className={`stock-info ${reminder.stock <= reminder.pillsPerDose * 5 ? 'low-stock' : ''}`}>
                    Stock: {reminder.stock} pills
                    {reminder.stock <= reminder.pillsPerDose * 5 && 
                      <span className="low-stock-warning"> (Low Stock!)</span>
                    }
                  </p>
                  <p>Pills per dose: {reminder.pillsPerDose}</p>
                </div>
                <div className="reminder-actions">
                  <button onClick={() => markAsTaken(index)} className="taken-button">
                    Mark as Taken
                  </button>
                  <button onClick={() => testVoice(reminder.medicineName)} className="test-button">
                    Test Voice
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
}

export default App;
