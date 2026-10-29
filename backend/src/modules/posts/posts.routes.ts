import { Router, Request, Response } from 'express';
import { prisma } from '../../config/prisma';
import { authenticateToken, AuthRequest } from '../../middleware/auth';
import { uploadPostMedia } from '../../middleware/upload';

const router = Router();

// Create new post
router.post(
  '/',
  authenticateToken,
  uploadPostMedia.single('media'),
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Media file (image or video) is required' });
      }

      const { caption, mediaType = 'IMAGE' } = req.body;
      const mediaUrl = `/uploads/posts/${req.file.filename}`;

      const post = await prisma.post.create({
        data: {
          userId: req.user!.id,
          caption,
          mediaUrl,
          mediaType: mediaType.toUpperCase() === 'VIDEO' ? 'VIDEO' : 'IMAGE',
          isApproved: true
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatar: true,
              city: true,
              isVerified: true
            }
          }
        }
      });

      res.status(201).json({ message: 'Post created', post });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to create post' });
    }
  }
);

// Get Feed posts
router.get('/', async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '10' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const posts = await prisma.post.findMany({
      where: { isApproved: true },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
            city: true,
            isVerified: true,
            role: true
          }
        },
        likes: { select: { userId: true } },
        comments: {
          include: {
            user: { select: { id: true, name: true, avatar: true } }
          },
          orderBy: { createdAt: 'desc' },
          take: 3
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: Number(limit)
    });

    res.json({ posts });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch posts' });
  }
});

// Like / Unlike Post
router.post('/:postId/like', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { postId } = req.params;
    const userId = req.user!.id;

    const existingLike = await prisma.postLike.findUnique({
      where: {
        postId_userId: { postId, userId }
      }
    });

    if (existingLike) {
      await prisma.postLike.delete({ where: { id: existingLike.id } });
      await prisma.post.update({
        where: { id: postId },
        data: { likesCount: { decrement: 1 } }
      });
      return res.json({ message: 'Unliked', liked: false });
    } else {
      await prisma.postLike.create({
        data: { postId, userId }
      });
      await prisma.post.update({
        where: { id: postId },
        data: { likesCount: { increment: 1 } }
      });
      return res.json({ message: 'Liked', liked: true });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to toggle like' });
  }
});

// Add comment to post
router.post('/:postId/comments', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { postId } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Comment content cannot be empty' });
    }

    const comment = await prisma.postComment.create({
      data: {
        postId,
        userId: req.user!.id,
        content: content.trim()
      },
      include: {
        user: { select: { id: true, name: true, avatar: true } }
      }
    });

    res.status(201).json({ message: 'Comment added', comment });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to add comment' });
  }
});

export default router;
