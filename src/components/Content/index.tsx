import React, { useState, useEffect, useContext } from "react";
import { ipcRenderer } from "electron";
import { GeneralContext } from "../../contexts/GeneralContext";
import Card from "../Card";

export default () => {
  const [content, setContent]: any = useState([]);
  const [loading, setLoading]: any = useState(false);
  const { state: contextState, setState: setContextState } = useContext(
    GeneralContext
  );

  useEffect(() => {
    if (contextState.currentlySelectedFolderPath !== "") {
      getContent(contextState.currentlySelectedFolderPath);
    }
  }, [contextState.currentlySelectedFolderPath]);

  const getContent = async (path: string) => {
    setLoading(true);
    let tree = await ipcRenderer.invoke("getFileTree", path);
    const relevantContent: any[] = [];
    convertToContentArray(tree, relevantContent);
    const previews = await generatePreviews(relevantContent);
    console.log(previews);
    setContent(previews);
    setLoading(false);
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
    <div className="p-4">
      <h1 className="flex">
        {contextState.currentlySelectedFolderPath
          ? "Folder:"
          : "No folder selected"}
        <pre className="ml-2">
          {(contextState.currentlySelectedExplorerNode as any).title}
        </pre>
      </h1>
      <div className="h-4"></div>
      {loading ? (
        <p>Loading folder contents...</p>
      ) : (
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
          {contextState.currentlySelectedFolderPath && content.length < 1 ? (
            <p>Folder is empty</p>
          ) : null}
        </div>
      )}
    </div>
  );
};
