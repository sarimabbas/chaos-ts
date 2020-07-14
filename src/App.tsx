import React from "react";
import { render } from "react-dom";

// css
import "./styles/other.css";
import "antd/dist/antd.css";

// components
import Sidebar from "./components/Sidebar";

const mainElement = document.createElement("div");
mainElement.setAttribute("id", "root");
document.body.appendChild(mainElement);

const App = () => {
  return (
    <>
      <div className="grid-container">
        <div className="sidebar">
          <Sidebar />
        </div>
        <div className="content">Content</div>
      </div>
    </>
  );
};

render(<App />, mainElement);
