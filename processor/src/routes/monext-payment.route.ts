import {
  SessionHeaderAuthenticationHook,
  JWTAuthenticationHook,
  SessionQueryParamAuthenticationHook,
} from '@commercetools/connect-payments-sdk';
import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import {
  NotificationRequestParamsDTO,
  NotificationRequestQueryDTO,
  ReturnResponseSchemaDTO,
  ReturnRequestQueryDTO,
  NotificationResponseSchema,
  NotificationResponseSchemaDTO,
  PaymentRequestSchema,
  PaymentRequestSchemaDTO,
  PaymentResponseSchema,
  PaymentResponseSchemaDTO,
} from '../dtos/monext-payment.dto';
import { MonextPaymentService } from '../services/monext-payment.service';
import { log } from '../libs/logger';
import { Type } from '@sinclair/typebox';

type PaymentRoutesOptions = {
  paymentService: MonextPaymentService;
  jwtAuthHook: JWTAuthenticationHook;
  sessionHeaderAuthHook: SessionHeaderAuthenticationHook;
  SessionQueryParamHook: SessionQueryParamAuthenticationHook;
};

export const paymentRoutes = async (fastify: FastifyInstance, opts: FastifyPluginOptions & PaymentRoutesOptions) => {
  fastify.post<{ Body: PaymentRequestSchemaDTO; Reply: PaymentResponseSchemaDTO }>(
    '/payment',
    {
      preHandler: [opts.sessionHeaderAuthHook.authenticate()],
      schema: {
        body: PaymentRequestSchema,
        response: {
          200: PaymentResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const resp = await opts.paymentService.createPayment({
        data: request.body,
      });
      return reply.status(200).send(resp);
    },
  );

  fastify.get<{
    Reply: NotificationResponseSchemaDTO;
    Params: NotificationRequestParamsDTO;
    Querystring: NotificationRequestQueryDTO;
  }>(
    '/notification/:paymentId',
    {
      preHandler: [opts.SessionQueryParamHook.authenticate()],
      schema: {
        params: {
          type: 'object',
          properties: {
            paymentId: Type.String(),
          },
          required: ['paymentId'],
        },
        response: {
          200: NotificationResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const resp = await opts.paymentService.notifyPayment({ ...request.query, ...request.params });
      return reply.status(200).send(resp);
    },
  );

  fastify.get<{
    Reply: ReturnResponseSchemaDTO;
    Querystring: ReturnRequestQueryDTO;
  }>(
    '/return',
    {
      preHandler: [opts.SessionQueryParamHook.authenticate()],
    },
    async (request, reply) => {
      const resp = await opts.paymentService.confirmPayment(request.query);
      return reply.redirect(resp.returnUrl);
    },
  );
};
