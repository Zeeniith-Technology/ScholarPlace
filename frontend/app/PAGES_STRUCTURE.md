# Pages Structure Documentation

This document outlines the page structure and naming conventions used in the Scholarplace frontend application.

## Naming Conventions

All page components follow the pattern: `[Section][PageName]Page`

Examples:
- `MarketingHomePage` - Marketing section, Home page
- `LoginPage` - Auth section, Login page
- `SignupPage` - Auth section, Signup page
- `StudentDashboardPage` - Student section, Dashboard page

## Page Routes & Components

### Marketing Pages

#### `/` - Marketing Home Page
- **Component**: `MarketingHomePage`
- **File**: `app/(marketing)/page.tsx`
- **Purpose**: Public landing page showcasing Scholarplace features, pricing, and call-to-actions
- **Layout**: `MarketingLayout`

### Authentication Pages

#### `/auth/login` - Login Page
- **Component**: `LoginPage`
- **File**: `app/auth/login/page.tsx`
- **Purpose**: Authentication page for existing users to log in
- **Note**: Currently accepts any email/password combination for development
- **Layout**: `AuthLayout`
- **Redirects to**: `/student/dashboard` (or role-specific dashboard)

#### `/auth/signup` - Signup Page
- **Component**: `SignupPage`
- **File**: `app/auth/signup/page.tsx`
- **Purpose**: Registration page for new users to create an account
- **Layout**: `AuthLayout`

### Student Pages

#### `/student/dashboard` - Student Dashboard Page
- **Component**: `StudentDashboardPage`
- **File**: `app/student/dashboard/page.tsx`
- **Purpose**: Main home page for students after login
- **Features**: 
  - Welcome section with personalized greeting
  - Stats cards (Progress, Tests, Streak, Rank)
  - Upcoming tests list
  - Recent activity feed
  - Semester progress visualization
- **Layout**: `StudentLayout`

#### `/student/roadmap` - Student Roadmap Page
- **Component**: `StudentRoadmapPage` (to be created)
- **File**: `app/student/roadmap/page.tsx`
- **Purpose**: Display semester-wise learning roadmap

#### `/student/tests` - Student Tests Page
- **Component**: `StudentTestsPage` (to be created)
- **File**: `app/student/tests/page.tsx`
- **Purpose**: List all available and completed tests

#### `/student/analytics` - Student Analytics Page
- **Component**: `StudentAnalyticsPage` (to be created)
- **File**: `app/student/analytics/page.tsx`
- **Purpose**: Display detailed performance analytics

#### `/student/profile` - Student Profile Page
- **Component**: `StudentProfilePage` (to be created)
- **File**: `app/student/profile/page.tsx`
- **Purpose**: User profile and settings

## File Structure

```
frontend/app/
├── (marketing)/
│   └── page.tsx                    # MarketingHomePage
├── auth/
│   ├── login/
│   │   └── page.tsx               # LoginPage
│   └── signup/
│       └── page.tsx               # SignupPage
└── student/
    ├── dashboard/
    │   └── page.tsx                # StudentDashboardPage
    ├── roadmap/
    │   └── page.tsx                # StudentRoadmapPage (to be created)
    ├── tests/
    │   └── page.tsx                # StudentTestsPage (to be created)
    ├── analytics/
    │   └── page.tsx                # StudentAnalyticsPage (to be created)
    └── profile/
        └── page.tsx                # StudentProfilePage (to be created)
```

## Layout Components

- **MarketingLayout**: Used for public marketing pages
- **AuthLayout**: Used for authentication pages (login/signup)
- **StudentLayout**: Used for all student pages (includes sidebar navigation)

## Best Practices

1. **Component Naming**: Always use descriptive names ending with "Page"
2. **File Location**: Follow Next.js App Router conventions (page.tsx in route folders)
3. **Documentation**: Add JSDoc comments explaining the page purpose and route
4. **Layout Usage**: Use appropriate layout component for each page type
5. **Consistency**: Maintain consistent naming patterns across all pages

## Future Pages to Implement

- Department TPC Dashboard (`/dept-tpc/dashboard`)
- TPC Dashboard (`/tpc/dashboard`)
- Test Taking Page (`/student/tests/[testId]`)
- Forgot Password Page (`/auth/forgot-password`)
- Terms & Privacy Page (`/terms`)












