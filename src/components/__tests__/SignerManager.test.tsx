import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SignerManager } from "../SignerManager";

describe("SignerManager", () => {
  const mockSigners = [
    {
      id: "1",
      name: "Alice",
      email: "alice@test.com",
      role: "Signer",
      signingOrder: 1,
    },
    {
      id: "2",
      name: "Bob",
      email: "bob@test.com",
      role: "Witness",
      signingOrder: 2,
    },
  ];

  it("renders existing signers", () => {
    const onChange = jest.fn();
    render(<SignerManager signers={mockSigners} onChange={onChange} />);

    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    const listItems = screen.getAllByRole("listitem");
    expect(listItems).toHaveLength(2);
  });

  it("adds a new signer when name and email are filled", async () => {
    const onChange = jest.fn();
    const user = userEvent.setup();
    render(<SignerManager signers={[]} onChange={onChange} />);

    const nameInput = screen.getByPlaceholderText(/name/i);
    const emailInput = screen.getByPlaceholderText(/email/i);
    const addButton = screen.getByRole("button", { name: /add/i });

    await user.type(nameInput, "Charlie");
    await user.type(emailInput, "charlie@test.com");
    await user.click(addButton);

    expect(onChange).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          name: "Charlie",
          email: "charlie@test.com",
          signingOrder: 1,
        }),
      ])
    );
  });

  it("does not add signer when name or email is empty", async () => {
    const onChange = jest.fn();
    const user = userEvent.setup();
    render(<SignerManager signers={[]} onChange={onChange} />);

    const addButton = screen.getByRole("button", { name: /add/i });
    await user.click(addButton);

    expect(onChange).not.toHaveBeenCalled();
  });

  it("removes signer when remove is clicked", async () => {
    const onChange = jest.fn();
    render(<SignerManager signers={mockSigners} onChange={onChange} />);

    const removeButtons = screen.getAllByRole("button", { name: "Remove" });
    await userEvent.click(removeButtons[0]);

    expect(onChange).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ name: "Bob", email: "bob@test.com" }),
      ])
    );
  });
});
