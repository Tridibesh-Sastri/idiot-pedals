import userModel from '../models/user.model.js'
import config from '../config/config.js'
import {
    refreshTokenGenerator, 
    accessTokenGenerator
} from '../utils/tokenManager.js'

export const registerController = (req, res)=>{

    // retrieve the user data from req.body

    // then check does the email already in the database 

    // save the data in database and take back the new created user from database response

    // now use the tokengerator functions to generate access token

    //

}

export const loginController = (req, res)=>{

}

export const refreshController = (req, res)=>{

}

