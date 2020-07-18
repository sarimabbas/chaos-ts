import React, { useState, useEffect, useContext, useRef } from "react";
import { ipcRenderer } from "electron";
import { Modal, Menu, Dropdown, Input } from "antd";
const { TextArea } = Input;
import PATH from "path";
import { GeneralContext } from "../../contexts/GeneralContext";
import Card from "../Card";
import {
  transformPlistToJson,
  convertTreeToSupportedFilesArray,
  readSupportedFile,
  writeWebloc,
} from "../../utils";

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
  const [showEditDescriptionInput, setShowEditDescriptionInput] = useState(
    false
  );

  const addInputRef = useRef(null);

  // whenever the current folder path changes, fetch the content anew
  useEffect(() => {
    if (contextState.currentlySelectedFolderPath !== "") {
      getContent(contextState.currentlySelectedFolderPath);
    }
  }, [contextState.currentlySelectedFolderPath]);

  // whenever the add link modal is shown, put the input in focus
  useEffect(() => {
    if (showAddModal) {
      (addInputRef as any)?.current?.focus();
    }
  }, [showAddModal]);

  // whenever the add link shortcut is pressed, put the input in focus
  useEffect(() => {
    ipcRenderer.on("add-link", () => {
      setShowAddModal(true);
      const addInput: any = document.querySelector("#add-input");
      addInput.focus();
    });
    return () => {
      ipcRenderer.removeAllListeners("add-link");
    };
  }, []);

  // whenever the undo shortcut is pressed, call the undo function
  useEffect(() => {
    ipcRenderer.on("undo", () => {
      onUndo();
    });
    return () => {
      ipcRenderer.removeAllListeners("undo");
    };
    // these deps are needed because the event listener doesn't have access to the state
  }, [contextState, content]);

  const getContent = async (path: string) => {
    setLoading(true);
    let tree = await ipcRenderer.invoke("getFileTree", path);
    console.log(tree);

    const test = convertTreeToSupportedFilesArray(tree);
    console.log("supportedFiles", test);
    const readFiles = await Promise.all(test.map((f) => readSupportedFile(f)));
    console.log("readFiles", readFiles);

    const relevantContent: any[] = [];
    convertToContentArray(tree, relevantContent);
    const previews = await generatePreviews(relevantContent);
    previews.sort((a, b) => b.mtime - a.mtime);
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
          let preview: any = {};
          try {
            preview = await ipcRenderer.invoke(
              "getLinkPreview",
              transformed.URL
            );
          } catch (e) {
            console.log(e);
          }
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
    const plist = writeWebloc(payload);
    // create file with the string as contents
    const writePath = PATH.join(
      contextState.currentlySelectedFolderPath,
      url.hostname + ".webloc"
    );

    // write file
    await ipcRenderer.invoke("writeFile", writePath, plist);

    // clear out inputs
    setInputLink("");
    setShowAddModal(false);

    // create a temporary entity for instant feedback
    const preview = await ipcRenderer.invoke("getLinkPreview", inputLink);
    const tempContentEntity = {
      path: writePath,
      preview: preview,
    };
    setContent([tempContentEntity, ...content]);
    // getContent(contextState.currentlySelectedFolderPath);
  };

  const onUndo = async () => {
    const undoStack = [...contextState.contentUndoStack];
    if (undoStack.length > 0) {
      const lastItem: any = undoStack.pop();
      // first, restore the file
      await ipcRenderer.invoke(
        "writeFile",
        lastItem?.path,
        lastItem?.fileContents
      );
      // next, restore the node in the contents array
      const newContent = [...content];
      newContent.splice(lastItem?.index, 0, lastItem);
      setContent(newContent);
      // update the undo stack
      setContextState({
        ...contextState,
        contentUndoStack: undoStack,
      });
    }
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
      // * get path to remove
      const pathToRemove = (rightClickedCard as any)?.path;
      // * add to undo stack
      let removedIndex: any;
      content.forEach((c: any, i: number) => {
        if (c.path === pathToRemove) {
          removedIndex = i;
        }
      });
      const savedItem: any = {
        ...(rightClickedCard as any),
        index: removedIndex,
        fileContents: await ipcRenderer.invoke("readFile", pathToRemove),
      };
      setContextState({
        ...contextState,
        contentUndoStack: [...contextState.contentUndoStack, savedItem],
      });
      // * set content and delete file
      const newContent = content.filter(
        (c: any, index: number) => c.path !== pathToRemove
      );
      setContent(newContent);
      await ipcRenderer.invoke("moveToTrash", pathToRemove);
      // * hide dropdown
      setDropdownVisible(false);
    }
  };

  const onEditField = async (event: any, targetField: string) => {
    // get value from input
    const value = event.currentTarget.value;
    // get path to file to change
    const filePath: string = (rightClickedCard as any).path;
    // get contents of file
    const fileContents = await ipcRenderer.invoke("readFile", filePath);
    // convert to object
    const fileObj = transformPlistToJson(fileContents);
    // make an updated object
    const updatedFileObj = {
      ...fileObj,
      [targetField]: value,
    };
    // write out object and overwrite file
    const updatedFileContents = writeWebloc(updatedFileObj);
    await ipcRenderer.invoke("writeFile", filePath, updatedFileContents);
    // set temp preview
    switch (targetField) {
      case "title":
        (rightClickedCard as any).preview.title = value;
        setShowEditTitleInput(false);
        break;
      case "description":
        (rightClickedCard as any).preview.description = value;
        setShowEditDescriptionInput(false);
        break;
    }
    // clear menus
    setDropdownVisible(false);
    setRightClickedCard(null);
  };

  const onDropdownVisibleChange = (newValue: boolean) => {
    if (newValue) {
      // if turning on, only do so if a right click card is selected
      if (rightClickedCard) {
        setDropdownVisible(newValue);
      }
    } else {
      // if turning off, clear the input as well
      setDropdownVisible(newValue);
      setShowEditTitleInput(false);
      setShowEditDescriptionInput(false);
      setRightClickedCard(null);
    }
  };

  const onBreadcrumbClick = (relativePath: string, fullPath: string) => {
    setContextState({
      ...contextState,
      currentlySelectedFolderPath: fullPath,
      currentlySelectedRelativeFolderPath: relativePath,
    });
  };

  const menu = (
    <Menu>
      <Menu.Item key="1" onClick={onOpenInBrowser}>
        Open in browser
      </Menu.Item>
      <Menu.Item key="2" onClick={() => setShowEditTitleInput(true)}>
        {showEditTitleInput ? (
          <Input
            defaultValue={(rightClickedCard as any).preview?.title}
            onPressEnter={(e) => onEditField(e, "title")}
          />
        ) : (
          "Edit title"
        )}
      </Menu.Item>
      <Menu.Item key="3" onClick={() => setShowEditDescriptionInput(true)}>
        {showEditDescriptionInput ? (
          <TextArea
            rows={4}
            allowClear
            defaultValue={(rightClickedCard as any).preview?.description}
            onPressEnter={(e) => onEditField(e, "description")}
          />
        ) : (
          "Edit description"
        )}
      </Menu.Item>
      <Menu.Item key="4" onClick={onTrash}>
        Move to Trash
      </Menu.Item>
    </Menu>
  );

  return (
    <div className="px-4 pb-4">
      {/* header */}
      <div className="sticky top-0 z-10 flex items-center justify-between py-4 bg-white select-none">
        {/* breadcrumbs */}
        <h1 className="flex">
          {/* breadcrumbs */}
          <div className="flex">
            {contextState.currentlySelectedRelativeFolderPath
              .split("/")
              .filter((segment) => segment !== "")
              .map((segment, index, array) => {
                let fullPath = contextState.currentlySelectedFolderPath;
                let relativePath =
                  contextState.currentlySelectedRelativeFolderPath;
                const numberOfTimesToPop = array.length - index - 1;
                for (let i = 0; i < numberOfTimesToPop; i++) {
                  fullPath = PATH.dirname(fullPath);
                  relativePath = PATH.dirname(relativePath);
                }
                return (
                  <div key={index}>
                    <div className="flex mr-3">
                      <a
                        className="mr-3"
                        href="#"
                        onClick={() =>
                          onBreadcrumbClick(relativePath, fullPath)
                        }
                      >
                        {segment}
                      </a>
                      {index !== array.length - 1 ? "/" : ""}
                    </div>
                  </div>
                );
              })}
          </div>
          {/* empty breadcrumbs */}
          <p>
            {contextState.currentlySelectedFolderPath
              ? ""
              : "No folder selected"}
          </p>
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
                  ref={addInputRef}
                  autoFocus
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
