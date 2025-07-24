import axios from "axios";
import userModel from "../models/userModel.js";
import FormData from "form-data";

export const genrateImage = async (req, res) => {
    try {
        const userId = req.user.id;

        const { prompt } = req.body;
        if (!prompt) {
            return res.status(400).json({ success: false, message: "Prompt is required." });
        }

        const user = await userModel.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found." });
        }
        // Check credits
        if (user.creditBalance <= 0) {
            return res.status(403).json({
                success: false,
                message: "No credit left.",
                creditBalance: user.creditBalance,
            });
        }

        const formData = new FormData();
        formData.append('prompt', prompt);

        const clipdropHeaders = {
            ...formData.getHeaders(),          // includes proper multipart boundary
            "x-api-key": process.env.CLIPDROP_API,
        };

        const resp = await axios.post(
            "https://clipdrop-api.co/text-to-image/v1",
            formData,
            {
                headers: clipdropHeaders,
                responseType: "arraybuffer",
    
            }
        );

        const buffer = Buffer.from(resp.data);
        if (!buffer.length) {
            return res.status(502).json({ success: false, message: "Empty image data from provider." });
        }

        const base64Image = buffer.toString("base64");
        const resultImage = `data:image/png;base64,${base64Image}`;

        //await userModel.findByIdAndUpdate(user._id, { creditBalance: user.creditBalance - 1 });
        await userModel.findByIdAndUpdate(user._id, { $inc: { creditBalance: -1 } });

        res.json({ success: true, message: "Image generated", creditBalance: user.creditBalance - 1, resultImage })

    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
}