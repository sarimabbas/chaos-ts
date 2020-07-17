import React from "react";

export default ({ title, description, url, image, favicon }: any) => {
  return (
    <div className="flex flex-col px-4 py-4 bg-gray-300 rounded-md shadow-lg">
      {image ? (
        <img
          src={image}
          alt={title}
          className="object-scale-down h-24 my-5"
          loading="lazy"
        />
      ) : (
        <div className="object-scale-down h-24 my-5" />
      )}
      <div>
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
        <p className="mt-2">{description}</p>
      </div>
    </div>
  );
};
