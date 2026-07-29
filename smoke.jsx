import React from "react";
import { renderToString } from "react-dom/server";
import App from "./levant-prototype-v25.jsx";
const html = renderToString(React.createElement(App));
console.log("RENDER OK — chars:", html.length);
const must = ["The Great Kings", "Pass", "Forfeit", "stores", "Mycenae"];
for (const m of must) if (!html.includes(m)) { console.log("MISSING:", m); process.exit(1); }
console.log("all key sections present");
