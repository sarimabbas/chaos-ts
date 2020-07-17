export const transformPlistToJson = (content: string) => {
  const oParser = new DOMParser();
  const oDOM = oParser.parseFromString(content, "application/xml");
  // get all keys and values
  const keyNodes = oDOM.querySelectorAll("key");
  const valueNodes = oDOM.querySelectorAll("string");
  const result: any = {};
  for (let i = 0; i < keyNodes.length; i++) {
    result[keyNodes[i].textContent as string] = valueNodes[i].textContent;
  }
  return result;
};

export const transformJsonToPlist = (obj: any) => {
  let keyValueTemplate = ``;
  for (const key in obj) {
    const value = obj[key];
    keyValueTemplate += `<key>${key}</key><string>${value}</string>`;
  }
  const finalTemplate = `
  <dict>
    ${keyValueTemplate}
  </dict>
  `;
  return finalTemplate;
};
