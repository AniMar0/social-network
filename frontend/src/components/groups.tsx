"use client";

import { useState, useEffect } from "react";
import { SidebarNavigation } from "./sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Users,
  Plus,
  Search,
  CalendarIcon,
  MessageSquare,
  Settings,
  UserPlus,
  Check,
  X,
  Heart,
  MessageCircle,
  Share2,
  Clock,
  MapPin,
  ChevronDownIcon,
} from "lucide-react";
import { useNotificationCount } from "@/lib/notifications";
import { GroupChat } from "./group-chat";

// Interfaces
interface Group {
  id: string;
  title: string;
  description: string;
  creatorId: string;
  creatorName: string;
  memberCount: number;
  isPrivate: boolean;
  createdAt: string;
  avatar: string;
  isOwner: boolean;
  isMember: boolean;
  hasPendingRequest: boolean;
}

interface GroupMember {
  id: string;
  name: string;
  username: string;
  avatar: string;
  role: "creator" | "member";
  joinedAt: string;
}

interface GroupPost {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  content: string;
  image?: string;
  createdAt: string;
  likes: number;
  comments: number;
  isLiked: boolean;
}

interface GroupEvent {
  id: string;
  title: string;
  description: string;
  creatorId: string;
  creatorName: string;
  date: string;
  time: string;
  location?: string;
  goingCount: number;
  notGoingCount: number;
  userResponse: "going" | "not-going" | null;
  createdAt: string;
}

interface GroupsPageProps {
  onNavigate?: (page: string) => void;
  onNewPost?: () => void;
}

// Sample data
const sampleGroups: Group[] = [
  {
    id: "1",
    title: "Tech Enthusiasts",
    description:
      "A community for technology lovers to share ideas and discuss latest trends.",
    creatorId: "user1",
    creatorName: "John Doe",
    memberCount: 245,
    isPrivate: false,
    createdAt: "2024-01-15",
    avatar: "https://i.imgur.com/aSlIJks.png",
    isOwner: false,
    isMember: true,
    hasPendingRequest: false,
  },
  {
    id: "2",
    title: "Photography Club",
    description:
      "Share your best shots and learn photography techniques from fellow photographers.",
    creatorId: "user2",
    creatorName: "Jane Smith",
    memberCount: 189,
    isPrivate: true,
    createdAt: "2024-02-01",
    avatar: "https://i.imgur.com/aSlIJks.png",
    isOwner: true,
    isMember: true,
    hasPendingRequest: false,
  },
  {
    id: "3",
    title: "Book Club",
    description: "Monthly book discussions and reading recommendations.",
    creatorId: "user3",
    creatorName: "Mike Johnson",
    memberCount: 78,
    isPrivate: false,
    createdAt: "2024-01-20",
    avatar: "https://i.imgur.com/aSlIJks.png",
    isOwner: false,
    isMember: false,
    hasPendingRequest: true,
  },
];

const sampleGroupPosts: GroupPost[] = [
  {
    id: "1",
    authorId: "user1",
    authorName: "John Doe",
    authorAvatar: "https://i.imgur.com/aSlIJks.png",
    content:
      "What do you think about the latest AI developments? Excited to hear your thoughts!",
    createdAt: "2024-03-15T10:30:00Z",
    likes: 15,
    comments: 8,
    isLiked: false,
  },
  {
    id: "2",
    authorId: "user2",
    authorName: "Jane Smith",
    authorAvatar: "https://i.imgur.com/aSlIJks.png",
    content:
      "Just finished reading 'The Design of Everyday Things'. Highly recommend it for UX designers!",
    image: "https://i.imgur.com/aSlIJks.png",
    createdAt: "2024-03-14T15:45:00Z",
    likes: 23,
    comments: 12,
    isLiked: true,
  },
];

