import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import { api } from '../lib/api';
import type { Post, PublicConfig } from '../lib/types';
import { colors, font, space } from '../theme/theme';
import { MediaView } from './MediaView';
import { Avatar, Card, Row, showError, timeAgo } from './ui';

/** One post: author, text, photo or video, like and comment buttons. Used in Posts and on profiles. */
export function PostCard({ post, config, onDelete }: { post: Post; config?: PublicConfig; onDelete?: (id: string) => void }) {
  const qc = useQueryClient();
  const { width } = useWindowDimensions();
  const [liked, setLiked] = useState(post.liked);
  const [likes, setLikes] = useState(post.like_count);
  const [busy, setBusy] = useState(false);
  const canLike = config?.['posts.allow_likes'] !== false;
  const canComment = config?.['posts.allow_comments'] !== false;

  async function toggleLike() {
    if (busy) return;
    const next = !liked;
    setBusy(true); setLiked(next); setLikes((n) => Math.max(0, n + (next ? 1 : -1)));   // instant; undone below if the server says no
    try {
      const r = next ? await api.post<{ like_count: number }>(`/posts/${post.id}/like`) : await api.del<{ like_count: number }>(`/posts/${post.id}/like`);
      if (r && typeof r.like_count === 'number') setLikes(r.like_count);
      qc.invalidateQueries({ queryKey: ['feed'] });
    } catch (e) {
      setLiked(!next); setLikes((n) => Math.max(0, n + (next ? -1 : 1)));
      showError(e, 'Could not update your like');
    } finally { setBusy(false); }
  }

  return (
    <Card style={{ gap: 8 }}>
      <Pressable onPress={() => router.push({ pathname: '/person/[id]', params: { id: post.author.id } })}>
        <Row style={{ gap: 10 }}>
          <Avatar url={post.author.photo?.url} name={post.author.display_name} size={40} />
          <View style={{ flex: 1 }}>
            <Text style={font.h3}>{post.mine ? 'You' : post.author.display_name}</Text>
            <Text style={font.small}>{timeAgo(post.created_at)} ago</Text>
          </View>
          {post.mine && onDelete ? <Pressable onPress={() => onDelete(post.id)} hitSlop={10}><Text style={{ color: colors.textMuted }}>Delete</Text></Pressable> : null}
        </Row>
      </Pressable>
      {post.body ? <Text style={[font.body, { lineHeight: 24 }]}>{post.body}</Text> : null}
      {post.media ? <MediaView media={post.media} width={Math.min(width - space.lg * 4, 400)} /> : null}
      {canLike || canComment ? (
        <Row style={{ gap: space.lg, paddingTop: 4 }}>
          {canLike ? (
            <Pressable onPress={toggleLike} hitSlop={8} accessibilityLabel={liked ? 'Unlike' : 'Like'} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name={liked ? 'heart' : 'heart-outline'} size={22} color={liked ? colors.danger : colors.textMuted} />
              <Text style={[font.small, { color: liked ? colors.danger : colors.textMuted }]}>{likes}</Text>
            </Pressable>
          ) : null}
          {canComment ? (
            <Pressable onPress={() => router.push({ pathname: '/post/[id]', params: { id: post.id } })} hitSlop={8} accessibilityLabel="Comments" style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="chatbubble-outline" size={20} color={colors.textMuted} />
              <Text style={[font.small, { color: colors.textMuted }]}>{post.comment_count}</Text>
            </Pressable>
          ) : null}
        </Row>
      ) : null}
    </Card>
  );
}
