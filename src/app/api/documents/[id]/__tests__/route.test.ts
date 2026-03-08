/**
 * @jest-environment node
 */
import { GET, PATCH, DELETE } from "../route";
import type { NextRequest } from "next/server";

jest.mock("@/lib/documents-store-server", () => ({
  getDocumentById: jest.fn(),
  updateDocumentStatus: jest.fn(),
  deleteDocument: jest.fn(),
}));

const {
  getDocumentById,
  updateDocumentStatus,
  deleteDocument,
} = require("@/lib/documents-store-server");

const mockParams = (id: string) => Promise.resolve({ id });

describe("Documents [id] API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/documents/[id]", () => {
    it("returns document when found", async () => {
      const mockDoc = {
        id: "doc-1",
        name: "Contract.pdf",
        recipients: "john@test.com",
        status: "completed",
        createdAt: "2024-01-01",
        updatedAt: "2024-01-01",
      };
      (getDocumentById as jest.Mock).mockResolvedValue(mockDoc);

      const res = await GET({} as NextRequest, { params: mockParams("doc-1") });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data).toEqual(mockDoc);
    });

    it("returns 404 when document not found", async () => {
      (getDocumentById as jest.Mock).mockResolvedValue(null);

      const res = await GET({} as NextRequest, { params: mockParams("missing") });

      expect(res.status).toBe(404);
    });

    it("returns 400 when id is missing", async () => {
      const res = await GET({} as NextRequest, { params: mockParams("") });
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain("Missing");
    });
  });

  describe("PATCH /api/documents/[id]", () => {
    it("updates document status", async () => {
      const updated = {
        id: "doc-1",
        name: "Contract.pdf",
        status: "completed",
        updatedAt: "2024-01-02",
      };
      (updateDocumentStatus as jest.Mock).mockResolvedValue(updated);

      const req = new Request("http://localhost/api/documents/doc-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      });

      const res = await PATCH(req, { params: mockParams("doc-1") });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.status).toBe("completed");
      expect(updateDocumentStatus).toHaveBeenCalledWith("doc-1", "completed");
    });

    it("returns 400 when status is missing", async () => {
      const req = new Request("http://localhost/api/documents/doc-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const res = await PATCH(req, { params: mockParams("doc-1") });
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain("Missing status");
    });

    it("returns 400 for invalid status", async () => {
      const req = new Request("http://localhost/api/documents/doc-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "invalid" }),
      });

      const res = await PATCH(req, { params: mockParams("doc-1") });
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain("Invalid status");
    });

    it("returns 404 when document not found", async () => {
      (updateDocumentStatus as jest.Mock).mockResolvedValue(null);

      const req = new Request("http://localhost/api/documents/doc-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      });

      const res = await PATCH(req, { params: mockParams("doc-1") });

      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /api/documents/[id]", () => {
    it("deletes document and returns success", async () => {
      (deleteDocument as jest.Mock).mockResolvedValue(true);

      const res = await DELETE({} as NextRequest, { params: mockParams("doc-1") });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(deleteDocument).toHaveBeenCalledWith("doc-1");
    });

    it("returns 404 when document not found", async () => {
      (deleteDocument as jest.Mock).mockResolvedValue(false);

      const res = await DELETE({} as NextRequest, { params: mockParams("missing") });

      expect(res.status).toBe(404);
    });
  });
});
