import { Static, Type } from "@sinclair/typebox";

export enum PaymentOutcome {
  AUTHORIZED = "Authorized",
  REJECTED = "Rejected",
}

export const PaymentOutcomeSchema = Type.Enum(PaymentOutcome);

export const PaymentRequestSchema = Type.Object({
  paymentMethod: Type.String(),
  paymentOutcome: PaymentOutcomeSchema,
});

export type PaymentRequestSchemaDTO = Static<typeof PaymentRequestSchema>;
