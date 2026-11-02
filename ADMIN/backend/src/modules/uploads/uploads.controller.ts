import { Request, Response } from 'express';
import { ApiResponse } from '../../utils/ApiResponse';
import { asyncHandler } from '../../utils/asyncHandler';
import * as service from './uploads.service';

export const presignHandler = asyncHandler(async (req: Request, res: Response) => {
  const resourceType = (req.query.resourceType as 'image' | 'video') ?? 'image';
  const data = service.buildUploadSignature(resourceType);
  res.json(ApiResponse.ok(data, 'Upload signed'));
});

export const confirmHandler = asyncHandler(async (req: Request, res: Response) => {
  const { complaintId, publicId, url } = req.body;
  const image = await service.attachUploadedImage(complaintId, publicId, url ?? '', req.user!.userId);
  res.status(201).json(ApiResponse.ok(image, 'Image attached to complaint'));
});