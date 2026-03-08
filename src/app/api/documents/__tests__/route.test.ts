/**
 * @jest-environment node
 */
import { GET, POST } from "../route";

jest.mock("@/lib/documents-store-server", () => ({
  getDocuments: jest.fn(),
  createDocument: jest.fn(),
}));

const { getDocuments, createDocument } = require("@/lib/documents-store-server");

describe("Documents API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/documents", () => {
    it("returns documents from store", async () => {
      const mockDocs = [
        {
          id: "1",
          name: "Contract.pdf",
          recipients: "john@test.com",
          status: "draft",
          createdAt: "2024-01-01",
          updatedAt: "2024-01-01",
        },
      ];
      (getDocuments as jest.Mock).mockResolvedValue(mockDocs);

      const res = await GET();
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data).toEqual(mockDocs);
      expect(getDocuments).toHaveBeenCalledTimes(1);
    });

    it("returns 500 on store error", async () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
      (getDocuments as jest.Mock).mockRejectedValue(new Error("DB error"));

      const res = await GET();
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.error).toBeDefined();
      consoleSpy.mockRestore();
    });
  });

  describe("POST /api/documents", () => {
    it("creates document with required name", async () => {
      const mockDoc = {
        id: "new-id",
        name: "Agreement.pdf",
        recipients: "No recipients",
        status: "draft",
        createdAt: "2024-01-01",
        updatedAt: "2024-01-01",
      };
      (createDocument as jest.Mock).mockResolvedValue(mockDoc);

      const req = new Request("http://localhost/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Agreement.pdf" }),
      });

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data).toEqual(mockDoc);
      expect(createDocument).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Agreement.pdf",
          recipients: "No recipients",
          status: "draft",
        })
      );
    });

    it("creates document with recipients and status", async () => {
      const mockDoc = {
        id: "new-id",
        name: "Contract.pdf",
        recipients: "alice@test.com",
        recipientsDetail: [{ name: "Alice", email: "alice@test.com", role: "Signer", signingOrder: 1 }],
        status: "sent",
        createdAt: "2024-01-01",
        updatedAt: "2024-01-01",
      };
      (createDocument as jest.Mock).mockResolvedValue(mockDoc);

      const req = new Request("http://localhost/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Contract.pdf",
          recipients: "alice@test.com",
          recipientsDetail: [{ name: "Alice", email: "alice@test.com", role: "Signer", signingOrder: 1 }],
          status: "sent",
        }),
      });

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.status).toBe("sent");
      expect(createDocument).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Contract.pdf",
          recipients: "alice@test.com",
          status: "sent",
        })
      );
    });

    it("returns 400 when name is missing", async () => {
      const req = new Request("http://localhost/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain("Missing name");
      expect(createDocument).not.toHaveBeenCalled();
    });
  });
});
