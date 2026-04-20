import rateLimit from "express-rate-limit";
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // limit each IP to 100 requests per windowMs
    handler: (req, res) => {
        res.status(429).json({
            success: false,
            message: "Too many requests, please try again later."
        });
    }
});

export default limiter;