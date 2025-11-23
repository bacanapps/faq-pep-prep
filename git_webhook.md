# Git Production Deployment Setup - FAQ PEP/PrEP

This guide provides step-by-step instructions for setting up automatic deployment to a production server when pushing changes via Git.

## Overview

This setup allows you to deploy the FAQ PEP/PrEP PWA to a production server by pushing to a Git remote. The deployment is triggered automatically via a Git post-receive hook.

**Architecture:**
- Local repository → Push to production remote
- Production server receives push → Triggers post-receive hook
- Hook checks out files to web server directory

**Production URL:** https://faq-pep-prep.bebot.co/

## Prerequisites

- SSH access to production server (root@173.249.16.84)
- Git installed on production server
- Web server configured (nginx/Apache)
- Domain configured: faq-pep-prep.bebot.co

## Part 1: Local Setup

### Step 1: Navigate to Project Directory

```bash
cd "/Users/cpantin/Library/CloudStorage/GoogleDrive-colin@cpantin.com/My Drive/@Ministério da Saúde/OPAS 2026/40 anos da aids/dv_2025_cli/faq-pep-prep"
```

### Step 2: Add Production Remote

Using the SSH config alias:

```bash
git remote add production contabo:/var/repo/faq-pep-prep.git
```

**Note:** If you have an SSH config alias set up (like `contabo` pointing to `root@173.249.16.84`), use that instead of the full SSH URL for convenience.

### Step 3: Verify Remotes

```bash
git remote -v
```

Expected output:
```
origin      https://github.com/bacanapps/faq-pep-prep.git (fetch)
origin      https://github.com/bacanapps/faq-pep-prep.git (push)
production  contabo:/var/repo/faq-pep-prep.git (fetch)
production  contabo:/var/repo/faq-pep-prep.git (push)
```

## Part 2: Server Setup (Required Steps)

### Step 1: Connect to Production Server

```bash
ssh root@173.249.16.84
# Or using SSH alias:
ssh contabo
```

### Step 2: Create Bare Git Repository

A bare repository stores Git metadata without a working directory. It acts as a central hub for receiving pushes.

```bash
# Create directory for Git repositories (if not exists)
mkdir -p /var/repo

# Navigate to the directory
cd /var/repo

# Initialize bare repository for FAQ PEP/PrEP
git init --bare faq-pep-prep.git
```

**Why bare repository?**
- Designed to receive pushes from multiple sources
- Doesn't have a working directory (only Git metadata)
- Standard practice for server-side Git repositories

### Step 3: Verify Deployment Directory

The deployment directory should already exist if the site is currently hosted:

```bash
# Check if directory exists
ls -la /var/www/faq-pep-prep

# If it doesn't exist, create it
mkdir -p /var/www/faq-pep-prep

# Set appropriate permissions
chown -R www-data:www-data /var/www/faq-pep-prep
```

### Step 4: Create Post-Receive Hook

The post-receive hook is a script that runs automatically after Git receives a push.

**IMPORTANT:** Use POSIX-compliant syntax with single brackets `[` instead of double brackets `[[` to ensure compatibility.

```bash
# Create the hook file using cat with heredoc
cat > /var/repo/faq-pep-prep.git/hooks/post-receive << 'EOF'
#!/bin/bash

# Configuration
TARGET="/var/www/faq-pep-prep"
GIT_DIR="/var/repo/faq-pep-prep.git"
BRANCH="main"

echo "===== Post-Receive Hook Started ====="

while read oldrev newrev ref
do
    # Extract branch name from ref
    RECEIVED_BRANCH=$(echo $ref | sed 's/refs\/heads\///')

    echo "Received push to branch: $RECEIVED_BRANCH"

    # Check if this is the main branch (use single brackets for POSIX compliance)
    if [ "$RECEIVED_BRANCH" = "$BRANCH" ]; then
        echo "Deploying $BRANCH branch to production..."
        echo "Target directory: $TARGET"

        # Checkout files to deployment directory
        git --work-tree=$TARGET --git-dir=$GIT_DIR checkout -f $BRANCH

        if [ $? -eq 0 ]; then
            echo "✓ Deployment successful!"
            echo "Files deployed to: $TARGET"

            # Set permissions
            chown -R www-data:www-data $TARGET

            echo "Service worker will be updated on next visit"
            echo "Site available at: https://faq-pep-prep.bebot.co/"
        else
            echo "✗ Deployment failed!"
            exit 1
        fi
    else
        echo "Ignoring push to $RECEIVED_BRANCH branch (not $BRANCH)"
    fi
done

echo "===== Post-Receive Hook Completed ====="
EOF
```

