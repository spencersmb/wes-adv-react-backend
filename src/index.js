require('dotenv').config({path: 'variables.env'})
const cookieParser = require('cookie-parser')
const createServer = require('./createServer')
const db = require('./db')
const jwt = require('jsonwebtoken')

const server = createServer()

// Use xpress middleware to handle cookies(JWT)
server.express.use(cookieParser())

// Use xpress middleware to populate current user
server.express.use((req, res, next) => {
  const {token} = req.cookies
  if(token){
    const {userId} = jwt.verify(token, process.env.APP_SECRET)
    // put userID onto the request 
    req.userId = userId
  }
  next();
})

// Middlewear that populates the user object on request
server.express.use(async (req, res, next) => {
  if(!req.userId){
    return next()
  }
  const user = await db.query.user({
    where:{
      id: req.userId
    }
  }, '{id, name, email, permission}')
  
  if(user){
    req.user = user
  }
  next();
})

server.start({
  cors: {
    credentials: true,
    origin: process.env.FRONTEND_URL
  }
}, deets => {
  console.log(`Server is now running on port http://localhost:${deets.port}`,)

})
