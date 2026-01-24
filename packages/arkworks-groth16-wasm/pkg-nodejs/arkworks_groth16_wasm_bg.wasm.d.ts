/* tslint:disable */
/* eslint-disable */
export const memory: WebAssembly.Memory;
export const acir_to_r1cs_info: (a: number, b: number) => [number, number, number];
export const prove: (a: number, b: number, c: number, d: number, e: number, f: number) => [number, number, number];
export const prove_from_r1cs: (a: number, b: number, c: number, d: number, e: number, f: number) => [number, number, number];
export const setup: (a: number, b: number) => [number, number, number];
export const setup_from_r1cs: (a: number, b: number) => [number, number, number];
export const verify: (a: number, b: number, c: number, d: number, e: number, f: number) => [number, number, number];
export const verify_gnark: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => [number, number, number];
export const version: () => [number, number];
export const init_panic_hook: () => void;
export const __wbindgen_malloc: (a: number, b: number) => number;
export const __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
export const __wbindgen_exn_store: (a: number) => void;
export const __externref_table_alloc: () => number;
export const __wbindgen_externrefs: WebAssembly.Table;
export const __wbindgen_free: (a: number, b: number, c: number) => void;
export const __externref_table_dealloc: (a: number) => void;
export const __wbindgen_start: () => void;
