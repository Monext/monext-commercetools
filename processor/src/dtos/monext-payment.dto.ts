import { Static, Type } from '@sinclair/typebox';

export enum PaymentOutcome {
  AUTHORIZED = 'Authorized',
  REJECTED = 'Rejected',
}

export const PaymentResponseSchema = Type.Object({
  //paymentReference: Type.String(),
  redirectURL: Type.String(),
});

export const ConfirmPaymentResponseSchema = Type.Object({
  paymentReference: Type.String(),
});

export const PaymentOutcomeSchema = Type.Enum(PaymentOutcome);

export const PaymentRequestSchema = Type.Object({
  languageCode: Type.Optional(Type.String()),
});

export const NotificationRequestParams = Type.Object({
  paymentId: Type.String(),
});

export const NotificationRequestQuery = Type.Object({
  notificationType: Type.String(),
  token: Type.String(),
  paymentEndpoint: Type.String(),
});

export const ReturnRequestQuery = Type.Object({
  paymentReference: Type.String(),
  paylinetoken: Type.String(),
});

export const NotificationResponseSchema = Type.Object({
  status: Type.String(),
  type: Type.String(),
});

export const ReturnResponseSchema = Type.Object({
  paymentReference: Type.String(),
  returnUrl: Type.String(),
});

export type PaymentRequestSchemaDTO = Static<typeof PaymentRequestSchema>;
export type PaymentResponseSchemaDTO = Static<typeof PaymentResponseSchema>;
export type NotificationResponseSchemaDTO = Static<typeof NotificationResponseSchema>;

export type NotificationRequestParamsDTO = Static<typeof NotificationRequestParams>;
export type NotificationRequestQueryDTO = Static<typeof NotificationRequestQuery>;

export type ReturnResponseSchemaDTO = Static<typeof ReturnResponseSchema>;
export type ReturnRequestQueryDTO = Static<typeof ReturnRequestQuery>;

export type ConfirmRequestQueryDTO = Static<typeof ReturnRequestQuery>;
