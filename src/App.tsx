import React, { useEffect } from "react";
import { render } from "react-dom";
import { ipcRenderer } from "electron";

import "./styles/main.css";
import "./styles/other.css";

const mainElement = document.createElement("div");
mainElement.setAttribute("id", "root");
document.body.appendChild(mainElement);

const App = () => {
  useEffect(() => {
    getFileTree();
  }, []);

  const getFileTree = async () => {
    const result = await ipcRenderer.invoke(
      "getFileTree",
      "/Users/sarimabbas/Downloads"
    );
    console.log(result);
  };

  return (
    <>
      <div className="grid-container">
        <div className="sidebar">Sidebar</div>
        <div className="content">Content</div>
      </div>
    </>
  );
};

render(<App />, mainElement);
