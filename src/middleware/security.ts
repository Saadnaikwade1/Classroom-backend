
import { NextFunction, Request, Response } from "express";
import aj from "../config/arject.js";
import {ArcjetNodeRequest,slidingWindow } from "@arcjet/node";

const securityMiddleware = async (req:Request, res:Response, next:NextFunction) => {
    if(process.env.NODE_ENV === "test") return next();

    try{
        const role:RateLimitRole = req.user?.role ?? "geust";

        let limit:number;
        let message:string;
        switch(role) {
            case "admin":
                limit = 20;
                message = "Admin request limit exceeded (20 per minute). slow down!";
                break;
            case "teacher":
            case "student":
                limit = 10;
                message = "user request limit exceeded (20 per minute). slow down!";
                break;

            default:
                limit = 5;
                message = "Guest request limit exceeded (5 per minute). please login for a better experience!";
        } 

        const client= aj.withRule(
            slidingWindow({
                interval:'1m',
                max: limit,
                mode: "LIVE",

            })
        );
        const ajrectRequest:ArcjetNodeRequest = {
            headers: req.headers,
            method: req.method,
            url: req.originalUrl ?? req.url,
            socket: {remoteAddress: req.socket.remoteAddress ?? req.ip ?? '0.0.0.0' }

        }
        const decesion = await client.protect(ajrectRequest);

        if(decesion.isDenied() && decesion.reason.isBot()){
            return res.status(403).json({error: "Forbidden", message: "Automated requests are not allowed"});
        }
        if(decesion.isDenied() && decesion.reason.isShield()){
            return res.status(403).json({error: "Forbidden", message: "request blocked by security policy"});
        }
        if(decesion.isDenied() && decesion.reason.isRateLimit()){
            return res.status(403).json({error: "to many requests", message});
        }
        next();

    }catch(err) {
        console.error("Arject midddleware error", err);
        res.status(500).json({error: "Internal Server Error", message: "Something went wrong with the security middleware"});
    }
}

export default securityMiddleware;