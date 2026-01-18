import { useState, useEffect } from "react";
import { WalletProvider } from "./components/WalletProvider";
import {
  IziNoir,
  Provider,
  createProof,
  markWasmInitialized,
  type InputValue,
} from "@izi-noir/sdk";

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
  // Tell SDK that WASM is already initialized
  markWasmInitialized();
  wasmInitialized = true;
}

interface ProofResult {
  backend: string;
  proofSize: number;
  timeMs: number;
  verified: boolean;
}

interface TestVectors {
  nrPubinputs: number;
  vkGnarkBase64: string;
  proofGnarkBase64: string;
  publicInputs: string[];
  publicInputHex: string;
}

function App() {
  const [initialized, setInitialized] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [results, setResults] = useState<ProofResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [testVectors, setTestVectors] = useState<TestVectors | null>(null);

  // Initialize WASM on mount
  useEffect(() => {
    initBrowserWasm()
      .then(() => setInitialized(true))
      .catch((err) =>
        setError(
          `Failed to initialize: ${err instanceof Error ? err.message : String(err)}`
        )
      );
  }, []);

  // Example circuit: secret^2 == expected
  const circuitFn = ([expected]: InputValue[], [secret]: InputValue[]) => {
    assert((secret as number) * (secret as number) == expected);
  };

  // Generate test vectors for Solana verifier (uses Arkworks gnark format)
  const generateTestVectors = async () => {
    setLoading("vectors");
    setError(null);
    setTestVectors(null);

    try {
      console.log("[TestVectors] Initializing Arkworks...");
      const izi = await IziNoir.init({ provider: Provider.Arkworks });
      const provingSystem = izi.getProvingSystem();

      // Noir code for circuit: secret^2 == expected
      const noirCode = `
fn main(expected: pub Field, secret: Field) {
    assert(secret * secret == expected);
}
`;

      console.log("[TestVectors] Compiling circuit...");
      const circuit = await provingSystem.compile(noirCode);

      // Get VK in gnark format
      console.log("[TestVectors] Getting VK in gnark format...");
      // @ts-expect-error - accessing internal method
      const vkGnark = await provingSystem.getVerifyingKeyGnark(circuit);
      const vkGnarkBase64 = uint8ArrayToBase64(vkGnark);
      console.log("[TestVectors] VK size:", vkGnark.length, "bytes");

      // Generate proof
      console.log("[TestVectors] Generating proof...");
      const inputs = { expected: "100", secret: "10" };
      const proofData = await provingSystem.generateProof(circuit, inputs);
      const proofGnarkBase64 = uint8ArrayToBase64(proofData.proof);
      console.log("[TestVectors] Proof size:", proofData.proof.length, "bytes");

      // Format public input as hex
      const publicInputHex = publicInputToHex(proofData.publicInputs[0]);

      // Verify locally
      console.log("[TestVectors] Verifying locally...");
      const verified = await provingSystem.verifyProof(circuit, proofData.proof, proofData.publicInputs);
      console.log("[TestVectors] Verified:", verified);

      if (!verified) {
        throw new Error("Local verification failed!");
      }

      const vectors: TestVectors = {
        nrPubinputs: 1,
        vkGnarkBase64,
        proofGnarkBase64,
        publicInputs: proofData.publicInputs,
        publicInputHex,
      };

      setTestVectors(vectors);
      console.log("[TestVectors] Test vectors generated successfully!");
    } catch (err) {
      console.error("[TestVectors] Error:", err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(null);
    }
  };

  const runProof = async (backend: "barretenberg" | "arkworks") => {
    setLoading(backend);
    setError(null);

    console.log(`[${backend}] Starting proof generation...`);

    try {
      const izi = await IziNoir.init({
        provider:
          backend === "barretenberg" ? Provider.Barretenberg : Provider.Arkworks,
      });

      console.log(`[${backend}] Compiling circuit...`);
      const start = performance.now();

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

  // Helper functions
  const uint8ArrayToBase64 = (bytes: Uint8Array): string => {
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  const publicInputToHex = (input: string): string => {
    const hex = input.startsWith("0x") ? input.slice(2) : BigInt(input).toString(16);
    return "0x" + hex.padStart(64, "0");
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
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
            <h2 className="text-xl mb-4">Generate ZK Proof</h2>
            <p className="text-gray-400 mb-4">
              Circuit: assert(secret² == 100) where secret=10
            </p>

            {!initialized ? (
              <p className="text-yellow-400">Initializing Noir WASM...</p>
            ) : (
              <div className="flex gap-4">
                <button
                  onClick={() => runProof("barretenberg")}
                  disabled={loading !== null}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50"
                >
                  {loading === "barretenberg"
                    ? "Generating..."
                    : "Barretenberg (UltraHonk)"}
                </button>

                <button
                  onClick={() => runProof("arkworks")}
                  disabled={loading !== null}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded disabled:opacity-50"
                >
                  {loading === "arkworks" ? "Generating..." : "Arkworks (Groth16)"}
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
              <h2 className="text-xl mb-4">Results</h2>
              <div className="space-y-2">
                {results.map((r, i) => (
                  <div key={i} className="p-4 bg-gray-800 rounded">
                    <p>
                      <strong>{r.backend}</strong>
                    </p>
                    <p>Size: {r.proofSize} bytes</p>
                    <p>Time: {r.timeMs}ms</p>
                    <p>Verified: {r.verified ? "Yes" : "No"}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="border-t border-gray-700 pt-6">
            <h2 className="text-xl mb-4">Solana Test Vectors</h2>
            <p className="text-gray-400 mb-4">
              Generate VK and proof in gnark format for on-chain verification
            </p>

            {initialized && (
              <button
                onClick={generateTestVectors}
                disabled={loading !== null}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded disabled:opacity-50"
              >
                {loading === "vectors" ? "Generating..." : "Generate Test Vectors"}
              </button>
            )}

            {testVectors && (
              <div className="mt-4 space-y-4">
                <div className="p-4 bg-gray-800 rounded">
                  <div className="flex justify-between items-center mb-2">
                    <strong>VK (gnark format, base64)</strong>
                    <button
                      onClick={() => copyToClipboard(testVectors.vkGnarkBase64)}
                      className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
                    >
                      Copy
                    </button>
                  </div>
                  <textarea
                    readOnly
                    value={testVectors.vkGnarkBase64}
                    className="w-full h-24 p-2 bg-gray-900 text-xs font-mono rounded border border-gray-700"
                  />
                </div>

                <div className="p-4 bg-gray-800 rounded">
                  <div className="flex justify-between items-center mb-2">
                    <strong>Proof (gnark format, base64)</strong>
                    <button
                      onClick={() => copyToClipboard(testVectors.proofGnarkBase64)}
                      className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
                    >
                      Copy
                    </button>
                  </div>
                  <textarea
                    readOnly
                    value={testVectors.proofGnarkBase64}
                    className="w-full h-16 p-2 bg-gray-900 text-xs font-mono rounded border border-gray-700"
                  />
                </div>

                <div className="p-4 bg-gray-800 rounded">
                  <strong>Public Input (hex, 32 bytes big-endian)</strong>
                  <div className="flex items-center gap-2 mt-2">
                    <code className="flex-1 p-2 bg-gray-900 text-xs font-mono rounded border border-gray-700">
                      {testVectors.publicInputHex}
                    </code>
                    <button
                      onClick={() => copyToClipboard(testVectors.publicInputHex)}
                      className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
                    >
                      Copy
                    </button>
                  </div>
                </div>

                <div className="p-4 bg-gray-800 rounded">
                  <div className="flex justify-between items-center mb-2">
                    <strong>Full JSON (for tests)</strong>
                    <button
                      onClick={() => copyToClipboard(JSON.stringify(testVectors, null, 2))}
                      className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
                    >
                      Copy JSON
                    </button>
                  </div>
                  <pre className="w-full p-2 bg-gray-900 text-xs font-mono rounded border border-gray-700 overflow-x-auto">
                    {JSON.stringify(testVectors, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </section>
        </main>
      </div>
    </WalletProvider>
  );
}

export default App;
