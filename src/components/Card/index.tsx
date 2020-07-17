import React from "react";

export default ({ title, description, url, image, favicon }: any) => {
  return (
    <div className="relative flex flex-col px-4 py-4 bg-gray-300 rounded-md hover:bg-gray-400">
      <a href={url} className="card-link" target="__blank" />
      {image ? (
        <img
          src={image || favicon}
          alt={title}
          className="object-scale-down h-24 my-5"
          loading="lazy"
        />
      ) : (
        <div className="object-fill h-24 my-5" />
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
        <p className="mt-2">
          {description?.length > 100
            ? description.slice(0, 100) + "..."
            : description}
        </p>
      </div>
    </div>
  );
};
