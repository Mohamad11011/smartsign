/** Coordinates for a signature field on a page */
export interface SignatureFieldCoord {
  id: string;
  page: number;
  x: number;
  y: number;
  signerId?: string;
  label?: string;
}

/** Signer/recipient in a multi-signer flow with signing order */
export interface Signer {
  id: string;
  name: string;
  email: string;
  role: string;
  signingOrder: number;
}

/** Document with metadata and field coordinates */
export interface DocumentWithFields {
  id: string;
  name: string;
  fileUrl: string;
  fields: SignatureFieldCoord[];
  signers: Signer[];
  status: "draft" | "pending" | "signed";
  createdAt: string;
}
