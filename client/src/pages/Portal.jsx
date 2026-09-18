import { createPortal } from "react-dom";

// Renders children directly into document.body, outside of the page's
// DOM subtree. Modals must use this: the page wrapper in Layout.jsx
// plays a mount animation (`bw-page-enter`) that animates opacity/transform,
// which creates a new CSS stacking context for the whole page. Any modal
// rendered *inside* that subtree gets its z-index trapped inside that
// context, so it can never stack above the sticky header (z-40) no matter
// how high its own z-index is — the header ends up painted on top of it.
// Portaling to <body> sidesteps the trap entirely.
export default function Portal({ children }) {
  return createPortal(children, document.body);
}
