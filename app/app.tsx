import React from 'react'
import { HashRouter as Router, Routes, Route } from 'react-router-dom'
import { Chat } from './pages/Chat'
import './styles/app.css'
import { Welcome } from './pages/Welcome'
import Layout from './components/Layout'

import { SettingsPage } from './pages/Settings'
import { TrainingPage } from './pages/Training'
import { Videos } from './pages/Videos'

const App: React.FC = () => {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Welcome />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/videos" element={<Videos />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/training" element={<TrainingPage />} />
        </Routes>
      </Layout>
    </Router>
  )
}

export default App
