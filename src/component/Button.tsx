import React from "react";
import Loader from "./Loader";

const Button = (props: any) => {
  return (
    <button disabled={props.disabled} onClick={props.onClick}>
      {props.children}
      {props.disabled && (
        <span style={{ marginLeft: "5px" }}>
          <Loader />
        </span>
      )}
    </button>
  );
};

export default Button;
