"use strict";
import { Response, Request } from 'express';
/**
 * Log Out
 * @route POST /logout
 */

export const postLogout = async (req: Request , res: Response) => {
    req.wa!.Logout();
    return res.redirect(302, "/");
}