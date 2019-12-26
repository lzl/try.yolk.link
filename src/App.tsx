import React from 'react'
import { Router } from '@reach/router'
import Home from './page/Home'
import Room from './page/Room'
import './App.css'
// import VConsole from 'vconsole'
import packageJson from '../package.json'

console.log('version:', `v${packageJson.version}`)

// new VConsole()

const App: React.FC = () => {
  return (
    <Router>
      <Home path="/" />
      <Room path="/:roomId" />
    </Router>
  )
}

export default App
