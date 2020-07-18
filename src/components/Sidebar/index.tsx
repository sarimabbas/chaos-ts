import React, { useEffect, useState, useContext } from "react";
import { ipcRenderer, ipcMain } from "electron";
import { Tree, Menu, Dropdown, Input } from "antd";
import { EditFilled } from "@ant-design/icons";
const { SubMenu } = Menu;
const { Search } = Input;
const { DirectoryTree, TreeNode } = Tree;
import PATH from "path";
import { GeneralContext } from "../../contexts/GeneralContext";

const Sidebar = () => {
  // this is a function that traverses the tree starting at "data" node as root
  // it does this until the key === data.key, at which point it applies a callback
  // to that data node
  const loopMe = async (
    data: any,
    key: any,
    callback: any,
    pathBuilder: string = ""
  ) => {
    for (let i = 0; i < data.length; i++) {
      const pathSoFar = PATH.join(pathBuilder, data[i].title);
      if (data[i].key === key) {
        return callback(data[i], i, data, pathSoFar);
      }
      if (data[i].children) {
        loopMe(data[i].children, key, callback, pathSoFar);
      }
    }
  };

  const [treeData, setTreeData] = useState([]);
  const [expandedKeys, setExpandedKeys] = useState([]);
  const [rootPath, setRootPath] = useState("");
  const [rightClickInfo, setRightClickInfo]: any = useState(null);
  const [rightClickMenuVisible, setRightClickMenuVisible] = useState(false);
  const [showRenameInput, setShowRenameInput] = useState(false);

  const { state: contextState, setState: setContextState } = useContext(
    GeneralContext
  );

  useEffect(() => {
    ipcRenderer.on("open-folder", () => {
      chooseRootFolder();
    });
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
    // breadth first search!
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

  const chooseRootFolder = async () => {
    // pick folder from file picker
    const { canceled, filePaths } = await ipcRenderer.invoke("chooseFolder");
    if (canceled) {
      return;
    }
    const folder = filePaths[0];
    const root = PATH.dirname(folder); // get the path up to but not including that folder
    setRootPath(root); // store it as the root path

    getExplorerTree(folder);
  };

  const getExplorerTree = async (pathToFolder: string) => {
    // get the entire file tree starting from that folder
    const result: any = await ipcRenderer.invoke("getFileTree", pathToFolder);
    // remove files, keep directories only
    convertToExplorerTree(result);
    // assign unique keys to all the nodes
    assignKeys(result);
    // set the tree data
    const treeData: any = [];
    treeData.push(result);
    setTreeData(treeData);
  };

  const onDragEnter = (info: any) => {
    // this is the node that is hovered over while dragging
    console.log("on drag enter", info);

    // expandedKeys 需要受控时设置
    // this.setState({
    //   expandedKeys: info.expandedKeys,
    // });
  };

  const onDrop = async (info: any) => {
    console.log("on drop", info);

    console.log(info.event.currentTarget);

    // * these are the user assigned keys for each node
    // * you gotta make sure these are unique for the drop to work
    const dropKey = info.node.key; // the thing being dropped on (target)
    const dragKey = info.dragNode.key; // the thing being dragged (source)

    // * three options for dropPosition:
    // * -1 => it's before the highlighted node
    // *  0 => it's on the highlighted node
    // *  1 => it's after the highlighted node
    const dropPos = info.node.pos.split("-");
    const dropPosition =
      info.dropPosition - Number(dropPos[dropPos.length - 1]);
    console.log("drop position", dropPosition);

    // * Make a copy of all the data
    const data = [...treeData];

    const join = PATH.join("a", "b");
    console.log(join);

    // * Remove the drag node from the children array of its parent
    // Find dragObject i.e. the thing being dragged
    let dragObj: any;
    let dragPath: any;
    loopMe(data, dragKey, (item: any, index: any, arr: any, path: string) => {
      // remove the drag node from the children[] of its parent
      arr.splice(index, 1);
      dragObj = item;
      dragPath = path;
    });
    dragPath = PATH.join(rootPath, dragPath);

    console.log("Drag path", dragPath);

    // * the dragged node could end up in three places
    if (!info.dropToGap) {
      // * 1. dropped onto another node without expanding it
      // find the node which is being dropped on
      // in the callback, get that node, and push to its children
      console.log("FIRST CASE");
      loopMe(data, dropKey, (item: any) => {
        item.children = item.children || [];
        item.children.push(dragObj);
      });
      // ------------
    } else if (
      (info.node.children || []).length > 0 && // if node target has children
      info.node.expanded && // Is expanded
      dropPosition === 1 // On the bottom gap
    ) {
      // * 2. hover over a node, it expands, and you put dragged node right after it
      console.log("SECOND CASE");
      loopMe(data, dropKey, (item: any) => {
        item.children = item.children || [];
        item.children.unshift(dragObj); // insert at start of children
      });
      // ------------
    } else {
      // * 3. all other cases where you put dragged node either inside another node and
      // * get before/after any of its children, or you go before/after current level siblings
      console.log("THIRD CASE");
      let ar: any[] = [];
      let i: number = 0;
      // loop until you find the target node
      // find its index in its parent's children
      // also get the whole array of children
      loopMe(data, dropKey, (item: any, index: any, arr: any) => {
        ar = arr;
        i = index;
      });
      if (dropPosition === -1) {
        // insert before the target node
        ar.splice(i, 0, dragObj);
      } else {
        // insert after the target node
        ar.splice(i + 1, 0, dragObj);
      }
    }

    setTreeData(data);

    let newDragPath: any;
    loopMe(
      data,
      dragKey,
      (item: any, index: number, arr: any, path: string) => {
        newDragPath = path;
      }
    );
    newDragPath = PATH.join(rootPath, newDragPath);

    console.log("new drag path", newDragPath);

    // do a move operation
    await ipcRenderer.invoke("renamePath", dragPath, newDragPath);
  };

  const onSelect = (selectedKeys: any[], other: any) => {
    let relativePath: any;
    loopMe(
      treeData,
      other.node.key,
      (node: any, index: number, all: any, path: string) => {
        relativePath = path;
      }
    );
    let fullPath = PATH.join(rootPath, relativePath);
    setContextState({
      ...contextState,
      currentlySelectedFolderPath: fullPath,
      currentlySelectedRelativeFolderPath: relativePath,
    });
  };

  const handleVisibleChange = (visible: boolean) => {
    if (!visible) {
      setRightClickInfo(null);
      setShowRenameInput(false);
    }
    setRightClickMenuVisible(visible);
  };

  const onRightClick = ({ event, node }: any) => {
    console.log(event, node);
    setRightClickInfo(null);
    setShowRenameInput(false);
    setRightClickInfo({
      pageX: event.pageX,
      pageY: event.pageY,
      node: node,
    });
  };

  const onRenameSubmit = async (value: string, event: any) => {
    // copy data
    const data = [...treeData];

    // find the path to the folder
    let oldRelativePath: any;
    let findNode: any;
    loopMe(
      data,
      rightClickInfo.node.key,
      (curr: any, index: number, data: any, path: string) => {
        oldRelativePath = path;
        curr.title = value;
        findNode = curr;
      }
    );
    let oldPath = PATH.join(rootPath, oldRelativePath);

    // create the new path
    const newRelativePath = PATH.join(PATH.dirname(oldRelativePath), value);
    const newPath = PATH.join(PATH.dirname(oldPath), value);

    // do the rename
    await ipcRenderer.invoke("renamePath", oldPath, newPath);

    // refresh global context
    setContextState({
      ...contextState,
      currentlySelectedFolderPath: newPath,
      currentlySelectedRelativeFolderPath: newRelativePath,
    });

    setTreeData(data);
    setRightClickInfo(null);
    setRightClickMenuVisible(false);
  };

  const onMoveToTrash = async () => {
    if (rightClickInfo) {
      let selectedNodePath: any;
      const data = [...treeData];
      loopMe(
        data,
        rightClickInfo.node.key,
        (node: any, index: number, all: any, path: string) => {
          selectedNodePath = path;
          all.splice(index, 1);
        }
      );
      selectedNodePath = PATH.join(rootPath, selectedNodePath);
      await ipcRenderer.invoke("moveToTrash", selectedNodePath);
      setTreeData(data);
      setRightClickInfo(null);
      setRightClickMenuVisible(false);
    }
  };

  const onAddFolder = async () => {
    if (rightClickInfo) {
      let selectedNodePath: any;
      const data = [...treeData];
      loopMe(
        data,
        rightClickInfo.node.key,
        (node: any, index: number, all: any, path: string) => {
          selectedNodePath = path;
          all.splice(index + 1, 0, {
            key: Math.random(),
            title: "New folder",
          });
        }
      );
      selectedNodePath = PATH.join(
        PATH.dirname(PATH.join(rootPath, selectedNodePath)),
        "New folder"
      );
      await ipcRenderer.invoke("makeFolder", selectedNodePath);
      setTreeData(data);
      setRightClickInfo(null);
      setRightClickMenuVisible(false);
    }
  };

  const menu = (
    <Menu>
      {/* rename */}
      {rightClickInfo ? (
        <Menu.Item key="1" onClick={() => setShowRenameInput(true)}>
          {showRenameInput ? (
            <Search
              placeholder={rightClickInfo.node.title}
              enterButton={<EditFilled />}
              onSearch={onRenameSubmit}
            />
          ) : (
            "Rename"
          )}
        </Menu.Item>
      ) : null}
      {/* add folder */}
      {rightClickInfo ? (
        <Menu.Item key="2" onClick={onAddFolder}>
          Add folder
        </Menu.Item>
      ) : null}
      {/* move to trash */}
      {rightClickInfo ? (
        <Menu.Item key="3" onClick={onMoveToTrash}>
          Move to Trash
        </Menu.Item>
      ) : null}
    </Menu>
  );

  return (
    <div className="flex flex-col justify-between h-full p-4">
      <div className="top">
        {/* logo */}
        <div className="flex flex-col items-center justify-center">
          <img
            src="https://sarimabbas.github.io/chaos/assets/icon.png"
            alt="logo"
            className="w-6"
          />
          <h1 className="text-2xl text-white">Chaos</h1>
        </div>
        {/* spacer */}
        <div className="h-4"></div>
        {/* tree */}
        <Dropdown
          overlay={menu}
          visible={rightClickMenuVisible}
          trigger={["contextMenu"]}
          onVisibleChange={handleVisibleChange}
        >
          <div>
            <Tree
              // style={{
              //   backgroundColor: "#4f5b62",
              //   color: "#eceff1",
              // }}
              onDragEnter={onDragEnter}
              height={500}
              onRightClick={onRightClick}
              treeData={treeData}
              onDrop={onDrop}
              onSelect={onSelect}
              autoExpandParent={false}
              draggable
            />
          </div>
        </Dropdown>
      </div>
      {/* choose folder button */}
      <div className="flex justify-center">
        <div
          onClick={chooseRootFolder}
          className="inline-block px-2 py-1 mx-auto bg-gray-300 rounded-md cursor-pointer hover:bg-gray-400"
        >
          Choose folder (⌘+O)
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
