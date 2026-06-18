# QuickMDtoPDF 📄

QuickMDtoPDF is a premium, high-performance Markdown-to-PDF converter built with SvelteKit, Puppeteer, and `pdf-lib`. It features a quietly editorial workflow UI inspired by **Airtable**'s design guidelines, real-time preview, dynamic export progress animations, and Supabase integration to save and manage documents.

---

## ⚡ Features
- **Airtable Editorial UI**: A clean, white canvas workflow software interface with bold near-black pill CTAs, soft card borders, and elegant typography.
- **High-Compression PDF Export**: Direct CDP (Chrome DevTools Protocol) print rendering combined with `pdf-lib` stream reconstruction. Reduces PDF file size by up to **55%** while preserving exact font mappings (Segoe UI/system fonts).
- **Export Progress Overlay**: Visual progress bar and detailed status updates detailing background processing stages (font compression, stream compression).
- **Supabase Sync**: Secure user registration, login, and dashboard to save, view, and delete documents.

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy the `.env.example` template to create your local `.env` file (which is ignored by git):
```bash
cp .env.example .env
```
Open `.env` and configure your Supabase URL and Anon Key:
```env
PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 3. Run Development Server
```bash
npm run dev
```
Open the app in your browser at `http://localhost:5173/`.

---

## 🗄️ Supabase Database Setup

Run the following SQL queries in your Supabase project's **SQL Editor** to create the `documents` table and configure **Row Level Security (RLS)** policies so users can securely access only their own documents.

### 1. Create Documents Table
```sql
-- Create documents table in the public schema
create table public.documents (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  document_name text not null default 'Untitled Document',
  markdown_content text not null default '',
  created_at timestamptz default now() not null
);

-- Index user_id for faster queries
create index idx_documents_user_id on public.documents(user_id);
```

### 2. Configure Row Level Security (RLS)
```sql
-- Enable Row Level Security on the table
alter table public.documents enable row level security;

-- Policy: Allow authenticated users to view only their own documents
create policy "Users can view their own documents"
on public.documents
for select
to authenticated
using (auth.uid() = user_id);

-- Policy: Allow authenticated users to insert their own documents
create policy "Users can create their own documents"
on public.documents
for insert
to authenticated
with check (auth.uid() = user_id);

-- Policy: Allow authenticated users to update their own documents
create policy "Users can update their own documents"
on public.documents
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Policy: Allow authenticated users to delete their own documents
create policy "Users can delete their own documents"
on public.documents
for delete
to authenticated
using (auth.uid() = user_id);
```

### 3. Create PDF Usage Logs Table & RLS
Run this query to set up logging of PDF generation events (tracking both registered and anonymous usages):
```sql
-- Create pdf_usage_logs table in the public schema
create table public.pdf_usage_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete set null,
  is_anonymous boolean default true not null,
  created_at timestamptz default now() not null
);

-- Enable Row Level Security
alter table public.pdf_usage_logs enable row level security;

-- Policy: Allow anyone (authenticated and anonymous) to log usage
create policy "Enable insert for all users including anon"
on public.pdf_usage_logs
for insert
to public
with check (true);

-- Policy: Allow authenticated users to view logs (admin filtering is managed at the API layer)
create policy "Enable select for authenticated users"
on public.pdf_usage_logs
for select
to authenticated
using (true);
```

---

## 🛠️ Troubleshooting

### Error: `failed to fetch` (Supabase Connection Error)
If the login or register requests fail with `failed to fetch` in the browser console:
1. **Paused Free Project**: Supabase automatically pauses inactive free projects. Log into your [Supabase Dashboard](https://supabase.com/dashboard), locate your project, and click **Restore / Resume Project**.
2. **Environment Configuration**: Ensure your `.env` file is present in the root folder and holds the correct URL and Anon Key.

---

## 🌐 VPS Deployment on Alma Linux (RHEL-based)

Follow these steps to deploy this application to a VPS running **Alma Linux** (e.g., Alma Linux 8 or 9).

### 1. Install Node.js
First, enable the Node.js 20 module and install Node.js:
```bash
sudo dnf module enable nodejs:20 -y
sudo dnf install nodejs -y
```

### 2. Install Puppeteer Dependencies (Headless Chromium)
Puppeteer launches a headless Chromium instance to render PDFs, which requires specific system libraries and fonts. Install them using `dnf`:
```bash
sudo dnf install -y alsa-lib atk audit-libs cups-libs dbus-glib libX11 libXcomposite \
  libXcursor libXdamage libXext libXfixes libXi libXrandr libXrender libXtst pango \
  xorg-x11-fonts-Type1 xorg-x11-utils fontconfig google-inter-fonts liberation-sans-fonts
```

### 3. Setup Project on VPS
Clone the repository, configure the environment variables, and install npm packages:
```bash
# Clone
git clone <your-repository-url>
cd quickmdtopdf

# Install dependencies (includes @sveltejs/adapter-node)
npm install

# Configure environment variables
cp .env.example .env
nano .env
```
Inside `.env`, configure the variables:
```env
PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
PUBLIC_ADMIN_EMAIL=admin@quickmdtopdf.com
PORT=5173
HOST=0.0.0.0
```

### 4. Build the Standalone Server
Run SvelteKit's build process. SvelteKit is configured with `@sveltejs/adapter-node`, so the production build outputs directly into a folder named `build`:
```bash
npm run build
```

### 5. Run with PM2 (Process Manager)
Keep the server running in the background and surviving VPS reboots:
```bash
# Install PM2 globally
sudo npm install -g pm2

# Start the application using PM2
pm2 start build/index.js --name "quickmdtopdf"

# Save PM2 state and enable startup service
pm2 save
pm2 startup
```
To check logs:
```bash
pm2 logs quickmdtopdf
```

### 6. Reverse Proxy Setup (Nginx)
To expose the app on port 80/443 (HTTP/HTTPS) and manage SSL certificates:
```bash
sudo dnf install nginx -y
sudo systemctl enable --now nginx
```
Configure Nginx (`/etc/nginx/conf.d/quickmdtopdf.conf`):
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:5173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```
Reload Nginx:
```bash
sudo systemctl reload nginx
```

