import React, { useState, useEffect } from "react";
import { Link, RouteComponentProps } from "@reach/router";

const Home = (props: RouteComponentProps) => {
  const [roomId, setRoomId] = useState('');

  useEffect(() => {
    const roomId = localStorage.getItem("roomId");
    if (roomId) setRoomId(roomId);
  }, []);

  async function handleCreateRoomId() {
    try {
      console.time("room-create");
      const res = await fetch("/api/room-create");
      console.timeEnd("room-create");
      const data = await res.json();
      const roomRef = JSON.parse(data.roomRef);
      const roomId: string = roomRef["@ref"].id;
      console.log("Got a roomId:", roomId);
      localStorage.setItem("roomId", roomId);
      // navigate(`/${roomId}`);
      setRoomId(roomId);
    } catch (err) {
      console.log(err);
    }
  }

  if (roomId) {
    return (
      <Link to={roomId}>
        <button>Go to your room</button>
      </Link>
    );
  } else {
    return (
      <button onClick={handleCreateRoomId}>Create a room</button>
    );
  }
};

export default Home;
