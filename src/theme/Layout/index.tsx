import React, { type ReactNode, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Canvas } from '@react-three/fiber';
import { Sphere, MeshDistortMaterial } from '@react-three/drei';
import clsx from 'clsx';
import ErrorBoundary from '@docusaurus/ErrorBoundary';
import {
  PageMetadata,
  SkipToContentFallbackId,
  ThemeClassNames,
} from '@docusaurus/theme-common';
import { useKeyboardNavigation } from '@docusaurus/theme-common/internal';
import SkipToContent from '@theme/SkipToContent';
import AnnouncementBar from '@theme/AnnouncementBar';
import Navbar from '@theme/Navbar';
import Footer from '@theme/Footer';
import LayoutProvider from '@theme/Layout/Provider';
import ErrorPageContent from '@theme/ErrorPageContent';
import type { Props } from '@theme/Layout';
import { useCollaboration } from '@theme/Root';
import styles from './styles.module.css';

// 3D Background Component
function BackgroundSphere() {
  return (
    <Canvas
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: -1,
        opacity: 0.1,
      }}
    >
      <Sphere args={[1, 100, 200]} scale={2.4}>
        <MeshDistortMaterial
          color="#667eea"
          attach="material"
          distort={0.3}
          speed={1.5}
        />
      </Sphere>
    </Canvas>
  );
}

// Floating Navigation Panel
function FloatingNavPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const { addNotification } = useCollaboration();

  return (
    <motion.div
      className="dyte-floating-nav"
      initial={{ x: -80 }}
      animate={{ x: isOpen ? 0 : -60 }}
      style={{
        position: 'fixed',
        left: 0,
        top: '50%',
        transform: 'translateY(-50%)',
        zIndex: 9998,
        background: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(20px)',
        borderRadius: '0 20px 20px 0',
        padding: '20px 10px',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        boxShadow: '0 8px 32px rgba(102, 126, 234, 0.3)',
      }}
    >
      <motion.button
        whileHover={{ scale: 1.1 }}
        onClick={() => {
          setIsOpen(!isOpen);
          addNotification('🚀 Quick navigation toggled!');
        }}
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          border: 'none',
          color: 'white',
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          cursor: 'pointer',
          marginBottom: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        ⚡
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
          >
            {['📚', '🔧', '🎮', '🌟'].map((emoji, i) => (
              <motion.button
                key={i}
                whileHover={{ scale: 1.1, rotate: 10 }}
                onClick={() => addNotification(`${emoji} Quick action activated!`)}
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  color: 'white',
                  width: '35px',
                  height: '35px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '16px',
                }}
              >
                {emoji}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Live Preview Panel (for split-screen)
function LivePreviewPanel({ show }: { show: boolean }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          style={{
            position: 'fixed',
            right: 0,
            top: '60px',
            width: '40%',
            height: 'calc(100vh - 60px)',
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(102, 126, 234, 0.2)',
            borderRadius: '20px 0 0 20px',
            zIndex: 9997,
            padding: '20px',
            overflow: 'hidden',
          }}
        >
          <div style={{ 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            padding: '15px',
            borderRadius: '10px',
            marginBottom: '20px',
            textAlign: 'center',
            fontWeight: '600'
          }}>
            🎥 Live Preview & Collaboration
          </div>
          
          <iframe
            src="https://codesandbox.io/embed/react-new"
            style={{
              width: '100%',
              height: '70%',
              border: 'none',
              borderRadius: '10px',
            }}
            title="Live Code Preview"
          />
          
          <motion.div
            animate={{ y: [0, -5, 0] }}
            transition={{ repeat: Infinity, duration: 2 }}
            style={{
              marginTop: '20px',
              padding: '15px',
              background: 'rgba(102, 126, 234, 0.1)',
              borderRadius: '10px',
              textAlign: 'center',
              fontSize: '14px',
              color: '#667eea',
            }}
          >
            ✨ Real-time collaboration active
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function Layout(props: Props): ReactNode {
  const {
    children,
    noFooter,
    wrapperClassName,
    title,
    description,
  } = props;

  const [showLivePreview, setShowLivePreview] = useState(false);
  const { addNotification } = useCollaboration();

  useKeyboardNavigation();

  // Keyboard shortcut for toggling live preview
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'p') {
        e.preventDefault();
        setShowLivePreview(!showLivePreview);
        addNotification('🎬 Live preview toggled!');
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showLivePreview, addNotification]);

  return (
    <LayoutProvider>
      <PageMetadata title={title} description={description} />
      
      {/* 3D Animated Background */}
      <BackgroundSphere />

      <SkipToContent />

      {/* Glassmorphic Announcement Bar */}
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        <AnnouncementBar />
      </motion.div>

      {/* Enhanced Floating Navbar */}
      <motion.div
        initial={{ y: -80 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.8, type: 'spring', stiffness: 100 }}
        className="dyte-navbar-wrapper"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 9999,
        }}
      >
        <Navbar />
      </motion.div>

      {/* Floating Navigation Panel */}
      <FloatingNavPanel />

      {/* Main Content Area with Split-Screen Support */}
      <motion.div
        id={SkipToContentFallbackId}
        className={clsx(
          ThemeClassNames.layout.main.container,
          ThemeClassNames.wrapper.main,
          styles.mainWrapper,
          wrapperClassName,
          'dyte-main-content'
        )}
        style={{
          marginRight: showLivePreview ? '40%' : '0',
          transition: 'margin-right 0.3s ease',
        }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
      >
        <ErrorBoundary fallback={(params) => <ErrorPageContent {...params} />}>
          {/* Page Transition Wrapper */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.4 }}
          >
            {children}
          </motion.div>
        </ErrorBoundary>
      </motion.div>

      {/* Live Preview Panel */}
      <LivePreviewPanel show={showLivePreview} />

      {/* Toggle Live Preview Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => {
          setShowLivePreview(!showLivePreview);
          addNotification('🎬 Split-screen mode toggled!');
        }}
        style={{
          position: 'fixed',
          top: '50%',
          right: showLivePreview ? '40%' : '20px',
          transform: 'translateY(-50%)',
          zIndex: 9998,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          border: 'none',
          color: 'white',
          width: '50px',
          height: '100px',
          borderRadius: showLivePreview ? '10px 0 0 10px' : '10px',
          cursor: 'pointer',
          fontSize: '20px',
          boxShadow: '0 8px 32px rgba(102, 126, 234, 0.4)',
          transition: 'right 0.3s ease',
        }}
      >
        {showLivePreview ? '✕' : '🎥'}
      </motion.button>

      {/* Enhanced Footer with Collaboration Stats */}
      {!noFooter && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <Footer />
        </motion.div>
      )}

      {/* Floating Help Widget */}
      <motion.div
        className="dyte-help-widget"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 2, duration: 0.5 }}
        whileHover={{ scale: 1.1 }}
        onClick={() => addNotification('💡 Press Ctrl+P for live preview mode!')}
        style={{
          position: 'fixed',
          bottom: '100px',
          right: '30px',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
          color: 'white',
          border: 'none',
          cursor: 'pointer',
          fontSize: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 8px 32px rgba(118, 75, 162, 0.4)',
          zIndex: 9999,
        }}
      >
        💡
      </motion.div>
    </LayoutProvider>
  );
}
