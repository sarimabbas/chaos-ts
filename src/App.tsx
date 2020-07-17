import React from "react";
import { render } from "react-dom";

// css
import "./styles/main.css";
import "antd/dist/antd.css";
import "./styles/other.css";

// components
import Sidebar from "./components/Sidebar";
import Content from "./components/Content";

// context
import { GeneralContextProvider } from "./contexts/GeneralContext";

const mainElement = document.createElement("div");
mainElement.setAttribute("id", "root");
document.body.appendChild(mainElement);

const App = () => {
  return (
    <>
      <GeneralContextProvider>
        <div className="grid-container">
          <div className="sidebar">
            <Sidebar />
          </div>
          <div className="content">
            <Content />
          </div>
        </div>
      </GeneralContextProvider>
    </>
  );
};

render(<App />, mainElement);
