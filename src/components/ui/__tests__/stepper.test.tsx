import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Stepper } from "../stepper";

const STEPS = [
  { id: "1", label: "Upload" },
  { id: "2", label: "Place fields" },
  { id: "3", label: "Recipients" },
  { id: "4", label: "Review & Send" },
];

describe("Stepper", () => {
  it("renders all steps with labels", () => {
    render(<Stepper steps={STEPS} currentStep={0} />);

    expect(screen.getByText("Upload")).toBeInTheDocument();
    expect(screen.getByText("Place fields")).toBeInTheDocument();
    expect(screen.getByText("Recipients")).toBeInTheDocument();
    expect(screen.getByText("Review & Send")).toBeInTheDocument();
  });

  it("shows step numbers for incomplete steps", () => {
    render(<Stepper steps={STEPS} currentStep={1} />);

    // Step 0 is complete (check), steps 1-3 show numbers 2, 3, 4
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
  });

  it("shows checkmarks for completed steps when completedStep is set", () => {
    render(
      <Stepper steps={STEPS} currentStep={3} completedStep={4} />
    );

    const checkmarks = document.querySelectorAll('svg');
    expect(checkmarks.length).toBeGreaterThanOrEqual(4);
  });

  it("calls onStepClick when a completed step is clicked", async () => {
    const onStepClick = jest.fn();
    const user = userEvent.setup();
    render(
      <Stepper steps={STEPS} currentStep={2} onStepClick={onStepClick} />
    );

    const buttons = screen.getAllByRole("button");
    await user.click(buttons[0]);

    expect(onStepClick).toHaveBeenCalledWith(0);
  });
});
