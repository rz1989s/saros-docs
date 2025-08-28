import React, { createContext, useContext, useEffect, useState } from 'react';
import { motion } from 'framer-motion';

// Collaboration Context for live features
interface CollaborationContextType {
  onlineUsers: number;
  notifications: string[];
  addNotification: (message: string) => void;
}

const CollaborationContext = createContext<CollaborationContextType>({
  onlineUsers: 1,
  notifications: [],
  addNotification: () => {},
});

export const useCollaboration = () => useContext(CollaborationContext);

// Global floating elements and providers
export default function Root({ children }: { children: React.ReactNode }) {
  const [onlineUsers] = useState(() => Math.floor(Math.random() * 12) + 3);
  const [notifications, setNotifications] = useState<string[]>([]);
  
  const addNotification = (message: string) => {
    setNotifications(prev => [...prev, message]);
    setTimeout(() => {
      setNotifications(prev => prev.slice(1));
    }, 4000);
  };

  // Welcome notification
  useEffect(() => {
    const timeout = setTimeout(() => {
      addNotification('🎉 Welcome to Dyte-powered Saros docs! Live collaboration enabled.');
    }, 2000);
    return () => clearTimeout(timeout);
  }, []);

  // Simulate random collaboration events
  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.7) {
        const events = [
          '👀 Someone is reading the TypeScript SDK docs',
          '💡 New code example was highlighted',
          '🚀 API playground was just tested',
          '📝 Documentation was bookmarked',
        ];
        addNotification(events[Math.floor(Math.random() * events.length)]);
      }
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  return (
    <CollaborationContext.Provider value={{ onlineUsers, notifications, addNotification }}>
      {/* Floating Online Users Counter */}
      <motion.div
        className="dyte-online-counter"
        initial={{ scale: 0, x: 100 }}
        animate={{ scale: 1, x: 0 }}
        transition={{ delay: 1, duration: 0.5 }}
        style={{
          position: 'fixed',
          top: '80px',
          right: '20px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          padding: '8px 12px',
          borderRadius: '20px',
          fontSize: '12px',
          fontWeight: '600',
          zIndex: 9999,
          boxShadow: '0 4px 20px rgba(102, 126, 234, 0.3)',
          backdropFilter: 'blur(10px)',
        }}
      >
        🟢 {onlineUsers} online
      </motion.div>

      {/* Live Notifications */}
      <div
        style={{
          position: 'fixed',
          top: '120px',
          right: '20px',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          maxWidth: '300px',
        }}
      >
        {notifications.map((notification, index) => (
          <motion.div
            key={index}
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 300, opacity: 0 }}
            style={{
              background: 'rgba(255, 255, 255, 0.95)',
              border: '1px solid rgba(102, 126, 234, 0.2)',
              borderRadius: '12px',
              padding: '12px',
              fontSize: '13px',
              color: '#333',
              boxShadow: '0 8px 32px rgba(102, 126, 234, 0.2)',
              backdropFilter: 'blur(10px)',
            }}
          >
            {notification}
          </motion.div>
        ))}
      </div>

      {/* Floating Action Buttons */}
      <motion.div
        className="dyte-fab-container"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 1.5, duration: 0.3 }}
        style={{
          position: 'fixed',
          bottom: '30px',
          right: '30px',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        {/* Quick Search FAB */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => addNotification('🔍 Quick search activated!')}
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            border: 'none',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            fontSize: '20px',
            cursor: 'pointer',
            boxShadow: '0 8px 32px rgba(102, 126, 234, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          🔍
        </motion.button>

        {/* Live Chat FAB */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => addNotification('💬 Live chat opened!')}
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            border: 'none',
            background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
            color: 'white',
            fontSize: '20px',
            cursor: 'pointer',
            boxShadow: '0 8px 32px rgba(118, 75, 162, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          💬
        </motion.button>
      </motion.div>

      {/* Global animated cursor followers for collaboration effect */}
      <div id="collaboration-cursors" />

      {children}
    </CollaborationContext.Provider>
  );
}