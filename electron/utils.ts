import { ipcMain, dialog } from "electron";
import PATH from "path";
import { promises as FS } from "fs";
import dirTree from "directory-tree";
import { getLinkPreview } from "link-preview-js";

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
  return FS.rename(fromPath, toPath);
});

ipcMain.handle("getLinkPreview", async (event, url) => {
  return getLinkPreview(url);
});

ipcMain.handle("readFile", async (event, path) => {
  return FS.readFile(path, "utf-8");
});

ipcMain.handle("writeFile", async (event, path, contents) => {
  return FS.writeFile(path, contents);
});
