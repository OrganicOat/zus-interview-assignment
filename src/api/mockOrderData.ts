import { OrderStatus, PaymentStatus } from '@/enums';
import type { IOrderResponse } from '@/types';

export const INITIAL_ORDER_RESPONSE: IOrderResponse = {
  order_id: 'ORD-10482',
  status: OrderStatus.COMPLETED,
  currency: 'MYR',
  delivery_fee: 5.0,
  delivery_fee_status: PaymentStatus.PAID,
  version: 1,
  items: [
    {
      line_id: 'L1',
      name: 'Iced Spanish Latte',
      unit_price: 13.9,
      units: [
        {
          unit_id: 'L1-1',
          status: PaymentStatus.REFUNDED,
          addons: [
            {
              addon_id: 'A1',
              name: 'Extra Shot',
              unit_price: 2.0,
              status: PaymentStatus.REFUNDED,
            },
          ],
        },
        {
          unit_id: 'L1-2',
          status: PaymentStatus.PAID,
          addons: [
            {
              addon_id: 'A1',
              name: 'Extra Shot',
              unit_price: 2.0,
              status: PaymentStatus.PAID,
            },
          ],
        },
      ],
    },
    {
      line_id: 'L2',
      name: 'Hazelnut Americano with Oat Milk and Brown Sugar Syrup',
      unit_price: 11.9,
      units: [
        {
          unit_id: 'L2-1',
          status: PaymentStatus.PAID,
          addons: [
            {
              addon_id: 'A2',
              name: 'Oat Milk',
              unit_price: 1.5,
              status: PaymentStatus.PAID,
            },
            {
              addon_id: 'A3',
              name: 'Brown Sugar Syrup',
              unit_price: 1.0,
              status: PaymentStatus.PAID,
            },
          ],
        },
        {
          unit_id: 'L2-2',
          status: PaymentStatus.REFUNDED,
          addons: [
            {
              addon_id: 'A2',
              name: 'Oat Milk',
              unit_price: 1.5,
              status: PaymentStatus.PAID,
            },
            {
              addon_id: 'A3',
              name: 'Brown Sugar Syrup',
              unit_price: 1.0,
              status: PaymentStatus.PAID,
            },
          ],
        },
      ],
    },
    {
      line_id: 'L3',
      name: 'Butter Croissant',
      unit_price: 7.9,
      units: [
        { unit_id: 'L3-1', status: PaymentStatus.PAID, addons: [] },
        { unit_id: 'L3-2', status: PaymentStatus.PAID, addons: [] },
        { unit_id: 'L3-3', status: PaymentStatus.PAID, addons: [] },
      ],
    },
  ],
};
