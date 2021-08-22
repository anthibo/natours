const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
const Tour = require('./../models/tourModel')
const Booking = require('./../models/bookingModel')
const catchAsync = require('./../utils/catchAsync')
const factory = require('./handlerFactory')
const AppError = require('../utils/appError')



exports.getCheckoutSession = catchAsync(async (req, res, next) => {
    //get curremtly booked tour
    const tour = await Tour.findById(req.params.tourId)

    // create checkout session
    const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        success_url: `${req.protocol}://${req.get('host')}/?tour=${req.params.tourId}&user=${req.user.id}&price=${tour.price}`,
        cancel_url: `${req.protocol}://${req.get('host')}/tour/${tour.slug}/`,
        customer_email: req.user.email,
        client_reference_id: req.params.tourId,
        line_items: [{
            name: `${tour.name} Tour`,
            description: tour.summary,
            images: [`https://www.natours.dev/img/tours/${tour.imageCover}`],
            amount: tour.price * 100,
            currency: 'usd',
            quantity: 1
        }]

    })


    // create session as response
    res.status(200).json({
        status: 'success',
        session
    })

})

exports.createBookingCheckout = catchAsync(async (req, res, next) => {
    //this is only temporary because its unsecure
    const { tour, user, price } = req.query
    if (!tour && !user && !price) {
        return next()
    }
    const booking = await Booking.create({ tour, user, price })
    console.log(booking)
    res.redirect(req.originalUrl.split('?')[0])
    next()

})
exports.createBooking = factory.createOne(Booking)
exports.getBooking = factory.getOne(Booking)
exports.getAllBooking = factory.getAll(Booking)
exports.updateBooking = factory.updateOne(Booking)
exports.deleteBooking = factory.deleteOne(Booking)
