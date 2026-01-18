import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { expect } from "chai";

describe("izi-noir", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  // TODO: Import generated types after first build
  // const program = anchor.workspace.IziNoir as Program<IziNoir>;

  it("initializes", async () => {
    // TODO: Add initialization test
    expect(true).to.be.true;
  });

  it("verifies a proof", async () => {
    // TODO: Add proof verification test
    expect(true).to.be.true;
  });
});
