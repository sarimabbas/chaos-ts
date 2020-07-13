import React from "react";
import { render } from "react-dom";

import "./styles/main.css";

import Greetings from "./components/Greetings";

const mainElement = document.createElement("div");
mainElement.setAttribute("id", "root");
document.body.appendChild(mainElement);

const App = () => {
  return (
    <>
      <h1>Helllo, how are you</h1>
    </>
  );
};

render(<App />, mainElement);
