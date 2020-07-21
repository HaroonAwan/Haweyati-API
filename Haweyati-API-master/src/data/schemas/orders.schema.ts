import { Schema } from "mongoose";
import { LocationSchema } from "./location.schema";
import { ImagesSchema } from "./images.schema";

export const OrdersSchema = new Schema({
  service: {
    type: String,
    required: true
  },
  itemId: {
    type: String,
    required:false
  },
  dropoffLocation: {
    type: LocationSchema,
    required: true
  },
  dropoffAddress : {
    type: String,
    required: false
  },
  dropoffDate: {
    type: Date,
    required: true
  },
  dropoffTime: {
    type: String,
    required: false
  },
  image : {
    type: ImagesSchema,
    required: false
  },
  details: {
    type: Object,
    required: true
  },
  customer: {
    type: Schema.Types.ObjectId,
    Ref: 'customers',
    required: true
  },
  status: {
    type: String,
    required: false,
    default: 'Pending'
  }
});