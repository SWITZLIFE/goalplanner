import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { MessageSquare, Plus } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface Post {
  id: number;
  title: string;
  content: string;
  createdAt: string;
  user: {
    id: number;
    email: string;
    profilePhotoUrl: string | null;
  };
  comments: Comment[];
}

interface Comment {
  id: number;
  content: string;
  createdAt: string;
  user: {
    id: number;
    email: string;
    profilePhotoUrl: string | null;
  };
}

import { z } from "zod";

const postFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
});

const commentFormSchema = z.object({
  content: z.string().min(1, "Comment is required"),
});

type PostFormData = z.infer<typeof postFormSchema>;
type CommentFormData = z.infer<typeof commentFormSchema>;

export function CommunityBoard() {
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const postForm = useForm<PostFormData>({
    defaultValues: {
      title: "",
      content: "",
    },
    resolver: zodResolver(postFormSchema),
  });
  const commentForm = useForm<CommentFormData>({
    defaultValues: {
      content: "",
    },
    resolver: zodResolver(commentFormSchema),
  });

  const { data: posts = [], isLoading } = useQuery<Post[]>({
    queryKey: ["/api/posts"],
    retry: 1,
  });

  const createPostMutation = useMutation({
    mutationFn: async (data: PostFormData) => {
      const response = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rewards"] });
      toast({
        title: "Post created!",
        description: "You earned 5 coins for creating a post.",
      });
      postForm.reset();
    },
    onError: (error) => {
      toast({
        title: "Failed to create post",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    },
  });

  const createCommentMutation = useMutation({
    mutationFn: async ({ postId, content }: { postId: number; content: string }) => {
      const response = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content }),
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rewards"] });
      toast({
        title: "Comment added!",
        description: "You earned 3 coins for commenting.",
      });
      commentForm.reset();
      setSelectedPost(null);
    },
    onError: (error) => {
      toast({
        title: "Failed to add comment",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    },
  });

  const handleCreatePost = postForm.handleSubmit((data) => {
    createPostMutation.mutate(data);
  });

  const handleCreateComment = commentForm.handleSubmit((data) => {
    if (!selectedPost) return;
    createCommentMutation.mutate({ postId: selectedPost.id, content: data.content });
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Community Board</h2>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Post
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create a New Post</DialogTitle>
            </DialogHeader>
            <Form {...postForm}>
              <form onSubmit={handleCreatePost} className="space-y-4">
                <FormField
                  control={postForm.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter post title" />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={postForm.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Content</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Write your post content here..." />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <div className="flex justify-end">
                  <Button type="submit">Create Post</Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {posts.map((post) => (
          <Card key={post.id}>
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <Avatar>
                  <AvatarImage src={post.user.profilePhotoUrl || undefined} />
                  <AvatarFallback>{post.user.email[0].toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium">{post.user.email}</div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(post.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
              <CardTitle>{post.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{post.content}</p>
            </CardContent>
            <CardFooter className="flex justify-between items-center">
              <div className="text-sm text-muted-foreground">
                {post.comments.length} comments
              </div>
              <Dialog open={selectedPost?.id === post.id} onOpenChange={(open) => !open && setSelectedPost(null)}>
                <DialogTrigger asChild>
                  <Button variant="outline" onClick={() => setSelectedPost(post)}>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Add Comment
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add a Comment</DialogTitle>
                  </DialogHeader>
                  <Form {...commentForm}>
                    <form onSubmit={handleCreateComment} className="space-y-4">
                      <FormField
                        control={commentForm.control}
                        name="content"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Comment</FormLabel>
                            <FormControl>
                              <Textarea {...field} placeholder="Write your comment here..." />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <div className="flex justify-end">
                        <Button type="submit">Add Comment</Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </CardFooter>
            {post.comments.length > 0 && (
              <div className="px-6 pb-6 space-y-4">
                {post.comments.map((comment) => (
                  <div key={comment.id} className="pl-4 border-l-2">
                    <div className="flex items-center gap-2 mb-1">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={comment.user.profilePhotoUrl || undefined} />
                        <AvatarFallback>{comment.user.email[0].toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="text-sm font-medium">{comment.user.email}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(comment.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <p className="text-sm ml-8">{comment.content}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
