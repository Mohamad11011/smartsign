import { render, screen } from "@testing-library/react";
import { Badge } from "../badge";

describe("Badge", () => {
  it("renders children", () => {
    render(<Badge>completed</Badge>);
    expect(screen.getByText("completed")).toBeInTheDocument();
  });

  it("applies default variant by default", () => {
    const { container } = render(<Badge>Label</Badge>);
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain("bg-primary");
  });

  it("applies success variant", () => {
    const { container } = render(<Badge variant="success">Done</Badge>);
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain("green");
  });

  it("applies destructive variant", () => {
    const { container } = render(<Badge variant="destructive">Error</Badge>);
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain("red");
  });
});
