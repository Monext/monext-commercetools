export const originVersion = "Commercetools Checkout"

export enum MonextBasePath {
  HOMOLOGATION = 'https://api-sandbox.retail.monext.com/v1/',
  PRODUCTION = 'https://api.retail.monext.com/v1/',
}

export enum MonextPaymentType {
  ONE_OFF = 'ONE_OFF',
}

export enum MonextUrls {
  HEALTH_CHECK = 'checkout/alive',
  CREATE_SESSION = 'checkout/payments/sessions',
  GET_SESSION_DETAILS = 'checkout/payments/sessions/{resourceId}',
  GET_TRANSACTION_DETAILS = 'checkout/transactions/{resourceId}',
  REFUND = 'checkout/transactions/{resourceId}/refunds',
  CAPTURE = 'checkout/transactions/{resourceId}/captures',
  CANCEL = 'checkout/transactions/{resourceId}/cancels',
}

export enum SessionStatus {
  ACCEPTED = 'ACCEPTED',
  ERROR = 'ERROR',
}

export enum SessionResult {
  ACCEPTED = 'ACCEPTED',
  REFUSED = 'REFUSED',
  CANCELLED = 'CANCELLED',
  INPROGRESS = 'INPROGRESS',
  ONHOLD_PARTNER = 'ONHOLD_PARTNER',
  PENDING_RISK = 'PENDING_RISK',
}

export enum MonextCaptureType {
  AUTOMATIC = 'AUTOMATIC',
  MANUAL = 'MANUAL',
  DEFERRED = 'DEFERRED',
}

export enum MonextUsedPaymentInstrument {
  CARD = 'UsedCard',
  ALTERNATIVE = 'UsedAlternativePaymentMethod',
}

export enum Labels {
  CREDITCARD = 'Credit Card',
  EN_LANG = 'EN',
  MONEXT = 'monext',
}

export type MonextItem = {
  reference?: string;
  price?: number;
  quantity?: number;
  comment?: string;
  brand?: string;
  category?: string;
  subCategory1?: string;
  subCategory2?: string;
  miscellaneous?: Record<string, string>;
  taxRate?: number;
  seller?: string;
  sellerType?: string;
};

export type MonextOrder = {
  reference: string;
  amount: number;
  taxes?: number;
  discount?: number;
  currency: string;
  date?: string;
  origin?: 'E_COM';
  country?: string;
  items?: MonextItem[];
};

export type MonextPaymentMethod = {
  paymentMethodIDs: string[];
  smartDisplayIndicator?: boolean;
};

export type MonextPayment = {
  paymentType: string;
  capture: 'AUTOMATIC' | 'MANUAL' | 'DEFERRED';
  deferredCaptureDate?: string;
  amount?: number;
};

export type MonextBuyerLegalDocument = {
  type?: string;
  number?: string;
};

export type MonextAddress = {
  title?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  mobile?: string;
  label?: string;
  streetNumber?: string;
  street?: string;
  complement?: string;
  city?: string;
  zip?: string;
  country?: string;
  addressCreateDate?: string;
};

export type MonextBuyer = {
  id?: string;
  title?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  mobile?: string;
  legalDocument?: MonextBuyerLegalDocument;
  birthDate?: string;
  legalStatus?: string;
  billingAddress?: MonextAddress;
};

export type MonextDelivery = {
  charge?: number;
  provider?: string;
  expectedDate?: string;
  timeframe?: string;
  mode?: string;
  address?: MonextAddress;
};

export type MonextSession = {
  pointOfSaleReference: string;
  paymentMethod?: MonextPaymentMethod;
  order: MonextOrder;
  payment?: MonextPayment;
  delivery?: MonextDelivery;
  privateData?: Record<string, string>;
  returnURL: string;
  notificationURL?: string;
  languageCode?: string;
};

export type MonextSessionResponse = {
  result: MonextSessionResult;
  sessionId: string;
  redirectURL: string;
} & Record<string, MonextSessionResult | string | number | boolean | null>;

export type MonextSessionResult = {
  title: string;
  code: string;
  detail: string;
} & Record<string, string | number | boolean | null>;

export type MonextDevice = {
  type?: string;
  operatingSystem?: string;
  fingerprint?: string;
  ip?: string;
  browserUserAgent?: string;
  country?: string;
};

export type MonextPaymentInstrumentData = {
  usedPaymentInstrument?: string;
  holderName?: string;
  expirationDate?: string;
  mxToken?: string;
  maskedNumber?: string;
  panType?: string;
  country?: string;
  issuer?: {
    code?: string;
    name?: string;
  };
  product?: string;
  selectedNetwork?: string;
  network?: string;
  paymentInstrumentType: {
    code: string;
  };
};

export type MonextPartnerReturnedData = {
  authorizationNumber?: string;
  authorizationDate?: string;
  issuerTransactionId?: string;
  bankAccount?: {
    bic?: string;
    holderName?: string;
    maskedIban?: string;
    country?: string;
  };
  additionalData?: {
    additionalProp?: string;
  };
};

export type MonextAuthenticationResultData = {
  eci?: string;
  effectiveAuthType?: string;
  transStatus?: string;
  transStatusReason?: string;
  messageVersion?: string;
  threeDSRequestorChallengeInd?: string;
  liabilityShift?: boolean;
};

export type MonextFraud = {
  riskDetected: boolean;
  action: string;
  code: string;
  list: string;
  rule: string;
  explanation: string;
};

export type MonextTransaction = {
  id?: string;
  date?: string;
  type?: string;
  currency?: string;
  paymentType?: string;
  capture?: string;
  requestedAmount?: number;
  authorizedAmount?: number;
  paymentMethodId?: string;
  externalWallet?: string;
  paymentInstrumentData?: MonextPaymentInstrumentData;
  partnerReturnedData?: MonextPartnerReturnedData;
  authenticationResultData?: MonextAuthenticationResultData;
  fraud?: MonextFraud;
};

export type MonextSessionDetails = {
  result?: MonextSessionResult;
  transactions?: MonextTransaction[];
  order?: MonextOrder;
  buyer?: MonextBuyer;
  delivery?: MonextDelivery;
  device?: MonextDevice;
  privateData?: Record<string, string>;
  title?: string;
  code?: string;
  detail?: string;
};

export type MonextTransactionDetails = {
  result?: MonextSessionResult;
  transaction?: MonextTransaction;
  order?: MonextOrder;
  buyer?: MonextBuyer;
  delivery?: MonextDelivery;
  device?: MonextDevice;
  privateData?: Record<string, string>;
  title?: string;
  code?: string;
  detail?: string;
  associatedTransactions?: MonextAssociatedTransactions[];
};

export type MonextAssociatedTransactions = {
  id: string;
  date?: string;
  type?: string;
  amount?: number;
  status?: 'OK' | 'KO';
  originTransactionId?: string;
};

export type MonextSessionError = {
  title: string;
  code?: string;
  detail: string;
};

export type MonextCaptureTransaction = {
  amount: number;
  comment?: string;
  items?: MonextItem[];
  privateData?: Record<string, string>;
  miscellaneous?: Record<string, string>;
  merchantReference?: string;
};

export type MonextRefundTransaction = {
  amount: number;
  comment?: string;
  items?: MonextItem[];
  privateData?: Record<string, string>;
  miscellaneous?: Record<string, string>;
  merchantReference?: string;
  option?: 'STANDARD' | 'LATE_DELIVERY' | 'FINAL';
};

export type MonextTransactionResponse = {
  result: MonextSessionResult;
  transaction: {
    id?: string;
    date?: string;
    type?: string;
  };
};
