/// <reference types="vite/client" />

// Vite ?url imports for WASM files
declare module "@noir-lang/acvm_js/web/acvm_js_bg.wasm?url" {
  const url: string;
  export default url;
}

declare module "@noir-lang/noirc_abi/web/noirc_abi_wasm_bg.wasm?url" {
  const url: string;
  export default url;
}

// Generic WASM URL imports
declare module "*.wasm?url" {
  const url: string;
  export default url;
}