**Note:** Unlike faq-hiv-aids, faq-pep-prep is a **vanilla JavaScript React app with no build step**, making deployment simpler.

### Step 5: Make Hook Executable

```bash
chmod +x /var/repo/faq-pep-prep.git/hooks/post-receive
```

**Verify permissions:**
```bash
ls -l /var/repo/faq-pep-prep.git/hooks/post-receive
```

Should show: `-rwxr-xr-x` (executable)

### Step 6: Set Directory Permissions

```bash
# Git repository permissions
chown -R root:root /var/repo/faq-pep-prep.git

# Web directory permissions (adjust user:group for your web server)
chown -R www-data:www-data /var/www/faq-pep-prep

# Make directories readable
chmod -R 755 /var/www/faq-pep-prep
```

**User/Group options:**
- Ubuntu/Debian nginx: `www-data:www-data`
- CentOS/RHEL nginx: `nginx:nginx`
- Apache: `www-data:www-data` or `apache:apache`

### Step 7: Verify Web Server Configuration

Check if nginx is configured for faq-pep-prep.bebot.co:

```bash
# Check for existing configuration
ls -la /etc/nginx/sites-available/ | grep faq

# View the configuration
cat /etc/nginx/sites-available/faq-pep-prep.bebot.co
# Or check sites-enabled
cat /etc/nginx/sites-enabled/faq-pep-prep.bebot.co
```

**Expected nginx configuration:**

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name faq-pep-prep.bebot.co;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name faq-pep-prep.bebot.co;

    # SSL certificates (adjust paths as needed)
    ssl_certificate /etc/letsencrypt/live/faq-pep-prep.bebot.co/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/faq-pep-prep.bebot.co/privkey.pem;

    root /var/www/faq-pep-prep;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|mp3)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Service Worker and manifest should not be cached
    location ~* (sw\.js|manifest\.json)$ {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }
}
```

If configuration doesn't exist, create it and enable:

```bash
nano /etc/nginx/sites-available/faq-pep-prep.bebot.co
# Paste configuration above

# Enable site
ln -s /etc/nginx/sites-available/faq-pep-prep.bebot.co /etc/nginx/sites-enabled/

# Test configuration
nginx -t

# Reload nginx
systemctl reload nginx
```

### Step 8: Test Connection from Local Machine

Exit the SSH session and return to your local machine:

```bash
exit
```

Test SSH connection:
```bash
ssh contabo "echo 'Connection successful'"
```

## Part 3: Deploying Changes

### Simple Deployment (No Build Step Required)

Unlike faq-hiv-aids which requires TailwindCSS builds, faq-pep-prep is a vanilla JavaScript app with no build step. This makes deployment much simpler!

### Option 1: Push to Production Only

```bash
git push production main
```

### Option 2: Push to GitHub Only

```bash
git push origin main
```

### Option 3: Push to Both Remotes (Recommended)

```bash
# Sequential push
git push origin main && git push production main
```

### Complete Deployment Workflow

```bash
# 1. Navigate to project
cd "/Users/cpantin/Library/CloudStorage/GoogleDrive-colin@cpantin.com/My Drive/@Ministério da Saúde/OPAS 2026/40 anos da aids/dv_2025_cli/faq-pep-prep"

# 2. Make changes to your code
# Edit files as needed (app.js, app.css, data/faq.json, etc.)

# 3. Stage all changes
git add .

# 4. Commit changes
git commit -m "Update FAQ content"

