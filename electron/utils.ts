import { ipcMain } from "electron";
import PATH from "path";
import dirTree from "directory-tree";

ipcMain.handle("getFileTree", async (event, startPath) => {
  const tree = dirTree(startPath);
  return tree;
});

ipcMain.handle("pathJoin", async (event, ...paths) => {
  return PATH.join(...paths);
});
