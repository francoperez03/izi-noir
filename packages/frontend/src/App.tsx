import { WalletProvider } from "./components/WalletProvider";

function App() {
  return (
    <WalletProvider>
      <div className="min-h-screen bg-gray-900 text-white">
        <header className="p-4 border-b border-gray-800">
          <h1 className="text-2xl font-bold">IZI-NOIR</h1>
          <p className="text-gray-400">Privacy-preserving toolkit for Solana</p>
        </header>
        <main className="p-4">
          <p>Welcome to IZI-NOIR</p>
        </main>
      </div>
    </WalletProvider>
  );
}

export default App;
