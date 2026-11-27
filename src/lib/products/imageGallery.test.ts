jest.mock("server-only", () => ({}), { virtual: true });
import { replaceGallery } from "./imageGallery";
import type { Prisma } from "@prisma/client";

describe("gallery snapshot", () => {
  const a = { id: "a", url: "https://res.cloudinary.com/test/a.png" };
  const b = { id: "b", url: "https://res.cloudinary.com/test/b.png" };
  function setup() {
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([{ id: "p" }]),
      image: {
        findMany: jest.fn().mockResolvedValue([a]),
        deleteMany: jest.fn(),
        createMany: jest.fn(),
      },
    };
    return { raw: tx, tx: tx as unknown as Prisma.TransactionClient };
  }
  it("retains Image identity and adds only missing rows", async () => {
    const { raw, tx } = setup();
    await replaceGallery(tx, "p", [a.url, b.url, b.url], [a.url]);
    expect(raw.image.deleteMany).not.toHaveBeenCalled();
    expect(raw.image.createMany).toHaveBeenCalledWith({
      data: [{ productId: "p", url: b.url }],
    });
    expect(raw.$queryRaw).toHaveBeenCalledTimes(1);
  });
  it("rejects stale snapshots before any deletion", async () => {
    const { raw, tx } = setup();
    await expect(replaceGallery(tx, "p", [b.url], [])).rejects.toThrow(
      "galería cambió",
    );
    expect(raw.image.deleteMany).not.toHaveBeenCalled();
    expect(raw.image.createMany).not.toHaveBeenCalled();
  });
});
