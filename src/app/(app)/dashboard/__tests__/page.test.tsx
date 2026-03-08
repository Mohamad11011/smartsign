import { render, screen, waitFor } from "@testing-library/react";
import DashboardPage from "../page";

global.fetch = jest.fn();

describe("Dashboard", () => {
  beforeEach(() => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => [] });
  });

  it("renders dashboard title", async () => {
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("Dashboard")).toBeInTheDocument();
    });
  });

  it("renders Documents and Analytics sections", async () => {
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("Documents")).toBeInTheDocument();
      expect(screen.getByText("Analytics")).toBeInTheDocument();
    });
  });

  it("fetches documents on mount", async () => {
    render(<DashboardPage />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/documents");
    });
  });
});
