import React, { useState, useEffect } from 'react';
// import logo from './logo.svg';
// import './App.css';
import nanoid from 'nanoid';

const App: React.FC = () => {
  const [roomId, setRoomId] = useState("")

  useEffect(() => {
    const roomId = localStorage.getItem('roomId')
    if (roomId) setRoomId(roomId)
  }, [roomId])

  function handleNewRoomId() {
    const roomId = nanoid()
    console.log("Got a roomId:", roomId)
    localStorage.setItem("roomId", roomId)
    setRoomId(roomId)
  }
  
  function handleJoinRoom() {
    const roomId = localStorage.getItem('roomId')
    console.log("Join room:", roomId)
  }

  return (
    <div>
      {roomId ? <button onClick={handleJoinRoom}>Join Room: {roomId}</button> : <button onClick={handleNewRoomId}>Generate Room ID</button>}
    </div>
  )
}

// const App: React.FC = () => {
//   return (
//     <div className="App">
//       <header className="App-header">
//         <img src={logo} className="App-logo" alt="logo" />
//         <p>
//           Edit <code>src/App.tsx</code> and save to reload.
//         </p>
//         <a
//           className="App-link"
//           href="https://reactjs.org"
//           target="_blank"
//           rel="noopener noreferrer"
//         >
//           Learn React
//         </a>
//       </header>
//     </div>
//   );
// }

export default App;
