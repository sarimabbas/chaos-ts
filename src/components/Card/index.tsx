import React, { useState } from "react";

const Card = ({ title, description, url, image, favicon }: any) => {
  const [cardHoverHandle, setCardHoverHandle]: any = useState(null);
  const [showIframe, setShowIframe]: any = useState(false);

  const onCardMouseEnter = () => {
    const hoverHandle = setTimeout(() => {
      setShowIframe(true);
    }, 500);
    setCardHoverHandle(hoverHandle);
  };

  const onCardMouseLeave = () => {
    if (cardHoverHandle) {
      clearTimeout(cardHoverHandle);
    }
    setCardHoverHandle(null);
    setShowIframe(false);
  };

  const openPreview = () => {
    window.open(url, "_blank");
  };

  return (
    <div
      className="relative flex flex-col h-full pb-3 bg-gray-200 rounded-md cursor-pointer hover:bg-gray-300"
      onMouseEnter={onCardMouseEnter}
      onMouseLeave={onCardMouseLeave}
      onDoubleClick={openPreview}
    >
      {/* image */}
      {showIframe ? (
        <webview
          data-type="preview"
          src={url}
          className="object-cover w-full h-40 mb-4 border-gray-500 border-opacity-25 border-solid rounded-t-md"
        />
      ) : (
        <img
          src={
            image ||
            favicon ||
            "https://sarimabbas.github.io/chaos/assets/icon.png"
          }
          alt={title}
          className="object-cover w-full h-40 mb-4 border-gray-500 border-opacity-25 border-solid rounded-t-md"
          style={{
            borderBottomWidth: "1px",
          }}
          loading="lazy"
        />
      )}
      {/* information */}
      <div className="px-4">
        {/* favicon and title group */}
        <div className="flex items-center">
          {/* <img
            src={favicon}
            alt="favicon"
            className="object-cover w-5 h-5 mr-4"
          /> */}
          <h1 className="text-lg">{title}</h1>
        </div>
        {/* description */}
        <p className="mt-2">
          {description?.length > 100
            ? description.slice(0, 100) + "..."
            : description}
        </p>
      </div>
    </div>
  );
};
export default Card;
