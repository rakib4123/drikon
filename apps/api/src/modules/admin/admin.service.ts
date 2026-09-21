// apps/api/src/modules/admin/admin.service.ts
import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { OrderStatus, PaymentMethod, PaymentStatus, Prisma, Role } from '@prisma/client';
import { ProductModel } from '../../models/product.model';
import { OrderModel } from '../../models/order.model';
import { UserModel } from '../../models/user.model';
import { ReviewModel } from '../../models/review.model';
import { AdminLogModel } from '../../models/admin-log.model';
import type {
  AdminOrderQueryDto,
  AdminUserQueryDto,
  AuditLogQueryDto,
} from './dto/admin.dto';

const REVENUE_STATUSES: OrderStatus[] = [
  OrderStatus.PAID,
  OrderStatus.PROCESSING,
  OrderStatus.SHIPPED,
  OrderStatus.DELIVERED,
];

/**
 * Legal order-status transitions. Without this any status could jump to any other
 * — including DELIVERED back to PENDING, which would re-open a finished order and
 * (now that cancelling restocks) let inventory be restored twice.
 */
const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING]: [OrderStatus.PAID, OrderStatus.PROCESSING, OrderStatus.CANCELLED],
  [OrderStatus.PAID]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED, OrderStatus.REFUNDED],
  [OrderStatus.PROCESSING]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED, OrderStatus.REFUNDED],
  [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED, OrderStatus.CANCELLED, OrderStatus.REFUNDED],
  [OrderStatus.DELIVERED]: [OrderStatus.REFUNDED],
  // Terminal.
  [OrderStatus.CANCELLED]: [],
  [OrderStatus.REFUNDED]: [],
};

