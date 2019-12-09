import React, { useState, useEffect } from "react";
// import logo from './logo.svg';
// import './App.css';

const App: React.FC = () => {
  const [roomId, setRoomId] = useState("");

  useEffect(() => {
    const roomId = localStorage.getItem("roomId");
    if (roomId) setRoomId(roomId);
  }, [roomId]);

  async function handleNewRoomId() {
    try {
      const res = await fetch("/api/room-create");
      const data = await res.json();
      const roomRef = JSON.parse(data.roomRef);
      const roomId = roomRef["@ref"].id;
      console.log("Got a roomId:", roomId);
      localStorage.setItem("roomId", roomId);
      setRoomId(roomId);
    } catch (err) {
      console.log(err);
    }
  }

  async function handleJoinRoom() {
    try {
      const roomId = localStorage.getItem("roomId");
      console.log("Join room:", roomId);
      const res = await fetch("/api/token-create", {
        method: "POST",
        body: JSON.stringify({ roomId })
      });
      const data = await res.json();
      console.log('Token:', data.token);
    } catch (err) {
      console.log(err);
    }
  }

  return (
    <div>
      {roomId ? (
        <button onClick={handleJoinRoom}>Join Room: {roomId}</button>
      ) : (
        <button onClick={handleNewRoomId}>Generate Room ID</button>
      )}
    </div>
  );
};

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