const sampleGroupEvents: GroupEvent[] = [
  {
    id: "1",
    title: "Tech Meetup 2024",
    description:
      "Monthly meetup to discuss latest technology trends and network with fellow developers.",
    creatorId: "user1",
    creatorName: "John Doe",
    date: "2024-04-15",
    time: "18:00",
    location: "Tech Hub Downtown",
    goingCount: 25,
    notGoingCount: 5,
    userResponse: "going",
    createdAt: "2024-03-10T09:00:00Z",
  },
  {
    id: "2",
    title: "Photography Workshop",
    description:
      "Learn advanced photography techniques with professional photographers.",
    creatorId: "user2",
    creatorName: "Jane Smith",
    date: "2024-04-20",
    time: "14:00",
    location: "City Park",
    goingCount: 18,
    notGoingCount: 3,
    userResponse: null,
    createdAt: "2024-03-12T11:30:00Z",
  },
];

export function GroupsPage({ onNavigate, onNewPost }: GroupsPageProps) {
  const notificationCount = useNotificationCount();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [activeTab, setActiveTab] = useState("browse");
  const [searchQuery, setSearchQuery] = useState("");
  const [groups, setGroups] = useState<Group[]>(sampleGroups);
  const [groupPosts, setGroupPosts] = useState<GroupPost[]>(sampleGroupPosts);
  const [groupEvents, setGroupEvents] =
    useState<GroupEvent[]>(sampleGroupEvents);

  // Create group dialog state
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [newGroupTitle, setNewGroupTitle] = useState("");
  const [newGroupDescription, setNewGroupDescription] = useState("");
  const [newGroupPrivacy, setNewGroupPrivacy] = useState("public");

  // Create post dialog state
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [newPostContent, setNewPostContent] = useState("");

  // Create event dialog state
  const [isCreateEventOpen, setIsCreateEventOpen] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState("");
  const [newEventDescription, setNewEventDescription] = useState("");
  const [newEventDate, setNewEventDate] = useState<Date | undefined>(undefined);
  const [newEventTime, setNewEventTime] = useState("");
  const [newEventLocation, setNewEventLocation] = useState("");
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  // Group chat state
  const [isGroupChatOpen, setIsGroupChatOpen] = useState(false);

  const handleNewPost = () => {
    onNewPost?.();
    console.log("New post clicked");
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const filteredGroups = groups.filter(
    (group) =>
      group.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      group.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateGroup = () => {
    if (newGroupTitle.trim() && newGroupDescription.trim()) {
      const newGroup: Group = {
        id: Date.now().toString(),
        title: newGroupTitle,
        description: newGroupDescription,
        creatorId: "currentUser",
        creatorName: "Current User",
        memberCount: 1,
        isPrivate: newGroupPrivacy === "private",
        createdAt: new Date().toISOString(),
        avatar: "https://i.imgur.com/aSlIJks.png",
        isOwner: true,
        isMember: true,
        hasPendingRequest: false,
      };

      setGroups([newGroup, ...groups]);
      setNewGroupTitle("");
      setNewGroupDescription("");
      setNewGroupPrivacy("public");
      setIsCreateGroupOpen(false);
      console.log("Created new group:", newGroup);
    }
  };

  const handleJoinGroup = (groupId: string) => {
    setGroups(
      groups.map((group) =>
        group.id === groupId ? { ...group, hasPendingRequest: true } : group
      )
    );
    console.log("Requested to join group:", groupId);
  };

  const handleCreatePost = () => {
    if (newPostContent.trim() && selectedGroup) {
      const newPost: GroupPost = {
        id: Date.now().toString(),
        authorId: "currentUser",
        authorName: "Current User",
        authorAvatar: "https://i.imgur.com/aSlIJks.png",
        content: newPostContent,
        createdAt: new Date().toISOString(),
        likes: 0,
        comments: 0,
        isLiked: false,
      };

      setGroupPosts([newPost, ...groupPosts]);
      setNewPostContent("");
      setIsCreatePostOpen(false);
      console.log("Created new group post:", newPost);
    }
  };

  const handleCreateEvent = () => {
    if (
      newEventTitle.trim() &&
      newEventDescription.trim() &&
      newEventDate &&
      newEventTime &&
      selectedGroup
    ) {
      const newEvent: GroupEvent = {
        id: Date.now().toString(),
        title: newEventTitle,
        description: newEventDescription,
        creatorId: "currentUser",
        creatorName: "Current User",
        date: newEventDate.toISOString().split("T")[0], // Convert Date to YYYY-MM-DD string
        time: newEventTime,
        location: newEventLocation,
        goingCount: 0,
        notGoingCount: 0,
        userResponse: null,
        createdAt: new Date().toISOString(),
      };

      setGroupEvents([newEvent, ...groupEvents]);
      setNewEventTitle("");
      setNewEventDescription("");
      setNewEventDate(undefined);
      setNewEventTime("");
      setNewEventLocation("");
      setIsCreateEventOpen(false);
      console.log("Created new event:", newEvent);
    }
  };

  const handleEventResponse = (
    eventId: string,
    response: "going" | "not-going"
  ) => {
    setGroupEvents(
      groupEvents.map((event) => {
        if (event.id === eventId) {
          const oldResponse = event.userResponse;
          const newEvent = { ...event, userResponse: response };

          // Update counts
          if (oldResponse === "going") newEvent.goingCount--;
          else if (oldResponse === "not-going") newEvent.notGoingCount--;

          if (response === "going") newEvent.goingCount++;
          else if (response === "not-going") newEvent.notGoingCount++;

          return newEvent;
        }
        return event;
      })
    );
    console.log("Updated event response:", eventId, response);
  };

  return (
    <div className="flex min-h-screen bg-background">
      <SidebarNavigation
        activeItem="groups"
        onNewPost={handleNewPost}
        notificationCount={notificationCount}
        isMobileMenuOpen={isMobileMenuOpen}
        onMobileMenuToggle={toggleMobileMenu}
      />

      <div className="flex-1 lg:ml-64 min-w-0">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="p-6 border-b border-border bg-card">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-bold text-foreground lg:ml-0 ml-12">
                Groups
              </h1>

              <Dialog
                open={isCreateGroupOpen}
                onOpenChange={setIsCreateGroupOpen}
              >
                <DialogTrigger asChild>
                  <Button className="bg-primary hover:bg-primary/90 cursor-pointer">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Group
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Group</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="title" className="p-2">
                        Group Title
                      </Label>
                      <Input
                        id="title"
                        value={newGroupTitle}
                        onChange={(e) => setNewGroupTitle(e.target.value)}
                        placeholder="Enter group title"
                      />
                    </div>
                    <div>
                      <Label htmlFor="description" className="p-2">
                        Description
                      </Label>
                      <Textarea
                        id="description"
                        value={newGroupDescription}
                        onChange={(e) => setNewGroupDescription(e.target.value)}
                        placeholder="Describe your group"
                        rows={3}
                      />
                    </div>
                    <div>
                      <Label htmlFor="privacy" className="p-2">
                        Privacy
                      </Label>
                      <Select
                        value={newGroupPrivacy}
                        onValueChange={setNewGroupPrivacy}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="public">Public</SelectItem>
                          <SelectItem value="private">Private</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={handleCreateGroup}
                        className="flex-1 cursor-pointer"
                      >
                        Create Group
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setIsCreateGroupOpen(false)}
                        className="flex-1 cursor-pointer hover:bg-destructive/10"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search groups..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Main Content */}
          <div className="p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2 ">
                <TabsTrigger value="browse" className="cursor-pointer">
                  Browse Groups
                </TabsTrigger>
                <TabsTrigger value="my-groups" className="cursor-pointer">
                  My Groups
                </TabsTrigger>
              </TabsList>

              {/* Browse Groups Tab */}
              <TabsContent value="browse" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredGroups.map((group) => (
                    <Card
                      key={group.id}
                      className="hover:shadow-md transition-shadow"
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-start gap-3">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={group.avatar} alt={group.title} />
                            <AvatarFallback>
                              {group.title.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-lg truncate">
                              {group.title}
                            </CardTitle>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge
                                variant={
                                  group.isPrivate ? "secondary" : "outline"
                                }
                              >
                                {group.isPrivate ? "Private" : "Public"}
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                {group.memberCount} members
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                          {group.description}
                        </p>
                        <div className="flex gap-2">
                          {group.isMember ? (
                            <Button
                              onClick={() => {
                                setSelectedGroup(group);
                                setActiveTab("group-view");
                              }}
                              className="flex-1 cursor-pointer"
                            >
                              View Group
                            </Button>
                          ) : group.hasPendingRequest ? (
                            <Button
                              variant="outline"
                              disabled
                              className="flex-1"
                            >
                              Request Pending
                            </Button>
                          ) : (
                            <Button
                              onClick={() => handleJoinGroup(group.id)}
                              variant="outline"
                              className="flex-1"
                            >
                              <UserPlus className="h-4 w-4 mr-2" />
                              {group.isPrivate
                                ? "Request to Join"
                                : "Join Group"}
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              {/* My Groups Tab */}
              <TabsContent value="my-groups" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {groups
                    .filter((group) => group.isMember)
                    .map((group) => (
                      <Card
                        key={group.id}
                        className="hover:shadow-md transition-shadow"
                      >
                        <CardHeader className="pb-2">
                          <div className="flex items-start gap-3">
                            <Avatar className="h-12 w-12">
                              <AvatarImage
                                src={group.avatar}
                                alt={group.title}
                              />
                              <AvatarFallback>
                                {group.title.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <CardTitle className="text-lg truncate">
                                {group.title}
                              </CardTitle>
                              <div className="flex items-center gap-2 mt-1">
                                {group.isOwner && (
                                  <Badge variant="default">Owner</Badge>
                                )}
                                <Badge
                                  variant={
                                    group.isPrivate ? "secondary" : "outline"
                                  }
                                >
                                  {group.isPrivate ? "Private" : "Public"}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                            {group.description}
                          </p>
                          <Button
                            onClick={() => {
                              setSelectedGroup(group);
                              setActiveTab("group-view");
                            }}
                            className="w-full cursor-pointer"
                          >
                            Open Group
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              </TabsContent>

              {/* Group View Tab */}
              {selectedGroup && (
                <TabsContent value="group-view" className="space-y-4">
                  {/* Group Header */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-start gap-4">
                        <Avatar className="h-16 w-16">
                          <AvatarImage
                            src={selectedGroup.avatar}
                            alt={selectedGroup.title}
                          />
                          <AvatarFallback className="text-lg">
                            {selectedGroup.title.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h2 className="text-2xl font-bold">
                              {selectedGroup.title}
                            </h2>
                            {selectedGroup.isOwner && (
                              <Badge variant="default">Owner</Badge>
                            )}
                          </div>
                          <p className="text-muted-foreground mb-3">
                            {selectedGroup.description}
                          </p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>{selectedGroup.memberCount} members</span>
                            <span>
                              Created{" "}
                              {new Date(
                                selectedGroup.createdAt
                              ).toLocaleString()}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            onClick={() => setIsGroupChatOpen(true)}
                            className="flex-1 cursor-pointer"
                          >
                            <MessageSquare className="h-4 w-4 mr-2" />
                            Group Chat
                          </Button>
                          {selectedGroup.isOwner && (
                            <Button
                              variant="outline"
                              className="flex-1 cursor-pointer"
                            >
                              <Settings className="h-4 w-4 mr-2" />
                              Settings
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                  </Card>

                  {/* Group Content Tabs */}
                  <Tabs defaultValue="posts" className="w-full">
                    <TabsList>
                      <TabsTrigger value="posts" className="cursor-pointer">
                        Posts
                      </TabsTrigger>
                      <TabsTrigger value="events" className="cursor-pointer">
                        Events
                      </TabsTrigger>
                      <TabsTrigger value="members" className="cursor-pointer">
                        Members
                      </TabsTrigger>
                    </TabsList>

                    {/* Posts Tab */}
                    <TabsContent value="posts" className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h3 className="text-lg font-semibold">Group Posts</h3>
                        <Dialog
                          open={isCreatePostOpen}
                          onOpenChange={setIsCreatePostOpen}
                        >
                          <DialogTrigger asChild>
                            <Button className="cursor-pointer">
                              <Plus className="h-4 w-4 mr-2" />
                              Create Post
                            </Button>
                            {/* TODO add image upload, emoji picker and gif picker to the groups posts anzidhom menbe3d */}
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Create Group Post</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <Textarea
                                value={newPostContent}
                                onChange={(e) =>
                                  setNewPostContent(e.target.value)
                                }
                                placeholder="What's on your mind?"
                                rows={4}
                              />
                              <div className="flex gap-2">
                                <Button
                                  onClick={handleCreatePost}
                                  className="flex-1 cursor-pointer"
                                >
                                  Post
                                </Button>
                                <Button
                                  variant="outline"
                                  onClick={() => setIsCreatePostOpen(false)}
                                  className="cursor-pointer hover:bg-destructive/10"
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>

                      <div className="space-y-4">
                        {groupPosts.map((post) => (
                          <Card key={post.id}>
                            <CardContent className="pt-6">
                              <div className="flex items-start gap-3">
                                <Avatar className="h-10 w-10">
                                  <AvatarImage
                                    src={post.authorAvatar}
                                    alt={post.authorName}
                                  />
                                  <AvatarFallback>
                                    {post.authorName.slice(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="font-semibold">
                                      {post.authorName}
                                    </span>
                                    <span className="text-sm text-muted-foreground">
                                      {new Date(
                                        post.createdAt
                                      ).toLocaleString()}
                                    </span>
                                  </div>
                                  <p className="text-foreground mb-3">
                                    {post.content}
                                  </p>
                                  {post.image && (
                                    <img
                                      src={post.image}
                                      alt="Post image"
                                      className="rounded-lg max-w-full h-auto mb-3"
                                    />
                                  )}
                                  <div className="flex items-center gap-4">
                                    <Button variant="ghost" size="sm">
                                      <Heart
                                        className={`h-4 w-4 mr-1 ${
                                          post.isLiked
                                            ? "fill-current text-red-500"
                                            : ""
                                        }`}
                                      />
                                      {post.likes}
                                    </Button>
                                    <Button variant="ghost" size="sm">
                                      <MessageCircle className="h-4 w-4 mr-1" />
                                      {post.comments}
                                    </Button>
                                    <Button variant="ghost" size="sm">
                                      <Share2 className="h-4 w-4 mr-1" />
                                      Share
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </TabsContent>

                    {/* Events Tab */}
                    <TabsContent value="events" className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h3 className="text-lg font-semibold">Group Events</h3>
                        <Dialog
                          open={isCreateEventOpen}
                          onOpenChange={setIsCreateEventOpen}
                        >
                          <DialogTrigger asChild>
                            <Button className="cursor-pointer">
                              <Plus className="h-4 w-4 mr-2" />
                              Create Event
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Create Group Event</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="event-title" className="p-2">
                                  Event Title
                                </Label>
                                <Input
                                  id="event-title"
                                  value={newEventTitle}
                                  onChange={(e) =>
                                    setNewEventTitle(e.target.value)
                                  }
                                  placeholder="Enter event title"
                                />
                              </div>
                              <div>
                                <Label
                                  htmlFor="event-description"
                                  className="p-2"
                                >
                                  Description
                                </Label>
                                <Textarea
                                  id="event-description"
                                  value={newEventDescription}
                                  onChange={(e) =>
                                    setNewEventDescription(e.target.value)
                                  }
                                  placeholder="Describe your event"
                                  rows={3}
                                />
                              </div>
                              <div className="flex gap-4">
                                <div className="flex flex-col gap-3">
                                  <Label htmlFor="date-picker" className="px-1">
                                    Date
                                  </Label>
                                  <Popover
                                    open={datePickerOpen}
                                    onOpenChange={setDatePickerOpen}
                                  >
                                    <PopoverTrigger asChild>
                                      <Button
                                        variant="outline"
                                        id="date-picker"
                                        className="w-32 justify-between font-normal"
                                      >
                                        {newEventDate
                                          ? newEventDate.toLocaleString()
                                          : "Select date"}
                                        <ChevronDownIcon />
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent
                                      className="w-auto overflow-hidden p-0"
                                      align="start"
                                    >
                                      <Calendar
                                        mode="single"
                                        selected={newEventDate}
                                        captionLayout="dropdown"
                                        onSelect={(date) => {
                                          setNewEventDate(date);
                                          setDatePickerOpen(false);
                                        }}
                                      />
                                    </PopoverContent>
                                  </Popover>
                                </div>
                                <div className="flex flex-col gap-3">
                                  <Label htmlFor="time-picker" className="px-1">
                                    Time
                                  </Label>
                                  <Input
                                    type="time"
                                    id="time-picker"
                                    step="1"
                                    value={newEventTime}
                                    onChange={(e) =>
                                      setNewEventTime(e.target.value)
                                    }
                                    className="bg-background appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                                  />
                                </div>
                              </div>
                              <div>
                                <Label htmlFor="event-location" className="p-2">
                                  Location (Optional)
                                </Label>
                                <Input
                                  id="event-location"
                                  value={newEventLocation}
                                  onChange={(e) =>
                                    setNewEventLocation(e.target.value)
                                  }
                                  placeholder="Enter event location"
                                />
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  onClick={handleCreateEvent}
                                  className="flex-1 cursor-pointer"
                                >
                                  Create Event
                                </Button>
                                <Button
                                  variant="outline"
                                  onClick={() => setIsCreateEventOpen(false)}
                                  className="cursor-pointer hover:bg-destructive/10"
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>

                      <div className="space-y-4">
                        {groupEvents.map((event) => (
                          <Card key={event.id}>
                            <CardContent className="pt-6">
                              <div className="flex justify-between items-start mb-4">
                                <div className="flex-1">
                                  <h4 className="font-semibold text-lg mb-2">
                                    {event.title}
                                  </h4>
                                  <p className="text-muted-foreground mb-3">
                                    {event.description}
                                  </p>
                                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                                    <div className="flex items-center gap-1">
                                      <CalendarIcon className="h-4 w-4" />
                                      {new Date(event.date).toLocaleString()}
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Clock className="h-4 w-4" />
                                      {event.time}
                                    </div>
                                    {event.location && (
                                      <div className="flex items-center gap-1">
                                        <MapPin className="h-4 w-4" />
                                        {event.location}
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-4 text-sm">
                                    <span className="text-green-600">
                                      {event.goingCount} going
                                    </span>
                                    <span className="text-red-600">
                                      {event.notGoingCount} not going
                                    </span>
                                  </div>
                                </div>
                                <div className="flex flex-col gap-2">
                                  <Button
                                    variant={
                                      event.userResponse === "going"
                                        ? "default"
                                        : "outline"
                                    }
                                    size="sm"
                                    onClick={() =>
                                      handleEventResponse(event.id, "going")
                                    }
                                    className="cursor-pointer"
                                  >
                                    <Check className="h-4 w-4 mr-1" />
                                    Going
                                  </Button>
                                  <Button
                                    variant={
                                      event.userResponse === "not-going"
                                        ? "destructive"
                                        : "outline"
                                    }
                                    size="sm"
                                    onClick={() =>
                                      handleEventResponse(event.id, "not-going")
                                    }
                                    className="cursor-pointer"
                                  >
                                    <X className="h-4 w-4 mr-1" />
                                    Not Going
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </TabsContent>

                    {/* Members Tab */}
                    <TabsContent value="members" className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h3 className="text-lg font-semibold">Group Members</h3>
                        {selectedGroup.isOwner && (
                          <Button variant="outline">
                            <UserPlus className="h-4 w-4 mr-2" />
                            Invite Members
                          </Button>
                        )}
                      </div>

                      {/* Members would be loaded from API */}
                      <div className="text-center text-muted-foreground py-8">
                        <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Members list will be loaded from the server</p>
                      </div>
                    </TabsContent>
                  </Tabs>
                </TabsContent>
              )}
            </Tabs>
          </div>
        </div>
      </div>

      {/* Group Chat Modal */}
      {selectedGroup && (
        <GroupChat
          groupId={selectedGroup.id}
          groupTitle={selectedGroup.title}
          isOpen={isGroupChatOpen}
          onClose={() => setIsGroupChatOpen(false)}
        />
      )}
    </div>
  );
}

export default GroupsPage;
