const mongoose = require('mongoose')

const brandSchema = new mongoose.Schema({
    name:{
        type:String,
        required:true,
        unique:true
    },
    slug:{
        type:String,
        lowercase:true
    },
    brandPictures:{
        type:String
    }
})

const brandModel = mongoose.model('brand',brandSchema);

module.exports = brandModel