import React, { useState, useEffect } from "react";
// import logo from './logo.svg';
// import './App.css';

declare const Owt: any;
const conference = new Owt.Conference.ConferenceClient();

const names = [
  "Oliver",
  "Jack",
  "Harry",
  "Jacob",
  "James",
  "John",
  "Robert",
  "Michael"
];
const userName = names[Math.floor(Math.random() * names.length)];

const App: React.FC = () => {
  const [hasRoomId, setHasRoomId] = useState(false);
  const [token, setToken] = useState("");
  const [isJoined, setIsJoined] = useState(false);

  useEffect(() => {
    const roomId = localStorage.getItem("roomId");
    if (roomId) setHasRoomId(true);
  }, []);

  useEffect(() => {
    if (hasRoomId) {
      const roomId = localStorage.getItem("roomId");
      if (roomId) handleCreateToken();
    }
  }, [hasRoomId]);

  useEffect(() => {
    // via https://developer.mozilla.org/en-US/docs/Web/API/WindowEventHandlers/onunload
    function handleUnload() {
      if (conference) conference.leave();
    }
    window.addEventListener("unload", handleUnload);

    return function cleanup() {
      window.removeEventListener("unload", handleUnload);
    };
  }, []);

  async function handleCreateRoomId() {
    try {
      console.time("room-create");
      const res = await fetch("/api/room-create");
      console.timeEnd("room-create");
      const data = await res.json();
      const roomRef = JSON.parse(data.roomRef);
      const roomId = roomRef["@ref"].id;
      console.log("Got a roomId:", roomId);
      localStorage.setItem("roomId", roomId);
      setHasRoomId(true);
    } catch (err) {
      console.log(err);
    }
  }

  async function handleCreateToken() {
    try {
      const roomId = localStorage.getItem("roomId");
      console.log("Join room:", roomId);
      console.time("token-create");
      const res = await fetch("/api/token-create", {
        method: "POST",
        body: JSON.stringify({ roomId, userName })
      });
      console.timeEnd("token-create");
      const data = await res.json();
      const token = data.token;
      console.log("Token:", token);
      setToken(token);
    } catch (err) {
      console.log(err);
    }
  }

  async function handleJoinRoom() {
    try {
      if (token) {
        const info = await conference.join(token);
        console.log("Conference info:", info);
        setIsJoined(true);
      }
    } catch (err) {
      console.log(err);
    }
  }

  if (isJoined) {
    return <div>Joined room.</div>;
  }

  return (
    <div>
      {hasRoomId ? (
        <button onClick={handleJoinRoom} disabled={!token}>
          Join Room
        </button>
      ) : (
        <button onClick={handleCreateRoomId}>Generate Room ID</button>
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
