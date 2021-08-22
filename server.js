const mongoose = require('mongoose')

const dotenv = require('dotenv');
dotenv.config({ path: 'config.env' });

process.on('uncaughtException', err => {
    console.log('UNCAUGHT EXCEPTION shutting down...');
    console.log(err.name, err.message, err.stack)
    process.exit(1)

})


const app = require('./app');

const DB = process.env.DATABASE.replace('<PASSWORD>', process.env.DB_PASSWORD)
mongoose
    .connect(DB, {
        useNewUrlParser: true,
        useCreateIndex: true,
        useFindAndModify: false,
        useUnifiedTopology: true
    })
    .then(() => {
        console.log("DB Connection successful ");
    })

//STARTING SERVER
const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
    console.log(`app running on port ${port}`);
});


process.on('unhandledRejection', err => {
    console.log('UHANDLED REJECTION shutting down...');
    console.log(err.name, err.message)
    server.close(() => {
        process.exit(1)
    })
})

process.on('SIGTERM', () => {
    console.log('👋 SIGTERM RECIVED. Shutting down gracefully')
    server.close(() => {
        console.log('Process terminated')
    })
})


