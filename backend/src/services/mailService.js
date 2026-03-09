import nodemailer from 'nodemailer';

// Reuse transporter if already created
let transporter;

const createTransporter = async () => {
    if (transporter) return transporter;

    // Create a test account using Ethereal if no SMTP is configured in .env
    const testAccount = await nodemailer.createTestAccount();

    transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.ethereal.email',
        port: process.env.SMTP_PORT || 587,
        secure: process.env.SMTP_SECURE === 'true' || false, // true for 465, false for other ports
        auth: {
            user: process.env.SMTP_USER || testAccount.user, // generated ethereal user
            pass: process.env.SMTP_PASS || testAccount.pass, // generated ethereal password
        },
    });

    return transporter;
};

export const sendPasswordResetEmail = async (toEmail, newPassword) => {
    try {
        const mailTransporter = await createTransporter();

        const info = await mailTransporter.sendMail({
            from: '"Revision AI" <noreply@revision.ai>',
            to: toEmail,
            subject: 'Your New Password Request',
            text: `Hello, you requested a password reset. Your new temporary password is: ${newPassword}\nPlease login and change your password in the Profile section.`,
            html: `
                <div style="font-family: 'Inter', system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; background-color: #0f172a; color: #f8fafc; border-radius: 16px; overflow: hidden; border: 1px solid rgba(255,255,255,0.1);">
                    <div style="padding: 40px 20px; text-align: center; background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);">
                        <h1 style="margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.025em; color: white;">Revision AI</h1>
                        <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.8); font-size: 14px;">Master your concepts intelligently</p>
                    </div>
                    
                    <div style="padding: 40px 32px;">
                        <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 600; color: #ffffff;">Password Reset Request</h2>
                        <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #94a3b8;">Hello,</p>
                        <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #94a3b8;">
                            We received a request to reset your password. Use the temporary password below to sign back into your account.
                        </p>
                        
                        <div style="background-color: rgba(139, 92, 246, 0.1); border: 2px dashed #8b5cf6; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 32px;">
                            <span style="display: block; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #8b5cf6; margin-bottom: 8px;">Temporary Password</span>
                            <code style="font-family: 'JetBrains Mono', 'Fira Code', monospace; font-size: 32px; font-weight: 700; color: #ffffff; letter-spacing: 0.05em;">${newPassword}</code>
                        </div>
                        
                        <p style="margin: 0 0 32px 0; font-size: 14px; line-height: 1.5; color: #64748b; font-style: italic;">
                            Note: For security reasons, please update this password in your <b>Profile Settings</b> immediately after logging in.
                        </p>
                        
                        <div style="border-top: 1px solid rgba(255,255,255,0.05); padding-top: 24px;">
                            <p style="margin: 0; font-size: 14px; color: #94a3b8;">
                                Best regards,<br>
                                <strong style="color: #ffffff;">The Revision AI Team</strong>
                            </p>
                        </div>
                    </div>
                    
                    <div style="padding: 24px; text-align: center; background-color: rgba(0,0,0,0.2); border-top: 1px solid rgba(255,255,255,0.05);">
                        <p style="margin: 0; font-size: 12px; color: #475569;">
                            If you did not request this change, you can safely ignore this email.
                        </p>
                    </div>
                </div>
            `,
        });

        let previewUrl = null;
        // Output Ethereal URL where the email can be previewed (useful for local dev)
        if (!process.env.SMTP_HOST || process.env.SMTP_HOST === 'smtp.ethereal.email') {
            previewUrl = nodemailer.getTestMessageUrl(info);
        }

        return { info, previewUrl };
    } catch (error) {
        console.error('Error sending email:', error);
        throw new Error('Failed to send email');
    }
};
