import React, { type ReactNode, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import NavbarLayout from '@theme/Navbar/Layout';
import NavbarContent from '@theme/Navbar/Content';
import { useCollaboration } from '@theme/Root';

// Live Activity Indicator
function LiveActivityIndicator() {
  const { onlineUsers } = useCollaboration();
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setPulse(true);
      setTimeout(() => setPulse(false), 200);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '6px 12px',
        background: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '20px',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        fontSize: '12px',
        fontWeight: '500',
      }}
      animate={{
        scale: pulse ? 1.05 : 1,
        boxShadow: pulse 
          ? '0 0 20px rgba(102, 126, 234, 0.5)' 
          : '0 4px 20px rgba(102, 126, 234, 0.2)',
      }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: '#4ade80',
        }}
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: [1, 0.7, 1] 
        }}
        transition={{ 
          repeat: Infinity, 
          duration: 2 
        }}
      />
      <span style={{ color: 'rgba(255, 255, 255, 0.9)' }}>
        {onlineUsers} live
      </span>
    </motion.div>
  );
}

// Quick Actions Panel
function QuickActionsPanel() {
  const { addNotification } = useCollaboration();
  const [showActions, setShowActions] = useState(false);

  return (
    <div style={{ position: 'relative' }}>
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setShowActions(!showActions)}
        style={{
          background: 'rgba(255, 255, 255, 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '50%',
          width: '40px',
          height: '40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: 'rgba(255, 255, 255, 0.9)',
          fontSize: '16px',
          backdropFilter: 'blur(10px)',
        }}
      >
        ⚡
      </motion.button>

      {showActions && (
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          style={{
            position: 'absolute',
            top: '50px',
            right: 0,
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(102, 126, 234, 0.2)',
            borderRadius: '12px',
            padding: '12px',
            minWidth: '200px',
            boxShadow: '0 8px 32px rgba(102, 126, 234, 0.3)',
          }}
        >
          {[
            { emoji: '🎨', label: 'Change Theme', action: () => addNotification('🎨 Theme customization opened!') },
            { emoji: '🚀', label: 'API Playground', action: () => addNotification('🚀 API playground launched!') },
            { emoji: '📊', label: 'Analytics', action: () => addNotification('📊 Analytics dashboard opened!') },
            { emoji: '🎯', label: 'Quick Tour', action: () => addNotification('🎯 Interactive tour started!') },
          ].map((item, i) => (
            <motion.button
              key={i}
              whileHover={{ x: 4, scale: 1.02 }}
              onClick={item.action}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                background: 'transparent',
                border: 'none',
                padding: '8px 12px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                color: '#333',
                textAlign: 'left',
                marginBottom: '4px',
              }}
            >
              <span>{item.emoji}</span>
              <span>{item.label}</span>
            </motion.button>
          ))}
        </motion.div>
      )}
    </div>
  );
}

export default function Navbar(): ReactNode {
  return (
    <motion.div
      style={{
        background: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 8px 32px rgba(102, 126, 234, 0.2)',
      }}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.8, type: 'spring', stiffness: 120 }}
    >
      <NavbarLayout>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          width: '100%', 
          justifyContent: 'space-between' 
        }}>
          <NavbarContent />
          
          {/* Enhanced right section with live features */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px',
            marginLeft: 'auto'
          }}>
            <LiveActivityIndicator />
            <QuickActionsPanel />
          </div>
        </div>
      </NavbarLayout>
    </motion.div>
  );
}
