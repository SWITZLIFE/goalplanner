import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MessageSquare } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { LeftPanel } from "@/components/LeftPanel";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { format } from "date-fns";

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
  comments: {
    id: number;
    content: string;
    createdAt: string;
    author: {
      id: number;
      email: string;
      profilePhotoUrl: string | null;
    };
  }[];
}

export default function ForumPostPage() {
  const { slug, postId } = useParams();

  const { data: post, isLoading } = useQuery<ForumPost>({
    queryKey: [`/api/forum/posts/${postId}`],
  });

  return (
    <div className="flex h-screen bg-primary">
      <LeftPanel />
      <div className="flex-1 flex flex-col">
        <PageHeader />
        <div className="flex-1 m-4 bg-background rounded-[30px] overflow-hidden">
          <div className="h-full overflow-auto scrollbar-hide py-14 px-14">
            <div className="max-w-5xl mx-auto">
              <div className="flex items-center gap-4 mb-8">
                <Link href={`/forum/${slug}`}>
                  <Button variant="ghost" size="icon">
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                </Link>
                <h1 className="text-4xl font-bold">{post?.title}</h1>
              </div>

              {isLoading ? (
                <div className="space-y-4">
                  <Card className="animate-pulse">
                    <CardContent className="p-6">
                      <div className="flex gap-4 items-start">
                        <div className="h-10 w-10 rounded-full bg-muted" />
                        <div className="flex-1">
                          <div className="h-6 bg-muted rounded w-48 mb-2" />
                          <div className="h-4 bg-muted rounded w-32 mb-4" />
                          <div className="space-y-2">
                            <div className="h-4 bg-muted rounded w-full" />
                            <div className="h-4 bg-muted rounded w-3/4" />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : post ? (
                <div className="space-y-8">
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex gap-4 items-start">
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
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                            <span>{post.author.email}</span>
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
                          <div className="prose prose-sm max-w-none">
                            {post.content}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="space-y-4">
                    <h2 className="text-2xl font-semibold flex items-center gap-2">
                      <MessageSquare className="h-5 w-5" />
                      Comments ({post.comments.length})
                    </h2>
                    {post.comments.map((comment) => (
                      <Card key={comment.id}>
                        <CardContent className="p-4">
                          <div className="flex gap-4 items-start">
                            <Avatar className="h-8 w-8">
                              {comment.author.profilePhotoUrl ? (
                                <AvatarImage src={comment.author.profilePhotoUrl} />
                              ) : (
                                <AvatarFallback>
                                  {comment.author.email.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                              )}
                            </Avatar>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                                <span>{comment.author.email}</span>
                                <span>•</span>
                                <span>{format(new Date(comment.createdAt), 'MMM d, yyyy')}</span>
                              </div>
                              <div className="prose prose-sm max-w-none">
                                {comment.content}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
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
