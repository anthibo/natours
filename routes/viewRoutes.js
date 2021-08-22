const express = require('express')
const router = express.Router()
const viewController = require('./../controllers/viewController')
const authController = require('./../controllers/authController')
const bookinController = require('./../controllers/bookingController')

router.get('/', bookinController.createBookingCheckout, authController.isLoggedIn, viewController.getOverview)
router.get('/tour/:slug', authController.isLoggedIn, viewController.getTour)

//login route
router.route('/login').get(authController.isLoggedIn, viewController.getLoginForm)
router.route('/me').get(authController.protect, viewController.getAccount)
router.route('/my-tours').get(authController.protect, viewController.getMyTours)
router.post('/submit-user-data', authController.protect, viewController.updateUserData)



module.exports = router
