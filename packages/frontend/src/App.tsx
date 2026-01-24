import { Routes, Route } from "react-router-dom";
import { LandingPage } from "./pages/LandingPage";
import DemoPage from "./pages/DemoPage";
import { WalletProvider } from "./components/WalletProvider";

function App() {
  return (
    <WalletProvider>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/demo" element={<DemoPage />} />
      </Routes>
    </WalletProvider>
  );
}

export default App;
