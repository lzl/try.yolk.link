import React from "react";
import { Router } from "@reach/router";
import Home from "./page/Home";
import Room from "./page/Room";
import "./App.css";

const App: React.FC = () => {
  return (
    <Router>
      <Home path="/" />
      <Room path="/:roomId" />
    </Router>
  );
};

export default App;
