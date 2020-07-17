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

  useEffect(() => {}, []);

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

    // this is a function that traverses the tree starting at "data" node as root
    // it does this until the key === data.key, at which point it applies a callback
    // to that data node
    const loop = async (
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
          loop(data[i].children, key, callback, pathSoFar);
        }
      }
    };

    // * Make a copy of all the data
    const data = [...treeData];

    const join = PATH.join("a", "b");
    console.log(join);

    // TODO: compute path to dragNode before any of the splicing stuff happens below

    // * Remove the drag node from the children array of its parent
    // Find dragObject i.e. the thing being dragged
    let dragObj: any;
    let dragPath: any;
    loop(data, dragKey, (item: any, index: any, arr: any, path: string) => {
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
      loop(data, dropKey, (item: any) => {
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
      loop(data, dropKey, (item: any) => {
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
      loop(data, dropKey, (item: any, index: any, arr: any) => {
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

    // TODO: compute path to dragNode after all the splicing stuff has happened
    // TODO: mv oldPath newPath
    // TODO: you can probably modify loop() with a pathBuilder argument, that is injected into the callback

    setTreeData(data);

    let newDragPath: any;
    loop(data, dragKey, (item: any, index: number, arr: any, path: string) => {
      newDragPath = path;
    });
    newDragPath = PATH.join(rootPath, newDragPath);

    console.log("new drag path", newDragPath);

    // do a move operation
    await ipcRenderer.invoke("renamePath", dragPath, newDragPath);
  };

  const onSelect = (selectedKeys, other) => {
    let selectedNodePath: any;
    loopMe(treeData, other.node.key, (node, index, all, path) => {
      selectedNodePath = path;
    });
    selectedNodePath = PATH.join(rootPath, selectedNodePath);
    console.log(selectedNodePath);
    setContextState({
      ...contextState,
      currentlySelectedFolderPath: selectedNodePath,
      currentlySelectedExplorerNode: other.node,
    });
  };

  const handleVisibleChange = (visible: boolean) => {
    console.log("visible", visible);
    if (!visible) {
      setRightClickInfo(null);
      setShowRenameInput(false);
      console.log("cleared");
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
    console.log(value);

    const data = [...treeData];

    const loop = (
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
          loop(data[i].children, key, callback, pathSoFar);
        }
      }
    };

    let oldPath: any;
    loop(data, rightClickInfo.node.key, (curr, index, data, path: string) => {
      oldPath = path;
      curr.title = value;
    });
    oldPath = PATH.join(rootPath, oldPath);

    console.log("oldPath", oldPath);

    const newPath = PATH.join(PATH.dirname(oldPath), value);
    console.log("newPath", newPath);

    await ipcRenderer.invoke("renamePath", oldPath, newPath);

    setTreeData(data);

    setRightClickInfo(null);
    console.log("cleared");
    setRightClickMenuVisible(false);
  };

  const menu = (
    <Menu>
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
    </Menu>
  );

  return (
    <div className="p-4">
      <a href="#" onClick={chooseRootFolder}>
        Choose folder
      </a>
      <div className="h-4"></div>
      <Dropdown
        overlay={menu}
        visible={rightClickMenuVisible}
        trigger={["contextMenu"]}
        onVisibleChange={handleVisibleChange}
      >
        <div>
          <Tree
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
  );
};

export default Sidebar;
