import React from "react";
import { slide as Menu } from "react-burger-menu";
import "./burger.css";

const toggleMenu = ({ isOpen }) => {
  const menuWrap = document.querySelector(".bm-menu-wrap");
  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
  isOpen
    ? menuWrap.setAttribute("aria-hidden", false)
    : menuWrap.setAttribute("aria-hidden", true);
};

const BurgerMenu = () => {
  return (
    <Menu noOverlay onStateChange={toggleMenu}>
      <a className="bm-item" href="/">
        Home
      </a>
      <a className="bm-item" href="/show-details">
        Show Details
      </a>
      <a className="bm-item" href="/content-linking">
        Content Linking
      </a>
      <a className="bm-item" href="/detail-pane">
        Detail Pane
      </a>
      <a className="bm-item" href="/json-return">
        View JSON Data
      </a>
    </Menu>
  );
};

export default BurgerMenu;
