global.window = { innerWidth: 390, innerHeight: 844, addEventListener() {}, removeEventListener() {} };
import React from "react";
import { renderToString } from "react-dom/server";
import App from "./levant-prototype-v25.jsx";
const html = renderToString(React.createElement(App));
console.log("MOBILE RENDER OK — chars:", html.length);
// the docked bar must exist and carry the turn line + controls
const dock = html.includes("border-top:1px solid #6B5B3E") || html.includes("borderTop");
console.log("docked bar present:", dock);
for (const m of ["The Great Kings", "Pass", "Forfeit", "Chronicle"]) if (!html.includes(m)) { console.log("MISSING:", m); process.exit(1); }
console.log("all key sections present");
