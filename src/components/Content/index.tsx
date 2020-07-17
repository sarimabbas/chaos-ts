import React, { useState, useEffect, useContext } from "react";
import { ipcRenderer } from "electron";
import { Modal, Menu, Dropdown, Affix } from "antd";
import PATH from "path";
import { GeneralContext } from "../../contexts/GeneralContext";
import Card from "../Card";
import { BorderOutlined } from "@ant-design/icons";

export default () => {
  const [content, setContent]: any = useState([]);
  const [loading, setLoading]: any = useState(false);
  const [showAddModal, setShowAddModal]: any = useState(false);
  const [inputLink, setInputLink]: any = useState("");
  const { state: contextState, setState: setContextState } = useContext(
    GeneralContext
  );
  const [rightClickedCard, setRightClickedCard] = useState(null);

  useEffect(() => {
    if (contextState.currentlySelectedFolderPath !== "") {
      getContent(contextState.currentlySelectedFolderPath);
    }
  }, [contextState.currentlySelectedFolderPath]);

  useEffect(() => {
    ipcRenderer.on("add-link", () => {
      setShowAddModal(true);
      const addInput: any = document.querySelector("#add-input");
      addInput.focus();
    });
  }, []);

  const getContent = async (path: string) => {
    setLoading(true);
    let tree = await ipcRenderer.invoke("getFileTree", path);
    const relevantContent: any[] = [];
    convertToContentArray(tree, relevantContent);
    const previews = await generatePreviews(relevantContent);
    previews.sort((a, b) => b.mtime - a.mtime);
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
        a.url = "";
        if (links.length > 0) {
          a.url = links[0];
          const preview = await ipcRenderer.invoke("getLinkPreview", links[0]);
          a.preview = preview;
        }
        return a;
      })
    );
  };

  const onAddLink = async (event: any) => {
    event.preventDefault();
    console.log(inputLink);
    const template = `
    <dict>
	    <key>URL</key>
	    <string>${inputLink}</string>
    </dict>
    `;
    const url = new URL(inputLink);
    console.log(url);
    await ipcRenderer.invoke(
      "writeFile",
      PATH.join(
        contextState.currentlySelectedFolderPath,
        url.hostname + ".webloc"
      ),
      template
    );
    setInputLink("");
    setShowAddModal(false);
    const preview = await ipcRenderer.invoke("getLinkPreview", inputLink);
    const tempContentEntity = {
      path: Math.random(),
      preview: preview,
    };
    console.log(preview);
    setContent([tempContentEntity, ...content]);
    // getContent(contextState.currentlySelectedFolderPath);
  };

  const onRightClickCard = (card: any) => {
    setRightClickedCard(card);
    console.log(card);
  };

  const onOpenInBrowser = async () => {
    if (rightClickedCard) {
      await ipcRenderer.invoke("openExternal", (rightClickedCard as any)?.url);
    }
  };

  const onTrash = async () => {
    if (rightClickedCard) {
      const pathToRemove = (rightClickedCard as any)?.path;
      // remove from content array
      const newContent = content.filter((c: any) => c.path !== pathToRemove);
      await ipcRenderer.invoke("moveToTrash", pathToRemove);
      setContent(newContent);
    }
  };

  const menu = (
    <Menu>
      <Menu.Item key="1" onClick={onOpenInBrowser}>
        Open in browser
      </Menu.Item>
      <Menu.Item key="2" onClick={onTrash}>
        Move to Trash
      </Menu.Item>
    </Menu>
  );

  return (
    <div className="px-4 pb-4">
      {/* header */}
      <div className="sticky top-0 z-10 flex justify-between py-4 bg-white">
        {/* folder name */}
        <h1 className="flex">
          {contextState.currentlySelectedFolderPath
            ? "Folder:"
            : "No folder selected"}
          <pre className="ml-2">
            {(contextState.currentlySelectedExplorerNode as any).title}
          </pre>
        </h1>
        {/* add button */}
        {contextState.currentlySelectedFolderPath ? (
          <>
            <div
              onClick={() => setShowAddModal(true)}
              className="px-2 py-1 bg-gray-300 rounded-md cursor-pointer hover:bg-gray-400"
            >
              Add link (⌘+N)
            </div>
            <Modal
              centered
              closable={false}
              footer={null}
              visible={showAddModal}
              onOk={() => setShowAddModal(false)}
              onCancel={() => setShowAddModal(false)}
            >
              <form
                onSubmit={onAddLink}
                className="flex items-center justify-between"
              >
                <input
                  value={inputLink}
                  id="add-input"
                  onChange={(e) => setInputLink(e.currentTarget.value)}
                  type="url"
                  placeholder="https://example.com"
                  className="w-full px-3 py-1 mr-3 border-2 border-gray-400 border-solid rounded-md"
                />
                <button
                  type="submit"
                  className="px-2 py-1 bg-gray-300 rounded-md cursor-pointer hover:bg-gray-400"
                >
                  Add
                </button>
              </form>
            </Modal>
          </>
        ) : null}
      </div>

      <div className="h-4"></div>
      {loading ? (
        <p>Loading folder contents...</p>
      ) : (
        <div className="content-grid">
          {content.map((c: any) => (
            <Dropdown overlay={menu} trigger={["contextMenu"]} key={c.path}>
              <div className="nuke" onContextMenu={() => onRightClickCard(c)}>
                <Card
                  key={c.path}
                  title={c.preview?.title || c.title}
                  description={c.preview?.description}
                  image={c.preview?.images?.[0]}
                  favicon={c.preview?.favicons?.[0]}
                  url={c.preview?.url || c.url}
                />
              </div>
            </Dropdown>
          ))}
          {contextState.currentlySelectedFolderPath && content.length < 1 ? (
            <p>Folder is empty</p>
          ) : null}
        </div>
      )}
    </div>
  );
};
