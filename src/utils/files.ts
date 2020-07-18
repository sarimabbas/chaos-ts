import PATH from "path";
import { ipcRenderer } from "electron";

export enum FileExtension {
  WEBLOC = ".webloc",
  JPEG = ".jpeg",
  JPG = ".jpg",
  PNG = ".png",
  TIFF = ".tiff",
  PDF = ".pdf",
}

export const readSupportedFile = async (node: any): Promise<object> => {
  // read file contents
  const fileContents = await ipcRenderer.invoke("readFile", node.path);
  // update node with contents
  node = {
    ...node,
    fileContents: fileContents,
  };
  // switch based on node extension
  switch (node.extension) {
    // links
    case FileExtension.WEBLOC:
      return readWebloc(node);

    // images
    case FileExtension.JPEG:
    case FileExtension.JPG:
    case FileExtension.PNG:
    case FileExtension.TIFF:
      return readImage(node);

    // documents
    case FileExtension.PDF:
      console.log("PDFs are not currently supported");
      return {};

    // everything else
    default:
      console.log("Unsupported file extension: ", node.extension);
      return {};
  }
};

// * WEBLOC

const readWebloc = async (node: any): Promise<object> => {
  // parse the contents as XML
  const oParser = new DOMParser();
  const oDOM = oParser.parseFromString(node.fileContents, "application/xml");
  // get all keys and values
  const keyNodes = oDOM.querySelectorAll("key");
  const valueNodes = oDOM.querySelectorAll("string");
  // assemble them into an object
  const result: any = {};
  for (let i = 0; i < keyNodes.length; i++) {
    result[keyNodes[i].textContent as string] = valueNodes[i].textContent;
  }
  // get link preview
  let linkPreview: any = {};
  try {
    linkPreview = await ipcRenderer.invoke("getLinkPreview", result?.URL);
  } catch (e) {
    console.log(e);
  }
  // cleanup so that it follows casing convention
  result.url = result?.URL;
  delete result.URL;
  // return
  return {
    ...node,
    ...result,
    linkPreview: linkPreview,
    fileType: "webloc",
  };
};

export const writeWebloc = (obj: object): string => {
  let keyValueTemplate = ``;
  // iterate all key values
  for (const key in obj) {
    const value = (obj as any)[key];
    // create a plist entry
    keyValueTemplate += `<key>${key}</key><string>${value}</string>`;
  }
  // insert into plist template
  const finalTemplate = `
  <dict>
    ${keyValueTemplate}
  </dict>
  `;
  return finalTemplate;
};

// * IMAGES

const readImage = (node: any): object => {
  return {
    ...node,
    fileType: "image",
  };
};

// * FILE TREES

export const convertTreeToArray = (
  // it takes the root you want to flatten
  root: any,
  // also a callback that is applied to the root with the given arguments
  callback: (root: any, arr: any[]) => any
): any[] => {
  // recursive helper
  const convertToArray = (
    root: any,
    arr: any[],
    callback: (root: any, arr: any[]) => any
  ) => {
    // apply callback to root
    callback(root, arr);
    // do the same to the children
    if (root?.children) {
      root.children.forEach((child: any) =>
        convertToArray(child, arr, callback)
      );
    }
  };
  // main function
  const arr: any = [];
  convertToArray(root, arr, callback);
  return arr;
};

export const convertTreeToSupportedFilesArray = (root: any): any[] => {
  return convertTreeToArray(root, (root, arr) => {
    // create a title property
    root.title = root.name;
    delete root.name;
    // push supported extension only
    for (let val of Object.values(FileExtension)) {
      if (root?.extension === val) {
        arr.push(root);
        break;
      }
    }
  });
};
