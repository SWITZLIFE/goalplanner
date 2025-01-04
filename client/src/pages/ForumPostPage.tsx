import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MessageSquare, Reply } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { LeftPanel } from "@/components/LeftPanel";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { format } from "date-fns";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { useState } from "react";

// Helper function to count total comments including replies
function countTotalComments(comments: Comment[]): number {
  return comments.reduce((total, comment) => {
    return total + 1 + (comment.replies ? countTotalComments(comment.replies) : 0);
  }, 0);
}

interface Comment {
  id: number;
  content: string;
  createdAt: string;
  author: {
    id: number;
    email: string;
    profilePhotoUrl: string | null;
  };
  replies?: Comment[];
}

interface ForumPost {
  id: number;
  title: string;
  content: string;
  createdAt: string;
  viewCount: number;
  isPinned: boolean;
  isLocked: boolean;
  author: {
    id: number;
    email: string;
    profilePhotoUrl: string | null;
  };
  comments: Comment[];
}

interface CommentFormProps {
  postId: number;
  parentCommentId?: number;
  onSuccess?: () => void;
  onCancel?: () => void;
  placeholder?: string;
}

function CommentForm({ postId, parentCommentId, onSuccess, onCancel, placeholder }: CommentFormProps) {
  const { toast } = useToast();
  const form = useForm({
    defaultValues: {
      content: "",
    },
  });

  const commentMutation = useMutation({
    mutationFn: async (values: { content: string }) => {
      const res = await fetch(`/api/forum/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          parentCommentId,
        }),
        credentials: "include",
      });

      if (!res.ok) throw new Error(await res.text());
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: parentCommentId ? "Your reply has been added." : "Your comment has been added.",
      });
      form.reset();
      queryClient.invalidateQueries({ queryKey: [`/api/forum/posts/${postId}`] });
      onSuccess?.();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add comment",
        variant: "destructive",
      });
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((values) => commentMutation.mutate(values))} className="space-y-4">
        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Textarea
                  placeholder={placeholder || "Write a comment..."}
                  className="min-h-[100px] bg-white border border-gray-200"
                  {...field}
                />
              </FormControl>
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={commentMutation.isPending}>
            {commentMutation.isPending ? "Posting..." : parentCommentId ? "Post Reply" : "Post Comment"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

function CommentComponent({ comment, postId, level = 0 }: { comment: Comment; postId: number; level?: number }) {
  const [showReplyForm, setShowReplyForm] = useState(false);

  return (
    <div className={`${level > 0 ? 'mt-4 ml-12 pl-4 border-l-2 border-gray-100' : 'mt-4'}`}>
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <div className="flex gap-4">
          <Avatar className="h-10 w-10">
            {comment.author.profilePhotoUrl ? (
              <AvatarImage 
                src={comment.author.profilePhotoUrl} 
                className="object-cover"
              />
            ) : (
              <AvatarFallback>
                {comment.author.email.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            )}
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium">{comment.author.email}</span>
              <span className="text-gray-500">•</span>
              <span className="text-gray-500">{format(new Date(comment.createdAt), 'MMM d, yyyy')}</span>
            </div>
            <div className="mt-2 text-gray-700 whitespace-pre-wrap">
              {comment.content}
            </div>
            <div className="mt-3">
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-500 hover:text-gray-700"
                onClick={() => setShowReplyForm(!showReplyForm)}
              >
                <Reply className="h-4 w-4 mr-1" />
                Reply
              </Button>
            </div>
          </div>
        </div>
      </div>

      {showReplyForm && (
        <div className="mt-3 ml-12">
          <CommentForm
            postId={postId}
            parentCommentId={comment.id}
            onSuccess={() => setShowReplyForm(false)}
            onCancel={() => setShowReplyForm(false)}
            placeholder={`Reply to ${comment.author.email}...`}
          />
        </div>
      )}

      {comment.replies?.map((reply) => (
        <CommentComponent
          key={reply.id}
          comment={reply}
          postId={postId}
          level={level + 1}
        />
      ))}
    </div>
  );
}

export default function ForumPostPage() {
  const { slug, postId: postIdParam } = useParams();
  const postId = postIdParam ? parseInt(postIdParam) : undefined;

  const { data: post, isLoading } = useQuery<ForumPost>({
    queryKey: [`/api/forum/posts/${postId}`],
  });

  if (!postId || isNaN(postId)) {
    return (
      <div className="flex h-screen bg-primary">
        <LeftPanel />
        <div className="flex-1 flex flex-col">
          <PageHeader />
          <div className="flex-1 m-4 bg-background rounded-[30px] overflow-hidden">
            <div className="h-full overflow-auto scrollbar-hide py-14 px-14">
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">Invalid post ID</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-primary">
      <LeftPanel />
      <div className="flex-1 flex flex-col">
        <PageHeader />
        <div className="flex-1 m-4 bg-background rounded-[30px] overflow-hidden">
          <div className="h-full overflow-auto scrollbar-hide py-14 px-14">
            <div className="max-w-3xl mx-auto">
              <div className="flex items-center gap-4 mb-8">
                <Link href={`/forum/${slug}`}>
                  <Button variant="ghost" size="icon">
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                </Link>
                <h1 className="text-3xl font-bold">{post?.title}</h1>
              </div>

              {isLoading ? (
                <div className="space-y-4">
                  <div className="animate-pulse">
                    <div className="h-32 bg-gray-200 rounded-lg mb-4" />
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-3/4" />
                      <div className="h-4 bg-gray-200 rounded w-1/2" />
                    </div>
                  </div>
                </div>
              ) : post ? (
                <div className="space-y-6">
                  <div className="bg-white rounded-lg p-6 shadow-sm">
                    <div className="flex gap-4">
                      <Avatar className="h-12 w-12">
                        {post.author.profilePhotoUrl ? (
                          <AvatarImage 
                            src={post.author.profilePhotoUrl} 
                            className="object-cover"
                          />
                        ) : (
                          <AvatarFallback>
                            {post.author.email.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <span className="font-medium text-gray-900">{post.author.email}</span>
                          <span>•</span>
                          <span>{format(new Date(post.createdAt), 'MMM d, yyyy')}</span>
                          {post.viewCount > 0 && (
                            <>
                              <span>•</span>
                              <span>{post.viewCount} views</span>
                            </>
                          )}
                          {post.isPinned && (
                            <>
                              <span>•</span>
                              <span className="text-primary">Pinned</span>
                            </>
                          )}
                        </div>
                        <div className="mt-4 text-gray-700 whitespace-pre-wrap">
                          {post.content}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                      <MessageSquare className="h-5 w-5" />
                      Comments ({countTotalComments(post.comments)})
                    </h2>

                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <CommentForm postId={post.id} />
                    </div>

                    <div className="space-y-4">
                      {post.comments.map((comment) => (
                        <CommentComponent
                          key={comment.id}
                          comment={comment}
                          postId={post.id}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <p className="text-muted-foreground">Post not found</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}