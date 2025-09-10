# Email Setup Guide for Support Form

The support form is now functional and will log all support requests to the console. To set up actual email sending, you have several options:

## Option 1: SendGrid (Recommended)

1. **Sign up for SendGrid**: Go to https://sendgrid.com and create an account
2. **Get API Key**: 
   - Go to Settings > API Keys
   - Create a new API key with "Mail Send" permissions
3. **Add to Environment Variables**:
   ```bash
   # Add to .env.local
   SENDGRID_API_KEY=your_sendgrid_api_key_here
   ```
4. **Install SendGrid**:
   ```bash
   npm install @sendgrid/mail
   ```
5. **Update the API endpoint**: Replace the TODO section in `src/app/api/send-support-email/route.ts` with the SendGrid code

## Option 2: Nodemailer with Gmail

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate App Password**:
   - Go to Google Account settings
   - Security > 2-Step Verification > App passwords
   - Generate a password for "Mail"
3. **Add to Environment Variables**:
   ```bash
   # Add to .env.local
   GMAIL_USER=your-email@gmail.com
   GMAIL_PASS=your-app-password
   ```
4. **Install Nodemailer**:
   ```bash
   npm install nodemailer
   npm install @types/nodemailer
   ```

## Option 3: AWS SES

1. **Set up AWS SES**: Follow AWS documentation
2. **Add to Environment Variables**:
   ```bash
   # Add to .env.local
   AWS_ACCESS_KEY_ID=your_access_key
   AWS_SECRET_ACCESS_KEY=your_secret_key
   AWS_REGION=us-east-1
   ```

## Current Status

✅ **Support form is working** - All submissions are logged to the console
✅ **Form validation** - Required fields are checked
✅ **Error handling** - Proper error messages for users
✅ **Success feedback** - Users see confirmation when message is sent

## Testing

1. Go to `/support` page
2. Fill out the form with test data
3. Submit the form
4. Check the terminal/console logs to see the support request details

## Next Steps

1. Choose an email service provider
2. Follow the setup instructions above
3. Replace the TODO section in the API endpoint with actual email sending code
4. Test the email functionality

The support form is now ready for production use once you add the email service integration!
