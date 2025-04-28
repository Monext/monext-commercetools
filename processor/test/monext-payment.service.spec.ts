import { describe, test, expect, afterEach, jest, beforeEach } from '@jest/globals';
import { ModifyPayment, StatusResponse } from '../src/services/types/operation.type';
import { paymentSDK } from '../src/payment-sdk';
import { DefaultPaymentService } from '@commercetools/connect-payments-sdk/dist/commercetools/services/ct-payment.service';
import {
  mockCartPagedQueryResult,
  mockCreateMonextSessionResult,
  mockGetPaymentCustomerResult,
  mockGetPaymentResult,
  mockUpdatePaymentResult,
} from './utils/mock-create-payment';
import { monextSessionCaptureResult, validPaymentResult } from './utils/mock-confirm-payment';

import * as Config from '../src/config/config';
import * as StatusHandler from '@commercetools/connect-payments-sdk/dist/api/handlers/status.handler';
import * as FastifyContext from '../src/libs/fastify/context/context';

import { AbstractPaymentService } from '../src/services/abstract-payment.service';
import { MonextPaymentService } from '../src/services/monext-payment.service';
import { HealthCheckResult } from '@commercetools/connect-payments-sdk';
import { DefaultCartService } from '@commercetools/connect-payments-sdk/dist/commercetools/services/ct-cart.service';
import {
  ConfirmPaymentRequest,
  CreatePaymentRequest,
  MonextPaymentServiceOptions,
  NotificationPaymentRequest,
  MonextTransactionTypes,
} from '../src/services/types/monext-payment.type';
import { mockGetCartResult } from './utils/mock-cart-data';
import { CtpAPI } from '../src/clients/ctp.client';
import { MonextAPI } from '../src/clients/monext.client';
import {
  monextSessionAuthorizationResult,
  monextTransactionAuthorizationResult,
  monextTransactionResult,
  validAuthorizationResult,
  validCancelResult,
  validCaptureResult,
  monextTransactionCaptureResult,
  validRefundResult,
  validAuthorizationAndCaptureResult,
} from './utils/mock-transactions';

interface FlexibleConfig {
  [key: string]: string; // Adjust the type according to your config values
}

function setupMockConfig(keysAndValues: Record<string, string>) {
  const mockConfig: FlexibleConfig = {};
  Object.keys(keysAndValues).forEach((key) => {
    mockConfig[key] = keysAndValues[key];
  });

  jest.spyOn(Config, 'getConfig').mockReturnValue(mockConfig as any);
}

const PAYMENT_ID = '20354d7a-e4fe-47af-8ff6-187bca92f3f9';

