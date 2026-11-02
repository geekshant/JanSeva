import { Request, Response } from 'express';
import { ApiResponse } from '../../utils/ApiResponse';
import { asyncHandler } from '../../utils/asyncHandler';
import {
  register,
  login,
  loginWithFirebase,
  refreshSession,
  revokeRefreshToken,
  getCurrentUser,
  changePassword,
  updateProfile,
} from './auth.service';
import { setAuthCookies, clearAuthCookies, getRefreshToken } from './cookies';

export const registerHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = await register(req.body);
  res.status(201).json(ApiResponse.ok(user, 'Account created'));
});

export const loginHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await login(req.body);
  setAuthCookies(res, result.tokens.accessToken, result.tokens.refreshToken);
  res.json(ApiResponse.ok({ user: result.user }, 'Logged in'));
});

export const firebaseLoginHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await loginWithFirebase(req.body);
  setAuthCookies(res, result.tokens.accessToken, result.tokens.refreshToken);
  res.json(ApiResponse.ok({ user: result.user }, 'Logged in with Firebase'));
});

export const refreshHandler = asyncHandler(async (req: Request, res: Response) => {
  const refreshToken = getRefreshToken(req);
  const result = await refreshSession(refreshToken);
  setAuthCookies(res, result.tokens.accessToken, result.tokens.refreshToken);
  res.json(ApiResponse.ok({ user: result.user }, 'Session refreshed'));
});

export const logoutHandler = asyncHandler(async (req: Request, res: Response) => {
  const refreshToken = getRefreshToken(req);
  if (refreshToken) await revokeRefreshToken(refreshToken);
  clearAuthCookies(res);
  res.json(ApiResponse.ok(null, 'Logged out'));
});

export const meHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = await getCurrentUser(req.user!.userId);
  res.json(ApiResponse.ok(user, 'Current user'));
});

export const changePasswordHandler = asyncHandler(
  async (req: Request, res: Response) => {
    await changePassword(req.user!.userId, req.body.currentPassword, req.body.newPassword);
    res.json(ApiResponse.ok(null, 'Password changed'));
  },
);

export const updateProfileHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const user = await updateProfile(req.user!.userId, req.body);
    res.json(ApiResponse.ok(user, 'Profile updated'));
  },
);