import { describe, it } from "mocha";
import * as anchor from "@coral-xyz/anchor";
import { expect } from "chai";

describe("commitment-pool", () => {
  // Basic smoke test to verify Anchor provider is configured for Devnet
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  it("initializes Anchor provider on Devnet", async () => {
    const connection = provider.connection;
    const version = await connection.getVersion();
    expect(version).to.be.ok;
  });
});

