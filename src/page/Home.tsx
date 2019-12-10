import React from "react";
import { Link, RouteComponentProps } from "@reach/router";

const roomId = "251260606233969163";

const Home = (props: RouteComponentProps) => {
  return (
    <Link to={roomId}>
      <button>Go to room</button>
    </Link>
  );
};

export default Home;
