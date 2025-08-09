"use strict";

import { Response, Request } from 'express';
import { StatusCodes, ReasonPhrases } from 'http-status-codes';

/**
 * Get Real-time Chat Page
 * @route GET /realtime
 */
export const getRealtimePage = (req: Request, res: Response) => {
  return res.render('realtime', {
    title: 'Real-time WhatsApp Chat'
  });
}

/**
 * Get Real-time Chat API endpoint for AJAX
 * @route GET /api/realtime/status
 */
export const getRealtimeStatus = (req: Request, res: Response) => {
  try {
    const status = req.wa!.GetStatus();
    
    return res
      .status(StatusCodes.OK)
      .json({
        status: ReasonPhrases.OK,
        data: status
      });
  } catch (error) {
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({
        status: ReasonPhrases.INTERNAL_SERVER_ERROR,
        error: 'Failed to get real-time status'
      });
  }
} 