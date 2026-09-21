import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { OrderStatus, PaymentMethod, PaymentStatus, Role } from '@prisma/client';

import { AdminService } from './admin.service';
import { ProductModel } from '../../models/product.model';
import { OrderModel } from '../../models/order.model';
import { UserModel } from '../../models/user.model';
import { ReviewModel } from '../../models/review.model';
import { AdminLogModel } from '../../models/admin-log.model';

describe('AdminService', () => {
  let service: AdminService;
  let orders: Record<string, jest.Mock>;
  let users: Record<string, jest.Mock>;

  beforeEach(async () => {
    orders = {
      findUnique: jest.fn(),
      update: jest.fn().mockResolvedValue({ id: 'o1' }),
      updatePayment: jest.fn().mockResolvedValue({ id: 'pay1' }),
      restoreStockTransaction: jest.fn().mockResolvedValue(true),
    };
    users = {
      findUnique: jest.fn(),
      update: jest.fn().mockResolvedValue({ id: 'u2', role: Role.ADMIN }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: ProductModel, useValue: {} },
        { provide: OrderModel, useValue: orders },
        { provide: UserModel, useValue: users },
        { provide: ReviewModel, useValue: {} },
        { provide: AdminLogModel, useValue: {} },
      ],
    }).compile();

    service = module.get(AdminService);
  });

  describe('updateOrderStatus — transitions', () => {
    const orderIn = (status: OrderStatus) => ({
      id: 'o1',
      status,
      payment: { method: PaymentMethod.COD, status: PaymentStatus.PENDING },
    });

    it('allows a forward move through the fulfilment flow', async () => {
      orders.findUnique.mockResolvedValue(orderIn(OrderStatus.PROCESSING));
      await expect(service.updateOrderStatus('o1', OrderStatus.SHIPPED)).resolves.toBeDefined();
    });

    it('rejects moving a delivered order back to pending', async () => {
      orders.findUnique.mockResolvedValue(orderIn(OrderStatus.DELIVERED));
      await expect(service.updateOrderStatus('o1', OrderStatus.PENDING)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(orders.update).not.toHaveBeenCalled();
    });

    it('rejects re-cancelling an already cancelled order', async () => {
      orders.findUnique.mockResolvedValue(orderIn(OrderStatus.CANCELLED));
      await expect(service.updateOrderStatus('o1', OrderStatus.CANCELLED)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('rejects any move out of a terminal cancelled state', async () => {
      orders.findUnique.mockResolvedValue(orderIn(OrderStatus.CANCELLED));
      await expect(service.updateOrderStatus('o1', OrderStatus.SHIPPED)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('404s on an unknown order', async () => {
      orders.findUnique.mockResolvedValue(null);
      await expect(service.updateOrderStatus('nope', OrderStatus.PAID)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('updateOrderStatus — inventory', () => {
    it('returns stock to inventory when an order is cancelled', async () => {
      orders.findUnique.mockResolvedValue({
        id: 'o1', status: OrderStatus.PROCESSING, payment: null,
      });
      await service.updateOrderStatus('o1', OrderStatus.CANCELLED);
      expect(orders.restoreStockTransaction).toHaveBeenCalledWith('o1');
    });

    it('returns stock to inventory when an order is refunded', async () => {
      orders.findUnique.mockResolvedValue({
        id: 'o1', status: OrderStatus.DELIVERED, payment: null,
      });
      await service.updateOrderStatus('o1', OrderStatus.REFUNDED);
      expect(orders.restoreStockTransaction).toHaveBeenCalledWith('o1');
    });

    it('does not touch inventory on an ordinary fulfilment step', async () => {
      orders.findUnique.mockResolvedValue({
        id: 'o1', status: OrderStatus.PROCESSING, payment: null,
      });
      await service.updateOrderStatus('o1', OrderStatus.SHIPPED);
      expect(orders.restoreStockTransaction).not.toHaveBeenCalled();
    });

    it('settles a COD payment on delivery', async () => {
      orders.findUnique.mockResolvedValue({
        id: 'o1',
        status: OrderStatus.SHIPPED,
        payment: { method: PaymentMethod.COD, status: PaymentStatus.PENDING },
      });
      await service.updateOrderStatus('o1', OrderStatus.DELIVERED);
      expect(orders.updatePayment).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: PaymentStatus.SUCCEEDED }) }),
      );
    });
  });

  describe('updateUserRole — rank', () => {
    const admin = { id: 'a1', role: Role.ADMIN };
    const superAdmin = { id: 's1', role: Role.SUPER_ADMIN };

    it('stops an admin from granting the super admin role', async () => {
      users.findUnique.mockResolvedValue({ id: 'u2', role: Role.USER });
      await expect(service.updateUserRole(admin, 'u2', Role.SUPER_ADMIN)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(users.update).not.toHaveBeenCalled();
    });

    it('stops an admin from demoting a super admin', async () => {
      users.findUnique.mockResolvedValue({ id: 'u2', role: Role.SUPER_ADMIN });
      await expect(service.updateUserRole(admin, 'u2', Role.USER)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('lets a super admin grant the super admin role', async () => {
      users.findUnique.mockResolvedValue({ id: 'u2', role: Role.USER });
      await expect(service.updateUserRole(superAdmin, 'u2', Role.SUPER_ADMIN)).resolves.toBeDefined();
    });

    it('lets an admin promote an ordinary user to admin', async () => {
      users.findUnique.mockResolvedValue({ id: 'u2', role: Role.USER });
      await expect(service.updateUserRole(admin, 'u2', Role.ADMIN)).resolves.toBeDefined();
    });

    it('still refuses self role changes', async () => {
      await expect(service.updateUserRole(superAdmin, 's1', Role.USER)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });
});
