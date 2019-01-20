const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const {randomBytes} = require('crypto')
const {promisify} = require('util')
const {transport, emailTemplate} = require('../mail')
const {hasPermission} = require ('../utils')

const Mutations = {
  // parent - schema of graphQL
  // args - arguments passed into the query
  // ctx - access the db and rest of req(headers, cookies, etc..)
  // info - information on the graphQL query
  async createItem (parent, args, ctx, info) {
    
    // 1. check if user is logged in
    if(!ctx.request.userId){
      throw new Error('You must be logged in!')
    }

    // we put the db on the ctx object in our other file,
    // createServer.js, we put it on CONTEXT
    const item = await ctx.db.mutation.createItem({
      data: {
        // this is how we provide a relationship of an item to user
        user:{
          connect:{
            id: ctx.request.userId
          }
        },
        ...args
      }
    }, info) // info makes sure we return that item that was added to the DB

    return item
  },
  updateItem (parent, args, ctx, info) {
    // first make copy of updates
    const updates = {...args}

    // remove ID from updates obj
    delete updates.id
    // run update method
    // you can find what the update method takes as args in prisma.graphql
    return ctx.db.mutation.updateItem({
      data: updates,
      where: {
        id: args.id
      }
    }, info)
  },
  async deleteItem (parent, args, ctx, info) {

    const where = {id: args.id}
    // 1. find item 
    // the backticks are passing a manual query because the items query is nested inside 
    // the delete mutation
    const item = await ctx.db.query.item({where}, `{id title user { id }}`)
    const ownsItems = item.user.id !== ctx.request.userId

    // 2. Check if they own that item, or have the permissions
    if(ownsItems){
      throw new Error('Sorry you cannot delete, you are not the owner of this item.')
    }

    hasPermission(ctx.request.user, ['ITEMDELETE'])

    // 3. Delete it!
    return ctx.db.mutation.deleteItem({ where }, info)
  },
  async signup(parent, args, ctx, info){

    // encrypt password
    const password = await bcrypt.hash(args.password, 10)
    const newUser = Object.assign({}, args, {
      email: args.email.toLowerCase(),
      password,
      permission: {set:['USER']} //ENUM
    })
    // lowercase email
    // encrypt password

    const user = await ctx.db.mutation.createUser({
      data: {
        ...newUser
      }
    }, info) // info makes sure we return that item that was added to the DB

    // Create JWT
    const token = jwt.sign({
      userId: user.id
    }, process.env.APP_SECRET)

    // Set JWT as a cookie on the response
    ctx.response.cookie('token', token, {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 365 // one year cookie
    })

    return user
  },
  async signin(parent, {email, password}, ctx, info){

    // 1. Check if that user exists
    const user = await ctx.db.query.user({
      where: {
        email
      }
    }) // info makes sure we return that item that was added to the DB

    if(!user){
      throw new Error(`No user found for ${email}`)
    }
    
    // 2. check if their password is correct
    const valid = await bcrypt.compare(password, user.password)

    if(!valid){
      throw new Error(`Invalid Password`)
    }

    // 3. genereate JWT
    const token = jwt.sign({
      userId: user.id
    }, process.env.APP_SECRET)

    // 4. Set cookies
    ctx.response.cookie('token', token, {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 365 // one year cookie
    })

    return ctx.db.query.user({
      where: {
        id: user.id
      }
    }, info)

  },
  async signout(parent, args, ctx, info){
    ctx.response.clearCookie('token')
    return {
      message: "Successfully Signed Out"
    }
  },
  async requestReset(parent, args, ctx, info){

    // 1. Check if that user exists
    const user = await ctx.db.query.user({
      where: {
        email: args.email
      }
    }) // info makes sure we return that item that was added to the DB

    if(!user){
      throw new Error(`No user found for ${email}`)
    }

    // 2 set resetTOken and expiry
    const randomBytesPromised = promisify(randomBytes)
    const resetToken = (await randomBytesPromised(20)).toString('hex')

    const resetTokenExp = Date.now( ) + 3600000 // 1hr from now

    const res = await ctx.db.mutation.updateUser({
      where: {
        email: args.email 
      },
      data:{
        resetToken: resetToken,
        resetExpTime: resetTokenExp,
      },
    })

    // 3. email them the reset token
    const mailResp = await transport.sendMail({
      from: 'spencer@gmail.com',
      to: user.email,
      subject: 'Password Reset',
      html: emailTemplate(`
        Your password reset token is here! 
        \n\n
        <a href="${process.env.FRONTEND_URL}/reset?resetToken=${resetToken}">Click here to Reset</a>
      `)
    })


    return {
      message: "Thanks!"
    }
  },
  async resetPassword(parent, args, ctx, info){

    // 1. Check if PW match
    if(args.password !== args.confirmPassword){
      throw new Error(`Passwords do not match`)
    }

    // 2. check if the resetToken is legit
    // 3. check if token is expired
    // video 29
    // this returns the first user if a resetToken is found
    // and the token is not expired
    const [user] = await ctx.db.query.users({
      where: {
        resetToken: args.token,
        resetExpTime_gte: Date.now() - 3600000
      }
    })

    if(!user){
      throw new Error(`Token is not valid. Please resubmit`)
    }

    // 4. Hash their new password
    const newPassword = await bcrypt.hash(args.password, 10)

    // 5. Save new password to User
    // 6. remove resetToken / ExpToken
    const updateUser = await ctx.db.mutation.updateUser({
      where: {
        email: user.email
      },
      data:{
        password: newPassword,
        resetToken: null,
        resetExpTime: null
    }, }, info)

    // 7. Generate JWT
    const token = jwt.sign({
      userId: user.id
    }, process.env.APP_SECRET)

    // 8. Set JWT cookie
    ctx.response.cookie('token', token, {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 365 // one year cookie
    })

    // 9. return User
    return updateUser
  },
  async updateUser(parent, args, ctx, info){
    
    // 1. Check if user logged in
    if(!ctx.request.userId){
      throw new Error('You must be logged in!')
    }

    // 2. Query the current user to check if they are admin
    const currentUser = await ctx.db.query.user({
      where: {
        id: args.userId
      }
    })
    console.log('current User', currentUser);

    // 3. check if they have correct permissions
    hasPermission(ctx.request.user, ['ADMIN', 'PERMISSIONUPDATE'])

    // update user
    const updates = {...args}

    delete updates.userId

    if(args.permission){
      updates.permission = {set: [...args.permission]}
    }

    return ctx.db.mutation.updateUser({
      data: updates,
      where: {
        id: args.userId
      }
    }, info)

     
  }

}

module.exports = Mutations
