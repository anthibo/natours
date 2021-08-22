const path = require('path')
const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit')
const helmet = require('helmet')
const mongoSanitize = require('express-mongo-sanitize')
const xss = require('xss-clean')
const hpp = require('hpp')
const cookieParser = require('cookie-parser')
const compression = require('compression')

const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const bookingRouter = require('./routes/bookingRoutes');
const viewRouter = require('./routes/viewRoutes');

// start server
const app = express();

app.set('view engine', 'pug')
app.set('views', path.join(__dirname, 'views'))
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}



// global middlwares
//serving static files
app.use(express.static(path.join(__dirname, 'public')));
// set security http headers
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'", 'https:', 'http:', 'data:', 'ws:'],
      baseUri: ["'self'"],
      fontSrc: ["'self'", 'https:', 'http:', 'data:'],
      scriptSrc: ["'self'", 'https:', 'http:', 'blob:'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https:', 'http:'],
    },
  })
);

// body barser, reading from body into req.body
app.use(express.urlencoded({ extended: true, limit: '10kb' }))
app.use(express.json({
  limit: '10kb'
}));
app.use(cookieParser())
// data sanitization against nosql query injection 
app.use(mongoSanitize())

//data sanitizatizion against xss
app.use(xss())
// prevent parameter pollution
app.use(hpp({
  whitelist: ['duration', 'ratingsQuantity', 'ratingsAverage', 'maxGroupSize', 'difficulty', 'price']
}))
app.use(compression())

app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  // console.log(req.cookies);
  next();
});

// limit requests from same ip address
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: "Too many requests from this ip. Please try again in an hour"
})

app.use('/api', limiter)


//ROUTES
app.use('/', viewRouter);
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/booking', bookingRouter)


// * stands for everything ... considerd as an operational error
app.all('*', (req, res, next) => {
  next(new App, Error(`Can't find ${req.originalUrl} on this server`), 404);
});

app.use(globalErrorHandler);
module.exports = app;
