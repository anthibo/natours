
const crypto = require('crypto')
const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const User = require('./../models/userModel');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const Email = require('./../utils/email');

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};


const createSendToken = (user, statusCode, req, res) => {
  const token = signToken(user._id);
  const cookiesOptions = {
    expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000),

    httpOnly: true,
    secure: req.secure || req.headers('x-forwarded-proto' === 'https')
  }

  res.cookie('jwt', token, cookiesOptions)
  user.password = undefined
  res.status(statusCode).json({
    token,
    data: {
      status: 'success',
      user,
    },
  });
}

exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    role: req.body.role,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    passwordChangedAt: req.body.passwordChangedAt
  });
  const url = `${req.protocol}://${req.get('host')}/me`;
  // console.log(url)
  await new Email(newUser, url).sendWelcome()
  createSendToken(newUser, 201, req, res)

});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  //1) check if email && password exists
  if (!email || !password) {
    return next(new AppError('Please provide email and password', 400));
  }

  //2) check if user exists && password is correct
  const user = await User.findOne({ email }).select('+password');
  // console.log(email, password);
  // console.log(user);
  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect email or password', 401));
  }
  //3) if everything is okay, send the token to the user
  createSendToken(user, 200, req, res)
});


// Only for rendered pages, no errors
exports.isLoggedIn = (async (req, res, next) => {
  if (req.cookies.jwt) {
    //1) verification  token
    try {
      const decoded = await promisify(jwt.verify)(req.cookies.jwt, process.env.JWT_SECRET);
      //2) check if user still exists
      const currentUser = await User.findById(decoded.id)
      if (!currentUser) {
        return next()
      }

      //3) check if user changed password after the token was issued
      if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next()
      }

      // there is a logged in user
      res.locals.user = currentUser
      return next();

    } catch (err) {
      return next()
    }
  }
  next()

});


exports.logout = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  })
  res.status(200).json({ status: 'success' })
}










exports.protect = catchAsync(async (req, res, next) => {
  //1) getting the token abd check if it's there
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }
  else if (req.cookies.jwt) {
    token = req.cookies.jwt
  }
  if (!token) {
    return next(
      new AppError('You are not logged in! Please log in to get acess', 401)
    );
  }
  //2) verification  token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  //3) check if user still exists
  const currentUser = await User.findById(decoded.id)
  if (!currentUser) {
    return next(new AppError('The user belongs to this token does no longer exists', 401))
  }

  //4) check if user changed password after the token was issued
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(new AppError('User recently changed password! Please login again', 401))
  }



  // grant access to protected route
  req.user = currentUser;
  res.locals.user = currentUser
  next();
});


exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    // roles [admin, lead-guide]. role = 'user'
    if (!roles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action', 403))
    }
    next()
  }

}

exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1) get user based on POSTed email
  const user = await User.findOne({ email: req.body.email })
  if (!user) {
    return next(new AppError('User not found', 404))
  }
  // 2) generate thr random reset token
  const resetToken = user.createPasswordResetToken()
  await user.save({ validateBeforeSave: false })

  // 3) send it to user's email

  try {
    const resetURL = `${req.protocol}://${req.get('host')}/api/v1/users/resetPassword/${resetToken}`
    await new Email(user, resetURL).sendPasswordReset()
    res.status(200).json({
      status: 'success',
      message: 'Token sent to email!'
    })
  }
  catch (err) {
    console.log(err)
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined
    await user.save({ validateBeforeSave: false })


    return next(new AppError('There was an error sending the email, Try again later', 500))

  }
})



exports.resetPassword = catchAsync(async (req, res, next) => {
  //1) get user based on the token

  const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex')
  const user = await User.findOne({ passwordResetToken: hashedToken, passwordResetExpires: { $gt: Date.now() } })


  //2) if token has not expired, and there is a user, set the new password

  if (!user) {
    return next(new AppError('Token is invalid or has expired', 400))
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined
  await user.save()

  //3) update changePasswordAt prperty for the user => mongoose middleware 


  //4) log the user in, send jwt

  createSendToken(user, 200, req, res)
});


exports.updatePassword = catchAsync(async (req, res, next) => {
  //1) get user from collection
  const user = await User.findById(req.user.id).select('+password')

  //2) check if posted pw is correct
  if (!await (user.correctPassword(req.body.currentPassword, user.password))) {
    return next(new AppError('Password is incorrect. Please check your password', 403))
  }
  //3) if so, update the pw
  user.password = req.body.newPassword
  user.passwordConfirm = req.body.confirmNewPassword
  await user.save()
  //4)log the user on, send jwt
  createSendToken(user, 200, req, res)
})



