import { Schema } from 'mongoose'
import { ImagesSchema } from './images.schema'

export const BuildingMaterialSubCategorySchema = new Schema(
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
    parent: {
      type: Schema.Types.ObjectId,
      ref: 'buildingmaterialcategory',
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