/** Statuses where the customer isn't getting the goods, so stock goes back. */
const RESTOCKING_STATUSES: OrderStatus[] = [OrderStatus.CANCELLED, OrderStatus.REFUNDED];

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly products: ProductModel,
    private readonly orders: OrderModel,
    private readonly users: UserModel,
    private readonly reviews: ReviewModel,
    private readonly adminLogs: AdminLogModel,
  ) {}

  // ─────────────────────────────────────────────────────────────────
  // DASHBOARD STATS
  // ─────────────────────────────────────────────────────────────────
  async stats() {
    const [
      orderCount,
      customerCount,
      productCount,
      reviewCount,
      revenueAgg,
      pendingOrders,
      recentOrdersRaw,
      topProducts,
      statusRows,
    ] = await Promise.all([
      this.orders.count({}),
      this.users.count({}),
      this.products.count({ where: { isActive: true } }),
      this.reviews.count({}),
      this.orders.aggregate({
        _sum: { total: true },
        where: { status: { in: REVENUE_STATUSES } },
      }),
      this.orders.count({ where: { status: OrderStatus.PENDING } }),
      this.orders.findMany({
        orderBy: { createdAt: 'desc' },
        take: 6,
        select: {
          id: true,
          orderNumber: true,
          status: true,
          total: true,
          currency: true,
          createdAt: true,
          user: { select: { name: true, email: true } },
        },
      }),
      this.products.findMany({
        orderBy: { salesCount: 'desc' },
        take: 5,
        select: {
          id: true,
          name: true,
          slug: true,
          salesCount: true,
          price: true,
          currency: true,
          images: { orderBy: { position: 'asc' }, take: 1, select: { url: true } },
        },
      }),
      this.orders.groupByStatus(),
    ]);

    const ordersByStatus: Record<string, number> = {};
    for (const r of statusRows) {
      ordersByStatus[r.status] = r._count._all;
    }

    return {
      totals: {
        revenue: revenueAgg._sum.total ?? new Prisma.Decimal(0),
        orders: orderCount,
        customers: customerCount,
        products: productCount,
        reviews: reviewCount,
        pendingOrders,
      },
      ordersByStatus,
      recentOrders: recentOrdersRaw,
      topProducts: topProducts.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        salesCount: p.salesCount,
        price: p.price,
        currency: p.currency,
        image: p.images[0]?.url ?? null,
      })),
    };
  }

  // ─────────────────────────────────────────────────────────────────
  // ORDERS
  // ─────────────────────────────────────────────────────────────────
  async listOrders(query: AdminOrderQueryDto) {
    const { page, limit, status, search } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {
      ...(status && { status }),
      ...(search && {
        OR: [
          { orderNumber: { contains: search, mode: 'insensitive' } },
          { user: { email: { contains: search, mode: 'insensitive' } } },
          { user: { name: { contains: search, mode: 'insensitive' } } },
        ],
      }),
    };

    const [items, total] = await this.orders.findManyAndCount(
      {
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          items: true,
          user: { select: { id: true, name: true, email: true } },
          payment: true,
        },
      },
      { where },
    );

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: skip + items.length < total,
        hasPrev: page > 1,
      },
    };
  }

  async updateOrderStatus(id: string, status: OrderStatus) {
    const order = await this.orders.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        payment: { select: { method: true, status: true } },
      },
    });
    if (!order) throw new NotFoundException('Order not found');

    if (order.status === status) {
      throw new BadRequestException(`Order is already ${status}`);
    }
    if (!ALLOWED_TRANSITIONS[order.status].includes(status)) {
      throw new BadRequestException(
        `Cannot move an order from ${order.status} to ${status}`,
      );
    }

    if (
      status === OrderStatus.DELIVERED &&
      order.payment?.method === PaymentMethod.COD &&
      order.payment.status !== PaymentStatus.SUCCEEDED
    ) {
      await this.orders.updatePayment({
        where: { orderId: id },
        data: { status: PaymentStatus.SUCCEEDED, paidAt: new Date() },
      });
    }

    const updated = await this.orders.update({
      where: { id },
      data: {
        status,
        ...(status === OrderStatus.CANCELLED ? { cancelledAt: new Date() } : {}),
      },
      include: { items: true, user: { select: { id: true, name: true, email: true } } },
    });

    // Return the reserved units to inventory. Guarded inside the model so a
    // CANCELLED → REFUNDED style double-move can never restock twice.
    if (RESTOCKING_STATUSES.includes(status)) {
      const restored = await this.orders.restoreStockTransaction(id);
      if (restored) {
        this.logger.log({ msg: 'order.stock_restored', orderId: id, status });
      }
    }

    return updated;
  }

  async verifyPayment(orderId: string, status: PaymentStatus, adminNote?: string) {
    const order = await this.orders.findUnique({ where: { id: orderId }, select: { id: true, status: true } });
    if (!order) throw new NotFoundException('Order not found');

    const payment = await this.orders.updatePayment({
      where: { orderId },
      data: {
        status,
        adminNote,
        ...(status === PaymentStatus.SUCCEEDED
          ? { paidAt: new Date() }
          : status === PaymentStatus.FAILED
            ? { failureReason: adminNote }
            : {}),
      },
    });

    if (status === PaymentStatus.SUCCEEDED && order.status === OrderStatus.PENDING) {
      await this.orders.update({ where: { id: orderId }, data: { status: OrderStatus.PROCESSING } });
    }

    return payment;
  }

  // ─────────────────────────────────────────────────────────────────
  // AUDIT TRAIL
  // ─────────────────────────────────────────────────────────────────
  async listAuditLogs(query: AuditLogQueryDto) {
    const { page, limit, action, adminId } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.AdminLogWhereInput = {
      ...(action && { action }),
      ...(adminId && { adminId }),
    };

    const [items, total] = await this.adminLogs.findManyAndCount(
      {
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { admin: { select: { id: true, name: true, email: true } } },
      },
      { where },
    );

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: skip + items.length < total,
        hasPrev: page > 1,
      },
    };
  }

  // ─────────────────────────────────────────────────────────────────
  // USERS
  // ─────────────────────────────────────────────────────────────────
  async listUsers(query: AdminUserQueryDto) {
    const { page, limit, search } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = search
      ? {
          OR: [
            { email: { contains: search, mode: 'insensitive' } },
            { name: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

    const [items, total] = await this.users.findManyAndCount(
      {
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          avatarUrl: true,
          createdAt: true,
          lastLoginAt: true,
          lockedUntil: true,
          twoFactorEnabled: true,
          _count: { select: { orders: true } },
        },
      },
      { where },
    );

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: skip + items.length < total,
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Change a user's role, subject to rank.
   *
   * Previously any ADMIN could hand out SUPER_ADMIN (or strip it from someone
   * else), which made the two tiers interchangeable and let an ordinary admin
   * escalate an account they control. Granting or removing SUPER_ADMIN is now
   * reserved to a SUPER_ADMIN.
   */
  async updateUserRole(
    actor: { id: string; role: Role },
    targetId: string,
    role: Role,
  ) {
    if (actor.id === targetId) {
      throw new BadRequestException('You cannot change your own role');
    }

    const user = await this.users.findUnique({
      where: { id: targetId },
      select: { id: true, role: true },
    });
    if (!user) throw new NotFoundException('User not found');

    const isSuperAdmin = actor.role === Role.SUPER_ADMIN;
    if (!isSuperAdmin && user.role === Role.SUPER_ADMIN) {
      throw new ForbiddenException('Only a super admin can change a super admin\'s role');
    }
    if (!isSuperAdmin && role === Role.SUPER_ADMIN) {
      throw new ForbiddenException('Only a super admin can grant the super admin role');
    }

    return this.users.update({
      where: { id: targetId },
      data: { role },
      select: { id: true, name: true, email: true, role: true },
    });
  }
}
