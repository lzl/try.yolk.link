import React, { useState, useEffect } from "react";
import { Link, RouteComponentProps } from "@reach/router";
import Button from "../component/Button";

const Home = (props: RouteComponentProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [roomId, setRoomId] = useState("");

  useEffect(() => {
    const roomId = localStorage.getItem("roomId");
    if (roomId) setRoomId(roomId);
    setIsLoading(false);
  }, []);

  async function handleCreateRoomId() {
    try {
      setIsLoading(true);
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
      setIsLoading(false);
    } catch (err) {
      console.log(err);
    }
  }

  if (roomId) {
    return (
      <Link to={roomId}>
        <Button disabled={isLoading} loading={isLoading}>
          Go to your room
        </Button>
      </Link>
    );
  } else {
    return (
      <Button
        onClick={handleCreateRoomId}
        disabled={isLoading}
        loading={isLoading}
      >
        Create a room
      </Button>
    );
  }
};

export default Home;
