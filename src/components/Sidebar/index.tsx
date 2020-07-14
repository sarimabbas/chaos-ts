import React, { useEffect, useState } from "react";
import { ipcRenderer } from "electron";
import { Tree } from "antd";
const { DirectoryTree } = Tree;

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
    console.log(info);
    // expandedKeys 需要受控时设置
    // this.setState({
    //   expandedKeys: info.expandedKeys,
    // });
  };

  const onDrop = (info: any) => {
    console.log(info);
    const dropKey = info.node.props.eventKey;
    const dragKey = info.dragNode.props.eventKey;

    const dropPos = info.node.props.pos.split("-");
    const dropPosition =
      info.dropPosition - Number(dropPos[dropPos.length - 1]);

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
    const data = [...treeData];

    // Find dragObject
    let dragObj: any;
    loop(data, dragKey, (item: any, index: any, arr: any) => {
      arr.splice(index, 1);
      dragObj = item;
    });

    if (!info.dropToGap) {
      // Drop on the content
      loop(data, dropKey, (item: any) => {
        item.children = item.children || [];
        // where to insert
        item.children.push(dragObj);
      });
    } else if (
      (info.node.props.children || []).length > 0 && // Has children
      info.node.props.expanded && // Is expanded
      dropPosition === 1 // On the bottom gap
    ) {
      loop(data, dropKey, (item: any) => {
        item.children = item.children || [];
        // where to insert
        item.children.unshift(dragObj);
      });
    } else {
      let ar;
      let i;
      loop(data, dropKey, (item: any, index: any, arr: any) => {
        ar = arr;
        i = index;
      });
      if (dropPosition === -1) {
        ar.splice(i, 0, dragObj);
      } else {
        ar.splice(i + 1, 0, dragObj);
      }
    }

    setTreeData(data);
  };

  return (
    <div>
      <h1>Hello, I'm a tree view</h1>
      <DirectoryTree
        treeData={treeData}
        onDragEnter={onDragEnter}
        onDrop={onDrop}
        multiple
        draggable
        blockNode
      />
    </div>
  );
};

export default Sidebar;
