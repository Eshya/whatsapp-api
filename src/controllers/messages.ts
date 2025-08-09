"use strict";

import { Response, Request } from 'express';
import { StatusCodes, ReasonPhrases } from 'http-status-codes';
import { ReceivedMessage } from '../services/whatsapp-service';

/**
 * Get all received messages
 * @route GET /messages
 */
export const getMessages = (req: Request, res: Response) => {
  try {
    const messages = req.wa!.getReceivedMessages();
    
    return res
      .status(StatusCodes.OK)
      .json({
        status: ReasonPhrases.OK,
        data: messages,
        count: messages.length
      });
  } catch (error) {
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({
        status: ReasonPhrases.INTERNAL_SERVER_ERROR,
        error: 'Failed to retrieve messages'
      });
  }
}

/**
 * Clear all received messages
 * @route DELETE /messages
 */
export const clearMessages = (req: Request, res: Response) => {
  try {
    req.wa!.clearReceivedMessages();
    
    return res
      .status(StatusCodes.OK)
      .json({
        status: ReasonPhrases.OK,
        message: 'All messages cleared successfully'
      });
  } catch (error) {
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({
        status: ReasonPhrases.INTERNAL_SERVER_ERROR,
        error: 'Failed to clear messages'
      });
  }
}

/**
 * Stream messages in Server-Sent Events format
 * @route GET /messages/stream
 */
export const streamMessages = (req: Request, res: Response) => {
  // Set headers for SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  // Send initial connection message
  res.write(`data: ${JSON.stringify({
    type: 'connection',
    message: 'Connected to message stream',
    timestamp: new Date().toISOString()
  })}\n\n`);

  // Send existing messages
  const existingMessages = req.wa!.getReceivedMessages();
  if (existingMessages.length > 0) {
    res.write(`data: ${JSON.stringify({
      type: 'existing_messages',
      messages: existingMessages,
      count: existingMessages.length
    })}\n\n`);
  }

  // Set up message callback
  const messageHandler = (message: ReceivedMessage) => {
    const eventData = {
      type: 'new_message',
      message: message,
      timestamp: new Date().toISOString()
    };
    
    res.write(`data: ${JSON.stringify(eventData)}\n\n`);
  };

  // Register callback
  req.wa!.onMessage(messageHandler);

  // Handle client disconnect
  req.on('close', () => {
    // Remove the callback when client disconnects
    const callbacks = (req.wa as any).messageCallbacks;
    const index = callbacks.indexOf(messageHandler);
    if (index > -1) {
      callbacks.splice(index, 1);
    }
  });

  // Keep connection alive
  const keepAlive = setInterval(() => {
    res.write(`data: ${JSON.stringify({
      type: 'keepalive',
      timestamp: new Date().toISOString()
    })}\n\n`);
  }, 30000); // Send keepalive every 30 seconds

  // Clear interval when connection closes
  req.on('close', () => {
    clearInterval(keepAlive);
  });
}

/**
 * Get messages with pagination
 * @route GET /messages/paginated
 */
export const getPaginatedMessages = (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;
    
    const allMessages = req.wa!.getReceivedMessages();
    const messages = allMessages.slice(offset, offset + limit);
    
    return res
      .status(StatusCodes.OK)
      .json({
        status: ReasonPhrases.OK,
        data: messages,
        pagination: {
          page,
          limit,
          total: allMessages.length,
          totalPages: Math.ceil(allMessages.length / limit),
          hasNext: offset + limit < allMessages.length,
          hasPrev: page > 1
        }
      });
  } catch (error) {
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({
        status: ReasonPhrases.INTERNAL_SERVER_ERROR,
        error: 'Failed to retrieve paginated messages'
      });
  }
} 