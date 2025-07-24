import userModel from "../models/userModel.js";
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import razorpay from 'razorpay';
import transactionModel from '../models/transationModel.js';

//controller function
const registerUser = async(req,res)=>{
    try {
        const {name,email,password}=req.body;
        
        //if unavailable
        if(!name || !email || !password){
            return res.json({success:false,message:'missing details'})
        }

        //if available 
        // 1. encrypt pass
        const salt=await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password,salt);
        
        //2. save data in db
        const userData ={
            name,email,password:hashedPassword
        }
        const newUser =new userModel(userData);

        const user =await newUser.save();
        console.log(user);//checking the genrated obj,containing a unique generated id(property) for user

        const token =jwt.sign({id:user._id},process.env.JWT_SECRET);
    
        res.json({success:true , token, user:{name:user.name}});

    } catch (error) {
        console.log(error);
        res.json({success:false, message: error.message});
    }
}
//
const loginUser = async (req,res)=>{
    try {
        const {email ,password}=req.body;
        const user = await userModel.findOne({email});
        //if user not present
        if(!user){
            return res.json({success:false , message:'user not found'});
        }
        //if email matches
        const isMatch = await bcrypt.compare(password,user.password);
       
        if(isMatch){
           const token = jwt.sign({id:user._id},process.env.JWT_SECRET);//sign method is used to create token
           res.json({success:true , token, user:{name:user.name}});
        }else{
            return res.json({success:false , message:'invalid password'});
        }
    } catch (error) {
        console.log(error);
        res.json({success:false, message: error.message});
    }
}

//
const userCredits = async (req,res)=>{
    try {
        const userId =req.user.id;// GET userId from middleware, NOT req.body

        const user =await userModel.findById(userId);
        res.json({success:true , credits:user.creditBalance , user:{name:user.name}});
    } catch (error) {
        console.log(error);
        res.json({success:false, message: error.message});
    }
}

//
const razorpayInstance = new razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const paymentRazorpay = async(req,res)=>{
    try {
        const {userId,planId} = req.body;
        
        const userData = await userModel.findById(userId);
        
        if(!userId || !planId){
            return res.json({success:false, message:'Missing details'});
        }

        let credits ,plan ,amount ,date;

        switch (planId) {
            case 'Basic':
                plan = 'Basic';
                credits =100;
                amount =10;
                break;
            case 'Advanced':
                plan = 'Advanced';
                credits =500;
                amount =50;
                break;
            case 'Business':
                plan = 'Business';
                credits =5000;
                amount =250;
                break;
        
            default:
                return res.json({success:false,message:'plan not found'});
                break;
        }

        date = Date.now();

        const transactionData ={
            userId,plan,amount,credits,date
        }

        const newTransaction = await transactionModel.create(transactionData);//

        const options={
          amount: amount *100,
          currency: process.env.CURRENCY,
          receipt: newTransaction._id, //use auto-genearted id by mongodb  
        }

        await razorpayInstance.orders.create(options, (error,order)=>{
          if(error){
            console.log(error);
            return res.json({success:false , message:error.message})
          }
          res.json({success:true,order});
        });

    } catch (error) {
        console.log(error);
        res.json({success:false, message:error.message});
    }
}
//
const verifyRazorpay= async (req,res)=>{
  try {
    const {razorpay_order_id}=req.body;
    
    const orderInfo =await razorpayInstance.orders.fetch(razorpay_order_id);
    
    if (orderInfo.status === 'paid'){
        const transactionData =await transactionModel.findById(orderInfo.receipt);
        if(transationData.payment){
            return res.json({success:false,message:'payment failed'});
        }

        const userData= await userModel.findById(transactionData.userId);

        const creditBalance = userData.creditBalance + transactionData.credits;
        await userModel.findByIdAndUpdate(userData._id,{creditBalance});

        await transactionModel.findByIdAndUpdate(transationData._id,{payment:true});

        res.json({success:true , message:'credits added'});
    }else{
        res.json({success:false,message:'payment failed'});
    }

  } catch (error) {
    console.log(error);
    res.json({success:false,message:error.message});
  }
}

export {registerUser,loginUser,userCredits,paymentRazorpay,verifyRazorpay};