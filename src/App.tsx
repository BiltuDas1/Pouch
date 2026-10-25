import { Route, Routes } from "react-router";
import Home from "./pages/homepage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/mod/:moduleName" element={<Home />} />
    </Routes>
  );
}
