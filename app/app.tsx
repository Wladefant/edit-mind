import React from 'react'
import { HashRouter as Router, Routes, Route } from 'react-router-dom'
import { Chat } from './pages/Chat'
import './styles/app.css'
import { Index } from './pages/Index'
import { Layout } from './components/Layout'

import { Settings } from './pages/Settings'
import { Training } from './pages/Training'
import { Videos } from './pages/Videos'

const App: React.FC = () => {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/videos" element={<Videos />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/training" element={<Training />} />
        </Routes>
      </Layout>
    </Router>
  )
}

export default App
