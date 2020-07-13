import { ipcMain } from "electron";
import dirTree from "directory-tree";

ipcMain.handle("getFileTree", async (event, startPath) => {
  const tree = dirTree(startPath);
  return tree;
});
