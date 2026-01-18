// Migrations are an early feature. Currently, they're nothing more than this
// temporary script runner.

const anchor = require("@coral-xyz/anchor");

module.exports = async function (_provider: typeof anchor.AnchorProvider) {
  // Configure client to use the provider.
  anchor.setProvider(_provider);

  // Add your deploy script here.
};
