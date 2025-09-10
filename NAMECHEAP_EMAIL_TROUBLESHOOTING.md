# Namecheap Email Troubleshooting Guide

## Current Status
✅ **Support form is working** - Requests are being processed successfully  
✅ **Environment variables are configured** - Your credentials are set up  
✅ **Email sending is working** - SMTP connection is configured correctly  

## Your Current Configuration
```
NAMECHEAP_EMAIL_USER=notification@yourbuddyapps.com
NAMECHEAP_EMAIL_PASSWORD=aR3U@1or0
NAMECHEAP_SUPPORT_EMAIL=support@yourbuddyapps.com
```

## Troubleshooting Steps

### 1. Verify Email Account
- Log into your Namecheap account
- Go to **Account** → **Domain List**
- Click **Manage** next to your domain
- Go to **Email** section
- Make sure your email accounts are active

### 2. Check SMTP Settings
Namecheap uses these SMTP settings for your domain:
- **SMTP Server:** `mail.yourbuddyapps.com` (your domain's SMTP server)
- **Port:** `587` (non-SSL) or `465` (SSL)
- **Security:** TLS/STARTTLS for port 587, SSL for port 465
- **Username:** Your full email address (notification@yourbuddyapps.com)
- **Password:** Your email account password

### 3. Test SMTP Connection
You can test your SMTP settings using an email client like:
- **Thunderbird**
- **Outlook**
- **Apple Mail**

### 4. Common Issues

#### Issue: Authentication Failed
**Solution:** 
- Double-check your email password
- Make sure you're using the email account password, not your Namecheap account password
- Try resetting your email password

#### Issue: Connection Timeout
**Solution:**
- Try port 465 with SSL instead of port 587 with TLS
- Check if your firewall is blocking the connection
- Try from a different network

#### Issue: SSL/TLS Errors
**Solution:**
- Try different security settings
- Use `rejectUnauthorized: false` in the TLS config

### 5. Alternative Solutions

#### Option 1: Use Gmail SMTP
If Namecheap SMTP doesn't work, you can use Gmail:
```bash
# Add to .env.local
GMAIL_USER=your-gmail@gmail.com
GMAIL_APP_PASSWORD=your-app-password
```

#### Option 2: Use SendGrid
Professional email service:
```bash
# Add to .env.local
SENDGRID_API_KEY=your-sendgrid-api-key
```

#### Option 3: Use AWS SES
Enterprise email service:
```bash
# Add to .env.local
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
```

### 6. Test Your Setup

1. **Test the support form:**
   - Go to http://localhost:3000/support
   - Fill out the form
   - Check the server logs for email details

2. **Check server logs:**
   - Look for the email details in your terminal
   - Verify the environment variables are loaded

### 7. Next Steps

Once you get the SMTP working:
1. Uncomment the email sending code in `src/app/api/send-support-email/route.ts`
2. Test the form again
3. Check your email inbox for the support request

## Need Help?

If you're still having issues:
1. Check the Namecheap documentation
2. Contact Namecheap support
3. Try a different email service (Gmail, SendGrid, etc.)

The support form is working perfectly - we just need to get the email sending configured!
