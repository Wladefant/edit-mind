import React from 'react';
import '@/app/styles/Layout.css';
import { Header } from './Header';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="app-layout">
      <Header />
      <main className="content-area">{children}</main>
    </div>
  );
};