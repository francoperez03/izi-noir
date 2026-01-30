import { Routes, Route } from "react-router-dom";
import { LandingPage } from "./pages/LandingPage";
import DemoPage from "./pages/DemoPage";
import { WhyPage } from "./pages/WhyPage";
import { WalletProvider } from "./components/WalletProvider";
import { Navbar } from "./components/Navbar";

function App() {
  return (
    <WalletProvider>
      <Navbar />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/why" element={<WhyPage />} />
        <Route path="/demo" element={<DemoPage />} />
      </Routes>
    </WalletProvider>
  );
}

export default App;
