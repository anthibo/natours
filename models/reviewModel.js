// review / rating/ createdAt / ref to the tour / ref to the user 
const mongoose = require('mongoose')

const Tour = require('./tourModel')
const User = require('./userModel')

const reviewSchema = new mongoose.Schema({
    review: {
        type: String,
        required: [true, 'Review cannot be empty']
    },
    rating: {
        type: Number,
        min: [1, 'rating must be above 1'],
        max: [5, 'rating must be below 5']
    },
    createdAt: {
        type: Date,
        default: Date.now()
    },
    tour: {
        type: mongoose.Schema.ObjectId,
        ref: 'Tour',
        required: [true, ' Review must belong to a tour.']
    },
    user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: [true, ' Review must belong to a user.']
    },
},
    {
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
    })

reviewSchema.index({ tour: 1, user: 1 }, { unique: true })

reviewSchema.statics.calcAverageRatings = async function (tourId) {
    const stats = await this.aggregate([
        {
            $match: { tour: tourId }
        },
        {
            $group: {
                _id: '$tour',
                nRating: { $sum: 1 },
                avgRating: { $avg: '$rating' }
            }
        }
    ])
    if (stats.length > 0) {
        await Tour.findByIdAndUpdate(tourId, {
            ratingsQuantity: stats[0].nRating,
            ratingsAverage: stats[0].avgRating
        })
    }
    else {
        await Tour.findByIdAndUpdate(tourId, {
            ratingsQuantity: 4.5,
            ratingsAverage: 0
        })
    }

}

reviewSchema.post('save', function () {
    //this points to current review
    this.constructor.calcAverageRatings(this.tour)

})

reviewSchema.post(/^findOneAnd/, async function () {
    await this.review.constructor.calcAverageRatings(this.review.tour)
})

reviewSchema.pre(/^find/, function (next) {
    this.populate({
        path: 'user',
        select: 'name photo'
    })
    next()
})

reviewSchema.pre(/^findOneAnd/, async function (next) {
    this.review = await this.findOne()
    next()
})




const Review = new mongoose.model('Review', reviewSchema)
module.exports = Review