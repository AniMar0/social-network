# Dynamic Routing Implementation - Social Network

## Overview
Your social network### Required Backend Endpoints

To complete the integration, you'll need these backend endpoints:

1. **GET `/api/profile/{username}`**
   - Returns user profile data
   - Should handle both username and custom URL lookups
   - Returns 404 if user not found

2. **GET `/api/profile/{username}/posts`**
   - Returns user's posts
   - Handles privacy settings
   - Pagination support recommended Next.js dynamic routing with the following URL structure:

- `/` - Authentication page (login/register)
- `/home` - Main home feed for logged-in users
- `/profile` - Redirects to current user's profile
- `/profile/[username]` - Dynamic user profile pages (e.g., `/profile/johndoe`, `/profile/alice123`)

## Route Structure

### 1. Root Route (`/`)
- **File**: `app/page.tsx`
- **Purpose**: Authentication and redirect logic
- **Behavior**: 
  - Shows login/register form if user is not authenticated
  - Automatically redirects to `/home` if user is already logged in

### 2. Home Route (`/home`)
- **File**: `app/home/page.tsx`
- **Purpose**: Main feed for authenticated users
- **Features**:
  - Checks authentication before loading
  - Redirects to `/` if not logged in
  - Contains the home feed component
  - Handles navigation to user profiles

### 3. Profile Redirect Route (`/profile`)
- **File**: `app/profile/page.tsx`
- **Purpose**: Redirects to current user's profile page
- **Features**:
  - Checks authentication
  - Gets current user data
  - Redirects to `/{username}` using user's profile URL/nickname
  - Temporary solution for profile navigation

### 4. Dynamic User Profile Route (`/profile/[username]`)
- **File**: `app/profile/[username]/page.tsx`
- **Purpose**: Individual user profile pages
- **Features**:
  - Dynamic route that accepts any username after `/profile/`
  - Determines if viewing own profile vs. another user's profile
  - Authentication-protected
  - Ready for backend integration
  - Examples: `/profile/johndoe`, `/profile/newuser445`

## Navigation Utilities

### Location: `lib/navigation.ts`

#### Key Functions:
- `useAppNavigation()` - Hook for programmatic navigation
- `getUserProfileUrl(user)` - Get user's profile URL
- `authUtils.checkAuth()` - Check authentication status
- `profileUtils.fetchUserProfile(username)` - Fetch user data (TODO: Backend integration)

## Backend Integration Points

You mentioned users have URLs saved in the database. Here are the integration points where you'll need to add your backend logic:

### 1. User Profile Loading (`app/[username]/page.tsx`)
```typescript
// TODO: Replace this with actual backend call
// const profileRes = await fetch(`http://localhost:8080/api/user/${username}`, {
//   method: "GET",
//   credentials: "include",
// });
```

### 2. Profile URL Utilities (`lib/navigation.ts`)
```typescript
export const getUserProfileUrl = (user: any): string => {
  // TODO: Update this based on your backend user structure
  return user.profileUrl || user.nickname || user.id;
};
```

### 3. Profile Data Fetching (`lib/navigation.ts`)
```typescript
// TODO: Add backend endpoints for:
// - /api/user/{username} - Get user profile
// - /api/user/{username}/posts - Get user posts
```

## Required Backend Endpoints

To complete the integration, you'll need these backend endpoints:

1. **GET `/api/user/{username}`**
   - Returns user profile data
   - Should handle both username and custom URL lookups
   - Returns 404 if user not found

2. **GET `/api/user/{username}/posts`**
   - Returns user's posts
   - Handles privacy settings
   - Pagination support recommended

3. **GET `/api/current-user`** (optional)
   - Returns current authenticated user's data
   - Useful for determining profile ownership

## Navigation Examples

### Programmatic Navigation:
```typescript
import { useAppNavigation } from "@/lib/navigation";

const { navigateToProfile, navigateToHome } = useAppNavigation();

// Navigate to user profile
navigateToProfile("johndoe");

// Navigate to home
navigateToHome();
```

### Profile URL Generation:
```typescript
import { getUserProfileUrl } from "@/lib/navigation";

const user = { nickname: "johndoe", profileUrl: "john-doe-123" };
const profileUrl = getUserProfileUrl(user); // Returns "john-doe-123"
```

## Authentication Flow

1. User visits any URL
2. Each protected route checks authentication
3. If not authenticated → redirect to `/`
4. If authenticated but on `/` → redirect to `/home`
5. Profile routes determine ownership (own vs. other user's profile)

## Current Status

✅ **Completed:**
- Dynamic routing structure
- Authentication redirects
- Navigation utilities
- Route protection
- Profile ownership detection

🔄 **Ready for Backend Integration:**
- User profile fetching by username/URL
- Post loading for profiles
- Custom URL handling from database

## Next Steps

1. **Add your backend endpoints** for user profiles and posts
2. **Update the profile URL logic** in `getUserProfileUrl()` to match your database structure
3. **Test the routing** with actual user data
4. **Add error handling** for non-existent users (404 pages)
5. **Implement profile privacy settings** if needed

The frontend is now ready to handle dynamic URLs and will work seamlessly once you connect your backend endpoints!