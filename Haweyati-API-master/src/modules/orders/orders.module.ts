import { Module } from '@nestjs/common'
import { FcmModule } from '../fcm/fcm.module'
import { OrdersService } from './orders.service'
import { UnitModule } from "../unit/unit.module"
import { MongooseModule } from '@nestjs/mongoose'
import { OrdersController } from './orders.controller'
import { MulterModule } from '@nestjs/platform-express'
import { PersonsModule } from '../persons/persons.module'
import { DriversModule } from '../drivers/drivers.module'
import { ReviewsModule } from "../reviews/reviews.module"
import { CouponsModule } from "../coupons/coupons.module"
import { OrdersSchema } from '../../data/schemas/orders.schema'
import { CustomersModule } from '../customers/customers.module'
import { VehicleTypeModule } from "../vehicle-type/vehicle-type.module"
import { ShopRegistrationModule } from '../shop-registration/shop-registration.module'
import { AdminNotificationsModule } from '../admin-notifications/admin-notifications.module'

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'orders', schema: OrdersSchema }]),
    MulterModule.register({
      dest: '../uploads',
    }),
    FcmModule,
    UnitModule,
    ReviewsModule,
    DriversModule,
    PersonsModule,
    CouponsModule,
    CustomersModule,
    VehicleTypeModule,
    ShopRegistrationModule,
    AdminNotificationsModule
  ],
  providers: [OrdersService],
  controllers: [OrdersController],
  exports: [OrdersService]
})
export class OrdersModule {}
