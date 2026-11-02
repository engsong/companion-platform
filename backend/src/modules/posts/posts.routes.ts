import { Router, Request, Response } from 'express';
import { prisma } from '../../config/prisma';
import { authenticateToken, AuthRequest } from '../../middleware/auth';
import { uploadPostMedia } from '../../middleware/upload';

const router = Router();

// Create new post (photo, video, or text status)
router.post(
  '/',
  authenticateToken,
  uploadPostMedia.single('media'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { caption = '', mediaType = 'IMAGE' } = req.body;
      const file = req.file;

      if (!file && (!caption || !caption.trim())) {
        return res.status(400).json({ error: 'Please enter text or select a photo/media' });
      }

      const mediaUrl = file ? `/uploads/posts/${file.filename}` : '';

      const post = await prisma.post.create({
        data: {
          userId: req.user!.id,
          caption: caption?.trim() || null,
          mediaUrl: mediaUrl,
          mediaType: file ? (mediaType.toUpperCase() === 'VIDEO' ? 'VIDEO' : 'IMAGE') : 'TEXT',
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

      // Notify post author if liked by someone else
      const post = await prisma.post.findUnique({
        where: { id: postId },
        select: { userId: true }
      });
      if (post && post.userId !== userId) {
        const liker = await prisma.user.findUnique({
          where: { id: userId },
          select: { name: true, avatar: true }
        });
        const io = req.app.get('io');
        if (io) {
          io.to(`user_${post.userId}`).emit('notification_alert', {
            id: `${postId}_${userId}_like_${Date.now()}`,
            type: 'POST_LIKE',
            title: `New Like! (ຖືກໃຈໃໝ່)`,
            body: `${liker?.name || 'Someone'} liked your post ❤️`,
            avatar: liker?.avatar,
            postId,
            createdAt: new Date()
          });
        }
      }

      return res.json({ message: 'Liked', liked: true });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to toggle like' });
  }
});

// Get all comments for a post
router.get('/:postId/comments', async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;

    const comments = await prisma.postComment.findMany({
      where: { postId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
            city: true,
            role: true,
            isVerified: true
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    res.json({ comments });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch comments' });
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
        user: { select: { id: true, name: true, avatar: true, isVerified: true, role: true } }
      }
    });

    // Notify post author if commented by someone else
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { userId: true }
    });
    if (post && post.userId !== req.user!.id) {
      const io = req.app.get('io');
      if (io) {
        io.to(`user_${post.userId}`).emit('notification_alert', {
          id: comment.id,
          type: 'POST_COMMENT',
          title: `${comment.user.name} commented on your post`,
          body: content.trim(),
          avatar: comment.user.avatar,
          postId,
          createdAt: new Date()
        });
      }
    }

    res.status(201).json({ message: 'Comment added', comment });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to add comment' });
  }
});

// Delete comment (by author, post owner, or admin)
router.delete('/:postId/comments/:commentId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { postId, commentId } = req.params;
    const userId = req.user!.id;

    const comment = await prisma.postComment.findUnique({
      where: { id: commentId },
      include: { post: { select: { userId: true } } }
    });

    if (!comment || comment.postId !== postId) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    const isCommentAuthor = comment.userId === userId;
    const isPostOwner = comment.post.userId === userId;
    const isAdmin = req.user!.role === 'ADMIN';

    if (!isCommentAuthor && !isPostOwner && !isAdmin) {
      return res.status(403).json({ error: 'Unauthorized to delete this comment' });
    }

    await prisma.postComment.delete({ where: { id: commentId } });
    res.json({ message: 'Comment deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete comment' });
  }
});

// Delete own post
router.delete('/:postId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { postId } = req.params;
    const userId = req.user!.id;

    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    if (post.userId !== userId && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Unauthorized to delete this post' });
    }

    await prisma.post.delete({ where: { id: postId } });
    res.json({ message: 'Post deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete post' });
  }
});

export default router;
