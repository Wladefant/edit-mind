import React from 'react'
import { HashRouter as Router, Routes, Route } from 'react-router-dom'
import { Chat } from './pages/Chat'
import './styles/app.css'
import { Welcome } from './pages/Welcome'
import Layout from './components/Layout'

const App: React.FC = () => {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Welcome />} />
          <Route path="/chat" element={<Chat />} />
        </Routes>
      </Layout>
    </Router>
  )
}

export default App
