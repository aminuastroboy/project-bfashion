import React from 'react'
import ReactDOM from 'react-dom/client'

function App() {
  return (
    <div style={{ textAlign: 'center', marginTop: '40px' }}>
      <h1>Welcome to SmartyStars 🌟</h1>
      <p>Learn with fun — Grade 3 Edition</p>
      <button onClick={() => new Audio('https://actions.google.com/sounds/v1/cartoon/clang_and_wobble.ogg').play()}>
        Play Sound 🎵
      </button>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />)