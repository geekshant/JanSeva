import { env } from '../../config/env';
import { ApiError } from '../../utils/ApiError';
import { prisma } from '../../db/prisma';

function isConfigured(): boolean {
  return Boolean(env.cloudinary.cloudName && env.cloudinary.apiKey && env.cloudinary.apiSecret);
}

/** Build the fields a browser needs to POST a file straight to Cloudinary. */
export function buildUploadSignature(resourceType: 'image' | 'video'): {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  signature: string;
  resourceType: 'image' | 'video';
} {
  if (!isConfigured()) {
    throw ApiError.serviceUnavailable(
      'Image uploads are not configured on this server',
      'UPLOADS_NOT_CONFIGURED',
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const cloudinary = require('cloudinary').v2 as {
    utils: {
      api_sign_request(paramsToSign: Record<string, unknown>, apiSecret: string): string;
    };
  };
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = env.cloudinary.folder;

  const signature = cloudinary.utils.api_sign_request(
    {
      timestamp,
      folder,
      transformation: 'c_fill,q_auto,w_1600',
      resource_type: resourceType,
    },
    env.cloudinary.apiSecret ?? '',
  );

  return {
    cloudName: env.cloudinary.cloudName ?? '',
    apiKey: env.cloudinary.apiKey ?? '',
    timestamp,
    folder,
    signature,
    resourceType,
  };
}

/**
 * Confirm a directly-uploaded Cloudinary asset and attach it to a complaint.
 * publicId must be reported back from the client side upload response.
 */
export async function attachUploadedImage(
  complaintId: string,
  publicId: string,
  url: string,
  actorId: string,
) {
  const complaint = await prisma.complaint.findFirst({
    where: { id: complaintId, deletedAt: null },
    select: { id: true },
  });
  if (!complaint) throw ApiError.notFound('Complaint not found');

  const existing = await prisma.complaintImage.count({ where: { complaintId } });
  if (existing + 1 > env.cloudinary.maxImages) {
    throw ApiError.badRequest('A complaint can hold at most 5 images', 'IMAGE_LIMIT');
  }

  // If only a publicId was given, derive a display URL from the asset.
  const displayUrl =
    url ||
    (env.cloudinary.cloudName
      ? `https://res.cloudinary.com/${env.cloudinary.cloudName}/image/upload/${publicId}`
      : publicId);

  const image = await prisma.complaintImage.create({
    data: {
      complaintId,
      publicId,
      url: displayUrl,
      uploadedBy: actorId,
      sortOrder: existing,
    },
  });

  return image;
}