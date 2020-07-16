import { ipcMain, dialog } from "electron";
import PATH from "path";
import FS from "fs";
import dirTree from "directory-tree";

ipcMain.handle("getFileTree", async (event, startPath) => {
  const tree = dirTree(startPath);
  return tree;
});

ipcMain.handle("chooseFolder", async (event) => {
  return dialog.showOpenDialog({
    properties: ["openDirectory", "createDirectory"],
  });
});

ipcMain.handle("renamePath", async (event, fromPath, toPath) => {
  return FS.rename(fromPath, toPath, (err) => {
    console.log(err);
  });
});
