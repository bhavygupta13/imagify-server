import jwt from "jsonwebtoken";

const userAuth = (req, res, next) => {
  const token = req.headers.token; // Custom header

  if (!token) {
    return res.status(401).json({ success: false, message: "No token present. Login again." });
  }

  try {
    const tokenDecode = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Decoded Token:", tokenDecode);

    if (tokenDecode.id) {
      req.user = { id: tokenDecode.id };
      return next(); // ✅ Only call next() on success
    } else {
      return res.status(401).json({ success: false, message: "Not authorized. Login again." });
    }
  } catch (error) {
    console.error("JWT verification error:", error);
    return res.status(401).json({ success: false, message: error.message });
  }
};

export default userAuth;

/*import jwt from "jsonwebtoken";

const userAuth = async (req,res,next)=>{
   const token = req.headers.token;// Custom header

    if(!token){
        return res.json({success:false , message:"Not token present.Login again"})
    }

    try {
        const tokenDecode = jwt.verify(token,process.env.JWT_SECRET);
        console.log(tokenDecode);

        if(tokenDecode.id){
            //req.body.userId = tokenDecode.id;
            req.user = { id: tokenDecode.id }; 
        }else{
             return res.json({success:false , message:"Not Autherised.Login again"})
        }

    } catch (error) {
        console.log(error);
        res.json({success:false, message: error.message});
    }

    next();
};

export default userAuth;*/