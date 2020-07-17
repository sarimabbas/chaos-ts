import React, { useState, useEffect, useContext } from "react";
import { ipcRenderer } from "electron";
import { GeneralContext } from "../../contexts/GeneralContext";
import Card from "../Card";

export default () => {
  const [content, setContent]: any = useState([]);
  const { state: contextState, setState: setContextState } = useContext(
    GeneralContext
  );

  useEffect(() => {
    console.log("context changed");
    getContent(contextState.currentlySelectedFolderPath);
  }, [contextState.currentlySelectedFolderPath]);

  const getContent = async (path: string) => {
    let tree = await ipcRenderer.invoke("getFileTree", path);
    const relevantContent: any[] = [];
    convertToContentArray(tree, relevantContent);
    const previews = await generatePreviews(relevantContent);
    console.log(previews);
    setContent(previews);
  };

  const convertToContentArray = (root: any, arr: any[]) => {
    root.title = root.name;
    delete root.name;
    if (root?.extension === ".webloc") {
      arr.push(root);
    }
    if (root?.children) {
      root.children.forEach((child: any) => convertToContentArray(child, arr));
    }
  };

  const generatePreviews = async (arr: any[]) => {
    return Promise.all(
      arr.map(async (a) => {
        const fileContents = await ipcRenderer.invoke("readFile", a.path);
        const oParser = new DOMParser();
        const oDOM = oParser.parseFromString(fileContents, "application/xml");
        let linkNodes = oDOM.querySelectorAll("string");
        const links: any[] = [];
        linkNodes.forEach((l) => links.push(l.textContent));
        a.preview = {};
        if (links.length > 0) {
          const preview = await ipcRenderer.invoke("getLinkPreview", links[0]);
          a.preview = preview;
        }
        return a;
      })
    );
  };

  return (
    <>
      <div className="p-4">
        <h1 className="flex">
          Folder:
          <pre className="ml-2">
            {(contextState.currentlySelectedExplorerNode as any).title}
          </pre>
        </h1>
        <div className="content-grid">
          {content.map((c: any) => (
            <Card
              key={c.path}
              title={c.preview?.title || c.title}
              description={c.preview?.description}
              image={c.preview?.images?.[0]}
              favicon={c.preview?.favicons?.[0]}
            />
          ))}
        </div>
      </div>
    </>
  );
};
