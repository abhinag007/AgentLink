import { NextRequest, NextResponse } from 'next/server';

// Get the Google Apps Script webhook URL from environment variables
const GOOGLE_SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL || '';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, email, agentName, walletAddress, walletName, walletIcon } = body;

    // Handle wallet connection logging
    if (type === 'wallet_connection') {
      if (!walletAddress) {
        return NextResponse.json(
          { error: 'Wallet address is required' },
          { status: 400 }
        );
      }

      // If no Google Script URL is configured, just log the data
      if (!GOOGLE_SCRIPT_URL) {
        console.log('Wallet connection (Google Sheets not configured):', {
          type: 'wallet_connection',
          walletAddress,
          walletName: walletName || 'Unknown',
          walletIcon: walletIcon || '',
          timestamp: new Date().toISOString(),
        });
        
        return NextResponse.json(
          { 
            success: true, 
            message: 'Wallet connection logged (not saved to Google Sheets - configure GOOGLE_SCRIPT_URL)' 
          },
          { status: 200 }
        );
      }

      // Prepare data for Google Sheets
      const sheetData = {
        type: 'wallet_connection',
        email: '', // Not applicable for wallet connections
        agentName: '', // Not applicable for wallet connections
        walletAddress,
        walletName: walletName || 'Unknown',
        walletIcon: walletIcon || '',
        timestamp: new Date().toISOString(),
      };

      // Send to Google Apps Script webhook
      const response = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sheetData),
      });

      if (!response.ok) {
        throw new Error('Failed to submit to Google Sheets');
      }

      return NextResponse.json(
        { success: true, message: 'Wallet connection logged successfully' },
        { status: 200 }
      );
    }

    // Handle email/namespace submissions (existing logic)
    // Validate required fields
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // If no Google Script URL is configured, just log the data
    if (!GOOGLE_SCRIPT_URL) {
      console.log('Form submission (Google Sheets not configured):', {
        type: type || 'email',
        email,
        agentName: agentName || null,
        timestamp: new Date().toISOString(),
      });
      
      return NextResponse.json(
        { 
          success: true, 
          message: 'Submitted successfully (not saved to Google Sheets - configure GOOGLE_SCRIPT_URL)' 
        },
        { status: 200 }
      );
    }

    // Prepare data for Google Sheets
    const sheetData = {
      type: type || 'email',
      email,
      agentName: agentName || '',
      timestamp: new Date().toISOString(),
    };

    // Send to Google Apps Script webhook
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sheetData),
    });

    if (!response.ok) {
      throw new Error('Failed to submit to Google Sheets');
    }

    return NextResponse.json(
      { success: true, message: 'Submitted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error submitting form:', error);
    return NextResponse.json(
      { error: 'Failed to submit form' },
      { status: 500 }
    );
  }
}

