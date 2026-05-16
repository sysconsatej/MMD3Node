import { executeQuery } from "../config/DBConfig.js";
import crypto from "crypto";

const algorithm = "aes-256-cbc";

const key = Buffer.from(process.env.SECRET_KEY, "hex");

function encrypt(text) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");
    return {
        encrypted,
        iv: iv.toString("hex")
    };
}

export const revokePassword = async (req, res) => {
    try {
        const user = req?.user;
        if (!user?.emailId) {
            return res.status(400).json({ success: false, message: "emailId is required" });
        }
        const query = 'SELECT password FROM tblUser WHERE emailId = @emailId';
        const paylaodObj = {
            emailId: user.emailId
        };

        const result = await executeQuery(query, paylaodObj);
        if (!result || result.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }
        const data = encrypt(result[0].password);

        return res.status(200).json({ success: true, message: "Password revoked successfully", password: data.encrypted, iv: data.iv });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};