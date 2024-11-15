import AWS from 'aws-sdk';
import { config } from '../config/config.js';

// Configure AWS SES
const ses = new AWS.SES({
  accessKeyId: config.aws.accessKeyId,
  secretAccessKey: config.aws.secretAccessKey,
  region: config.aws.region
});

export const sendVerificationEmail = async (email, token) => {
  const verificationLink = `${config.frontendUrl}/verify-email?token=${token}`;

  const params = {
    Source: config.aws.sesFromEmail,
    Destination: {
      ToAddresses: [email]
    },
    Message: {
      Subject: {
        Data: 'Verify Your Email'
      },
      Body: {
        Html: {
          Data: `
            <h1>Welcome to our platform!</h1>
            <p>Please click the link below to verify your email address:</p>
            <a href="${verificationLink}">${verificationLink}</a>
            <p>This link will expire in 24 hours.</p>
          `
        }
      }
    }
  };

  try {
    await ses.sendEmail(params).promise();
  } catch (error) {
    console.error('Error sending verification email:', error);
    throw new Error('Failed to send verification email');
  }
};

export const sendPasswordResetEmail = async (email, token) => {
  const resetLink = `${config.frontendUrl}/reset-password?token=${token}`;

  const params = {
    Source: config.aws.sesFromEmail,
    Destination: {
      ToAddresses: [email]
    },
    Message: {
      Subject: {
        Data: 'Reset Your Password'
      },
      Body: {
        Html: {
          Data: `
            <h1>Password Reset Request</h1>
            <p>Click the link below to reset your password:</p>
            <a href="${resetLink}">${resetLink}</a>
            <p>This link will expire in 1 hour.</p>
            <p>If you didn't request this, please ignore this email.</p>
          `
        }
      }
    }
  };

  try {
    await ses.sendEmail(params).promise();
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw new Error('Failed to send password reset email');
  }
};