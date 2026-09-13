/**
 * @x402/hedera calls `Buffer.from()` in five places without ever importing it —
 * it assumes Node's global is there. In the browser it is not, so building a
 * payment payload dies with "ReferenceError: Buffer is not defined" the moment
 * the wallet tries to sign.
 *
 * Install the global before that module is evaluated. This file is the first
 * import in x402-client.ts, and ES modules evaluate in import order, so it runs
 * ahead of @x402/hedera's module body. On the server Buffer already exists and
 * the guard leaves it alone.
 */
import { Buffer as BufferShim } from "buffer";

if (typeof globalThis.Buffer === "undefined") {
  globalThis.Buffer = BufferShim as unknown as typeof globalThis.Buffer;
}
