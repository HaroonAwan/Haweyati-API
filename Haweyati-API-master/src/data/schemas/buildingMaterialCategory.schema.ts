import { Schema } from 'mongoose'
import { ImagesSchema } from './images.schema'

export const BuildingMaterialCategorySchema = new Schema(
  {
    name: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    image: {
      type: ImagesSchema,
      required: true
    },
    status: {
      type: String,
      required: false,
      default: 'Active'
    }
  },
  { timestamps: true }
)
