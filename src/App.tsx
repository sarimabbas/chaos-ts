import React from "react";
import { render } from "react-dom";

import "./styles/main.css";
import "./styles/other.css";

const mainElement = document.createElement("div");
mainElement.setAttribute("id", "root");
document.body.appendChild(mainElement);

const App = () => {
  return (
    <>
      <div className="grid-container">
        <div className="sidebar">Sodebar</div>
        <div className="content">Content</div>
      </div>
    </>
  );
};

render(<App />, mainElement);
