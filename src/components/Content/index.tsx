import React, { useState, useEffect, useContext } from "react";
import { ipcRenderer } from "electron";
import { Modal, Menu, Dropdown, Input } from "antd";
import { EditFilled } from "@ant-design/icons";
const { Search } = Input;
import PATH from "path";
import { GeneralContext } from "../../contexts/GeneralContext";
import Card from "../Card";
import { transformPlistToJson, transformJsonToPlist } from "../../utils";

export default () => {
  const [content, setContent]: any = useState([]);
  const [loading, setLoading]: any = useState(false);
  const [showAddModal, setShowAddModal]: any = useState(false);
  const [inputLink, setInputLink]: any = useState("");
  const { state: contextState, setState: setContextState } = useContext(
    GeneralContext
  );

  // dropdown state
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [rightClickedCard, setRightClickedCard] = useState(null);
  const [showEditTitleInput, setShowEditTitleInput] = useState(false);

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
    // in parallel
    return Promise.all(
      // for all file paths
      arr.map(async (a) => {
        // read the file
        const fileContents = await ipcRenderer.invoke("readFile", a.path);
        // convert plist to json
        const transformed = transformPlistToJson(fileContents);
        // prepare props
        a.preview = {};
        a.url = "";
        // if URL in webloc file
        if (transformed?.URL) {
          // set the URL
          a.url = transformed.URL;
          // fetch the preview
          const preview = await ipcRenderer.invoke(
            "getLinkPreview",
            transformed.URL
          );
          a.preview = preview;
          // override some user set properties
          if (transformed?.title) {
            a.preview.title = transformed.title;
          }
          if (transformed?.description) {
            a.preview.description = transformed.description;
          }
        }
        return a;
      })
    );
  };

  const onAddLink = async (event: any) => {
    // prevent propagation
    event.preventDefault();

    // parse the url
    const url = new URL(inputLink);

    // create an obj payload
    const payload = {
      URL: inputLink,
    };

    // convert to plist string
    const plist = transformJsonToPlist(payload);

    // create file with the string as contents
    await ipcRenderer.invoke(
      "writeFile",
      PATH.join(
        contextState.currentlySelectedFolderPath,
        url.hostname + ".webloc"
      ),
      plist
    );

    // clear out inputs
    setInputLink("");
    setShowAddModal(false);

    // create a temporary entity for instant feedback
    const preview = await ipcRenderer.invoke("getLinkPreview", inputLink);
    const tempContentEntity = {
      path: Math.random(),
      preview: preview,
    };
    setContent([tempContentEntity, ...content]);
    // getContent(contextState.currentlySelectedFolderPath);
  };

  const onRightClickCard = (card: any) => {
    // clear all other inputs
    setShowEditTitleInput(false);
    // set card
    setRightClickedCard(card);
    // show dropdown
    setDropdownVisible(true);
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

  const onEditTitle = async () => {};

  const onDropdownVisibleChange = (newValue: boolean) => {
    // if turning on, only do so if a right click card is selected
    if (newValue) {
      if (!rightClickedCard) {
        return;
      }
    }
    // if turning off, clear the input as well
    if (!newValue) {
      setShowEditTitleInput(false);
      setRightClickedCard(null);
    }
    setDropdownVisible(newValue);
  };

  const menu = (
    <Menu>
      <Menu.Item key="1" onClick={onOpenInBrowser}>
        Open in browser
      </Menu.Item>
      <Menu.Item key="2" onClick={() => setShowEditTitleInput(true)}>
        {showEditTitleInput ? (
          <Search
            placeholder={(rightClickedCard as any).preview?.title}
            enterButton={<EditFilled />}
            onSearch={onEditTitle}
          />
        ) : (
          "Edit title"
        )}
      </Menu.Item>
      <Menu.Item key="3" onClick={onTrash}>
        Move to Trash
      </Menu.Item>
    </Menu>
  );

  return (
    <div className="px-4 pb-4">
      {/* header */}
      <div className="sticky top-0 z-10 flex justify-between py-4 bg-white select-none">
        {/* folder name */}
        <h1 className="flex">
          {contextState.currentlySelectedFolderPath
            ? "Folder:"
            : "No folder selected"}
          <pre className="ml-2 select-all">
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
        <Dropdown
          overlay={menu}
          trigger={["contextMenu"]}
          visible={dropdownVisible}
          onVisibleChange={onDropdownVisibleChange}
        >
          <div className="content-grid">
            {/* cards in the grid */}
            {content.map((c: any) => (
              <div
                className="nuke"
                onContextMenu={() => onRightClickCard(c)}
                key={c.path}
              >
                <Card
                  draggable
                  key={c.path}
                  title={c.preview?.title || c.title}
                  description={c.preview?.description}
                  image={c.preview?.images?.[0]}
                  favicon={c.preview?.favicons?.[0]}
                  url={c.preview?.url || c.url}
                />
              </div>
            ))}
            {/* nothing in the grid */}
            {contextState.currentlySelectedFolderPath && content.length < 1 ? (
              <p>Folder is empty</p>
            ) : null}
          </div>
        </Dropdown>
      )}
    </div>
  );
};
