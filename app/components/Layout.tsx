import React from 'react'
import '../styles/Layout.css'
import { Link, useLocation } from 'react-router-dom'
import { IndexIcon } from '../icons/IndexIcon'
import { VideoIcon } from '../icons/VideoIcon'

import { GearIcon } from '../icons/GearIcon'

interface LayoutProps {
  children: React.ReactNode
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation()
  const isChatPage = location.pathname === '/chat'
  const isIndexingPage = location.pathname === '/'

  return (
    <div className="app-layout">
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
            <Link to={'/settings'} className="header-button">
              <GearIcon />
              Settings
            </Link>
            <Link to={'/training'} className="header-button">
              <IndexIcon />
              Training
            </Link>
            {!isChatPage && !isIndexingPage && (
              <>
                <Link to={'/videos'} className="header-button">
                  <VideoIcon />
                  Videos
                </Link>
                <Link to={'/chat'} className="header-button secondary">
                  <VideoIcon />
                  Chat
                </Link>
                <Link to={'/'} className="header-button">
                  <IndexIcon />
                  Add Videos
                </Link>
              </>
            )}
            {isChatPage && (
              <>
                <Link to={'/videos'} className="header-button">
                  <VideoIcon />
                  Videos
                </Link>
                <Link to={'/'} className="header-button">
                  <IndexIcon />
                  Add Videos
                </Link>
              </>
            )}
            {isIndexingPage && (
              <>
                <Link to={'/videos'} className="header-button">
                  <VideoIcon />
                  Videos
                </Link>
                <Link to={'/chat'} className="header-button secondary">
                  <VideoIcon />
                  Chat
                </Link>
              </>
            )}
          </div>
        </div>
      </header>
      <main className={`content-area`}>{children}</main>
    </div>
  )
}


