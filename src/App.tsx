import React, { useEffect, useState } from "react";
import { render } from "react-dom";
import { ipcRenderer } from "electron";
import Tree from "rc-tree";

import "./styles/main.css";
import "./styles/other.css";

const mainElement = document.createElement("div");
mainElement.setAttribute("id", "root");
document.body.appendChild(mainElement);

const App = () => {
  const [treeData, setTreeData] = useState([]);

  useEffect(() => {
    getExplorerTree();
  }, []);

  const convertToExplorerTree = (root: any) => {
    delete root.path;
    root.title = root.name;
    delete root.name;
    root.children = root.children.filter(
      (child: any) => child.type === "directory"
    );
    root.children.forEach((child: any) => convertToExplorerTree(child));
  };

  const assignKeys = (root: any) => {
    let counter = 0;
    const queue = [];
    queue.unshift(root);
    while (queue.length) {
      const curr = queue.pop();
      curr.key = counter;
      counter += 1;
      if (curr?.children) {
        curr.children.forEach((c: any) => {
          queue.unshift(c);
        });
      }
    }
  };

  const getExplorerTree = async () => {
    const result: any = await ipcRenderer.invoke(
      "getFileTree",
      "/Users/sarimabbas/Downloads"
    );
    convertToExplorerTree(result);
    assignKeys(result);

    const treeData: any = [];
    treeData.push(result);
    setTreeData(treeData);

    console.log(treeData);
  };

  return (
    <>
      <div className="grid-container">
        <div className="sidebar">
          <Tree treeData={treeData} />
        </div>
        <div className="content">Content</div>
      </div>
    </>
  );
};

render(<App />, mainElement);
