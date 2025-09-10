# Namecheap Email Setup for Support Form

## Quick Setup (5 minutes)

### Step 1: Get Your Namecheap Email Credentials
1. Log into your Namecheap account
2. Go to **Account** → **Domain List**
3. Click **Manage** next to your domain
4. Go to **Advanced DNS** tab
5. Look for your email settings or go to **Email** section

### Step 2: Find Your SMTP Settings
Namecheap uses these SMTP settings:
- **SMTP Server:** `mail.privateemail.com`
- **Port:** `587` (TLS) or `465` (SSL)
- **Security:** TLS/STARTTLS
- **Username:** Your full email address (e.g., `support@yourdomain.com`)
- **Password:** Your email account password

### Step 3: Add to Environment Variables
Add these lines to your `.env.local` file:

```bash
# Namecheap Email Configuration
NAMECHEAP_EMAIL_USER=your-email@yourdomain.com
NAMECHEAP_EMAIL_PASSWORD=your-email-password
NAMECHEAP_SUPPORT_EMAIL=support@yourdomain.com
```

**Important:** 
- Replace `your-email@yourdomain.com` with your actual Namecheap email address
- Replace `your-email-password` with your actual email password
- Replace `support@yourdomain.com` with the email where you want to receive support requests (can be the same as the sender)

### Step 4: Test Your Setup
1. Save your `.env.local` file
2. Restart your development server: `npm run dev`
3. Go to your support page and submit a test message
4. Check your email inbox for the support request

## Alternative SMTP Settings

If the default settings don't work, try these alternatives:

### Option 1: Different Port
```bash
# In your .env.local, the code will use port 587 by default
# If that doesn't work, you can modify the code to use port 465
```

### Option 2: Different Host
Some Namecheap accounts use:
- `mail.privateemail.com` (most common)
- `smtp.privateemail.com`
- `mail.yourdomain.com`

## Troubleshooting

### Common Issues:

1. **"Authentication failed"**
   - Double-check your email and password
   - Make sure you're using the full email address as username

2. **"Connection timeout"**
   - Try port 465 instead of 587
   - Check if your firewall is blocking the connection

3. **"Invalid credentials"**
   - Verify your email account is active in Namecheap
   - Try logging into webmail to confirm credentials work

### Test Your SMTP Settings:
You can test your SMTP settings using an email client like Thunderbird or Outlook to make sure they work before using them in the app.

## Security Notes

- Never commit your `.env.local` file to version control
- Use strong passwords for your email accounts
- Consider using app-specific passwords if available

## Support

If you need help with Namecheap email settings:
- Check Namecheap's email documentation
- Contact Namecheap support
- Test your settings in an email client first
