import { Routes, Route } from "react-router-dom";
import DemoPage from "./pages/DemoPage";
import { LandingPage } from "./pages/LandingPage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<DemoPage />} />
      <Route path="/landing" element={<LandingPage />} />
    </Routes>
  );
}

export default App;
