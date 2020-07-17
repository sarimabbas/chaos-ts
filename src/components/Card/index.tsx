import React from "react";

const Card = ({ title, description, url, image, favicon }: any) => {
  return (
    <div className="relative flex flex-col h-full pb-3 bg-gray-200 rounded-md hover:bg-gray-300">
      {/* link */}
      <a href={url} className="card-link" target="__blank" />
      {/* image */}
      {image ? (
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
      ) : (
        <div className="object-cover h-40 mb-4" />
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
