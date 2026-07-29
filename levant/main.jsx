// =====================================================================
//  THE GREAT KINGS — the browser entry point
// =====================================================================
//  The only file that knows a DOM exists. app.jsx is a component and engine.js is a library;
//  neither mounts anything, so both stay usable from a test that renders to a string.
// =====================================================================
import React from "react";
import { createRoot } from "react-dom/client";
import "./table.css";
import App from "./app.jsx";

createRoot(document.getElementById("root")).render(<App />);
