import { describe, expect, it } from "vitest";
import { SHARED_PACKAGE_NAME } from "./index.js";

describe("shared package", () => {
  it("exposes its package name as a smoke test for the toolchain", () => {
    expect(SHARED_PACKAGE_NAME).toBe("@setlister/shared");
  });
});
