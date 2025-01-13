import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, ArrowLeft, MessageSquare } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { LeftPanel } from "@/components/LeftPanel";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface ForumPost {
  id: number;
  title: string;
  content: string;
  createdAt: string;
  lastActivityAt: string;
  viewCount: number;
  isPinned: boolean;
  isLocked: boolean;
  commentCount: number;
  author: {
    id: number;
    email: string;
    profilePhotoUrl: string | null;
  };
}

interface ForumCategory {
  id: number;
  name: string;
  description: string;
  slug: string;
}

export default function ForumCategoryPage() {
  const { slug } = useParams();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);

  const { data: category } = useQuery<ForumCategory>({
    queryKey: [`/api/forum/categories/${slug}`],
  });

  const { data: posts, isLoading } = useQuery<ForumPost[]>({
    queryKey: [`/api/forum/categories/${slug}/posts`],
  });

  const form = useForm({
    defaultValues: {
      title: "",
      content: "",
    },
  });

  const onSubmit = async (values: { title: string; content: string }) => {
    try {
      const res = await fetch(`/api/forum/categories/${slug}/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
        credentials: "include",
      });

      if (!res.ok) throw new Error(await res.text());

      toast({
        title: "Success",
        description: "Your post has been created.",
      });

      setIsOpen(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: [`/api/forum/categories/${slug}/posts`] });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create post",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex h-screen bg-primary">
      <LeftPanel />
      <div className="flex-1 flex flex-col">
        <PageHeader />
        <div className="flex-1 m-4 bg-background rounded-[30px] overflow-hidden">
          <div className="h-full overflow-auto scrollbar-hide py-14 px-14">
            <div className="max-w-5xl mx-auto">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <Link href="/forum">
                    <Button variant="ghost" size="icon">
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                  </Link>
                  <h1 className="text-4xl font-bold">{category?.name}</h1>
                </div>
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Create New Post
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create a New Post</DialogTitle>
                    </DialogHeader>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                          control={form.control}
                          name="title"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Title</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="content"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Content</FormLabel>
                              <FormControl>
                                <Textarea {...field} rows={5} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <div className="flex justify-end">
                          <Button type="submit">Post</Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>

              {isLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <Card key={i} className="animate-pulse">
                      <CardContent className="p-6">
                        <div className="flex gap-4 items-center">
                          <div className="h-10 w-10 rounded-full bg-muted" />
                          <div>
                            <div className="h-6 bg-muted rounded w-48 mb-2" />
                            <div className="h-4 bg-muted rounded w-32" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : posts?.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <p className="text-muted-foreground mb-4">No posts yet. Be the first to start a discussion!</p>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button>
                          <PlusCircle className="mr-2 h-4 w-4" />
                          Create New Post
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Create a New Post</DialogTitle>
                        </DialogHeader>
                        <Form {...form}>
                          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField
                              control={form.control}
                              name="title"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Title</FormLabel>
                                  <FormControl>
                                    <Input {...field} />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="content"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Content</FormLabel>
                                  <FormControl>
                                    <Textarea {...field} rows={5} />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            <div className="flex justify-end">
                              <Button type="submit">Post</Button>
                            </div>
                          </form>
                        </Form>
                      </DialogContent>
                    </Dialog>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-8">
                  {posts?.map((post) => (
                    <Link key={post.id} href={`/forum/${slug}/${post.id}`}>
                      <Card className="hover:bg-muted/50 transition-colors cursor-pointer mb-4">
                        <CardContent className="p-6">
                          <div className="flex items-start gap-4">
                            <Avatar className="h-10 w-10">
                              {post.author.profilePhotoUrl ? (
                                <AvatarImage src={post.author.profilePhotoUrl} />
                              ) : (
                                <AvatarFallback>
                                  {post.author.email.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                              )}
                            </Avatar>
                            <div className="flex-1">
                              <h3 className="text-lg font-semibold mb-1">{post.title}</h3>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <span>{post.author.email}</span>
                                <span>•</span>
                                <span>Last activity: {format(new Date(post.lastActivityAt), 'MMM d, yyyy')}</span>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <MessageSquare className="h-4 w-4" />
                                  {post.commentCount}
                                </span>
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
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}