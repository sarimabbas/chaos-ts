import React, { useState } from "react";

export const GeneralContext = React.createContext({
  state: {
    currentlySelectedRelativeFolderPath: "",
    currentlySelectedFolderPath: "",
  },
  setState: function (...args: any): any {},
});

export const GeneralContextProvider = (props: any) => {
  const [state, setState] = useState({
    currentlySelectedRelativeFolderPath: "",
    currentlySelectedFolderPath: "",
  });
  return (
    <GeneralContext.Provider value={{ state, setState }}>
      {props.children}
    </GeneralContext.Provider>
  );
};
