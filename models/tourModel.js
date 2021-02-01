const mongoose = require("mongoose");

const tourSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "A Tour must have a name"],
    unique: true,
    trim: true,
  },
  ratingsAverage: {
    type: Number,
    default: 4.5,
  },
  ratingsQuantity: {
    type: Number,
    default: 0,
  },
  price: {
    type: Number,
    required: [true, "A Tour must have a price"],
  },
  priceDiscount: Number,
  summary: {
    type: String,
    trim: true,
    required: [true, "A Tour must have a summary"],
  },
  duration: {
    type: Number,
    required: [true, "A Tour must have a duration"],
  },
  maxGroupSize: {
    type: Number,
    required: [true, "A Tour must have a group size"],
  },
  difficulty: {
    type: String,
    required: [true, "A Tour must have a difficulty"],
  },
  description: {
    type: String,
    trim: true,
  },
  imageCover: {
    type: String,
    required: [true, "A Tour must have a cover image"],
  },
  images: [String],
  createdAt: {
    type: Date,
    default: Date.now(),
    select: false,
  },
  startDates: [Date],
});

const Tour = mongoose.model("Tour", tourSchema);

module.exports = Tour;