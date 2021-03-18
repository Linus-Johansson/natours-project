const mongoose = require('mongoose');
const validator = require('validator');

const userSchema = new mongoose.Schema({
    name:{
        type: 'String',
        required: [true, "A user must have a name"],
    },
    email:{
        type: 'String',
        required: [true, "A user must have an email"],
        unique: true,
        lowercase:true,
        validate:[validator.isEmail, "Please enter a valid email"]
    },
    photo:String,
    password:{
        type: 'String',
        required: [true, "please enter a password"],
        minlength:8,
    },
    passwordConfirm:{
        type: 'String',
        required: [true, "please confirm your password"]
    }
})

const User = mongoose.model('User',userSchema)
module.exports = User;
