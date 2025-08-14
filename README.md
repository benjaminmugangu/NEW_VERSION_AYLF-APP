# AYLF Group Tracker

This is a web application designed to help AYLF (African Youth Leadership Forum) track and manage the activities, finances, and reporting of its members, small groups, and sites.

## Prerequisites

- Node.js (v18 or later)
- npm

## Getting Started

### 1. Installation

Clone the repository and install the dependencies:

```bash
npm install
```

#### **Important Note for Windows Users**

If you encounter an error during `npm install` related to script execution policies, you may need to allow scripts to run for the current process. Open your terminal (PowerShell) and run the following command before `npm install`:

```powershell
Set-ExecutionPolicy RemoteSigned -Scope Process
```

This command changes the execution policy only for the current PowerShell session and is a safe way to proceed.

### 2. Environment Variables

Create a `.env.local` file in the root of the project by copying the example file:

```bash
cp .env.example .env.local
```

Fill in the required Supabase credentials in your `.env.local` file:

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

### 3. Running the Development Server

Once the installation is complete and your environment variables are set, you can start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.