# 5. Push to both GitHub and production
git push origin main && git push production main

# 6. Verify deployment
curl -I https://faq-pep-prep.bebot.co/
open https://faq-pep-prep.bebot.co/
```

### Option 4: Push to Multiple Remotes at Once

```bash
# Add to .git/config
git config -e
```

Add this section:

```ini
[remote "all"]
    url = https://github.com/bacanapps/faq-pep-prep.git
    url = contabo:/var/repo/faq-pep-prep.git
```

Then push to both:
```bash
git push all main
```

### Git Alias for Easy Deployment

Add to `~/.gitconfig`:

```ini
[alias]
    deploy = "!git push origin main && git push production main"
```

Then use:
```bash
git deploy
```

## Workflow Example

**Complete deployment workflow:**

```bash
# 1. Navigate to project
cd "/Users/cpantin/Library/CloudStorage/GoogleDrive-colin@cpantin.com/My Drive/@Ministério da Saúde/OPAS 2026/40 anos da aids/dv_2025_cli/faq-pep-prep"

# 2. Make changes to your code
nano app.js
# or
nano data/faq.json

# 3. Stage changes
git add .

# 4. Commit changes
git commit -m "Add new FAQ questions about PrEP"

# 5. Deploy to production (that's it - no build step!)
git push origin main && git push production main

# 6. Verify deployment
curl -I https://faq-pep-prep.bebot.co/
open https://faq-pep-prep.bebot.co/
```

## Troubleshooting

### Issue: Permission Denied

**Error:**
```
Permission denied (publickey,password)
```

**Solution:**
- Ensure SSH key is added to server's `~/.ssh/authorized_keys`
- Verify SSH config alias is working: `ssh contabo "echo test"`

### Issue: Hook Not Executing

**Error:**
Hook runs but files aren't deployed

**Solutions:**
```bash
# Check hook is executable
ssh contabo "ls -l /var/repo/faq-pep-prep.git/hooks/post-receive"

# Check hook syntax
ssh contabo "bash -n /var/repo/faq-pep-prep.git/hooks/post-receive"

# View hook contents
ssh contabo "cat /var/repo/faq-pep-prep.git/hooks/post-receive"
```

### Issue: Files Not Updating

**Possible causes:**
1. Wrong TARGET path in hook
2. Permission issues
3. Wrong branch name
4. Browser caching old files

**Debug:**
```bash
# Check current deployment
ssh contabo "ls -la /var/www/faq-pep-prep"

# Check file modification times
ssh contabo "stat /var/www/faq-pep-prep/index.html"

# Check specific file content
ssh contabo "head -20 /var/www/faq-pep-prep/app.js"

# Manually trigger deployment
ssh contabo "cd /var/repo/faq-pep-prep.git && GIT_DIR=/var/repo/faq-pep-prep.git git --work-tree=/var/www/faq-pep-prep checkout -f main"
```

### Issue: Site Not Accessible

**Check SSL/Domain:**
```bash
# Test domain resolution
dig faq-pep-prep.bebot.co

# Check nginx status
ssh contabo "systemctl status nginx"

# Check nginx error logs
ssh contabo "tail -50 /var/log/nginx/error.log"

# Check nginx access logs
ssh contabo "tail -50 /var/log/nginx/access.log | grep faq-pep-prep"

# Test SSL certificate
curl -I https://faq-pep-prep.bebot.co/
```

### Issue: Service Worker Caching Old Files

**Solution:**
Update version in `sw.js` to force cache refresh:

```javascript
const VERSION = "v2";  // Increment this
```

Then commit and push:
```bash
git add sw.js
git commit -m "Update service worker version"
git push origin main && git push production main
```

**Clear browser cache:**
- Chrome/Edge: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
- Firefox: Ctrl+F5 (Windows) or Cmd+Shift+R (Mac)
- Or use incognito/private mode

### Issue: Audio Files Not Playing

**Check audio file paths:**
```bash
# Verify audio files exist on server
ssh contabo "ls -la /var/www/faq-pep-prep/assets/audio/"

