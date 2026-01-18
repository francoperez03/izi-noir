import { useState, useEffect } from "react";
import { WalletProvider } from "./components/WalletProvider";
import { IziNoir, Provider, createProof, markWasmInitialized, type InputValue } from "@izi-noir/sdk";

// Browser WASM initialization - required for Vite bundling
// The SDK's initNoirWasm() doesn't know about Vite's bundled WASM URLs
import initNoirC from "@noir-lang/noirc_abi";
import initACVM from "@noir-lang/acvm_js";
import acvm from "@noir-lang/acvm_js/web/acvm_js_bg.wasm?url";
import noirc from "@noir-lang/noirc_abi/web/noirc_abi_wasm_bg.wasm?url";

// Declare assert for circuit functions (parsed by SDK, not executed)
declare function assert(condition: boolean): void;

// Initialize WASM once for the browser
let wasmInitialized = false;
async function initBrowserWasm() {
  if (wasmInitialized) return;
  await Promise.all([initACVM(fetch(acvm)), initNoirC(fetch(noirc))]);
  // Tell SDK that WASM is already initialized (so IziNoir.init() won't re-init)
  markWasmInitialized();
  wasmInitialized = true;
}

interface ProofResultDisplay {
  backend: string;
  proofSize: number;
  timeMs: number;
  verified: boolean;
}

function App() {
  const [initialized, setInitialized] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [results, setResults] = useState<ProofResultDisplay[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Initialize WASM on mount
  useEffect(() => {
    initBrowserWasm()
      .then(() => setInitialized(true))
      .catch((err) =>
        setError(`Failed to initialize: ${err instanceof Error ? err.message : String(err)}`)
      );
  }, []);

  // Circuito de ejemplo: secret^2 == expected
  const circuitFn = ([expected]: InputValue[], [secret]: InputValue[]) => {
    assert((secret as number) * (secret as number) == expected);
  };

  const runProof = async (backend: "barretenberg" | "arkworks") => {
    setLoading(backend);
    setError(null);

    console.log(`[${backend}] Starting proof generation...`);

    try {
      // IziNoir.init() - WASM already initialized above
      const izi = await IziNoir.init({
        provider:
          backend === "barretenberg" ? Provider.Barretenberg : Provider.Arkworks,
      });

      console.log(`[${backend}] Compiling circuit...`);
      const start = performance.now();

      // Use legacy API with the initialized proving system
      const result = await createProof([100], [10], circuitFn, {
        provingSystem: izi.getProvingSystem(),
      });

      const elapsed = performance.now() - start;
      console.log(`[${backend}] Proof generated successfully!`);
      console.log(`[${backend}] Proof size: ${result.proof.length} bytes`);
      console.log(`[${backend}] Time: ${Math.round(elapsed)}ms`);
      console.log(`[${backend}] Verified: ${result.verified}`);

      setResults((prev) => [
        ...prev,
        {
          backend,
          proofSize: result.proof.length,
          timeMs: Math.round(elapsed),
          verified: result.verified,
        },
      ]);
    } catch (err) {
      console.error(`[${backend}] Error:`, err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(null);
    }
  };

  return (
    <WalletProvider>
      <div className="min-h-screen bg-gray-900 text-white">
        <header className="p-4 border-b border-gray-800">
          <h1 className="text-2xl font-bold">IZI-NOIR</h1>
          <p className="text-gray-400">Privacy-preserving toolkit for Solana</p>
        </header>

        <main className="p-4 space-y-6">
          <section>
            <h2 className="text-xl mb-4">Generar Prueba ZK</h2>
            <p className="text-gray-400 mb-4">
              Circuito: assert(secret² == 100) donde secret=10
            </p>

            {!initialized ? (
              <p className="text-yellow-400">Inicializando Noir WASM...</p>
            ) : (
              <div className="flex gap-4">
                <button
                  onClick={() => runProof("barretenberg")}
                  disabled={loading !== null}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50"
                >
                  {loading === "barretenberg"
                    ? "Generando..."
                    : "Barretenberg (UltraHonk)"}
                </button>

                <button
                  onClick={() => runProof("arkworks")}
                  disabled={loading !== null}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded disabled:opacity-50"
                >
                  {loading === "arkworks"
                    ? "Generando..."
                    : "Arkworks (Groth16)"}
                </button>
              </div>
            )}
          </section>

          {error && (
            <div className="p-4 bg-red-900/50 border border-red-700 rounded">
              <p className="text-red-400">{error}</p>
            </div>
          )}

          {results.length > 0 && (
            <section>
              <h2 className="text-xl mb-4">Resultados</h2>
              <div className="space-y-2">
                {results.map((r, i) => (
                  <div key={i} className="p-4 bg-gray-800 rounded">
                    <p>
                      <strong>{r.backend}</strong>
                    </p>
                    <p>Tamaño: {r.proofSize} bytes</p>
                    <p>Tiempo: {r.timeMs}ms</p>
                    <p>Verificado: {r.verified ? "✅" : "❌"}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </main>
      </div>
    </WalletProvider>
  );
}

export default App;
