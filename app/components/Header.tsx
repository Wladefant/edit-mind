import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { IndexIcon } from '@/app/icons/IndexIcon';
import { VideoIcon } from '@/app/icons/VideoIcon';
import { GearIcon } from '@/app/icons/GearIcon';

const navLinks = [
  { to: '/settings', icon: <GearIcon />, text: 'Settings' },
  { to: '/training', icon: <IndexIcon />, text: 'Training' },
  { to: '/videos', icon: <VideoIcon />, text: 'Videos' },
  { to: '/chat', icon: <VideoIcon />, text: 'Chat', className: 'secondary' },
  { to: '/', icon: <IndexIcon />, text: 'Add Videos' },
];

export const Header: React.FC = () => {
  const location = useLocation();

  const getNavLinks = () => {
    const isChatPage = location.pathname === '/chat';
    const isIndexingPage = location.pathname === '/';

    if (isChatPage) {
      return navLinks.filter((link) => link.to !== '/chat');
    }
    if (isIndexingPage) {
      return navLinks.filter((link) => link.to !== '/');
    }
    return navLinks;
  };

  return (
    <header className="app-header">
      <div className="header-content">
        <div className="header-left">
          <div className="app-logo">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="8" fill="url(#gradient)" />
              <path d="M16 8L20 14H12L16 8Z" fill="white" opacity="0.9" />
              <path d="M16 24L12 18H20L16 24Z" fill="white" opacity="0.9" />
              <defs>
                <linearGradient id="gradient" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                  <stop stopColor="var(--welcome-c-variant, #007aff)" />
                  <stop offset="1" stopColor="#5AC8FA" />
                </linearGradient>
              </defs>
            </svg>
            <div className="app-info">
              <h1 className="app-title">Edit Mind</h1>
              <p className="app-subtitle">AI-Powered Video Manager</p>
            </div>
          </div>
        </div>
        <div className="header-right">
          {getNavLinks().map((link) => (
            <Link to={link.to} key={link.to} className={`header-button ${link.className || ''}`}>
              {link.icon}
              {link.text}
            </Link>
          ))}
        </div>
      </div>
    </header>
  );
};