# Check file permissions
ssh contabo "stat /var/www/faq-pep-prep/assets/audio/your-audio-file.mp3"
```

**Check data/faq.json paths:**
- Ensure audio paths in JSON are relative: `./assets/audio/file.mp3`
- Not absolute: `/assets/audio/file.mp3`

## Security Considerations

### 1. Use SSH Keys (Recommended)

```bash
# Generate SSH key locally (if not already done)
ssh-keygen -t ed25519 -C "your_email@example.com"

# Copy to server
ssh-copy-id root@173.249.16.84
# Or using alias:
ssh-copy-id contabo
```

### 2. Restrict Hook Permissions

```bash
# Hook should only be writable by root
ssh contabo "chmod 755 /var/repo/faq-pep-prep.git/hooks/post-receive"
ssh contabo "chown root:root /var/repo/faq-pep-prep.git/hooks/post-receive"
```

### 3. HTTPS Configuration

Ensure SSL certificates are properly configured:

```bash
# Check SSL certificate expiry
ssh contabo "certbot certificates"

# Renew certificates if needed
ssh contabo "certbot renew"

# Test SSL configuration
openssl s_client -connect faq-pep-prep.bebot.co:443 -servername faq-pep-prep.bebot.co
```

### 4. Restrict SSH Access

Edit `/etc/ssh/sshd_config` to restrict access (be careful not to lock yourself out):

```bash
# Only allow specific users
AllowUsers deployer

# Disable root login (optional, be careful)
PermitRootLogin no

# Restart SSH
systemctl restart sshd
```

## Monitoring Deployments

### View Hook Logs

Add logging to hook (optional enhancement):

```bash
#!/bin/bash
LOG_FILE="/var/log/faq-pep-prep-deploy.log"

# Redirect all output to log
exec >> $LOG_FILE 2>&1

echo "===== Deployment started at $(date) ====="
# ... rest of hook ...
echo "===== Deployment completed at $(date) ====="
```

View logs:
```bash
ssh contabo "tail -f /var/log/faq-pep-prep-deploy.log"
```

### Monitor Site Status

```bash
# Check site is responding
curl -I https://faq-pep-prep.bebot.co/

# Monitor nginx access logs
ssh contabo "tail -f /var/log/nginx/access.log | grep faq-pep-prep"

# Check site uptime
curl -o /dev/null -s -w "Time: %{time_total}s\nHTTP: %{http_code}\n" https://faq-pep-prep.bebot.co/
```

## Advanced: Hook Enhancements

### Add Deployment Notifications

Send notification when deployment completes:

```bash
#!/bin/bash
TARGET="/var/www/faq-pep-prep"
GIT_DIR="/var/repo/faq-pep-prep.git"
BRANCH="main"
DEPLOY_LOG="/var/log/faq-pep-prep-deploy.log"

while read oldrev newrev ref
do
    RECEIVED_BRANCH=$(echo $ref | sed 's/refs\/heads\///')

    if [ "$RECEIVED_BRANCH" = "$BRANCH" ]; then
        echo "Deploying $BRANCH branch at $(date)..." | tee -a $DEPLOY_LOG

        git --work-tree=$TARGET --git-dir=$GIT_DIR checkout -f $BRANCH

        if [ $? -eq 0 ]; then
            echo "✓ Deployment successful at $(date)" | tee -a $DEPLOY_LOG
            chown -R www-data:www-data $TARGET

            # Optional: Send email notification
            # echo "Deployed to faq-pep-prep.bebot.co" | mail -s "Deployment Success" admin@example.com
        else
            echo "✗ Deployment failed at $(date)" | tee -a $DEPLOY_LOG
            exit 1
        fi
    fi
done
```

### Pre-deployment Validation

Add validation before deploying:

```bash
#!/bin/bash
TARGET="/var/www/faq-pep-prep"
GIT_DIR="/var/repo/faq-pep-prep.git"
BRANCH="main"
TMP_WORK="/tmp/faq-pep-prep-test"

