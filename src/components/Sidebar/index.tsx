import React, { useEffect, useState } from "react";
import { ipcRenderer } from "electron";
import { Tree } from "antd";
const { DirectoryTree } = Tree;

class Position {
  pos: number[];
  constructor(pos: string) {
    this.pos = pos.split("-").map((p) => parseInt(p));
    this.pos.shift();
  }

  popRight() {
    const res = this.pos.pop();
    if (res === undefined) {
      return -1;
    }
    return res;
  }

  popLeft() {
    const res = this.pos.shift();
    if (res === undefined) {
      return -1;
    }
    return res;
  }

  toString() {
    return this.pos.join("-");
  }
}

const Sidebar = () => {
  const [treeData, setTreeData] = useState([]);
  const [expandedKeys, setExpandedKeys] = useState([]);

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
  };

  const onDragEnter = (info: any) => {
    // this is the node that is hovered over while dragging
    console.log("on drag enter", info);

    // expandedKeys 需要受控时设置
    // this.setState({
    //   expandedKeys: info.expandedKeys,
    // });
  };

  const onDrop = (info: any) => {
    console.log("on drop", info);

    // * these are the user assigned keys for each node
    // * you gotta make sure these are unique for the drop to work
    const dropKey = info.node.key; // the thing being dropped on
    const dragKey = info.dragNode.key; // the thing being dragged

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
    const loop = (data: any, key: any, callback: any) => {
      for (let i = 0; i < data.length; i++) {
        if (data[i].key === key) {
          return callback(data[i], i, data);
        }
        if (data[i].children) {
          loop(data[i].children, key, callback);
        }
      }
    };

    // * Make a copy of all the data
    const data = [...treeData];

    // * Remove the drag node from the children array of its parent
    // Find dragObject i.e. the thing being dragged
    let dragObj: any;
    loop(data, dragKey, (item: any, index: any, arr: any) => {
      // remove the drag node from the children[] of its parent
      arr.splice(index, 1);
      dragObj = item;
    });

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
      // also get the whole array of chidlren
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

    setTreeData(data);

    // getPathFromPosition(info.node.pos);

    // the dragNode is the node being dragged
    // the position of that node is the original position

    // dragNodesKeys: the two user assigned keys in an array
    // the first key is the node being dragged
    // the second key is the node that is dropped onto

    // dropPostition is not useful; it is just the relative position
    // within that folder i.e the first position, second, third etc

    // node is the target node, which was dropped onto

    // to move stuff in the file system
    // 1. if dragNode.pos.split("-").length == node.pos.split("-").length
    //    return
    // 2.
  };

  const getPathFromPosition = async (pos: string) => {
    // build up the path to this position
    const p: Position = new Position(pos);
    let path = "";
    const pop = p.popLeft();
    let currNode: any = treeData[pop];
    path = await ipcRenderer.invoke("pathJoin", path, currNode.title);
    while (p.pos.length > 0) {
      const pop: number = p.popLeft();
      currNode = currNode.children[pop];
      path = await ipcRenderer.invoke("pathJoin", path, currNode.title);
    }

    // console.log(path);
    // console.log(currNode);

    console.log(currNode);

    console.log(path);
  };

  const onSelect = (selectedKeys, other) => {
    console.log("on click", selectedKeys, other);
  };

  return (
    <div>
      <h1>Hello, I'm a tree view</h1>
      <Tree
        treeData={treeData}
        onDragEnter={onDragEnter}
        onDrop={onDrop}
        onSelect={onSelect}
        autoExpandParent={false}
        draggable
      />
    </div>
  );
};

export default Sidebar;