describe('monext-payment.service', () => {
  const opts: MonextPaymentServiceOptions = {
    ctCartService: paymentSDK.ctCartService,
    ctPaymentService: paymentSDK.ctPaymentService,
  };
  const paymentService: AbstractPaymentService = new MonextPaymentService(opts);
  const monextPaymentService: MonextPaymentService = new MonextPaymentService(opts);
  beforeEach(() => {
    jest.setTimeout(10000);
    jest.resetAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('getConfig', async () => {
    setupMockConfig({ monextEnvironment: 'HOMOLOGATION' });
    const result = await paymentService.config();
    expect(result?.environment).toStrictEqual('HOMOLOGATION');
  });

  test('getSupportedPaymentComponents', async () => {
    const result = await paymentService.getSupportedPaymentComponents();
    expect(result?.dropins).toHaveLength(1);
    expect(result?.dropins[0]?.type).toStrictEqual('hpp');
  });

  test('getStatus', async () => {
    const mockHealthCheckFunction: () => Promise<HealthCheckResult> = async () => {
      const result: HealthCheckResult = {
        name: 'CoCo Permissions',
        status: 'DOWN',
        message: 'CoCo Permissions are not available',
        details: {},
      };
      return result;
    };

    jest.spyOn(StatusHandler, 'healthCheckCommercetoolsPermissions').mockReturnValue(mockHealthCheckFunction);
    const paymentService: AbstractPaymentService = new MonextPaymentService(opts);
    const result: StatusResponse = await paymentService.status();
    expect(result?.checks).toHaveLength(2);
    expect(result?.status).toStrictEqual('Partially Available');
    expect(result?.checks[0]?.name).toStrictEqual('CoCo Permissions');
    expect(result?.checks[0]?.status).toStrictEqual('DOWN');
    expect(result?.checks[0]?.message).toStrictEqual('CoCo Permissions are not available');
    expect(result?.checks[0]?.details).toStrictEqual({});
    expect(result?.checks[1]?.name).toStrictEqual('Monext Payment API');
    expect(result?.checks[1]?.status).toStrictEqual('UP');
    expect(result?.checks[1]?.details).toStrictEqual({ paymentMethods: 'monext' });
    expect(result?.checks[1]?.message).toStrictEqual('Monext API is working');
  });

  test('create monext payment', async () => {
    const createPaymentOpts: CreatePaymentRequest = {
      data: {
        languageCode: undefined,
      },
    };
    jest.spyOn(DefaultCartService.prototype, 'getCart').mockReturnValue(Promise.resolve(mockGetCartResult()));
    jest.spyOn(DefaultPaymentService.prototype, 'createPayment').mockReturnValue(Promise.resolve(mockGetPaymentResult));
    jest
      .spyOn(DefaultCartService.prototype, 'addPayment')
      .mockReturnValue(Promise.resolve(mockGetCartResult(PAYMENT_ID)));
    jest.spyOn(FastifyContext, 'getProcessorUrlFromContext').mockReturnValue('http://127.0.0.1');
    jest.spyOn(FastifyContext, 'getCtSessionIdFromContext').mockReturnValue('session-id-context-1');
    jest.spyOn(CtpAPI.prototype, 'getCustomerById').mockReturnValue(Promise.resolve(mockGetPaymentCustomerResult));
    jest.spyOn(MonextAPI.prototype, 'createSession').mockReturnValue(Promise.resolve(mockCreateMonextSessionResult));
    jest
      .spyOn(DefaultPaymentService.prototype, 'updatePayment')
      .mockReturnValue(Promise.resolve(mockUpdatePaymentResult));
    const result = await monextPaymentService.createPayment(createPaymentOpts);
    expect(result.redirectURL).toStrictEqual('https://homologation-webpayment.payline.com/v2/?token=monextToken1');
  });

  test('confirm monext payment', async () => {
    const confirmPaymentPayload: ConfirmPaymentRequest = {
      paylinetoken: 'monextToken1',
      paymentReference: PAYMENT_ID,
    };
    jest
      .spyOn(CtpAPI.prototype, 'getCartByPaymentId')
      .mockReturnValue(Promise.resolve(mockCartPagedQueryResult(PAYMENT_ID)));
    jest.spyOn(DefaultPaymentService.prototype, 'getPayment').mockReturnValue(Promise.resolve(mockUpdatePaymentResult));
    jest.spyOn(MonextAPI.prototype, 'getSessionDetails').mockReturnValue(Promise.resolve(monextSessionCaptureResult));
    jest.spyOn(DefaultPaymentService.prototype, 'updatePayment').mockReturnValue(Promise.resolve(validPaymentResult));
    jest.spyOn(FastifyContext, 'getMerchantReturnUrlFromContext').mockReturnValue('http://127.0.0.1');

    const result = await monextPaymentService.confirmPayment(confirmPaymentPayload);
    expect(result.paymentReference).toStrictEqual(PAYMENT_ID);
    expect(result.returnUrl).toStrictEqual(`http://127.0.0.1/?paymentReference=${PAYMENT_ID}`);
  });

  test('notify monext payment', async () => {
    const confirmPaymentPayload: NotificationPaymentRequest = {
      token: 'monextToken1',
      notificationType: '',
      paymentEndpoint: '',
      paymentId: PAYMENT_ID,
    };
    jest
      .spyOn(CtpAPI.prototype, 'getCartByPaymentId')
      .mockReturnValue(Promise.resolve(mockCartPagedQueryResult(PAYMENT_ID)));
    jest.spyOn(DefaultPaymentService.prototype, 'getPayment').mockReturnValue(Promise.resolve(mockUpdatePaymentResult));
    jest.spyOn(MonextAPI.prototype, 'getSessionDetails').mockReturnValue(Promise.resolve(monextSessionCaptureResult));
    jest.spyOn(DefaultPaymentService.prototype, 'updatePayment').mockReturnValue(Promise.resolve(validPaymentResult));
    jest.spyOn(FastifyContext, 'getMerchantReturnUrlFromContext').mockReturnValue('http://127.0.0.1');

    const result = await monextPaymentService.notifyPayment(confirmPaymentPayload);
    expect(result.status).toStrictEqual('ACCEPTED');
    expect(result.type).toStrictEqual('Charge');
  });

  test('capturePayment', async () => {
    const modifyPaymentOpts: ModifyPayment = {
      paymentId: PAYMENT_ID,
      data: {
        actions: [
          {
            action: 'capturePayment',
            amount: {
              centAmount: 2499,
              currencyCode: 'EUR',
            },
          },
        ],
      },
    };
    jest
      .spyOn(CtpAPI.prototype, 'getCartByPaymentId')
      .mockReturnValue(Promise.resolve(mockCartPagedQueryResult(PAYMENT_ID)));
    jest
      .spyOn(MonextAPI.prototype, 'getSessionDetails')
      .mockReturnValue(Promise.resolve(monextSessionAuthorizationResult));
    jest
      .spyOn(MonextAPI.prototype, 'getTransactionDetails')
      .mockReturnValue(Promise.resolve(monextTransactionAuthorizationResult));
    jest
      .spyOn(MonextAPI.prototype, 'captureTransaction')
      .mockReturnValue(Promise.resolve(monextTransactionResult(MonextTransactionTypes.CAPTURE)));

    jest.spyOn(DefaultPaymentService.prototype, 'getPayment').mockResolvedValue(validAuthorizationResult);
    jest.spyOn(DefaultPaymentService.prototype, 'updatePayment').mockResolvedValue(validCaptureResult);

    const result = await paymentService.modifyPayment(modifyPaymentOpts);
    expect(result?.outcome).toStrictEqual('approved');
  });

  test('cancelPayment', async () => {
    const modifyPaymentOpts: ModifyPayment = {
      paymentId: PAYMENT_ID,
      data: {
        actions: [
          {
            action: 'cancelPayment',
          },
        ],
      },
    };
    jest
      .spyOn(CtpAPI.prototype, 'getCartByPaymentId')
      .mockReturnValue(Promise.resolve(mockCartPagedQueryResult(PAYMENT_ID)));
    jest
      .spyOn(MonextAPI.prototype, 'getSessionDetails')
      .mockReturnValue(Promise.resolve(monextSessionAuthorizationResult));
    jest
      .spyOn(MonextAPI.prototype, 'getTransactionDetails')
      .mockReturnValue(Promise.resolve(monextTransactionAuthorizationResult));
    jest
      .spyOn(MonextAPI.prototype, 'cancelTransaction')
      .mockReturnValue(Promise.resolve(monextTransactionResult(MonextTransactionTypes.CANCEL)));
    jest.spyOn(DefaultPaymentService.prototype, 'getPayment').mockResolvedValue(validAuthorizationResult);
    jest.spyOn(DefaultPaymentService.prototype, 'updatePayment').mockResolvedValue(validCancelResult);

    const result = await paymentService.modifyPayment(modifyPaymentOpts);
    expect(result?.outcome).toStrictEqual('approved');
  });

  test('refundPayment', async () => {
    const modifyPaymentOpts: ModifyPayment = {
      paymentId: PAYMENT_ID,
      data: {
        actions: [
          {
            action: 'refundPayment',
            amount: {
              centAmount: 2499,
              currencyCode: 'EUR',
            },
          },
        ],
      },
    };
    jest
      .spyOn(CtpAPI.prototype, 'getCartByPaymentId')
      .mockReturnValue(Promise.resolve(mockCartPagedQueryResult(PAYMENT_ID)));
    jest.spyOn(MonextAPI.prototype, 'getSessionDetails').mockReturnValue(Promise.resolve(monextSessionCaptureResult));
    jest
      .spyOn(MonextAPI.prototype, 'getTransactionDetails')
      .mockReturnValue(Promise.resolve(monextTransactionCaptureResult));
    jest
      .spyOn(MonextAPI.prototype, 'refundTransaction')
      .mockReturnValue(Promise.resolve(monextTransactionResult(MonextTransactionTypes.REFUND)));
    jest.spyOn(DefaultPaymentService.prototype, 'getPayment').mockResolvedValue(validAuthorizationAndCaptureResult);
    jest.spyOn(DefaultPaymentService.prototype, 'updatePayment').mockResolvedValue(validRefundResult);

    const result = await paymentService.modifyPayment(modifyPaymentOpts);
    expect(result?.outcome).toStrictEqual('approved');
  });
});
