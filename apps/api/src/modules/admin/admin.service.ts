// apps/api/src/modules/admin/admin.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { OrderStatus, Prisma, Role } from '@prisma/client';
import { ProductModel } from '../../models/product.model';
import { OrderModel } from '../../models/order.model';
import { UserModel } from '../../models/user.model';
import { ReviewModel } from '../../models/review.model';
import type {
  AdminOrderQueryDto,
  AdminUserQueryDto,
} from './dto/admin.dto';

const REVENUE_STATUSES: OrderStatus[] = [
  OrderStatus.PAID,
  OrderStatus.PROCESSING,
  OrderStatus.SHIPPED,
  OrderStatus.DELIVERED,
];

@Injectable()
export class AdminService {
  constructor(
    private readonly products: ProductModel,
    private readonly orders: OrderModel,
    private readonly users: UserModel,
    private readonly reviews: ReviewModel,
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
      this.orders.findMany({ select: { status: true } }),
    ]);

    const ordersByStatus: Record<string, number> = {};
    for (const r of statusRows) {
      ordersByStatus[r.status] = (ordersByStatus[r.status] ?? 0) + 1;
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
    const order = await this.orders.findUnique({ where: { id }, select: { id: true } });
    if (!order) throw new NotFoundException('Order not found');
    return this.orders.update({
      where: { id },
      data: {
        status,
        ...(status === OrderStatus.CANCELLED ? { cancelledAt: new Date() } : {}),
      },
      include: { items: true, user: { select: { id: true, name: true, email: true } } },
    });
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

  async updateUserRole(actingUserId: string, targetId: string, role: Role) {
    if (actingUserId === targetId) {
      throw new BadRequestException('You cannot change your own role');
    }
    const user = await this.users.findUnique({ where: { id: targetId }, select: { id: true } });
    if (!user) throw new NotFoundException('User not found');
    return this.users.update({
      where: { id: targetId },
      data: { role },
      select: { id: true, name: true, email: true, role: true },
    });
  }
}
