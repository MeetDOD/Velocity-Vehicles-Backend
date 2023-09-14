const { default: slugify } = require("slugify")
const carModel = require("../models/carModel")
const orderModel = require("../models/orderModel")
const fs = require('fs')
const braintree = require("braintree");
const dotenv = require('dotenv')
const path = require('path')

dotenv.config()

var gateway = new braintree.BraintreeGateway({
  environment: braintree.Environment.Sandbox,
  merchantId: process.env.BRAINTREE_MERCHANT_ID,
  publicKey: process.env.BRAINTREE_PUBLIC_KEY,
  privateKey: process.env.BRAINTREE_PRIVATE_KEY
});


const getAllCar = async (req,res) => {
    try{
        const car = await carModel.find({}).populate('brand').select('-photo')

        res.status(200).send({
            success:true,
            totalCar:car.length,
            message:"All cars",
            car
        })
    }catch(err){
        res.status(500).send({
            success:false,
            message:"Error in Getting Car",
            err
        })
    }
}

const getCarById = async (req,res) => {
    try{
        const car = await carModel.findOne({slug:req.params.slug}).populate('brand')
        
        res.status(200).send({
            success:true,
            message:"Car By this Id",
            car
        })
    }catch(err){
        res.status(500).send({
            success:false,
            message:"Error in Finding Car Id",
            err
        })
    }
}

const getPhotoById = async (req,res) => {
    try{
        const car = await carModel.findById(req.params.pid).populate('brand').select('productPictures')

        if(car.productPictures.data){
            res.set('Content-type',car.productPictures.contentType)
            res.status(200).send(car.productPictures.data)
        }
    }catch(err){
        res.status(500).send({
            success:false,
            message:"Error in Finding Photo Car Id",
            err
        })
    }
}
const createCar = async (req, res) => {
    try {
        const { name, description, brand,price,fuelType,transmission,engineSize,mileage,safetyrating,warranty,seater,size,fuelTank } = req.body;
        
        switch(true){
            case !name: res.status(500).send({success: false,message: "Name is Required",});
            case !description: res.status(500).send({success: false,message: "description is Required",});
            case !brand: res.status(500).send({success: false,message: "brand is Required",});
            case !price: res.status(500).send({success: false,message: "price is Required",});
            case !fuelType: res.status(500).send({success: false,message: "fuelType is Required",});
            case !transmission: res.status(500).send({success: false,message: "transmission is Required",});
            case !engineSize: res.status(500).send({success: false,message: "engineSize is Required",});
            case !mileage: res.status(500).send({success: false,message: "mileage is Required",});
            case !safetyrating: res.status(500).send({success: false,message: "safetyrating is Required",});
            case !warranty: res.status(500).send({success: false,message: "warranty is Required",});
            case !seater: res.status(500).send({success: false,message: "seater is Required",});
            case !size: res.status(500).send({success: false,message: "size is Required",});
            case !fuelTank: res.status(500).send({success: false,message: "fuelTank is Required",});
        }
        const productPictures = req.files.map((file) => {
            console.log(file.path)
            console.log(file.path.replace('uploads/', ''))
            file.path.replace('uploads/', '')
        });

        const slug = slugify(name);

        const car = new carModel({
            name: name,
            slug: slug,
            description: description,
            brand: brand,
            productPictures: productPictures,
            price:price,
            fuelType:fuelType,
            transmission:transmission,
            engineSize:engineSize,
            mileage:mileage,
            safetyrating:safetyrating,
            warranty:warranty,
            seater:seater,
            size:size,
            fuelTank:fuelTank
        });

        await car.save();

        res.status(201).send({
            success: true,
            message: 'Car Created Successfully',
            car
        });
    } catch (err) {
        console.error(err);
        res.status(500).send({
            success: false,
            message: "Error in creating Car",
            error: err.message // Provide a more detailed error message
        });
    }
};
    


const deleteCar = async (req,res) => {
    try{
        const carModel_ = await carModel.findById(req.params.pid)
        try{
            for(const x of carModel_.productPictures){
                fs.unlink(path.join(__dirname, '../uploads/',x), (err)=> {
                    if(err){
                        throw err;
                    }
                })
            

                
            }
        }catch(e){
            console.log("Delte: " +e)
        }
        await carModel.findByIdAndDelete(req.params.pid)
        res.status(200).send({
            success:true,
            message:"Car Deleted Successfully"
        });

    }catch(err){
        res.status(500).send({
            success:false,
            message:"Error in Deleting Car",
            err
        })
    }
}

const updatecar = async (req,res) => {
    try{
        const {name,description,brand} = req.fields
        // const {photo} = req.files

        switch(true){
            case !name : return res.status(500).send({message:"Name is required"})
            case !description : return res.status(500).send({message:"Description is required"})
            case !brand : return res.status(500).send({message:"Brand is required"})
            // case !photo : return res.status(500).send({message:"Photo is required and should be less than 1Mb"})
        }

        const car = await carModel.findByIdAndUpdate(req.params.pid,{...req.fields,slug:slugify(name)},{new:true})
        // if(photo){
        //     car.photo.data = fs.readFileSync(photo.path)
        //     car.photo.contentType = photo.type
        // }
        await car.save()
        res.status(201).send({
            success:true,
            message:'Car Updated Successfully',
            car
        })
    }catch(err){
        console.log(err)
        res.status(500).send({
            success:false,
            message:"Error in Updating Car",
            err
        })
    }
}

const braintreeTokenController = async(req,res) => {
    try {
        gateway.clientToken.generate({}, function (err, response) {
          if (err) {
            res.status(500).send(err);
          } else {
            res.send(response);
          }
        });
      } catch (error) {
        console.log(error);
      }
}

const brainTreePaymentController = async (req,res) => {
    try {
        const { nonce, cart } = req.body;
        let total = 0;
        cart.map((i) => {
          total += i.price;
        });
        let newTransaction = gateway.transaction.sale(
          {
            amount: total,
            paymentMethodNonce: nonce,
            options: {
              submitForSettlement: true,
            },
          },
          function (error, result) {
            if (result) {
              const order = new orderModel({
                products: cart,
                payment: result,
                buyer: req.user._id,
              }).save();
              res.json({ ok: true });
            } else {
              res.status(500).send(error);
            }
          }
        );
      } catch (error) {
        console.log(error);
      }
}

module.exports = {createCar,getAllCar,getCarById,getPhotoById,deleteCar,updatecar,braintreeTokenController,brainTreePaymentController}