while read oldrev newrev ref
do
    RECEIVED_BRANCH=$(echo $ref | sed 's/refs\/heads\///')

    if [ "$RECEIVED_BRANCH" = "$BRANCH" ]; then
        echo "Running pre-deployment validation..."

        # Checkout to temporary directory
        mkdir -p $TMP_WORK
        git --work-tree=$TMP_WORK --git-dir=$GIT_DIR checkout -f $BRANCH

        # Validate required files exist
        if [ ! -f "$TMP_WORK/index.html" ]; then
            echo "ERROR: index.html missing!"
            rm -rf $TMP_WORK
            exit 1
        fi

        if [ ! -f "$TMP_WORK/app.js" ]; then
            echo "ERROR: app.js missing!"
            rm -rf $TMP_WORK
            exit 1
        fi

        if [ ! -f "$TMP_WORK/data/faq.json" ]; then
            echo "ERROR: data/faq.json missing!"
            rm -rf $TMP_WORK
            exit 1
        fi

        # Validate JSON syntax
        if ! python3 -m json.tool $TMP_WORK/data/faq.json > /dev/null 2>&1; then
            echo "ERROR: Invalid JSON in data/faq.json!"
            rm -rf $TMP_WORK
            exit 1
        fi

        echo "✓ Validation passed"

        # Deploy
        git --work-tree=$TARGET --git-dir=$GIT_DIR checkout -f $BRANCH
        chown -R www-data:www-data $TARGET

        # Cleanup
        rm -rf $TMP_WORK
        echo "✓ Deployment complete!"
    fi
done
```

## Resources

- [Git Hooks Documentation](https://git-scm.com/book/en/v2/Customizing-Git-Git-Hooks)
- [Deploying with Git](https://git-scm.com/book/en/v2/Git-on-the-Server-Getting-Git-on-a-Server)
- [Nginx Configuration](https://nginx.org/en/docs/)
- [Howler.js Audio Documentation](https://howlerjs.com/)

## Summary Checklist

Server setup:
- [ ] SSH access confirmed
- [ ] Bare repository created at `/var/repo/faq-pep-prep.git`
- [ ] Deployment directory verified at `/var/www/faq-pep-prep`
- [ ] Post-receive hook created and made executable
- [ ] Permissions set correctly
- [ ] Web server configured for faq-pep-prep.bebot.co
- [ ] SSL certificates configured
- [ ] First deployment tested

Local setup:
- [ ] Production remote added
- [ ] Test deployment completed
- [ ] Deployment workflow documented

Verification:
- [ ] Site accessible at https://faq-pep-prep.bebot.co/
- [ ] Audio playback working
- [ ] Service worker functioning
- [ ] Analytics tracking working
- [ ] All FAQ content displaying correctly

## Support

For issues or questions:
1. Check troubleshooting section above
2. Review hook logs if logging is enabled
3. Test manual deployment via SSH
4. Verify web server and SSL configuration
5. Check domain DNS settings
6. Validate JSON data files

## Quick Reference

```bash
# Complete deployment (no build step needed!)
git add . && git commit -m "Update" && git push origin main && git push production main

# Check deployment
ssh contabo "ls -la /var/www/faq-pep-prep"

# View site
open https://faq-pep-prep.bebot.co/

# Check recent changes
ssh contabo "stat /var/www/faq-pep-prep/app.js"

# Validate JSON
python3 -m json.tool data/faq.json

# Check nginx config
ssh contabo "nginx -t"

# Reload nginx
ssh contabo "systemctl reload nginx"

# Monitor deployments
ssh contabo "tail -f /var/log/faq-pep-prep-deploy.log"
```

## Differences from Other Projects

**vs. biblioteca:**
- No Tailwind build step (vanilla CSS)
- Simpler deployment (just push)
- Uses Howler.js for audio (same pattern)

**vs. faq-hiv-aids:**
- No Tailwind build step required
- No npm/node dependencies
- Faster deployment process
- Similar FAQ structure and functionality

**Key Advantage:**
Being a vanilla JavaScript app with no build step makes faq-pep-prep the **simplest to deploy** - just edit, commit, and push!
