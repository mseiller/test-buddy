import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { name, email, subject, message } = await request.json();

    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // For now, we'll log the support request and return success
    // In production, you would integrate with an email service like:
    // - SendGrid
    // - Mailgun
    // - AWS SES
    // - Nodemailer with SMTP
    
    console.log('=== SUPPORT REQUEST ===');
    console.log(`Name: ${name}`);
    console.log(`Email: ${email}`);
    console.log(`Subject: ${subject}`);
    console.log(`Message: ${message}`);
    console.log(`Timestamp: ${new Date().toISOString()}`);
    console.log(`User Agent: ${request.headers.get('user-agent') || 'Unknown'}`);
    console.log(`IP Address: ${request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'Unknown'}`);
    console.log('========================');

    // Debug: Check environment variables
    console.log('🔍 Environment variables check:');
    console.log('NAMECHEAP_EMAIL_USER:', process.env.NAMECHEAP_EMAIL_USER ? '✅ Set' : '❌ Not set');
    console.log('NAMECHEAP_EMAIL_PASSWORD:', process.env.NAMECHEAP_EMAIL_PASSWORD ? '✅ Set' : '❌ Not set');
    console.log('NAMECHEAP_SUPPORT_EMAIL:', process.env.NAMECHEAP_SUPPORT_EMAIL ? '✅ Set' : '❌ Not set');

    // Check if Namecheap email credentials are configured
    if (!process.env.NAMECHEAP_EMAIL_USER || !process.env.NAMECHEAP_EMAIL_PASSWORD) {
      console.log('⚠️ Namecheap email credentials not configured. Support request logged to console only.');
      console.log('📧 To enable email sending, add these to your .env.local file:');
      console.log('   NAMECHEAP_EMAIL_USER=your-email@yourdomain.com');
      console.log('   NAMECHEAP_EMAIL_PASSWORD=your-email-password');
      console.log('   NAMECHEAP_SUPPORT_EMAIL=support@yourdomain.com');
      
      // Return success even without email sending
      return NextResponse.json({
        success: true,
        message: 'Support request received successfully (logged to console)'
      });
    }

    console.log('✅ Namecheap email credentials found, sending email...');

    // Send email using Nodemailer with Namecheap SMTP
    const nodemailer = require('nodemailer');
    
    // Create transporter using Namecheap SMTP (corrected settings)
    const transporter = nodemailer.createTransport({
      host: 'mail.yourbuddyapps.com', // Your domain's SMTP server
      port: 587, // Use port 587 for non-SSL
      secure: false, // false for 587, true for 465
      auth: {
        user: process.env.NAMECHEAP_EMAIL_USER, // Your Namecheap email address
        pass: process.env.NAMECHEAP_EMAIL_PASSWORD, // Your Namecheap email password
      },
      tls: {
        rejectUnauthorized: false // Allow self-signed certificates
      }
    });

    // Email content
    const mailOptions = {
      from: process.env.NAMECHEAP_EMAIL_USER, // Your Namecheap email address
      to: process.env.NAMECHEAP_SUPPORT_EMAIL || process.env.NAMECHEAP_EMAIL_USER, // Support email (can be same as sender)
      subject: `Support Request: ${subject}`,
      text: `
Name: ${name}
Email: ${email}
Subject: ${subject}

Message:
${message}

---
Sent from Test Buddy Support Form
Timestamp: ${new Date().toISOString()}
      `,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc2626;">New Support Request</h2>
          <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Subject:</strong> ${subject}</p>
          </div>
          <div style="background: #ffffff; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
            <h3>Message:</h3>
            <p style="white-space: pre-wrap;">${message}</p>
          </div>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 12px;">
            Sent from Test Buddy Support Form<br>
            Timestamp: ${new Date().toISOString()}
          </p>
        </div>
      `,
    };

    // Send email
    try {
      await transporter.sendMail(mailOptions);
      console.log('✅ Email sent successfully via Namecheap SMTP');
    } catch (emailError) {
      console.error('❌ Email sending failed:', emailError);
      throw emailError;
    }

    return NextResponse.json({
      success: true,
      message: 'Support request received successfully'
    });

  } catch (error) {
    console.error('Error processing support request:', error);
    return NextResponse.json(
      { error: 'Failed to process support request' },
      { status: 500 }
    );
  }
}
